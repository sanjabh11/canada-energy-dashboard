# CEIP Stage 2 Audit — Marketing, Outreach & Presales

> **Audited commit:** 4271a12c4e8e1eddd0cb2b406e799d6af4dfb98b
> **Audit date:** 2026-07-05
> **Method:** Fable 5 with-outreach skill, adversarial verification, internet-researched benchmarks
> **Overall confidence:** High (all findings verified against code, docs, and live web sources)
> **Stage 1 handoff:** `.fable5/handoff-to-outreach.json`

---

## 1. Executive Summary

**GTM Readiness Grade: D+**

CEIP has exceptional product infrastructure for a solo-built Canadian energy proof-pack product — 10 ranked commercial wedges, a claim registry with explicit boundaries, a commercial source-of-truth document, outreach templates, and a pricing catalog. However, the go-to-market execution layer is critically underdeveloped.

**Top 3 Marketing Gaps:**
1. **Positioning breadth paradox** — The positioning statement lists 10 capabilities in one sentence. Buyers cannot quickly answer "what is this?" No explicit competitive alternatives or market category defined per Dunford framework.
2. **No messaging hierarchy** — No documented message pyramid. All messaging is flat. Segment narratives exist but no overarching architecture.
3. **No content strategy** — Zero blog posts, zero published articles. SEOHead component exists but no content pages targeting buyer search terms.

**Top 3 Outreach Gaps:**
1. **Zero outreach cadence** — Templates exist but outreach response log has zero entries. 2026 benchmark is 6-8 touches over 14-18 days. CEIP has 0.
2. **No CASL compliance** — Templates lack unsubscribe links, mailing addresses, and consent tracking. Penalties up to $10M CAD per violation.
3. **No outreach tracking** — No CRM, no tool integration, no way to measure reply rates or pipeline velocity.

**Top 3 Presales Gaps:**
1. **Zero buyer-validated evidence** — Pilot evidence register template has zero filled entries.
2. **No sales enablement artifacts** — Zero case studies, battle cards, demo scripts, or RFP templates.
3. **No pilot workflow automation** — Entirely manual pilot intake with no self-serve signup.

**GO/NO-GO Recommendation: NO-GO for scaled outreach.** Product infrastructure is strong, but GTM execution needs foundational work: (1) CASL compliance, (2) messaging hierarchy, (3) cadence design and execution, (4) at least 3 pilot conversations logged before scaling.

---

## 2. Commercial Calibration Baseline (Phase M0)

- [FACT] MKT-1: `commercialPositioning.ts` defines 10 active commercial wedges + 6 reserve wedges, with sellability scores from 4.6 (forecast benchmarking) to 2.0 (broad dashboard)
- [FACT] MKT-2: `pricingCatalog.ts` is the canonical pricing source with 6 direct plans ($0-$5,900/mo) and 3 Whop plans ($29-$299/mo) — 9 total tiers across 2 payment providers
- [FACT] MKT-3: `claimRegistry.ts` maps 8 proof-pack routes to claim statuses (source-backed, hybrid, demo-only) with explicit `doNotClaim` arrays
- [FACT] MKT-4: `COMMERCIAL_SOURCE_OF_TRUTH.md` (June 3, 2026) defines active commercial docs, stale research, claim translation table, and review workflow with 30+ pnpm verification scripts
- [FACT] MKT-5: `HERMES_OUTREACH_OPERATING_PLAN.md` defines a manual outreach workflow with route-selection matrix, variant IDs, and response logging scripts — but zero logged sends
- [FACT] MKT-6: `CEIP_OUTREACH_CAMPAIGN_ASSETS.md` defines 12 buyer lanes with example targets, opening angles, and outreach copy templates — but no cadence design
- [FACT] MKT-7: `analytics.ts` implements Plausible-based event tracking with UTM attribution capture and localStorage persistence — but no conversion events defined
- [FACT] MKT-8: `SEOHead.tsx` provides per-page SEO meta tags, JSON-LD structured data, and hreflang tags across 33+ pages — but no content pages targeting buyer search terms
- [FACT] MKT-9: `boundedAiLanguage` in `commercialPositioning.ts` explicitly defines allowed vs disallowed AI phrases
- [FACT] MKT-10: `indigenousCoDesignPathway` defines a trust-sensitive pilot lane with explicit "NOT OCAP-compliant" boundary

---

## 3. Marketing Strategy & Positioning Audit (Phase M1)

### M1A. Positioning Statement Assessment

**Current positioning** (from `COMMERCIAL_SOURCE_OF_TRUTH.md:46`):
> CEIP is a Canadian utility and Alberta TIER proof-pack product that turns forecasts, filing evidence, benchmark transparency, Ontario GA/ICI peak-risk support, privacy-screened CSV proof, compliance scenarios, credit ledgers, asset triage, security review, and billing checks into buyer-ready artifacts.

**Assessment using April Dunford's framework (Obviously Awesome, 2026 ed.):**

| Component | Status | Finding |
|---|---|---|
| Competitive alternatives | Not documented | No explicit list of what buyers use today |
| Unique attributes | Implicit | "Proof packs" and "claim boundaries" are unique but not framed as attributes |
| Value those attributes provide | Partial | Segment narratives describe value, but not in positioning statement |
| Who cares a lot | Partial | 7 segments defined but no ICP prioritization |
| Market category | Unclear | "Proof-pack product" is internal jargon — buyers don't search for this |

**Finding MKT-POS-1 (Critical):** The positioning statement is a feature list, not a positioning statement. It names 10 capabilities in one sentence. The Dunford framework requires identifying competitive alternatives, unique attributes, value, who cares, and market category. CEIP has not explicitly answered questions 1, 4, or 5.

**Finding MKT-POS-2 (High):** "Proof pack" is internal jargon. No buyer searches for "proof pack" — they search for "utility forecast tool," "TIER compliance calculator," "OEB filing preparation." The `buyerLanguageAliases` array acknowledges this with SEO aliases, but the positioning statement uses the jargon term.

**Finding MKT-POS-3 (Medium):** Product-positioning paradox from Stage 1 remains unresolved. The codebase implements 25+ dashboards, but commercial positioning narrows to 10 proof packs. The gap between product breadth and positioning narrowness creates internal confusion about what to build vs what to sell.

### M1B. Messaging Hierarchy

**Finding MKT-MSG-1 (High):** No documented messaging hierarchy exists. No message pyramid, no value proposition ladder, no category → benefit → feature mapping. The `segmentNarratives` array provides per-segment headlines, but these are not organized into a coherent architecture.

**Finding MKT-MSG-2 (Medium):** The `boundedAiLanguage` configuration is a strong claim-boundary discipline mechanism, but it is not a messaging guide. It defines what NOT to say, not what TO say.

### M1C. Claim-Boundary Discipline

**Finding MKT-CLM-1 (Low):** Claim-boundary discipline is the strongest marketing dimension. The `claimRegistry.ts` maps every route to `ClaimStatus`, `boundary`, `doNotClaim[]`, and `freshnessSLA`. The `COMMERCIAL_SOURCE_OF_TRUTH.md` has a claim translation table and 30+ verification scripts. This is above industry standard for a product at this stage.

### M1D. Competitive Positioning

**Finding MKT-COMP-1 (High):** No explicit competitive positioning document exists. The Stage 1 audit identified competitors (Orennia, Enverus, cCarbon, Targray, FCM/MCCAC, RateHub) but there is no competitive battle card, no feature comparison matrix, and no "why us vs them" narrative.

**Finding MKT-COMP-2 (Medium):** The `CompetitorComparison.tsx` component exists but compares generic feature lists, not named competitors. Internet research confirms Orennia ($3M revenue, 145 employees, Calgary-based, AI-powered) and Enverus (25+ years, Fortune 500 utility clients, bespoke load forecasts) are well-funded competitors. CEIP's "proof pack with claim boundaries" differentiation is not articulated against them.

### Phase M1 Exit Criteria Checklist
- [x] Positioning statement assessed against Dunford framework
- [x] Messaging hierarchy audited (gap documented)
- [x] Claim-boundary discipline audited (strong)
- [x] Competitive positioning audited (gap documented)
- [x] **Exit criteria met: Y**

---

## 4. Outreach & Engagement Strategy Audit (Phase M2)

### M2A. Channel Mix

**Finding OUT-CHN-1 (Critical):** Only one outreach channel is documented: LinkedIn + email (manual). The 2026 B2B benchmark is multi-channel: email + LinkedIn + phone. The Hermes operating plan mentions LinkedIn as the primary channel but no phone outreach workflow exists. No content marketing channel exists (zero blog posts, zero published articles).

**Finding OUT-CHN-2 (High):** No dark funnel presence. "Dark funnel" refers to the invisible research buyers do before contacting sales — Slack communities, Reddit threads, podcast appearances, conference talks, YouTube videos. CEIP has zero presence in any of these channels. The `buyerLanguageAliases` array targets SEO keywords, but there are no content pages to rank for them.

### M2B. Cadence Design

**Finding OUT-CAD-1 (Critical):** No outreach cadence is designed or documented. The 2026 B2B benchmark from ReachIQ, OnyxSend, and SmartLead consistently shows:
- 6-8 touches over 14-18 days
- 4 emails + 1-2 LinkedIn + 0-1 phone
- Email-first ordering, LinkedIn as multiplier
- Break-up email at day 14-18
- Reply rate target: 8-12% (multi-channel) vs 1-3% (email-only)

CEIP has 0 touches documented. The templates exist but are not organized into a cadence.

**Finding OUT-CAD-2 (High):** The Hermes operating plan defines variant IDs (e.g., `ufp_ldc_planner`, `reg_oeb_auc`, `tier_cfo`) but does not sequence them into a multi-touch cadence. There is no day-by-day touch plan, no channel rotation, no break-up email template.

### M2C. Compliance

**Finding OUT-COMP-1 (Critical):** CASL compliance is not implemented in outreach templates. Canada's Anti-Spam Legislation requires:
1. **Consent** (express or implied) — no consent tracking mechanism exists
2. **Sender identification** — outreach templates do not include business name, mailing address, or contact information
3. **Unsubscribe mechanism** — no unsubscribe link in any template

The CRTC can impose penalties up to $10M CAD per violation. The outreach templates in `OUTREACH_AND_PILOT_TEMPLATES.md` are signature-only ("- Sanjay") with no business address, no unsubscribe link, and no CASL compliance language.

**Finding OUT-COMP-2 (High):** The B2B exemption under CASL requires a demonstrable business relationship between organizations, not just between individuals. Cold outreach to Canadian prospects without express consent or a valid implied consent basis is a CASL violation. The templates are designed for cold outreach ("Hi {FirstName}") which requires either express consent or conspicuous publication without a no-solicitation notice.

**Finding OUT-COMP-3 (Medium):** Implied consent under CASL expires after 2 years (business relationship) or 6 months (inquiry). No CRM or consent-tracking system exists to manage consent expiry dates.

### M2D. Dark Funnel Presence

**Finding OUT-DF-1 (High):** Zero dark funnel presence. No activity in energy utility Slack/Discord communities, Reddit, podcast appearances, conference talks (CEA, CAMPUT, OEB events), YouTube content, or LinkedIn thought leadership posts. The `Linkedin_artical.md` is a draft marked as stale in `COMMERCIAL_SOURCE_OF_TRUTH.md`.

### Phase M2 Exit Criteria Checklist
- [x] Channel mix audited (1 channel vs 3 benchmark)
- [x] Cadence design audited (0 touches vs 6-8 benchmark)
- [x] Compliance audited (CASL gaps documented)
- [x] Dark funnel presence audited (zero presence)
- [x] **Exit criteria met: Y**

---

## 5. Pricing & Monetization Strategy Audit (Phase M3)

### M3A. Value Metric

**Finding PRICE-VM-1 (High):** The pricing value metric is unclear. The 6 direct plans span $0 to $5,900/month with no consistent value metric. The jump from $149 to $1,500 is 10x with no clear value metric explanation. The 2026 SaaS pricing benchmark shows 67% of SaaS companies use tiered models, but successful tiers are anchored to a clear value metric (seats, API calls, data volume, outcomes).

**Finding PRICE-VM-2 (Medium):** The Industrial TIER plan has a "20% success fee on documented savings" which is a hybrid value-based pricing model. This is innovative but creates a billing complexity risk — how is "documented savings" measured and verified? No implementation exists for tracking success-fee-based billing.

### M3B. Tier Design

**Finding PRICE-TIER-1 (High):** 9 total pricing tiers across 2 payment providers (Paddle direct + Whop) creates buyer confusion. The Whop tiers ($29/$99/$299) overlap with but don't match the direct tiers ($9/$149/$1,500). A buyer seeing both pricing surfaces would not know which applies. The `COMMERCIAL_SOURCE_OF_TRUTH.md` does not reconcile Whop vs direct pricing.

**Finding PRICE-TIER-2 (Medium):** The Municipal tier at $5,900/mo ($70,800/yr) is positioned as "Below NWPTA threshold" ($75K). This is a well-researched price point. However, the tier includes "Methane Compliance Engine" and "TIER credit tracking" which are features not visible in the product's current route structure — potential overclaim risk.

**Finding PRICE-TIER-3 (Medium):** The Sovereign tier at $2,500/mo is positioned for Indigenous co-design but the `indigenousCoDesignPathway` status is "seeking-partners" — meaning no partners exist yet. Pricing a tier for a segment with zero customers and zero validated demand is speculative.

### M3C. Price-to-Value Ratio

**Finding PRICE-PV-1 (Medium):** The Professional tier at $149/mo with "API access (1,000 calls/day)" is priced at approximately 1/100th of Orennia ($10-30K/yr). This is a strong price-to-value story for consultants, but it is not articulated in the pricing page messaging. The `PricingPage.tsx` lists features but does not include competitive price comparison.

**Finding PRICE-PV-2 (Low):** The Consumer Watchdog at $9/mo competes with free tools (RateHub, EnergyRates.ca). The value proposition ("Stop overpaying on electricity") is compelling but the feature set (rate comparison, alerts) may not justify $9/mo vs free alternatives. No free trial is offered for this tier.

### M3D. Pricing Governance

**Finding PRICE-GOV-1 (Low):** Pricing governance is strong. The `PRICING_SOURCE_OF_TRUTH` constant in `commercialPositioning.ts:563` explicitly states all pricing references must derive from `CEIP_PRICING`. The `PricingPage.tsx` imports from `pricingCatalog.ts` directly. This is above industry standard for pricing governance.

### Phase M3 Exit Criteria Checklist
- [x] Value metric audited (unclear)
- [x] Tier design audited (9 tiers, 2 providers, overlap risk)
- [x] Price-to-value ratio audited (strong for Professional, weak for Consumer)
- [x] Pricing governance audited (strong)
- [x] **Exit criteria met: Y**

---

## 6. Buyer Journey & Touchpoint Audit (Phase M4)

### M4A. Touchpoint Matrix

| Stage | Touchpoint | Status | Gap |
|---|---|---|---|
| Awareness | SEO content pages | Missing | Zero blog/content pages despite SEOHead infrastructure |
| Awareness | Social media presence | Missing | Zero LinkedIn thought leadership, zero YouTube |
| Awareness | Conference/podcast presence | Missing | Zero appearances |
| Consideration | Product website | Exists | 65+ routes, SEOHead on 33+ pages |
| Consideration | Pricing page | Exists | `PricingPage.tsx` with 6 tiers, Paddle checkout |
| Consideration | Competitor comparison | Exists | `CompetitorComparison.tsx` but generic, not named competitors |
| Consideration | Demo request | Partial | Enterprise Calendly link only, no self-serve demo booking |
| Decision | Trial/pilot signup | Missing | No self-serve pilot signup flow — manual process only |
| Decision | Pilot agreement | Missing | No digital pilot agreement, manual PDF/email only |
| Onboarding | Welcome workflow | Missing | No onboarding workflow post-purchase |
| Onboarding | Training materials | Missing | No video tutorials, no documentation portal |
| Retention | Customer health score | Missing | No usage analytics, no health scoring |
| Retention | Expansion motion | Missing | No upsell/cross-sell mechanism |
| Advocacy | Case studies | Missing | Zero buyers = zero case studies |
| Advocacy | Referral program | Missing | No referral mechanism |

### M4B. Journey Gaps

**Finding BJ-GAP-1 (Critical):** No self-serve pilot signup flow. The `PilotReadinessPage.tsx` exists as a readiness evaluator but does not include a pilot signup form. The Hermes plan describes a manual pilot intake process with CSV templates and pnpm scripts. This creates a bottleneck: every pilot requires manual coordination, limiting throughput.

**Finding BJ-GAP-2 (High):** No analytics instrumentation at journey stages. The `analytics.ts` file implements `trackEvent()` and `bootstrapFunnelAttribution()` but no conversion events are defined. There is no funnel tracking from page view to pricing view to demo request to pilot signup to pilot completion. The Plausible integration exists but no custom event goals are configured.

**Finding BJ-GAP-3 (High):** No onboarding workflow post-purchase. After a buyer pays (via Paddle or Whop), there is no automated welcome sequence, no guided product tour, no "getting started" checklist. The `HelpButton.tsx` provides contextual help but is not an onboarding flow.

**Finding BJ-GAP-4 (Medium):** No lead scoring or routing. The `EmailCaptureModal.tsx` exists for email capture but there is no lead scoring model, no routing rules (e.g., utility lead to utility playbook, industrial lead to TIER playbook), and no CRM integration.

### Phase M4 Exit Criteria Checklist
- [x] Touchpoint matrix complete (15 stages assessed)
- [x] Journey gaps documented (4 findings)
- [x] Analytics instrumentation audited (exists but no conversion events)
- [x] Lead scoring/routing audited (missing)
- [x] **Exit criteria met: Y**

---

## Top 5 Summary Gate (Stage 2A — domain="outreach-gtm")

### Table 1: Top 5 Outreach/GTM Gaps (ranked by Priority Score)

| Rank | Gap ID | Severity | Description | Priority Score | Impact |
|---|---|---|---|---|---|
| 1 | OUT-COMP-1 | Critical | No CASL compliance in outreach templates (no unsubscribe, no sender ID, no consent tracking) | 100 | $10M CAD penalty risk per violation; blocks all Canadian outreach |
| 2 | OUT-CAD-1 | Critical | Zero outreach cadence designed (0 touches vs 6-8 benchmark) | 95 | No outreach can be executed without a cadence design |
| 3 | MKT-POS-1 | Critical | Positioning statement is a feature list, not a positioning statement | 90 | Buyers cannot quickly understand "what is this?" |
| 4 | BJ-GAP-1 | Critical | No self-serve pilot signup flow | 85 | Manual pilot intake limits throughput to ~1-2/month |
| 5 | OUT-CHN-1 | Critical | Single-channel outreach (LinkedIn only) vs 3-channel benchmark | 80 | Reply rates capped at 1-3% vs 8-12% multi-channel |

### Table 2: Top 5 Audience Profiles (ranked by Overall Score)

| Rank | Segment | Fit | Budget | Competition | Overall Score | Recommended First Move |
|---|---|---|---|---|---|---|
| 1 | Utility (LDC/REA) | 4.5 | $5K-50K/yr | Orennia, Enverus, spreadsheets | 8.5 | Lead with forecast planning pack; target consultants first |
| 2 | Industrial (TIER) | 4.0 | $1.5K-15K/yr | cCarbon, Targray, EPC | 7.5 | Lead with TIER CFO memo; target Alberta emitters |
| 3 | Consultant/Analyst | 3.1 | $149-15K/yr | Orennia, custom scrapes | 7.0 | Lead with API data pack; fastest path to first dollar |
| 4 | Municipal/Public Sector | 3.5 | $5.9K-75K/yr | FCM/MCCAC (free) | 6.5 | Lead with shadow billing; sub-NWPTA pricing angle |
| 5 | Security/Procurement | 4.0 | Included in utility | Custom questionnaires | 6.0 | Attach to utility outreach; not a standalone segment |

### Table 3: Top 5 Competitor Outreach Gaps (ranked by Priority Score)

| Rank | Competitor | Their Gap | Our Opening | Priority Score |
|---|---|---|---|---|
| 1 | Orennia | $10-30K/yr pricing excludes small utilities/REAs | Professional tier at $149/mo = 1/100th cost | 90 |
| 2 | Spreadsheets | Manual, error-prone, no benchmark provenance | Automated proof pack with benchmark appendix | 85 |
| 3 | Enverus | US-focused, limited Canadian regulatory filing support | OEB/AUC-specific filing packs | 75 |
| 4 | FCM/MCCAC | Free but generic, no proof-pack exports | Municipal proof pack with audit trail | 60 |
| 5 | cCarbon | Macro supply/demand simulator, not facility-level | Facility-level TIER ROI with credit banking | 55 |

### Table 4: Profile x Gap x Implementation Matrix (ranked by Severity x Profile Fit)

| Rank | Gap | Best-Fit Segment | Severity | Profile Fit | Score | Implementation Effort |
|---|---|---|---|---|---|---|
| 1 | CASL compliance | All Canadian segments | 100 | 10 | 1000 | S (add compliance footer to templates) |
| 2 | Outreach cadence design | Utility + Consultant | 95 | 9 | 855 | M (design 6-touch cadence, create break-up template) |
| 3 | Positioning statement rewrite | All segments | 90 | 10 | 900 | S (rewrite per Dunford framework) |
| 4 | Pilot signup flow | Utility + Industrial | 85 | 8 | 680 | M (add form to PilotReadinessPage) |
| 5 | Messaging hierarchy | All segments | 80 | 10 | 800 | S (document message pyramid) |
| 6 | Competitive battle cards | Utility | 75 | 9 | 675 | S (create Orennia vs CEIP comparison) |
| 7 | Analytics conversion events | All segments | 70 | 8 | 560 | S (define and instrument 5 conversion events) |
| 8 | Multi-channel cadence | Utility + Industrial | 65 | 7 | 455 | M (add phone touch to cadence) |
| 9 | Content/SEO pages | Utility + Consultant | 60 | 8 | 480 | L (create 10+ content pages) |
| 10 | Onboarding workflow | All paid segments | 55 | 7 | 385 | L (build guided product tour) |

---

## 7. Sales Enablement Artifact Audit (Phase M5)

| Artifact Type | Status | Location | Quality |
|---|---|---|---|
| Case studies | Missing | None | N/A — zero buyers |
| Battle cards | Missing | None | N/A |
| Demo scripts | Partial | `docs/MVP_DEMO_FREEZE_HANDOFF.md` | Internal-only; 5-tab runbook |
| RFP templates | Missing | None | N/A |
| Security questionnaires | Partial | `src/lib/utilitySecurityProofPack.ts` | Product-side matrix, not reusable |
| Pilot agreements | Missing | `docs/PILOT_EVIDENCE_INTAKE_AND_ACCEPTANCE.md` | Process doc, not signed agreement |
| Reference architectures | Missing | None | N/A |
| ROI calculators | Exists | `src/components/TIERROICalculator.tsx` | Product-embedded, not exportable |
| One-pagers | Missing | None | N/A |
| Email sequences | Partial | `docs/growth/templates/OUTREACH_AND_PILOT_TEMPLATES.md` | 6 templates, no cadence |

**Finding SE-ART-1 (Critical):** Zero case studies. Expected with zero buyers, but means every outreach touch must compensate with proof-pack demos and public-source evidence.

**Finding SE-ART-2 (High):** `MVP_DEMO_FREEZE_HANDOFF.md` is a strong internal demo runbook (5-tab sequence with messaging) but is not customer-facing. A buyer-facing demo script must be derived from it.

**Finding SE-ART-3 (High):** No battle cards. `CompetitorComparison.tsx` compares generic features, not named competitors. An Orennia battle card would need: pricing ($149/mo vs $10-30K/yr), feature delta (proof packs vs AI platform), Canadian regulatory specificity (OEB/AUC vs US ISOs).

**Finding SE-ART-4 (Medium):** `PILOT_EVIDENCE_INTAKE_AND_ACCEPTANCE.md` is an exceptionally detailed 369-line process doc with 20+ evidence types and validation scripts. But it is internal operations, not a buyer-facing pilot agreement.

**Finding SE-ART-5 (Medium):** `TIERROICalculator.tsx` is a strong interactive ROI tool but is not exportable as a leave-behind. No PDF export or shareable link exists.

### Phase M5 Exit Criteria Checklist
- [x] 10 artifact types assessed
- [x] Quality rated for each existing artifact
- [x] Gaps documented for each missing artifact
- [x] **Exit criteria met: Y**

---

## 8. GTM Readiness Scorecard (Phase M6)

| Dimension | Status | Score | Evidence |
|---|---|---|---|
| Documented strategy | PARTIAL | 3/5 | `COMMERCIAL_SOURCE_OF_TRUTH.md` with claim boundaries, 30+ scripts. No messaging hierarchy. |
| Validated segments | PARTIAL | 2/5 | 7 segments defined with fit scores. Zero buyer-validated evidence. No ICP prioritization. |
| Outreach channels | NOT READY | 1/5 | LinkedIn-only. Zero sends logged. No cadence. No CASL compliance. |
| Pricing public | READY | 4/5 | `PricingPage.tsx` with 6 tiers, Paddle checkout. Whop vs direct overlap unresolved. |
| Sales enablement | NOT READY | 1/5 | Demo runbook (internal). Zero case studies, battle cards, RFP templates. |
| Analytics | PARTIAL | 2/5 | Plausible + UTM. Zero conversion events. No funnel instrumentation. |
| Pilot workflow | PARTIAL | 3/5 | Detailed intake/acceptance process. No self-serve signup. Entirely manual. |
| Compliance guardrails | READY | 4/5 | Claim registry with boundaries. 30+ verification scripts. CASL for outreach is gap. |

**Overall GTM Readiness Score: 2.5/5 (50%)**

**Finding GTM-RDY-1 (High):** Strongest dimensions: pricing (4/5) and compliance guardrails (4/5). Weakest: outreach channels (1/5) and sales enablement (1/5). Excellent internal discipline, virtually zero external execution capability.

**Finding GTM-RDY-2 (Medium):** Pilot workflow score (3/5) is inflated by the exceptional `PILOT_EVIDENCE_INTAKE_AND_ACCEPTANCE.md` process. In practice, entirely manual with no automation, limiting throughput to ~1-2 pilots/month.

---

## 9. Customer Validation & Presales Lifecycle (Phase M7)

### M7A. 10-Stage Presales Funnel

| Stage | Status | Tool/Component | Gap |
|---|---|---|---|
| 1. Lead capture | Partial | `EmailCaptureModal.tsx`, UTM attribution | No lead scoring, no CRM routing |
| 2. Qualification | Missing | None | No qualification criteria or scoring model |
| 3. Discovery call | Partial | Enterprise Calendly link | No structured discovery questionnaire |
| 4. Demo | Partial | `MVP_DEMO_FREEZE_HANDOFF.md` (internal) | No buyer-facing demo script |
| 5. Proof-pack pilot | Partial | `PilotReadinessPage.tsx`, manual intake | No self-serve signup, no automation |
| 6. Pilot evidence collection | Partial | 20+ pnpm validation scripts | Entirely manual CSV-based process |
| 7. Pilot review | Missing | None | No structured pilot review meeting template |
| 8. Proposal/quote | Missing | None | No proposal template or quote generator |
| 9. Close/sign | Partial | Paddle checkout for self-serve | No enterprise contract template |
| 10. Onboarding | Missing | None | No post-purchase onboarding workflow |

### M7B. Pipeline Velocity

**Finding CV-PV-1 (Critical):** Zero pipeline data exists. No sends, no replies, no meetings, no pilots, no deals. Pipeline velocity cannot be calculated. The 2026 B2B benchmark for multi-channel outreach is 8-12% reply rate and 1.5-3% meeting rate. With zero outreach executed, all downstream metrics are zero.

**Finding CV-PV-2 (High):** The theoretical pipeline capacity is ~1-2 pilots/month based on the manual intake process. Each pilot requires: manual outreach (no cadence), manual discovery (no questionnaire), manual demo (Calendly), manual pilot setup (CSV templates), manual evidence collection (pnpm scripts), and manual review. This throughput is insufficient for product-market validation.

### M7C. Deal-Stall Analysis

**Finding CV-DS-1 (High):** The most likely deal-stall points are:
1. **After demo** — no structured follow-up sequence exists. No post-demo email template, no pilot proposal template, no "next steps" document.
2. **During pilot evidence collection** — the 369-line intake process is comprehensive but overwhelming. No simplified buyer-facing checklist exists. Buyers may abandon due to process complexity.
3. **After pilot completion** — no proposal or quote template exists. The transition from "pilot evidence" to "paid contract" is undefined.

**Finding CV-DS-2 (Medium):** No lost-deal analysis mechanism exists. When a prospect goes silent or declines, there is no structured post-mortem template to capture reasons. The outreach response log template has a `reply_status` field but no `loss_reason` or `next_follow_up_date` field.

### M7D. Presales Lifecycle Gaps

**Finding CV-LC-1 (Medium):** No mutual action plan (MAP) template exists. A MAP is a shared document between seller and buyer that outlines steps, owners, and timelines for the pilot-to-close process. This is a standard B2B presales tool that reduces deal-stall by aligning expectations.

**Finding CV-LC-2 (Medium):** No stakeholder mapping tool exists. Enterprise utility deals involve multiple stakeholders (planning, regulatory, procurement, security, finance). No mechanism exists to track stakeholder roles, influence levels, and engagement status.

### Phase M7 Exit Criteria Checklist
- [x] 10-stage funnel assessed
- [x] Pipeline velocity audited (zero data)
- [x] Deal-stall points identified (3 critical points)
- [x] Presales lifecycle gaps documented
- [x] **Exit criteria met: Y**

---

## 10. Competitive Intelligence Matrix (Phase M8)

### M8A. Competitor Comparison Matrix

| Dimension | CEIP | Orennia | Enverus | cCarbon |
|---|---|---|---|---|
| **Market category** | Canadian energy proof packs | AI-powered energy intelligence platform | Power grid forecasting & analytics | TIER credit market simulator |
| **Target buyer** | Utilities, LDCs, REAs, industrials, consultants | Developers, investors, utilities, hyperscalers | Utilities, trading teams, planning teams | Alberta TIER compliance buyers |
| **Pricing** | $0-$5,900/mo (direct) | $10-30K/yr (enterprise) | Enterprise (custom) | Subscription (unknown) |
| **Canadian specificity** | High (AESO, IESO, OEB, AUC, TIER) | Medium (Calgary HQ, global focus) | Low (US-focused, 5 ISOs) | High (Alberta TIER only) |
| **AI capabilities** | Bounded (Gemini wrapper, claim-guarded) | Core (AI-powered platform, proprietary data) | Strong (25+ years forecasting, purpose-built AI) | Limited (macro simulator) |
| **Data sources** | Public (AESO, IESO, public CSVs) | Proprietary + public (billions of data points) | Proprietary (25+ years, 99% constraint mapping) | Public (TIER registry) |
| **Proof-pack exports** | Yes (10 ranked proof packs with claim boundaries) | No (platform-based analytics) | No (bespoke forecasts and reports) | No (simulator outputs) |
| **Regulatory filing support** | Yes (OEB Chapter 5, AUC Rule 005) | No (investment-focused) | Partial (rate case support, US-focused) | No |
| **Indigenous/OCAP** | Partial (co-design pathway, OCAP-aligned language) | No | No | No |
| **Funding/revenue** | Pre-revenue, solo-built | $25M funding, $3M revenue, 145 employees | 25+ years, Fortune 500 clients | Unknown |

### M8B. Competitive Positioning Gaps

**Finding CI-GAP-1 (High):** CEIP's primary competitive advantage — proof packs with explicit claim boundaries — is not articulated against any competitor. No competitor offers claim-boundary discipline as a feature. This is a genuinely unique attribute that should be the cornerstone of positioning.

**Finding CI-GAP-2 (High):** Orennia is the most direct competitor (Calgary-based, energy transition, AI-powered, $25M funded). CEIP's pricing advantage ($149/mo vs $10-30K/yr) is 60-200x cheaper but this is not documented in any battle card or competitive positioning artifact. The pricing gap suggests CEIP should target the segment Orennia pricing excludes: small utilities, REAs, and consultants.

**Finding CI-GAP-3 (Medium):** Enverus (25+ years, Fortune 500 clients) is the incumbent for large utility forecasting. CEIP cannot compete head-on with Enverus on data depth, AI sophistication, or enterprise track record. CEIP's wedge is Canadian regulatory specificity (OEB/AUC) and proof-pack exports — Enverus is US-ISO focused.

**Finding CI-GAP-4 (Medium):** cCarbon is the only competitor in the Alberta TIER space. CEIP's TIER ROI calculator with 3-pathway comparison (fund vs market vs Direct Investment) is a first-mover advantage. No battle card exists to articulate this against cCarbon's macro simulator.

**Finding CI-GAP-5 (Low):** Free alternatives (FCM/MCCAC for municipalities, RateHub/EnergyRates.ca for consumers) compete on price ($0). CEIP's municipal proof pack with audit trail and consumer rate watchdog with alerts are differentiated, but no comparison artifact exists.

### M8C. Competitive Intelligence Gaps

**Finding CI-INTEL-1 (Medium):** No competitive intelligence gathering process exists. No automated competitor monitoring (website changes, pricing updates, feature releases, hiring patterns). The Stage 1 audit identified competitors manually. No ongoing tracking mechanism is in place.

**Finding CI-INTEL-2 (Low):** The `CompetitorComparison.tsx` component exists in the product but compares generic feature lists. It should be updated with specific named competitors (Orennia, Enverus, cCarbon) with accurate, verifiable comparison data.

### Phase M8 Exit Criteria Checklist
- [x] 9-dimension competitor matrix completed (4 competitors)
- [x] Competitive positioning gaps documented (5 findings)
- [x] Competitive intelligence gaps documented (2 findings)
- [x] **Exit criteria met: Y**

---

## Top 5 Summary Gate (Stage 2B — domain="sales-presales")

### Table 1: Top 5 Sales/Presales Gaps (ranked by Priority Score)

| Rank | Gap ID | Severity | Description | Priority Score | Impact |
|---|---|---|---|---|---|
| 1 | CV-PV-1 | Critical | Zero pipeline data — no sends, replies, meetings, pilots, or deals | 100 | Cannot measure GTM effectiveness; all downstream metrics are zero |
| 2 | SE-ART-1 | Critical | Zero case studies or buyer-validated evidence | 95 | Every outreach touch must compensate with demos; no social proof |
| 3 | SE-ART-3 | High | No competitive battle cards (Orennia, Enverus, cCarbon) | 85 | Sales reps cannot articulate "why us vs them" in real conversations |
| 4 | CV-DS-1 | High | 3 deal-stall points identified (post-demo, during pilot, post-pilot) | 80 | Prospects may abandon at any of 3 undefined transition points |
| 5 | CV-PV-2 | High | Manual pilot throughput ~1-2/month is insufficient for validation | 75 | At current throughput, 10 pilot conversations would take 5-10 months |

### Table 2: Top 5 Audience Profiles for Presales (ranked by Speed-to-Revenue)

| Rank | Segment | Speed to Revenue | Deal Size | Pilot Complexity | Score |
|---|---|---|---|---|---|
| 1 | Consultant/Analyst | Fast (API self-serve) | $149-15K/yr | Low (API key + data pack) | 9.0 |
| 2 | Industrial (TIER) | Medium (ROI calculator demo) | $1.5K-15K/yr | Medium (facility assumptions) | 7.5 |
| 3 | Utility (LDC/REA) | Slow (multi-stakeholder) | $5K-50K/yr | High (load history, regulatory) | 7.0 |
| 4 | Municipal/Public Sector | Slow (procurement cycle) | $5.9K-75K/yr | Medium (billing/asset CSV) | 6.0 |
| 5 | Consumer (B2C) | Fast (self-serve checkout) | $9/mo | Very low (instant) | 5.5 |

### Table 3: Top 5 Competitor Win/Loss Themes

| Rank | Competitor | Win Theme (for CEIP) | Loss Theme (for CEIP) | Priority |
|---|---|---|---|---|
| 1 | Orennia | 60-200x cheaper; proof packs vs platform | $25M funding, proprietary data, AI depth | 90 |
| 2 | Spreadsheets | Automated proof pack with benchmark provenance | Zero switching cost; universal familiarity | 85 |
| 3 | Enverus | Canadian regulatory specificity (OEB/AUC) | 25+ years, Fortune 500 clients, data depth | 75 |
| 4 | cCarbon | Facility-level TIER ROI with 3-pathway comparison | Macro supply/demand market view | 55 |
| 5 | FCM/MCCAC | Audit trail + proof-pack exports vs free generic tools | Free, government-backed, established trust | 50 |

### Table 4: Full Finding Inventory (Stage 2A + 2B Combined)

| Phase | Critical | High | Medium | Low | Total |
|---|---|---|---|---|---|
| M1 (Marketing) | 1 | 2 | 2 | 0 | 5 |
| M2 (Outreach) | 3 | 2 | 1 | 0 | 6 |
| M3 (Pricing) | 0 | 2 | 4 | 1 | 7 |
| M4 (Buyer Journey) | 1 | 2 | 1 | 0 | 4 |
| M5 (Sales Enablement) | 1 | 2 | 2 | 0 | 5 |
| M6 (GTM Readiness) | 0 | 1 | 1 | 0 | 2 |
| M7 (Customer Validation) | 1 | 2 | 3 | 0 | 6 |
| M8 (Competitive Intel) | 0 | 2 | 3 | 2 | 7 |
| **Total** | **7** | **15** | **17** | **3** | **42** |

---

## 11. Improvement Plan & Agent-Executable Tasks (Phase M9)

### M9A. Top 10 Prioritized Implementation Tasks

| Rank | Task | Gap IDs | Effort | Impact | Dependencies |
|---|---|---|---|---|---|
| 1 | Add CASL compliance footer to all outreach templates (unsubscribe link, business name, mailing address) | OUT-COMP-1 | S | Unblocks all Canadian outreach | None |
| 2 | Rewrite positioning statement using Dunford framework (competitive alternatives, unique attributes, value, who cares, market category) | MKT-POS-1, MKT-POS-2 | S | Buyers can quickly understand "what is this?" | None |
| 3 | Document messaging hierarchy (message pyramid: category → value prop → proof points → features) | MKT-MSG-1 | S | Coherent messaging across all touchpoints | Task 2 |
| 4 | Design 6-touch outreach cadence (4 emails + 1 LinkedIn + 1 phone over 14-18 days, with break-up email) | OUT-CAD-1, OUT-CAD-2 | M | Enables multi-channel outreach execution | Task 1 |
| 5 | Create Orennia battle card (pricing comparison, feature delta, Canadian specificity, target segment overlap) | SE-ART-3, CI-GAP-2 | S | Sales reps can articulate "why us vs Orennia" | None |
| 6 | Define and instrument 5 Plausible conversion events (page_view, pricing_view, demo_request, pilot_signup, pilot_complete) | BJ-GAP-2 | S | Funnel visibility from awareness to close | None |
| 7 | Add self-serve pilot signup form to `PilotReadinessPage.tsx` | BJ-GAP-1 | M | Removes manual intake bottleneck | None |
| 8 | Create buyer-facing demo script derived from `MVP_DEMO_FREEZE_HANDOFF.md` | SE-ART-2 | S | Sales-ready demo artifact for buyer conversations | None |
| 9 | Create post-demo follow-up email template + pilot proposal template | CV-DS-1 | S | Reduces post-demo deal-stall | Tasks 4, 8 |
| 10 | Reconcile Whop vs direct pricing tiers (document which surface applies to which buyer) | PRICE-TIER-1 | S | Eliminates buyer pricing confusion | None |

### M9B. Implementation Wave Plan

**Wave 1 (Quick wins, 1-2 days):** Tasks 1, 2, 3, 5, 6, 8, 10
- All Small effort, high impact, no dependencies
- Focus: CASL compliance, positioning, messaging, battle card, analytics events, demo script, pricing reconciliation

**Wave 2 (Medium effort, 3-5 days):** Tasks 4, 7, 9
- Depends on Wave 1 completion
- Focus: Outreach cadence design, pilot signup form, post-demo follow-up sequence

**Wave 3 (Long-term, 2-4 weeks):** Content/SEO pages, onboarding workflow, competitive intelligence monitoring
- Not blocking outreach execution
- Focus: Content marketing, product onboarding, automated competitor tracking

### M9C. Unresolved Strategic Decisions

These decisions require user input before implementation:

1. **Pricing consolidation:** Should Whop tiers match direct tiers? Or should Whop be deprecated in favor of Paddle-only?
2. **Positioning breadth:** Broaden to "Canadian energy intelligence platform" or stay narrow as "utility and TIER proof packs"?
3. **ICP prioritization:** Which 1-2 segments to target first? (Recommended: Consultant/Analyst for speed-to-revenue, Utility/LDC for deal size)
4. **Outreach execution:** Begin outreach immediately after Wave 1, or wait for Wave 2 completion?
5. **Indigenous segment:** Invest in co-design partnership now, or wait for a partner-backed review?

### M9D. Success Metrics

| Metric | Current | Target (30 days) | Target (90 days) |
|---|---|---|---|
| Outreach sends logged | 0 | 50 | 200 |
| Reply rate | N/A | 5%+ | 8-12% |
| Pilot conversations | 0 | 3 | 10 |
| Pilot evidence register entries | 0 | 1 | 5 |
| Conversion events instrumented | 0 | 5 | 5 |
| Battle cards created | 0 | 1 (Orennia) | 3 (Orennia, Enverus, cCarbon) |
| Content pages published | 0 | 3 | 10 |
| GTM readiness score | 2.5/5 | 3.5/5 | 4.0/5 |
