# CEIP Adversarial USP Analysis — Honest Assessment of Claims vs Reality

**Date:** February 10, 2026  
**Method:** Full codebase audit + competitive web research + logic stress-testing  
**Purpose:** Strip away wishful thinking. Identify what's genuinely unique, what's oversold, and what needs fixing before any outreach.

---

## PART 1: ADVERSARIAL CHALLENGE — EVERY MAJOR CLAIM TESTED

### CLAIM 1: "ZERO direct competitors for Indigenous energy data"

**What we say:** "Canada's only OCAP-compliant energy data platform. Zero competitors."

**Adversarial challenge:**

| Evidence For | Evidence Against |
|-------------|-----------------|
| No other SaaS product found combining OCAP + energy analytics | Our OCAP implementation is a **UI mockup** — `SovereignDataVault.tsx` header says: *"NOTE: This is the UI/management layer. Full implementation requires Docker containerization, Key management integration (AWS KMS/HashiCorp Vault), Data replication controls"* |
| FNIGC OCAP training exists but no commercial platform applies it to energy | The "nation-held encryption keys" are **fake** — `pk_sovereign_a8f3...9d2e` is a hardcoded display string with no actual cryptographic backend |
| ICE Network has 1,500+ members but no data platform | The consent audit log uses **localStorage** — explicitly says "For production: Replace localStorage with Supabase table" |
| $14B in Indigenous loan guarantees is real | Funder Reporting Dashboard **falls back to hardcoded demo data** when Edge Functions are unavailable |

**Assumption it relies on:** That prospects won't actually test the OCAP vault or funder reporting with real data before committing.

**Counterexample that breaks it:** An Indigenous energy coordinator signs up, tries to enter real project data, and discovers: (1) encryption keys are decorative, (2) data lives in Supabase cloud with no nation-controlled option, (3) the "auto-generated" Wah-ila-toos report is a static template, not populated from their data.

**Verdict:** 🟡 **DIRECTIONALLY UNIQUE but materially oversold.** The concept is genuinely novel — no competitor is even attempting this. But the implementation gap between marketing claims and reality is dangerous. One burned Indigenous community could destroy credibility permanently in a small, interconnected network.

**Risk Level:** 🔴 **CRITICAL** — Highest reputational risk segment. These communities have been historically misled by technology promises.

---

### CLAIM 2: "Live EPC/Offset pricing and $70/tonne arbitrage tracking"

**What we say:** "Tracks live TIER credit pricing" / "Live EPC/Offset Pricing" (trust badge on ROI Calculator)

**Adversarial challenge:**

| Evidence For | Evidence Against |
|-------------|-----------------|
| The $95 TIER fund price is real and publicly documented at Alberta.ca | `FUND_PRICE = 95` and `MARKET_PRICE = 25` are **hardcoded constants** in `TIERROICalculator.tsx` — not fetched from any API |
| The ~$25 market credit price range is accurate per S&P Global/ICAP data | The trust badge says "Live EPC/Offset Pricing" — this is **false**. Prices are static. |
| The $70/tonne spread is real math | The "Direct Investment" pathway standard hasn't been released yet (Alberta.ca confirms "early 2026") — `DI_CREDIT_RATE = 0.80` is labeled "estimated" |
| cCarbon has a TIER scenario simulator, but it models macro supply/demand, not facility-level compliance | Lead capture stores emails to **localStorage** — if user clears browser, leads are lost |

**Assumption it relies on:** That industrial compliance managers won't ask "where does this $25/t number come from? Is it updated in real-time?"

**Counterexample:** A Pembina Pipeline environmental manager asks for the data source of the market credit price. We can't point to a live feed — it's a hardcoded constant from "Q4 2025."

**Verdict:** 🟡 **CALCULATOR LOGIC IS SOUND, but "live" claim is false.** The 3-pathway comparison (fund vs market vs DI) is genuinely useful and differentiated from cCarbon's macro models. But labeling static prices as "live" is misleading.

**Risk Level:** 🟡 **MEDIUM** — Industrial buyers are sophisticated. They'll check.

---

### CLAIM 3: "25+ production-ready dashboards with 95% real data"

**What we say:** "Production-grade dashboard suite" / "High data quality (95%+ real data)"

**Adversarial challenge:**

| Evidence For | Evidence Against |
|-------------|-----------------|
| 25+ dashboard components exist and compile | **236 matches** for SAMPLE_/DEMO_/mock/hardcoded/placeholder/dummy across **44 component files** |
| AESO pool price API integration exists (`aesoService.ts`) | AESO API calls fall back to `getLatestCachedPoolPrice()` — which returns simulated data based on time-of-day patterns |
| The architecture is production-grade (lazy loading, error boundaries, security) | RRO rate function says: *"For now, use realistic current RRO data (December 2024)"* — hardcoded, not live |
| Edge Functions exist for data delivery | `getRetailerOffers()` returns hardcoded retailer rates — "Real retailer data (December 2024)" — over a year stale |
| Many dashboards do fetch from Edge Functions when enabled | When Edge Functions fail, nearly every dashboard falls back to sample data silently |

**Assumption it relies on:** That "95% real data" means the data sources are real (AESO, IESO, ECCC), not that 95% of what's displayed at any given time is live.

**Counterexample:** A consulting analyst subscribes, opens 5 dashboards, and sees the same sample data on 3 of them because Edge Functions timed out. They conclude the platform is a prototype.

**Verdict:** 🟡 **ARCHITECTURE is production-grade. DATA FRESHNESS is not.** The distinction between "based on real sources" and "displaying live data" is critical. The 95% claim should refer to data source provenance, not real-time freshness.

**Risk Level:** 🟡 **MEDIUM** — Fixable, but needs honest labeling.

---

### CLAIM 4: "AI-Powered Analytics (5x effectiveness)"

**What we say:** "Canada's only AI-powered energy analytics platform" / "AI-powered insights across all 25+ dashboards"

**Adversarial challenge:**

| Evidence For | Evidence Against |
|-------------|-----------------|
| LLM Edge Function exists (Gemini API wrapper) | Top20.md Feature 7 explicitly says these are **"Planned"**: RAG with pgvector, multi-model ensemble, prompt templates — none exist |
| Energy Advisor Chat component exists | The LLM integration is a generic Gemini wrapper — no energy-specific fine-tuning, no RAG, no custom training |
| No other Canadian energy platform has an LLM chat | **Orennia explicitly markets as "AI-powered platform"** with 153 employees and $15M+ funding. They likely have more sophisticated AI. |
| AI Data Centre Dashboard exists (tracking AI power demand) | "5x effectiveness" is unsubstantiated — no benchmark, no user testing data |

**Assumption it relies on:** That "AI-powered" means "has an LLM chat feature" rather than "uses ML/AI for core analytics."

**Counterexample:** A prospect asks "How does your AI differ from ChatGPT analyzing the same AESO data?" We can't articulate a differentiated answer because it IS essentially ChatGPT (via Gemini) analyzing data we provide.

**Verdict:** 🔴 **OVERSOLD.** The LLM chat is a wrapper, not a moat. Claiming "AI-powered" when Orennia has 153 engineers doing actual AI is positioning against a competitor who will win this fight.

**Risk Level:** 🟡 **MEDIUM** — Easily deflated by a knowledgeable prospect.

---

### CLAIM 5: "Bill auditing, peak shaving alerts, saves $500+/year" (Rate Watchdog)

**What we say in outreach:** "Bill auditing, retailer switching recommendations, peak shaving alerts. Save $500+/year."

**Adversarial challenge:**

| Evidence For | Evidence Against |
|-------------|-----------------|
| RROAlertSystem displays rate comparisons | There is **no bill auditing** — users can't upload or enter their bills. It's a static rate comparison display. |
| Retailer data comes from UCA Cost Comparison Tool | There are **no peak shaving alerts** — no notification system, no time-of-use optimization. |
| The rate comparison concept is useful | The "$500/year savings" claim is **unsubstantiated** — no user data, no calculation basis. |
| AESO pool price polling exists | Retailer rates are hardcoded from December 2024 — **14 months stale**. |
| The 1.5M Alberta households affected by RoLR transition is real | UCA's free tool (ucahelps.alberta.ca) already does rate comparison — and it's government-backed, free, and has real retailer data. |

**Assumption it relies on:** That "rate comparison display" equals "bill auditing + peak shaving alerts + $500 savings."

**Counterexample:** User signs up at $9/mo, expects bill auditing (as advertised), finds a static rate comparison with year-old data. Requests refund. Files complaint.

**Verdict:** 🔴 **THREE of four claims are false.** Rate comparison exists. Bill auditing, peak shaving alerts, and the $500 figure do not. This is the most dangerous gap — paying customers will expect what's advertised.

**Risk Level:** 🔴 **CRITICAL** — Directly misleading to paying consumers. Chargeback and complaint risk.

---

### CLAIM 6: "Auto-generates Wah-ila-toos, CERRC, Northern REACHE quarterly reports"

**What we say:** "OCAP-compliant dashboard that auto-generates Wah-ila-toos, CERRC, and Northern REACHE quarterly reports from your project data."

**Adversarial challenge:**

| Evidence For | Evidence Against |
|-------------|-----------------|
| FunderReportingDashboard component exists with template selection | The dashboard falls back to **hardcoded demo projects** ("Northern Grid Microgeneration", "James Bay Storage Upgrade") |
| Report section selection UI works | There is **no actual report generation backend** — no PDF export of real reports |
| Template sections map to real funder requirements | "Auto-generates from your project data" is misleading — there's no data input pipeline for real projects |
| The Edge Function endpoint `api-v2-indigenous-projects` exists | When the Edge Function fails, it silently switches to demo data — user can't distinguish real from fake |

**Assumption it relies on:** That the demo UI IS the product, and real communities will populate it with their data via the Edge Function.

**Counterexample:** An energy coordinator tries to input their actual Wah-ila-toos reporting data. There's no data entry form that maps to the actual Wah-ila-toos reporting template fields. The "auto-generate" button produces content based on demo data, not their inputs.

**Verdict:** 🔴 **ASPIRATIONAL, not functional.** The UI scaffolding exists but the workflow (data input → validation → report generation → PDF export) is incomplete.

**Risk Level:** 🔴 **HIGH** — This is the #1 value proposition for the highest-value market segment.

---

### CLAIM 7: "44 REST API endpoints — used by a few consultants already"

**What we say in outreach Template C:** "I built an open API with live grid data + AI analysis — used by a few consultants already."

**Adversarial challenge:**

| Evidence For | Evidence Against |
|-------------|-----------------|
| 86 Edge Functions exist | "Used by a few consultants already" — **where is the evidence?** No user data, no testimonials, no usage logs showing external consumption. |
| OpenAPI docs page exists at /api-docs | Many endpoints return sample/fallback data when underlying data sources are unavailable |
| API key management page exists | Usage-based billing is described as "foundation" in Top20.md — not functional |
| Rate limiting is production-grade (68 endpoints) | The claim of "used by consultants" appears to be **fabricated social proof** |

**Assumption it relies on:** That mentioning existing users creates trust without verification.

**Counterexample:** A Dunsky analyst asks "Which consulting firms are using it? Can I speak with one?" We have no reference customers.

**Verdict:** 🔴 **"Used by a few consultants" is likely false and must be removed.** The API infrastructure is real and impressive, but claiming users who don't exist is a credibility-killer.

**Risk Level:** 🔴 **CRITICAL** — Fabricated social proof destroys trust instantly if challenged.

---

### CLAIM 8: "Sub-NWPTA pricing ($70,800/yr) — no RFP needed"

**What we say:** "Priced below $75K NWPTA sole-source threshold"

**Adversarial challenge:**

| Evidence For | Evidence Against |
|-------------|-----------------|
| NWPTA $75K threshold is real | The threshold applies differently per province/territory — not all municipalities follow the same rules |
| $70,800/yr is technically below $75K | Municipal procurement officers know the rules better than we do — claiming "no RFP" may be an oversimplification |
| Canoe Procurement is a real cooperative purchasing platform | We haven't actually been approved by Canoe — the application is "pending" |

**Assumption it relies on:** That all Alberta municipalities use NWPTA and that sole-source rules are straightforward.

**Counterexample:** A Red Deer sustainability director says "Our council requires three quotes for anything over $25K regardless of NWPTA." Many municipalities have stricter internal policies.

**Verdict:** 🟢 **MOSTLY DEFENSIBLE but needs nuance.** The NWPTA angle is a real advantage. But "no RFP needed" should be softened to "designed for simplified procurement" since individual municipality policies vary.

**Risk Level:** 🟢 **LOW** — Good positioning, minor wording adjustment needed.

---

## PART 2: GENUINE USPs vs OVERSOLD CLAIMS — VERDICT TABLE

### 🟢 GENUINELY UNIQUE & DEFENSIBLE (Lead with these)

| # | USP | Why It's Real | Competitive Moat |
|---|-----|--------------|-----------------|
| **U1** | **Broadest Canadian energy coverage in a single platform** | 25+ dashboards spanning grid, renewables, Indigenous, ESG, industrial, municipal, Arctic — verified in codebase. No single competitor covers all sectors. Orennia focuses on power/renewables. cCarbon focuses on carbon markets. | Width, not depth. Easy to explain. Hard to replicate quickly. |
| **U2** | **3-pathway TIER compliance calculator** | Only tool that compares Fund Payment vs Market Credits vs Direct Investment at facility level. cCarbon models macro supply/demand. Targray is a trading desk, not a calculator. | Niche but valuable. Direct Investment pathway is brand-new (Dec 2025). First-mover. |
| **U3** | **Indigenous OCAP data governance architecture** | No competitor is even ATTEMPTING this for energy. The architectural intent (nation-held keys, data residency controls, consent audit logging) is genuinely novel. The *direction* is unique, even if the *implementation* is incomplete. | First to market with the concept. Can be hardened into reality. |
| **U4** | **Procurement-optimized municipal pricing** | Deliberate sub-$75K NWPTA threshold. Municipal landing page with FCM/MCCAC alignment. Free baseline audit as lead magnet. No competitor has designed pricing for Canadian municipal procurement. | Smart GTM, not tech moat. But effective. |
| **U5** | **Open API for Canadian energy data** | 44+ documented endpoints, self-service API keys, rate limiting, OpenAPI/Redoc docs. Orennia charges $10-30K/yr for API access. CEIP can undercut massively. | Price advantage + breadth. |

### 🔴 OVERSOLD — MUST BE FIXED BEFORE OUTREACH

| # | Oversold Claim | Reality | Required Fix |
|---|---------------|---------|-------------|
| **O1** | "Nation-held encryption keys" / "full data sovereignty" | UI mockup with hardcoded fake keys, localStorage consent, no actual encryption | **Downgrade to "OCAP-ready architecture"** — honest about being pre-production. Offer to co-develop with first community partner. |
| **O2** | "Live EPC/Offset Pricing" | Hardcoded at $25/t from Q4 2025 | **Remove "Live" label.** Say "Based on Q4 2025 market data. Updated quarterly." OR build actual price feed. |
| **O3** | "Bill auditing + peak shaving alerts" | Static rate comparison with 14-month-old data | **Remove these claims entirely.** Describe accurately: "Alberta electricity rate comparison tool." |
| **O4** | "$500+/year savings" | No calculation basis, no user data | **Remove until substantiated.** After 10+ users, calculate actual average. |
| **O5** | "Auto-generates funder reports from your data" | Falls back to demo data, no real data input pipeline | **Downgrade to "Report template builder."** Be transparent that it's a framework needing community data input. |
| **O6** | "Used by a few consultants already" | No evidence of any real external users | **Remove immediately.** Replace with "Built by a solo developer. Looking for beta testers." Honesty is the strongest positioning for a bootstrapped founder. |
| **O7** | "AI-powered" as primary differentiator | Generic Gemini wrapper, no RAG/fine-tuning | **Stop leading with AI.** Mention it as a feature, not the headline. Lead with data breadth and Canadian specialization. |
| **O8** | "95%+ real data" | 236 sample/mock/hardcoded references across 44 files | **Reframe to "Data sourced from AESO, IESO, ECCC, NPRI, CER"** — describe provenance, not freshness percentage. |

---

## PART 3: REVISED USP POSITIONING — WHAT TO ACTUALLY SAY

### The Honest Elevator Pitch

> **CEIP is a comprehensive Canadian energy intelligence platform — 25+ sector dashboards, 44 API endpoints, and compliance calculators — built by a solo developer who's obsessed with making Canadian energy data accessible. We're the only platform covering grid operations, carbon compliance, Indigenous energy, ESG, and municipal climate tools in one place. We're early-stage, actively looking for design partners who'll get white-glove service in exchange for shaping the product.**

### Why This Works Better

1. **"Solo developer"** is a feature, not a bug — prospects know they'll get direct access to the builder
2. **"Design partner"** is more compelling than "free trial" — it implies collaboration, not charity
3. **"Shaping the product"** addresses the reality that parts are incomplete while framing it as an opportunity
4. **"25+ dashboards + 44 APIs"** is verifiable and impressive — lead with what's real
5. **No false claims** = no credibility risk when prospect actually uses the product

### Revised Top 5 USPs for Outreach (Ordered by Defensibility)

1. **🟢 Broadest Canadian energy data in one platform** — Grid + Carbon + Indigenous + ESG + Municipal. No competitor covers all five.
2. **🟢 TIER 3-pathway compliance calculator** — Fund vs Market Credits vs Direct Investment. Only facility-level tool available.
3. **🟢 Open API at 10x lower cost than Orennia** — 44 endpoints, $149/mo vs $10-30K/yr. Same AESO/IESO data.
4. **🟡 OCAP-ready Indigenous energy architecture** — First platform designed for data sovereignty. Seeking community design partner to harden into production.
5. **🟢 Procurement-optimized for municipalities** — Sub-$75K, FCM-aligned, free baseline audit included.

---

## PART 4: REVISED OUTREACH STRATEGY — CAMPAIGN-BY-CAMPAIGN FIXES

### Campaign 1: Energy Consulting Firms — MINIMAL CHANGES

**What to fix:**
- ❌ Remove: "used by a few consultants already"
- ❌ Remove: "AI analysis" from API pitch
- ✅ Replace with: "Built by a solo developer. Looking for 5 beta testers who'll get lifetime Pro access in exchange for feedback."
- ✅ Lead with: cost comparison (CEIP $149/mo vs Orennia $10-30K/yr for similar Canadian data)

**Revised connection note:**
```
Hi {FirstName}, saw your work on {topic} at {Company}. I built an open Canadian energy API (44 endpoints, AESO/IESO/ECCC) at 1/100th of Orennia's price. Looking for 5 analyst beta testers. Interested?
```

**Why this works:** Consulting analysts respond to: (1) specific data they need, (2) being asked to evaluate (flattering), (3) free/cheap access to expensive data.

---

### Campaign 2: Indigenous Energy Coordinators — MAJOR CHANGES

**What to fix:**
- ❌ Remove: "nation-controlled encryption keys" / "full data sovereignty"
- ❌ Remove: "auto-generates Wah-ila-toos, CERRC, Northern REACHE quarterly reports"
- ✅ Replace with: "I'm building an OCAP-aligned energy data platform — still early stage, looking for one community to co-design it with."
- ✅ Lead with: humility, learning intent, willingness to invest in the community's needs
- ✅ Add: explicit acknowledgment that OCAP compliance requires community partnership to get right

**Revised connection note:**
```
Hi {FirstName}, I'm building energy tracking tools designed for OCAP alignment. It's early stage — I'd love to learn from {community}'s experience with funder reporting. Would you be open to a conversation?
```

**Revised follow-up DM:**
```
Thanks for connecting, {FirstName}! I'm a developer building Canada's first OCAP-aligned energy data platform. I have the technical architecture (data residency controls, consent logging, nation-controlled access) but I know real OCAP compliance requires community partnership to get right.

I'm looking for ONE community willing to co-design the platform — free access, direct developer support, and your feedback shapes the product.

Would {community} have interest? Even a 15-minute conversation about your funder reporting challenges would help me build something genuinely useful.
```

**Why this changes everything:** This positions us as honest and collaborative. Indigenous communities value authenticity over polished pitches. A co-design partnership is more likely to succeed than a sales pitch for a half-built product.

---

### Campaign 3: Municipal Sustainability Officers — MINOR CHANGES

**What to fix:**
- ❌ Remove: "Available through Canoe Procurement (application pending)" — don't claim what isn't done
- ✅ Soften: "no RFP needed" → "designed for simplified procurement (under $75K)"
- ✅ The free baseline audit offer is good — keep it
- ✅ Add: "I'm a solo developer who'll personally run the audit with you"

**Revised connection note:**
```
Hi {FirstName}, I built a free GHG baseline audit tool for Alberta municipalities — takes 30 min and you keep the report. Designed for simplified procurement. Would {Municipality} find this useful?
```

---

### Campaign 4: Industrial TIER Compliance — MODERATE CHANGES

**What to fix:**
- ❌ Remove: "Live EPC/Offset Pricing" trust badge claim
- ❌ Remove: "500-800% ROI" without qualification
- ✅ Replace: "Prices based on Q4 2025 S&P Global / Alberta.ca data"
- ✅ Keep: 3-pathway calculator — it's genuinely useful and differentiated
- ✅ Add: "Calculator uses published market data — I'm working on a live price feed for 2026"

**Revised connection note:**
```
Hi {FirstName}, the TIER fund-credit spread is ~$70/t (Alberta.ca confirmed). I built a free 3-pathway compliance calculator (fund vs market vs Direct Investment). Might save {Company} significant compliance costs. Worth a look?
```

---

### Campaign 5: Rate Watchdog — NEEDS REBUILD BEFORE LAUNCH

**What to fix:**
- ❌ Do NOT launch at $9/mo in current state
- ❌ Remove ALL claims of: bill auditing, peak shaving alerts, $500/year savings
- ✅ Reposition as: **free** rate comparison tool (lead gen for B2B, not standalone revenue)
- ✅ Update retailer data from December 2024 to current
- ✅ Only charge $9/mo AFTER building: (a) actual bill upload/analysis, (b) real alert system, (c) live retailer pricing

**Revised strategy:** Rate Watchdog should be **free** until the features match the promise. Use it purely as top-of-funnel traffic gen (Reddit/YouTube content about Alberta electricity rates → free tool → email capture → nurture to B2B).

---

## PART 5: IMPLEMENTATION PRIORITY — WHAT TO BUILD BEFORE OUTREACH

### Pre-Outreach Fixes (Do These BEFORE Sending Any Messages)

| Priority | Fix | Effort | Impact |
|----------|-----|--------|--------|
| **P0** | Remove "used by consultants" from all templates | 5 min | Eliminates fabricated social proof |
| **P0** | Remove "Live EPC/Offset Pricing" badge from ROI Calculator | 5 min | Eliminates false claim |
| **P0** | Remove bill auditing/peak shaving/saves $500 from Watchdog messaging | 5 min | Eliminates false advertising |
| **P1** | Update retailer rates in `RROAlertSystem.tsx` from Dec 2024 to current | 30 min | Data freshness |
| **P1** | Change TIER price display to "Based on Q4 2025 data" with update date | 15 min | Honest labeling |
| **P1** | Move email capture from localStorage to Supabase table | 1 hr | Don't lose leads |
| **P2** | Add "Beta" / "Early Access" badge to Funder Reporting and Sovereign Vault pages | 15 min | Sets expectations |
| **P2** | Change SovereignDataVault header to "OCAP-Ready Architecture (Co-Design Partner Sought)" | 10 min | Honest positioning |
| **P3** | Build actual bill upload + basic analysis for Rate Watchdog | 4-8 hrs | Required before charging $9/mo |
| **P3** | Connect TIER calculator to a quarterly-updated price source | 2-4 hrs | Backs up pricing claims |

### Outreach Readiness Checklist

Before launching ANY Comet campaign:

- [ ] All "false claim" items (P0) are fixed in codebase
- [ ] All "honest labeling" items (P1) are fixed
- [ ] COMET_OUTREACH_STRATEGY.md is updated with revised templates
- [ ] Top20.md is updated to reflect accurate capabilities
- [ ] Rate Watchdog is repositioned as free (remove $9/mo Paddle checkout until features match)

---

## PART 6: FINAL VERDICT — HONEST STRENGTHS TO LEAD WITH

### What CEIP Actually Is (Honest Version)

CEIP is an **ambitious, comprehensive Canadian energy intelligence platform** built by a single developer. It has:

- **Real strengths:** Breadth (25+ sector dashboards), architectural quality (production-grade security, code-split lazy loading, rate limiting), Canadian specialization (AESO/IESO/ECCC integration), and first-mover positioning in Indigenous OCAP energy data and TIER 3-pathway compliance modeling.

- **Real weaknesses:** Many dashboards fall back to sample data, several key features are UI scaffolding without backend implementation, no paying customers yet, and the solo-founder credibility gap is real.

- **Real opportunity:** The Canadian energy analytics market is underserved. Orennia is expensive and focused on power/renewables. Nobody is doing Indigenous OCAP compliance for energy. Nobody has a facility-level TIER 3-pathway calculator. The breadth is genuinely impressive. But the go-to-market messaging must match the actual product state.

### The Winning Positioning (Synthesis)

**Don't pretend to be an enterprise platform. Be the scrappy, honest, insanely-comprehensive indie tool that enterprise players can't match on breadth or price.**

1. **Lead with data breadth** — 25+ dashboards, 44 API endpoints, every Canadian energy sector
2. **Lead with price** — $149/mo vs Orennia's $10-30K/yr
3. **Lead with access** — "You'll work directly with the developer who built it"
4. **Be transparent about stage** — "Early-stage, looking for design partners"
5. **Be transparent about what works vs what's coming** — "The TIER calculator is production-ready. The OCAP vault is architecturally designed but needs a community partner to harden."

This is more credible, more likable, and more likely to convert than overclaiming and getting caught.

---

*Document version: 1.0 | Based on codebase audit of 140+ components, 86 Edge Functions, competitive research (Orennia, cCarbon, Targray, Carbonhound, Measurabl, FCM/MCCAC tools), and adversarial stress-testing of all 8 major USP claims.*
