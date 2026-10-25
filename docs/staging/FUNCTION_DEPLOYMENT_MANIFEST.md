# Edge-function deployment manifest (allowlist — owner-gated)

Target `qktgjpbifknqjpvrgkrj`: **5/110 deployed** (2026-10-24): `lead-capture` (dedup-patched), `whop-verify-access`, `whop-webhook` (dormant — secrets absent), `calibration-cron`, `storage-dispatch-scheduler`.
See `docs/PILOT_FUNCTION_INVENTORY.md` for the full classification.

## Deploy order (secrets first, functions second)

1. `supabase secrets set` — `WHOP_CEIP_*`, `SUPABASE_SERVICE_ROLE_KEY`,
   intake secrets — via dashboard, never in repo/.env commits.
2. `lead-capture` — public intake; verify 4xx on bad payload, 2xx on
   valid synthetic submission, RLS insert via service role only.
3. `whop-verify-access` — existing-customer entitlement; verify
   401 without auth, entitlement mapping for test member.
4. `whop-webhook` — verify HMAC gate fails closed without secret.
5. Then set repo var `SUPABASE_CRONS_LIVE=true` ONLY if cron functions
   are deployed too; otherwise crons stay skipped.
6. Everything else: undeployed = non-pilot (see inventory).

## Receipts required per function

deploy timestamp, version, test request/response (redacted), owner name.
