# PRD: OpenClaw Outreach + Monetization Orchestration

## 1. Problem Statement
The current stack has split monetization and outreach operations:
- Outreach docs were migrated to OpenClaw, but production logic still has open high/medium-priority gaps.
- Entitlements are inconsistent across components (`watchdog/advanced/enterprise` vs `basic/pro/team`).
- Auth CTA surfaces are disabled globally, reducing conversion and lifecycle capture.
- Whop entitlement checks rely on client-side/session fallbacks instead of authoritative server resolution.
- Checkout mappings still include placeholders/hardcoded IDs and weak validation.
- Funnel instrumentation does not fully connect outreach source -> product behavior -> checkout -> conversion.

## 2. Goals
1. **Unify access control** with one canonical tier model.
2. **Restore monetization intent capture** with route-aware auth UX.
3. **Harden entitlement trust model** using server-verified resolution + cached webhook state.
4. **Make billing config environment-driven and validated**.
5. **Add full-funnel analytics and lead-intent lifecycle foundations**.
6. **Improve conversion relevance** with persona-native packaging and CTA variants.
7. **Document parity and lifecycle operations** for Whop vs standalone + nurture playbooks.

## 3. Scope
### In Scope
- Canonical entitlement service (`free/basic/pro/team`) and alias migration.
- Auth UI route policy (`/whop/*` hidden, non-Whop visible).
- Netlify entitlement endpoint with server-side token verification and entitlement cache merge.
- Billing config registry and startup/build-time validations in client logic.
- Funnel analytics + lead intent + lead lifecycle state tracking.
- Persona-aware pricing copy/CTA variants and capability matrix documentation.
- Nurture/lifecycle operational playbooks.

### Out of Scope
- Third-party CRM/email provider integration and outbound automation.
- Direct changes to Whop dashboard settings.
- Database migration execution against production (schema assumed present).

## 4. Success Metrics
- Zero tier mismatch in QA matrix for all gated features.
- Auth CTA visible on non-Whop routes and hidden on `/whop/*` routes.
- Entitlement resolution path returns server-verified access in Whop mode.
- Billing mapping placeholders removed from runtime checkout logic.
- Funnel event taxonomy present from outreach attribution to checkout start.
- Lead intent state and lead lifecycle transitions stored with deterministic rules.
