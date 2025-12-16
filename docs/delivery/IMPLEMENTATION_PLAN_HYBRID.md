# Hybrid Monetization Implementation Plan

**Document ID:** IMPL-HYBRID-2025-12-13  
**Strategy:** Whop Wedge (Quick Cash) + AI Learning Cohorts (Primary Business)

---

## Priority Classification

| Priority | Timeline | Focus Area | Revenue Impact |
|----------|----------|------------|----------------|
| **HIGH** | Days 1-3 | Whop Wedge Launch | First revenue in 1-2 weeks |
| **MEDIUM** | Days 4-7 | Cohort Sales Infrastructure | $3,000-5,000/sale |
| **LOW** | Ongoing | Portfolio Polish | Immigration value |

---

## HIGH PRIORITY TASKS (Days 1-3)

### H1. Polish Rate Watchdog for Whop (Day 1)
**Goal:** Make `/rate-alerts` the standalone wedge product

**Tasks:**
- [ ] H1.1: Add "Powered by CEIP" branding to Rate Watchdog header
- [ ] H1.2: Create simplified landing variant without full nav
- [ ] H1.3: Add "Unlock CEIP Advanced" CTA button
- [ ] H1.4: Implement 30-second activation loop (auto-load → action → CTA)
- [ ] H1.5: Add price alert threshold slider with visual feedback

**Files to modify:**
- `src/components/RROAlertSystem.tsx`

---

### H2. Implement Whop Tier Gating (Day 1-2)
**Goal:** Gate advanced features behind Whop subscription tiers

**Tasks:**
- [ ] H2.1: Create tier-aware component wrapper
- [ ] H2.2: Add soft paywall overlays for Pro features
- [ ] H2.3: Implement feature comparison modal
- [ ] H2.4: Connect to existing Whop auth context

**Files to create:**
- `src/components/monetization/WhopTierGate.tsx`
- `src/components/monetization/UpgradePrompt.tsx`

---

### H3. Enhance Pricing Structure (Day 2)
**Goal:** Align pricing with Whop wedge strategy

**Current pricing (PricingPage.tsx):**
- Free: $0
- Edubiz: $99/mo
- Pro: $1,500/mo

**New Whop-aligned pricing:**
- Rate Watchdog (Base): $9/mo
- CEIP Advanced (Pro): $29/mo  
- CEIP Enterprise: $99/mo

**Tasks:**
- [ ] H3.1: Update PricingPage.tsx with new tier structure
- [ ] H3.2: Add Rate Watchdog standalone tier
- [ ] H3.3: Create feature comparison chart
- [ ] H3.4: Update upgrade modal with new pricing

---

### H4. Whop Listing Assets (Day 2-3)
**Goal:** Prepare all assets for Whop product submission

**Tasks:**
- [ ] H4.1: Create screenshot set (6 images per whop_skill.md)
- [ ] H4.2: Write Whop listing copy (headline, bullets, description)
- [ ] H4.3: Record 30-45 second demo video
- [ ] H4.4: Prepare reviewer notes

---

## MEDIUM PRIORITY TASKS (Days 4-7)

### M1. Complete Stripe Integration (Day 4-5)
**Goal:** Enable direct payments for non-Whop users

**Tasks:**
- [ ] M1.1: Create Stripe account and configure products
- [ ] M1.2: Build Supabase Edge Function for checkout
- [ ] M1.3: Implement webhook handler
- [ ] M1.4: Update PricingPage to use Stripe for non-Whop users

**Files:**
- `src/lib/stripeService.ts` (already created)
- `supabase/functions/stripe-checkout/index.ts` (new)
- `supabase/functions/stripe-webhook/index.ts` (new)

---

### M2. Cohort Sales Enhancements (Day 5-6)
**Goal:** Make cohort purchasing frictionless

**Tasks:**
- [ ] M2.1: Add cohort inquiry form to TrainingCoordinatorsPage
- [ ] M2.2: Create cohort pricing calculator
- [ ] M2.3: Build proposal PDF generator
- [ ] M2.4: Add testimonial/social proof section (placeholders)

---

### M3. Email Notification System (Day 6-7)
**Goal:** Enable actual price alerts for Rate Watchdog

**Tasks:**
- [ ] M3.1: Set up SendGrid/Resend account
- [ ] M3.2: Create alert subscription table in Supabase
- [ ] M3.3: Build Edge Function for sending alerts
- [ ] M3.4: Implement subscription management UI

---

## LOW PRIORITY TASKS (Ongoing)

### L1. Real AESO Data Integration
- Connect to actual AESO API for pool prices
- Scrape UCA for current RRO rates
- Build ML forecast model (or use simple heuristics)

### L2. Affiliate Tracking
- Implement retailer referral tracking
- Add conversion analytics

### L3. Portfolio Polish
- Keep MicroGenWizard functional
- Update employer page with new achievements

---

## Implementation Sequence

```
Day 1 (HIGH):
├── H1.1-H1.5: Polish Rate Watchdog UI
├── H2.1-H2.2: Basic tier gating
└── Start H3: Pricing updates

Day 2 (HIGH):
├── H2.3-H2.4: Complete tier gating
├── H3.1-H3.4: Finish pricing structure
└── H4.1: Create screenshots

Day 3 (HIGH):
├── H4.2-H4.4: Complete Whop listing assets
└── Submit to Whop for review

Day 4-5 (MEDIUM):
├── M1.1-M1.4: Stripe integration
└── M2.1-M2.2: Cohort sales enhancements

Day 6-7 (MEDIUM):
├── M2.3-M2.4: Complete cohort tools
├── M3.1-M3.4: Email notification system
└── Begin ISET program outreach

Ongoing (LOW):
├── L1: Real data integration
├── L2: Affiliate tracking
└── L3: Portfolio maintenance
```

---

## Success Metrics

| Metric | Target (30 days) | Target (90 days) |
|--------|------------------|------------------|
| Whop subscribers | 50 | 200 |
| Whop MRR | $450 | $1,800 |
| Cohort inquiries | 5 | 15 |
| Cohort sales | 1 | 3 |
| Total MRR | $3,500 | $12,000 |

---

## Risk Mitigation

| Risk | Probability | Mitigation |
|------|-------------|------------|
| Whop rejection | 20% | Follow 7-day roadmap exactly, include reviewer notes |
| No Whop traction | 40% | Pivot focus to cohorts, use Whop as demo |
| Cohort sales slow | 50% | Start outreach Day 1, don't wait for Stripe |
| Technical issues | 20% | Test thoroughly before Whop submission |

---

## Files to Create/Modify Summary

### New Files:
1. `src/components/monetization/WhopTierGate.tsx`
2. `src/components/monetization/UpgradePrompt.tsx`
3. `src/components/monetization/FeatureComparison.tsx`
4. `supabase/functions/stripe-checkout/index.ts`
5. `supabase/functions/stripe-webhook/index.ts`

### Files to Modify:
1. `src/components/RROAlertSystem.tsx` - Add CEIP branding, upgrade CTA
2. `src/components/PricingPage.tsx` - New tier structure
3. `src/components/auth/UpgradeModal.tsx` - New pricing
4. `src/App.tsx` - Add tier-gated routes

---

## Implementation Status (Updated 2025-12-13)

### ✅ HIGH PRIORITY - COMPLETED

| Task | Status | Files |
|------|--------|-------|
| H1: Polish Rate Watchdog | ✅ Done | `RROAlertSystem.tsx` - Added CEIP branding, upgrade CTA, upsell banner |
| H2: WhopTierGate component | ✅ Done | `monetization/WhopTierGate.tsx` - Tier gating with overlay/banner/inline variants |
| H3: Update PricingPage | ✅ Done | `PricingPage.tsx` - New $9/$29/$99 tier structure |

### 🔄 MEDIUM PRIORITY - PENDING

| Task | Status | Notes |
|------|--------|-------|
| M1: Stripe Edge Functions | ⏳ Pending | Service created (`stripeService.ts`), Edge Functions needed |
| M2: Cohort Sales Enhancements | ⏳ Pending | TrainingCoordinatorsPage already created |
| M3: Email Notification System | ⏳ Pending | Foundation needed for Rate Watchdog alerts |

### 📋 LOW PRIORITY - DEFERRED

| Task | Status | Notes |
|------|--------|-------|
| L1: Real AESO Data | ⏳ Deferred | Currently using simulated data |
| L2: Affiliate Tracking | ⏳ Deferred | Retailer referral tracking |
| L3: Portfolio Polish | ⏳ Deferred | MicroGenWizard PDF generation complete |

---

## Files Created/Modified

### New Files:
1. `src/components/monetization/WhopTierGate.tsx` - Tier-aware feature gating
2. `src/components/TrainingCoordinatorsPage.tsx` - Cohort sales landing page
3. `src/lib/stripeService.ts` - Stripe payment service
4. `src/lib/pdfGenerator.ts` - AUC Form A PDF generation
5. `docs/delivery/STRATEGY_COMPARISON_FINAL.md` - Strategy analysis
6. `docs/delivery/MONETIZATION_GAP_ANALYSIS.md` - Gap analysis
7. `docs/delivery/IMPLEMENTATION_PLAN_HYBRID.md` - This document

### Modified Files:
1. `src/components/RROAlertSystem.tsx` - CEIP branding, upsell banner
2. `src/components/PricingPage.tsx` - New tier structure ($9/$29/$99)
3. `src/components/MicroGenWizard.tsx` - PDF generation buttons
4. `src/components/monetization/index.ts` - Added WhopTierGate exports
5. `src/App.tsx` - New routes for training coordinators

---

## Next Steps (User Action Required)

1. **Configure Whop Products** - Set up Rate Watchdog ($9), CEIP Advanced ($29), Enterprise ($99)
2. **Submit to Whop** - Use listing copy from `whop_skill.md`
3. **Create Demo Video** - 30-45 second walkthrough of Rate Watchdog
4. **Begin ISET Outreach** - Use TrainingCoordinatorsPage as landing page

---

*Implementation complete for HIGH priority items. Last updated: 2025-12-13*
