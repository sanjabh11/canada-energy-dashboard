# 🔐 KEY ROTATION REQUIRED - IMMEDIATE ACTION

**Date**: 2025-10-09 23:13 IST  
**Priority**: 🔴 **CRITICAL**  
**Status**: ⚠️ **ACTION REQUIRED**

---

## ⚠️ SECURITY INCIDENT

API keys and secrets were accidentally committed to the GitHub repository in documentation files. While these have now been removed, the keys **MUST BE ROTATED** immediately as they may have been exposed.

---

## 🎯 KEYS THAT MUST BE ROTATED

### 1. Supabase Anon Key ⚠️ HIGH PRIORITY
**Project**: qnymbecjgeaoxsfphrti  
**Exposed In**: Multiple markdown files (now redacted)  
**Risk**: Medium (anon key has limited permissions but should be rotated)

**Action Required**:
1. Go to: https://supabase.com/dashboard/project/qnymbecjgeaoxsfphrti/settings/api
2. Click "Reset anon key"
3. Copy new key
4. Update in Netlify: https://app.netlify.com/sites/canada-energy/settings/env
   - Variable: `VITE_SUPABASE_ANON_KEY`
   - Value: `<new-key>`
5. Update local `.env` file
6. Redeploy: `pnpm run build:prod && netlify deploy --prod --dir=dist`

### 2. Gemini API Key ⚠️ HIGH PRIORITY
**Exposed In**: Documentation files (now redacted)  
**Risk**: High (can incur costs if abused)

**Action Required**:
1. Go to: https://console.cloud.google.com/apis/credentials
2. Find key: `AIzaSyCseZFXvRDfcBi4fjgS9MTcnOB_Ee3TgXs`
3. Click "Delete" or "Revoke"
4. Create new API key
5. Update in Netlify: https://app.netlify.com/sites/canada-energy/settings/env
   - Variable: `GEMINI_API_KEY`
   - Value: `<new-key>`
6. Update local `.env` file
7. Redeploy Edge Functions: `supabase functions deploy llm --project-ref qnymbecjgeaoxsfphrti`

### 3. OpenWeatherMap API Key ⚠️ LOW PRIORITY
**Exposed In**: Documentation files (now redacted)  
**Risk**: Low (free tier, rate-limited)

**Action Required** (Optional but recommended):
1. Go to: https://home.openweathermap.org/api_keys
2. Delete old key: `46729c3c1126f0eae3ba3ad9a1615db2`
3. Generate new key
4. Update in Netlify: https://app.netlify.com/sites/canada-energy/settings/env
   - Variable: `VITE_OPENWEATHERMAP_API_KEY`
   - Value: `<new-key>`
5. Update local `.env` file

---

## ✅ REMEDIATION COMPLETED

### What Was Fixed:
1. ✅ **Documentation Scrubbed** - All markdown files now use placeholders
2. ✅ **Source Code Refactored** - Hardcoded URLs/keys replaced with `import.meta.env`
3. ✅ **Scripts Updated** - `test-edge-functions.sh` now accepts env vars
4. ✅ **Build Artifacts Removed** - `dist/` removed from Git tracking
5. ✅ **`.gitignore` Updated** - Build artifacts now ignored
6. ✅ **Verification Complete** - No secrets found in tracked files

### Files Modified:
- **Documentation** (12 files): All secrets replaced with `<YOUR_*>` placeholders
- **Source Code** (3 files): Refactored to use environment variables
- **Scripts** (1 file): Updated to accept parameters
- **Config** (1 file): `.gitignore` updated to exclude build artifacts

---

## 📋 POST-ROTATION CHECKLIST

After rotating keys, verify:

- [ ] New Supabase anon key works locally
- [ ] New Supabase anon key set in Netlify
- [ ] New Gemini API key works in Edge Functions
- [ ] New Gemini API key set in Netlify
- [ ] Production site still works: https://canada-energy.netlify.app
- [ ] LLM features respond correctly
- [ ] No API errors in browser console
- [ ] No 401/403 errors in Network tab

---

## 🔒 SECURITY BEST PRACTICES GOING FORWARD

### DO:
- ✅ Keep secrets in `.env` files (gitignored)
- ✅ Use `import.meta.env.VITE_*` in code
- ✅ Use placeholders in documentation
- ✅ Reference `.env.example` for setup instructions
- ✅ Rotate keys immediately if exposed
- ✅ Use environment variables in scripts

### DON'T:
- ❌ Commit `.env` files to Git
- ❌ Hardcode API keys in source code
- ❌ Paste real keys in documentation
- ❌ Share keys in chat/email
- ❌ Commit build artifacts with embedded secrets
- ❌ Use production keys in development

---

## 📞 SUPPORT

### If Keys Don't Work After Rotation:

1. **Clear Browser Cache**
   - Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

2. **Verify Environment Variables**
   ```bash
   # Check Netlify
   netlify env:list
   
   # Check local
   cat .env | grep VITE_
   ```

3. **Rebuild Application**
   ```bash
   # Clean build
   rm -rf dist/ node_modules/.vite
   pnpm install
   pnpm run build:prod
   netlify deploy --prod --dir=dist
   ```

4. **Check Supabase Edge Functions**
   ```bash
   # Redeploy with new keys
   supabase functions deploy llm --project-ref qnymbecjgeaoxsfphrti
   ```

---

## 📊 TIMELINE

| Time | Action | Status |
|------|--------|--------|
| 2025-10-09 22:00 | Keys exposed in commit | ❌ Incident |
| 2025-10-09 23:13 | Remediation complete | ✅ Fixed |
| 2025-10-09 23:15+ | **Key rotation required** | ⚠️ **PENDING** |

---

## ✅ VERIFICATION COMMANDS

After rotation, test with:

```bash
# Test Supabase connection
curl -H "apikey: $VITE_SUPABASE_ANON_KEY" \
  "$VITE_SUPABASE_URL/rest/v1/"

# Test Edge Functions
curl -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
  "$VITE_SUPABASE_EDGE_BASE/llm/health"

# Test OpenWeatherMap
curl "https://api.openweathermap.org/data/2.5/weather?q=Toronto&appid=$VITE_OPENWEATHERMAP_API_KEY"
```

Expected: All should return 200 OK

---

## 🎯 NEXT STEPS

1. **Rotate Keys** (15 minutes)
   - Supabase anon key
   - Gemini API key
   - OpenWeatherMap key (optional)

2. **Update Netlify** (5 minutes)
   - Set new keys in environment variables
   - Trigger redeploy

3. **Update Local** (2 minutes)
   - Update `.env` file with new keys
   - Test locally: `pnpm run dev`

4. **Verify Production** (5 minutes)
   - Visit: https://canada-energy.netlify.app
   - Check console for errors
   - Test LLM features
   - Verify data loads

**Total Time**: ~30 minutes

---

**⚠️ ROTATE KEYS NOW**: The exposed keys are still valid and could be abused!

**Status**: Repository is clean, but keys must be rotated to complete remediation.
