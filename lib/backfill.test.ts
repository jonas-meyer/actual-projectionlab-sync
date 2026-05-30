import { describe, expect, it } from 'vitest';
import { buildBackfill, buildPoint, monthEndCutoffs, monthsSince, ymd } from './backfill';
import type { ActualAccount, Bucket } from './types';

const account = (id: string): ActualAccount => ({ id, name: id, offbudget: false, closed: false });

describe('buildPoint', () => {
  it('sums balances into netWorth and the chosen bucket', () => {
    const point = buildPoint(
      123,
      [
        { account: account('a'), balance: 100 },
        { account: account('b'), balance: 50 },
      ],
      () => 'savings',
    );
    expect(point.date).toBe(123);
    expect(point.netWorth).toBe(150);
    expect(point.savings).toBe(150);
    expect(point.taxable).toBe(0);
  });

  it('keeps a debt balance negative in both netWorth and its bucket', () => {
    const point = buildPoint(
      0,
      [
        { account: account('cash'), balance: 1000 },
        { account: account('card'), balance: -250 },
      ],
      (_account, balance): Bucket => (balance < 0 ? 'debt' : 'savings'),
    );
    expect(point.netWorth).toBe(750);
    expect(point.savings).toBe(1000);
    expect(point.debt).toBe(-250);
  });

  it('rounds buckets and netWorth to cents', () => {
    const point = buildPoint(0, [{ account: account('a'), balance: 10.005 }], () => 'savings');
    expect(point.savings).toBe(10.01);
    expect(point.netWorth).toBe(10.01);
  });
});

describe('monthEndCutoffs', () => {
  it('returns maxMonths month-ends, most recent first, starting at the current month', () => {
    const cutoffs = monthEndCutoffs(new Date(2024, 5, 15), 3); // mid-June 2024
    expect(cutoffs.map(ymd)).toEqual(['2024-06-30', '2024-05-31', '2024-04-30']);
  });

  it('rolls back across the year boundary', () => {
    const cutoffs = monthEndCutoffs(new Date(2024, 0, 10), 2); // January 2024
    expect(cutoffs.map(ymd)).toEqual(['2024-01-31', '2023-12-31']);
  });
});

describe('monthsSince', () => {
  it('counts whole months from a YYYY-MM start through now, inclusive', () => {
    expect(monthsSince('2024-01', new Date(2024, 0, 15))).toBe(1); // same month
    expect(monthsSince('2023-12', new Date(2024, 1, 1))).toBe(3); // Dec, Jan, Feb across the year
  });
});

describe('buildBackfill', () => {
  it('cumulatively sums monthly deltas, carrying months with no activity forward', () => {
    const deltas = [
      { account: 'a', month: '2024-01', delta: 10000 }, // £100
      { account: 'a', month: '2024-03', delta: 5000 }, // +£50 (no February activity)
    ];
    const { points } = buildBackfill(
      deltas,
      [account('a')],
      new Date(2024, 2, 15),
      () => 'savings',
    );
    expect(points.map((p) => p.netWorth)).toEqual([100, 100, 150]);
  });

  it('reports each account final balance in major units, from the same pass', () => {
    const deltas = [
      { account: 'a', month: '2024-01', delta: 10000 },
      { account: 'a', month: '2024-03', delta: 5000 },
      { account: 'b', month: '2024-02', delta: 2500 },
    ];
    const { currentByActualId } = buildBackfill(
      deltas,
      [account('a'), account('b')],
      new Date(2024, 2, 15),
      () => 'savings',
    );
    expect(currentByActualId.get('a')).toBe(150);
    expect(currentByActualId.get('b')).toBe(25);
  });

  it('returns no points and no balances when there are no deltas', () => {
    const { points, currentByActualId } = buildBackfill(
      [],
      [account('a')],
      new Date(2024, 2, 15),
      () => 'savings',
    );
    expect(points).toEqual([]);
    expect(currentByActualId.size).toBe(0);
  });
});
