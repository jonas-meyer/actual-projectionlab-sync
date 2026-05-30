# Actual Budget → ProjectionLab Sync

A Chrome + Firefox extension that syncs account balances from a self-hosted
[Actual Budget](https://actualbudget.org/) instance into
[ProjectionLab](https://projectionlab.com/) via its Plugin API.

## How it works

Actual has no browser-callable API, so a small server-side bridge
([`jhonderson/actual-http-api`](https://github.com/jhonderson/actual-http-api))
re-exposes it over HTTP. See [`deploy/`](./deploy) for deployment steps.

```text
Actual -> actual-http-api bridge -> extension -> ProjectionLab
```

## Account mapping

Map each Actual account to a ProjectionLab account on the options page. For each PL account the
extension sums the balances of the Actual accounts mapped to it and writes that single total.
Unmapped accounts still count toward historical net worth (bucketed coarsely by balance sign) but
are not pushed to Current Finances.

Map by behavior, not one-to-one: group accounts the projection treats alike (e.g. every current
account into one cash account) and split only where it differs (growth rate, tax treatment).

Credit cards you pay off in full are a special case: map them to your cash account, not a debt
account. ProjectionLab models a paid-monthly card as an expense, not debt, so mapping the (negative)
card balances into cash nets them against your cash. Net worth stays exact with no debt line that
never pays down, and because the sum happens on the Actual side, PL only ever receives the positive
net balance. (For debt you actually carry, such as a mortgage or loan, use a PL debt account.)

## ProjectionLab API limitation

ProjectionLab's net-worth history is stored as eight fixed buckets (`savings`, `taxable`,
`taxDeferred`, `taxFree`, `crypto`, `assets`, `debt`, `loans`), and backfilled points must be written
already bucketed. The Plugin API exposes an account's `type` but not the bucket that type resolves to:
there is no per-account bucket field, no classify method, and the `autoProgress` snapshot that does
contain PL's own bucketing isn't always present (it can be disabled). So the backfilled history is
bucketed only at PL's account-category level (`savings`, `investment` -> `taxable`, `assets`, `debt`).
The net-worth line stays exact and Current Finances shows the full tax split (PL computes it live);
only the historical tax-composition is coarsened. A Plugin API method to expose an account's bucket,
or to classify the current accounts, would let the extension reconstruct the full history.

## Develop

Built with [WXT](https://wxt.dev) + TypeScript.

```bash
pnpm install    # installs deps + generates types
pnpm dev        # Chrome, hot-reload (Firefox: load .output/firefox-mv3 via about:debugging)
pnpm build      # package for the stores (pnpm build:firefox for the Firefox MV3 build)
```
