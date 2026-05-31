// Bucket by PL account CATEGORY only: the API exposes an account's type but not its bucket
// (see README "ProjectionLab API limitation"). Don't reintroduce type-name bucketing.
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
