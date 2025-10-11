# 🚀 EXECUTE CRON SETUP - STEP-BY-STEP GUIDE

**Time Required:** 10 minutes  
**Optimized for:** Supabase Free Tier + Award Submission

---

## **✅ STEP 1: Update Purge Function** ⏱️ 2 minutes

### **Action:**
1. Open: https://supabase.com/dashboard/project/qnymbecjgeaoxsfphrti/sql/new
2. Copy contents of: `supabase/migrations/20251011_update_purge_function.sql`
3. Click "RUN"

### **Expected Output:**
```
✅ Data purge complete
   Weather: 0 rows deleted (90 day retention)
   Forecasts: 0 rows deleted (60 day retention)
   Curtailment: 0 rows deleted (180 day retention)
   Storage: 0 rows deleted (30 day retention)
```

### **Verification:**
- Table shows row counts and sizes
- All tables should show 0 rows deleted (fresh data)

---

## **✅ STEP 2: Schedule Weather Ingestion** ⏱️ 2 minutes

### **Action:**
1. Open: https://supabase.com/dashboard/project/qnymbecjgeaoxsfphrti/functions
2. Click on: `weather-ingestion-cron`
3. Go to: "Manage" tab
4. Find: "Cron" section
5. Click: "Add schedule"
6. Enter cron expression: `0 */3 * * *`
7. Description: "Weather ingestion every 3 hours"
8. Click: "Save"

### **Schedule Details:**
- **Frequency:** Every 3 hours (8 times/day)
- **Next Run:** Top of next 3-hour mark (00:00, 03:00, 06:00, etc.)
- **Monthly Invocations:** ~240
- **Data Growth:** ~1,920 rows/month

### **Verification:**
- Schedule appears in cron list
- Status shows "Active"
- Next run time is displayed

---

## **✅ STEP 3: Schedule Storage Dispatch** ⏱️ 2 minutes

### **Action:**
1. Same dashboard (Edge Functions)
2. Click on: `storage-dispatch-engine`
3. Go to: "Manage" tab
4. Find: "Cron" section
5. Click: "Add schedule"
6. Enter cron expression: `*/30 * * * *`
7. Description: "Storage dispatch every 30 minutes"
8. Click: "Save"

### **Schedule Details:**
- **Frequency:** Every 30 minutes (48 times/day)
- **Next Run:** Top of next 30-minute mark (:00, :30)
- **Monthly Invocations:** ~1,440
- **Data Growth:** ~5,760 rows/month

### **Verification:**
- Schedule appears in cron list
- Status shows "Active"
- Next run time is displayed

---

## **✅ STEP 4: Schedule Data Purge** ⏱️ 2 minutes

### **Action:**
1. Same dashboard (Edge Functions)
2. Click on: `data-purge-cron`
3. Go to: "Manage" tab
4. Find: "Cron" section
5. Click: "Add schedule"
6. Enter cron expression: `0 2 * * 0`
7. Description: "Weekly data purge (Sunday 2 AM)"
8. Click: "Save"

### **Schedule Details:**
- **Frequency:** Weekly (Sunday at 2:00 AM UTC)
- **Next Run:** Next Sunday at 2:00 AM
- **Monthly Invocations:** ~4
- **Purpose:** Maintain database size <100 MB

### **Verification:**
- Schedule appears in cron list
- Status shows "Active"
- Next run time shows upcoming Sunday

---

## **✅ STEP 5: Test Functions Manually** ⏱️ 2 minutes

### **Test Weather Ingestion:**
```bash
curl -s "https://qnymbecjgeaoxsfphrti.functions.supabase.co/weather-ingestion-cron" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFueW1iZWNqZ2Vhb3hzZnBocnRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwMTczNjEsImV4cCI6MjA3MTU5MzM2MX0.6wAWe5GdKzTOjVa0eUVhDJ4IwczseO9A83uwXlDg0DU" \
  | jq '.'
```

**Expected:** Success with 8 provinces

### **Test Storage Dispatch:**
```bash
curl -s "https://qnymbecjgeaoxsfphrti.functions.supabase.co/storage-dispatch-engine?province=ON" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFueW1iZWNqZ2Vhb3hzZnBocnRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwMTczNjEsImV4cCI6MjA3MTU5MzM2MX0.6wAWe5GdKzTOjVa0eUVhDJ4IwczseO9A83uwXlDg0DU" \
  | jq '.decision'
```

**Expected:** Dispatch decision (charge/discharge/hold)

### **Test Data Purge:**
```bash
curl -s "https://qnymbecjgeaoxsfphrti.functions.supabase.co/data-purge-cron" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFueW1iZWNqZ2Vhb3hzZnBocnRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwMTczNjEsImV4cCI6MjA3MTU5MzM2MX0.6wAWe5GdKzTOjVa0eUVhDJ4IwczseO9A83uwXlDg0DU" \
  | jq '.purge_details'
```

**Expected:** Purge results showing rows deleted per table

---

## **📊 RESOURCE USAGE SUMMARY**

### **After Setup:**

| Function | Frequency | Invocations/Month | Data Growth/Month |
|----------|-----------|-------------------|-------------------|
| Weather Ingestion | Every 3 hrs | 240 | 1,920 rows (~2 MB) |
| Storage Dispatch | Every 30 min | 1,440 | 5,760 rows (~3 MB) |
| Data Purge | Weekly | 4 | -varies- |
| **TOTAL** | - | **1,684** | **~5 MB/month** |

### **Free Tier Compliance:**
- ✅ Invocations: 1,684 / 500,000 (0.3%)
- ✅ Database: ~60 MB / 500 MB (12%)
- ✅ Egress: <500 MB / 5 GB (<10%)

**Verdict:** ✅ **WELL WITHIN FREE TIER LIMITS**

---

## **📅 EXPECTED TIMELINE**

### **Day 1 (Today):**
- ✅ All crons scheduled
- ⏱️ First weather run: Next 3-hour mark
- ⏱️ First storage run: Next 30-minute mark
- ⏱️ First purge run: Next Sunday 2 AM

### **Day 2:**
- 16 weather observations
- 48 storage dispatches
- Storage efficiency starts calculating

### **Day 3:**
- 24 weather observations
- 72 storage dispatches
- Storage efficiency >85% (award target likely met)

### **Day 7:**
- 56 weather observations
- 336 storage dispatches
- Full award evidence ready
- First purge run completed

---

## **🔍 MONITORING & VERIFICATION**

### **Check Cron Status:**
1. Go to: https://supabase.com/dashboard/project/qnymbecjgeaoxsfphrti/functions
2. Each function should show:
   - ✅ Green "Active" status
   - 📅 Next scheduled run time
   - 📊 Recent execution logs

### **Check Function Logs:**
1. Click on any function
2. Go to "Logs" tab
3. Look for recent executions
4. Verify no errors

### **Check Database Growth:**
```sql
-- Run in Supabase SQL Editor
SELECT * FROM get_database_stats();
```

**Expected Output:**
- weather_observations: Growing by ~8 rows every 3 hours
- storage_dispatch_logs: Growing by ~4 rows every 30 minutes
- Total size: <100 MB

---

## **⚠️ TROUBLESHOOTING**

### **Issue: Cron Not Running**
**Symptoms:** No logs, no new data  
**Solutions:**
1. Check cron expression is valid
2. Verify function is deployed
3. Check Supabase status page
4. Try manual trigger via curl

### **Issue: Function Errors in Logs**
**Symptoms:** Error messages in logs  
**Solutions:**
1. Check RLS policies (use SERVICE_ROLE_KEY)
2. Verify table schemas match
3. Check for missing environment variables
4. Review error message details

### **Issue: Database Growing Too Fast**
**Symptoms:** Size approaching 500 MB  
**Solutions:**
1. Run manual purge: `SELECT * FROM purge_old_data();`
2. Reduce cron frequency
3. Shorten retention periods
4. Delete old test data

---

## **✅ FINAL CHECKLIST**

After completing all steps, verify:

- [ ] Purge function updated and tested
- [ ] Weather cron scheduled (every 3 hours)
- [ ] Storage cron scheduled (every 30 minutes)
- [ ] Purge cron scheduled (weekly Sunday 2 AM)
- [ ] All functions show "Active" status
- [ ] Manual tests successful
- [ ] Logs show no errors
- [ ] Database size <100 MB

---

## **🎯 SUCCESS CRITERIA**

### **Immediate (After Setup):**
- All 3 crons scheduled and active
- Manual tests pass
- No errors in logs

### **After 24 Hours:**
- 16 weather observations recorded
- 48 storage dispatches recorded
- Storage efficiency calculation started
- Database size <70 MB

### **After 7 Days:**
- 56 weather observations
- 336 storage dispatches
- Storage efficiency >88%
- Award evidence complete
- First purge run successful

---

**🎉 READY TO EXECUTE! Follow these 5 steps to complete the cron setup!**
