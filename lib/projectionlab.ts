// Shared by wxt.config (host_permissions) and plClient (tab query) so they can't drift;
// the wildcard covers the main app + early-access subdomains (ea./preview.).
export const PL_HOST_MATCH = 'https://*.projectionlab.com/*';
