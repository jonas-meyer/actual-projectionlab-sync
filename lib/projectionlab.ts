// Shared by wxt.config (host_permissions) and plClient (tab query) so they can't drift.
// Only PL's app subdomains expose the plugin API; a wildcard could match a non-app tab.
export const PL_HOST_MATCHES = [
  'https://app.projectionlab.com/*',
  'https://ea.projectionlab.com/*',
];
