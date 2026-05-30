import { describe, expect, it } from 'vitest';
import { bucketOfPlAccount } from './buckets';
import type { PlAccountRef } from './types';

const investment = (type: string): PlAccountRef => ({
  id: 'id',
  name: 'name',
  type,
  category: 'investment',
});

describe('bucketOfPlAccount', () => {
  // Category-only: investments bucket as `taxable` regardless of type, never split into
  // taxFree/taxDeferred/crypto (README "ProjectionLab API limitation").
  it('buckets every investment as taxable, ignoring the account type', () => {
    expect(bucketOfPlAccount(investment('stock-isa'))).toBe('taxable');
    expect(bucketOfPlAccount(investment('uk-pension'))).toBe('taxable');
    expect(bucketOfPlAccount(investment('crypto'))).toBe('taxable');
  });
});
