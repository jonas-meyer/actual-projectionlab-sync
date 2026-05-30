// Reconciles the persisted account map against the live Actual and PL account
// lists: drops mappings whose accounts no longer exist and surfaces unmapped
// accounts, so the mapping heals as accounts are added/removed on either side.
import type { ActualAccount, Mapping, PlAccountRef } from './types';

export interface ReconcileResult {
  /** Mappings whose Actual and PL accounts both still exist. */
  valid: Mapping;
  /** Mapped Actual ids no longer present in the live account list. */
  staleActualIds: string[];
  /** Mapped PL ids no longer present in the live account list. */
  stalePlIds: string[];
  /** Actual accounts not validly mapped to a PL account. */
  unmappedActual: ActualAccount[];
  /** PL accounts not targeted by any valid mapping. */
  unmappedPl: PlAccountRef[];
}

export function reconcile(
  mapping: Mapping,
  actualAccounts: ActualAccount[],
  plAccounts: PlAccountRef[],
): ReconcileResult {
  const actualIds = new Set(actualAccounts.map((a) => a.id));
  const plIds = new Set(plAccounts.map((p) => p.id));

  const valid: Mapping = {};
  const staleActualIds: string[] = [];
  const stalePlIds = new Set<string>();
  const mappedActualIds = new Set<string>();
  const mappedPlIds = new Set<string>();

  for (const [actualId, plId] of Object.entries(mapping)) {
    if (actualIds.has(actualId) && plIds.has(plId)) {
      valid[actualId] = plId;
      mappedActualIds.add(actualId);
      mappedPlIds.add(plId);
      continue;
    }
    if (!actualIds.has(actualId)) staleActualIds.push(actualId);
    if (!plIds.has(plId)) stalePlIds.add(plId);
  }

  return {
    valid,
    staleActualIds,
    stalePlIds: [...stalePlIds],
    unmappedActual: actualAccounts.filter((a) => !mappedActualIds.has(a.id)),
    unmappedPl: plAccounts.filter((p) => !mappedPlIds.has(p.id)),
  };
}

// Suggests links for unmapped Actual accounts by exact (case-insensitive, trimmed)
// name match to an unmapped PL account. Skips a name that more than one PL account
// shares, since the match would be ambiguous.
export function autoLinkByName(
  unmappedActual: ActualAccount[],
  unmappedPl: PlAccountRef[],
): Mapping {
  const norm = (s: string): string => s.trim().toLowerCase();
  const byName = new Map<string, string | null>();
  for (const pl of unmappedPl) {
    const key = norm(pl.name);
    byName.set(key, byName.has(key) ? null : pl.id);
  }
  const links: Mapping = {};
  for (const a of unmappedActual) {
    const plId = byName.get(norm(a.name));
    if (plId) links[a.id] = plId;
  }
  return links;
}

// Sum each Actual account's balance into the PL account it maps to; several Actual
// accounts can map to one PL account (e.g. all current accounts into cash, or a
// paid-in-full card netted against it). Actual accounts with no known balance are skipped.
export function sumBalancesByPlAccount(
  mapping: Mapping,
  currentByActualId: Map<string, number>,
): Map<string, number> {
  const sumByPl = new Map<string, number>();
  for (const [actualId, plId] of Object.entries(mapping)) {
    const balance = currentByActualId.get(actualId);
    if (balance === undefined) continue;
    sumByPl.set(plId, (sumByPl.get(plId) ?? 0) + balance);
  }
  return sumByPl;
}
