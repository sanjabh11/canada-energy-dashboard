# Canada Energy Academy - Section-wise QA Checklist

## Overall Status Summary

| Metric | Implemented | Originally Planned | Status |
|--------|-------------|-------------------|--------|
| Total Courses | 6 | 5 | ✅ Exceeds |
| Total Lessons | 23 | 17 | ✅ Exceeds |
| Quiz Questions | 18 | 29 | ⚠️ Gap (11 fewer) |
| Exam Questions | 3 | 20 | ⚠️ Gap (17 fewer) |

---

# SECTION 1: RATE BASICS

## Content Verification

| Item | Expected | Implemented | Status | Notes |
|------|----------|-------------|--------|-------|
| Lesson: Understanding Electricity Pricing | ✅ | ✅ | PASS | |
| Lesson: What is RoLR? | ✅ | ✅ | PASS | |
| Lesson: RoLR vs Competitive Rates | ✅ | ✅ | PASS | |
| Lesson: Understanding Your Bill | ✅ | ✅ | PASS | |
| Lesson: Time-of-Use Pricing | ✅ | ✅ | PASS | |
| Quiz: 3 questions | ✅ | ✅ | PASS | |

## Content Accuracy Check

| Question Topic | Expected Content | Current Content | Match? |
|----------------|------------------|-----------------|--------|
| RoLR Rate | ~12¢/kWh | Energy/demand charge | ⚠️ DIFFERENT |
| Fixed Period | 2 years | Tiered rates | ⚠️ DIFFERENT |
| Grid Operator | AESO | Demand charge | ⚠️ DIFFERENT |

### ⚠️ Recommendation for Rate Basics Quiz
Current questions are **generic** but should include **Alberta-specific** content:
- [ ] Q1: Should ask about RoLR rate (~12¢/kWh)
- [ ] Q2: Should ask about AESO
- [ ] Q3: Should ask about 2-year fixed period

---

# SECTION 2: RESIDENTIAL ENERGY OPTIMIZATION

## Content Verification

| Item | Expected | Implemented | Status |
|------|----------|-------------|--------|
| Lesson: How Alberta's Grid Works | ✅ | ? | VERIFY |
| Lesson: January 2024 Crisis | ✅ | ? | VERIFY |
| Lesson: April 2024 Blackout | ✅ | ? | VERIFY |
| Lesson: Demand Response | ✅ | ? | VERIFY |
| Quiz: 3 questions | ✅ | ✅ | PASS |

## Critical Alberta-Specific Content Check

| Content | Should Include | Status |
|---------|----------------|--------|
| January 2024 Crisis | 12,384 MW peak demand | VERIFY |
| April 2024 Blackout | 244 MW, first since 2013 | VERIFY |
| Eastervale Solar Rejection | 300MW rejected Feb 2025 | VERIFY |
| 16GW Data Center Demand | Future grid challenge | VERIFY |

### ⚠️ Recommendation for Residential/Grid Quiz
Current questions about heating/windows are generic - should include:
- [ ] Q about pool price cap ($999/MWh)
- [ ] Q about January 2024 demand response (~200MW)
- [ ] Q about Alberta's deregulated market

---

# SECTION 3: COMMERCIAL ENERGY AUDITS

## Content Verification

| Item | Expected | Implemented | Status |
|------|----------|-------------|--------|
| Lesson: Building Energy Audits | ✅ | ✅ | PASS |
| Lesson: Commercial Rate Optimization | ✅ | ✅ | PASS |
| Lesson: Energy Efficiency Tech | ✅ | ✅ | PASS |
| Quiz: 3 questions | ✅ | ✅ | PASS |

### ✅ Section 3 Status: ACCEPTABLE
Generic energy audit content is appropriate for this module.

---

# SECTION 4: TIER COMPLIANCE

## Content Verification

| Item | Expected | Implemented | Status |
|------|----------|-------------|--------|
| Lesson: What is TIER? | ✅ | ? | VERIFY |
| Lesson: Benchmark Calculations | ✅ | ? | VERIFY |
| Lesson: $70 Carbon Arbitrage | ✅ | ? | VERIFY |
| Lesson: DIC Formula & Credit Reactivation | ✅ | ? | VERIFY |
| Lesson: Compliance Reporting | ✅ | ? | VERIFY |
| Lesson: Energy Trader Simulation | ✅ | ✅ | PASS |
| Quiz: 3 questions | ✅ | ✅ | PASS |

## Critical TIER Content Check

| Content | Should Include | Status |
|---------|----------------|--------|
| TIER Fund Price | $95/tonne (frozen 2025) | VERIFY |
| Secondary Market | ~$25/tonne (crashed) | VERIFY |
| DIC Formula | IC = EI ÷ $95 | VERIFY |
| Compliance Limits | 70%→80%→90% progression | VERIFY |
| Credit Reactivation | "Zombie Credits" | VERIFY |
| 24M Tonnes Oversupply | Market context | VERIFY |

### ⚠️ CRITICAL: TIER Quiz Questions
Developer report shows quiz asks about:
- "TIER certification meaning"
- "TIER performance measurement"

**This appears to be GENERIC certification content, NOT Alberta's TIER regulation!**

Expected questions should be:
- [ ] Q about Direct Investment Credits
- [ ] Q about secondary market price (~$25/tonne)
- [ ] Q about IC formula (IC = EI ÷ $95)

---

# SECTION 5: GRID OPERATIONS

## Content Verification

| Item | Expected | Implemented | Status |
|------|----------|-------------|--------|
| Lesson 1: Grid fundamentals | ✅ | ✅ | PASS |
| Lesson 2: Operations detail | ✅ | ✅ | PASS |
| Quiz: 3 questions | ✅ | ✅ | PASS |

### ✅ Section 5 Status: ACCEPTABLE
Generic grid operations content is appropriate.

---

# SECTION 6: CERTIFICATE EXAM

## Content Verification

| Item | Expected | Implemented | Status |
|------|----------|-------------|--------|
| Exam Overview Lesson | ✅ | ✅ | PASS |
| Exam: 20 questions | ✅ | ❌ (3 only) | **FAIL** |
| 70% Pass Threshold | ✅ | 75% | ACCEPTABLE |

### ⚠️ CRITICAL GAP: Certificate Exam
- **Expected:** 20 comprehensive exam questions
- **Implemented:** Only 3 questions
- **Impact:** Certificate exam does NOT adequately test knowledge

### Required Additional Exam Questions (17 more needed):

**Rate Basics (add 2 more):**
- [ ] RoLR rate (~12¢/kWh)
- [ ] AESO operates Alberta grid

**Grid Operations (add 4 more):**
- [ ] Pool price cap ($999/MWh)
- [ ] January 2024 demand response (200 MW)
- [ ] Alberta's deregulated market unique
- [ ] Nuclear in Ontario

**TIER Compliance (add 6 more):**
- [ ] DIC new compliance option
- [ ] Small emitter threshold (10,000 tonnes)
- [ ] Secondary market price (~$25/tonne)
- [ ] TIER report deadline (March 31)
- [ ] Non-compliance penalty ($50/tonne + make-up)
- [ ] IC formula (IC = EI ÷ $95)

**Trading Scenarios (add 5 more):**
- [ ] Cold snap strategy (buy forward)
- [ ] Negative price response (increase production)
- [ ] Grid Alert action (curtail load)
- [ ] Buffer zone percentage (35-40%)
- [ ] DIC effective cost (~$30 vs $95)

---

# PRIORITY ACTION ITEMS

## 🔴 HIGH PRIORITY (Content Gaps)

| # | Issue | Course | Action Required |
|---|-------|--------|-----------------|
| 1 | Certificate Exam only has 3 questions | Course 6 | Add 17 more exam questions |
| 2 | TIER quiz may be generic certification, not Alberta TIER | Course 4 | Verify lesson content matches Alberta TIER regulation |
| 3 | Rate Basics quiz missing Alberta-specific questions | Course 1 | Verify/update to include RoLR, AESO |

## 🟡 MEDIUM PRIORITY (Content Accuracy)

| # | Issue | Course | Action Required |
|---|-------|--------|-----------------|
| 4 | Grid quiz missing January 2024 crisis questions | Course 2 | Add crisis case study questions |
| 5 | Verify Jan 2024 / Apr 2024 case studies included | Course 2 | Check lesson content |
| 6 | Verify $70 arbitrage content included | Course 4 | Check lesson content |

## 🟢 LOW PRIORITY (Enhancements)

| # | Issue | Course | Action Required |
|---|-------|--------|-----------------|
| 7 | Add Rate Watchdog link | Course 1 | Include https://canada-energy.netlify.app/whop-mini/watchdog |
| 8 | Verify Trading Simulation link works | Course 4 | Test https://canada-energy.netlify.app/whop-mini/trader |

---

# SECTION-WISE QA VALIDATION FORM

## Course 1: Rate Basics
- [ ] Lesson 1.1 mentions Canada electricity pricing systems
- [ ] Lesson 1.2 mentions RoLR at ~12¢/kWh
- [ ] Lesson 1.2 mentions AUC Decision 29204-D01-2024
- [ ] Lesson 1.3 mentions $540/year savings potential
- [ ] Lesson 1.3 includes Rate Watchdog link
- [ ] Quiz Q1 tests RoLR rate knowledge
- [ ] Quiz Q2 tests fixed period (2 years)
- [ ] Quiz Q3 tests AESO as grid operator

## Course 2: Residential Energy / Grid Operations
- [ ] Lessons mention Alberta's deregulated market
- [ ] Lessons include January 2024 crisis (12,384 MW)
- [ ] Lessons include April 2024 blackout (244 MW)
- [ ] Lessons mention "200 MW Miracle" demand response
- [ ] Lessons mention Eastervale Solar rejection
- [ ] Quiz tests pool price cap ($999/MWh)

## Course 3: Commercial Energy Audits
- [ ] Lessons cover audit levels (I, II, III)
- [ ] Lessons mention demand charges
- [ ] Lessons cover energy efficiency measures
- [ ] Quiz tests audit terminology

## Course 4: TIER Compliance
- [ ] Lessons explain Alberta TIER regulation (NOT generic certification)
- [ ] Lessons mention $95/tonne TIER Fund Price
- [ ] Lessons mention ~$25/tonne secondary market crash
- [ ] Lessons explain DIC formula: IC = EI ÷ $95
- [ ] Lessons explain Credit Reactivation "Zombie Credits"
- [ ] Lessons mention 70%→80%→90% compliance limits
- [ ] Trading Simulation link works
- [ ] Quiz tests DIC, secondary market price, IC formula

## Course 5: Grid Operations
- [ ] Lessons explain grid fundamentals
- [ ] Lessons explain load balancing
- [ ] Quiz tests grid operations knowledge

## Course 6: Certificate Exam
- [ ] Contains minimum 20 exam questions
- [ ] Pass threshold set (70-75%)
- [ ] Covers all 4 topic areas
- [ ] Rate Basics questions included (4)
- [ ] Grid Operations questions included (5)
- [ ] TIER Compliance questions included (6)
- [ ] Trading Scenarios questions included (5)

---

# FINAL RECOMMENDATION

## Before Launch Approval:

1. **MUST FIX:** Add 17 more Certificate Exam questions
2. **MUST VERIFY:** TIER Compliance lessons contain Alberta-specific TIER content (not generic certification)
3. **SHOULD FIX:** Update module quizzes with Alberta-specific questions

## Acceptable to Launch If:
- Certificate Exam has 20+ questions
- TIER content is Alberta-specific
- All links work (Rate Watchdog, Trading Simulator)

---

*QA Checklist Version: 1.0*
*Generated: December 29, 2025*
