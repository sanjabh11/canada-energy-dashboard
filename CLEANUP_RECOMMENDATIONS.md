# Codebase Cleanup Recommendations
**Date:** 2025-10-07  
**Purpose:** Identify unnecessary files, consolidate duplicates, improve maintainability

---

## 🗑️ FILES TO REMOVE (Deprecated/Test)

### Supabase Edge Functions - Test/Debug Files

#### **High Priority - Safe to Delete:**
```
supabase/functions/test-llm/              # Old test function
supabase/functions/test-llm-step2/        # Development iteration
supabase/functions/test-llm-step3/        # Development iteration
supabase/functions/test-llm-step4/        # Development iteration
supabase/functions/fix-llm-db/            # Temporary DB fix
supabase/functions/final-llm-fix/         # Another temporary fix
supabase/functions/test-edge/             # Empty directory (0 items)
```

**Reasoning:** These were development/debugging functions. Production uses:
- `supabase/functions/llm/` (main LLM orchestration)
- `supabase/functions/llm-lite/` (lightweight alternative)
- `supabase/functions/household-advisor/` (production advisor)

**Action:**
```bash
# Remove test functions
rm -rf supabase/functions/test-llm
rm -rf supabase/functions/test-llm-step*
rm -rf supabase/functions/fix-llm-db
rm -rf supabase/functions/final-llm-fix
rm -rf supabase/functions/test-edge
```

---

### Duplicate/Unused Edge Functions

#### **Review Needed:**
```
supabase/functions/llm-lite/              # Lightweight LLM (keep if used)
supabase/functions/llm/index_old.ts       # Old version (delete)
```

**Recommendation:**
- **Keep:** `llm-lite/` if used as fallback
- **Delete:** `llm/index_old.ts`

```bash
rm supabase/functions/llm/index_old.ts
```

---

### Utility Functions - Check Usage

#### **Admin Functions:**
```
supabase/functions/admin-help-edit/       # Empty (0 items) - DELETE
supabase/functions/help/                  # Check if used
supabase/functions/help-simple/           # Duplicate of help?
```

**Action:**
```bash
# Delete empty admin function
rm -rf supabase/functions/admin-help-edit

# Review if help-simple is redundant
# If help/ and help-simple/ provide same functionality, keep only one
```

---

## 📝 FILES TO CONSOLIDATE

### Test Files
**Location:** `tests/`

**Current State:**
```
tests/test_llm_endpoints.js       # LLM endpoint tests
tests/cloud_health.mjs            # Health check
tests/test_phase4_components.js   # Component tests
```

**Issue:** Tests use `fetch()` without timeouts (can hang, as noted in memory)

**Recommendation:**
1. **Add timeouts to all fetch calls:**
```javascript
// In test_llm_endpoints.js and cloud_health.mjs
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

fetch(url, { signal: controller.signal })
  .then(res => {
    clearTimeout(timeoutId);
    // ... test logic
  })
  .catch(err => {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      console.error('Test timed out after 10s');
    }
  });
```

2. **Consolidate into `tests/` directory with consistent patterns**
3. **Add to `package.json`:**
```json
{
  "scripts": {
    "test": "node tests/test_llm_endpoints.js && node tests/cloud_health.mjs",
    "test:llm": "node tests/test_llm_endpoints.js",
    "test:health": "node tests/cloud_health.mjs"
  }
}
```

---

## 🔄 COMPONENT CONSOLIDATION

### Duplicate Dashboard Components

**Pattern:** Multiple versions of same dashboard

#### **Compliance Dashboards:**
```
src/components/ComplianceDashboard.tsx         # Original
src/components/EnhancedComplianceDashboard.tsx # Enhanced version
src/components/CERComplianceDashboard.tsx      # CER-specific
```

**Recommendation:** 
- **Keep:** `EnhancedComplianceDashboard.tsx` (most complete)
- **Archive:** Move others to `src/components/_archive/` (don't delete, may have unique logic)
- **TODO:** Merge unique features from ComplianceDashboard into Enhanced version

#### **Grid Optimization:**
```
src/components/GridOptimizationDashboard.tsx         # Original
src/components/EnhancedGridOptimizationDashboard.tsx # Enhanced
```

**Recommendation:**
- **Keep:** `EnhancedGridOptimizationDashboard.tsx`
- **Archive:** `GridOptimizationDashboard.tsx`

#### **Investment Dashboards:**
```
src/components/InvestmentDashboard.tsx         # (if exists - check)
src/components/EnhancedInvestmentDashboard.tsx # Enhanced version
```

**Recommendation:** Keep Enhanced version, archive basic

#### **Minerals Dashboards:**
```
src/components/MineralsDashboard.tsx         # Original
src/components/EnhancedMineralsDashboard.tsx # Enhanced (631 lines)
```

**Recommendation:**
- **Keep:** `EnhancedMineralsDashboard.tsx` (this is the production version)
- **Delete or Archive:** `MineralsDashboard.tsx`

---

## 📂 PROPOSED DIRECTORY STRUCTURE

### Create Archive Directory:
```bash
mkdir -p src/components/_archive
mkdir -p supabase/functions/_archive
```

### Move Old Versions:
```bash
# Move old component versions to archive
mv src/components/ComplianceDashboard.tsx src/components/_archive/
mv src/components/GridOptimizationDashboard.tsx src/components/_archive/
mv src/components/MineralsDashboard.tsx src/components/_archive/

# Move deprecated Edge Functions to archive
mv supabase/functions/llm/index_old.ts supabase/functions/_archive/
```

### Delete Test Functions:
```bash
# These have no production value
rm -rf supabase/functions/test-llm*
rm -rf supabase/functions/fix-llm-db
rm -rf supabase/functions/final-llm-fix
rm -rf supabase/functions/test-edge
rm -rf supabase/functions/admin-help-edit
```

---

## 🧹 CODE CLEANUP TASKS

### 1. Remove Debug Console.logs
**Search Pattern:**
```bash
grep -r "console.log" src/ | grep -v "console.error" | grep -v "console.warn"
```

**Action:** Replace with proper logging or remove entirely

**Keep:**
- `console.error()` - Error logging
- `console.warn()` - Warning logging

**Remove:**
- `console.log('Debug:', ...)` - Development debugging
- `console.log('TODO:', ...)` - Implementation notes

---

### 2. Unused Imports
**Tool:** ESLint will catch these

```bash
pnpm run lint
# Look for "unused variable" warnings
```

**Common Pattern:**
```typescript
// ❌ Remove
import { SomeComponent } from './SomeComponent';
// ... SomeComponent never used

// ✅ Keep only what's used
import { ActuallyUsedComponent } from './ActuallyUsedComponent';
```

---

### 3. Empty/Placeholder Components
**Search for:**
- Components that only return `<div>Coming soon</div>`
- Unused TypeScript interfaces
- Empty CSS files

**Action:** Remove or implement

---

### 4. Mock Data Files
**Location:** `supabase/functions/llm/mock-data/`

**Current:**
```
mock-data/manifest_*.json
mock-data/sample_*.json
```

**Recommendation:**
- **Keep:** These are fallbacks when streaming fails
- **Organize:** Ensure consistent naming
- **Document:** Add README in mock-data/ explaining purpose

---

## 📊 CLEANUP IMPACT ASSESSMENT

### Estimated File Reduction:
- **Edge Functions:** -7 functions (~3,500 lines)
- **Components:** -4 deprecated components (~2,000 lines)
- **Tests:** 0 (keep, but improve with timeouts)
- **Total:** ~5,500 lines removed

### Estimated Time:
- **Safe Deletions:** 30 minutes
- **Archive Moves:** 1 hour
- **Code Review:** 2 hours
- **Testing After Cleanup:** 1 hour
- **Total:** ~4.5 hours

### Risk Level: **LOW**
- Deleting test functions: ✅ Safe (not in production)
- Archiving old components: ✅ Safe (can restore if needed)
- Removing debug logs: ✅ Safe (not functional)

---

## ✅ CLEANUP CHECKLIST

### Phase 1: Safe Deletions (Do First)
- [ ] Delete `test-llm*` functions
- [ ] Delete `fix-llm-db` function
- [ ] Delete `final-llm-fix` function
- [ ] Delete `test-edge` (empty directory)
- [ ] Delete `admin-help-edit` (empty directory)
- [ ] Delete `llm/index_old.ts`

### Phase 2: Archive Old Components
- [ ] Create `src/components/_archive/` directory
- [ ] Move `ComplianceDashboard.tsx` to archive
- [ ] Move `GridOptimizationDashboard.tsx` to archive
- [ ] Move `MineralsDashboard.tsx` to archive
- [ ] Update imports if any components referenced old versions

### Phase 3: Code Quality
- [ ] Add fetch timeouts to test files
- [ ] Remove debug console.logs (keep errors/warnings)
- [ ] Run `pnpm run lint` and fix issues
- [ ] Run `pnpm exec tsc --noEmit` to check types

### Phase 4: Test After Cleanup
- [ ] `pnpm run build` succeeds
- [ ] `pnpm run dev` works
- [ ] No console errors
- [ ] All dashboards load correctly
- [ ] LLM functions still work

---

## 🚀 POST-CLEANUP BENEFITS

### Improved Maintainability:
- ✅ Clearer file structure
- ✅ Reduced confusion (which component is production?)
- ✅ Easier onboarding for new developers
- ✅ Faster build times (fewer files to process)

### Reduced Technical Debt:
- ✅ No dead code to maintain
- ✅ No duplicate logic to sync
- ✅ Clear separation of production vs archive

### Better Performance:
- ✅ Smaller bundle size (unused components not included)
- ✅ Faster TypeScript compilation
- ✅ Cleaner import resolution

---

## 📝 NOTES FOR FUTURE

### Before Creating New Components:
1. Check if similar component exists
2. Extend existing component instead of duplicating
3. Use proper naming: `Feature.tsx` (not `NewFeature.tsx` or `FeatureV2.tsx`)
4. Delete old version once new version is stable

### Component Evolution Pattern:
```
Phase 1: Create Feature.tsx
Phase 2: Enhance in place (don't create FeatureEnhanced.tsx)
Phase 3: If major rewrite needed, create Feature2.tsx
Phase 4: Once stable, delete Feature.tsx, rename Feature2.tsx → Feature.tsx
```

### Edge Function Pattern:
```
Development: Use test-function-name/
Production: Deploy to function-name/
Cleanup: Delete test-function-name/ once stable
```

---

**Cleanup Execution Plan:**
1. ✅ Review this document with team
2. Create backup branch before cleanup
3. Execute Phase 1 (safe deletions)
4. Test build
5. Execute Phase 2 (archive)
6. Test functionality
7. Execute Phase 3 (code quality)
8. Final testing
9. Commit with message: "chore: cleanup deprecated files and consolidate components"
10. Deploy and monitor

**Rollback Plan:** Archive directory allows quick restoration if needed

**Last Updated:** 2025-10-07
