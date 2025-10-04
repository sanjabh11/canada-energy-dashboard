# OPERATIONS MANUAL
## Canada Energy Intelligence Platform (CEIP)
### Day-to-Day Operations & Support Guide

**Version**: 1.0  
**Effective Date**: December 2, 2025 (Phase 1 Launch)  
**Last Updated**: October 3, 2025  
**Owner**: Operations Team

---

## 📋 TABLE OF CONTENTS

1. [Daily Health Checks](#daily-health-checks)
2. [Common Issues & Troubleshooting](#common-issues--troubleshooting)
3. [User Support Guide](#user-support-guide)
4. [Feature Flag Management](#feature-flag-management)
5. [Monitoring Checklist](#monitoring-checklist)
6. [Escalation Procedures](#escalation-procedures)
7. [Known Limitations](#known-limitations)
8. [Emergency Contacts](#emergency-contacts)

---

## 🔍 DAILY HEALTH CHECKS

### Morning Health Check (15 minutes - 9:00 AM)

#### 1. Application Availability
```bash
# Check if app is accessible
curl -I https://your-domain.com

# Expected: HTTP 200 OK
```

**✅ Pass**: Application loads within 3 seconds  
**⚠️ Investigate**: Load time >5 seconds  
**❌ Escalate**: Application unreachable or 500 errors

#### 2. Supabase Dashboard Review
Navigate to: https://app.supabase.com/project/[your-project-ref]

**Check**:
- [ ] Database health: Green status
- [ ] API requests (last 24h): Within normal range
- [ ] Error rate: <1%
- [ ] Storage usage: <80% of quota
- [ ] Functions: All green

#### 3. Feature Status Verification
Open browser console (F12) after loading app:

**Expected Console Output**:
```
🚀 Canada Energy Intelligence Platform - Phase 1 Launch
📊 20 features available
```

**Development Mode** (if testing):
```
✅ Feature flags validated successfully
📊 Deployment stats: {...}
🚀 Phase 1 Launch: 20/24 features enabled
```

**⚠️ Action Required if**:
- Validation errors appear
- Feature count incorrect (should be 20 in prod)
- Console shows unexpected errors

#### 4. Streaming Data Health
**Navigate to**: Dashboard tab

**Verify**:
- [ ] IESO real-time data updating (check timestamp)
- [ ] No "connection lost" warnings
- [ ] Charts rendering correctly
- [ ] Data table populated

**Normal Indicators**:
- Green "LIVE" badges on data sources
- Timestamps within last 5 minutes
- No red error messages

### Evening Health Check (10 minutes - 5:00 PM)

#### 1. Review Day's Metrics
**Supabase Dashboard** → Logs & Monitoring

**Check**:
- [ ] Total API requests: Compare to yesterday
- [ ] Average response time: <500ms
- [ ] Errors logged: <10 for the day
- [ ] Peak concurrent users: Note for trends

#### 2. User Feedback Review
**Check**:
- In-app feedback submissions (if implemented)
- Support tickets created today
- Common themes or issues

#### 3. Feature Usage Analysis
**Which tabs/features were most accessed?**
- Dashboard, Investment, Features tabs typically high
- Note any unusual patterns

---

## 🛠️ COMMON ISSUES & TROUBLESHOOTING

### Issue 1: "Feature Not Available" / 404 Errors

**Symptoms**:
- User reports feature not accessible
- Tab missing from navigation
- Page shows 404 or blank

**Diagnosis**:
1. Check if feature is deferred (should be hidden in production)
2. Verify feature flag configuration
3. Check browser console for errors

**Solution**:
```typescript
// Verify in browser console
import { getFeature } from './lib/featureFlags';
console.log(getFeature('feature_id'));

// Expected output should show feature config
```

**If feature should be visible**:
1. Check `FEATURE_REGISTRY` in `src/lib/featureFlags.ts`
2. Verify `enabled: true`
3. Confirm not marked as `deferred`

**Resolution Time**: 5-10 minutes

---

### Issue 2: IESO Streaming Data Not Updating

**Symptoms**:
- Timestamp not changing
- "Connection Lost" message
- Stale data (>10 minutes old)

**Diagnosis**:
1. Check IESO API status: https://www.ieso.ca/
2. Review Supabase Edge Function logs
3. Check network tab for failed requests

**Troubleshooting Steps**:

```bash
# 1. Check Edge Function status
# Supabase Dashboard → Edge Functions → ieso-ontario-demand

# 2. Check logs
# Look for errors or rate limiting

# 3. Manual test
curl https://[your-project].functions.supabase.co/ieso-ontario-demand \
  -H "Authorization: Bearer [anon-key]" \
  -H "apikey: [anon-key]"
```

**Common Causes**:
- IESO API maintenance (check their status page)
- Rate limiting (wait 5 minutes, should recover)
- Supabase quota exceeded (check dashboard)
- Network issue (check Supabase status)

**Temporary Workaround**:
- App will fall back to cached data automatically
- Users should see "Using cached data" notice

**Resolution Time**: 15-30 minutes (or wait for IESO API recovery)

---

### Issue 3: LLM Features Not Responding

**Symptoms**:
- "Explain Chart" button does nothing
- Loading spinner never stops
- Error: "Failed to generate explanation"

**Diagnosis**:
1. Check Gemini API key validity
2. Review rate limiting status
3. Check Edge Function logs for LLM calls

**Troubleshooting**:

```bash
# Check environment variables
# Supabase Dashboard → Project Settings → Edge Functions → Environment

# Required:
GEMINI_API_KEY=<your-key>
LLM_ENABLED=true
LLM_MAX_RPM=30
```

**Common Causes**:
- Gemini API key expired or invalid
- Rate limit exceeded (30 requests/minute)
- Gemini API service outage
- Network connectivity issue

**Solutions**:
1. **Rate Limited**: Wait 1 minute, try again
2. **Invalid Key**: Update API key in Supabase settings
3. **API Outage**: Check Google AI status page

**Resolution Time**: 5-10 minutes (unless external service issue)

---

### Issue 4: Features Show "Limited" Badge Unexpectedly

**Symptoms**:
- Yellow "Limited" badge on feature that should be production-ready
- User confused about feature status

**Diagnosis**:
This is **expected behavior** for:
- Grid Optimization (partial: 3.6/5)
- Security Assessment (partial: 3.7/5)
- Minerals Dashboard (partial: 3.8/5) - if accessible

**Verification**:
```typescript
// Check feature status
import { getFeature } from './lib/featureFlags';
console.log(getFeature('grid_optimization'));
// Should show status: 'partial'
```

**If badge is incorrect**:
1. Check `FEATURE_REGISTRY` in `src/lib/featureFlags.ts`
2. Verify rating and status match
3. Update if needed and redeploy

**User Communication**:
"This feature is available with documented limitations. Click the Features tab to see details."

**Resolution Time**: Immediate (provide explanation)

---

### Issue 5: Console Shows Feature Flag Validation Errors

**Symptoms** (Dev mode only):
```
⚠️ Feature flag validation failed: [errors]
```

**Diagnosis**:
Feature flag configuration inconsistency detected

**Common Errors**:
1. **"Rating doesn't match status"**
   - Fix: Update rating or status in `FEATURE_REGISTRY`
   
2. **"Deferred feature enabled=true"**
   - Fix: Set `enabled: false` for deferred features
   
3. **"Missing required fields"**
   - Fix: Add missing `id`, `name`, `status`, or `rating`

**Solution**:
1. Fix issues in `src/lib/featureFlags.ts`
2. Commit and deploy
3. Validation should pass on next load

**Resolution Time**: 10-15 minutes

---

## 👥 USER SUPPORT GUIDE

### Support Tier 1: Self-Service

**User Resources**:
1. **Help System**: Click ? icon throughout app
2. **Features Page**: Click "Features" tab for full feature list
3. **Feature Warnings**: Yellow/blue banners explain limitations

**Common User Questions**:

**Q: "Why can't I see emissions tracking?"**  
**A**: "This feature is under development for Phase 2 (Q1 2026). Click the Features tab to see what's coming."

**Q: "What does 'Limited' badge mean?"**  
**A**: "This feature works but has some limitations. Click into it to see a yellow warning banner with details."

**Q: "Is this real data or simulated?"**  
**A**: "IESO streaming data is real. Features marked 'simulated data' show sample data. Check the warning banner at the top of each dashboard."

**Q: "Why isn't real-time collaboration working?"**  
**A**: "The WebSocket server isn't deployed yet. This feature is available but without live multi-user updates. Coming soon!"

### Support Tier 2: Email/Ticket Response

**Response Templates**:

**Template 1: Feature Not Available**
```
Hi [User],

Thanks for your interest in [Feature Name]. This feature is currently under 
development and will be available in Phase 2 (estimated Q1 2026).

You can see the full feature roadmap by clicking the "Features" tab in the app.

We'd love to hear more about your use case for this feature to help us prioritize.

Best regards,
CEIP Support Team
```

**Template 2: Data Quality Question**
```
Hi [User],

The data you're seeing is [real/simulated]. Here's what's currently available:

✅ Real data: IESO Ontario demand/pricing, HuggingFace European smart meter, 
   Provincial generation mix
⚠️ Simulated: Minerals supply chain, some grid optimization forecasts

For full details on data sources, please visit the Features tab and expand any 
feature card to see limitations.

Best regards,
CEIP Support Team
```

**Template 3: Technical Issue**
```
Hi [User],

Thank you for reporting this issue. We've investigated and found:

[Diagnosis]

We're working on a fix and expect it to be resolved within [timeframe].

In the meantime, you can [workaround if available].

We'll update you when this is resolved.

Best regards,
CEIP Support Team
```

### Support Tier 3: Escalation to Development

**When to Escalate**:
- Application completely down (>5 minutes)
- Data corruption suspected
- Security concern
- Widespread issue affecting multiple users
- Feature working incorrectly despite correct configuration

**Escalation Information to Provide**:
1. User report or ticket ID
2. Steps to reproduce
3. Browser/device information
4. Screenshots/console logs
5. Timestamp of issue
6. Number of users affected
7. Troubleshooting steps already taken

---

## 🎛️ FEATURE FLAG MANAGEMENT

### Enabling a Feature

**Scenario**: Phase 2 feature is ready, need to enable it

**Steps**:
1. Open `src/lib/featureFlags.ts`
2. Find feature in `FEATURE_REGISTRY`
3. Update:
   ```typescript
   {
     ...feature,
     enabled: true,
     status: 'acceptable', // or 'production_ready'
     limitations: [] // or document any limitations
   }
   ```
4. Commit, build, deploy
5. Verify in browser console: feature count should increase

### Disabling a Feature (Emergency)

**Scenario**: Critical bug found, need to hide feature immediately

**Steps**:
1. Open `src/lib/featureFlags.ts`
2. Find feature in `FEATURE_REGISTRY`
3. Set `enabled: false`
4. Emergency deploy (bypass normal process if needed)
5. Verify feature hidden in navigation

### Updating Feature Status/Limitations

**Scenario**: Feature improved, want to update badge or limitations

**Steps**:
1. Update in `FEATURE_REGISTRY`:
   - `status`: Change from 'partial' to 'acceptable' etc.
   - `rating`: Update if improved
   - `limitations`: Update list
2. Update matching documentation in `DEPLOYMENT_SCOPE.md`
3. Deploy both code and docs together

### Adding a New Feature

**Steps**:
1. Add to `FEATURE_REGISTRY` with all required fields
2. Add to `tabToFeatureMap` if it has a tab
3. Add component warning if status is partial/acceptable
4. Update `DEPLOYMENT_SCOPE.md`
5. Update `helpIdByTab` if needed
6. Test locally, then deploy

---

## 📊 MONITORING CHECKLIST

### Daily Monitoring (Automated if possible)

**Metrics to Track**:

| Metric | Target | Alert Threshold | Check Frequency |
|--------|--------|-----------------|-----------------|
| Uptime | >99% | <98% | Real-time |
| Error Rate | <0.5% | >2% | Hourly |
| Avg Response Time | <500ms | >2s | Hourly |
| API Requests/Day | Baseline ±50% | >200% increase | Daily |
| Failed Requests | <10/day | >50/day | Daily |
| Storage Usage | <80% | >90% | Daily |
| LLM Requests | <1000/day | >2000/day | Daily |

### Weekly Review (30 minutes - Friday afternoon)

**Analyze Trends**:
- [ ] User growth week-over-week
- [ ] Most/least used features
- [ ] Common support issues
- [ ] Performance trends (improving/degrading)
- [ ] Cost trends (Supabase, LLM API)

**Actions**:
- Document insights
- Plan optimizations if needed
- Update documentation based on common questions
- Review Phase 2 priorities based on user requests

### Monthly Report

**Prepare Report Including**:
1. Uptime %
2. Total users/sessions
3. Feature usage breakdown
4. Support tickets summary
5. Performance metrics
6. Cost summary
7. Incidents (if any)
8. Phase 2 progress update

---

## 🚨 ESCALATION PROCEDURES

### Incident Severity Levels

**P0 - Critical** (Response: Immediate, 24/7)
- **Definition**: Complete service outage, data loss, security breach
- **Examples**: 
  - Application unreachable for >5 minutes
  - Database corruption
  - Security vulnerability actively exploited
- **Response**: Drop everything, all hands on deck
- **Notification**: SMS/call to on-call engineer + team lead

**P1 - High** (Response: <30 minutes, business hours)
- **Definition**: Major feature broken, significant degradation
- **Examples**:
  - IESO streaming down
  - LLM features completely non-functional
  - Authentication failures
- **Response**: Primary on-call engineer + backup if needed
- **Notification**: Slack/email to on-call

**P2 - Medium** (Response: <2 hours, business hours)
- **Definition**: Minor feature issues, intermittent errors
- **Examples**:
  - Single chart not rendering
  - Slow load times (5-10 seconds)
  - Non-critical API errors
- **Response**: Queue for next available engineer
- **Notification**: Ticket system

**P3 - Low** (Response: Next business day)
- **Definition**: Cosmetic issues, feature requests, documentation
- **Examples**:
  - Typos
  - UI alignment issues
  - Feature enhancement requests
- **Response**: Backlog, prioritize in sprint planning
- **Notification**: Ticket system

### On-Call Rotation

**Schedule** (Update with actual names):
- **Week 1**: [Engineer A]
- **Week 2**: [Engineer B]
- **Week 3**: [Engineer C]
- **Week 4**: [Engineer D]

**On-Call Responsibilities**:
- Monitor alerts
- Respond to P0/P1 within SLA
- Perform incident triage
- Coordinate escalation if needed
- Document incident in log

### Escalation Chain

```
User Report
    ↓
Tier 1 Support (Self-Service)
    ↓
Tier 2 Support (Ticket Response)
    ↓
On-Call Engineer
    ↓
Team Lead (if complex)
    ↓
Platform Owner (P0 only)
```

---

## ⚠️ KNOWN LIMITATIONS

### Phase 1 Launch Limitations

**Document these for users**:

1. **Grid Optimization** (3.6/5 - Partial)
   - Forecasting not available
   - Uses simulated grid data
   - AI recommendations need calibration

2. **Security Assessment** (3.7/5 - Partial)
   - 3 of 4 APIs missing
   - No threat intelligence feeds
   - Manual data entry required

3. **Minerals Dashboard** (3.8/5 - Partial)
   - Simulated supply chain data
   - No real-time pricing
   - Not connected to official sources

4. **Indigenous Dashboard** (4.0/5 - Acceptable)
   - Governance review pending
   - Placeholder territorial boundaries
   - TEK integration incomplete

5. **Stakeholder Coordination** (4.1/5 - Acceptable)
   - WebSocket server not deployed
   - Real-time collaboration simulated

6. **Compliance Monitoring** (4.4/5 - Acceptable)
   - Local storage only
   - No live regulator connection

**These are all documented with warnings in-app.**

### Platform-Wide Limitations

- **Browser Support**: Chrome/Edge/Firefox/Safari latest versions
- **Mobile**: Responsive but optimized for desktop
- **Offline**: Limited (cached data only, no offline editing)
- **Multi-User**: Limited collaboration features
- **Data Export**: Available but formats limited (CSV, JSON)
- **Historical Data**: Varies by source (typically 30-90 days)

---

## 📞 EMERGENCY CONTACTS

### Internal Team

| Role | Name | Phone | Email | Slack |
|------|------|-------|-------|-------|
| Platform Owner | [Name] | [Phone] | [Email] | @handle |
| Tech Lead | [Name] | [Phone] | [Email] | @handle |
| On-Call Engineer | [Rotation] | [Phone] | [Email] | @handle |
| DevOps | [Name] | [Phone] | [Email] | @handle |

### External Services

| Service | Support | Status Page | Escalation |
|---------|---------|-------------|------------|
| Supabase | https://supabase.com/support | https://status.supabase.com | Enterprise support ticket |
| Google AI (Gemini) | https://support.google.com | https://status.cloud.google.com | API Console |
| IESO | - | https://www.ieso.ca/ | N/A (public API) |

### Escalation Process

**For P0 Incidents**:
1. Notify on-call engineer immediately (SMS/call)
2. Create incident channel in Slack: `#incident-[date]`
3. Start incident log (timestamp all actions)
4. Notify team lead within 5 minutes
5. Post status updates every 15 minutes
6. After resolution: Post-mortem within 48 hours

**For P1 Incidents**:
1. Notify on-call engineer (Slack/email)
2. Create ticket in system
3. Post updates every 30 minutes
4. Escalate to lead if not resolved in 2 hours

---

## 📝 MAINTENANCE WINDOWS

### Scheduled Maintenance

**Frequency**: Monthly (first Sunday, 2-4 AM local time)

**Activities**:
- Database maintenance
- Dependency updates
- Performance optimization
- Backup verification

**Communication**:
- Announce 1 week in advance
- Post in-app banner 24 hours before
- Send email to registered users
- Update status page

### Emergency Maintenance

**Trigger**: Critical security patch or service disruption

**Process**:
1. Assess urgency (can it wait?)
2. If urgent: Post banner immediately
3. Perform maintenance
4. Verify all features working
5. Post completion notice

---

## 📚 ADDITIONAL RESOURCES

### Documentation
- [Deployment Runbook](./DEPLOYMENT_RUNBOOK.md)
- [Deployment Scope](./DEPLOYMENT_SCOPE.md)
- [Reduced Scope Launch Plan](./REDUCED_SCOPE_LAUNCH_PLAN.md)
- [Final Gap Analysis](./FINAL_PRE_DEPLOYMENT_GAP_ANALYSIS.md)

### Training Materials
- Platform overview video (to be created)
- Feature demos (to be created)
- Support team onboarding guide (to be created)

### Code Repository
- GitHub: [repository-url]
- Main branch: `main`
- Deployment branch: `production`
- Feature branches: `feature/*`

---

**Manual Version**: 1.0  
**Effective Date**: December 2, 2025  
**Review Cycle**: Quarterly  
**Owner**: Operations Team  
**Last Reviewed**: October 3, 2025
