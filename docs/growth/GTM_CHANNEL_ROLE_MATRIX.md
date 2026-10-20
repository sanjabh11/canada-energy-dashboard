# CEIP Channel-Role Matrix

## Purpose
Prevent channel drift by separating acquisition hypotheses from existing-customer support.

## Canonical Matrix
| Channel | Role | Primary CTA | Success KPI |
|---|---|---|---|
| Whop | Existing-customer billing access only; not an acquisition channel | Manage an existing membership | Existing-member support completion |
| Direct (site + owner-approved outreach) | Pilot hypothesis for consultancy/municipal/industrial conversations | Request a reviewed scenario | Buyer experiments executed and evidence logged |
| Partner | Referral acceleration | Intro request | Partner-sourced opportunities |

## Non-Goals
- Do not use Whop listing or Whop checkout as a new-customer acquisition path.
- Preserve account access and billing support for existing Whop customers.
- Direct outreach is not authorized until the CASL owner approves the basis and templates.
- Every send must pass the consent-basis checklist (consent basis, source, date, sender identity, unsubscribe mechanism) and a suppression check against the canonical registry [SUPPRESSION_REGISTRY_LIVE.csv](./SUPPRESSION_REGISTRY_LIVE.csv).
- Do not run mixed pricing narratives on the same page.

## Route Intents (Implemented)
- `/whop/discover` => `legacy_billing_support`
- `/watchdog` => `legacy_member_account_access`
- `/pricing` => `direct_offer_selection`
- `/enterprise` => `direct_consult_demo`
