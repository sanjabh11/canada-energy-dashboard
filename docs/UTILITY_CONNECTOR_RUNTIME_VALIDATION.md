# Utility Connector Runtime Validation

This document is the operational companion to the utility connector runtime pack. It defines how the Green Button and telemetry connectors are validated locally before any external utility onboarding claim is made.

## Scope

- Green Button CMD runtime validation uses local and mocked flows only.
- Telemetry validation targets the current signed HTTPS JSON contract only.
- Revocation validation must prove both API-managed and portal-managed disconnect behavior before any London Hydro or Alectra demo is claimed ready.
- Raw DNP3 polling, MQTT brokers, and direct SCADA integration remain out of scope for this phase.

## Supabase Secret Custody

Use Supabase Edge secrets for deployed connector credentials and ingest keys. Do not depend on local `.env` files in deployed paths.

Required secrets:

- `UTILITY_CONNECTOR_INGEST_KEY`
- `UTILITY_CONNECTOR_TOKEN_SECRET`
- `UTILITY_GREEN_BUTTON_AUTHORIZE_URL`
- `UTILITY_GREEN_BUTTON_BRIDGE_BASE_URL`
- `UTILITY_GREEN_BUTTON_TOKEN_URL`
- `UTILITY_GREEN_BUTTON_CLIENT_ID`
- `UTILITY_GREEN_BUTTON_CLIENT_SECRET`
- `UTILITY_GREEN_BUTTON_REDIRECT_URI`
- `UTILITY_CONNECTOR_BRIDGE_SIGNING_KEY_ID`
- `UTILITY_CONNECTOR_BRIDGE_TO_SUPABASE_SIGNING_SECRET`
- `UTILITY_CONNECTOR_SUPABASE_TO_BRIDGE_SIGNING_SECRET`
- `UTILITY_CONNECTOR_BRIDGE_ALLOWED_CLOCK_SKEW_SEC`
- `UTILITY_CONNECTOR_BRIDGE_EXPECTED_HOST`
- `UTILITY_CONNECTOR_BRIDGE_EXPECTED_ISSUER`

Required frontend configuration:

- `VITE_PUBLIC_APP_URL`
- `VITE_UTILITY_CONNECTOR_BASE_URL`

Bridge operator configuration:

- `UTILITY_CONNECTOR_BRIDGE_SIGNING_KEY_ID`
- `UTILITY_CONNECTOR_BRIDGE_TO_SUPABASE_SIGNING_SECRET`
- `UTILITY_CONNECTOR_SUPABASE_TO_BRIDGE_SIGNING_SECRET`
- `UTILITY_CONNECTOR_BRIDGE_ALLOWED_CLOCK_SKEW_SEC`
- `UTILITY_CONNECTOR_BRIDGE_EXPECTED_HOST`
- `UTILITY_CONNECTOR_BRIDGE_EXPECTED_ISSUER`
- `UTILITY_BRIDGE_UPSTREAM_TLS_MODE=server_tls|mtls_upstream`
- `LONDON_HYDRO_CLIENT_CERT_FILE`
- `LONDON_HYDRO_CLIENT_KEY_FILE`
- `LONDON_HYDRO_CA_BUNDLE_FILE`

Operational rule:

- Rotate connector secrets on a 30-90 day cadence.
- Revoke and replace any Green Button token immediately after a failed utility review or explicit customer revocation.
- Do not generate external submission packets from a browser origin that does not match `VITE_PUBLIC_APP_URL`.
- Do not treat `*.netlify.app`, `*.supabase.co`, preview URLs, or localhost as London Hydro submission-ready hosts.
- Do not buy a London Hydro-facing certificate until the supported CA list is confirmed in writing.
- Do not start production certificate ordering or London Hydro packet submission until the Ontario legal entity and signer authority are in place.

## Dual-Track Rollout

- `Staging internet readiness` is allowed to move now on a burner domain owned by the individual operator.
- Use `app-staging.<burner-domain>` for the Netlify SPA and `gb-staging.<burner-domain>` for the VPS bridge.
- Burner staging hosts may use disposable DV certificates such as Let’s Encrypt.
- Burner staging hosts exist only for public callback reachability, signer/Caddy rehearsal, optional UtilityAPI-backed demos, and browser proof outside localhost.
- Burner staging hosts must never appear in:
  - the London Hydro packet
  - public legal/privacy/security pages intended for utility review
  - the final production certificate order
- `Production submission readiness` remains blocked until the Ontario corporation, canonical corporate domain, supported-CA path, and real Layer A/B/C evidence exist on the final hosts.

## Local Runtime Validation Flow

1. Run the unit contract suite for:
   - mocked Green Button authorize URL generation
   - mocked token exchange success and revocation
   - mocked feed sync success and unauthorized fetch
   - mocked disconnect request, portal confirmation, and token purge
   - telemetry payload validation and ingest
2. Run the browser spec for `/utility-demand-forecast`.
3. Confirm the route does not display `Live-connected` unless a connector card is `active`, non-fallback, and `live`.
4. Confirm revoked or expired connector metadata downgrades the card to `revoked` or `stale`.
5. Confirm the submission panel blocks external submission when `VITE_PUBLIC_APP_URL` is missing, non-HTTPS, or different from the current browser origin.
6. Confirm the submission panel blocks London Hydro submission when `VITE_UTILITY_CONNECTOR_BASE_URL` is missing, non-HTTPS, local-only, or still on a shared default host.

## Bridge Trust Model

- `GET /cmd/callback` is a public HTTPS browser callback. It forwards the request into the Supabase `utility-connector-green-button?action=callback` path.
- `POST /cmd/token`, `GET /cmd/feed`, and `POST /cmd/revoke` are server-to-server bridge routes. They must require signed bridge provenance from Supabase.
- Caddy is router-only. It should hand `/cmd/*` traffic to the local signer service instead of proxying directly to Supabase or London Hydro.
- The bridge must not assume upstream client-certificate presentation by default. Set `UTILITY_BRIDGE_UPSTREAM_TLS_MODE` only after London Hydro confirms whether the utility-facing token/feed/revoke exchange requires:
  - `server_tls`
  - `mtls_upstream`

## Entity Bootstrapping Hold

- London Hydro submission remains halted until the Ontario corporation is formed and the legal company name is locked.
- The same legal company name, signer, business email, phone number, and address must be used across:
  - the submission packet
  - public legal/privacy/security pages
  - future certificate orders
  - domain registration and deployment handoff notes
- DUNS is optional until the supported Certificate Authority explicitly requires it.
- Send the London Hydro CA / connectivity / TLS-mode email in parallel with staging work. Do not wait for incorporation to remove that uncertainty.
- Use the operator checklist in [ONTARIO_ENTITY_BOOTSTRAP_CHECKLIST.md](/Users/sanjayb/minimax/canada-energy-dashboard/docs/ONTARIO_ENTITY_BOOTSTRAP_CHECKLIST.md) to track the external blockers that cannot be proven in local runtime tests.
- Use the outreach draft in [LONDON_HYDRO_CA_REQUEST_EMAIL.md](/Users/sanjayb/minimax/canada-energy-dashboard/ops/utility-connector-bridge/LONDON_HYDRO_CA_REQUEST_EMAIL.md) so the CA / connectivity / TLS-mode request is sent in a consistent format.

## Deferred UtilityAPI Adapter

- UtilityAPI remains a follow-on adapter sprint after burner staging is live.
- Do not point the current staging runtime at UtilityAPI by only swapping OAuth or feed env vars.
- `/utilityapi-demo` is now the isolated sales-demo surface for UtilityAPI DEMO and fixture-backed Green Button XML rehearsal.
- The demo route is intentionally separate from `/utility-demand-forecast` and does not write to London-Hydro-first connector tables or submission-readiness state.
- Demo-lane constraints:
  - `activate_demo` hard-caps UtilityAPI historical collection to `3` months.
  - public `Fixture Replay` remains available without login or edge-network access.
  - all live UtilityAPI actions now require a Supabase magic-link session plus an env-backed operator email allowlist.
  - Supabase passwordless email login for the operator live lane should use a `15 minute` expiry. Do not shorten it further unless link-prefetch behavior is eliminated, because email security scanners can consume one-time magic links before the operator opens them.
  - live UtilityAPI actions are disabled unless `UTILITYAPI_DEMO_LIVE_ENABLED=true`.
  - live DEMO polling is collection-aware and transitions through `authorization_pending`, `meters_discovered`, `collection_pending`, `collection_ready`, `pending_manual`, `wait_to_login`, `no_intervals`, `revoked`, or `errored`.
  - the page uses bounded hybrid polling and does not attempt XML sync until the edge function reports the authorization or meters are ready.
  - if live mode is blocked by auth, allowlist, budget, or distributed-limiter failures, the UI must keep the backend fail-closed and offer an explicit `Continue with Fixture Replay` recovery path instead of silently presenting replay as live data.
  - heavy demo artifacts live in IndexedDB, while sessionStorage stores only the active session pointer.
  - `Fixture Replay` uses a bundled XML asset and makes zero edge-network requests.
  - the live-demo route uses Upstash-backed distributed rate limiting keyed on operator identity first and IP second before any UtilityAPI call is made.
  - live DEMO starts reuse an existing operator authorization when possible and enforce a monthly new-start budget via `UTILITYAPI_DEMO_MONTHLY_START_BUDGET`.
  - raw UtilityAPI XML captures must stay outside git under `ops/utility-connector-bridge/tmp/utilityapi-live/`; only sanitized outputs belong in `tests/fixtures/`.
  - sanitize live XML captures with `npm run ops:utilityapi-demo:sanitize-xml -- <raw-xml> <tests/fixtures/output.xml>` before adding any regression fixture to the repo.
- Current repo limits that block a direct UtilityAPI rehearsal:
  - the `/utility-demand-forecast` UI still exercises a mock-first Green Button starter flow
  - callback persistence stores token metadata, but not UtilityAPI `resourceURI`, `customerResourceURI`, or `authorizationURI`
  - sync currently assumes an existing `feed_url` when running against a remote provider
  - API revocation currently assumes `revoke_url + bearer access_token`, which does not match UtilityAPI's documented authorization revoke API
- Track the adapter sprint in [UTILITYAPI_ADAPTER_BACKLOG.md](/Users/sanjayb/minimax/canada-energy-dashboard/docs/UTILITYAPI_ADAPTER_BACKLOG.md).

## Ontario Registration Packet

The canonical Ontario onboarding packet now lives in the route UI and code:

- `London Hydro`
- `Alectra Utilities`

Each packet must include:

- registration URL
- utility terms / privacy URL
- public utility security statement URL
- custom bridge callback URI
- bridge callback forward target
- requested scope `FB=4_5_15_16`
- registration form categories starting with `Usage Information`
- revocation behavior
- revocation mode and manage-connections URL
- bridge runtime contract: `GET /cmd/callback`, `POST /cmd/token`, `GET /cmd/feed`, `POST /cmd/revoke`
- data-retention answer
- privacy mapping
- replayable demo script

## Connectivity Evidence Layers

1. **Layer A: public callback reachability**
   - Use a browser or plain `curl` against `https://gb-staging.<burner-domain>/cmd/callback?...` during staging, then repeat on `https://gb.<domain>/cmd/callback?...` for production evidence.
   - Verify the bridge accepts standard HTTPS traffic and forwards the request to the Supabase callback target.
   - Do not use a client certificate here. The callback is not the mTLS proof surface.
   - Use `npm run ops:utility-bridge:evidence -- layer-a ...` for a repeatable reachability transcript.
2. **Layer B: private bridge contract**
   - Use signed `curl` requests against `POST /cmd/token`, `GET /cmd/feed`, and `POST /cmd/revoke` on the staging bridge first.
   - Point the bridge at mock upstreams first and verify signer auth enforcement, request forwarding, sanitized logs, and failure behavior before repeating the evidence capture on the canonical production bridge host.
   - Use `npm run ops:utility-bridge:evidence -- layer-b ...` so the signer-valid HMAC headers are generated consistently.
3. **Layer C: utility-facing TLS evidence**
   - Use `openssl s_client -connect gb.<domain>:443 -servername gb.<domain>` only on the canonical production bridge host to inspect SANs, certificate chain, key algorithm, and TLS protocol support.
   - Only run an outbound mTLS dry run against a mock upstream if London Hydro confirms `mtls_upstream` mode is required.
   - Do not treat a successful callback response as proof of outbound utility-facing TLS readiness.
   - Use `npm run ops:utility-bridge:tls -- gb.<domain> [port] [output-dir]` to capture the raw `openssl` transcript and extracted leaf certificate details.

## Exit Gate

This phase is complete only when all of the following are true:

- mocked Green Button callback and sync tests pass
- mocked Green Button revoke tests pass
- mocked telemetry ingest tests pass
- the utility route browser spec passes
- onboarding packs for London Hydro and Alectra are visible and complete
- the public utility security statement is live and linked from the submission-readiness surface
- the canonical production URL is configured and the route is being reviewed from that same host
- the custom Green Button bridge host is configured and visible in the onboarding and submission packets
- the packet contains no `*.netlify.app`, `*.supabase.co`, preview, or localhost URLs
- the packet contains no burner staging hostnames
- the Ontario corporation is formed and signer authority exists
- the parent domain is registered to the final legal name / brand
- London Hydro supported CA guidance has been requested and archived
- the certificate issuance path is chosen from the supported CA list
- the outbound TLS mode is confirmed as `server_tls` or `mtls_upstream`
- Layer A callback reachability evidence exists
- Layer B private bridge contract evidence exists
- Layer C TLS evidence exists
- the Caddy plus signer bridge contract is staged for `gb.<domain>` with signer-backed provenance for callback and token/feed/revoke
- the route stays honest about fallback, stale, and revoked states
- the UtilityAPI demo lane rate-limit policy and collection-aware polling behavior are documented for operators if live sandbox rehearsal is enabled
