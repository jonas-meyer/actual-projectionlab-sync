import { defineConfig } from 'wxt';

// WXT generates the manifest from this config + entrypoints/. https://wxt.dev
// manifestVersion 3 forces MV3 on Firefox too (WXT defaults it to MV2). wxt dev
// can't hot-reload Firefox MV3 (wxt-dev/wxt#230), so there's no dev:firefox
// script: develop on Chrome, verify Firefox by loading .output/firefox-mv3 via
// about:debugging.
export default defineConfig({
  manifestVersion: 3,
  // Generates icons/*.png from one SVG at build time (no committed PNGs); dev builds
  // get a grayscaled icon so the unpacked extension is distinguishable on the toolbar.
  modules: ['@wxt-dev/auto-icons'],
  // sizes default to [128, 48, 32, 16]; only the SVG source path needs overriding.
  autoIcons: { baseIconPath: 'assets/icon.svg' },
  manifest: ({ browser }) => ({
    name: 'Actual → ProjectionLab Sync',
    description: 'Sync Actual Budget account balances into ProjectionLab.',
    // `scripting` + the fixed app.projectionlab.com host let the background inject
    // into the page's MAIN world to call its plugin API (no persistent content
    // script; the host permission also covers finding the tab, so no `tabs` perm).
    permissions: ['storage', 'scripting'],
    host_permissions: ['https://app.projectionlab.com/*'],
    // Bridge origin is user-configured, so request the specific origin at runtime
    // instead of hardcoding. Fetches run in the background worker (avoids page CORS).
    // https for a remote bridge; loopback http for one running locally (see
    // bridgeOriginPattern, which rejects plaintext http to any non-loopback host).
    optional_host_permissions: ['https://*/*', 'http://localhost/*', 'http://127.0.0.1/*'],
    // Injecting into the page MAIN world needs Firefox 128+.
    ...(browser === 'firefox'
      ? { browser_specific_settings: { gecko: { strict_min_version: '128.0' } } }
      : {}),
  }),
});
