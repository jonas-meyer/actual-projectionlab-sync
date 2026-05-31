import type { ActualAccount, Mapping, PlAccountRef } from './types';

export interface ReconcileResult {
  valid: Mapping;
  staleActualIds: string[];
  stalePlIds: string[];
  unmappedActual: ActualAccount[];
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

// Link unmapped accounts by exact (case-insensitive, trimmed) name; skip ambiguous names.
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

// Several Actual accounts can map to one PL account; sum their amounts. Unknown ones skipped.
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
