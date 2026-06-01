# Privacy Policy: Actual Budget → ProjectionLab Sync

**Last updated:** 2026-05-31

This browser extension syncs your Actual Budget account balances into ProjectionLab. It is
designed so your financial data flows only between services **you** control.

## What it stores

The extension stores the following **locally in your browser** (extension storage), never on any
server operated by the developer:

- The URL of your self-hosted `actual-http-api` bridge.
- Your bridge API key and (if you use an end-to-end-encrypted budget) your budget encryption
  password.
- Your ProjectionLab Plugin API key.
- The mapping between your Actual accounts and your ProjectionLab accounts.

## What it transmits, and to whom

- **Your bridge.** The extension requests account balances and transaction history from the
  bridge URL **you** configure. That bridge talks to **your** Actual Budget server.
- **ProjectionLab.** Balances and net-worth history are written into ProjectionLab through its
  official Plugin API, executed inside your open ProjectionLab tab using the Plugin key you
  provide.

That is the full extent of data flow. The extension sends **no data to the developer** and to
**no third party**. There is no analytics, telemetry, tracking, or remote logging.

## Data sharing and sale

None. Your data is never sold, shared, or transmitted to anyone other than the services above,
which are operated by you (your bridge) or by ProjectionLab (which you have chosen to use).

## Security

Credentials are held in your browser's extension storage and sent only to the endpoints above.
Remote bridge connections require HTTPS; plaintext HTTP is permitted only for a bridge running on
your local machine (`localhost` / `127.0.0.1`). The security of your bridge and your browser
profile is ultimately under your control.

## Removing your data

Uninstalling the extension removes everything it stored. You can also clear it sooner from the
options page.

## Contact

Questions or issues: <https://github.com/jonas-meyer/actual-projectionlab-sync/issues>

Not affiliated with, endorsed by, or sponsored by Actual Budget or ProjectionLab.
