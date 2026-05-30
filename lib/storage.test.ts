import { fakeBrowser } from '@webext-core/fake-browser';
import { beforeEach, describe, expect, it } from 'vitest';
import { getMapping, getSettings, saveMapping, saveSettings } from './storage';

describe('storage', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('falls back to empty until something is saved', async () => {
    expect(await getSettings()).toEqual({});
    expect(await getMapping()).toEqual({});
  });

  it('round-trips settings and mapping through extension storage', async () => {
    await saveSettings({ bridgeUrl: 'https://bridge', apiKey: 'k', syncId: 's', plKey: 'p' });
    await saveMapping({ a1: 'p1' });
    expect(await getSettings()).toMatchObject({ bridgeUrl: 'https://bridge', plKey: 'p' });
    expect(await getMapping()).toEqual({ a1: 'p1' });
  });
});
