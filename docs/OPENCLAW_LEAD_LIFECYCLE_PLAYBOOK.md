# OpenClaw Lead Lifecycle & Nurture Playbook

**Document Version:** 1.0  
**Created:** 2026-02-28  
**Part of:** PBI-OpenClaw-Monetization-Orchestration-T1

## Overview

This playbook defines the lead lifecycle states, transition rules, and nurture cadence for the OpenClaw outreach and monetization orchestration. It ensures deterministic lead state management and systematic nurture workflows.

---

## Lead Lifecycle States

### 1. Anonymous
**Definition:** Visitor with no identifying information  
**Entry Criteria:** First page load, no attribution data  
**Exit Criteria:** Any tracked interaction (pricing view, CTA click)

**Nurture Actions:** None  
**Retention:** 30 days in analytics storage

---

### 2. Visitor
**Definition:** User who viewed pricing or engaged with content  
**Entry Criteria:** 
- Pricing page view
- Dashboard exploration (>3 pages)
- Feature documentation view

**Exit Criteria:** 
- Email captured
- CTA click on pricing tier
- Inquiry form submission

**Nurture Actions:**
- Retargeting pixel (if configured)
- Session recording for UX optimization

**Retention:** 90 days

---

### 3. Engaged
**Definition:** User who clicked CTA or showed purchase intent  
**Entry Criteria:**
- Pricing CTA click
- Municipal/Indigenous/Industrial inquiry
- Upgrade prompt click
- Email capture modal opened

**Exit Criteria:**
- Email captured
- Checkout initiated
- 14 days of inactivity

**Nurture Actions:**
- Day 0: No action (user is actively exploring)
- Day 3: Retargeting ad (if budget allows)
- Day 7: LinkedIn connection request (if OpenClaw match found)
- Day 14: Transition to "Visitor" or archive

**Retention:** 90 days

---

### 4. Captured
**Definition:** Email address collected, checkout not initiated  
**Entry Criteria:**
- Email submitted via EmailCaptureModal
- Email submitted via inquiry form
- Email extracted from Whop OAuth

**Exit Criteria:**
- Checkout initiated
- 30 days of inactivity

**Nurture Actions:**
- Day 0: Welcome email (if email service configured)
- Day 1: Feature highlight email (top use case for persona)
- Day 3: Social proof email (case study or testimonial)
- Day 7: Limited-time offer or discount (if approved)
- Day 14: "Still interested?" re-engagement email
- Day 30: Final reminder, then archive

**Retention:** 1 year (owned marketing list)

---

### 5. Checkout Initiated
**Definition:** User started checkout but did not complete  
**Entry Criteria:**
- Checkout session created
- Redirect to Paddle/Stripe/Whop

**Exit Criteria:**
- Checkout completed (converted)
- Checkout abandoned (>24 hours)

**Nurture Actions:**
- Hour 1: No action (user may still be completing)
- Hour 24: Abandoned cart email #1 (reminder)
- Day 3: Abandoned cart email #2 (offer help, FAQ)
- Day 7: Abandoned cart email #3 (limited-time discount)

**Retention:** 1 year

---

### 6. Checkout Abandoned
**Definition:** User initiated checkout but did not complete within 7 days  
**Entry Criteria:**
- Checkout session expired
- No payment received within 7 days

**Exit Criteria:**
- Checkout re-initiated
- Converted via different channel
- 90 days of inactivity

**Nurture Actions:**
- Day 7: "We noticed you didn't complete checkout" email
- Day 14: Personalized outreach (if high-value tier)
- Day 30: Survey email ("What stopped you?")
- Day 60: Re-engagement campaign (new feature announcement)
- Day 90: Archive or move to long-term nurture

**Retention:** 1 year

---

### 7. Converted
**Definition:** Active paying customer  
**Entry Criteria:**
- Checkout completed
- Payment received
- Entitlement activated

**Exit Criteria:**
- Subscription cancelled
- Payment failed (move to "Churned")

**Nurture Actions:**
- Day 0: Onboarding email sequence (3-part)
- Day 7: Check-in email ("How's it going?")
- Day 30: Feature adoption email (unused features)
- Day 60: Upsell email (if on Basic, promote Pro)
- Quarterly: Product update newsletter
- Annual: Renewal reminder (if annual plan)

**Retention:** Lifetime (active customer record)

---

### 8. Churned
**Definition:** Former customer who cancelled or failed payment  
**Entry Criteria:**
- Subscription cancelled
- Payment failed (3 attempts)
- Downgrade to free tier

**Exit Criteria:**
- Re-subscribed
- 180 days of inactivity (archive)

**Nurture Actions:**
- Day 0: Exit survey email ("Why did you leave?")
- Day 7: Win-back email #1 (new features since they left)
- Day 30: Win-back email #2 (limited-time discount)
- Day 90: Win-back email #3 (case study or success story)
- Day 180: Archive or move to long-term nurture

**Retention:** 2 years (win-back opportunity)

---

## State Transition Rules

### Deterministic Transitions
```
Anonymous → Visitor: pricing_page_view
Visitor → Engaged: pricing_cta_click
Engaged → Captured: email_captured
Captured → Checkout Initiated: checkout_start
Checkout Initiated → Converted: checkout_complete
Checkout Initiated → Checkout Abandoned: 24 hours elapsed
Checkout Abandoned → Engaged: checkout_re_initiated
Converted → Churned: subscription_cancelled
Churned → Converted: subscription_reactivated
```

### Time-Based Transitions
```
Engaged → Visitor: 14 days inactivity
Captured → Visitor: 30 days inactivity
Checkout Abandoned → Visitor: 90 days inactivity
Churned → Archive: 180 days inactivity
```

---

## Persona-Specific Nurture Variants

### Municipal Persona
- **Emphasis:** NWPTA compliance, procurement process, budget cycles
- **Cadence:** Slower (municipal decision cycles are 3-6 months)
- **Content:** Case studies from other municipalities, grant opportunities
- **CTA:** Book consultation, request demo for council presentation

### Indigenous Persona
- **Emphasis:** OCAP compliance, data sovereignty, community co-design
- **Cadence:** Relationship-first (no hard sell)
- **Content:** Indigenous energy success stories, partnership opportunities
- **CTA:** Community consultation, co-design workshop invitation

### Industrial Persona
- **Emphasis:** TIER compliance, ROI, cost savings, audit readiness
- **Cadence:** Fast (quarterly compliance deadlines)
- **Content:** TIER calculator demos, compliance checklists, audit prep guides
- **CTA:** Free TIER audit, compliance consultation

### Standard Persona (Consultant/SME)
- **Emphasis:** Feature depth, API access, white-label capabilities
- **Cadence:** Standard (monthly billing cycle)
- **Content:** Feature tutorials, API documentation, integration guides
- **CTA:** Start free trial, book demo, upgrade to Pro

---

## OpenClaw Integration

### Lead Source Tagging
All leads captured via OpenClaw outreach are tagged with:
```json
{
  "source": "openclaw",
  "campaign_id": "municipal_q1_2026",
  "linkedin_profile": "https://linkedin.com/in/...",
  "connection_date": "2026-02-28",
  "message_sent": true
}
```

### Nurture Coordination
- **OpenClaw Message:** Day 0 (initial connection request)
- **Email Nurture:** Day 3 (if email captured)
- **OpenClaw Follow-up:** Day 7 (if connection accepted, no response)
- **Email Nurture:** Day 14 (if email captured, no checkout)
- **OpenClaw Final Touch:** Day 30 (if high-value lead, manual outreach)

### Compliance Rules
- **Daily Limit:** 20 connection requests per day (OpenClaw)
- **Weekly Limit:** 3 follow-up messages per week (OpenClaw)
- **Email Limit:** No more than 1 email per 3 days (nurture)
- **Unsubscribe:** Honor immediately, remove from all sequences

---

## Analytics & Reporting

### Key Metrics
- **Conversion Rate by State:** % of leads moving to next state
- **Time in State:** Average days spent in each lifecycle state
- **Nurture Effectiveness:** Email open/click rates by sequence
- **Channel Attribution:** OpenClaw vs organic vs paid
- **Churn Rate:** % of Converted → Churned per month
- **Win-back Rate:** % of Churned → Converted within 180 days

### Dashboard Views
1. **Funnel Overview:** Lead counts by state, conversion rates
2. **Cohort Analysis:** Lifecycle progression by acquisition month
3. **Nurture Performance:** Email sequence metrics by persona
4. **OpenClaw ROI:** Leads generated, conversion rate, CAC

---

## Implementation Checklist

### Database Schema
- [x] `public.lead_intent` table created
- [x] `public.lead_lifecycle` table created
- [x] `public.lead_nurture_log` table created
- [x] Indexes and RLS policies configured

### API Endpoints
- [x] `/api/leads/intent` - Track intent events
- [x] `/api/leads/lifecycle` - Update lifecycle state
- [x] `/api/leads/capture` - Legacy email capture

### Analytics Integration
- [x] `trackEvent()` function in `src/lib/analytics.ts`
- [x] Pricing page instrumentation
- [x] Email capture modal instrumentation
- [x] Checkout flow instrumentation

### Nurture Automation (Future)
- [ ] Email service integration (SendGrid/Mailgun)
- [ ] Automated email sequences by state
- [ ] OpenClaw message templates
- [ ] Slack notifications for high-value leads

---

## Operational Procedures

### Daily Tasks
1. Review new leads in "Captured" state
2. Monitor abandoned checkouts (>24 hours)
3. Check OpenClaw connection acceptance rate
4. Review email bounce/unsubscribe reports

### Weekly Tasks
1. Analyze conversion rates by persona
2. Review nurture email performance
3. Update OpenClaw message templates based on response rates
4. Identify high-value leads for manual outreach

### Monthly Tasks
1. Generate lifecycle cohort report
2. Calculate customer acquisition cost (CAC) by channel
3. Review churn rate and win-back effectiveness
4. Update nurture sequences based on A/B test results

---

## References

- **Lead Lifecycle Schema:** `supabase/migrations/20260228001_lead_lifecycle.sql`
- **Lead API:** `netlify/functions/leads.ts`
- **Analytics Utilities:** `src/lib/analytics.ts`
- **OpenClaw Strategy:** `docs/OPENCLAW_CONSOLE_KICKSTART_STRATEGY.md`
- **Monetization Deliverable:** `docs/OPENCLAW_MONETIZATION_IMPLEMENTATION_DELIVERABLE.md`
