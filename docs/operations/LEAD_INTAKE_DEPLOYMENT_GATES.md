# Lead intake deployment gates

Lead collection is disabled unless both the browser build and the deployed
function are explicitly enabled. This document records the configuration
contract; it does not approve collection, verify a provider, or authorize a
deployment.

## Owner approval and browser configuration

Before enabling forms, the privacy owner must verify and approve the actual
collection purpose, responsible contact, service-provider processing
locations, retention period, and access/correction/deletion process. Only then
may the browser build receive all of these values:

| Variable | Required value |
|---|---|
| `VITE_ENABLE_LEAD_INTAKE` | `true` after owner approval |
| `VITE_PRIVACY_NOTICE_APPROVED` | `true` after owner approval |
| `VITE_PRIVACY_CONTACT_NAME` | Name/title of the person who answers collection questions |
| `VITE_PRIVACY_CONTACT_EMAIL` | Verified, monitored privacy contact |
| `VITE_PRIVACY_POLICIES_URL` | HTTPS URL to current privacy policies and practices |
| `VITE_PRIVACY_PROCESSING_LOCATIONS` | Verified countries/regions for each provider |
| `VITE_PRIVACY_RETENTION_SUMMARY` | Approved retention and deletion summary |

If any field is missing or invalid, the app hides all lead intake fields and
shows that pilot requests are disabled. Do not copy example or inferred values
from source code into deployment configuration.

## Function configuration

The deployed Netlify function independently requires:

| Variable | Required value |
|---|---|
| `LEAD_INTAKE_ENABLED` | `true` only after the privacy gate is approved |
| `LEAD_INTAKE_NOTICE_APPROVED` | `true` only after the deployed notice is reviewed |
| `LEAD_INTAKE_DEDUP_SECRET` | Random secret of at least 32 bytes from the approved secret manager |
| `SUPABASE_URL` | The approved project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only service credential; never a `VITE_` variable |

The deduplication secret must not be reused as a user credential. If any
required function setting is absent, intake returns a generic unavailable
response and does not persist a submission.

## Deployment and staging order

1. Verify this tree identity and run the migration checker.
2. Apply `supabase/migrations/20261005001_lead_intake_dedup_token.sql` before
   deploying the intake function.
3. Deploy the function with collection disabled and verify its environment,
   RLS, rate-limit behavior, redacted logs, and migration compatibility using
   synthetic submissions only.
4. Deploy the browser build with collection disabled; inspect every collection
   point and confirm the disabled state.
5. Obtain named privacy and operations owner approval. Enable browser and
   function switches together only in the approved staging configuration.
6. Verify the notice, intake persistence, deduplication under concurrent
   submissions, retention/deletion, monitoring, alerting, and rollback in
   staging. Keep production disabled until separate owner authorization.

Staging or production verification must be recorded as a run/deployment ID
with the tested tree hash and retained, redacted evidence. Code and local tests
do not satisfy those runtime gates.
