import { defineConfig } from 'wxt';
import { PL_HOST_MATCH } from './lib/projectionlab';

export default defineConfig({
  manifestVersion: 3,
  modules: ['@wxt-dev/auto-icons'],
  autoIcons: { baseIconPath: 'assets/icon.svg' },
  manifest: ({ browser }) => ({
    name: 'Actual → ProjectionLab Sync',
    description: 'Sync Actual Budget account balances into ProjectionLab.',
    permissions: ['storage', 'scripting'],
    host_permissions: [PL_HOST_MATCH],
    // User-configured bridge origin, requested at runtime (https, or http only for loopback).
    optional_host_permissions: ['https://*/*', 'http://localhost/*', 'http://127.0.0.1/*'],
    // gecko.id is the permanent AMO id — set before the first Firefox submit, can't change after.
    ...(browser === 'firefox'
      ? {
          browser_specific_settings: {
            gecko: {
              id: 'actual-projectionlab-sync@jonas-meyer.github.io',
              strict_min_version: '128.0',
            },
          },
        }
      : {}),
  }),
});
