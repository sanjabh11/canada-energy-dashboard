# Netlify Deployment Guide
**Platform:** Canada Energy Intelligence Platform (CEIP)  
**Deployment Target:** Netlify + Supabase Edge Functions  
**Date:** 2025-10-07

---

## 📋 PRE-DEPLOYMENT CHECKLIST

### ✅ 1. Code Preparation
- [x] All features implemented and tested locally
- [x] README.md updated with latest features
- [x] Security audit completed (94/100 score)
- [ ] Cleanup recommendations applied
- [ ] All tests passing
- [ ] No TypeScript errors (`pnpm exec tsc --noEmit`)
- [ ] No ESLint errors (`pnpm run lint`)

### ✅ 2. Environment Configuration
- [x] `.env.example` created with all required variables
- [x] `.env` in `.gitignore`
- [ ] Production environment variables prepared
- [ ] Supabase Edge Function secrets documented

### ✅ 3. Build Verification
```bash
# Test production build locally
pnpm run build:prod

# Verify build output
ls -la dist/

# Preview production build
pnpm run preview
# Test at http://localhost:4173
```

**Expected Output:**
- `dist/` directory created
- `dist/index.html` exists
- `dist/assets/` contains bundled JS/CSS
- No build errors

---

## 🚀 NETLIFY SETUP

### Step 1: Create Netlify Account
1. Go to https://netlify.com
2. Sign up (GitHub auth recommended for auto-deploy)
3. Verify email

### Step 2: Connect Repository

#### Option A: Git-Based Deployment (Recommended)
```bash
# Push to GitHub
git add .
git commit -m "feat: ready for production deployment"
git push origin main
```

**In Netlify Dashboard:**
1. Click "Add new site" → "Import an existing project"
2. Choose "GitHub" (or GitLab/Bitbucket)
3. Authorize Netlify
4. Select repository: `sanjabh11/canada-energy-dashboard`
5. Configure build settings:
   - **Build command:** `pnpm run build:prod`
   - **Publish directory:** `dist`
   - **Node version:** 20

#### Option B: Manual Deployment (Quick Test)
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod --dir=dist
```

---

### Step 3: Configure Build Settings

**In Netlify Dashboard → Site Settings → Build & Deploy:**

```yaml
# Build Settings
Build command: pnpm run build:prod
Publish directory: dist
Node version: 20

# Build Environment Variables (Netlify Dashboard)
VITE_SUPABASE_URL=https://qnymbecjgeaoxsfphrti.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_USE_STREAMING_DATASETS=true
VITE_DEBUG_LOGS=false
VITE_ENABLE_EDGE_FETCH=true
```

**⚠️ IMPORTANT:** Use Netlify's environment variables UI, not `.env` file!

---

### Step 4: Custom Domain (Optional)

**Default:** Your site will be at `random-name-12345.netlify.app`

**Custom Domain:**
1. Go to Site Settings → Domain Management
2. Click "Add custom domain"
3. Enter: `energy.yourdomain.com`
4. Follow DNS configuration instructions:
   - **CNAME record:** `energy` → `random-name-12345.netlify.app`
5. Netlify auto-provisions SSL certificate (5-10 minutes)

---

### Step 5: Configure Headers & Redirects

**Create `public/_headers` file:**
```
/*
  # Security Headers
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=()
  
  # Content Security Policy
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://generativelanguage.googleapis.com; frame-ancestors 'none';

/assets/*
  # Cache static assets for 1 year
  Cache-Control: public, max-age=31536000, immutable
```

**Create `public/_redirects` file:**
```
# SPA fallback - send all requests to index.html
/*    /index.html   200

# API proxying (if needed)
/api/*  https://qnymbecjgeaoxsfphrti.supabase.co/:splat  200
```

---

## 🔧 SUPABASE CONFIGURATION

### Step 1: Update CORS Origins

**In Supabase Dashboard → Project Settings → API → CORS Configuration:**

Add your Netlify domain:
```
https://your-site-name.netlify.app
```

**Or in Edge Function environment variables:**
```bash
# In Supabase Dashboard → Functions → Environment
LLM_CORS_ALLOW_ORIGINS=http://localhost:5173,https://your-site-name.netlify.app
```

---

### Step 2: Verify Edge Functions

**Deploy all Edge Functions:**
```bash
# Set your project ref
export SUPABASE_PROJECT_REF=qnymbecjgeaoxsfphrti

# Deploy main LLM function
supabase functions deploy llm --project-ref $SUPABASE_PROJECT_REF

# Deploy household advisor
supabase functions deploy household-advisor --project-ref $SUPABASE_PROJECT_REF

# Deploy streaming endpoints
supabase functions deploy stream-ontario-demand --project-ref $SUPABASE_PROJECT_REF
supabase functions deploy stream-provincial-generation --project-ref $SUPABASE_PROJECT_REF

# Verify deployments
supabase functions list --project-ref $SUPABASE_PROJECT_REF
```

**Test Edge Functions:**
```bash
# Health check
curl https://qnymbecjgeaoxsfphrti.supabase.co/functions/v1/llm/health

# LLM test
curl -X POST https://qnymbecjgeaoxsfphrti.supabase.co/functions/v1/llm/transition-kpis \
  -H "Content-Type: application/json" \
  -H "apikey: YOUR_ANON_KEY" \
  -d '{"datasetPath":"ontario_demand","timeframe":"recent"}'
```

---

### Step 3: Database Migrations

**Ensure all migrations are applied:**

1. Go to Supabase Dashboard → SQL Editor
2. Run migration file: `supabase/migrations/20250827_llm_schemas.sql`
3. Verify tables exist:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Expected tables:
-- llm_call_log
-- llm_feedback
-- llm_rate_limit
-- household_chat_messages
```

---

## 🧪 POST-DEPLOYMENT TESTING

### Automated Tests
```bash
# Set production URL
export LLM_BASE=https://qnymbecjgeaoxsfphrti.supabase.co/functions/v1/llm

# Run tests against production
node tests/test_llm_endpoints.js
node tests/cloud_health.mjs
```

### Manual Testing Checklist

#### **Core Functionality:**
- [ ] Site loads at Netlify URL
- [ ] All dashboards accessible (Energy, Indigenous, Arctic, Minerals, etc.)
- [ ] Charts render correctly
- [ ] Real-time data streaming works
- [ ] No console errors in browser

#### **AI Features:**
- [ ] "Explain Chart" button works
- [ ] LLM generates proper responses
- [ ] Household Advisor chat responds
- [ ] Transition reports generate
- [ ] Data quality assessments work

#### **Indigenous Features:**
- [ ] Territory map loads
- [ ] FPIC workflows display
- [ ] TEK panel shows data
- [ ] Governance notices appear
- [ ] 451 status code enforced for sensitive data

#### **Arctic Features:**
- [ ] Arctic dashboard loads
- [ ] Community profiles display
- [ ] Diesel-to-renewable metrics shown
- [ ] Climate resilience data available

#### **Security:**
- [ ] Rate limiting enforced (test with 31+ rapid requests)
- [ ] PII redaction working (try entering email in LLM prompt)
- [ ] Indigenous data protection active
- [ ] CORS blocks unauthorized origins
- [ ] No exposed API keys in browser devtools

#### **Performance:**
- [ ] Page load < 3 seconds
- [ ] Time to Interactive < 5 seconds
- [ ] No layout shift (CLS < 0.1)
- [ ] Charts load smoothly
- [ ] No memory leaks (check Chrome DevTools)

---

## 📊 MONITORING & ANALYTICS

### Netlify Analytics (Built-in)
**Enable:** Site Settings → Analytics → Enable

**Tracks:**
- Page views
- Top pages
- Referrers
- Geographic distribution
- Bandwidth usage

### Supabase Logs
**Location:** Supabase Dashboard → Logs

**Monitor:**
- Edge Function execution logs
- Database queries
- Error rates
- Slow queries

### Custom Monitoring (Optional)

**Add Google Analytics:**
```html
<!-- In index.html -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

**Add Sentry Error Tracking:**
```typescript
// In main.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  environment: "production",
  tracesSampleRate: 0.1,
});
```

---

## 🔄 CONTINUOUS DEPLOYMENT

### GitHub Actions (Recommended)

**Create `.github/workflows/deploy.yml`:**
```yaml
name: Deploy to Netlify

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8
          
      - name: Install dependencies
        run: pnpm install
        
      - name: Type check
        run: pnpm exec tsc --noEmit
        
      - name: Lint
        run: pnpm run lint
        
      - name: Build
        run: pnpm run build:prod
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
          VITE_USE_STREAMING_DATASETS: true
          
      - name: Deploy to Netlify
        uses: netlify/actions/cli@master
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
        with:
          args: deploy --prod --dir=dist
```

**Setup Secrets in GitHub:**
1. Go to Repository → Settings → Secrets and variables → Actions
2. Add secrets:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `NETLIFY_AUTH_TOKEN` (from Netlify settings)
   - `NETLIFY_SITE_ID` (from Netlify site settings)

---

## 🚨 ROLLBACK PLAN

### If Deployment Fails:

#### **Option 1: Rollback in Netlify**
1. Go to Deploys tab
2. Find last working deploy
3. Click "Publish deploy"

#### **Option 2: Revert Git Commit**
```bash
git revert HEAD
git push origin main
# Netlify auto-deploys previous version
```

#### **Option 3: Manual Redeploy**
```bash
git checkout <last-working-commit>
pnpm run build:prod
netlify deploy --prod --dir=dist
```

---

## 📝 POST-DEPLOYMENT TASKS

### Immediate (Within 1 hour):
- [ ] Verify all features work in production
- [ ] Test from different browsers (Chrome, Firefox, Safari)
- [ ] Test on mobile devices
- [ ] Check Netlify build logs for warnings
- [ ] Monitor Supabase logs for errors

### Day 1:
- [ ] Review analytics (page views, errors)
- [ ] Check rate limiting is working
- [ ] Monitor LLM costs (Supabase dashboard)
- [ ] Test Indigenous data protection

### Week 1:
- [ ] Review user feedback (if any)
- [ ] Optimize any slow queries
- [ ] Adjust rate limits if needed
- [ ] Plan Phase II features

---

## 💰 COST ESTIMATION

### Netlify Free Tier:
- ✅ 100 GB bandwidth/month (sufficient for demo)
- ✅ 300 build minutes/month
- ✅ Auto SSL
- ✅ CDN included
- **Cost:** $0/month

### Supabase Free Tier:
- ✅ 500 MB database
- ✅ 1 GB file storage
- ✅ 50 MB Edge Functions
- ✅ 2 GB egress
- ✅ 500K Edge Function invocations
- **Cost:** $0/month

### Gemini API:
- Model: gemini-2.0-flash-exp
- Cost: ~$0.003 per 1K tokens
- Estimated: 100 queries/day × 500 tokens avg = 50K tokens/day
- Monthly: ~1.5M tokens × $0.003 = **$4.50/month**

**Total Estimated Cost:** **~$5/month** (amazing for a production AI platform!)

---

## 🎉 SUCCESS CRITERIA

**Deployment is successful if:**
- ✅ Site loads without errors
- ✅ All 15+ dashboards accessible
- ✅ LLM features work (explain, analyze, chat)
- ✅ Real-time data streaming active
- ✅ Rate limiting enforced
- ✅ Security measures verified
- ✅ Indigenous data protection working
- ✅ Performance acceptable (<3s load time)
- ✅ No console errors
- ✅ Mobile responsive

**Next Steps After Success:**
1. Share with stakeholders
2. Gather feedback
3. Plan Phase II enhancements
4. Consider custom domain
5. Set up monitoring alerts

---

## 📞 TROUBLESHOOTING

### Common Issues:

#### **Build Fails:**
```bash
# Clear cache and rebuild
rm -rf node_modules/.vite-temp dist
pnpm install
pnpm run build:prod
```

#### **Site Loads but Blank:**
- Check browser console for errors
- Verify environment variables set in Netlify
- Check `_redirects` file for SPA fallback

#### **LLM Not Working:**
- Verify Gemini API key set in Supabase
- Check CORS origins include Netlify domain
- Test Edge Functions directly with curl

#### **Rate Limit Too Aggressive:**
- Adjust `LLM_MAX_RPM` in Supabase Edge Function environment

#### **Slow Loading:**
- Enable Netlify's asset optimization
- Check for large images (optimize with WebP)
- Review bundle size (`npx vite-bundle-visualizer`)

---

**Deployment Checklist Complete!** 🚀

**Deployed URL:** https://your-site-name.netlify.app  
**Status:** Ready for production  
**Last Updated:** 2025-10-07
