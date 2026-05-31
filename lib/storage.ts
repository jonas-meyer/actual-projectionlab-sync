import { storage } from 'wxt/utils/storage';
import type { Mapping, Settings } from './types';

// Extension-local storage items (local:settings -> browser.storage.local key `settings`,
// local:mapping -> `mapping`). The fallback makes getValue() return {} (not null) until
// the options page is filled in.
export const store = {
  settings: storage.defineItem<Partial<Settings>>('local:settings', { fallback: {} }),
  mapping: storage.defineItem<Mapping>('local:mapping', { fallback: {} }),
};
