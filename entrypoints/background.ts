// Background worker: handles popup/options actions. Bridge fetches happen here,
// where they aren't subject to page CORS.
import { getAccountBalances, getMonthlyDeltas, listAccounts } from '@/lib/actualClient';
import { buildBackfill, ymd } from '@/lib/backfill';
import { bucketOfPlAccount } from '@/lib/buckets';
import { autoLinkByName, reconcile } from '@/lib/mapping';
import { exportData, listPlAccounts, restoreProgress, updateAccount } from '@/lib/plClient';
import { getMapping, getSettings, saveMapping } from '@/lib/storage';
import type {
  ActualAccount,
  Bucket,
  ExtensionMessage,
  MapperData,
  Mapping,
  PlAccountRef,
  Settings,
  SyncResult,
} from '@/lib/types';

export default defineBackground(() => {
  const handlers = {
    SYNC_NOW: runSync,
    BACKFILL_PREVIEW: runBackfillPreview,
    BACKFILL_APPLY: runBackfillApply,
    GET_MAPPER_DATA: runGetMapperData,
  } satisfies Record<ExtensionMessage['type'], () => Promise<SyncResult | MapperData>>;
  browser.runtime.onMessage.addListener((message: unknown) => {
    const msg = message as ExtensionMessage | undefined;
    return msg ? handlers[msg.type]?.() : undefined;
  });
});

// Validate the saved settings once and narrow Partial<Settings> to a complete Settings.
// The error arm is shaped to return straight to the popup/options UI as a SyncResult.
type SettingsGate = { ok: false; error: string } | { ok: true; settings: Settings };

function requireSettings(s: Partial<Settings>): SettingsGate {
  if (!s.bridgeUrl || !s.apiKey || !s.syncId) {
    return { ok: false, error: 'Set the bridge URL, API key, and Sync ID in Settings.' };
  }
  if (!s.plKey) {
    return { ok: false, error: 'Add your ProjectionLab Plugin API key in Settings.' };
  }
  return {
    ok: true,
    settings: {
      bridgeUrl: s.bridgeUrl,
      apiKey: s.apiKey,
      syncId: s.syncId,
      plKey: s.plKey,
      encryptionPassword: s.encryptionPassword,
    },
  };
}

// For each PL account, sum the balances of the Actual accounts mapped to it and
// write the total via updateAccount. Returns the number of accounts written.
async function pushCurrentBalances(
  plKey: string,
  mapping: Mapping,
  currentByActualId: Map<string, number>,
  plById: Map<string, PlAccountRef>,
): Promise<number> {
  const sumByPl = new Map<string, number>();
  for (const [actualId, plId] of Object.entries(mapping)) {
    const balance = currentByActualId.get(actualId);
    if (balance === undefined) continue;
    sumByPl.set(plId, (sumByPl.get(plId) ?? 0) + balance);
  }
  let updated = 0;
  for (const [plId, sum] of sumByPl) {
    const account = plById.get(plId);
    if (!account) continue; // mapped to a PL account that no longer exists
    await updateAccount(account, Math.round(sum * 100) / 100, plKey);
    updated += 1;
  }
  return updated;
}

async function runSync(): Promise<SyncResult> {
  const gate = requireSettings(await getSettings());
  if (!gate.ok) return gate;
  const { settings } = gate;
  const mapping = await getMapping();
  if (Object.keys(mapping).length === 0) {
    return { ok: false, error: 'No accounts mapped yet. Use "Map accounts" first.' };
  }
  try {
    // Different backends (PL page vs bridge), so fetch them concurrently.
    const [plAccounts, balances] = await Promise.all([
      listPlAccounts(settings.plKey),
      getAccountBalances(settings, ymd(new Date())),
    ]);
    const plById = new Map<string, PlAccountRef>(plAccounts.map((p) => [p.id, p]));
    const current = new Map(balances.map((b) => [b.account, b.balance / 100]));
    const updated = await pushCurrentBalances(settings.plKey, mapping, current, plById);
    return { ok: true, detail: `Updated ${updated} ProjectionLab account(s) from Actual.` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// Heals the saved mapping against the live accounts before the mapper renders:
// drops links whose Actual or PL account is gone, then fills unmapped accounts that
// exactly match a PL account by name. Returns a short summary, or '' if unchanged.
async function reconcileMapping(
  accounts: ActualAccount[],
  plAccounts: PlAccountRef[],
): Promise<string> {
  // Don't prune against an empty list (e.g. PL still loading would look "all stale").
  if (accounts.length === 0 || plAccounts.length === 0) return '';
  const mapping = await getMapping();
  const { valid, unmappedActual, unmappedPl } = reconcile(mapping, accounts, plAccounts);
  const links = autoLinkByName(unmappedActual, unmappedPl);
  const removed = Object.keys(mapping).length - Object.keys(valid).length;
  const added = Object.keys(links).length;
  if (removed === 0 && added === 0) return '';
  await saveMapping({ ...valid, ...links });
  const parts: string[] = [];
  if (removed) parts.push(`removed ${removed} stale link${removed === 1 ? '' : 's'}`);
  if (added) parts.push(`matched ${added} by name`);
  return parts.join(', ');
}

async function runGetMapperData(): Promise<MapperData> {
  const gate = requireSettings(await getSettings());
  if (!gate.ok) return gate;
  const { settings } = gate;
  try {
    // Different backends (bridge vs PL page), so fetch them concurrently.
    const [accounts, plAccounts] = await Promise.all([
      listAccounts(settings),
      listPlAccounts(settings.plKey),
    ]);
    const note = await reconcileMapping(accounts, plAccounts);
    return {
      ok: true,
      actualAccounts: accounts.map((a) => ({ id: a.id, name: a.name })),
      plAccounts,
      note,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// Backfill preview: how many history points ProjectionLab already has, so the
// popup can confirm before Backfill replaces them.
async function runBackfillPreview(): Promise<SyncResult> {
  const gate = requireSettings(await getSettings());
  if (!gate.ok) return gate;
  try {
    const data = await exportData(gate.settings.plKey);
    return { ok: true, existingCount: data.progress?.data.length ?? 0 };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// Backfill apply: set current account balances AND replace ProjectionLab's net-worth
// history with a monthly series from Actual (authoritative reset; confirmed in popup).
async function runBackfillApply(): Promise<SyncResult> {
  const gate = requireSettings(await getSettings());
  if (!gate.ok) return gate;
  const { settings } = gate;

  try {
    // Different backends (bridge vs PL page), so fetch them concurrently.
    const [accounts, plAccounts] = await Promise.all([
      listAccounts(settings),
      listPlAccounts(settings.plKey),
    ]);
    const mapping = await getMapping();
    const plById = new Map<string, PlAccountRef>(plAccounts.map((p) => [p.id, p]));
    // Mapped accounts bucket by their PL account's category; unmapped ones (e.g.
    // closed accounts) fall back to sign alone. netWorth stays exact either way.
    const bucketFor = (account: ActualAccount, balance: number): Bucket => {
      const pl = plById.get(mapping[account.id] ?? '');
      if (pl) return bucketOfPlAccount(pl);
      return balance < 0 ? 'debt' : 'savings';
    };

    // One ActualQL query for every account's monthly deltas. buildBackfill turns it into
    // the month-end series AND the current per-account balances in one pass. `ymd(now)`
    // drops future-dated transactions, matching Actual.
    const now = new Date();
    const deltas = await getMonthlyDeltas(settings, ymd(now));
    const { points, currentByActualId } = buildBackfill(deltas, accounts, now, bucketFor);
    if (points.length === 0) {
      return {
        ok: false,
        error: 'No transactions found to backfill. Check the bridge URL and Sync ID.',
      };
    }

    const updated = await pushCurrentBalances(settings.plKey, mapping, currentByActualId, plById);
    await restoreProgress({ data: points, lastUpdated: Date.now() }, settings.plKey);
    const balanceNote =
      Object.keys(mapping).length === 0
        ? 'No accounts mapped, so Current Finances was not updated. Use "Map accounts".'
        : `Updated ${updated} account balance(s).`;
    return { ok: true, detail: `Seeded ${points.length} months of history. ${balanceNote}` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
