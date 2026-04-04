# OpenAPI Spec vs. Codebase Parity Audit

**Date:** March 9, 2026
**Target:** `public/openapi.yaml` vs `supabase/functions/`

## 1. Current State in `openapi.yaml`
The current `openapi.yaml` defines 6 illustrative endpoints:
- `/tier/emissions` (Illustrative, closest match is `api-v2-carbon-emissions`)
- `/tier/credits` (Illustrative, UI-only implementation currently)
- `/grid/alberta/pool-price` (Illustrative, UI uses direct AESO API / fallback)
- `/billing/shadow` (Illustrative, UI-only calculator currently)
- `/ocap/export` (Illustrative / Early Access)
- `/export/green-loan` (Illustrative / UI-only export)

## 2. Actual Implemented Edge Functions (`api-v2-*`)
The codebase contains 40+ actual `api-v2-*` edge functions designed for commercial access, including:
- `api-v2-grid-status` (Real-time grid snapshots)
- `api-v2-carbon-emissions` (Facility emissions data)
- `api-v2-capacity-market`
- `api-v2-aeso-queue`
- `api-v2-storage-dispatch`

## 3. Parity Gap
- **High:** The current `openapi.yaml` is largely an illustrative "v1" spec used for marketing/UI demonstration, whereas the actual backend has a robust "v2" microservices architecture.
- **Risk:** Sending an enterprise consultant to the current `/api-docs` might cause friction if they try to call `/tier/emissions` and realize it's a mock or unmapped route compared to the actual `api-v2-carbon-emissions` function.

## 4. Remediation Plan (Applied)
1. **Spec Update:** Update `public/openapi.yaml` to include real `api-v2-*` endpoints (Grid Status, Carbon Emissions) so consultants see actual working endpoints that match the backend.
2. **Disclaimer:** Add a note in the spec that the provided endpoints are a subset of the 40+ available commercial datasets, and full access is provided upon API key provisioning.
