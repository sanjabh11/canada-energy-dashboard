# CCUS Dashboard - Testing Checklist & Data Flow Verification

## 🧪 BROWSER CONSOLE TESTING

### Test Data Fetch:
1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Navigate to CCUS Tracker
4. Look for request to: `/api-v2-ccus?province=AB`

**Expected**:
```
Status: 200 OK
Response Time: < 500ms
Response Size: ~15-30 KB
Content-Type: application/json
```

### Check Console Logs:
```javascript
// No errors should appear
// If data fetch fails, you'll see:
"Failed to fetch CCUS data: [error message]"
```

---

## 📊 DATA FLOW DIAGRAM

```
User clicks "CCUS Tracker"
    ↓
CCUSProjectTracker.tsx component mounts
    ↓
useEffect() hook triggers
    ↓
fetchEdgeJson('/api-v2-ccus?province=AB')
    ↓
Edge Function: api-v2-ccus/index.ts
    ↓
handleDashboard() function
    ↓
Query Supabase tables:
  - ccus_facilities
  - pathways_alliance_projects
  - ccus_pipelines
  - ccus_storage_sites
    ↓
calculateSummary() aggregates stats
    ↓
Return JSON response
    ↓
Component state updated: setData(response)
    ↓
Dashboard renders with tabs
    ↓
User sees data in UI
```

---

## 🔍 DEBUGGING CHECKLIST

### If Dashboard Doesn't Load:

**1. Check Database**
```sql
-- Verify tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'ccus%';

-- Expected: ccus_facilities, ccus_capture_data, ccus_pipelines, ccus_storage_sites, ccus_economics
```

**2. Check Edge Function Deployment**
```bash
# List deployed functions
npx supabase functions list --project-ref qnymbecjgeaoxsfphrti

# Should show:
# api-v2-ccus (deployed)
```

**3. Check Network Request**
- Open DevTools → Network tab
- Look for failed requests (red)
- Click on failed request to see error details

**4. Common Errors & Fixes**

| Error | Cause | Fix |
|-------|-------|-----|
| "Failed to fetch CCUS data" | Edge function not deployed | Redeploy: `npx supabase functions deploy api-v2-ccus` |
| 404 Not Found | Wrong endpoint URL | Check function URL in Supabase dashboard |
| 500 Internal Server Error | Database tables missing | Run migration SQL |
| CORS error | Missing CORS headers | Check `getCorsHeaders()` in edge function |
| Empty data arrays | No seed data | Verify INSERT statements ran in migration |
| TypeScript errors | Type mismatch | Check interfaces in CCUSProjectTracker.tsx |

---

## 📸 SCREENSHOTS TO VERIFY

### Screenshot 1: Pathways Alliance Tab
**What to look for**:
- ✅ Red banner at top
- ✅ "$16.5B Proposal" visible
- ✅ Tax credit gap visualization (21% green, 79% red)
- ✅ 6 projects in table
- ✅ Bar chart at bottom

### Screenshot 2: Overview Tab
**What to look for**:
- ✅ Pie chart with 4 colored segments
- ✅ Storage utilization bars (3 sites)
- ✅ Blue info panel with bullet points

### Screenshot 3: Facilities Tab
**What to look for**:
- ✅ 5 rows in table
- ✅ Color-coded status badges
- ✅ Shell Canada, NWR Refining, SaskPower visible

### Screenshot 4: Economics Tab
**What to look for**:
- ✅ 3 large stat cards ($30B+, $12B+, $18B+)
- ✅ Yellow economic impact panel

---

## 🎯 ACCEPTANCE CRITERIA

### Functional Requirements:
- [ ] Dashboard loads in < 2 seconds
- [ ] All 4 tabs are clickable
- [ ] Data appears in all sections (no "0" or "—" everywhere)
- [ ] Charts render correctly (no blank charts)
- [ ] Table rows are populated
- [ ] No console errors
- [ ] Responsive on mobile (optional for now)

### Data Accuracy:
- [ ] Pathways total investment = $16.5B
- [ ] 6 Pathways projects shown
- [ ] Quest listed as "Operational"
- [ ] ACTL capacity = 14.6 Mt/year
- [ ] Federal tax credit gap = $7.15B

### UX Requirements:
- [ ] Tab transitions are smooth
- [ ] Colors are consistent (green=operational, yellow=construction, blue=proposed, red=Pathways)
- [ ] Text is readable (no overlapping)
- [ ] Icons render (Factory icon in nav, stat card icons)

---

## 🚨 CRITICAL ISSUES TO WATCH FOR

### Issue 1: Edge Function CORS Errors
**Symptom**: Console shows "CORS policy" error
**Fix**:
```typescript
// In api-v2-ccus/index.ts, ensure:
const corsHeaders = getCorsHeaders(req);
// Returns proper CORS headers for your domain
```

### Issue 2: Database RLS Blocking Queries
**Symptom**: Empty arrays returned, no error in console
**Fix**:
```sql
-- Disable RLS for CCUS tables (or add policies)
ALTER TABLE ccus_facilities DISABLE ROW LEVEL SECURITY;
ALTER TABLE pathways_alliance_projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE ccus_pipelines DISABLE ROW LEVEL SECURITY;
ALTER TABLE ccus_storage_sites DISABLE ROW LEVEL SECURITY;
```

### Issue 3: Missing fetchEdgeJson Function
**Symptom**: "fetchEdgeJson is not defined"
**Fix**: Verify `src/lib/edge.ts` exists with export

---

## ✅ FINAL VERIFICATION

Run this complete test sequence:

1. **Database**: Query all CCUS tables → Data exists ✓
2. **Edge Function**: curl test → 200 OK ✓
3. **Frontend**: Click CCUS tab → Dashboard loads ✓
4. **Pathways Tab**: Red banner visible → $16.5B shown ✓
5. **Overview Tab**: Pie chart renders → 4 segments ✓
6. **Facilities Tab**: Table shows 5 facilities ✓
7. **Economics Tab**: $30B+ total investment ✓

**If all 7 checks pass → IMPLEMENTATION SUCCESS! 🎉**

---

## 📞 TROUBLESHOOTING SUPPORT

If you encounter issues, provide:
1. Screenshot of error
2. Browser console log (copy full text)
3. Network tab showing failed request
4. Output of: `npx supabase functions list`

I'll help debug immediately!
