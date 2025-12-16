# Pending Tasks (Supabase / Infra Dependent)

These items are **high-priority** but blocked until Supabase / DB access is available.

## Blocked: Requires Supabase / DB Access

- [ ] Run carbon-emissions migrations and redeploy `api-v2-carbon-emissions`.
- [ ] Redeploy `api-v2-ieso-queue` with the fixed column mapping so Grid Queue shows real values.
- [ ] Design and apply a JWT + RLS + rate-limiting hardening pass across critical edge functions.

## Next Coding Steps (after Supabase connection confirmed)

- [ ] Wire `AIDataCentreDashboard` to use the `api-v2-ai-datacentres` API (replacing hardcoded mock list, keeping existing UI layout and comments exactly as they are).
- [ ] Wire `CERComplianceDashboard` to use the `api-v2-cer-compliance` API (replacing hardcoded mock list, keeping existing UI layout and comments exactly as they are).
