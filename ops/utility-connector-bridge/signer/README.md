# Utility Connector Bridge Signer

This service is the programmable control plane behind the London Hydro bridge.

## Role

- receives `/cmd/*` traffic from Caddy on the VPS
- signs callback forwards into the Supabase `utility-connector-green-button?action=callback` endpoint
- verifies signed `POST /cmd/token`, `GET /cmd/feed`, and `POST /cmd/revoke` requests from Supabase
- proxies only validated requests to the configured London Hydro upstream endpoints

## Runtime assumptions

- Caddy terminates public HTTPS on `gb.<domain>` and reverse-proxies `/cmd/*` to `127.0.0.1:8787`
- `app.<domain>` remains on Netlify and never points to this VPS
- callback forwarding uses ordinary HTTPS
- upstream token/feed/revoke uses:
  - `server_tls` by default
  - `mtls_upstream` only if London Hydro confirms client-certificate presentation is required
- production certificate ordering stays blocked until the legal company name, signer, and supported CA path are finalized

## Required env

- `BRIDGE_SIGNER_PORT`
- `SUPABASE_GREEN_BUTTON_CALLBACK_URL_BASE`
- `UTILITY_CONNECTOR_BRIDGE_SIGNING_KEY_ID`
- `UTILITY_CONNECTOR_BRIDGE_TO_SUPABASE_SIGNING_SECRET`
- `UTILITY_CONNECTOR_SUPABASE_TO_BRIDGE_SIGNING_SECRET`
- `UTILITY_CONNECTOR_BRIDGE_ALLOWED_CLOCK_SKEW_SEC`
- `UTILITY_CONNECTOR_BRIDGE_EXPECTED_HOST`
- `UTILITY_CONNECTOR_BRIDGE_EXPECTED_ISSUER`
- `UTILITY_BRIDGE_UPSTREAM_TLS_MODE`
- `LONDON_HYDRO_TOKEN_URL`
- `LONDON_HYDRO_FEED_URL`
- `LONDON_HYDRO_REVOKE_URL`
- `LONDON_HYDRO_TLS_SERVER_NAME`
- `LONDON_HYDRO_CLIENT_CERT_FILE`
- `LONDON_HYDRO_CLIENT_KEY_FILE`
- `LONDON_HYDRO_CA_BUNDLE_FILE`

## Route model

- `GET /cmd/callback`
  - public browser callback entrypoint
  - signer adds provenance headers and forwards to Supabase
- `POST /cmd/token`
- `GET /cmd/feed`
- `POST /cmd/revoke`
  - private routes for Supabase-originated requests
  - signer rejects unsigned, stale, or replayed requests before proxying upstream

## Operational notes

- The signer uses an in-memory replay cache for Supabase-to-bridge nonces.
- The Supabase side stores callback nonces in `utility_connector_bridge_nonces`.
- Do not use this service as evidence of London Hydro compatibility until:
  - the supported CA list is archived
  - TLS mode is confirmed
  - Layer A/B/C evidence is captured on the real hosts
