// Typed messaging (@webext-core/messaging): each entry's return type is the response.
import { defineExtensionMessaging } from '@webext-core/messaging';
import type { MapperData, SyncResult } from './types';

export interface ProtocolMap {
  syncNow(): SyncResult;
  backfillPreview(): SyncResult;
  backfillApply(): SyncResult;
  getMapperData(): MapperData;
}

export const { sendMessage, onMessage } = defineExtensionMessaging<ProtocolMap>();
