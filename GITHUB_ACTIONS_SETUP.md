# 🔧 GitHub Actions Setup Guide

**Purpose**: Configure GitHub Actions cron jobs for automated tasks  
**Date**: October 13, 2025  
**Status**: Ready for configuration

---

## 📋 PREREQUISITES

Before starting, gather these credentials:

1. **Supabase Credentials**:
   - URL: `https://qnymbecjgeaoxsfphrti.supabase.co`
   - Anon Key: (from `.env.local`)
   - Service Role Key: (from Supabase Dashboard → Settings → API)

2. **Netlify Credentials**:
   - Site ID: (from Netlify Dashboard → Site settings → General → Site details)
   - Auth Token: (from Netlify Dashboard → User settings → Applications → Personal access tokens)

---

## 🚀 STEP-BY-STEP CONFIGURATION

### Step 1: Add GitHub Repository Secrets

1. Go to your GitHub repository:
   ```
   https://github.com/sanjabh11/canada-energy-dashboard
   ```

2. Navigate to: **Settings** → **Secrets and variables** → **Actions**

3. Click **"New repository secret"** and add each of these:

   | Secret Name | Value | Where to Find |
   |-------------|-------|---------------|
   | `SUPABASE_URL` | `https://qnymbecjgeaoxsfphrti.supabase.co` | Supabase Dashboard → Settings → API → Project URL |
   | `SUPABASE_ANON_KEY` | `eyJhbGc...` | Supabase Dashboard → Settings → API → Project API keys → anon public |
   | `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGc...` | Supabase Dashboard → Settings → API → Project API keys → service_role (⚠️ Keep secret!) |
   | `NETLIFY_SITE_ID` | `[your-site-id]` | Netlify Dashboard → Site settings → General → Site details → Site ID |
   | `NETLIFY_AUTH_TOKEN` | `[your-token]` | Netlify Dashboard → User settings → Applications → Personal access tokens → New access token |

4. Click **"Add secret"** for each one

---

### Step 2: Verify Workflow Files Exist

Check that these workflow files exist in `.github/workflows/`:

```bash
ls -la .github/workflows/
```

Expected files:
- `storage-dispatch-cron.yml` - Storage dispatch scheduler (every 30 min)
- `weather-ingestion-cron.yml` - Weather data ingestion (every 6 hours)
- `data-purge-cron.yml` - Data purge job (daily at 2 AM UTC)

---

### Step 3: Enable GitHub Actions

1. Go to your repository's **Actions** tab:
   ```
   https://github.com/sanjabh11/canada-energy-dashboard/actions
   ```

2. If workflows are disabled, click **"I understand my workflows, go ahead and enable them"**

3. You should see three workflows listed:
   - Storage Dispatch Scheduler
   - Weather Ingestion Cron
   - Data Purge Cron

---

### Step 4: Test Workflows Manually

1. Click on **"Storage Dispatch Scheduler"** workflow

2. Click **"Run workflow"** dropdown (top right)

3. Select branch: `main`

4. Click **"Run workflow"** button

5. Wait 10-30 seconds and refresh the page

6. You should see a new workflow run appear with status:
   - 🟡 **In progress** (yellow dot)
   - ✅ **Success** (green checkmark)
   - ❌ **Failed** (red X)

7. Click on the run to see logs and debug if needed

8. Repeat for other workflows to test them

---

### Step 5: Verify Cron Schedules

The workflows should run automatically on these schedules:

| Workflow | Schedule | Cron Expression | Next Run |
|----------|----------|-----------------|----------|
| Storage Dispatch | Every 30 minutes | `*/30 * * * *` | Next :00 or :30 |
| Weather Ingestion | Every 6 hours | `0 */6 * * *` | Next 00:00, 06:00, 12:00, 18:00 UTC |
| Data Purge | Daily at 2 AM UTC | `0 2 * * *` | Tomorrow 02:00 UTC |

**Note**: GitHub Actions cron jobs may have a 5-15 minute delay from scheduled time.

---

### Step 6: Monitor Workflow Runs

1. Go to **Actions** tab to see all runs

2. Check for:
   - ✅ Green checkmarks (success)
   - ❌ Red X (failure - click to see logs)
   - 🟡 Yellow dot (in progress)

3. Click on any run to see detailed logs

4. If a workflow fails:
   - Click on the failed job
   - Expand the failed step
   - Read error message
   - Fix the issue
   - Re-run the workflow

---

## 🔍 TROUBLESHOOTING

### Issue: "Missing authorization header"

**Cause**: `SUPABASE_ANON_KEY` or `SUPABASE_SERVICE_ROLE_KEY` not set

**Fix**:
1. Verify secrets are added in GitHub → Settings → Secrets
2. Check secret names match exactly (case-sensitive)
3. Re-run workflow

### Issue: "relation does not exist"

**Cause**: Required database table missing

**Fix**:
1. Run database migrations:
   ```bash
   supabase db push
   ```
2. Or apply migration manually in Supabase Dashboard → SQL Editor

### Issue: "Workflow not triggering on schedule"

**Cause**: GitHub Actions cron has delays or repository inactive

**Fix**:
1. Wait 15-30 minutes after scheduled time
2. Manually trigger workflow once to "wake up" the repository
3. Check that workflows are enabled in Actions tab

### Issue: "Invalid credentials"

**Cause**: Supabase keys expired or incorrect

**Fix**:
1. Get fresh keys from Supabase Dashboard → Settings → API
2. Update GitHub secrets
3. Re-run workflow

---

## ✅ VERIFICATION CHECKLIST

After configuration, verify:

- [ ] All 5 secrets added to GitHub repository
- [ ] Workflows visible in Actions tab
- [ ] Manual workflow run succeeds
- [ ] Storage dispatch creates log entries in `storage_dispatch_log` table
- [ ] Weather ingestion updates `weather_observations` table
- [ ] Data purge creates entries in `data_purge_log` table
- [ ] Cron jobs run automatically on schedule

---

## 📊 EXPECTED RESULTS

### After 30 Minutes
- Storage dispatch should have 1-2 new log entries
- `storage_dispatch_log` table shows recent actions

### After 6 Hours
- Weather ingestion should have run once
- `weather_observations` table has new data

### After 24 Hours
- Data purge should have run once
- `data_purge_log` table shows purge record
- Old data (>7 days) removed from tables

---

## 🔗 USEFUL LINKS

- **GitHub Actions Docs**: https://docs.github.com/en/actions
- **Cron Expression Helper**: https://crontab.guru/
- **Supabase Edge Functions**: https://supabase.com/docs/guides/functions
- **Netlify Build Hooks**: https://docs.netlify.com/configure-builds/build-hooks/

---

## 📝 NOTES

1. **Free Tier Limits**:
   - GitHub Actions: 2,000 minutes/month
   - Current usage: ~1,440 minutes/month (within limits)

2. **Cron Accuracy**:
   - GitHub Actions cron is not precise
   - Expect 5-15 minute delays
   - Use for non-critical scheduled tasks only

3. **Security**:
   - Never commit secrets to repository
   - Use GitHub Secrets for all credentials
   - Service role key has full database access - keep secure!

4. **Monitoring**:
   - Check Actions tab daily for failures
   - Set up email notifications in GitHub settings
   - Monitor Supabase logs for errors

---

**Status**: ✅ READY FOR CONFIGURATION  
**Estimated Time**: 20 minutes  
**Next Step**: Add secrets to GitHub repository
