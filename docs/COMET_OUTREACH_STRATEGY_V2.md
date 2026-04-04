# CEIP Comet Outreach Strategy V2 — LinkedIn Direct Messaging, Marketplace Prioritization, and Stakeholder Showcase Plan

**Date:** March 9, 2026
**Status:** V2 — Revised after reverting from OpenClaw-first to Comet + manual LinkedIn direct messaging
**Primary objective:** Put the live webapp in front of the right Canadian energy stakeholders immediately using credible, low-friction outreach and stakeholder-safe messaging.
**Primary live URL:** `https://canada-energy.netlify.app`

---

## 1. Executive Reset

This V2 replaces the previous OpenClaw-first operating assumption.

The revised strategy is:

- **Primary channel:** Comet-assisted research + manual LinkedIn direct messaging.
- **Primary goal:** Book qualified conversations and design-partner demos by sharing the live CEIP webapp directly.
- **Primary constraint:** Every message must survive click-through verification on the live site.
- **Primary rule:** We should optimize for **credibility, speed, and stakeholder relevance** rather than automation volume.

### What adversarial reconciliation changes

- **Primary commercial focus:** `Consultant Data Pack` + `Industrial TIER Pack`
- **Primary trust layer:** forecast benchmarking, regulatory filing exports, asset-health scoring, and data-confidence controls
- **Primary sales order:** consultants first, industrial second, municipal / REA / small LDC regulatory buyers third
- **Marketplace stance:** useful later, but **not required** for immediate LinkedIn conversion

### Why this reset makes sense

The codebase has matured materially since the earlier outreach plans:

- The webapp is live on Netlify.
- Enterprise and persona routing exist through `/pricing`, `/enterprise`, `/municipal`, `/roi-calculator`, `/api-docs`, `/regulatory-filing`, and related flows.
- Deterministic forecasts and data-confidence gating were implemented for more credible stakeholder-facing analytics.
- Export-job infrastructure and API-key entitlement flows were added for premium data/compliance workflows.
- Lead capture and intent tracking are already present in the enterprise funnel.

That means the fastest path is no longer “build more automation.” The fastest path is:

1. pick the best live routes,
2. target the right LinkedIn stakeholders,
3. use short, relevant persona-native messages,
4. route each prospect to a page that matches their pain,
5. capture demo intent through the existing enterprise flow.

---

## 2. Current Implementation Snapshot Relevant to Outreach

## 2.1 What is already strong enough to show today

- **Consultant Data Pack**
  - `/api-docs`
  - `/api-keys`
  - `/pricing`
  - `/enterprise?tier=consulting`
- **Industrial TIER Pack**
  - `/roi-calculator`
  - `/compare`
  - `/enterprise?tier=industrial`
- **Trust-layer proof surfaces**
  - `/forecast-benchmarking`
  - `/regulatory-filing`
  - `/asset-health`
- **Secondary municipal / regulatory route**
  - `/municipal`
  - `/enterprise?tier=municipal`
- **Enterprise lead capture**
  - `/enterprise`
  - existing lead persistence + attribution capture

## 2.2 What must be positioned carefully

- **Rate Watchdog**
  - usable as a free awareness wedge
  - should not be sold as bill auditing / peak shaving / guaranteed savings
- **Sovereign / Indigenous data tooling**
  - should be positioned as **OCAP-aligned workflow design / co-development**, not as a fully hardened sovereignty stack
- **Official export workflows**
  - promising, but should be framed as enterprise / sales-assisted / controlled rollout until smoke tests and operational runbooks are fully closed
- **Marketplace availability**
  - the app is deployed publicly, but there is **no completed Snowflake, Microsoft, or AWS marketplace listing** yet

## 2.3 Important outreach constraint discovered during review

Public-facing pricing and municipal pages still had some over-claims relative to the current product state. In this session, those were partially corrected so that stakeholder click-through risk is reduced.

Already corrected in this session:

- pricing claims around Rate Watchdog unsupported features were softened
- industrial pricing copy was made more stakeholder-safe
- sovereign pricing copy was softened from hard guarantees to sales-assisted / aligned language
- municipal procurement / Canoe / sovereignty wording was softened to reflect current status

---

## 3. Marketplace Progress and Best First Platform Choice

The user asked for a close implementation review of Snowflake, Microsoft, and AWS in light of recent code changes.

## 3.1 Snowflake Marketplace — Current status

### What is attractive

- Strong fit for the **Consultant Data Pack** and structured data products.
- Private listings can be free or paid off-platform.
- Good fit for data-sharing conversations with analytics-heavy teams.

### What the current codebase already supports indirectly

- API-key entitlement architecture
- export-job flows
- premium data / compliance-pack positioning
- stakeholder-ready structured outputs

### What is still missing

- no Snowflake-native data product or secure share
- no Snowflake ingestion / replication path from Supabase datasets into Snowflake objects
- no provider profile / listing assets / data dictionary prepared for Snowflake consumption
- no marketplace delivery surface tied to Snowflake account installation

### Implementation assessment

**Status:** best-fit marketplace-adjacent packaging route for the Consultant Data Pack, but not required before LinkedIn outreach starts.

**Reason:** the strongest marketplace logic in this research thread is data-product packaging for consultants, not broad SaaS marketplace expansion. Snowflake becomes relevant once the Consultant Data Pack is tightened into a clearer structured data-share / export offering.

### Source note

Snowflake documents indicate providers can create specified-consumer private listings by attaching database objects / secure shares, setting access type, adding legal terms, optional data dictionary / examples, and publishing to selected consumers.

## 3.2 Microsoft Marketplace — Current status

### What is attractive

- Strong overlap with LinkedIn-driven outreach and enterprise buyers.
- If we use **Contact me** listing mode, Microsoft explicitly states there are **no technical requirements** beyond listing setup and lead handling.
- Corporate buyers often trust Microsoft Marketplace presence as a procurement / credibility signal even before a fully transactable integration exists.

### What the current codebase already supports

- a live, public SaaS app
- enterprise contact flow
- lead capture
- pricing and enterprise sales-assisted paths
- API docs and multiple route-specific demos

### What is still missing for deeper Microsoft integration

- no Microsoft Entra ID SSO onboarding path for marketplace buyers
- no SaaS Fulfillment API integration
- no Microsoft listing assets / landing-page compliance mapping package prepared
- no marketplace-specific trial / provisioning flow

### Implementation assessment

**Status:** useful secondary trust channel, not the first GTM objective.

**Reason:** Microsoft gives a low-code credibility path through **Contact me** listings, but the deeper research in this thread more strongly supports:

- consultant-first sales motion
- regulatory/compliance trust assets
- two-SKU packaging discipline
- marketplace work only after the core offer is sharper

### Source note

Microsoft documentation states the **Contact me** listing option has no technical requirements, whereas transactable / free / trial SaaS offers require Entra ID, landing-page flows, and SaaS Fulfillment API integration.

## 3.3 AWS Marketplace — Current status

### What is attractive

- respected enterprise procurement channel
- long-term fit for paid SaaS and data products
- useful if CEIP later matures into a standardized compliance / analytics SaaS offer

### What the current codebase already supports

- public production deployment
- some enterprise/security hardening already completed
- API / enterprise positioning

### What is still missing

- seller setup, tax, bank, KYC readiness
- AWS Marketplace-specific billing / entitlement integration
- formal customer support packaging and marketplace operations processes
- clearer production-ready support commitments for marketplace review

### Implementation assessment

**Status:** third priority.

**Reason:** AWS is viable later, but it has more operational overhead than Microsoft Contact Me and less immediate synergy with LinkedIn outreach.

### Source note

AWS requires a good-standing AWS account, valid organizational contacts, and for paid products additional tax, bank, eligible jurisdiction, and possible KYC / bank verification steps.

## 3.4 Best first platform recommendation

### Recommendation: **Do not make marketplace the first LinkedIn objective**

For immediate LinkedIn outreach, the best move is to use the live product directly.

If a marketplace-adjacent path is pursued next, the strongest fit from the full research set is:

- **Snowflake private data-share / private listing packaging first** for the Consultant Data Pack
- **Microsoft Contact Me** second as a credibility layer once the pack is clearer
- **AWS Marketplace** later

## 3.5 Recommended platform sequence

1. **No marketplace dependency for initial LinkedIn outreach**
2. **Snowflake private data-share / listing packaging** for Consultant Data Pack
3. **Microsoft Marketplace Contact Me** as a secondary trust channel
4. **AWS Marketplace** after support operations and packaging mature

---

## 4. Revised Outreach Strategy — Specifically What We Should Do

## 4.1 The immediate outreach motion

The prospect should not be sent to the homepage by default.

Each message should deep-link to the route that matches the prospect’s pain.

### Core principle

- **persona-specific route > generic homepage**
- **manual / thoughtful message > scaled automation**
- **specific business pain > broad platform pitch**

## 4.2 Outreach sequence

### Step 1 — Build a focused weekly prospect list in Comet

For each target segment, collect:

- name
- title
- company / organization
- province
- likely pain point
- matching CEIP route
- preferred CTA

### Step 2 — Use signal-first personalization

Each prospect needs one of the following anchors:

- recent post
- recent company initiative
- regulatory / reporting responsibility visible in profile
- geographic fit
- procurement / utility / compliance responsibility inferred from role

### Step 3 — Send a short connection note or direct message

Rules:

- do not lead with AI
- do not oversell maturity
- do not mention features the click-through page cannot prove
- ask for a **brief look / feedback / 10-minute reaction**, not a hard sale

### Step 4 — Route them to a specific proof page

Example mapping:

- consulting analyst → `/api-docs`
- industrial compliance manager → `/roi-calculator`
- municipal sustainability director → `/municipal`
- utility innovation manager → `/regulatory-filing` or `/demand-forecast`
- ESG / sustainable finance stakeholder → `/enterprise` or relevant finance dashboard + enterprise follow-up

### Step 5 — Use enterprise page as the conversion sink

All serious B2B interest should end at:

- `/enterprise`
- `/enterprise?tier=consulting`
- `/enterprise?tier=industrial`
- `/enterprise?tier=municipal`
- `/enterprise?tier=indigenous`

---

## 5. Primary and Secondary Stakeholder Profiles to Start With

## Profile 1 — Energy Consulting Directors / Senior Analysts

- **Why first:** shortest path to revenue, fastest pilot conversion, clear data pain
- **LinkedIn titles:** Energy Analyst, Senior Advisor, Principal Consultant, Climate Analyst, Energy Modeller, Data Lead
- **Best route:** `/api-docs`
- **Backup route:** `/pricing`
- **Primary CTA:** “Would a 10-minute walkthrough of the Canadian energy API be useful?”

## Profile 2 — Industrial Environmental / TIER Compliance Managers

- **Why:** high value and clear ROI narrative
- **LinkedIn titles:** Environmental Manager, TIER Compliance Lead, Regulatory Affairs Manager, EHS Director, Sustainability Manager
- **Best route:** `/roi-calculator`
- **Backup route:** `/compare`
- **Primary CTA:** “Would it help to compare TIER pathways for your facility in a live walkthrough?”

## Profile 3 — Municipal Sustainability Directors / Climate Program Managers

- **Why:** strong institutional pain around reporting and procurement, but slower than consultant and industrial conversion
- **LinkedIn titles:** Sustainability Manager, Climate Action Lead, Environmental Planner, Director of Sustainability, Corporate Energy Manager
- **Best route:** `/municipal`
- **Backup route:** `/enterprise?tier=municipal`
- **Primary CTA:** “Would a 15-minute look at a municipal reporting workflow be useful?”

## Profile 4 — Utility Innovation / Planning / Regulatory Managers

- **Why:** strongest fit for forecasting, regulatory filing, and asset-health proof points once trust assets are packaged
- **LinkedIn titles:** Innovation Manager, Distribution Planning Manager, Regulatory Affairs Manager, Grid Modernization Lead, Utility Data Manager
- **Best route:** `/regulatory-filing`
- **Backup routes:** `/demand-forecast`, `/asset-health`
- **Primary CTA:** “Would a quick look at the regulatory export / forecast benchmark flow be helpful?”

## Profile 5 — Sustainable Finance / ESG / Clean-Tech Investment Stakeholders

- **Why:** high influence, but not one of the first LinkedIn conversion targets for this phase
- **LinkedIn titles:** Director of ESG, Sustainable Finance VP, Investment Associate, Climate Risk Manager, Portfolio Strategy Lead
- **Best route:** `/enterprise`
- **Backup route:** `/compare`
- **Primary CTA:** “Would a short look at stakeholder-ready compliance and data-pack outputs be relevant?”

## Optional Profile 6 — Indigenous Energy Coordinators / Program Leads

- **Use carefully:** partnership and co-design only
- **Best route:** `/funder-reporting` or `/indigenous`
- **Tone:** community-first, not sales-first

---

## 6. Top 15 Areas to Showcase to Senior Management and Stakeholders

These are the most defensible current showcase areas from a monetization and stakeholder-conversion standpoint.

| # | Showcase Area | Best Stakeholders | Why It Matters |
|---|---|---|---|
| 1 | API Docs / Canadian energy data access | Consultants, analysts, utilities | Fastest path to immediate paid interest |
| 2 | Enterprise page / sales-assisted flow | Executives, directors | Clear conversion path for serious buyers |
| 3 | Pricing architecture | Senior management, buyers | Frames monetization ladder and value capture |
| 4 | TIER ROI calculator | Industrial compliance leaders | Strongest near-term industrial proof point |
| 5 | Regulatory filing export | Utilities, municipal, regulatory teams | High-value operational workflow |
| 6 | Demand forecast benchmarking | Utilities, consultants | Shows analytical depth and model discipline |
| 7 | Asset Health Index | Utility asset/planning teams | Practical CSV-driven operational tool |
| 8 | Bank-ready / compliance-pack workflow | Finance, industrial, consulting | Supports premium export / enterprise positioning |
| 9 | Data confidence gating | Senior buyers, regulated teams | Increases trust and credibility |
| 10 | API key / official export entitlement model | Enterprise technical buyers | Demonstrates monetizable access control |
| 11 | Municipal landing / procurement framing | Municipal leaders | Helps public-sector adoption |
| 12 | Competitor comparison | Analysts, budget owners | Makes switching / trial decision easier |
| 13 | Lead capture and attribution flow | Internal leadership | Proves commercialization mechanics exist |
| 14 | ESG / enterprise positioning | Finance and strategy teams | Opens higher-value conversations |
| 15 | Cross-linked persona routes | All segments | Reduces friction from message to action |

---

## 7. Pricing Strategy Review — Are We Ready?

## 7.1 What is already good

- There is a visible price ladder.
- There are persona-relevant enterprise routes.
- There is separation between low-touch and sales-assisted motions.
- Direct pricing exists for professional, industrial, municipal, and sovereign offers.
- The enterprise page supports lead capture and manual close.

## 7.2 What is not fully aligned yet

### Gap A — Pricing claims and product proof are still not perfectly aligned

Examples discovered during review:

- unsupported Rate Watchdog feature promises had been present
- some industrial pricing copy overstated pricing certainty and ROI
- sovereign / municipal language needed softening

### Gap B — Tier naming is inconsistent across the codebase

There is a mismatch between:

- direct pricing tiers in `pricingCatalog.ts`
- canonical entitlement tiers in `src/lib/entitlements.ts`
- enterprise / API-key entitlement language in other parts of the system

This is a monetization clarity issue and a future operations issue.

### Gap C — Professional/API packaging is strong, but not yet fully productized

- API access is present in messaging
- enterprise data access and official exports are sales-assisted
- self-serve provisioning / metering / production proof are not yet clean enough to anchor aggressive outreach promises

## 7.3 Pricing conclusion

### Short answer

**Yes, the pricing strategy is directionally right for outreach, but not fully polished for scaled monetization.**

### Best use right now

- use pricing as a **credibility anchor**, not the opening line
- use specific pain + specific route first
- introduce price only after interest or in late-stage follow-up

---

## 8. Priority Gap Analysis

## High Priority

### H1 — One canonical outreach-safe message layer is not fully enforced across live routes

**Why it matters:** LinkedIn prospects will click through and evaluate trust in seconds.

**Needed:**

- clean public-facing claims
- remove unsupported guarantees
- keep route copy consistent with actual product maturity

### H2 — No single marketplace credibility badge/listing exists yet

**Why it matters:** the current research-backed LinkedIn motion depends on tight packaging, not broad platform sprawl.

**Needed:**

- make `Consultant Data Pack` and `Industrial TIER Pack` the canonical commercial story
- keep forecast benchmarking, regulatory templates, and data-confidence controls as the proof stack
- defer broad marketplace work until the pack story is sharper

### H3 — No single “stakeholder quick tour” page exists

**Why it matters:** Right now the best journey is route-specific, but there is no single executive overview page tailored for shared links from DMs.

**Recommended next build:**

- a short `/stakeholder-overview` or `/solutions` page linking the top proof points by persona

### H4 — Pricing / entitlement model consistency still needs normalization

**Why it matters:** messaging, billing, and entitlement should use one clear commercial taxonomy.

**Needed:**

- normalize naming between pricing page, pricing catalog, entitlements, API key tiers, and enterprise sales language

## Medium Priority

### M1 — Persona-specific proof bundles are not packaged enough

Needed:

- one-pager or Loom per persona
- route-specific proof checklist
- stronger “what to show first” internal operating guide

### M2 — API monetization is promising but still partially sales-assisted

Needed:

- usage visibility
- cleaner API key provisioning narrative
- clearer public explanation of official exports vs API access vs enterprise data access

### M3 — Regulatory / export workflows need final operations hardening

Needed:

- final smoke / QA closure
- scheduler verification
- full operational runbook for official exports

### M4 — Municipal procurement proof is still mostly narrative, not procurement-packaged

Needed:

- municipal buyer one-pager
- procurement FAQ vetted by counsel / purchasing advisors
- clearer boundary between “positioned below threshold” and “automatically purchasable”

## Low Priority

### L1 — AWS marketplace integration
### L2 — Snowflake-native data packaging
### L3 — Mature sovereign data infrastructure commercialization
### L4 — B2C Rate Watchdog paid motion

---

## 9. Immediate Execution Plan

## Phase 1 — This week

1. Use the live Netlify app immediately in LinkedIn outreach.
2. Lead with **Consultant Data Pack** and **Industrial TIER Pack**.
3. Start with 3 segments only:
   - consulting
   - industrial TIER
   - municipal / regulatory buyers
4. Build a 30–50 prospect list in Comet.
5. Send manually reviewed messages only.
6. Route every prospect to a proof page that matches the pack being sold.

## Phase 2 — Next 7–10 days

1. Create a stakeholder overview page or executive proof bundle.
2. Normalize commercial messaging across pricing and enterprise surfaces.
3. Package 2–3 demo assets:
   - API walkthrough
   - TIER workflow walkthrough
   - regulatory / municipal reporting walkthrough
4. Draft Snowflake private data-share packaging requirements for the Consultant Data Pack.

## Phase 3 — Next 2–4 weeks

1. Build Snowflake data-pack packaging plan.
2. Add persona-specific follow-up collateral and meeting scripts.
3. Use Microsoft Contact Me only if a marketplace credibility artifact is still needed.
4. Decide if AWS is still worth near-term pursuit.

---

## 10. Message Architecture for Comet + LinkedIn

## 10.1 Connection note structure

- personalization anchor
- one relevant pain point
- one concrete route / artifact
- soft CTA

## 10.2 Follow-up message structure

- remind them why they were targeted
- ask one practical question
- give one route to click
- offer a short walkthrough

## 10.3 What not to lead with

- “AI-powered”
- “used by X customers” unless verified
- procurement guarantees
- sovereignty guarantees
- unsupported Rate Watchdog savings claims
- transactable marketplace availability before it exists

---

## 11. Recommended Starting Segment Order

1. **Consulting firms**
   - fastest to conversations
   - lowest organizational friction
   - easiest route to paid pilot or annual data-pack discussion

2. **Industrial TIER buyers**
   - high value
   - strong ROI conversation
   - good fit for bank-ready / compliance-pack narrative

3. **Municipal stakeholders**
   - slower than consulting, but high-trust and structured
   - easier if framed around reporting, Rule 005 / OEB-style exports, and operationalization

4. **REA / small LDC regulatory and planning leads**
   - strategically strong once regulatory / asset-health proof is packaged

5. **Selected Indigenous co-design / grant-funded conversations**
   - high upside, but only with partnership-first positioning

---

## 12. Recommended Immediate Internal KPIs

Track weekly:

- profile acceptance rate
- reply rate
- click-through by route
- demo requests
- enterprise form submissions
- stakeholder segment by meeting booked
- route that generated the meeting

Suggested targets for the first 3 weeks:

- **acceptance rate:** 30%+
- **reply rate:** 12%+
- **meeting rate:** 3–5 meetings from first 50 quality prospects
- **primary segment winner:** consulting or industrial

---

## 13. Final Recommendation

### Best platform to pair with LinkedIn outreach right now

**No marketplace is required for immediate LinkedIn outreach. If one is pursued next, Snowflake private data-share packaging is the best strategic fit for the Consultant Data Pack.**

### Best immediate message-to-page pairing

- consultant → `/api-docs`
- industrial → `/roi-calculator`
- municipal → `/municipal`
- utility/regulatory → `/regulatory-filing`
- finance stakeholder → `/enterprise`

### Best first monetization motion

**Sell the Consultant Data Pack and Industrial TIER Pack through sales-assisted B2B demos, using forecast benchmarking, regulatory exports, and data-confidence controls as the trust layer.**

### Best next implementation moves

1. finish messaging cleanup across public routes
2. create a stakeholder overview / executive proof page
3. tighten consultant-pack / industrial-pack packaging across public assets
4. prepare Snowflake private data-share packaging after the offer story is sharper

---

## 14. What changed in V2 vs the prior outreach approach

- reverted from OpenClaw-first to Comet + manual LinkedIn direct messaging
- shifted from automation emphasis to credibility-first outreach
- re-centered the strategy on two primary SKUs and compliance-led trust assets
- moved marketplace work behind the immediate LinkedIn conversion motion
- emphasized route-specific proof pages instead of generic platform messaging
- tightened the relationship between live implementation maturity and outreach claims
- highlighted copy/claim cleanup as a real monetization blocker, not just a copy issue

---

*This V2 should be treated as the current canonical outreach strategy for CEIP until marketplace listing work and persona-proof packaging advance further.*
