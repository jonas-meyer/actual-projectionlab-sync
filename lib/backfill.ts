import type { ActualAccount, Bucket, MonthlyDelta, PlProgressPoint } from './types';

// Amounts stay integer cents until the /100 that produces each major-unit field below.
export function buildPoint(
  dateMs: number,
  entries: { account: ActualAccount; cents: number }[],
  bucketFor: (account: ActualAccount, cents: number) => Bucket,
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
  for (const { account, cents } of entries) {
    b[bucketFor(account, cents)] += cents;
    netWorth += cents;
  }
  return {
    date: dateMs,
    netWorth: netWorth / 100,
    savings: b.savings / 100,
    taxable: b.taxable / 100,
    taxDeferred: b.taxDeferred / 100,
    taxFree: b.taxFree / 100,
    crypto: b.crypto / 100,
    assets: b.assets / 100,
    debt: b.debt / 100,
    loans: b.loans / 100,
  };
}

export function monthEndCutoffs(now: Date, maxMonths: number): Date[] {
  return Array.from(
    { length: maxMonths },
    (_, i) => new Date(now.getFullYear(), now.getMonth() - i + 1, 0),
  );
}

export function monthsSince(yyyymm: string, now: Date): number {
  const [year, month] = yyyymm.split('-').map(Number);
  return (now.getFullYear() - year) * 12 + (now.getMonth() + 1 - month) + 1;
}

export function ymd(d: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export interface BackfillResult {
  points: PlProgressPoint[];
  currentByActualId: Map<string, number>;
}

export function buildBackfill(
  deltas: MonthlyDelta[],
  accounts: ActualAccount[],
  now: Date,
  bucketFor: (account: ActualAccount, cents: number) => Bucket,
): BackfillResult {
  if (deltas.length === 0) return { points: [], currentByActualId: new Map() };
  const earliest = deltas.reduce((min, d) => (d.month < min ? d.month : min), deltas[0].month);
  const cutoffs = [...monthEndCutoffs(now, monthsSince(earliest, now))].reverse(); // oldest first
  const deltasByMonth = Map.groupBy(deltas, (delta) => delta.month);

  const balanceCents = new Map<string, number>();
  const points: PlProgressPoint[] = [];
  for (const cutoff of cutoffs) {
    for (const { account, delta } of deltasByMonth.get(ymd(cutoff).slice(0, 7)) ?? []) {
      balanceCents.set(account, (balanceCents.get(account) ?? 0) + delta);
    }
    const entries = accounts.map((account) => ({
      account,
      cents: balanceCents.get(account.id) ?? 0,
    }));
    points.push(buildPoint(cutoff.getTime(), entries, bucketFor));
  }
  return { points, currentByActualId: new Map(balanceCents) };
}
