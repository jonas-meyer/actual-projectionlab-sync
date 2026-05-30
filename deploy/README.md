# Deploy the bridge

The extension talks to `actual-http-api`, a thin HTTP wrapper around the Actual
Budget Node API. You deploy it from the public Docker image; you don't build it.

## Local (docker-compose)

```bash
cp .env.example .env      # fill in API_KEY + ACTUAL_SERVER_PASSWORD
docker compose up -d
```

- Actual server: <http://localhost:5006>
- Bridge + Swagger UI: <http://localhost:5007/api-docs/>

## fly.io

Copy the example configs somewhere private and fill in the `<placeholders>`:

- `fly.actual.example.toml`: the Actual sync server (skip if you already run it)
- `fly.http-api.example.toml`: the bridge

```bash
fly apps create <your-api-app>
fly secrets set ACTUAL_SERVER_PASSWORD='<actual password>' API_KEY='<long random>' -a <your-api-app>
fly deploy -c fly.http-api.example.toml
```

## Notes

- **Secrets** (`API_KEY`, `ACTUAL_SERVER_PASSWORD`) go via `fly secrets set`, never
  in the toml. `API_KEY` is the whole public perimeter, so make it long and random
  (e.g. `openssl rand -hex 32`).
- **`ACTUAL_SERVER_URL`**: the example uses the public `https://<server>.fly.dev/`,
  which is TLS-encrypted and needs no extra setup. Private routing is more involved:
  `.internal` requires the server to listen on IPv6, and `.flycast` trips a TLS
  cert-name mismatch behind `force_https`.
- **Pin the image version** (e.g. `:26.5.2`, the current latest), not `:latest`, and
  match it roughly to your Actual server version so an upstream change can't silently
  break sync.
- **`EXPERIMENTAL_OPERATIONS_ENABLED=true`**: the extension reads balances and history
  through the bridge's `run-query` (ActualQL) endpoint, which actual-http-api treats as
  an experimental operation. It defaults to on upstream, but the examples set it
  explicitly so the bridge can't be left without it; if it's off, sync fails with `501`.
- **Encrypted budgets**: the encryption password is not an env var; the bridge only
  accepts it as the per-request `budget-encryption-password` header. The extension
  sends it; nothing to configure here.
- **Verify** before touching the extension: open `/api-docs/` and call
  `GET /v1/budgets/{syncId}/accounts` from the Swagger UI.
