# Store listing copy

Source text for the Chrome Web Store and Firefox AMO listings. Not shipped in the extension.

## Name

`Actual Budget → ProjectionLab Sync`

## Short description (Chrome limit: 132 chars)

`Sync your self-hosted Actual Budget balances and net-worth history into ProjectionLab.`

## Full description

Keep ProjectionLab up to date with your self-hosted Actual Budget data — without exporting
spreadsheets by hand.

What it does:

- Sync Now: pushes your current Actual account balances into ProjectionLab's Current Finances.
- Backfill: seeds ProjectionLab's net-worth history from your full Actual transaction history.
- Map each Actual account to a ProjectionLab account once; the extension reuses the mapping.

How it works:

- Actual has no browser-callable API, so you point the extension at your own self-hosted
  `actual-http-api` bridge (see the project README to deploy it).
- Balances are written into ProjectionLab through its official Plugin API, in your open
  ProjectionLab tab. Nothing is sent to the developer or any third party.

Requirements:

- A self-hosted Actual Budget server + the `actual-http-api` bridge.
- A ProjectionLab account with the Plugin API enabled (Settings → Plugins).

Open source: <https://github.com/jonas-meyer/actual-projectionlab-sync>

Not affiliated with, endorsed by, or sponsored by Actual Budget or ProjectionLab.

## Single-purpose description (Chrome)

Sync account balances and net-worth history from a user's self-hosted Actual Budget instance
into their ProjectionLab account.

## Permission justifications (Chrome)

- **storage** — saves your settings (bridge URL, API keys, ProjectionLab Plugin key) and the
  account mapping locally in the browser.
- **scripting** — injects a one-shot script into your open ProjectionLab tab to call its Plugin
  API (update balances, restore net-worth history). No persistent content script.
- **host: `https://*.projectionlab.com/*`** — to find the ProjectionLab tab (the main app or an
  early-access subdomain like ea./preview.) and run the Plugin API call there.
- **optional host: `https://*/*`, `http://localhost/*`, `http://127.0.0.1/*`** — your bridge is
  self-hosted at a URL only you know, so the extension requests that *specific* origin at runtime
  (not all of them). Plaintext http is allowed only for loopback; remote bridges must be https.

## Notes for reviewers

This extension talks to the user's own infrastructure, so it can't be exercised with a stock
browser alone. To test it you need: a self-hosted Actual server, the `actual-http-api` bridge
pointed at it, and a ProjectionLab account with a Plugin API key. The README documents the
full setup.

## Privacy policy URL

`https://github.com/jonas-meyer/actual-projectionlab-sync/blob/main/PRIVACY.md`
