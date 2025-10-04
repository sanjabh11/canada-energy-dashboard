# DEPLOYMENT RUNBOOK - PHASE 1 LAUNCH
## Canada Energy Intelligence Platform (CEIP)
### Step-by-Step Deployment Procedures

**Version**: 1.0  
**Last Updated**: October 3, 2025  
**Owner**: Platform Development Team  
**Review Frequency**: Weekly during deployment phase

---

## 🎯 DEPLOYMENT OBJECTIVES

**Phase 1 Reduced Scope Launch**:
- Deploy 17 working features (6 production-ready, 11 acceptable, 3 partial with warnings)
- Defer 4 incomplete features with clear "Coming Soon" notices
- Ensure zero critical security vulnerabilities
- Target 99% uptime from day 1
- Enable monitoring and alerting

---

## 📋 PRE-DEPLOYMENT CHECKLIST

### ✅ Code & Configuration

- [ ] All feature flags configured in `src/lib/featureFlags.ts`
- [ ] Deferred features show "Coming Soon" notices
- [ ] Partial features show limitation warnings
- [ ] Environment variables reviewed and validated
- [ ] `.env` file NOT committed to git
- [ ] Secrets stored in Supabase Project Settings → Functions → Environment
- [ ] Database migrations tested and ready
- [ ] No console.error or console.warn in production build
- [ ] Bundle size analyzed (<3MB compressed)
- [ ] TypeScript build successful (`pnpm exec tsc -b`)

### ✅ Testing

- [ ] Manual smoke test of all 17 in-scope features completed
- [ ] IESO streaming failover tested
- [ ] LLM rate limiting verified
- [ ] Investment calculations (NPV/IRR) accuracy validated
- [ ] Help system content accessible
- [ ] Error boundaries functioning
- [ ] Loading states and skeletons working
- [ ] Offline/cached data behavior tested

### ✅ Documentation

- [ ] `DEPLOYMENT_SCOPE.md` reviewed and accurate
- [ ] Feature availability page content verified
- [ ] User-facing limitations documented
- [ ] Operations manual prepared
- [ ] Rollback procedures documented
- [ ] Incident response playbook ready

### ✅ Infrastructure

- [ ] Supabase project created (or existing verified)
- [ ] Database migrations applied
- [ ] Edge Functions deployed (43 functions)
- [ ] RLS policies configured and tested
- [ ] Backup schedule configured
- [ ] Monitoring dashboards created
- [ ] Error tracking (Sentry/similar) configured
- [ ] DNS records configured (if custom domain)
- [ ] SSL certificates verified

### ✅ Security

- [ ] All API endpoints require authentication where appropriate
- [ ] CORS configuration verified
- [ ] Rate limiting tested on LLM endpoints
- [ ] Environment secrets not exposed to client
- [ ] Indigenous data governance disclaimers added
- [ ] Automated security scan passed (or issues documented)

---

## 🚀 DEPLOYMENT STEPS

### STEP 1: Staging Environment Setup (Day -7)

#### 1.1 Create/Verify Supabase Staging Project

```bash
# If using Supabase CLI
supabase link --project-ref <staging-project-ref>
supabase db push --dry-run
```

**Verify**:
- Project URL: `https://<staging-ref>.supabase.co`
- Anon key available
- Service role key available (store securely)

#### 1.2 Deploy Database Migrations

```bash
# Apply all migrations
supabase db push

# Verify tables created
supabase db list
```

**Expected Tables** (17 migrations):
- `ontario_hourly_demand`
- `provincial_generation`
- `hf_electricity_demand`
- `grid_status`
- `grid_stability_metrics`
- `grid_recommendations`
- `security_incidents`
- `threat_models`
- `mitigation_strategies`
- `security_metrics`
- `resilience_assets`
- `resilience_hazards`
- `help_text`
- `llm_call_log`
- `llm_feedback`
- `llm_rate_limit`
- `indigenous_datasets`, `indigenous_fpic_records`, `indigenous_territories`

#### 1.3 Deploy Edge Functions

```bash
# Deploy all functions (or use GitHub Actions)
supabase functions deploy --project-ref <staging-ref>

# Verify deployment
supabase functions list
```

**Expected**: 43 Edge Functions deployed

#### 1.4 Configure Environment Secrets (Staging)

**In Supabase Dashboard** → Project Settings → Functions → Environment:

```bash
# Core
SUPABASE_URL=https://<staging-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<staging-service-key>

# LLM
LLM_ENABLED=true
LLM_CACHE_TTL_MIN=15
LLM_MAX_RPM=30
LLM_COST_PER_1K=0.003
GEMINI_API_KEY=<your-gemini-key>
GEMINI_MODEL_EXPLAIN=gemini-2.0-flash-exp
GEMINI_MODEL_ANALYTICS=gemini-2.0-flash-exp

# CORS
LLM_CORS_ALLOW_ORIGINS=http://localhost:5173,https://<staging-domain>

# Feature Flags (Optional overrides)
VITE_ENABLE_WEBSOCKET=false
VITE_ENABLE_LLM=true
VITE_USE_STREAMING_DATASETS=true
```

#### 1.5 Build and Deploy Frontend (Staging)

```bash
# Install dependencies
pnpm install

# Build for production
pnpm run build

# Deploy to hosting (e.g., Vercel, Netlify, Cloudflare Pages)
# Example for Vercel:
vercel --prod --env VITE_SUPABASE_URL=https://<staging-ref>.supabase.co \
             --env VITE_SUPABASE_ANON_KEY=<staging-anon-key> \
             --env VITE_SUPABASE_EDGE_BASE=https://<staging-ref>.functions.supabase.co
```

**Environment Variables for Frontend Build**:
```env
VITE_SUPABASE_URL=https://<staging-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<staging-anon-key>
VITE_SUPABASE_EDGE_BASE=https://<staging-ref>.functions.supabase.co
VITE_USE_STREAMING_DATASETS=true
VITE_ENABLE_LLM=true
VITE_ENABLE_WEBSOCKET=false
VITE_DEBUG_LOGS=false
```

#### 1.6 Smoke Test Staging

**Test Checklist**:
- [ ] App loads without errors
- [ ] IESO streaming connects and displays data
- [ ] Help modal opens and loads content
- [ ] Investment dashboard calculates NPV/IRR
- [ ] LLM chart explanation works (respects rate limits)
- [ ] Feature availability page displays correctly
- [ ] "Coming Soon" badges appear on deferred features
- [ ] Limitation warnings show on partial features
- [ ] Database connections working
- [ ] Error boundaries catch and display errors gracefully

---

### STEP 2: Load Testing (Day -5 to -3)

#### 2.1 Prepare Load Testing Environment

```bash
# Install artillery or k6 for load testing
npm install -g artillery

# Or use k6
brew install k6
```

#### 2.2 Load Test Scenarios

**Scenario 1: Dashboard Load (100 concurrent users)**

Create `load-test-dashboard.yml`:

```yaml
config:
  target: "https://<staging-domain>"
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 300
      arrivalRate: 20
      name: "Sustained load"
    - duration: 60
      arrivalRate: 50
      name: "Peak load"

scenarios:
  - name: "Dashboard browsing"
    flow:
      - get:
          url: "/"
      - think: 5
      - get:
          url: "/dashboard"
      - think: 10
      - get:
          url: "/investment"
      - think: 10
```

Run:
```bash
artillery run load-test-dashboard.yml
```

**Acceptable Metrics**:
- p95 response time <3 seconds
- Error rate <0.5%
- Successful requests >99.5%

**Scenario 2: Streaming API Load**

```bash
# Test IESO streaming endpoint
k6 run --vus 50 --duration 5m streaming-test.js
```

**Scenario 3: LLM Rate Limiting**

Test that rate limits work:
```bash
# Send 100 requests rapidly
for i in {1..100}; do
  curl -X POST https://<staging-ref>.functions.supabase.co/llm/explain \
    -H "Authorization: Bearer <anon-key>" \
    -H "apikey: <anon-key>" \
    -d '{"datasetPath": "test", "chartType": "line"}' &
done
```

**Expected**: Some requests return 429 (rate limited)

#### 2.3 Analyze Results & Optimize

**If performance issues found**:
- Review database query plans
- Add caching where appropriate
- Optimize bundle size
- Implement code splitting
- Configure CDN for static assets

---

### STEP 3: Security Scan (Day -3)

#### 3.1 Automated Security Scan

```bash
# Option 1: OWASP ZAP
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t https://<staging-domain>

# Option 2: npm audit
pnpm audit --audit-level=moderate

# Option 3: Snyk
npx snyk test
```

**Review findings and create issues for**:
- Critical vulnerabilities (block deployment)
- High vulnerabilities (document and plan fix)
- Medium vulnerabilities (document, fix in Phase 2)

#### 3.2 Manual Security Checks

- [ ] Test authentication bypass attempts
- [ ] Test SQL injection on API endpoints
- [ ] Test XSS in user input fields
- [ ] Verify CORS allows only expected origins
- [ ] Test rate limiting on all public endpoints
- [ ] Verify environment secrets not exposed in Network tab
- [ ] Test RLS policies prevent unauthorized data access

---

### STEP 4: User Acceptance Testing (Day -2 to Day 0)

#### 4.1 Recruit Pilot Users

- [ ] 2-3 internal team members
- [ ] 2-3 external beta testers (if available)
- [ ] 1 Indigenous advisor (if available, for Indigenous dashboard)

#### 4.2 Test Scenarios

**Scenario 1: New User Onboarding**
- User lands on homepage
- Navigates to feature availability page
- Understands what's available vs coming soon
- Uses help system to learn features

**Scenario 2: Production-Ready Features**
- View real-time IESO data
- Generate investment analysis
- Request LLM chart explanation
- Access help content

**Scenario 3: Acceptable Features with Limitations**
- Use compliance monitoring with local storage
- Explore resilience analysis
- Navigate stakeholder coordination
- Verify limitations are clearly communicated

**Scenario 4: Partial Features**
- View minerals dashboard (note simulated data warning)
- Explore security assessment (note limited APIs)
- Use grid optimization (note forecasting not available)

**Scenario 5: Deferred Features**
- Attempt to access emissions tracking
- See "Coming Soon" notice
- Verify Phase 2 timeline displayed

#### 4.3 Collect Feedback

**Feedback Form**:
- What worked well?
- What was confusing?
- Were limitations clearly communicated?
- Any bugs or errors encountered?
- Which Phase 2 features are most important?

---

### STEP 5: Production Deployment (Day 0)

#### 5.1 Final Pre-Flight Checks

- [ ] All staging tests passed
- [ ] Load testing results acceptable
- [ ] Security scan critical issues resolved
- [ ] User feedback incorporated or documented
- [ ] Rollback plan tested
- [ ] Operations team briefed
- [ ] Support channels ready

#### 5.2 Deploy to Production

**Timeline**: Deploy during low-traffic window (e.g., Saturday 2AM)

1. **Create Production Supabase Project** (if new)
   ```bash
   supabase link --project-ref <prod-project-ref>
   ```

2. **Deploy Database Migrations**
   ```bash
   supabase db push --project-ref <prod-project-ref>
   ```

3. **Deploy Edge Functions**
   ```bash
   supabase functions deploy --project-ref <prod-project-ref>
   ```

4. **Configure Production Secrets**
   
   In Supabase Dashboard → Production Project → Functions → Environment:
   
   ```bash
   SUPABASE_URL=https://<prod-ref>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<prod-service-key>
   LLM_ENABLED=true
   GEMINI_API_KEY=<prod-gemini-key>
   # ... (all secrets from staging, verified)
   ```

5. **Build and Deploy Frontend**
   ```bash
   # Production build
   VITE_SUPABASE_URL=https://<prod-ref>.supabase.co \
   VITE_SUPABASE_ANON_KEY=<prod-anon-key> \
   VITE_SUPABASE_EDGE_BASE=https://<prod-ref>.functions.supabase.co \
   pnpm run build

   # Deploy (example for Vercel)
   vercel --prod
   ```

6. **Verify Deployment**
   - [ ] App loads at production URL
   - [ ] No console errors
   - [ ] IESO streaming working
   - [ ] Database connections active
   - [ ] LLM endpoints responding
   - [ ] Help system accessible

#### 5.3 Gradual Rollout (Optional but Recommended)

If using load balancer or traffic management:

**Day 0**: 10% traffic to production, 90% to staging
- Monitor error rates, response times
- If stable for 4 hours, proceed

**Day 1**: 50% traffic to production
- Monitor for 24 hours
- Compare metrics to staging baseline

**Day 2**: 100% traffic to production
- Full production rollout
- Decommission or scale down staging

---

### STEP 6: Post-Deployment Monitoring (Day 1-7)

#### 6.1 Critical Metrics to Watch

**Dashboard to Monitor** (Supabase Dashboard → Logs & Monitoring):

1. **Error Rate**
   - Target: <0.5% of requests
   - Alert if: >1% for 5 minutes

2. **Response Time**
   - Target: p95 <3 seconds
   - Alert if: p95 >5 seconds for 10 minutes

3. **Database Connections**
   - Target: <70% of pool
   - Alert if: >90% for 5 minutes

4. **API Requests**
   - Monitor for unusual spikes
   - Watch for rate-limited requests (expected)

5. **Edge Function Errors**
   - Check logs for recurring errors
   - Investigate any 5xx responses

#### 6.2 Daily Health Check (Days 1-7)

**Morning Check** (9AM):
- [ ] Review overnight error logs
- [ ] Check uptime (should be >99%)
- [ ] Verify IESO streaming still connected
- [ ] Review LLM usage and costs
- [ ] Check support tickets (if any)

**Evening Check** (5PM):
- [ ] Review day's metrics
- [ ] Address any user-reported issues
- [ ] Update stakeholders on status
- [ ] Plan next day's monitoring focus

#### 6.3 User Feedback Collection

- Monitor in-app feedback submissions
- Track support tickets by feature
- Note which "Coming Soon" features get most inquiries
- Document user confusion points for Phase 2 improvements

---

## 🔄 ROLLBACK PROCEDURES

### When to Rollback

**Immediate Rollback** if:
- Error rate >5% for 15 minutes
- Critical security vulnerability discovered
- Data corruption detected
- Service completely unavailable

**Planned Rollback** if:
- Error rate 1-5% sustained for 1 hour
- User experience severely degraded
- Database performance unacceptable

### Rollback Steps

#### Option 1: Frontend Rollback (Fastest - 5 minutes)

```bash
# Vercel example
vercel rollback <previous-deployment-url>

# Or redeploy previous version
git checkout <previous-commit>
vercel --prod
```

#### Option 2: Database Rollback (If migrations failed)

```bash
# Rollback latest migration
supabase db rollback

# Verify
supabase db list
```

#### Option 3: Full Rollback (If all else fails)

1. Point DNS back to staging/previous version
2. Rollback database migrations
3. Redeploy previous Edge Functions version
4. Notify users of temporary service disruption
5. Investigate root cause offline

### Post-Rollback Actions

- [ ] Document root cause
- [ ] Create incident report
- [ ] Fix issues in staging
- [ ] Re-test thoroughly
- [ ] Schedule new deployment

---

## 📞 INCIDENT RESPONSE

### Severity Levels

**P0 - Critical** (Response: Immediate, 24/7)
- Complete service outage
- Data loss or corruption
- Security breach

**P1 - High** (Response: <30 minutes)
- Major feature broken (IESO streaming down)
- Significant performance degradation
- Authentication failures

**P2 - Medium** (Response: <2 hours)
- Minor feature issues
- Intermittent errors
- UI bugs affecting usability

**P3 - Low** (Response: Next business day)
- Cosmetic issues
- Feature requests
- Documentation errors

### Incident Response Steps

1. **Acknowledge**: Log incident, assign owner, set severity
2. **Assess**: Determine scope and impact
3. **Communicate**: Notify users if P0/P1, update status page
4. **Mitigate**: Apply temporary fix or workaround
5. **Resolve**: Implement permanent fix
6. **Document**: Post-mortem for P0/P1 incidents

### On-Call Rotation

**Week 1**: [Developer A]  
**Week 2**: [Developer B]  
**Week 3**: [Developer C]  

**Escalation**:
1. On-call engineer (respond within 15 min for P0/P1)
2. Team lead (if on-call unavailable or needs help)
3. Platform owner (for P0 only)

---

## 📊 SUCCESS CRITERIA

### Launch Week (Days 1-7)

- [ ] Uptime >99%
- [ ] Error rate <0.5%
- [ ] Zero P0 incidents
- [ ] <5 P1 incidents
- [ ] All 17 in-scope features functional
- [ ] User feedback collected from >10 users

### First Month (Days 1-30)

- [ ] Uptime >99.5%
- [ ] Average response time <2 seconds
- [ ] User satisfaction >4.0/5
- [ ] Phase 2 priorities identified from feedback
- [ ] No critical security vulnerabilities

---

## 📝 DEPLOYMENT LOG

| Date | Action | Status | Notes |
|------|--------|--------|-------|
| [Date] | Staging deployment | [ ] | |
| [Date] | Load testing | [ ] | |
| [Date] | Security scan | [ ] | |
| [Date] | UAT complete | [ ] | |
| [Date] | Production deployment | [ ] | |
| [Date] | Day 1 health check | [ ] | |
| [Date] | Day 7 review | [ ] | |

---

## 🔗 RELATED DOCUMENTS

- [Reduced Scope Launch Plan](./REDUCED_SCOPE_LAUNCH_PLAN.md) - Overall 60-day plan
- [Deployment Scope](./DEPLOYMENT_SCOPE.md) - What's included/excluded
- [Final Gap Analysis](./FINAL_PRE_DEPLOYMENT_GAP_ANALYSIS.md) - Comprehensive audit
- [Operations Manual](./OPERATIONS_MANUAL.md) - Day-to-day operations (to be created)

---

**Runbook Version**: 1.0  
**Last Updated**: October 3, 2025  
**Next Review**: October 10, 2025  
**Owner**: Platform Development Team
