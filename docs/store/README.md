# Store assets

Screenshots and promo images for the Chrome Web Store / AMO listings (not shipped in the
extension). Layout follows `alex-stout/projectionlab-account-sync`. Listing copy is in
[`listing.md`](./listing.md); the privacy policy is [`PRIVACY.md`](../../PRIVACY.md) at the repo root.

Put Chrome shots in `chrome/`, Firefox shots in `firefox/`.

## Screenshots (1280x800 PNG, padded with the theme background)

The same set lives in both `chrome/` and `firefox/`:

- `01-popup.png` — popup, ready to Sync
- `02-options-mapping.png` — options page, account-mapping table
- `03-settings.png` — the settings form (demo values)
- `04-popup-synced.png` — popup after a successful Sync
- `05-popup-backfill.png` — popup, Backfill confirmation prompt

## Chrome promo tiles (optional)

- `chrome/promo-small.png` — 440x280
- `chrome/promo-marquee.png` — 1400x560

## ⚠️ Before capturing

Use a throwaway/empty config — never show real bridge URLs, API keys, encryption
passwords, or account names in a screenshot.
