import { defineConfig } from 'vitest/config';
import { WxtVitest } from 'wxt/testing/vitest-plugin';

// Polyfills the `browser` API in tests with @webext-core/fake-browser, so code that
// touches browser.* (e.g. lib/storage.ts via wxt/utils/storage) can be unit tested.
export default defineConfig({
  plugins: [WxtVitest()],
});
