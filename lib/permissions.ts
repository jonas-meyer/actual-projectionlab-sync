// Host-permission handling for the user-configured bridge origin.
// The manifest declares a broad optional_host_permissions; we only ever grant
// the specific bridge origin, requested at runtime. This is the pattern Chrome
// recommends for hosts unknown at build time:
// https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions

/**
 * Origin match pattern (e.g. "https://api.example.com/*") for a bridge URL, or null if
 * the URL is invalid or would send the bridge secrets over plaintext. Every bridge
 * request carries the API key (and encryption password), so http is allowed only for
 * loopback; a remote bridge must be https. These patterns are covered by the manifest's
 * optional_host_permissions, so permissions.request can actually grant them.
 */
export function bridgeOriginPattern(bridgeUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(bridgeUrl);
  } catch {
    return null;
  }
  const isLoopback = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && isLoopback)) return null;
  return `${url.origin}/*`;
}

/** Whether we already hold host permission for the bridge origin. */
export async function hasBridgePermission(bridgeUrl: string): Promise<boolean> {
  const pattern = bridgeOriginPattern(bridgeUrl);
  if (!pattern) return false;
  return browser.permissions.contains({ origins: [pattern] });
}

/** Request host permission for the bridge origin. Idempotent; must be called within a user gesture. */
export async function ensureBridgePermission(bridgeUrl: string): Promise<boolean> {
  const pattern = bridgeOriginPattern(bridgeUrl);
  if (!pattern) return false;
  return browser.permissions.request({ origins: [pattern] });
}
