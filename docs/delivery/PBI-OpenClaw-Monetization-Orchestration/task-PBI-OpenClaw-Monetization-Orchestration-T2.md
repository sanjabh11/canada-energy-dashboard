# Task: Production Monetization Validation + Export/Billing Hardening

**ID:** PBI-OpenClaw-Monetization-Orchestration-T2
**Tier:** Tier 2 (Feature / Behavioral)
**Status:** InProgress
**Owner:** AI_Agent

## 1. Context
The prior monetization sprint established canonical entitlement foundations, route-aware auth behavior, and funnel instrumentation. The current sprint extends that work to validate and harden the production monetization path for high-value SKUs, specifically official export gating, API-key monetization, Stripe/Whop billing synchronization, telemetry integrity, and marketplace/security readiness.

## 2. Scope / Files
- `docs/delivery/MONETIZATION_GAP_ANALYSIS.md`
- `docs/delivery/PBI-OpenClaw-Monetization-Orchestration/tasks_index.json`
- `docs/delivery/PBI-OpenClaw-Monetization-Orchestration/task-PBI-OpenClaw-Monetization-Orchestration-T2.md`
- `netlify/functions/auth-session.ts`
- `supabase/functions/_shared/apiKeyMetering.ts`
- `supabase/functions/api-keys-admin/index.ts`
- `supabase/functions/api-v2-esg-finance/index.ts`
- `supabase/functions/api-v2-industrial-decarb/index.ts`
- `supabase/functions/stripe-create-checkout-session/index.ts`
- `supabase/functions/stripe-webhook/index.ts`
- `supabase/functions/create-export-job/index.ts`
- `supabase/functions/export-job-status/index.ts`
- `supabase/functions/process-export-jobs/index.ts`
- `supabase/functions/_shared/exportEntitlement.ts`
- `src/lib/exportJobsClient.ts`
- `src/lib/whop.ts`
- `src/lib/config.ts`

## 3. Acceptance Criteria
- [ ] Delivery gap analysis is updated with completed, partial, obsolete, and new workstreams based on code audit plus external marketplace research.
- [ ] `auth-session` no longer returns the raw cookie token to the browser while still supporting deterministic session checks.
- [ ] Stripe checkout + webhook paths use canonical entitlement tiers and upsert `entitlements` rather than relying on legacy-only `edubiz_users` writes.
- [ ] API key administration exposes tier and daily limit metadata needed for monetized API operations.
- [ ] Export monetization findings are reflected accurately: queued job/audit trail retained, lineage limitations documented, and unsafe bypass assumptions removed.
- [ ] High-priority fixes are implemented without breaking the existing Whop/standalone hybrid path.

## 4. Test Plan
1. `pnpm run build` succeeds.
2. Manual auth-session check:
   - `GET /api/auth/session` returns `authenticated` state without returning raw token.
3. Manual Stripe smoke review:
   - Checkout session creation uses canonical tiers only.
   - Webhook handler upserts `entitlements` with provider=`stripe`.
4. Manual API key admin review:
   - `GET /functions/v1/api-keys-admin` returns tier and daily limit fields.
5. Manual export review:
   - Existing job create/status/process flow still compiles and entitlement checks remain server-side.

## 5. Status History
- 2026-03-06: Task created (InProgress)
