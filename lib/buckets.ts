// Maps a ProjectionLab account to its net-worth bucket by PL's account category.
// PL's API exposes an account's `type` but not the bucket it resolves to (see README
// "ProjectionLab API limitation"), so history is bucketed only at the category level;
// the investment tax-split is left to PL's live Current Finances.
import type { Bucket, PlAccountRef, PlCategory } from './types';

const CATEGORY_TO_BUCKET = {
  savings: 'savings',
  investment: 'taxable',
  asset: 'assets',
  debt: 'debt',
} as const satisfies Record<PlCategory, Bucket>;

export function bucketOfPlAccount(account: PlAccountRef): Bucket {
  return CATEGORY_TO_BUCKET[account.category];
}
