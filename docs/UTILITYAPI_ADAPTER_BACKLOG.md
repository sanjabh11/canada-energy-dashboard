# UtilityAPI Adapter Backlog

This document defines the follow-on adapter sprint required before CEIP can rehearse the Green Button runtime against UtilityAPI-backed OAuth and resource endpoints.

## Why this is deferred

UtilityAPI is a useful sidecar rehearsal lane after burner staging is live, but it is not a drop-in env swap for the current London-Hydro-first runtime.

The repo now includes a separate `/utilityapi-demo` route for DEMO-only sales rehearsal. That lane proves client-side Green Button XML parsing and forecast packaging, but it does not satisfy the full adapter backlog below because it avoids the London-Hydro-first callback/token/feed/revoke runtime entirely.

The demo lane now also includes:

- collection-aware polling over authorization and meter states
- client-side parsing of full authorization batch XML
- operator-only live actions enforced through Supabase magic-link auth plus an env-backed email allowlist
- a `15 minute` Supabase passwordless expiry expectation for the operator lane, with OTP-template fallback preferred over weakening expiry if email-link scanners consume tokens
- Upstash-backed distributed rate limiting for live actions
- monthly new-start budgeting plus authorization reuse to protect the UtilityAPI DEMO quota
- a structured XML sanitizer workflow so raw live captures stay outside git
- an explicit `Continue with Fixture Replay` recovery path when live mode fails closed because auth, allowlist, budget, or distributed-limiter checks reject the run

Those safeguards are intentionally scoped to the isolated demo surface. They do not reduce the adapter backlog below for the London-Hydro-first runtime.

Current repo limits:

- the `/utility-demand-forecast` route still drives a mock-first Green Button starter flow
- callback persistence stores token metadata only
- sync assumes a remote provider can be reached with an existing `feed_url`
- API revocation assumes `revoke_url + bearer access_token`

These assumptions do not match UtilityAPI's documented OAuth token response and revoke flow.

## Required adapter changes

1. Persist UtilityAPI-specific authorization metadata after callback:
   - `resourceURI`
   - `customerResourceURI`
   - `authorizationURI`
   - the authorization identifier needed to call revoke later

2. Add a UtilityAPI sync resolver:
   - derive the remote resource endpoint from the persisted UtilityAPI fields
   - support the documented resource or batch endpoint shape instead of requiring a pre-supplied `feed_url`

3. Add a UtilityAPI revoke resolver:
   - call `POST /api/v2/authorizations/{authorization_uid}/revoke`
   - use the correct UtilityAPI credential for that route
   - stop assuming the Green Button-native `revoke_url + access_token` contract

4. Add a non-mock staging harness:
   - expose a safe staging-only path that can initiate external OAuth without pretending the current mock starter button is a live provider flow
   - keep London Hydro and Alectra production readiness separate from any UtilityAPI rehearsal result

5. Decide whether any future public UtilityAPI rehearsal path stays anonymous:
   - the current `/utilityapi-demo` live mode is now operator-only and protected by distributed rate limiting
   - if live rehearsal traffic expands beyond a small internal operator pool, move from env-backed allowlists toward a managed role model and stronger centralized usage governance

## Acceptance Criteria

- UtilityAPI token exchange persists the provider-specific resource and authorization fields.
- Sync can run without manually injecting a `feed_url`.
- Revocation uses UtilityAPI's documented authorization revoke API.
- A live UtilityAPI rehearsal does not change London Hydro or Alectra submission readiness state.
