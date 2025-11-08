# QA Testing Checklist - Phase 1 Security Improvements

**Session Date:** November 8, 2025
**Scope:** Backend security fixes for Phase 1 Edge Functions
**UI Changes:** None (UI was implemented in previous session)
**Backend Changes:** Security hardening for 4 Edge Functions

---

## WHAT WAS IMPLEMENTED IN THIS CONVERSATION

### ✅ Backend Security Fixes (No UI Changes)

1. **Input Validation** - All query parameters now validated
2. **CORS Security** - Wildcard replaced with environment-based whitelist
3. **Shared Utilities** - Created `_shared/validation.ts` for reusable security functions
4. **Error Handling** - Improved error responses

### ✅ Files Modified

**Backend (Edge Functions):**
- `supabase/functions/_shared/validation.ts` ✨ NEW
- `supabase/functions/api-v2-ai-datacentres/index.ts`
- `supabase/functions/api-v2-hydrogen-hub/index.ts`
- `supabase/functions/api-v2-minerals-supply-chain/index.ts`
- `supabase/functions/api-v2-aeso-queue/index.ts`
- `scripts/seed-forecast-performance.ts`

**Documentation:**
- 5 planning/analysis documents (no code impact)

### ❌ NO NEW FEATURES ADDED

The 3 Phase 1 dashboards were implemented **BEFORE** this conversation:
- ✅ AI Data Centres Dashboard (already working)
- ✅ Hydrogen Hub Dashboard (already working)
- ✅ Critical Minerals Dashboard (already working)

---

## QA TESTING CHECKLIST

### 📋 PRE-TESTING SETUP

**Environment Setup:**
```bash
# 1. Pull latest changes
cd /path/to/canada-energy-dashboard
git checkout claude/canada-energy-analysis-improvements-011CUpkRFhrAaZfk5NF9kChz
git pull origin claude/canada-energy-analysis-improvements-011CUpkRFhrAaZfk5NF9kChz

# 2. Install dependencies (if needed)
npm install

# 3. Verify environment variables
cat .env.local
# Should contain:
# VITE_SUPABASE_URL=https://qnymbecjgeaoxsfphrti.supabase.co
# VITE_SUPABASE_ANON_KEY=your_key_here

# 4. Start development server
npm run dev
```

**Expected Output:**
- Server starts on `http://localhost:5173`
- No console errors during startup
- All environment variables loaded

**Browser Setup:**
- Open Chrome/Firefox DevTools (F12)
- Navigate to Console tab
- Navigate to Network tab
- Clear all logs before each test

---

## TEST SUITE 1: AI DATA CENTRES DASHBOARD

**Access:** Click "AI Data Centres" tab in navigation

### Test 1.1: Dashboard Loads Successfully
- [ ] Dashboard renders without errors
- [ ] 4 metric cards display data
- [ ] Charts render (Radial bar, Pie, Bar charts)
- [ ] Data table shows AI data centres

**Console Checks:**
- [ ] ✅ No 403 CORS errors
- [ ] ✅ No 406 errors (fixed with `.maybeSingle()`)
- [ ] ✅ No validation errors
- [ ] ✅ API responses return 200 OK

**Expected Network Calls:**
```
GET /api-v2-ai-datacentres?province=AB&timeseries=true
GET /api-v2-aeso-queue?status=Active
```

### Test 1.2: Province Filter Works
- [ ] Change province dropdown to different value (BC, ON, etc.)
- [ ] Data refreshes automatically
- [ ] Metrics update correctly
- [ ] No console errors

**Console Checks:**
```
Network → Check request:
GET /api-v2-ai-datacentres?province=BC&timeseries=true
Response: 200 OK (not 400 Bad Request)
```

### Test 1.3: Invalid Input Handling
**Manual API Test (Optional - Advanced QA):**
```bash
# Test invalid province (should default to AB)
curl "https://qnymbecjgeaoxsfphrti.supabase.co/functions/v1/api-v2-ai-datacentres?province=INVALID" \
  -H "apikey: YOUR_ANON_KEY"

# Expected: Returns AB data (not error)
```

- [ ] Invalid inputs gracefully handled (defaults applied)
- [ ] No 500 errors in console

---

## TEST SUITE 2: HYDROGEN HUB DASHBOARD

**Access:** Click "Hydrogen Hub" tab in navigation

### Test 2.1: Dashboard Loads Successfully
- [ ] Dashboard renders without errors
- [ ] 4 metric cards display data
- [ ] 5 charts render (Hub comparison, Pie, Pricing trends, Demand forecast)
- [ ] Major projects list displays

**Console Checks:**
- [ ] ✅ No CORS errors
- [ ] ✅ No validation errors
- [ ] ✅ API returns 200 OK

**Expected Network Calls:**
```
GET /api-v2-hydrogen-hub?province=AB&timeseries=true
```

### Test 2.2: Filter Combinations Work
- [ ] Change province filter
- [ ] Select hub filter (Edmonton Hub / Calgary Hub)
- [ ] Select hydrogen type (Green / Blue / Grey)
- [ ] All combinations load without errors

**Console Checks:**
```
Network → Check request with filters:
GET /api-v2-hydrogen-hub?province=AB&hub=Edmonton%20Hub&type=Green&timeseries=true
Response: 200 OK
```

### Test 2.3: Hub Comparison Chart
- [ ] Edmonton vs Calgary bars display correctly
- [ ] Metrics match summary cards
- [ ] Tooltip shows on hover

---

## TEST SUITE 3: CRITICAL MINERALS SUPPLY CHAIN DASHBOARD

**Access:** Click "Critical Minerals" tab in navigation

### Test 3.1: Dashboard Loads Successfully
- [ ] Dashboard renders without errors
- [ ] 4 metric cards display data
- [ ] 5 charts render (Projects by Province, Stage, China dependency, etc.)
- [ ] Supply chain completeness diagram shows

**Console Checks:**
- [ ] ✅ No CORS errors
- [ ] ✅ No validation errors
- [ ] ✅ API returns 200 OK

**Expected Network Calls:**
```
GET /api-v2-minerals-supply-chain?priority=false
```

### Test 3.2: Mineral Filter Works
- [ ] Select specific mineral (Lithium, Cobalt, Nickel, etc.)
- [ ] Data refreshes for selected mineral
- [ ] Supply chain completeness updates
- [ ] No console errors

**Console Checks:**
```
Network → Check request:
GET /api-v2-minerals-supply-chain?mineral=Lithium&priority=false
Response: 200 OK
```

### Test 3.3: Priority Filter Works
- [ ] Toggle "Priority Minerals Only" checkbox
- [ ] Data filters to 6 priority minerals (Lithium, Cobalt, Nickel, Graphite, Copper, REEs)
- [ ] Project count updates in metric card

**Console Checks:**
```
Network → Check request:
GET /api-v2-minerals-supply-chain?priority=true
Response: 200 OK
```

### Test 3.4: Strategic Alerts Display
- [ ] Supply chain gaps alert shows (if gaps exist)
- [ ] Strategic stockpile alert shows (if critical/low)
- [ ] Alert messages readable and accurate

---

## TEST SUITE 4: SECURITY VALIDATION (Advanced QA)

### Test 4.1: CORS Security Check

**Browser Console Test:**
```javascript
// Open console on localhost:5173
// Try to fetch from different origin
fetch('https://qnymbecjgeaoxsfphrti.supabase.co/functions/v1/api-v2-ai-datacentres', {
  headers: { 'apikey': 'your_anon_key' }
})
```

**Expected:**
- [ ] Request succeeds from localhost:5173 (allowed origin)
- [ ] CORS headers present in response:
  ```
  Access-Control-Allow-Origin: http://localhost:5173
  ```

### Test 4.2: Input Validation Check

**Test Invalid Inputs (Optional - Advanced):**
```bash
# Test SQL injection attempt (should be sanitized)
curl "https://qnymbecjgeaoxsfphrti.supabase.co/functions/v1/api-v2-ai-datacentres?province=AB'%20OR%201=1--" \
  -H "apikey: YOUR_ANON_KEY"

# Expected: Returns default AB data (not SQL error)
```

- [ ] Malicious inputs rejected/sanitized
- [ ] No database errors in response

### Test 4.3: Error Messages Don't Leak Secrets

**Test Error Scenario:**
```bash
# Test with invalid API key
curl "https://qnymbecjgeaoxsfphrti.supabase.co/functions/v1/api-v2-ai-datacentres" \
  -H "apikey: INVALID_KEY"
```

**Expected:**
- [ ] Generic error message (not internal details)
- [ ] No stack traces exposed
- [ ] No database connection strings leaked

---

## CONSOLE LOG MONITORING GUIDE

### ✅ Expected Console Logs (GOOD)

**On Initial Load:**
```
[Vite] connected.
Dashboard loaded successfully
Fetching data from API...
Data fetched successfully
```

**On Filter Change:**
```
Loading dashboard data for province: BC
API call successful
Data updated
```

### ❌ Error Logs to Watch For (BAD)

**CORS Errors (Should NOT appear):**
```
❌ Access to fetch at 'https://...' from origin 'http://localhost:5173'
   has been blocked by CORS policy
```
**Fix:** Check `.env.local` has correct Supabase URL

**Network Errors:**
```
❌ GET https://...supabase.co/functions/v1/api-v2-ai-datacentres 406 (Not Acceptable)
```
**Fix:** This was fixed with `.maybeSingle()` - should not appear

```
❌ GET https://...supabase.co/functions/v1/api-v2-hydrogen-hub 400 (Bad Request)
```
**Fix:** Check parameter validation - report if seen

**Data Errors:**
```
❌ TypeError: Cannot read property 'map' of undefined
```
**Fix:** Data structure mismatch - report with exact error

**Environment Variable Errors:**
```
❌ Supabase URL or Key not configured
```
**Fix:** Check `.env.local` file exists and has correct values

---

## NETWORK TAB MONITORING GUIDE

### How to Check Network Calls

**Chrome DevTools:**
1. Open DevTools (F12)
2. Click "Network" tab
3. Filter by "Fetch/XHR"
4. Reload dashboard
5. Click each API call to inspect

**What to Check for Each Call:**

**Request Headers:**
- [ ] `apikey: eyJ...` (ANON key present)
- [ ] `Origin: http://localhost:5173`

**Response Headers:**
- [ ] `Access-Control-Allow-Origin: http://localhost:5173` (not `*`)
- [ ] `Content-Type: application/json`

**Response Body:**
- [ ] Valid JSON structure
- [ ] Contains expected data fields
- [ ] No error messages

**Status Codes:**
- [ ] ✅ 200 OK = Success
- [ ] ✅ 204 No Content = OPTIONS preflight (normal)
- [ ] ❌ 400 Bad Request = Invalid parameters (should not happen)
- [ ] ❌ 403 Forbidden = CORS blocked (should not happen)
- [ ] ❌ 406 Not Acceptable = .single() error (should not happen - fixed)
- [ ] ❌ 500 Internal Server Error = Backend error (report immediately)

---

## PERFORMANCE CHECKS

### Test 5.1: Load Time
- [ ] Initial dashboard load < 3 seconds
- [ ] Filter changes respond < 1 second
- [ ] Charts render smoothly (no lag)

### Test 5.2: Data Accuracy
- [ ] Metric card numbers match chart totals
- [ ] Province filter affects correct data
- [ ] No duplicate entries in tables/lists

---

## BROWSER COMPATIBILITY (Quick Check)

- [ ] Chrome (latest) - all features work
- [ ] Firefox (latest) - all features work
- [ ] Safari (latest) - all features work (if Mac available)
- [ ] Edge (latest) - all features work

---

## CRITICAL ISSUES TO REPORT IMMEDIATELY

### 🚨 Severity: CRITICAL
- [ ] Dashboard doesn't load at all (white screen)
- [ ] CORS errors blocking API calls
- [ ] 500 errors from any API
- [ ] Data not displaying despite 200 OK response

### ⚠️ Severity: HIGH
- [ ] Charts not rendering
- [ ] Filters not working
- [ ] Incorrect data in metric cards
- [ ] Console errors on any interaction

### ℹ️ Severity: MEDIUM
- [ ] Slow load times (> 5 seconds)
- [ ] Tooltips not showing
- [ ] Minor visual glitches
- [ ] Warning messages in console

### 📝 Severity: LOW
- [ ] Styling inconsistencies
- [ ] Minor text issues
- [ ] Optional features not working

---

## ISSUE REPORTING TEMPLATE

**When reporting issues, provide:**

```markdown
**Issue Title:** [Brief description]

**Severity:** Critical / High / Medium / Low

**Dashboard:** AI Data Centres / Hydrogen Hub / Critical Minerals

**Steps to Reproduce:**
1. Navigate to [dashboard name]
2. Click/Select [action]
3. Observe [issue]

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happens]

**Console Errors:**
```
[Paste exact console error]
```

**Network Response:**
```
[Paste API response or error]
```

**Screenshot:** [Attach if visual issue]

**Browser:** Chrome 120 / Firefox 121 / etc.
```

---

## TESTING SUMMARY REPORT

**After completing all tests, fill out:**

### Dashboard Status
- [ ] ✅ AI Data Centres - All tests passed
- [ ] ✅ Hydrogen Hub - All tests passed
- [ ] ✅ Critical Minerals - All tests passed

### Security Tests
- [ ] ✅ CORS working correctly
- [ ] ✅ Input validation working
- [ ] ✅ No sensitive data leaked

### Performance
- [ ] ✅ Load times acceptable
- [ ] ✅ No memory leaks
- [ ] ✅ Smooth interactions

### Issues Found
- **Critical:** [Number]
- **High:** [Number]
- **Medium:** [Number]
- **Low:** [Number]

### Overall Status
- [ ] ✅ READY FOR PRODUCTION
- [ ] ⚠️ NEEDS FIXES BEFORE DEPLOYMENT
- [ ] ❌ MAJOR ISSUES - DO NOT DEPLOY

---

## DEPLOYMENT CHECKLIST (After QA Passes)

- [ ] All critical and high severity issues fixed
- [ ] All 3 dashboards load successfully
- [ ] No console errors in production build
- [ ] Environment variables configured for production
- [ ] CORS_ALLOWED_ORIGINS set for production domain
- [ ] Performance acceptable on slow network
- [ ] Mobile responsiveness checked (if required)

---

**QA Tester:** ___________________
**Date Tested:** ___________________
**Build/Commit:** `05d5cc1`
**Branch:** `claude/canada-energy-analysis-improvements-011CUpkRFhrAaZfk5NF9kChz`
