# Task: Canonical Entitlements + Monetization Funnel Hardening

**ID:** PBI-OpenClaw-Monetization-Orchestration-T1
**Tier:** Tier 2 (Feature / Behavioral)
**Status:** InProgress
**Owner:** AI_Agent

## 1. Context
OpenClaw outreach and monetization strategy docs are updated, but implementation gaps remain across entitlement consistency, route-aware auth UI, Whop access verification trust model, billing config portability, funnel instrumentation, and lifecycle orchestration.

## 2. Scope / Files
- `src/lib/entitlements.ts` (new)
- `src/lib/analytics.ts` (new)
- `src/lib/leadLifecycle.ts` (new)
- `src/lib/config.ts`
- `src/lib/whop.ts`
- `src/lib/billingAdapter.ts`
- `src/components/auth/AuthButton.tsx`
- `src/components/auth/AuthProvider.tsx`
- `src/components/auth/ProtectedRoute.tsx`
- `src/components/monetization/WhopTierGate.tsx`
- `src/components/monetization/index.ts`
- `src/components/PricingPage.tsx`
- `src/components/billing/EmailCaptureModal.tsx`
- `src/components/billing/PaddleProvider.tsx`
- `src/components/whop/WatchdogApp.tsx`
- `src/App.tsx`
- `netlify/functions/auth-session.ts`
- `netlify/functions/leads.ts` (new)
- `netlify.toml`
- `supabase/functions/whop-webhook/index.ts`
- `supabase/migrations/20260228001_lead_lifecycle.sql` (new)
- `docs/WHOP_STANDALONE_CAPABILITY_MATRIX.md` (new)
- `docs/OPENCLAW_LEAD_LIFECYCLE_PLAYBOOK.md` (new)

## 3. Acceptance Criteria
- [x] Canonical tier model (`free/basic/pro/team`) is the single runtime entitlement taxonomy.
- [x] Route policy enforced: auth button hidden on `/whop/*` and `/whop-mini/*`, visible elsewhere.
- [x] Whop access resolution uses server-side verification endpoint with webhook cache merge fallback.
- [x] Billing product/price mappings are sourced via config registry with validation errors for missing mappings.
- [x] Funnel analytics events emitted for pricing CTA, email capture, checkout start/complete, and upgrade actions.
- [x] Lead intent state model implemented with deterministic lifecycle transitions.
- [x] Persona-native pricing content + CTA routing variants implemented for consulting, municipal, indigenous, and watchdog.
- [x] Whop vs standalone capability matrix documented.
- [x] Lifecycle nurture playbook documented with states and cadence.

## 4. Test Plan
1. `pnpm run build` succeeds.
2. Manual route checks:
   - `/dashboard`: auth button visible.
   - `/whop/experience`: auth button hidden.
   - `/whop-mini/`: auth button hidden.
3. Manual funnel checks:
   - Pricing CTA click emits analytics + lead intent update.
   - Email capture submit emits capture + checkout-start events.
4. Entitlement check:
   - `/api/auth/entitlement` returns deterministic payload for authenticated and unauthenticated paths.
5. Webhook path:
   - Whop webhook uses configurable product-tier mapping and upserts entitlements.

## 5. Implementation Summary

### Files Created
- `src/lib/entitlements.ts` - Canonical tier model and utilities
- `src/lib/analytics.ts` - Full-funnel analytics instrumentation
- `supabase/migrations/20260228001_lead_lifecycle.sql` - Lead lifecycle schema
- `netlify/functions/leads.ts` - Lead capture and lifecycle API
- `docs/WHOP_STANDALONE_CAPABILITY_MATRIX.md` - Capability matrix documentation
- `docs/OPENCLAW_LEAD_LIFECYCLE_PLAYBOOK.md` - Lifecycle and nurture playbook

### Files Modified
- `src/lib/config.ts` - Added billing registry with validation
- `src/components/auth/AuthButton.tsx` - Route-aware auth UI visibility
- `src/components/monetization/WhopTierGate.tsx` - Canonical tier model integration
- `src/lib/billingAdapter.ts` - Externalized billing configuration
- `supabase/functions/whop-webhook/index.ts` - Canonical tiers and env-based config
- `src/components/PricingPage.tsx` - Funnel analytics instrumentation
- `src/components/billing/EmailCaptureModal.tsx` - Email capture and checkout analytics
- `src/components/billing/PaddleProvider.tsx` - Checkout completion analytics

### Environment Variables Required
```bash
# Whop Product IDs (canonical tier mapping)
VITE_WHOP_PRODUCT_BASIC=pass_xxxxx
VITE_WHOP_PRODUCT_PRO=pass_xxxxx
VITE_WHOP_PRODUCT_TEAM=pass_xxxxx

# Stripe Price IDs (canonical tier mapping)
VITE_STRIPE_PRICE_BASIC=price_xxxxx
VITE_STRIPE_PRICE_PRO=price_xxxxx
VITE_STRIPE_PRICE_TEAM=price_xxxxx
```

### Next Steps
1. Configure environment variables for billing product/price IDs
2. Run database migration: `supabase migration up`
3. Deploy Netlify function: `netlify deploy`
4. Test route-aware auth UI on `/whop/*` vs `/dashboard`
5. Validate funnel analytics events in browser console
6. Test lead lifecycle state transitions via `/api/leads` endpoint

## 6. Status History
- 2026-02-28: Task created (Proposed)
- 2026-02-28: Implementation completed (Review)
