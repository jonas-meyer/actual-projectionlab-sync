// Calls window.projectionlabPluginAPI by injecting into the PL tab's MAIN world.
import { PL_HOST_MATCHES } from './projectionlab';
import type { PlAccount, PlAccountRef, PlCategory, PlExportData, PlProgress } from './types';

type PlOp =
  | { method: 'exportData'; key: string }
  | { method: 'updateAccount'; id: string; field: 'balance' | 'amount'; value: number; key: string }
  | { method: 'restoreProgress'; progress: PlProgress; key: string };

type CallResult = { ok: true; data: unknown } | { ok: false; error: string };

async function plTabId(): Promise<number> {
  const tabs = await browser.tabs.query({ url: PL_HOST_MATCHES });
  const id = tabs.find((t) => t.id !== undefined)?.id;
  if (id === undefined) throw new Error('Open ProjectionLab in a tab, then sync.');
  return id;
}

async function run(op: PlOp): Promise<unknown> {
  const [injection] = await browser.scripting.executeScript({
    target: { tabId: await plTabId() },
    world: 'MAIN',
    args: [op],
    func: pageCall,
  });
  if (!injection) {
    throw new Error('Could not reach the ProjectionLab tab. Reload it and try again.');
  }
  const result = injection.result as CallResult | undefined;
  if (!result?.ok) throw new Error(result?.error ?? 'ProjectionLab call failed.');
  return result.data;
}

// Runs in the page's MAIN world: must be self-contained (no closure over module scope).
async function pageCall(op: PlOp): Promise<CallResult> {
  try {
    // PL injects the API after its app boots, so poll (~10s).
    const api = await (async () => {
      for (let i = 0; i < 100; i += 1) {
        if (window.projectionlabPluginAPI) return window.projectionlabPluginAPI;
        await new Promise((r) => setTimeout(r, 100));
      }
      throw new Error('ProjectionLab plugin API not found (page loaded, plugins enabled?)');
    })();

    switch (op.method) {
      case 'exportData':
        return { ok: true, data: await api.exportData({ key: op.key }) };
      case 'updateAccount': {
        const patch = op.field === 'amount' ? { amount: op.value } : { balance: op.value };
        await api.updateAccount(op.id, patch, { key: op.key });
        return { ok: true, data: null };
      }
      case 'restoreProgress':
        await api.restoreProgress(op.progress, { key: op.key });
        return { ok: true, data: null };
      default:
        return { ok: false, error: 'Unknown method' };
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function exportData(plKey: string): Promise<PlExportData> {
  return (await run({ method: 'exportData', key: plKey })) as PlExportData;
}

export async function listPlAccounts(plKey: string): Promise<PlAccountRef[]> {
  const { today } = await exportData(plKey);
  const groups: [PlAccount[], PlCategory][] = [
    [today.savingsAccounts, 'savings'],
    [today.investmentAccounts, 'investment'],
    [today.assets, 'asset'],
    [today.debts, 'debt'],
  ];
  return groups.flatMap(([accounts, category]) =>
    accounts.map((a) => ({ id: a.id, name: a.name, type: a.type, category })),
  );
}

// PL debt accounts have no `balance`: store the owed amount as positive `amount` (so negate).
export async function updateAccount(
  account: PlAccountRef,
  valueDollars: number,
  plKey: string,
): Promise<void> {
  const isDebt = account.category === 'debt';
  await run({
    method: 'updateAccount',
    id: account.id,
    field: isDebt ? 'amount' : 'balance',
    value: isDebt ? -valueDollars : valueDollars,
    key: plKey,
  });
}

export async function restoreProgress(progress: PlProgress, plKey: string): Promise<void> {
  await run({ method: 'restoreProgress', progress, key: plKey });
}
