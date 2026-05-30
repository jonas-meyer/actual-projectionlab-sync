import { storage } from 'wxt/utils/storage';
import type { Mapping, Settings } from './types';

// `local:settings` / `local:mapping` map to the same browser.storage.local keys the
// hand-rolled wrapper used (`settings` / `mapping`), so existing saved data is preserved.
// The fallback makes get return {} (not null) until the user fills in the options page.
const settingsItem = storage.defineItem<Partial<Settings>>('local:settings', { fallback: {} });
const mappingItem = storage.defineItem<Mapping>('local:mapping', { fallback: {} });

export const getSettings = (): Promise<Partial<Settings>> => settingsItem.getValue();
export const saveSettings = (settings: Partial<Settings>): Promise<void> =>
  settingsItem.setValue(settings);
export const getMapping = (): Promise<Mapping> => mappingItem.getValue();
export const saveMapping = (mapping: Mapping): Promise<void> => mappingItem.setValue(mapping);
