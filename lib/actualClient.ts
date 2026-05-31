// actual-http-api bridge client. Responses wrap the payload in `{ data }`. run-query is an
// experimental bridge op (EXPERIMENTAL_OPERATIONS_ENABLED, on by default; deploy/ sets it).
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

function runQuery<T>(settings: Settings, query: object): Promise<T> {
  return getData<T>(`${budgetBase(settings)}/run-query`, settings, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ActualQLquery: query }),
  });
}

// `until` drops future-dated txns, matching the balance Actual displays.
export function getAccountBalances(settings: Settings, until: string): Promise<AccountBalance[]> {
  return runQuery(settings, {
    table: 'transactions',
    filter: { date: { $lte: until } },
    groupBy: ['account'],
    select: ['account', { balance: { $sum: '$amount' } }],
  });
}

export function getMonthlyDeltas(settings: Settings, until: string): Promise<MonthlyDelta[]> {
  return runQuery(settings, {
    table: 'transactions',
    filter: { date: { $lte: until } },
    groupBy: ['account', { $month: '$date' }],
    select: ['account', { month: { $month: '$date' } }, { delta: { $sum: '$amount' } }],
  });
}
