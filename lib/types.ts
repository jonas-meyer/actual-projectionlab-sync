export interface Settings {
  bridgeUrl: string;
  apiKey: string;
  syncId: string;
  encryptionPassword?: string; // only for end-to-end-encrypted budgets
  plKey: string;
}

export type Mapping = Record<string, string>; // Actual account id -> ProjectionLab account id

// actual-http-api wraps every response payload in `{ data }`.
export interface ActualResponse<T> {
  data: T;
}

export interface ActualAccount {
  id: string;
  name: string;
  offbudget: boolean;
  closed: boolean; // ~0 balance; excluded from Current Finances but kept in backfill history
}

// `balance` and `delta` are integer minor units.
export interface AccountBalance {
  account: string;
  balance: number;
}

export interface MonthlyDelta {
  account: string;
  month: string; // 'YYYY-MM'
  delta: number;
}

export interface PlAccount {
  id: string;
  name: string;
  type: string;
}

export type Bucket =
  | 'savings'
  | 'taxable'
  | 'taxDeferred'
  | 'taxFree'
  | 'crypto'
  | 'assets'
  | 'debt'
  | 'loans';

// Which exportData array a PL account came from.
export type PlCategory = 'savings' | 'investment' | 'asset' | 'debt';

export interface PlAccountRef {
  id: string;
  name: string;
  type: string;
  category: PlCategory;
}

// `date` is epoch ms; the buckets sum to netWorth.
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

export interface PlExportData {
  today: {
    savingsAccounts: PlAccount[];
    investmentAccounts: PlAccount[];
    assets: PlAccount[];
    debts: PlAccount[];
  };
  progress?: PlProgress;
}

export interface MapperData {
  ok: boolean;
  error?: string;
  actualAccounts?: { id: string; name: string }[];
  plAccounts?: PlAccountRef[];
  note?: string;
}

export interface SyncResult {
  ok: boolean;
  error?: string;
  detail?: string;
  existingCount?: number;
}
