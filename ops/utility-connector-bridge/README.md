# Utility Connector Bridge

This folder contains the deployment scaffold for the London Hydro connectivity bridge. The bridge is intentionally separate from Netlify and Supabase so CEIP can:

- terminate HTTPS on a company-controlled `gb.<domain>` host
- install a utility-approved RSA certificate chain
- route public and private bridge traffic into a local signer service
- proxy signer-validated token, feed, and revoke calls to London Hydro without exposing raw Supabase callback access

## Expected topology

- `app-staging.<burner-domain>` -> Netlify SPA for burner-domain staging
- `gb-staging.<burner-domain>` -> Caddy on a small VPS for burner-domain staging
- `app.<domain>` -> Netlify SPA for the canonical corporate production host
- `gb.<domain>` -> Caddy on a small VPS for the canonical corporate production host
- `127.0.0.1:8787` -> local signer service on the VPS
- `https://<project>.supabase.co/functions/v1/utility-connector-green-button` -> existing connector orchestration

Production submission stays halted until the Ontario legal entity, signer authority, canonical corporate hosts, and CA guidance are in place. Burner staging can move earlier on a disposable domain. See [docs/ONTARIO_ENTITY_BOOTSTRAP_CHECKLIST.md](/Users/sanjayb/minimax/canada-energy-dashboard/docs/ONTARIO_ENTITY_BOOTSTRAP_CHECKLIST.md).
Use [LONDON_HYDRO_CA_REQUEST_EMAIL.md](/Users/sanjayb/minimax/canada-energy-dashboard/ops/utility-connector-bridge/LONDON_HYDRO_CA_REQUEST_EMAIL.md) for the CA / connectivity / TLS-mode outreach and [docs/UTILITYAPI_ADAPTER_BACKLOG.md](/Users/sanjayb/minimax/canada-energy-dashboard/docs/UTILITYAPI_ADAPTER_BACKLOG.md) for the deferred UtilityAPI adapter scope.

## Bridge contract

- `GET /cmd/callback` -> public HTTPS browser redirect surface
- `POST /cmd/token` -> private server-to-server route
- `GET /cmd/feed` -> private server-to-server route
- `POST /cmd/revoke` -> private server-to-server route

`POST /cmd/token`, `GET /cmd/feed`, and `POST /cmd/revoke` must require signer-verified provenance headers from Supabase. Raw shared-secret forwarding is no longer sufficient for London Hydro bridge mode.

## Required operator inputs

- parent domain and DNS access
- disposable burner staging domain and DNS access
- custom app host for Netlify
- custom bridge host for the VPS
- London Hydro supported CA list from `gb@londonhydro.com`
- purchased or issuance-ready RSA 2048-bit certificate and key
- final upstream token/feed/revoke URLs provided during utility onboarding
- final upstream TLS mode confirmation:
  - `server_tls`
  - `mtls_upstream`
- bridge signing secrets, key identifier, allowed clock skew, and expected host/issuer values

Do not purchase the certificate until the supported CA list is confirmed in writing by London Hydro.
Do not place the production certificate order until the legal company name, signer, and public business contact details are finalized.
Do not let the burner staging domain leak into the London Hydro packet or production legal pages.

## TLS model

- `/cmd/callback` is **not** an mTLS endpoint. It is the public OAuth callback URL used by a browser redirect.
- Caddy is TLS terminator and router only. It should forward `/cmd/*` to the local signer service and not talk directly to Supabase or London Hydro.
- The signer service must:
  - sign callback forwards into Supabase
  - verify signed token/feed/revoke requests from Supabase
  - proxy only validated requests to London Hydro
- Token, feed, and revoke calls may require only standard server-auth TLS or upstream client-certificate presentation depending on London Hydro's connectivity instructions.
- The bridge must not assume outbound client-certificate presentation until London Hydro confirms it.
- It is acceptable to use a staging/internal or DV certificate on a non-submission burner hostname while the supported-CA path and legal entity are still being finalized.

## Connectivity evidence layers

1. **Layer A: public callback reachability**
   - Browser or plain `curl` to `https://gb-staging.<burner-domain>/cmd/callback?...` first
   - Verify HTTPS termination, handoff to the signer service, and signer-forwarded callback delivery to Supabase
   - `npm run ops:utility-bridge:evidence -- layer-a --bridge-base-url https://gb-staging.<burner-domain> --utility-name "London Hydro"` provides a repeatable capture path
   - Repeat on `https://gb.<domain>/cmd/callback?...` only after the corporation owns the canonical domain
2. **Layer B: private bridge contract**
   - Signed `curl` tests to `/cmd/token`, `/cmd/feed`, and `/cmd/revoke` on the burner staging bridge first
   - `npm run ops:utility-bridge:evidence -- layer-b --request-url https://gb-staging.<burner-domain>/cmd/feed --secret ... --key-id ... --issuer ... --original-host gb-staging.<burner-domain>` generates signer-valid requests for those routes
   - Verify signer-side auth enforcement, forwarding, replay protection, and sanitized logs against mock upstreams before repeating the evidence capture on the canonical production bridge host
3. **Layer C: utility-facing TLS evidence**
   - `openssl s_client` against `gb.<domain>:443` to inspect server certificate chain, SANs, and TLS versions
   - `npm run ops:utility-bridge:tls -- gb.<domain> 443 ops/utility-connector-bridge/evidence`
   - Optional outbound mTLS dry run against a mock upstream if London Hydro confirms that mode is required

## Runtime notes

- The bridge should keep request/response logs sanitized. Do not store raw access tokens.
- The signer should preserve the request method and query string on callback forwarding.
- The bridge should forward `Authorization: Bearer` for feed and revoke calls.
- The signer should capture request ID, original host, original proto, and public client IP for callback correlation.
- The bridge is a London-Hydro-first asset. Alectra remains reserve-only until its certificate posture is confirmed.
- The submission packet should stay blocked until Layers A, B, and C have evidence attached.
- The burner staging bridge is a rehearsal surface only and must not be treated as a submission-grade London Hydro host.
- Do not aim the existing runtime at UtilityAPI until the adapter work in [docs/UTILITYAPI_ADAPTER_BACKLOG.md](/Users/sanjayb/minimax/canada-energy-dashboard/docs/UTILITYAPI_ADAPTER_BACKLOG.md) is complete.
