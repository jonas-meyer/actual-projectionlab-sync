// Historical net-worth backfill helpers.
import type { ActualAccount, Bucket, MonthlyDelta, PlProgressPoint } from './types';

const round2 = (n: number): number => Math.round(n * 100) / 100;

export function buildPoint(
  dateMs: number,
  entries: { account: ActualAccount; balance: number }[],
  bucketFor: (account: ActualAccount, balance: number) => Bucket,
): PlProgressPoint {
  const b: Record<Bucket, number> = {
    savings: 0,
    taxable: 0,
    taxDeferred: 0,
    taxFree: 0,
    crypto: 0,
    assets: 0,
    debt: 0,
    loans: 0,
  };
  let netWorth = 0;
  for (const { account, balance } of entries) {
    b[bucketFor(account, balance)] += balance;
    netWorth += balance;
  }
  return {
    date: dateMs,
    netWorth: round2(netWorth),
    savings: round2(b.savings),
    taxable: round2(b.taxable),
    taxDeferred: round2(b.taxDeferred),
    taxFree: round2(b.taxFree),
    crypto: round2(b.crypto),
    assets: round2(b.assets),
    debt: round2(b.debt),
    loans: round2(b.loans),
  };
}

// Month-end dates going back `maxMonths` from `now` (most recent first).
export function monthEndCutoffs(now: Date, maxMonths: number): Date[] {
  return Array.from(
    { length: maxMonths },
    (_, i) => new Date(now.getFullYear(), now.getMonth() - i + 1, 0),
  );
}

// Whole months from the start of `yyyymm` (e.g. '2022-09') through `now`, inclusive.
export function monthsSince(yyyymm: string, now: Date): number {
  const [year, month] = yyyymm.split('-').map(Number);
  return (now.getFullYear() - year) * 12 + (now.getMonth() + 1 - month) + 1;
}

export function ymd(d: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export interface BackfillResult {
  /** Month-end net-worth snapshots, oldest first. */
  points: PlProgressPoint[];
  /** Each account's current balance in major units, keyed by Actual account id. */
  currentByActualId: Map<string, number>;
}

// Cumulatively sum per-account monthly deltas into a month-end net-worth series AND each
// account's current balance, in a single pass: one point per month from the earliest
// delta month through `now`. Months with no delta for an account carry the previous
// balance forward. The final cumulative balances are the current balances, so callers
// get them here rather than re-summing the deltas.
export function buildBackfill(
  deltas: MonthlyDelta[],
  accounts: ActualAccount[],
  now: Date,
  bucketFor: (account: ActualAccount, balance: number) => Bucket,
): BackfillResult {
  if (deltas.length === 0) return { points: [], currentByActualId: new Map() };
  const earliest = deltas.reduce((min, d) => (d.month < min ? d.month : min), deltas[0].month);
  const cutoffs = [...monthEndCutoffs(now, monthsSince(earliest, now))].reverse(); // oldest first

  // Group each month's deltas so a month applies only the accounts that changed,
  // instead of scanning every account every month.
  const deltasByMonth = Map.groupBy(deltas, (delta) => delta.month);

  const balanceCents = new Map<string, number>();
  const points: PlProgressPoint[] = [];
  for (const cutoff of cutoffs) {
    for (const { account, delta } of deltasByMonth.get(ymd(cutoff).slice(0, 7)) ?? []) {
      balanceCents.set(account, (balanceCents.get(account) ?? 0) + delta);
    }
    const entries = accounts.map((account) => ({
      account,
      balance: (balanceCents.get(account.id) ?? 0) / 100,
    }));
    points.push(buildPoint(cutoff.getTime(), entries, bucketFor));
  }
  const currentByActualId = new Map(
    Array.from(balanceCents, ([account, cents]) => [account, cents / 100]),
  );
  return { points, currentByActualId };
}
