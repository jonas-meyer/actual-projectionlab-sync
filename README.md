# Actual Budget → ProjectionLab Sync

A Chrome + Firefox extension that syncs account balances from a self-hosted
[Actual Budget](https://actualbudget.org/) instance into
[ProjectionLab](https://projectionlab.com/) via its Plugin API.

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/ejjcchainadahjmdoglfjnlbdgjoimcm?label=Chrome%20Web%20Store&logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/ejjcchainadahjmdoglfjnlbdgjoimcm)
[![Firefox Add-ons](https://img.shields.io/amo/v/actual-projectionlab-sync?label=Firefox%20Add-ons&logo=firefoxbrowser&logoColor=white)](https://addons.mozilla.org/firefox/addon/actual-projectionlab-sync/)

## How it works

Actual has no browser-callable API, so a small server-side bridge
([`jhonderson/actual-http-api`](https://github.com/jhonderson/actual-http-api))
re-exposes it over HTTP. See [`deploy/`](./deploy) for setup.

```text
Actual -> actual-http-api bridge -> extension -> ProjectionLab
```

## Account mapping

Map each Actual account to a ProjectionLab account on the options page; the extension sums
the Actual balances mapped to each PL account and writes that one total. Map by behavior,
not one-to-one: group accounts the projection treats alike (e.g. all current accounts into
one cash account) and split only where growth or tax treatment differs. Unmapped accounts
still count toward historical net worth (bucketed coarsely by balance sign) but aren't
pushed to Current Finances.

Credit cards you pay off monthly: map them to your **cash** account, not a debt account.
ProjectionLab treats a paid-monthly card as an expense, so netting its negative balance into
cash keeps net worth exact with no debt line that never pays down. Use a PL debt account only
for debt you actually carry (mortgage, loan).

## ProjectionLab API limitation

PL stores net-worth history as eight fixed buckets, but the Plugin API exposes an account's
`type`, not the bucket it resolves to. So backfilled history is bucketed only by PL account
category (savings, investment, asset, debt). The net-worth total stays exact and Current
Finances shows the full tax split (PL computes it live); only the historical tax-composition
is coarsened. A Plugin API method to classify accounts would let the extension rebuild the
full split.

## Develop

Built with [WXT](https://wxt.dev) + TypeScript.

```bash
pnpm install    # deps + generated types
pnpm dev        # Chrome, hot-reload (Firefox: load .output/firefox-mv3 via about:debugging)
pnpm build      # package for the stores (build:firefox for the Firefox MV3 build)
```

## Disclaimer

Independent, unofficial project. Not affiliated with, endorsed by, or sponsored by Actual
Budget or ProjectionLab; both names are the property of their respective owners.
