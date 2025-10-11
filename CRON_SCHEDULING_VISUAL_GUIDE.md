# 🎯 CRON SCHEDULING - VISUAL STEP-BY-STEP GUIDE

**Issue:** Scheduling card not visible in current UI view  
**Solution:** Navigate to correct section in Supabase Dashboard

---

## **📍 EXACT NAVIGATION PATH**

### **Starting Point:**
You're currently on: `Edge Functions → weather-ingestion-cron → Overview`

### **Where to Find Scheduling:**

#### **Option 1: Scroll Down on Overview Page**
The Overview page has multiple sections. **Scroll down** past the metrics graphs to find:
- **"Scheduling"** section (or)
- **"Cron schedules"** section (or)
- **"Triggers"** section

Look for a card with a **"+ Add schedule"** or **"Create schedule"** button.

#### **Option 2: Check Settings Tab**
If not on Overview, try:
1. Click **"Settings"** tab (next to Overview, Invocations, Logs, Code, Details)
2. Look for **"Cron"** or **"Scheduling"** section
3. Click **"Add schedule"** button

#### **Option 3: Use Function List View**
1. Go back to: https://supabase.com/dashboard/project/qnymbecjgeaoxsfphrti/functions
2. Find `weather-ingestion-cron` in the list
3. Look for a **⚙️ gear icon** or **"..."** menu next to the function name
4. Click it and select **"Add schedule"** or **"Configure cron"**

---

## **🎨 WHAT TO LOOK FOR**

### **Visual Indicators:**
- 📅 Calendar icon
- ⏰ Clock icon
- 🔄 Recurring/loop icon
- Text saying "Cron", "Schedule", "Trigger", or "Automation"

### **Button Text:**
- "Add schedule"
- "Create schedule"
- "Configure cron"
- "+ Schedule"

---

## **📋 IF SCHEDULING IS NOT AVAILABLE**

### **Possible Reasons:**

#### **1. Free Tier Limitation (Most Likely)**
Supabase may have moved cron scheduling to **paid tiers only** in recent updates.

**Check:**
- Look for a 💎 "Pro" or "Upgrade" badge near scheduling features
- Check: https://supabase.com/pricing (Edge Functions section)

**Solution:** Use alternative scheduling methods (see below)

#### **2. Project Permissions**
You may not have admin/owner permissions.

**Check:**
- Dashboard → Settings → Team
- Verify you're listed as "Owner" or "Admin"

**Solution:** Ask project owner to add schedule or grant permissions

#### **3. Feature Not Enabled**
Some projects need to enable Edge Functions features.

**Check:**
- Dashboard → Settings → Edge Functions
- Look for "Enable cron scheduling" toggle

**Solution:** Enable the feature if available

---

## **🔄 ALTERNATIVE SCHEDULING METHODS**

Since CLI doesn't support scheduling, here are alternatives:

### **Method 1: External Cron Service (Recommended)**

Use a free external cron service to trigger your edge functions:

#### **A. cron-job.org (Free)**
1. Sign up: https://cron-job.org
2. Create job:
   - URL: `https://qnymbecjgeaoxsfphrti.functions.supabase.co/weather-ingestion-cron`
   - Schedule: `0 */3 * * *` (every 3 hours)
   - Add header: `Authorization: Bearer <ANON_KEY>`
3. Repeat for other functions

#### **B. EasyCron (Free tier)**
1. Sign up: https://www.easycron.com
2. Create cron job with same URL and schedule

#### **C. GitHub Actions (Free for public repos)**
Create `.github/workflows/cron-weather.yml`:
```yaml
name: Weather Ingestion Cron
on:
  schedule:
    - cron: '0 */3 * * *'  # Every 3 hours
  workflow_dispatch:  # Manual trigger

jobs:
  trigger:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Weather Ingestion
        run: |
          curl -X POST \
            "https://qnymbecjgeaoxsfphrti.functions.supabase.co/weather-ingestion-cron" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}"
```

Add secret: `SUPABASE_ANON_KEY` in GitHub repo settings

---

### **Method 2: Self-Hosted Cron (If You Have a Server)**

If you have access to a Linux server or VPS:

```bash
# Edit crontab
crontab -e

# Add these lines:
# Weather ingestion every 3 hours
0 */3 * * * curl -X POST "https://qnymbecjgeaoxsfphrti.functions.supabase.co/weather-ingestion-cron" -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Storage dispatch every 30 minutes
*/30 * * * * curl -X POST "https://qnymbecjgeaoxsfphrti.functions.supabase.co/storage-dispatch-engine?province=ON" -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Data purge weekly (Sunday 2 AM)
0 2 * * 0 curl -X POST "https://qnymbecjgeaoxsfphrti.functions.supabase.co/data-purge-cron" -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### **Method 3: Vercel Cron (If Using Vercel)**

If your frontend is on Vercel, use Vercel Cron:

Create `api/cron/weather.ts`:
```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  // Verify cron secret
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const response = await fetch(
    'https://qnymbecjgeaoxsfphrti.functions.supabase.co/weather-ingestion-cron',
    {
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}`
      }
    }
  );

  const data = await response.json();
  return res.status(200).json(data);
}
```

Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/weather",
      "schedule": "0 */3 * * *"
    }
  ]
}
```

---

## **🎯 RECOMMENDED APPROACH**

### **For Demo/Award Submission:**

**Use GitHub Actions** (easiest, free, reliable):

1. ✅ No external service signup needed
2. ✅ Version controlled
3. ✅ Easy to modify schedules
4. ✅ Built-in monitoring via Actions tab
5. ✅ Can trigger manually for testing

### **Implementation Steps:**

1. Create `.github/workflows/` directory
2. Add 3 workflow files (weather, storage, purge)
3. Add `SUPABASE_ANON_KEY` to GitHub secrets
4. Commit and push
5. Verify in Actions tab

**I can create these files for you immediately!**

---

## **📊 COMPARISON OF METHODS**

| Method | Setup Time | Reliability | Cost | Monitoring |
|--------|-----------|-------------|------|------------|
| **Supabase Dashboard** | 2 min | ⭐⭐⭐⭐⭐ | Free* | Built-in |
| **GitHub Actions** | 5 min | ⭐⭐⭐⭐⭐ | Free | Built-in |
| **cron-job.org** | 3 min | ⭐⭐⭐⭐ | Free | Basic |
| **Self-hosted cron** | 2 min | ⭐⭐⭐ | Free | Manual |
| **Vercel Cron** | 10 min | ⭐⭐⭐⭐⭐ | Free | Built-in |

*May require Pro tier

---

## **✅ NEXT STEPS**

### **Option A: Keep Trying Dashboard**
1. Try all 3 navigation methods above
2. Take a screenshot if still not found
3. Check Supabase pricing page for cron availability

### **Option B: Use GitHub Actions (Recommended)**
1. Let me create the workflow files
2. Add secret to GitHub repo
3. Verify workflows run successfully

### **Option C: Use External Service**
1. Sign up for cron-job.org
2. Add 3 cron jobs
3. Test with manual trigger

---

**Which approach would you like me to implement?**

I recommend **Option B (GitHub Actions)** as it's:
- ✅ Free forever
- ✅ Version controlled
- ✅ Easy to monitor
- ✅ No external dependencies
- ✅ Can be automated immediately

**Shall I create the GitHub Actions workflows now?**
