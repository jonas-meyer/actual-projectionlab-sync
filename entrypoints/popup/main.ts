// Popup: "Sync Now", "Backfill", and links to the options page.
import { type ProtocolMap, sendMessage } from '@/lib/messaging';
import type { SyncResult } from '@/lib/types';

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

// Messages the popup sends: the whole protocol except getMapperData, which returns
// MapperData rather than SyncResult.
type SyncMessage = keyof Omit<ProtocolMap, 'getMapperData'>;

// sendMessage rejects if the worker is asleep or reloaded; turn that into an error
// result instead of an unhandled rejection that leaves the status text stuck.
async function send(type: SyncMessage): Promise<SyncResult> {
  try {
    return await sendMessage(type);
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
    showResult(await send('syncNow'));
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
      showResult(await send('backfillApply'));
      return;
    }
    statusEl.textContent = 'Checking ProjectionLab...';
    const preview = await send('backfillPreview');
    if (!preview.ok) {
      statusEl.textContent = preview.error ?? noResponse;
      return;
    }
    backfillArmed = true;
    const n = preview.existingCount ?? 0;
    statusEl.textContent = `This sets your balances from Actual and replaces ${n} history point(s). Click Backfill again to confirm.`;
  }),
);
