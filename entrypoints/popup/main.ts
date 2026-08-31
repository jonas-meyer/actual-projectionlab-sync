import { type ProtocolMap, sendMessage } from '@/lib/messaging';
import type { SyncResult } from '@/lib/types';

const statusEl = document.querySelector<HTMLElement>('#status')!;
const syncBtn = document.querySelector<HTMLButtonElement>('#sync')!;
const backfillBtn = document.querySelector<HTMLButtonElement>('#backfill')!;

const noResponse = 'No response from the extension. Reload it and retry.';

document.querySelector<HTMLButtonElement>('#open-options')!.addEventListener('click', () => {
  browser.runtime.openOptionsPage();
});

document.querySelector<HTMLButtonElement>('#map-accounts')!.addEventListener('click', () => {
  browser.runtime.openOptionsPage();
});

// All messages but getMapperData, which returns MapperData rather than SyncResult.
type SyncMessage = keyof Omit<ProtocolMap, 'getMapperData'>;

// Turn a dropped message channel into an error result, not an unhandled rejection.
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

// Disable both buttons during an action: concurrent bridge calls race (one budget at a time).
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

// Two-click confirm (native confirm() is unreliable in popups): first arms, second applies.
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
