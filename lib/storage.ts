// Settings and account-mapping persistence in extension-local storage.
import type { Mapping, Settings } from './types';

const SETTINGS_KEY = 'settings';
const MAPPING_KEY = 'mapping';

// May be empty or partial until the user fills in the options page.
export async function getSettings(): Promise<Partial<Settings>> {
  const got = await browser.storage.local.get(SETTINGS_KEY);
  return (got[SETTINGS_KEY] as Partial<Settings>) ?? {};
}

export async function saveSettings(settings: Partial<Settings>): Promise<void> {
  await browser.storage.local.set({ [SETTINGS_KEY]: settings });
}

export async function getMapping(): Promise<Mapping> {
  const got = await browser.storage.local.get(MAPPING_KEY);
  return (got[MAPPING_KEY] as Mapping) ?? {};
}

export async function saveMapping(mapping: Mapping): Promise<void> {
  await browser.storage.local.set({ [MAPPING_KEY]: mapping });
}
