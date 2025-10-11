# 🎯 CRON SCHEDULING OPTIMIZATION PLAN
## **Supabase Free Tier Constraints & Best Practices**

**Date:** October 11, 2025  
**Objective:** Optimize cron scheduling for demo/award submission while staying within free tier limits

---

## **📊 SUPABASE FREE TIER LIMITS**

| Resource | Free Tier Limit | Our Usage |
|----------|----------------|-----------|
| **Database Size** | 500 MB | ~50 MB (estimated) |
| **Edge Function Invocations** | 500K/month | ~50K/month (with crons) |
| **Egress** | 5 GB/month | <1 GB/month |
| **Storage** | 1 GB | <100 MB |
| **Log Retention** | 1 day | Auto-purged |

---

## **⚠️ KEY CONSTRAINTS FOR DEMO/AWARD**

### **1. Database Growth Rate**
- **Weather Data:** 8 provinces × 24 hours/day × 30 days = 5,760 rows/month
- **Storage Dispatch:** 4 provinces × 96 dispatches/day × 30 days = 11,520 rows/month
- **Total New Rows:** ~17,280 rows/month (~5 MB)

### **2. Edge Function Invocations**
- **Weather Cron:** 24 invocations/day × 30 days = 720/month
- **Storage Cron:** 96 invocations/day × 30 days = 2,880/month
- **Total Cron Invocations:** 3,600/month (0.7% of limit) ✅

### **3. Data Retention Strategy**
- **Existing Function:** `purge_old_data()` already implemented
- **Retention Periods:**
  - Weather: 90 days
  - Forecasts: 60 days
  - Curtailment: 180 days
  - Storage dispatch: Not in purge function yet ⚠️

---

## **🎯 OPTIMIZED CRON SCHEDULE**

### **Schedule 1: Weather Ingestion** ⏱️ RECOMMENDED

#### **Option A: Hourly (Best for Demo)**
- **Cron:** `0 * * * *` (every hour)
- **Invocations:** 720/month
- **Data Growth:** 5,760 rows/month
- **Pros:** Real-time weather, impressive for demo
- **Cons:** More invocations

#### **Option B: Every 3 Hours (Optimized)**
- **Cron:** `0 */3 * * *` (every 3 hours)
- **Invocations:** 240/month
- **Data Growth:** 1,920 rows/month
- **Pros:** 67% fewer invocations, still fresh data
- **Cons:** Less granular

#### **Option C: Every 6 Hours (Conservative)**
- **Cron:** `0 */6 * * *` (4 times/day)
- **Invocations:** 120/month
- **Data Growth:** 960 rows/month
- **Pros:** 83% fewer invocations
- **Cons:** Stale data for forecasting

**✅ RECOMMENDATION: Option B (Every 3 hours)**
- Balances freshness with resource usage
- Still provides 8 data points per day
- Sufficient for award evidence

---

### **Schedule 2: Storage Dispatch** ⏱️ RECOMMENDED

#### **Option A: Every 15 Minutes (Aggressive)**
- **Cron:** `*/15 * * * *` (96 times/day)
- **Invocations:** 2,880/month
- **Data Growth:** 11,520 rows/month
- **Pros:** Real-time dispatch, high accuracy
- **Cons:** Most invocations

#### **Option B: Every 30 Minutes (Balanced)**
- **Cron:** `*/30 * * * *` (48 times/day)
- **Invocations:** 1,440/month
- **Data Growth:** 5,760 rows/month
- **Pros:** 50% fewer invocations, still responsive
- **Cons:** Slightly less granular

#### **Option C: Hourly (Conservative)**
- **Cron:** `0 * * * *` (24 times/day)
- **Invocations:** 720/month
- **Data Growth:** 2,880 rows/month
- **Pros:** 75% fewer invocations
- **Cons:** May miss peak opportunities

**✅ RECOMMENDATION: Option B (Every 30 minutes)**
- Sufficient for demonstrating dispatch logic
- Builds efficiency data in 2-3 days
- Reasonable resource usage

---

### **Schedule 3: Data Purge** ⏱️ NEW REQUIREMENT

#### **Recommended Schedule**
- **Cron:** `0 2 * * 0` (2 AM every Sunday)
- **Invocations:** 4/month
- **Purpose:** Clean up old data, maintain database size
- **Impact:** Keeps DB under 100 MB

---

## **📋 IMPLEMENTATION PLAN**

### **Step 1: Update Data Purge Function** ⏱️ 5 min

Add storage_dispatch_logs to purge function:

```sql
-- Add to purge_old_data() function
DELETE FROM storage_dispatch_logs 
WHERE dispatched_at < NOW() - INTERVAL '30 days';
GET DIAGNOSTICS v_storage_deleted = ROW_COUNT;
RETURN QUERY SELECT 'storage_dispatch_logs'::TEXT, v_storage_deleted, 30;
```

**Retention:** 30 days (sufficient for award evidence)

---

### **Step 2: Schedule Weather Ingestion** ⏱️ 2 min

1. Open: https://supabase.com/dashboard/project/qnymbecjgeaoxsfphrti/functions
2. Select: `weather-ingestion-cron`
3. Click: "Manage" tab → "Add schedule"
4. Enter: `0 */3 * * *` (every 3 hours)
5. Save

**Expected Result:**
- 8 data points per day per province
- 240 invocations/month
- 1,920 rows/month

---

### **Step 3: Schedule Storage Dispatch** ⏱️ 2 min

1. Same dashboard
2. Select: `storage-dispatch-engine`
3. Click: "Manage" tab → "Add schedule"
4. Enter: `*/30 * * * *` (every 30 minutes)
5. Save

**Expected Result:**
- 48 dispatch decisions per day
- 1,440 invocations/month
- 5,760 rows/month

---

### **Step 4: Create Data Purge Cron** ⏱️ 5 min

Create new edge function for weekly cleanup:

**File:** `supabase/functions/data-purge-cron/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // Call purge function
  const { data, error } = await supabase.rpc('purge_old_data');
  
  if (error) throw error;

  return new Response(JSON.stringify({
    success: true,
    purged: data
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

**Schedule:** `0 2 * * 0` (2 AM every Sunday)

---

## **📊 RESOURCE USAGE PROJECTION**

### **Monthly Totals (Optimized Schedule)**

| Resource | Usage | Limit | % Used |
|----------|-------|-------|--------|
| **Edge Invocations** | 1,684 | 500,000 | 0.3% ✅ |
| **Database Rows/Month** | 7,680 | ~10M | <0.1% ✅ |
| **Database Size** | ~60 MB | 500 MB | 12% ✅ |
| **Egress** | <500 MB | 5 GB | <10% ✅ |

**Verdict:** ✅ **WELL WITHIN FREE TIER LIMITS**

---

## **🎯 AWARD EVIDENCE TIMELINE**

### **Day 1 (Today):**
- Schedule crons
- First weather observation (3 hours)
- First storage dispatch (30 minutes)

### **Day 2:**
- 16 weather observations
- 48 storage dispatches
- Storage efficiency starts calculating

### **Day 3:**
- 24 weather observations
- 72 storage dispatches
- Storage efficiency >85% (award target met)

### **Day 7:**
- 56 weather observations
- 336 storage dispatches
- Full award evidence ready

---

## **⚠️ MONITORING & ALERTS**

### **Daily Checks:**
1. Edge function logs (check for errors)
2. Database size (should stay <100 MB)
3. Storage efficiency (should reach >88% by day 3)

### **Weekly Checks:**
1. Run `SELECT * FROM get_database_stats();`
2. Verify purge function ran successfully
3. Check award evidence metrics

---

## **🔧 TROUBLESHOOTING**

### **Issue: Database Growing Too Fast**
- **Solution:** Reduce cron frequency or retention period
- **Command:** `SELECT * FROM purge_old_data();` (manual purge)

### **Issue: Edge Function Errors**
- **Solution:** Check logs in Supabase Dashboard
- **Common:** RLS policy issues (use SERVICE_ROLE_KEY)

### **Issue: Storage Efficiency Not Calculating**
- **Solution:** Need more charge/discharge cycles
- **Wait:** 2-3 days for sufficient data

---

## **✅ FINAL RECOMMENDATIONS**

### **For Demo/Award Submission:**
1. ✅ Weather: Every 3 hours (`0 */3 * * *`)
2. ✅ Storage: Every 30 minutes (`*/30 * * * *`)
3. ✅ Purge: Weekly Sunday 2 AM (`0 2 * * 0`)

### **For Production (Future):**
1. Weather: Hourly (`0 * * * *`)
2. Storage: Every 15 minutes (`*/15 * * * *`)
3. Purge: Daily 2 AM (`0 2 * * *`)
4. Upgrade to Pro tier ($25/month)

---

**🎉 READY TO IMPLEMENT! This schedule optimizes for:**
- ✅ Award evidence quality
- ✅ Free tier compliance
- ✅ Demo impressiveness
- ✅ Resource efficiency
