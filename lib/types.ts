// Shared types for the actual-http-api and ProjectionLab Plugin API contracts.

// Persisted extension state.

/** User-entered settings, persisted to browser.storage.local. */
export interface Settings {
  bridgeUrl: string;
  apiKey: string;
  syncId: string;
  /** Only needed for end-to-end-encrypted budgets. */
  encryptionPassword?: string;
  plKey: string;
}

/** Persisted map of Actual account id to ProjectionLab account id. */
export type Mapping = Record<string, string>;

// actual-http-api (the source).

/** Every actual-http-api response wraps its payload in `{ data }`. */
export interface ActualResponse<T> {
  data: T;
}

/** An Actual account from GET /v1/budgets/{syncId}/accounts. */
export interface ActualAccount {
  id: string;
  name: string;
  /** true = off-budget (tracking) account. */
  offbudget: boolean;
  /** true = closed (~0 balance); excluded from Current Finances, but still counted in backfill history. */
  closed: boolean;
}

/** A run-query balance row; `balance` is integer minor units. */
export interface AccountBalance {
  account: string;
  balance: number;
}

/** Net change for an account in a calendar month ('YYYY-MM'); `delta` is integer minor units. */
export interface MonthlyDelta {
  account: string;
  month: string;
  delta: number;
}

// ProjectionLab Plugin API (the target).

/** A ProjectionLab account from exportData(); only the fields we read. */
export interface PlAccount {
  id: string;
  name: string;
  type: string;
}

/** Net-worth buckets in a ProjectionLab progress point. */
export type Bucket =
  | 'savings'
  | 'taxable'
  | 'taxDeferred'
  | 'taxFree'
  | 'crypto'
  | 'assets'
  | 'debt'
  | 'loans';

/** Which exportData array a PL account came from. */
export type PlCategory = 'savings' | 'investment' | 'asset' | 'debt';

/** A PL account plus its category, for bucket derivation and the account mapper. */
export interface PlAccountRef {
  id: string;
  name: string;
  type: string;
  category: PlCategory;
}

/** A net-worth snapshot. `date` is epoch milliseconds; the buckets sum to netWorth. */
export interface PlProgressPoint {
  date: number;
  netWorth: number;
  savings: number;
  taxable: number;
  taxDeferred: number;
  taxFree: number;
  crypto: number;
  assets: number;
  debt: number;
  loans: number;
}

export interface PlProgress {
  data: PlProgressPoint[];
  lastUpdated: number;
}

/** Subset of window.projectionlabPluginAPI.exportData() output we consume. */
export interface PlExportData {
  today: {
    savingsAccounts: PlAccount[];
    investmentAccounts: PlAccount[];
    assets: PlAccount[];
    debts: PlAccount[];
  };
  progress?: PlProgress;
}

// Background responses (the @webext-core/messaging protocol lives in lib/messaging.ts).

/** Account lists for the mapper UI: Actual accounts + ProjectionLab accounts. */
export interface MapperData {
  ok: boolean;
  error?: string;
  actualAccounts?: { id: string; name: string }[];
  plAccounts?: PlAccountRef[];
  /** Summary of any mapping reconciliation done on load (stale removed, name-matched). */
  note?: string;
}

/** Result of a sync request, returned by the background worker. */
export interface SyncResult {
  ok: boolean;
  error?: string;
  /** Human-readable status shown in the popup on success. */
  detail?: string;
  /** Backfill preview: how many net-worth history points ProjectionLab currently has. */
  existingCount?: number;
}
