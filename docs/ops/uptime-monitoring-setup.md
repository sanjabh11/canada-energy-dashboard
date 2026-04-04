# Uptime Monitoring Setup Guide

**Last Updated:** March 27, 2026  
**Service:** UptimeRobot (Free Tier)  
**Status:** Phase 0 Foundation Requirement per ADVERSARIAL_TOOLS_ANALYSIS.md

---

## Overview

This document provides setup instructions for monitoring CEIP platform uptime using UptimeRobot's free tier. This satisfies Phase 0.6 requirement: *"Add basic uptime monitoring (UptimeRobot free tier for 5 endpoints) + OpsHealthPanel improvements"*.

Repo-verifiable monitor manifest:
- `src/lib/opsMonitoring.ts`
- `docs/ops/uptime-monitor-manifest.md`

---

## Monitored Endpoints (5 Critical URLs)

| Priority | Endpoint | URL | Expected Response | Check Interval |
|----------|----------|-----|-------------------|----------------|
| P1 | Homepage | `https://ceip.io/` | 200 OK | 5 minutes |
| P1 | Lead Capture API | `https://ceip.io/api/leads/intake` | 200/201 OK | 5 minutes |
| P2 | Health Endpoint | `https://ceip.io/ops-health` | 200 OK (JSON) | 5 minutes |
| P2 | TIER Calculator | `https://ceip.io/roi-calculator` | 200 OK | 5 minutes |
| P2 | Municipal Page | `https://ceip.io/municipal` | 200 OK | 5 minutes |

---

## UptimeRobot Setup Instructions

### Step 1: Create Account

1. Visit https://uptimerobot.com/
2. Click "Sign Up Free"
3. Use team email: `ops@ceip.io` (or current admin email)
4. Verify email address

### Step 2: Add Monitors

For each endpoint above, create a new monitor:

**Monitor Type:** HTTP(s)  
**Friendly Name:** [Use endpoint name from table]  
**URL:** [Use URL from table]  
**Monitoring Interval:** 5 minutes (300 seconds)  
**Monitor Timeout:** 30 seconds

### Step 3: Configure Alert Contacts

**Primary:** Email to `ops@ceip.io`  
**Secondary (optional):** Slack webhook to `#alerts` channel

**Alert Conditions:**
- When monitor goes DOWN
- When monitor comes back UP
- Minimum 2 consecutive failures before alerting (prevents false alarms)

### Step 4: Status Page (Public)

UptimeRobot free tier includes a public status page:

1. Go to **Status Pages** → **Create Status Page**
2. Select all 5 monitors
3. Custom domain: `status.ceip.io` (optional, requires DNS CNAME)
4. Or use default: `https://stats.uptimerobot.com/[your-id]`
5. Link from main CEIP footer: "System Status"

---

## Response Time Thresholds

| Endpoint | Warning Threshold | Critical Threshold |
|----------|-------------------|-------------------|
| Homepage | > 500ms | > 2000ms |
| Lead Capture API | > 1000ms | > 5000ms |
| Health Endpoint | > 1000ms | > 3000ms |
| TIER Calculator | > 1000ms | > 3000ms |
| Municipal Page | > 1000ms | > 3000ms |

---

## Expected HTTP Status Codes

### Success (Healthy)
- `200 OK` - Standard success
- `201 Created` - For lead capture POST (if applicable)

### Warning (Degraded)
- `429 Too Many Requests` - Rate limiting active
- `503 Service Unavailable` - Temporary overload

### Error (Down)
- `404 Not Found` - Endpoint missing
- `500 Internal Server Error` - Server crash
- `502 Bad Gateway` - Netlify/Supabase issue
- `503 Service Unavailable` > 5 minutes
- Timeout (> 30 seconds)
- Connection refused
- DNS resolution failure

---

## Maintenance Windows

**Scheduled Maintenance Procedure:**

1. **Before maintenance:**
   - Log into UptimeRobot
   - Select affected monitors
   - Click "Pause" for duration of maintenance
   - Or: Add maintenance window in advance

2. **During maintenance:**
   - Update `/status` page with maintenance notice
   - Post to Slack `#general` channel

3. **After maintenance:**
   - Resume monitors
   - Verify all endpoints return 200 OK
   - Update `/status` page to "Operational"

---

## Incident Response Playbook

### Alert Received: Monitor DOWN

1. **Immediate (0-5 minutes):**
   - Check `/status` page manually
   - Verify if issue is widespread or isolated
   - Check Netlify status: https://www.netlifystatus.com/
   - Check Supabase status: https://status.supabase.com/

2. **Short-term (5-30 minutes):**
   - If widespread: Post incident notice on `/status` page
   - If isolated: Investigate specific endpoint logs
   - Contact relevant service provider if infrastructure issue

3. **Communication:**
   - Post in Slack `#incidents` channel
   - Update `/status` page with incident details
   - For outages > 1 hour: Email affected enterprise clients

4. **Resolution:**
   - Verify monitor returns to UP status
   - Confirm response times normal
   - Document root cause in incident log
   - Post retrospective if > 30 minutes downtime

---

## Integration with OpsHealthPanel

The internal `/status` page provides real-time visibility into:
- OpsHealthPanel (30s refresh from Supabase Edge Function)
- Data freshness by category
- Endpoint status (from UptimeRobot API or internal checks)

**Note:** UptimeRobot external monitoring complements but does not replace the internal OpsHealthPanel. Both should be checked during incidents.

---

## Free Tier Limits

**UptimeRobot Free Tier:**
- 50 monitors (we use 5)
- 5-minute check intervals
- Email alerts (unlimited)
- SMS alerts: Not included (use webhook to Slack for mobile alerts)
- Status page: 1 public page
- Data retention: 30 days

**Upgrade Triggers:**
- Need 1-minute intervals
- Need SMS alerts
- Need more than 50 monitors
- Need private status pages

---

## Alternative: Supabase Native Monitoring

If UptimeRobot is unavailable, Supabase provides basic monitoring:

1. **Database health:** Supabase Dashboard → Database → Health
2. **Edge Functions:** Supabase Dashboard → Edge Functions → Logs
3. **API status:** https://status.supabase.com/

**Note:** Supabase monitoring does not cover Netlify frontend or custom API endpoints. UptimeRobot recommended for comprehensive coverage.

---

## Monthly Review Checklist

- [ ] Review uptime percentages (target: >99.9%)
- [ ] Review response time trends
- [ ] Check for false positive alerts
- [ ] Verify alert contacts up to date
- [ ] Review incident log for patterns
- [ ] Update this document if endpoints change

---

## References

- UptimeRobot: https://uptimerobot.com/
- Netlify Status: https://www.netlifystatus.com/
- Supabase Status: https://status.supabase.com/
- CEIP Status Page: `/status`
- ADVERSARIAL_TOOLS_ANALYSIS.md Phase 0.6
