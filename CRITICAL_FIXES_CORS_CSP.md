# Critical Fixes: CORS & CSP Issues

**Date**: 2025-10-09  
**Priority**: CRITICAL  
**Status**: Fixing Now

---

## 🔴 Issue Summary

### Issue 1: CORS Port Mismatch (Local Development)
**Symptom**: `Access-Control-Allow-Origin' header has a value 'http://localhost:5173' that is not equal to the supplied origin`  
**Root Cause**: Dev server runs on port 5174, but Edge Functions only allow port 5173  
**Impact**: All API calls fail in local development  
**Affected Functions**: 
- `api-v2-analytics-national-overview`
- `api-v2-analytics-provincial-metrics`
- `api-v2-analytics-trends`
- `api-v2-resilience-assets`
- `api-v2-resilience-hazards`

### Issue 2: CSP Blocks Google Fonts (Production)
**Symptom**: `Refused to load the stylesheet 'https://fonts.googleapis.com/...' because it violates the following Content Security Policy`  
**Root Cause**: CSP `style-src` doesn't include `https://fonts.googleapis.com`  
**Impact**: Fonts don't load, UI looks broken  
**Fix**: Update `netlify.toml` CSP headers

### Issue 3: Malformed Edge Function URLs (Production)
**Symptom**: URLs like `/****************e.co/llm/transition-kpis` (404 errors)  
**Root Cause**: Environment variable masking or incorrect URL construction  
**Impact**: All LLM features fail in production  
**Fix**: Verify environment variables in Netlify

---

## ✅ Fix 1: Update Analytics Edge Functions CORS

### Files to Update:
1. `api-v2-analytics-national-overview/index.ts`
2. `api-v2-analytics-provincial-metrics/index.ts`
3. `api-v2-analytics-trends/index.ts`
4. `api-v2-resilience-assets/index.ts`
5. `api-v2-resilience-hazards/index.ts`

### Change Required:
```typescript
// OLD (hardcoded port 5173)
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "https://canada-energy.netlify.app"
];

// NEW (support both dev ports)
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5176",
  "https://canada-energy.netlify.app",
  "https://*.netlify.app"
];
```

---

## ✅ Fix 2: Update CSP in netlify.toml

### File: `netlify.toml`

### Change Required:
```toml
# OLD
Content-Security-Policy = """
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://esm.sh https://cdn.jsdelivr.net;
  style-src 'self' 'unsafe-inline';
  ...
"""

# NEW (add Google Fonts)
Content-Security-Policy = """
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://esm.sh https://cdn.jsdelivr.net;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' data: https://fonts.gstatic.com;
  ...
"""
```

---

## ✅ Fix 3: Verify Netlify Environment Variables

### Required Environment Variables:
```bash
VITE_SUPABASE_URL=https://qnymbecjgeaoxsfphrti.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_USE_STREAMING_DATASETS=true
VITE_ENABLE_EDGE_FETCH=true
VITE_DEBUG_LOGS=false
```

### Verification Steps:
1. Go to Netlify Dashboard → Site Settings → Environment Variables
2. Verify all `VITE_*` variables are set
3. Ensure no typos or extra spaces
4. Redeploy after changes

---

## 🚀 Deployment Plan

### Step 1: Fix Edge Functions (10 minutes)
```bash
# Update 5 Edge Functions with new CORS origins
# Redeploy to Supabase
supabase functions deploy api-v2-analytics-national-overview --project-ref qnymbecjgeaoxsfphrti
supabase functions deploy api-v2-analytics-provincial-metrics --project-ref qnymbecjgeaoxsfphrti
supabase functions deploy api-v2-analytics-trends --project-ref qnymbecjgeaoxsfphrti
supabase functions deploy api-v2-resilience-assets --project-ref qnymbecjgeaoxsfphrti
supabase functions deploy api-v2-resilience-hazards --project-ref qnymbecjgeaoxsfphrti
```

### Step 2: Fix CSP (2 minutes)
```bash
# Update netlify.toml
# Commit and push to trigger redeploy
git add netlify.toml
git commit -m "fix: Add Google Fonts to CSP"
git push origin main
```

### Step 3: Verify Netlify Env (5 minutes)
- Check all environment variables
- Trigger manual redeploy if needed

### Step 4: Test (5 minutes)
- Local: `pnpm run dev` (should work on port 5174)
- Production: Visit https://canada-energy.netlify.app
- Verify fonts load
- Verify API calls succeed

---

## 📊 Expected Results

### After Fix 1 (CORS):
✅ Local development works on any port (5173-5176)  
✅ No more CORS errors in console  
✅ API calls succeed  

### After Fix 2 (CSP):
✅ Google Fonts load correctly  
✅ UI looks professional  
✅ No CSP violations in console  

### After Fix 3 (Env Vars):
✅ LLM endpoints resolve correctly  
✅ No 404 errors  
✅ All features functional  

---

## 🔍 Testing Checklist

### Local Development (http://localhost:5174)
- [ ] Dashboard loads without CORS errors
- [ ] Real-time data displays
- [ ] LLM features work
- [ ] No console errors

### Production (https://canada-energy.netlify.app)
- [ ] Fonts load correctly
- [ ] Dashboard displays properly
- [ ] API calls succeed
- [ ] LLM features work
- [ ] No CSP violations
- [ ] No 404 errors

---

## 📝 Notes

### Why Port 5174?
- Vite auto-increments port if 5173 is busy
- Multiple projects running simultaneously
- Need to support flexible port allocation

### Why Google Fonts in CSP?
- Used for Inter and Playfair Display fonts
- Loaded from `fonts.googleapis.com` (CSS)
- Fonts served from `fonts.gstatic.com` (WOFF2 files)

### Why Environment Variable Issues?
- Netlify may mask sensitive values in logs
- Need to verify actual values in dashboard
- Typos or missing values cause 404s

---

**Status**: Fixes in progress...
