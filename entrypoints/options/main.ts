// Options page: persists settings, and maps each Actual account to a ProjectionLab
// account (the mapping is reused by Backfill's bucketing and the forward sync).
import { sendMessage } from '@/lib/messaging';
import { ensureBridgePermission } from '@/lib/permissions';
import { getMapping, getSettings, saveMapping, saveSettings } from '@/lib/storage';
import type { MapperData, PlAccountRef, Settings } from '@/lib/types';

const form = document.querySelector<HTMLFormElement>('#settings')!;
const statusEl = document.querySelector<HTMLElement>('#status')!;

// Prefill from storage.
getSettings().then((s) => {
  for (const [k, v] of Object.entries(s)) {
    const field = form.elements.namedItem(k) as HTMLInputElement | null;
    if (field) field.value = String(v);
  }
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries()) as unknown as Partial<Settings>;
  try {
    // Request host access for the bridge origin. Must run inside the user gesture,
    // so call it before any other await.
    const granted = data.bridgeUrl ? await ensureBridgePermission(data.bridgeUrl) : true;

    await saveSettings(data);
    statusEl.textContent = granted
      ? 'Saved'
      : 'Saved, but host access was denied (https, or http only for localhost); syncing needs it. Re-save to grant.';
    setTimeout(
      () => {
        statusEl.textContent = '';
      },
      granted ? 1500 : 6000,
    );
  } catch (err) {
    statusEl.textContent = err instanceof Error ? err.message : 'Could not save settings.';
  }
});

// Account mapping.
const mapStatus = document.querySelector<HTMLElement>('#map-status')!;
const mapTable = document.querySelector<HTMLTableElement>('#map-table')!;

document.querySelector<HTMLButtonElement>('#load-accounts')!.addEventListener('click', async () => {
  mapStatus.textContent = 'Loading accounts...';
  let data: MapperData;
  try {
    data = await sendMessage('getMapperData');
  } catch {
    mapStatus.textContent = 'No response from the extension. Reload it and retry.';
    return;
  }
  if (!data.ok || !data.actualAccounts || !data.plAccounts) {
    mapStatus.textContent = data.error ?? 'Failed to load accounts.';
    return;
  }
  await renderMapping(data.actualAccounts, data.plAccounts);
  mapStatus.textContent = data.note
    ? `${data.actualAccounts.length} accounts (${data.note}).`
    : `${data.actualAccounts.length} accounts.`;
});

async function renderMapping(
  actualAccounts: { id: string; name: string }[],
  plAccounts: PlAccountRef[],
): Promise<void> {
  const mapping = await getMapping();
  mapTable.replaceChildren();
  for (const account of actualAccounts) {
    const row = mapTable.insertRow();
    row.insertCell().textContent = account.name;

    const select = document.createElement('select');
    select.add(new Option('Unmapped (coarse default)', ''));
    for (const pl of plAccounts) {
      select.add(new Option(`${pl.name} (${pl.type})`, pl.id));
    }
    select.value = mapping[account.id] ?? '';
    select.addEventListener('change', async () => {
      const current = await getMapping();
      if (select.value) current[account.id] = select.value;
      else delete current[account.id];
      await saveMapping(current);
      mapStatus.textContent = 'Mapping saved.';
    });
    row.insertCell().appendChild(select);
  }
}
