import { fakeBrowser } from '@webext-core/fake-browser';
import { beforeEach, describe, expect, it } from 'vitest';
import { store } from './storage';

describe('storage', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('falls back to empty until something is saved', async () => {
    expect(await store.settings.getValue()).toEqual({});
    expect(await store.mapping.getValue()).toEqual({});
  });

  it('round-trips settings and mapping through extension storage', async () => {
    await store.settings.setValue({
      bridgeUrl: 'https://bridge',
      apiKey: 'k',
      syncId: 's',
      plKey: 'p',
    });
    await store.mapping.setValue({ a1: 'p1' });
    expect(await store.settings.getValue()).toMatchObject({
      bridgeUrl: 'https://bridge',
      plKey: 'p',
    });
    expect(await store.mapping.getValue()).toEqual({ a1: 'p1' });
  });
});
