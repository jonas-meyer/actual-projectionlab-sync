import { describe, expect, it } from 'vitest';
import { autoLinkByName, reconcile, sumBalancesByPlAccount } from './mapping';
import type { ActualAccount, PlAccountRef } from './types';

const actual = (id: string, name = id): ActualAccount => ({
  id,
  name,
  offbudget: false,
  closed: false,
});
const pl = (id: string, name = id): PlAccountRef => ({
  id,
  name,
  type: 'savings',
  category: 'savings',
});

describe('reconcile', () => {
  it('keeps a mapping whose Actual and PL accounts both still exist', () => {
    const r = reconcile({ a1: 'p1' }, [actual('a1')], [pl('p1')]);
    expect(r.valid).toEqual({ a1: 'p1' });
    expect(r.staleActualIds).toEqual([]);
    expect(r.stalePlIds).toEqual([]);
    expect(r.unmappedActual).toEqual([]);
    expect(r.unmappedPl).toEqual([]);
  });

  it('drops a mapping whose PL account is gone, and re-surfaces the Actual account as unmapped', () => {
    const r = reconcile({ a1: 'p1' }, [actual('a1')], []);
    expect(r.valid).toEqual({});
    expect(r.stalePlIds).toEqual(['p1']);
    expect(r.unmappedActual.map((a) => a.id)).toEqual(['a1']);
  });

  it('drops a mapping whose Actual account is gone', () => {
    const r = reconcile({ a1: 'p1' }, [], [pl('p1')]);
    expect(r.valid).toEqual({});
    expect(r.staleActualIds).toEqual(['a1']);
    expect(r.unmappedPl.map((p) => p.id)).toEqual(['p1']);
  });

  it('surfaces never-mapped accounts on both sides', () => {
    const r = reconcile({}, [actual('a1')], [pl('p1')]);
    expect(r.unmappedActual.map((a) => a.id)).toEqual(['a1']);
    expect(r.unmappedPl.map((p) => p.id)).toEqual(['p1']);
  });

  it('dedupes a stale PL id shared by several mappings', () => {
    const r = reconcile({ a1: 'p1', a2: 'p1' }, [actual('a1'), actual('a2')], []);
    expect(r.stalePlIds).toEqual(['p1']);
  });
});

describe('autoLinkByName', () => {
  it('links by exact name, case-insensitively and trimmed', () => {
    expect(autoLinkByName([actual('a1', ' Cash ')], [pl('p1', 'cash')])).toEqual({ a1: 'p1' });
  });

  it('skips an ambiguous name shared by more than one PL account', () => {
    const links = autoLinkByName(
      [actual('a1', 'Savings')],
      [pl('p1', 'Savings'), pl('p2', 'Savings')],
    );
    expect(links).toEqual({});
  });

  it('returns no links when nothing matches', () => {
    expect(autoLinkByName([actual('a1', 'Cash')], [pl('p1', 'Stock ISA')])).toEqual({});
  });
});

describe('sumBalancesByPlAccount', () => {
  it('sums several Actual accounts mapped to the same PL account', () => {
    const balances = new Map([
      ['a1', 100],
      ['a2', 50],
      ['a3', 25],
    ]);
    expect(sumBalancesByPlAccount({ a1: 'p1', a2: 'p1', a3: 'p2' }, balances)).toEqual(
      new Map([
        ['p1', 150],
        ['p2', 25],
      ]),
    );
  });

  it('nets a negative balance (paid-in-full card mapped to cash) against the others', () => {
    const balances = new Map([
      ['cash', 1000],
      ['card', -250],
    ]);
    expect(sumBalancesByPlAccount({ cash: 'p1', card: 'p1' }, balances)).toEqual(
      new Map([['p1', 750]]),
    );
  });

  it('skips a mapped Actual account with no known balance', () => {
    expect(sumBalancesByPlAccount({ a1: 'p1', a2: 'p1' }, new Map([['a1', 100]]))).toEqual(
      new Map([['p1', 100]]),
    );
  });

  it('returns an empty map when nothing is mapped', () => {
    expect(sumBalancesByPlAccount({}, new Map([['a1', 100]]))).toEqual(new Map());
  });
});
