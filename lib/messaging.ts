// Typed messaging between the popup/options pages and the background worker
// (@webext-core/messaging). Each entry's return type is the response the background
// sends back, inferred end to end so callers and handlers stay in sync.
import { defineExtensionMessaging } from '@webext-core/messaging';
import type { MapperData, SyncResult } from './types';

interface ProtocolMap {
  syncNow(): SyncResult;
  backfillPreview(): SyncResult;
  backfillApply(): SyncResult;
  getMapperData(): MapperData;
}

export const { sendMessage, onMessage } = defineExtensionMessaging<ProtocolMap>();
