// actual-http-api bridge client. Called from the background worker.
// Every request needs `x-api-key`. `budget-encryption-password` is sent only
// when set (for end-to-end-encrypted budgets); the bridge treats its absence as
// "no password" and downloads the budget without one (budget.js truthy check).
// Endpoints (actual-http-api 26.5.2) wrap the payload in `{ data }`:
//   GET  /v1/budgets/{syncId}/accounts   -> ActualAccount[]
//   POST /v1/budgets/{syncId}/run-query  -> ActualQL result rows (body: { ActualQLquery })
// run-query is an experimental operation: the bridge gates it behind
// EXPERIMENTAL_OPERATIONS_ENABLED (on by default; deploy/ sets it explicitly).
// Balances are integer minor units; divide by 100 before sending to ProjectionLab.
import type {
  AccountBalance,
  ActualAccount,
  ActualResponse,
  MonthlyDelta,
  Settings,
} from './types';

function headers(settings: Settings): Record<string, string> {
  const h: Record<string, string> = { 'x-api-key': settings.apiKey };
  if (settings.encryptionPassword) {
    h['budget-encryption-password'] = settings.encryptionPassword;
  }
  return h;
}

async function getData<T>(url: string, settings: Settings, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    // The bridge scales to zero; the first request after idle can take ~20s.
    res = await fetch(url, {
      ...init,
      headers: { ...headers(settings), ...(init?.headers as Record<string, string>) },
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new Error('Could not reach the bridge (check the URL and that it is running).');
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Bridge ${res.status} for ${new URL(url).pathname}: ${body.slice(0, 300)}`);
  }
  return ((await res.json()) as ActualResponse<T>).data;
}

function budgetBase(settings: Settings): string {
  const base = settings.bridgeUrl.replace(/\/+$/, '');
  return `${base}/v1/budgets/${encodeURIComponent(settings.syncId)}`;
}

export function listAccounts(settings: Settings): Promise<ActualAccount[]> {
  return getData<ActualAccount[]>(`${budgetBase(settings)}/accounts`, settings);
}

// Run an ActualQL query. One query returns every account's data at once, so there are
// no per-account fetch loops and no bridge-race workaround to manage.
function runQuery<T>(settings: Settings, query: object): Promise<T> {
  return getData<T>(`${budgetBase(settings)}/run-query`, settings, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ActualQLquery: query }),
  });
}

// Current balance (minor units) per account as of `until` (YYYY-MM-DD). `until` drops
// future-dated transactions, matching the balance Actual displays.
export function getAccountBalances(settings: Settings, until: string): Promise<AccountBalance[]> {
  return runQuery(settings, {
    table: 'transactions',
    filter: { date: { $lte: until } },
    groupBy: ['account'],
    select: ['account', { balance: { $sum: '$amount' } }],
  });
}

// Net change (minor units) per account per calendar month, up to `until`. A client-side
// cumulative sum (see backfill.buildBackfill) turns this into the month-end series.
export function getMonthlyDeltas(settings: Settings, until: string): Promise<MonthlyDelta[]> {
  return runQuery(settings, {
    table: 'transactions',
    filter: { date: { $lte: until } },
    groupBy: ['account', { $month: '$date' }],
    select: ['account', { month: { $month: '$date' } }, { delta: { $sum: '$amount' } }],
  });
}
