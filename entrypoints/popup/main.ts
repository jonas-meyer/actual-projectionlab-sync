// Popup: "Sync Now", "Backfill", and links to the options page.
import type { ExtensionMessage, SyncResult } from '@/lib/types';

const statusEl = document.querySelector<HTMLElement>('#status')!;
const syncBtn = document.querySelector<HTMLButtonElement>('#sync')!;
const backfillBtn = document.querySelector<HTMLButtonElement>('#backfill')!;

const noResponse = 'No response from the extension. Reload it and retry.';

document.querySelector<HTMLAnchorElement>('#open-options')!.addEventListener('click', (e) => {
  e.preventDefault();
  browser.runtime.openOptionsPage();
});

// Opens the options page, where the Account mapping table lives.
document.querySelector<HTMLButtonElement>('#map-accounts')!.addEventListener('click', () => {
  browser.runtime.openOptionsPage();
});

// Send to the background worker, turning a dropped message channel (worker asleep or
// reloaded) into an error result instead of an unhandled rejection that leaves the
// status text stuck.
async function send(message: ExtensionMessage): Promise<SyncResult> {
  try {
    const result = (await browser.runtime.sendMessage(message)) as SyncResult | undefined;
    return result ?? { ok: false, error: noResponse };
  } catch {
    return { ok: false, error: noResponse };
  }
}

function showResult(result: SyncResult): void {
  statusEl.textContent = result.ok ? (result.detail ?? 'Done') : (result.error ?? noResponse);
}

// Run a bridge action with both buttons disabled so a double-click can't fire concurrent
// requests; the bridge serves one budget at a time and 404s when calls overlap.
let busy = false;
async function withButtonsDisabled(action: () => Promise<void>): Promise<void> {
  if (busy) return;
  busy = true;
  syncBtn.disabled = true;
  backfillBtn.disabled = true;
  try {
    await action();
  } finally {
    busy = false;
    syncBtn.disabled = false;
    backfillBtn.disabled = false;
  }
}

syncBtn.addEventListener('click', () =>
  withButtonsDisabled(async () => {
    statusEl.textContent = 'Syncing...';
    showResult(await send({ type: 'SYNC_NOW' }));
  }),
);

// Backfill replaces PL's history, so confirm with a second click (native confirm()
// dialogs are unreliable in extension popups). First click previews + arms; second applies.
let backfillArmed = false;
backfillBtn.addEventListener('click', () =>
  withButtonsDisabled(async () => {
    if (backfillArmed) {
      backfillArmed = false;
      statusEl.textContent = 'Backfilling from Actual... (this can take a minute)';
      showResult(await send({ type: 'BACKFILL_APPLY' }));
      return;
    }
    statusEl.textContent = 'Checking ProjectionLab...';
    const preview = await send({ type: 'BACKFILL_PREVIEW' });
    if (!preview.ok) {
      statusEl.textContent = preview.error ?? noResponse;
      return;
    }
    backfillArmed = true;
    const n = preview.existingCount ?? 0;
    statusEl.textContent = `This sets your balances from Actual and replaces ${n} history point(s). Click Backfill again to confirm.`;
  }),
);
