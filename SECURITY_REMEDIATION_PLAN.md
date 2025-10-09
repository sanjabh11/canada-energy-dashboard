# Security Remediation Plan - COMPREHENSIVE

**Date**: 2025-10-09 23:13 IST  
**Priority**: 🔴 CRITICAL  
**Status**: IN PROGRESS

---

## 🎯 OBJECTIVE

Remove ALL hardcoded secrets from repository and replace with placeholders.

---

## 📋 SECRETS IDENTIFIED

### 1. Supabase Anon Keys (Multiple Projects)
- `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFueW1iZWNqZ2Vhb3hzZnBocnRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwMTczNjEsImV4cCI6MjA3MTU5MzM2MX0.6wAWe5GdKzTOjVa0eUVhDJ4IwczseO9A83uwXlDg0DU` (Project: qnymbecjgeaoxsfphrti)
- `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4ZGloenFvYXh0eWRvbG1sdGRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5MjQ2MDUsImV4cCI6MjA3MTUwMDYwNX0.RS92p3Y7qJ-38PLFR1L4Y9Rl9R4dmFYYCVxhBcJBW8Q` (Project: jxdihzqoaxtydolmltdr)
- `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFueW1iZWNqZ2Vhb3hzZnBocnRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQwNDk4ODYsImV4cCI6MjA0OTYyNTg4Nn0.Rl_0gYCCwLGRWz3oBCWqpHJPXVWnPNdVTqCWZLHkRqM` (Alternative key)

### 2. Gemini API Key
- `AIzaSyCseZFXvRDfcBi4fjgS9MTcnOB_Ee3TgXs`

### 3. OpenWeatherMap API Key
- `46729c3c1126f0eae3ba3ad9a1615db2`

### 4. Supabase Project URLs
- `https://qnymbecjgeaoxsfphrti.supabase.co`
- `https://qnymbecjgeaoxsfphrti.functions.supabase.co`
- `https://jxdihzqoaxtydolmltdr.supabase.co`

---

## 📂 FILES TO REMEDIATE

### Category A: Documentation (Markdown)
1. ✅ `PHASE1_COMPLETION_VERIFIED.md` - PARTIALLY DONE
2. ❌ `FINAL_STATUS_REPORT.md` - PARTIALLY DONE (user edited)
3. ❌ `NETLIFY_ENV_VARS_FIX.md`
4. ❌ `QUICK_FIX_GUIDE.md`
5. ❌ `PRODUCTION_ISSUES_SUMMARY.md`
6. ❌ `STREAMING_FALLBACK_DEBUG.md`
7. ❌ `DEPLOY_EDGE_FUNCTIONS.md`
8. ❌ `QUICK_START_PHASES_1_2.md`
9. ❌ `STREAMING_STATUS.md`
10. ❌ `STREAMING_FIX_PLAN.md`
11. ❌ `MIGRATION_FIX_COMPLETE.md`
12. ❌ `DEPLOYMENT_COMPLETE.md`
13. ❌ `PHASE2_IMPLEMENTATION_SUMMARY.md`

### Category B: Source Code
14. ❌ `src/lib/provincialGenerationStreamer.ts` - HARDCODED KEYS
15. ❌ `src/components/TEKPanel.tsx` - HARDCODED URL
16. ❌ `src/components/EnhancedMineralsDashboard.tsx` - HARDCODED URL

### Category C: Scripts
17. ❌ `test-edge-functions.sh` - HARDCODED KEY

### Category D: Build Artifacts (Should be in .gitignore)
18. ⚠️ `dist/assets/index-htx8UvI0.js` - Contains embedded key (from build)

---

## 🔧 REMEDIATION STRATEGY

### Phase 1: Documentation Scrub (13 files)
**Action**: Replace all literal keys/URLs with placeholders
**Placeholders**:
- `<YOUR_SUPABASE_PROJECT_URL>`
- `<YOUR_SUPABASE_ANON_KEY>`
- `<YOUR_SUPABASE_EDGE_BASE>`
- `<YOUR_GEMINI_API_KEY>`
- `<YOUR_OPENWEATHERMAP_API_KEY>`

### Phase 2: Source Code Refactor (3 files)
**Action**: Replace hardcoded values with `import.meta.env` references
**Pattern**:
```typescript
// BEFORE
const SUPABASE_URL = 'https://qnymbecjgeaoxsfphrti.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGci...';

// AFTER
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
```

### Phase 3: Script Cleanup (1 file)
**Action**: Accept keys via environment variables
**Pattern**:
```bash
# BEFORE
ANON_KEY="eyJhbGci..."

# AFTER
ANON_KEY="${SUPABASE_ANON_KEY:-YOUR_KEY_HERE}"
```

### Phase 4: Build Artifacts
**Action**: Add to .gitignore and remove from tracking
**Files**: `dist/**/*.js`, `dist/**/*.css`

---

## 🚀 EXECUTION PLAN

### Step 1: Scrub Documentation (Batch 1)
- NETLIFY_ENV_VARS_FIX.md
- QUICK_FIX_GUIDE.md
- PRODUCTION_ISSUES_SUMMARY.md
- STREAMING_FALLBACK_DEBUG.md

### Step 2: Scrub Documentation (Batch 2)
- DEPLOY_EDGE_FUNCTIONS.md
- QUICK_START_PHASES_1_2.md
- STREAMING_STATUS.md
- STREAMING_FIX_PLAN.md

### Step 3: Scrub Documentation (Batch 3)
- MIGRATION_FIX_COMPLETE.md
- DEPLOYMENT_COMPLETE.md
- PHASE2_IMPLEMENTATION_SUMMARY.md
- FINAL_STATUS_REPORT.md (complete)

### Step 4: Refactor Source Code
- src/lib/provincialGenerationStreamer.ts
- src/components/TEKPanel.tsx
- src/components/EnhancedMineralsDashboard.tsx

### Step 5: Update Scripts
- test-edge-functions.sh

### Step 6: Clean Build Artifacts
- Update .gitignore
- Remove dist/ from tracking

### Step 7: Verification
- Run `git grep` for each secret pattern
- Confirm no hits outside node_modules/.netlify

### Step 8: Commit & Document
- Commit all changes
- Create KEY_ROTATION_REQUIRED.md
- Push to GitHub

---

## ✅ SUCCESS CRITERIA

1. ✅ No literal Supabase anon keys in tracked files
2. ✅ No literal Gemini API keys in tracked files
3. ✅ No literal OpenWeatherMap keys in tracked files
4. ✅ All documentation uses placeholders
5. ✅ All source code uses environment variables
6. ✅ All scripts accept env vars or params
7. ✅ Build artifacts excluded from tracking
8. ✅ `git grep` returns zero hits for secrets

---

## 🔄 POST-REMEDIATION ACTIONS

### User Actions Required:
1. **Rotate Supabase Anon Key**
   - Go to: https://supabase.com/dashboard/project/qnymbecjgeaoxsfphrti/settings/api
   - Generate new anon key
   - Update in Netlify environment variables
   - Update local `.env` file

2. **Rotate Gemini API Key**
   - Go to: https://console.cloud.google.com/apis/credentials
   - Revoke old key
   - Create new key
   - Update in Netlify environment variables
   - Update local `.env` file

3. **Rotate OpenWeatherMap Key** (Optional - free tier)
   - Go to: https://home.openweathermap.org/api_keys
   - Generate new key
   - Update in Netlify environment variables
   - Update local `.env` file

4. **Redeploy Application**
   - `pnpm run build:prod`
   - `netlify deploy --prod --dir=dist`

---

## 📊 PROGRESS TRACKER

- [ ] Phase 1: Documentation Batch 1 (4 files)
- [ ] Phase 1: Documentation Batch 2 (4 files)
- [ ] Phase 1: Documentation Batch 3 (4 files)
- [ ] Phase 2: Source Code (3 files)
- [ ] Phase 3: Scripts (1 file)
- [ ] Phase 4: Build Artifacts
- [ ] Phase 5: Verification
- [ ] Phase 6: Commit & Push
- [ ] Phase 7: Key Rotation (User)
- [ ] Phase 8: Redeploy (User)

---

**Status**: Ready to execute  
**ETA**: 20-30 minutes  
**Risk**: LOW (all changes are safe redactions)
