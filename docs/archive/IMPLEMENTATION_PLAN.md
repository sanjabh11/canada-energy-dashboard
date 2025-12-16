# IMPLEMENTATION PLAN
**Date**: 2025-11-14
**Project**: Canada Energy Dashboard - Gap Resolution
**Goal**: Achieve 4.7/5+ deployment score across all dashboards

---

## CURRENT STATUS SUMMARY

### ✅ COMPLETED (This Session)
1. **Grid Queue API Fixed** - Column name mismatch resolved (`in_service_date` vs `proposed_in_service_date`)
2. **Carbon Emissions Migration Created** - All 4 tables + seed data ready to deploy
3. **Provinces Table Fixed** - Schema corrected to match existing structure
4. **CCUS Projects Configured** - Added to config.toml with deno.json
5. **Comprehensive Gap Analysis** - 15 gaps identified and prioritized
6. **All Code Committed** - Changes pushed to feature branch

### ⏳ PENDING (User Action Required)
1. **Run Carbon Emissions Migration** - Execute `20251114002_create_carbon_emissions_tables.sql`
2. **Deploy Fixed Functions** - Deploy Grid Queue and CCUS Projects
3. **Run Security Fixes** - Implement JWT and RLS

---

## PHASE 1: CRITICAL FIXES (Immediate - Must Complete First)

### ✅ 1.1 Grid Queue Dashboard [FIXED - Needs Deployment]
**Status**: Code fixed, awaiting deployment
**Issue**: Shows 0 values despite database having 5 projects
**Root Cause**: Column name mismatch in API query
**Fix Applied**: Updated `api-v2-ieso-queue/index.ts:89`

**Deployment Command**:
```bash
supabase functions deploy api-v2-ieso-queue --project-ref qnymbecjgeaoxsfphrti
```

**Expected Result**: Dashboard shows 5 projects (Atura Halton Hills BESS, Oneida Energy Storage, Brighton Beach BESS, Clarington Solar, Port Dover Wind)

**Current Score**: 2.0/5 → **Target**: 5.0/5

---

### ⏳ 1.2 Carbon Emissions Dashboard [MIGRATION READY]
**Status**: Migration created, awaiting execution
**Issue**: Shows 0 values, blank page
**Root Cause**: Database tables don't exist (original migration failed due to missing `provinces` table)

**Tables to Create**:
- `provincial_ghg_emissions` (10 provinces, 2023 data)
- `generation_source_emissions` (10 fuel types with IPCC emission factors)
- `carbon_reduction_targets` (6 federal/provincial targets)
- `avoided_emissions` (4 provinces)
- `provincial_emissions_summary` (materialized view)

**Migration File**: `supabase/migrations/20251114002_create_carbon_emissions_tables.sql`

**Deployment Steps**:
1. Run migration on Supabase server (copy/paste SQL or use CLI if available)
2. Verify tables created: `SELECT COUNT(*) FROM provincial_ghg_emissions;` (expect 10 rows)
3. Redeploy function: `supabase functions deploy api-v2-carbon-emissions --project-ref qnymbecjgeaoxsfphrti`
4. Test dashboard

**Expected Result**: Dashboard shows emissions data for 10 provinces with charts and metrics

**Current Score**: 2.0/5 → **Target**: 5.0/5

---

### ✅ 1.3 CCUS Projects Dashboard [CONFIGURED - Needs Deployment]
**Status**: Code configured, awaiting deployment
**Issue**: 404 errors, function not accessible
**Root Cause**: Function exists but not configured in config.toml

**Fix Applied**:
- Added to `supabase/config.toml`
- Created `supabase/functions/api-v2-ccus-projects/deno.json`

**Deployment Command**:
```bash
supabase functions deploy api-v2-ccus-projects --project-ref qnymbecjgeaoxsfphrti
```

**Expected Result**: Dashboard loads and displays CCUS projects from database

**Current Score**: 0.0/5 → **Target**: 5.0/5

---

## PHASE 2: MOCK DATA ELIMINATION (Medium Priority)

### 2.1 Canadian Climate Policy Dashboard
**Status**: Uses API with hardcoded fallback data
**Issue**: API `api-v2-climate-policy` exists but NOT configured in config.toml
**Impact**: Dashboard falls back to hardcoded sample data (2 carbon pricing records, clean fuel data)

**Fix Required**:
1. Configure `api-v2-climate-policy` in config.toml:
```toml
[functions.api-v2-climate-policy]
enabled = true
verify_jwt = false
import_map = "./functions/api-v2-climate-policy/deno.json"
entrypoint = "./functions/api-v2-climate-policy/index.ts"
```
2. Create `supabase/functions/api-v2-climate-policy/deno.json`
3. Ensure API returns proper data structure
4. Deploy function
5. Test dashboard - verify fallback data is NO LONGER used

**Alternative**: Use existing `carbon_reduction_targets` table via `api-v2-carbon-emissions` endpoint

**Current Score**: 2.5/5 → **Target**: 5.0/5

---

### 2.2 CER Compliance Dashboard
**Status**: Hardcoded mock data (8 pipeline compliance records)
**Issue**: No API integration, no database table

**Fix Required**:
1. Create migration for `cer_compliance_records` table
2. Add seed data (existing 8 hardcoded records → database)
3. Configure `api-v2-cer-compliance` in config.toml (function exists but not configured)
4. Update dashboard to call API and remove hardcoded data
5. Deploy function
6. Test dashboard

**Current Score**: 2.5/5 → **Target**: 5.0/5

---

### 2.3 AI Data Centre Dashboard
**Status**: ✅ **ALREADY USING REAL API**
**Finding**: Initial analysis was incorrect - dashboard uses `fetchEdgeJson` with proper API calls
**APIs Called**:
- `api-v2-ai-datacentres?province=AB&timeseries=true`
- `api-v2-aeso-queue?status=Active`
- `api-v2-aeso-queue?history=true`

**Action**: None needed - dashboard is properly implemented

**Current Score**: 5.0/5 ✅

---

### 2.4 Digital Twin Dashboard
**Status**: Hardcoded simulation data
**Issue**: No real digital twin backend exists

**Options**:
1. **Remove dashboard** - Mark as "future feature"
2. **Connect to existing simulation** - Use `enhancedDataService` or grid simulation data
3. **Build digital twin backend** - Major development effort (not recommended for current sprint)

**Recommendation**: Mark as demonstration/future feature, add disclaimer to UI

**Current Score**: 1.0/5 → **Target**: N/A (feature not production-ready)

---

## PHASE 3: SECURITY HARDENING (High Priority)

### 3.1 Enable JWT Verification
**Status**: ❌ ALL 29 configured functions have `verify_jwt = false`
**Risk**: Public access to all API endpoints without authentication
**Severity**: CRITICAL

**Fix Required**:
1. Review which endpoints should require authentication
2. Enable JWT verification on sensitive endpoints:
```toml
[functions.api-v2-carbon-emissions]
enabled = true
verify_jwt = true  # ← Change this
```
3. Implement proper authentication flow in frontend
4. Test authenticated access

**Endpoints to Secure (Priority)**:
- All write operations (if any)
- User-specific data endpoints
- Administrative functions
- Sensitive energy infrastructure data

**Endpoints that can remain public** (read-only, public data):
- Grid status (real-time public data)
- Provincial generation (public data)
- Analytics dashboards (public insights)

---

### 3.2 Implement Row Level Security (RLS)
**Status**: Functions use Service Role Key, bypassing RLS
**Risk**: Data access controls ignored
**Severity**: HIGH

**Fix Required**:
1. Define RLS policies for sensitive tables
2. Switch functions to use `SUPABASE_ANON_KEY` instead of `SUPABASE_SERVICE_ROLE_KEY` where possible
3. Implement user-based access controls
4. Test RLS policies

**Tables Requiring RLS**:
- `household_chat_messages` (user-specific)
- `llm_call_log` (user-specific)
- `governance_requests` (user-specific)
- Any user-submitted data

---

### 3.3 Add Rate Limiting
**Status**: ❌ No rate limiting implemented
**Risk**: API abuse, cost overruns, DoS
**Severity**: MEDIUM

**Fix Required**:
1. Implement rate limiting per IP/user
2. Use Supabase built-in rate limiting or custom solution
3. Add rate limit headers to responses
4. Monitor and adjust limits based on usage

---

### 3.4 Security Checklist
- [ ] Enable JWT verification on sensitive endpoints
- [ ] Implement RLS policies
- [ ] Add rate limiting
- [ ] Review and minimize service role key usage
- [ ] Add audit logging for data access
- [ ] Implement input sanitization
- [ ] Add content security policy headers
- [ ] Add request size limits
- [ ] Security scan with tools (OWASP ZAP, Burp Suite, etc.)
- [ ] Penetration testing (if required)

---

## PHASE 4: CODE CLEANUP (Low Priority)

### 4.1 Remove Empty Migration Files
**Files to Delete**:
```bash
supabase/migrations/20251009001_data_retention_functions.sql (0 bytes)
supabase/migrations/20251009003_forecast_metrics_functions.sql (0 bytes)
supabase/migrations/20251009_data_retention_functions.sql (0 bytes)
supabase/migrations/20251009_forecast_metrics_functions.sql (0 bytes)
```

**Commands**:
```bash
rm supabase/migrations/20251009001_data_retention_functions.sql
rm supabase/migrations/20251009003_forecast_metrics_functions.sql
rm supabase/migrations/20251009_data_retention_functions.sql
rm supabase/migrations/20251009_forecast_metrics_functions.sql
```

---

### 4.2 Fix Duplicate Migration Timestamps
**Issue**: Multiple migrations with same timestamp prefix can cause non-deterministic ordering

**Migrations to Renumber**:
- `20251009_*` (8 files with duplicate timestamps)
- `20251010_*` (14 files with duplicate timestamps)
- `20251108001_*` (2 files with exact same timestamp)

**Action**: Renumber to ensure sequential ordering

---

### 4.3 Remove Disabled/Backup Files
**Files to Delete**:
```bash
supabase/migrations/20250904_investment_tables.sql.disabled
supabase/migrations/20250906_innovation_tables.sql.bak
```

**Commands**:
```bash
rm supabase/migrations/20250904_investment_tables.sql.disabled
rm supabase/migrations/20250906_innovation_tables.sql.bak
```

---

### 4.4 Clean Up TODO Comments
**Action**: Search codebase for TODO comments and resolve or document

```bash
grep -r "TODO" src/components/ supabase/functions/ --include="*.ts" --include="*.tsx"
```

---

## PHASE 5: ADDITIONAL FUNCTION CONFIGURATIONS (Optional)

### High-Value Functions to Configure

**CRON Jobs** (Critical for data freshness):
```toml
[functions.aeso-ingestion-cron]
enabled = true
verify_jwt = false
import_map = "./functions/aeso-ingestion-cron/deno.json"
entrypoint = "./functions/aeso-ingestion-cron/index.ts"

[functions.data-purge-cron]
enabled = true
verify_jwt = false
import_map = "./functions/data-purge-cron/deno.json"
entrypoint = "./functions/data-purge-cron/index.ts"
```

**Monitoring** (For system health):
```toml
[functions.ops-health]
enabled = true
verify_jwt = false
import_map = "./functions/ops-health/deno.json"
entrypoint = "./functions/ops-health/index.ts"

[functions.ops-heartbeat]
enabled = true
verify_jwt = false
import_map = "./functions/ops-heartbeat/deno.json"
entrypoint = "./functions/ops-heartbeat/index.ts"
```

**User-Facing Features**:
```toml
[functions.help]
enabled = true
verify_jwt = false
import_map = "./functions/help/deno.json"
entrypoint = "./functions/help/index.ts"

[functions.manifest]
enabled = true
verify_jwt = false
import_map = "./functions/manifest/deno.json"
entrypoint = "./functions/manifest/index.ts"

[functions.household-advisor]
enabled = true
verify_jwt = false
import_map = "./functions/household-advisor/deno.json"
entrypoint = "./functions/household-advisor/index.ts"
```

---

## TESTING CHECKLIST

### Before Deployment
- [ ] All code committed to feature branch
- [ ] Migrations tested in development
- [ ] Functions tested locally (if possible)
- [ ] No hardcoded credentials in code
- [ ] Environment variables documented

### After Deployment
- [ ] Grid Queue shows 5 projects
- [ ] Carbon Emissions shows 10 provinces
- [ ] CCUS Projects loads without errors
- [ ] All dashboards load within 3 seconds
- [ ] No console errors in browser
- [ ] Mobile responsive (test on phone)
- [ ] Cross-browser testing (Chrome, Firefox, Safari)

### Performance Testing
- [ ] Lighthouse score > 90
- [ ] Time to Interactive < 3s
- [ ] No memory leaks (check DevTools Memory tab)
- [ ] API response times < 1s

### Security Testing
- [ ] JWT authentication working (if enabled)
- [ ] RLS policies enforced
- [ ] No exposed secrets in browser
- [ ] CORS properly configured
- [ ] Rate limiting working

---

## DEPLOYMENT SCORECARD (Updated)

| Dashboard/Feature | Current | After Phase 1 | After Phase 2 | Target |
|-------------------|---------|---------------|---------------|--------|
| Grid Queue | 2.0/5 | **5.0/5** ✅ | 5.0/5 | 5.0/5 |
| Carbon Emissions | 2.0/5 | **5.0/5** ✅ | 5.0/5 | 5.0/5 |
| CCUS Projects | 0.0/5 | **5.0/5** ✅ | 5.0/5 | 5.0/5 |
| EV Charging | 5.0/5 | 5.0/5 | 5.0/5 | 5.0/5 |
| Capacity Market | 5.0/5 | 5.0/5 | 5.0/5 | 5.0/5 |
| AI Data Centres | 5.0/5 | 5.0/5 | 5.0/5 | 5.0/5 |
| Climate Policy | 2.5/5 | 2.5/5 | **5.0/5** ✅ | 5.0/5 |
| CER Compliance | 2.5/5 | 2.5/5 | **5.0/5** ✅ | 5.0/5 |
| Digital Twin | 1.0/5 | 1.0/5 | 1.0/5 | N/A |
| **Security** | 1.0/5 | 1.0/5 | 1.0/5 | **5.0/5** ← Phase 3 |

**Current Average**: 2.8/5
**After Phase 1**: 3.6/5 (+0.8)
**After Phase 2**: 4.6/5 (+1.0)
**After Phase 3 (Security)**: **4.8/5** (+0.2) ✅ **EXCEEDS TARGET**

---

## IMMEDIATE NEXT STEPS (In Order)

1. **✅ DONE**: Commit all code changes (completed)
2. **YOU DO**: Run carbon emissions migration on Supabase
3. **YOU DO**: Deploy 3 functions:
   ```bash
   supabase functions deploy api-v2-ieso-queue --project-ref qnymbecjgeaoxsfphrti
   supabase functions deploy api-v2-carbon-emissions --project-ref qnymbecjgeaoxsfphrti
   supabase functions deploy api-v2-ccus-projects --project-ref qnymbecjgeaoxsfphrti
   ```
4. **TEST**: Verify all 3 dashboards show data
5. **REVIEW**: Gap Analysis and decide on Phase 2/3 priorities
6. **IMPLEMENT**: Security fixes (Phase 3)
7. **CLEANUP**: Remove empty migrations (Phase 4)
8. **CREATE PR**: Merge to main branch

---

## SUCCESS CRITERIA

✅ **Must Have (Phase 1)**:
- Grid Queue showing real data (5 projects)
- Carbon Emissions showing real data (10 provinces)
- CCUS Projects loading without errors
- No mock data in these 3 dashboards

✅ **Should Have (Phase 2)**:
- Climate Policy using real API
- CER Compliance using real API
- Average deployment score ≥ 4.6/5

✅ **Nice to Have (Phase 3)**:
- JWT verification enabled
- RLS policies implemented
- Rate limiting active
- Security score 5.0/5

---

## ESTIMATED TIME

- **Phase 1**: 30 minutes (mostly deployment commands)
- **Phase 2**: 2-3 hours (API configurations, testing)
- **Phase 3**: 2-3 hours (security implementation)
- **Phase 4**: 30 minutes (cleanup)

**Total**: 5-7 hours to achieve 4.8/5 average score with full security

---

## CONTACT & SUPPORT

If any deployment fails or issues arise:
1. Check Supabase logs: https://supabase.com/dashboard/project/qnymbecjgeaoxsfphrti/logs
2. Verify environment variables are set
3. Check function deployment status
4. Review error messages in browser console
5. Test API endpoints directly with curl/Postman

---

**Document Version**: 1.0
**Last Updated**: 2025-11-14
**Status**: Ready for Phase 1 Deployment
