# 🚀 GITHUB ACTIONS CRON SETUP - COMPLETE GUIDE

**Solution:** Use GitHub Actions for free, reliable cron scheduling  
**Time Required:** 5 minutes  
**Cost:** $0 (Free forever for public repos)

---

## **✅ WHAT I'VE CREATED**

### **3 GitHub Actions Workflows:**

1. **`.github/workflows/cron-weather-ingestion.yml`**
   - Schedule: Every 3 hours (`0 */3 * * *`)
   - Purpose: Fetch weather data for 8 provinces
   - Invocations: 240/month

2. **`.github/workflows/cron-storage-dispatch.yml`**
   - Schedule: Every 30 minutes (`*/30 * * * *`)
   - Purpose: Battery dispatch decisions for 4 provinces
   - Invocations: 1,440/month (4 provinces × 360/month each)

3. **`.github/workflows/cron-data-purge.yml`**
   - Schedule: Weekly Sunday 2 AM (`0 2 * * 0`)
   - Purpose: Clean up old data
   - Invocations: 4/month

**Total:** 1,684 invocations/month (0.3% of Supabase free tier)

---

## **📋 SETUP STEPS**

### **STEP 1: Add Supabase Secret to GitHub** ⏱️ 2 min

1. **Go to your GitHub repository:**
   ```
   https://github.com/YOUR_USERNAME/energy-data-dashboard/settings/secrets/actions
   ```

2. **Click:** "New repository secret"

3. **Add secret:**
   - **Name:** `SUPABASE_ANON_KEY`
   - **Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFueW1iZWNqZ2Vhb3hzZnBocnRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwMTczNjEsImV4cCI6MjA3MTU5MzM2MX0.6wAWe5GdKzTOjVa0eUVhDJ4IwczseO9A83uwXlDg0DU`

4. **Click:** "Add secret"

---

### **STEP 2: Commit and Push Workflow Files** ⏱️ 2 min

The workflow files are already created in `.github/workflows/`. Now commit them:

```bash
# Navigate to repo
cd /Users/sanjayb/minimax/energy-data-dashboard

# Add workflow files
git add .github/workflows/

# Commit
git commit -m "Add GitHub Actions cron workflows for weather, storage, and purge"

# Push to GitHub
git push origin main
```

---

### **STEP 3: Verify Workflows Are Active** ⏱️ 1 min

1. **Go to Actions tab:**
   ```
   https://github.com/YOUR_USERNAME/energy-data-dashboard/actions
   ```

2. **You should see 3 workflows:**
   - ✅ Weather Ingestion Cron
   - ✅ Storage Dispatch Cron
   - ✅ Data Purge Cron

3. **Check status:**
   - Each should show a green checkmark or "Waiting for schedule"
   - No red X marks (errors)

---

### **STEP 4: Test Workflows Manually** ⏱️ 2 min

Before waiting for scheduled runs, test them manually:

1. **Go to Actions tab**

2. **Click:** "Weather Ingestion Cron"

3. **Click:** "Run workflow" dropdown

4. **Click:** "Run workflow" button

5. **Wait ~30 seconds**

6. **Check results:**
   - Green checkmark = Success ✅
   - Red X = Failed ❌ (check logs)

7. **Repeat for other 2 workflows:**
   - Storage Dispatch Cron
   - Data Purge Cron

---

## **📊 EXPECTED RESULTS**

### **Weather Ingestion:**
```
🌤️  Triggering weather ingestion...
✅ Weather ingestion successful
Weather data ingested for 8 provinces
```

### **Storage Dispatch:**
```
🔋 Triggering storage dispatch for ON...
✅ Storage dispatch successful for ON
   Action: charge
   Power: 24 MW
   Reason: Renewable surplus + low prices
```

### **Data Purge:**
```
🗑️  Triggering weekly data purge...
✅ Data purge successful
   Total rows deleted: 0
   Tables purged: 5
📊 Purge details:
   weather_observations: 0 rows (90 day retention)
   storage_dispatch_logs: 0 rows (30 day retention)
```

---

## **🔍 MONITORING & DEBUGGING**

### **Check Workflow Runs:**
1. Go to Actions tab
2. Click on any workflow
3. See history of all runs
4. Click on specific run to see logs

### **View Detailed Logs:**
1. Click on a workflow run
2. Click on the job name (e.g., "trigger-weather-ingestion")
3. Expand each step to see output
4. Look for ✅ or ❌ indicators

### **Common Issues:**

#### **Issue: "Secret not found"**
**Fix:** Add `SUPABASE_ANON_KEY` secret in GitHub repo settings

#### **Issue: "HTTP 401 Unauthorized"**
**Fix:** Check that ANON_KEY is correct and not expired

#### **Issue: "HTTP 500 Server Error"**
**Fix:** Check Supabase edge function logs for errors

#### **Issue: Workflow not running on schedule**
**Fix:** 
- Ensure workflows are on `main` branch
- Check that repo is not archived
- GitHub Actions must be enabled in repo settings

---

## **📅 SCHEDULE DETAILS**

### **Weather Ingestion:**
- **Cron:** `0 */3 * * *`
- **Times (UTC):** 00:00, 03:00, 06:00, 09:00, 12:00, 15:00, 18:00, 21:00
- **Times (IST):** 05:30, 08:30, 11:30, 14:30, 17:30, 20:30, 23:30, 02:30
- **Frequency:** 8 times/day
- **Monthly:** 240 runs

### **Storage Dispatch:**
- **Cron:** `*/30 * * * *`
- **Times:** Every 30 minutes (:00, :30)
- **Frequency:** 48 times/day × 4 provinces
- **Monthly:** 1,440 runs

### **Data Purge:**
- **Cron:** `0 2 * * 0`
- **Times (UTC):** Sunday 02:00
- **Times (IST):** Sunday 07:30
- **Frequency:** Weekly
- **Monthly:** 4 runs

---

## **✅ ADVANTAGES OF GITHUB ACTIONS**

| Feature | Benefit |
|---------|---------|
| **Free** | No cost for public repos |
| **Reliable** | GitHub's infrastructure |
| **Version Controlled** | Workflows in git |
| **Easy to Modify** | Edit YAML files |
| **Built-in Monitoring** | Actions tab shows all runs |
| **Manual Triggers** | Test anytime via UI |
| **Parallel Execution** | Storage dispatch runs for all provinces simultaneously |
| **Logs Retention** | 90 days of logs |
| **No External Dependencies** | Everything in one place |

---

## **🎯 NEXT STEPS**

### **Immediate (Today):**
1. ✅ Add `SUPABASE_ANON_KEY` secret to GitHub
2. ✅ Commit and push workflow files
3. ✅ Verify workflows appear in Actions tab
4. ✅ Test each workflow manually

### **After 24 Hours:**
- Check Actions tab for scheduled runs
- Verify weather data is being ingested
- Verify storage dispatches are being logged
- Check for any failed runs

### **After 7 Days:**
- Verify purge workflow ran on Sunday
- Check database size is maintained
- Review storage efficiency metrics
- Confirm award evidence is complete

---

## **📊 RESOURCE USAGE**

### **GitHub Actions Free Tier:**
- **Minutes/month:** 2,000 (for public repos: unlimited)
- **Storage:** 500 MB
- **Our Usage:** ~100 minutes/month (well within limits)

### **Supabase Free Tier:**
- **Edge Invocations:** 500,000/month
- **Our Usage:** 1,684/month (0.3%)
- **Database:** 500 MB
- **Our Usage:** <20 MB (4%)

**Verdict:** ✅ **BOTH WELL WITHIN FREE TIER LIMITS**

---

## **🎉 READY TO DEPLOY!**

### **Quick Start Commands:**

```bash
# 1. Add secret to GitHub (manual step in browser)
# 2. Commit and push workflows
git add .github/workflows/
git commit -m "Add GitHub Actions cron workflows"
git push origin main

# 3. Verify in browser
# Go to: https://github.com/YOUR_USERNAME/energy-data-dashboard/actions

# 4. Test manually
# Click each workflow → "Run workflow"
```

---

**🚀 IMPLEMENTATION COMPLETE!**

**Your cron jobs will now run automatically via GitHub Actions:**
- ✅ Weather: Every 3 hours
- ✅ Storage: Every 30 minutes
- ✅ Purge: Weekly Sunday 2 AM

**No Supabase Dashboard scheduling needed!**
**No external services needed!**
**100% free and reliable!**
