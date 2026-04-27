# Ontario Entity Bootstrap Checklist

This checklist tracks the external blockers that must clear before the London Hydro packet can move beyond `do_not_submit_yet`, while still allowing a burner-domain staging track to move in parallel.

## 1. Freeze the production submission path

- Do not submit the London Hydro packet yet.
- Do not purchase the production London Hydro-facing certificate yet.
- Keep `UTILITY_BRIDGE_UPSTREAM_TLS_MODE=server_tls` unless London Hydro confirms `mtls_upstream` in writing.
- Keep the packet scoped to `Usage Information` only.
- Do not buy the canonical production domain personally. Reserve that purchase for the corporation.

## 2. Unblock burner-domain staging now

- Register a disposable staging domain under the individual owner.
- Bind `app-staging.<burner-domain>` to Netlify only.
- Provision the VPS for `gb-staging.<burner-domain>` with a stable public IPv4 address.
- Stage Caddy plus signer on the VPS with a disposable DV certificate for public callback and signer-contract testing.
- Use the burner staging hosts only for:
  - public callback reachability checks
  - signer/Caddy contract testing
  - browser-demo rehearsal outside localhost
  - optional UtilityAPI-backed sandbox rehearsals
- Keep the burner staging domain out of:
  - the London Hydro packet
  - production legal/privacy/security pages
  - the final London Hydro-facing certificate order

## 3. Form the Ontario legal entity

- Lock the legal company name that will appear on:
  - the utility agreement
  - public legal/privacy/security pages
  - the future certificate order
  - the domain registration record
- Incorporate in Ontario and archive the incorporation record.
- Finalize the authorized signer:
  - signer full name
  - signer title
  - signer authority to bind the corporation
- Finalize the business contact pack:
  - business email
  - publicly verifiable phone number
  - business address

## 4. Run CA discovery in parallel

- Email `gb@londonhydro.com` and request:
  - the supported Certificate Authority list
  - connectivity-testing instructions
  - explicit confirmation whether token/feed/revoke should use `server_tls` or `mtls_upstream`
- Start from [LONDON_HYDRO_CA_REQUEST_EMAIL.md](/Users/sanjayb/minimax/canada-energy-dashboard/ops/utility-connector-bridge/LONDON_HYDRO_CA_REQUEST_EMAIL.md) so the request is archived in a reusable format.
- Keep certificate purchase blocked until this answer is archived.
- Keep DUNS optional until the chosen supported CA explicitly requires it.

## 5. Cut over to the canonical corporate domain

- Register the parent production domain after the legal company name is locked and the corporation is ready to own it.
- Bind `app.<domain>` to Netlify only.
- Point `gb.<domain>` to the VPS bridge.
- Swap the burner staging host env values for the canonical production host env values only after the production domain exists.
- Start CA pre-validation with the chosen supported vendor as soon as the corporation and public business contacts are final.

## 6. Synchronize public legal surfaces

- Update the public privacy page, terms page, and utility security statement to use:
  - the final legal company name
  - the final custom app URL
  - the final security / privacy / legal contacts
- Remove any remaining submission-facing `*.netlify.app`, `*.supabase.co`, preview, localhost, or burner staging references from packet-generating or customer-facing legal surfaces.

## 7. Resume condition for London Hydro

Resume the London Hydro production path only when all of the following are true:

- Ontario corporation is formed and signer authority exists.
- Parent domain is registered to the final name / brand.
- `app.<domain>` is live on Netlify and `gb.<domain>` is live on the VPS.
- London Hydro CA guidance is archived.
- The certificate issuance path is chosen from that supported CA list.
- Staging Layer A/B evidence has already been collected on the burner hosts with the operator evidence scripts.
- Layer A/B/C connectivity evidence exists on the real hosts.
- The demo video shows `authorize -> sync -> disconnect -> revoked`.
