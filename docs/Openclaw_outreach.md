# CEIP Outreach Strategy — Hermes-First Operating Playbook

**Date:** May 4, 2026 (v6.0 — Hermes Primary, OpenClaw Secondary)

> **⚡ v6.0 REALIGNMENT APPLIED:** (1) Hermes is now the primary CEIP outreach operating system on this workstation, (2) OpenClaw is retained only as optional browser-side support, (3) outreach centers on the frozen MVP proof stack from `Top20.md`, (4) older `/demand-forecast` and `/overview` primacy is retired behind stronger live proof lanes, (5) TIER copy is reconciled with the current site pricing basis, (6) Campaign 2 remains relationship-first and non-automated.
**Primary tool:** Hermes gateway + CEIP outreach skills and scripts under `~/.hermes` and `/Users/sanjayb/hermes-ops-private/skills/outreach/`
**Secondary tool:** Local OpenClaw gateway (`http://127.0.0.1:3001/`) + browser support profile (`ceip-outreach`)
**Aligned with:** `DEEP_RESEARCH_GTM_STRATEGY_2026.md` + `ADVERSARIAL_USP_ANALYSIS.md`
**Live URLs:** All pages deployed at `https://canada-energy.netlify.app`

> **Migration Note:** This version supersedes both Comet-first execution and OpenClaw-first execution. Outreach control now runs through Hermes. OpenClaw remains an optional operator aid for browser inspection and draft review only.

> **Companion execution docs:**
> - `docs/HERMES_OUTREACH_OPERATING_PLAN.md` (primary daily and weekly operator runbook)
> - `docs/OPENCLAW_MONETIZATION_IMPLEMENTATION_DELIVERABLE.md` (phase owners, KPI thresholds, acceptance gates)
> - `docs/OPENCLAW_CONSOLE_KICKSTART_STRATEGY.md` (secondary OpenClaw support runbook)

> **CRITICAL RULE:** Every claim in outreach must be verifiable by the prospect clicking through.
> See `ADVERSARIAL_USP_ANALYSIS.md` for what we can and cannot claim.

> **Primary MVP proof stack to reference first:**
> - Utility planning lane — `/utility-demand-forecast`
> - Regulatory export lane — `/regulatory-filing`
> - Utility trust / security — `/utility-security`
> - UtilityAPI / Green Button sandbox — `/utilityapi-demo`
> - Forecast benchmarking trust layer — `/forecast-benchmarking`
>
> **Secondary proof pages now safe to use in outreach:**
> - Asset Health Index (CSV-based CBRM-lite scoring, no SCADA required) — `/asset-health`
> - Open API docs — `/api-docs`
> - Municipal landing page — `/municipal`
> - TIER calculator — `/roi-calculator`
> - Credit Banking — `/credit-banking`
> - Shadow Billing — `/shadow-billing`
> - Indigenous reporting / AICEI — `/funder-reporting`, `/aicei`

---

## TABLE OF CONTENTS

1. [Safety Rules & Rate Limits](#1-safety-rules--rate-limits)
2. [Master Outreach Drafter Template](#2-master-outreach-drafter-template)
3. [Campaign 1: Energy Consulting Firms (Fastest Revenue)](#campaign-1-energy-consulting-firm-api-access)
4. [Campaign 2: Indigenous Energy Coordinators (Blue Ocean)](#campaign-2-indigenous-energy-coordinators)
5. [Campaign 3: Municipal Sustainability Officers (B2G)](#campaign-3-municipal-sustainability-officers)
6. [Campaign 4: Industrial TIER Compliance Managers](#campaign-4-industrial-tier-compliance-managers)
7. [Campaign 5: Alberta Residential / Rate Watchdog (B2C)](#campaign-5-alberta-rate-watchdog-b2c)
8. [Weekly Cadence & Scaling Plan](#weekly-cadence--scaling-plan)
9. [Tracking & Optimization](#tracking--optimization)
10. [MVP Proof Stack & UI Verification (May 2026)](#mvp-proof-stack--ui-verification-may-2026)
11. [Optional Future Items (Not Committed)](#optional-future-items-not-committed)

---

## 1. Safety Rules & Rate Limits

**Non-negotiable rules for every outreach drafting session:**

- Personalize every message with 1-2 specific details from the prospect's profile or recent posts
- Connection notes: **≤250 characters** (LinkedIn hard limit)
- Follow-up DMs: **3-4 sentences max**, end with an open question
- Add **2-5 minute natural delays** between actions
- **Engage first:** Like + comment on 1-2 recent posts BEFORE sending connection request
- Daily caps: **10-20 connection requests** + **20-30 engagements** (likes/comments)
- Weekly cap: **≤50 new requests/week** initially; increase to 100 only after acceptance rate >50%
- **Never pitch in the connection note** — value-first, curiosity-based only
- Target **2nd-degree connections** whenever possible (higher acceptance rates)
- **Stop immediately** if LinkedIn shows any warning, restriction, or CAPTCHA
- Log every action: prospect name, action taken, response received

---

## 2. Master Outreach Drafter Template

Use this as the base prompt in Hermes, or in OpenClaw only when you explicitly need browser-side support:

```
You are my safe CEIP outreach drafter.

CONTEXT: CEIP is a Canadian energy intelligence platform with live utility planning, regulatory filing, utility security, forecast benchmarking, API, TIER, municipal, and Indigenous reporting proof surfaces. Built by a Senior Technology & Management Consultant. Early-stage, seeking design partners and beta testers. Live at https://canada-energy.netlify.app

IMPORTANT — DO NOT CLAIM:
- "AI-powered" as a primary differentiator
- Any market-credit price as "live" unless you explicitly have a current external quote; the site defaults to a fallback planning snapshot
- Any TIER fund price other than the current CEIP planning basis of $110/t unless the site/source changes
- "Used by consultants" or any social proof we don't have
- "Nation-held encryption keys" or "full data sovereignty" (Indigenous tooling is OCAP-aligned / early-access, not hardened sovereignty infrastructure)
- "Bill auditing" or "peak shaving alerts" for Rate Watchdog
- Production utility onboarding, London Hydro readiness, or bridge certification

GOAL: Build genuine connections with {TARGET_PERSONA}. We are NOT selling — we are offering free tools, beta access, and partnership opportunities. Position as honest early-stage builder seeking feedback.

SAFETY: Follow 2026 LinkedIn best practices. Personalize deeply, engage content first (like + comment thoughtfully), add natural 2-5 min delays between actions, limit to 15-20 connection requests/day max, keep messages short and conversational. Stop if ANY warning appears.

DEFAULT MVP PROOF ORDER:
1. /utility-demand-forecast
2. /regulatory-filing
3. /utility-security
4. /utilityapi-demo
5. /forecast-benchmarking

STEPS FOR EACH BATCH:
1. Search LinkedIn: {SEARCH_QUERY} — collect 15-20 results
2. For each prospect: Visit profile, note 2-3 details (recent post, role, company, shared connection)
3. Engage first: Like their latest post + leave 1 genuine comment related to their content
4. Wait 1-2 days, then send personalized connection request (≤250 chars) using the template below
5. If accepted: Wait 2-3 days, then send short follow-up DM
6. Log all actions in a tracking sheet: Name | Company | Action | Date | Response

CONNECTION NOTE TEMPLATE:
{PASTE_TEMPLATE_BELOW}

FOLLOW-UP DM TEMPLATE:
{PASTE_TEMPLATE_BELOW}

Start with 10 prospects today. Show me drafts for approval before sending.
```

---

## Campaign 1: Energy Consulting Firm API Access

**Priority:** HIGHEST (fastest path to first dollar)
**GTM Score:** 7.5/10
**Target MRR:** $2,500 by Month 3
**Pricing:** $149/mo Professional or $5K-15K/yr per firm
**Live demo URLs:**
- API docs: `https://canada-energy.netlify.app/api-docs`
- Utility planning lane: `https://canada-energy.netlify.app/utility-demand-forecast`
- Regulatory filing: `https://canada-energy.netlify.app/regulatory-filing`
- Benchmarking trust: `https://canada-energy.netlify.app/forecast-benchmarking`

### Target Companies & Roles

| Company | Location | Size | Target Titles |
|---------|----------|------|---------------|
| **Dunsky Energy + Climate Advisors** | Montreal | 65 | Energy Analyst, Senior Advisor, Data Lead |
| **ICF Canada** | Ottawa/Calgary | 100+ | Energy Consultant, Climate Analyst |
| **GLJ Ltd** | Calgary | 50+ | Energy Analyst, Transition Advisor |
| **Navius Research** | Vancouver | 20+ | Research Analyst, Energy Modeller |
| **Econoler** | Quebec City | 80+ | Energy Efficiency Consultant |
| **Posterity Group** | Ottawa | 30+ | Climate Policy Analyst |
| **Intrinsik** | Calgary | 40+ | Environmental Consultant |

### Search Query

```
"Energy Analyst" OR "Energy Consultant" OR "Climate Analyst" AND (Dunsky OR ICF OR GLJ OR Navius OR Econoler OR "energy consulting") AND Canada
```

### Connection Request Note (≤250 chars)

**Template A — Data Pain Hook:**
```
Hi {FirstName}, saw your work on {specific: e.g., Alberta grid analysis at {Company}}. I built a Canadian energy API (44 endpoints, AESO/IESO/ECCC data) at a fraction of Orennia's cost. Looking for analyst beta testers — connect?
```

**Template B — Post-Engagement Hook:**
```
Hi {FirstName}, great point in your post about {topic}. I've been building Canadian energy data tools for analysts — 44 API endpoints covering grid, carbon, and provincial data. Would love your feedback!
```

**Template C — Beta Tester Hook:**
```
Hi {FirstName}, noticed we both work in Canadian energy analytics. I built an open API with AESO/IESO grid data — looking for 5 analyst beta testers who'll get free Pro access. Interested?
```

### Follow-Up DM (if accepted)

**Template A — Beta Access Offer:**
```
Thanks for connecting, {FirstName}! Your work at {Company} on {topic} caught my eye.

Quick question: how much time does your team spend pulling AESO/IESO data manually? I built an API with 44 endpoints covering Canadian grid data, emissions, and TIER credits — Python/Excel friendly.

I'm offering free Pro access to 5 beta testers in exchange for feedback on data accuracy: https://canada-energy.netlify.app/api-docs

What's your biggest data headache right now?
```

**Template B — Price Comparison:**
```
Appreciate the connection, {FirstName}! I noticed {Company} is doing interesting work on {topic}.

I've been building a Canadian energy data platform — 44 API endpoints covering AESO pool price, IESO demand, emissions, provincial generation, and TIER credits. Similar data to Orennia but at $149/mo vs their $10-30K/yr.

Would a quick 5-min walkthrough be useful? Here's the API docs: https://canada-energy.netlify.app/api-docs

Curious what data sources your team relies on most?
```

### Follow-Up #2 (if no reply after 5 days)

```
Hey {FirstName}, no worries if you're swamped. Just wanted to share this quick comparison of CEIP vs. alternatives for Canadian energy data: https://canada-energy.netlify.app/compare

The API is free to try for 30 days — no commitment. Let me know if I can help with anything!
```

---

## Campaign 2: Indigenous Energy Coordinators

**Priority:** HIGH (No competitor is attempting OCAP-aligned energy analytics)
**GTM Score:** 9.5/10 (opportunity) / 6/10 (product readiness — needs community co-design)
**Target MRR:** $12,500 by Month 6 (requires co-design partner first)
**Pricing:** $2,500/mo (fits ISC "Capacity Building" grant budgets)
**Live demo URLs:**
- Funder Reporting: `https://canada-energy.netlify.app/funder-reporting` (Early Access)
- OCAP Data Vault: `https://canada-energy.netlify.app/sovereign-vault` (Early Access)
- Indigenous Dashboard: `https://canada-energy.netlify.app/indigenous`

**⚠️ HONESTY NOTE:** The OCAP architecture is designed but NOT production-hardened. Encryption is not yet implemented. Funder reporting uses template scaffolding with demo data. We MUST position this as seeking a co-design partner, not selling a finished product.

### Target Organizations & Roles

| Organization | Type | Target Titles |
|-------------|------|---------------|
| **ICE Network** (Indigenous Clean Energy) | Network (1,500+ members) | Program Director, Energy Coordinator |
| **First Nations Power Authority (FNPA)** | Saskatchewan utility | Executive Director, Project Manager |
| **Wataynikaneyap Power** | Ontario transmission | Energy Coordinator, Community Liaison |
| **Individual First Nations** with active energy projects | Community | Energy Coordinator, Band Administrator, Economic Development Officer |
| **Aboriginal Financial Officers Association (AFOA)** | Professional body | Members working on energy projects |
| **20/20 Catalysts** | Impact consultancy | Indigenous energy advisors |

### 🚨 CRITICAL PROTOCOL CHANGE (v4.0) — NO COLD INDIVIDUAL LINKEDIN DMs FOR CAMPAIGN 2

**Why:** Indigenous professional networks in Canada are high-trust, relationship-first. Cold outreach from an unknown individual — even with respectful OCAP language — risks being flagged as extractive. The appropriate entry is at the **organizational level**, through established community channels.

**New Entry Strategy: Org-Level Outreach → Events → Introduction → Individual**

---

### Step 1 — Email ICE Network Directly (Week 1, Before Any LinkedIn Activity)

**ICE Network contacts (Indigenous Clean Energy, Ottawa):**
- **Executive Director:** James Jenkins — jjenkins@indigenouscleanenergy.com
- **Associate Executive Director:** Terri Lynn Morrison — tlmorrison@indigenouscleanenergy.com
- **General:** info@indigenouscleanenergy.com
- **Phone:** 613-416-9300 ext 700

**Email Template — ICE Network Partnership Inquiry:**
```
Subject: Partnership Inquiry — CEIP OCAP-Aligned Energy Data Platform

Dear James / Terri Lynn,

I'm Sanjay Bhargava, a Technology Consultant who has published research on GenAI for Canadian utilities and is now building CEIP (Canada Energy Intelligence Platform) — designed from the ground up with OCAP principles.

CEIP currently includes:
• Funder report templates for Wah-ila-toos/CERRC/Northern REACHE programs
• Data residency controls + consent logging architecture
• Indigenous Energy Dashboard: https://canada-energy.netlify.app/indigenous

I recognize that real OCAP alignment requires genuine community co-design — not a developer working in isolation. I'm writing to ask whether ICE Network would be open to reviewing CEIP as a potential member resource, or whether you could point me toward the right process for a technology partner to engage with the ICE community respectfully.

I am NOT seeking to sell to communities. I'm seeking ONE co-design partner who would guide what gets built, with free access and full input into the architecture.

Would a brief call to explore this be appropriate?

Warm regards,
Sanjay Bhargava
Senior Technology & Management Consultant
[Phone] | [LinkedIn profile URL]
```

---

### Step 2 — Attend ICE Gathering or Regional Events (Month 2+)

| Event | When | Approach |
|-------|------|----------|
| **ICE Gathering** (annual ICE Network event) | Check icenet.work for dates | Attend as community learner, not exhibitor |
| **Regional Indigenous clean energy forums** | Province-specific | Find via FNPA, Wataynikaneyap connections |
| **RES Canada / AFREA** | Annual | Network with Indigenous project leads |

**At events:** Introduce yourself as a technology consultant building CEIP. Have the demo ready on your laptop. Do NOT distribute pitch decks. Listen first.

---

### Step 3 — LinkedIn ONLY after org-level relationship exists

Once ICE Network has responded positively OR an event contact has expressed interest:
- THEN send a LinkedIn connection request — referencing the prior introduction
- Do NOT use OpenClaw automation for this campaign AT ALL
- All Campaign 2 LinkedIn interactions are manual and relationship-based

**Manual LinkedIn Note (only after intro/warm context):**
```
Hi {FirstName}, great to [meet at ICE Gathering / connect via ICE Network introduction]. 
As I mentioned, I'm building OCAP-aligned energy tools and would value your perspective. 
Happy to continue the conversation here!
```

### Important Notes for This Campaign

- **NO OpenClaw automation** for Campaign 2 — ever. All touchpoints are human and deliberate.
- **TONE:** Humble, collaborative, learning-oriented. Never position as "selling to" — always "building with."
- **LANGUAGE:** Use "community" not "client." Use "partnership" not "sales."
- **TIMELINE:** Realistic first co-design partner: Month 4-6. Do not rush.
- **EVENTS:** Budget for attending at least 1 ICE-related event in 2026.

---

## Campaign 3: Municipal Sustainability Officers

**Priority:** HIGH (sub-NWPTA threshold = no RFP required)
**GTM Score:** 7.0/10
**Target MRR:** $11,800 by Month 9
**Pricing:** $5,900/mo ($70,800/yr — below $75K NWPTA sole-source threshold)
**Live demo URLs:**
- Municipal Landing: `https://canada-energy.netlify.app/municipal`
- ROI Calculator: `https://canada-energy.netlify.app/roi-calculator`
- Regulatory Filing: `https://canada-energy.netlify.app/regulatory-filing`
- Asset Health: `https://canada-energy.netlify.app/asset-health`
- Enterprise Contact: `https://canada-energy.netlify.app/enterprise?tier=municipal`

### Target Municipalities (Alberta Focus)

| Municipality | Population | Target Titles |
|-------------|-----------|---------------|
| **Red Deer** | 106K | Sustainability Director, Environmental Coordinator |
| **Lethbridge** | 104K | Climate Action Lead, Environmental Services |
| **Airdrie** | 80K | Environmental Coordinator |
| **Strathcona County** | 99K | Sustainability Manager |
| **Cochrane** | 35K | Environmental Planner |
| **Foothills MD** | 23K | Environmental Coordinator |
| **Rocky View County** | 42K | Sustainability Planner |
| **Parkland County** | 33K | Environmental Services |

### Search Query

```
("Sustainability" OR "Climate" OR "Environmental" OR "GHG") AND ("Coordinator" OR "Director" OR "Manager" OR "Planner") AND ("municipality" OR "county" OR "city of" OR "town of") AND Alberta
```

### Connection Request Note (≤250 chars)

**Template A — Free Audit Hook:**
```
Hi {FirstName}, saw {Municipality}'s climate action work. I built a free GHG baseline audit tool for Alberta municipalities — no RFP needed (under $75K). Would love to share it. Connect?
```

**Template B — MCCAC Reference:**
```
Hi {FirstName}, fellow MCCAC workshop attendee interest here. I've been building municipal climate reporting tools aligned with FCM requirements. Happy to share a free demo — connect?
```

**Template C — Procurement-Friendly:**
```
Hi {FirstName}, noticed {Municipality}'s sustainability goals. I built climate tracking tools priced for sole-source procurement (<$75K NWPTA). No lengthy RFP. Would love to show you!
```

### Follow-Up DM (if accepted)

**Template A — Free Baseline Audit:**
```
Thanks for connecting, {FirstName}! Great to see {Municipality}'s commitment to climate action.

I'd like to offer you a completely free Climate Baseline Audit — it takes about 30 minutes and gives you a snapshot of your municipality's GHG profile, TIER credit opportunities, and grant eligibility (FCM, MCCAC).

The tool is specifically designed for Alberta municipalities: https://canada-energy.netlify.app/municipal

One thing that makes it procurement-friendly: annual cost is $70,800 — deliberately below the NWPTA $75K sole-source threshold, so there's no RFP required for most municipalities.

Would a 30-minute walkthrough next week work? Happy to do it over Teams/Zoom.
```

**Template B — For CAOs/Decision-Makers:**
```
Appreciate the connection, {FirstName}! I know municipal budgets are tight, so I'll be direct.

I built a climate reporting platform that auto-generates council-ready quarterly reports, tracks your TIER credits, and pre-fills FCM grant templates. It's priced at $70,800/yr — deliberately below the $75K NWPTA sole-source threshold so you don't need an RFP.

Here's how it works in 3 steps: https://canada-energy.netlify.app/municipal

Would you be open to a free 30-day baseline audit? No commitment — you keep the report either way.
```

> **⚠️ REMOVED:** "Available through Canoe Procurement (application pending)" — do not include this claim until you are confirmed listed on the Canoe vendor directory. Confirmed removal: v4.0 March 2026.

---

## Campaign 4: Industrial TIER Compliance Managers

**Priority:** MEDIUM (longer sales cycle but high ACV)
**GTM Score:** 6.5/10
**Target MRR:** $13,000 by Month 12
**Pricing:** $1,500/mo + 20% of documented savings
**Live demo URLs:**
- ROI Calculator: `https://canada-energy.netlify.app/roi-calculator`
- Competitor Comparison: `https://canada-energy.netlify.app/compare`
- Enterprise Contact: `https://canada-energy.netlify.app/enterprise?tier=industrial`

### Target Companies (Alberta Mid-Tier Emitters)

| Company Type | Examples | Target Titles |
|-------------|----------|---------------|
| **Cement / Concrete** | Lehigh Hanson, Lafarge Edmonton | Environmental Manager, Compliance Lead |
| **Chemical Manufacturing** | Dow Fort Saskatchewan, Sherritt | EHS Director, Sustainability Manager |
| **Midstream Oil & Gas** | Pembina, Inter Pipeline | Regulatory Affairs, Environmental Compliance |
| **Fertilizer / Ag-Chem** | Nutrien, CF Industries | Environmental Engineer |
| **Pulp & Paper** | West Fraser, Alberta Newsprint | Environmental Coordinator |

### Search Query

```
("Environmental" OR "Compliance" OR "Sustainability" OR "EHS" OR "Regulatory") AND ("Manager" OR "Director" OR "Lead" OR "Engineer") AND ("TIER" OR "carbon" OR "emissions" OR "GHG") AND Alberta
```

### Connection Request Note (≤250 chars)

> **⚡ v5.0 — TIER CLAIM UPDATE:** CEIP now anchors the calculator to the current 2026 planning basis of `$110/t` for fund payment. Market-credit pricing in-route is a fallback planning snapshot and must be replaced by a live quote or registry-backed market view before buyer approval. Do not send cold outreach that treats fallback market pricing as a live transaction quote.

**Template A — Compliance Pathway Hook:**
```
Hi {FirstName}, noticed your TIER/compliance work at {Company}. I built a 3-pathway calculator anchored to the current Alberta fund basis ($110/t) with explicit market-quote replacement before approval. Useful to compare fund vs credits vs Direct Investment?
```

**Template B — Direct Investment Hook:**
```
Hi {FirstName}, saw {Company}'s sustainability work. With the new Direct Investment pathway under TIER, I built a compliance calculator comparing all 3 pathways. Happy to share — connect?
```

**Template C — Scenario Audit Hook:**
```
Hi {FirstName}, noticed your environmental compliance role at {Company}. I built a TIER workflow that separates fund payment, planning-market scenario, and Direct Investment with explicit pricing provenance. Worth a look?
```

**Template D — Consultant Credibility Hook (NEW in v4.0):**
```
Hi {FirstName}, I published analysis on GenAI for Canadian utilities and went deep on TIER compliance modelling. Built a 3-pathway calculator (fund vs EPC vs Direct Investment). Might be useful for {Company}?
```
*(Link your Canada utilities article in the follow-up DM)*

### Follow-Up DM (if accepted)

**Template A — ROI Calculator Lead (CURRENT SITE TRUTH):**
```
Thanks for connecting, {FirstName}! Your compliance work at {Company} is right in my wheelhouse.

Quick question: is {Company} currently treating TIER as a fund-payment exercise, or are you actively comparing market credits and Direct Investment options?

The reason I ask is that CEIP now frames this as a three-pathway decision with explicit pricing provenance: current Alberta planning basis for the fund, a clearly labeled market-credit fallback scenario, and Direct Investment. It is useful for CFO/compliance conversations because it shows what still needs a live broker quote versus what is already fixed by published policy.

I built a calculator that models this exactly: https://canada-energy.netlify.app/roi-calculator

It also covers the Direct Investment pathway and ties into a follow-on credit banking workflow. Would a 15-minute walkthrough be useful?
```

**Template B — Subject Matter Expert Approach (CURRENT SITE TRUTH):**
```
Appreciate the connection, {FirstName}! I've been deep in the TIER compliance space — I also published analysis on GenAI for Canadian utilities if you'd like background context.

Current TIER data points:
• Fund price: $110/t planning basis in the current CEIP workflow
• Market-credit value in CEIP: fallback planning snapshot only until replaced by a live quote
• New Direct Investment pathway: capex can offset compliance obligations

I built a calculator that models the optimal compliance pathway across all three options: https://canada-energy.netlify.app/roi-calculator

⚠️ Note: the market-credit path should always be replaced with a live broker or registry-backed quote before approval.

If it helps, I can also show the follow-on credit allocation and audit trail workflow: https://canada-energy.netlify.app/credit-banking
```

> **⚡ MONTHLY MAINTENANCE REQUIRED:** If you want to use a real market-credit number in outbound, update it monthly from a current broker or registry-backed source and mark it `as of [month year]`. Otherwise keep cold outreach on the provenance-safe planning language above.

---

## Campaign 5: Alberta Rate Watchdog (B2C — Lead Gen)

**Priority:** LOW for LinkedIn (primary channels are Reddit/YouTube/Facebook)
**GTM Score:** 6.0/10
**Current state:** Free rate comparison tool. Retailer data needs updating.
**Pricing:** Free (do NOT charge $9/mo until bill upload + real alerts are built)
**Live URL:** `https://canada-energy.netlify.app/watchdog`

**⚠️ HONESTY NOTE:** Rate Watchdog currently provides rate comparison only. It does NOT do bill auditing, peak shaving alerts, or personalized savings calculations. Do NOT claim these features in any outreach. Charge only after features match promises.

### Note: LinkedIn is NOT the primary channel for B2C

LinkedIn outreach for Rate Watchdog should target **influencers and amplifiers**, not end consumers. Primary B2C channels are Reddit, YouTube, and Facebook (see GTM strategy).

### Target LinkedIn Profiles (Amplifiers Only)

| Role | Why | Volume |
|------|-----|--------|
| **Real estate agents** in Calgary/Edmonton | Recommend to new homebuyers | 20-30 |
| **Personal finance influencers** in Alberta | Content amplification | 10-15 |
| **Energy bloggers / journalists** | Media coverage | 5-10 |
| **Property managers** in Alberta | Recommend to tenants | 10-15 |

### Search Query

```
("Real Estate Agent" OR "Realtor" OR "Property Manager" OR "Personal Finance") AND (Calgary OR Edmonton OR Alberta) AND (energy OR electricity OR utilities)
```

### Connection Request Note (≤250 chars)

**Template A — For Realtors:**
```
Hi {FirstName}, love your Calgary real estate content. I built a free Alberta electricity rate comparison tool — helps buyers compare RoLR vs fixed rates before closing. Thought it might be useful!
```

**Template B — For Finance Influencers:**
```
Hi {FirstName}, great post on {financial topic}. I built a free Alberta electricity rate comparison tool that shows RoLR vs competitive retailer rates side-by-side. Might interest your Alberta audience!
```

### Follow-Up DM (if accepted)

```
Thanks for connecting, {FirstName}!

I built "Alberta Rate Watchdog" — a free tool that compares RoLR rates against competitive retailers and tracks AESO pool prices. It helps Albertans see whether they should switch electricity providers.

I'm looking for a few Alberta realtors/influencers who'd be interested in sharing it with their audience. It's completely free: https://canada-energy.netlify.app/watchdog

Would that be something you'd consider? Happy to answer any questions about how it works.
```

---

## Weekly Cadence & Scaling Plan

> **🚨 v4.0 MANUAL-FIRST PROTOCOL:** OpenClaw automation is NOT enabled for Weeks 1-3. All outreach is human-driven until acceptance rate baseline is established and LinkedIn account health is confirmed. Campaign 2 (Indigenous) is NEVER automated — all manual.

---

### ✅ Pre-Outreach Week (Before Week 1 — Do This First)

| Action | Status | Check When Done |
|--------|--------|------------------|
| Pin Canada utilities article to LinkedIn profile | Required | ☐ |
| Send ICE Network org email (James Jenkins / Terri Lynn) | Required | ☐ |
| Smoke-test all live URLs: /municipal, /roi-calculator, /api-docs, /funder-reporting | Required | ☐ |
| Confirm /legal page (Privacy Policy + ToS) is live | Required | ☐ |
| Set up HubSpot Free CRM with 5 pipeline stages | Required | ☐ |
| Record 1 Loom demo (3-5 min) for Campaign 1 | Required | ☐ |
| Create 1-page PDF summary for Campaign 1 | Required | ☐ |
| Update TIER price in Campaign 4 templates to current | Required | ☐ |

**Do not start Week 1 outreach until all rows above are checked.**

---

### Week 1-2: Manual Only — Campaign 1 + Campaign 3 Only

> ⚡ **Campaign 2 (Indigenous): Do NOT do individual LinkedIn outreach. Awaiting ICE Network org response.**
> ⚡ **Campaign 4 (Industrial): Do NOT start yet. Longer cycle — begin Week 7.**
> ⚡ **OpenClaw automation: OFF. All actions are human-approved one by one.**

| Day | Campaign | Actions | Mode | Cap |
|-----|----------|---------|------|-----|
| Mon | Campaign 1 (Consulting) | Visit 5 profiles → engage (like + comment) | 👤 MANUAL | 5 engagements |
| Tue | Campaign 1 (Consulting) | Send 5 personalized connection notes | 👤 MANUAL | 5 requests |
| Wed | Campaign 3 (Municipal) | Visit 5 profiles → engage (like + comment) | 👤 MANUAL | 5 engagements |
| Thu | Campaign 3 (Municipal) | Send 5 personalized connection notes | 👤 MANUAL | 5 requests |
| Fri | All | Send follow-up DMs to all who accepted this week | 👤 MANUAL | All pending |

**Week 1-2 total: 10 connection requests/week + 10 engagements = 20 actions/week**

**EOW Check:** Review acceptance rates. If <25%, revise templates before Week 3. Do NOT scale.

---

### Week 3-4: Manual + Assist — Campaign 1 + Campaign 3

> ⚡ **OpenClaw assist mode only:** Use OpenClaw to DRAFT messages for human review. A human must approve every message before sending. Do NOT enable auto-send.

| Day | Campaign | Actions | Mode | Cap |
|-----|----------|---------|------|-----|
| Mon | Campaign 1 | OpenClaw drafts 10 connection notes → human reviews → sends best 7 | 🤝 ASSIST | 7 requests |
| Tue | Campaign 3 | OpenClaw drafts 10 connection notes → human reviews → sends best 7 | 🤝 ASSIST | 7 requests |
| Wed | Campaign 1 | Follow-ups to all prior accepted | 👤 MANUAL | all pending |
| Thu | Campaign 3 | Follow-ups to all prior accepted | 👤 MANUAL | all pending |
| Fri | All | Review, respond to replies, log in HubSpot | 👤 MANUAL | — |

**EOW Check:** Acceptance >30%? Reply >15%? → Proceed to Week 5 automation. Below target? → Fix templates first.

---

### Week 5+: OpenClaw Automation Enabled — Campaign 1 + Campaign 3 Only

> ⚡ **Automation gate:** Only proceed if Weeks 3-4 show clean account health (no warnings, no CAPTCHAs) and acceptance rate >30%.
> ⚡ **Campaign 4:** Add manually from Week 7 onwards.
> ⚡ **Campaign 2:** Still org-level only, no automation.

| Day | Campaign | Actions | Mode | Cap |
|-----|----------|---------|------|-----|
| Mon–Thu | C1 + C3 | OpenClaw automated batches, randomized 4-8 min delays | 🤖 AUTO | 10/day (40/week combined) |
| Fri | All | Human: review replies, send follow-ups, log | 👤 MANUAL | all pending |

**Safety guardrails for OpenClaw automation:**
- Max 10 requests/day total across all running campaigns
- Randomize delay: 4-8 minutes (not fixed intervals — LinkedIn detects patterns)
- Run sessions at different times each day (not always 9am)
- Monitor LinkedIn account health dashboard daily
- **Stop immediately** at any warning, CAPTCHA, or restriction notice

---

### Month 2+: Full Velocity (if Week 5+ clean)

- C1 + C3: 40-60 requests/week via OpenClaw
- C4: 10-15 requests/week — MANUAL ONLY (high-stakes accuracy)
- C2: Via ICE events / referrals only — NO automation
- Focus on campaigns with highest reply rates
- A/B test templates (feed winning versions back to OpenClaw)
- Add email outreach (Apollo.io) as parallel channel for C1 and C3

---

## Tracking & Optimization

### Tracking Sheet Structure (Google Sheets / Notion)

| Column | Description |
|--------|-------------|
| **Prospect Name** | Full name |
| **Company** | Organization |
| **Title** | Job title |
| **Campaign** | 1-5 (which campaign) |
| **LinkedIn URL** | Profile link |
| **Engaged** | Date liked/commented |
| **Connection Sent** | Date |
| **Accepted** | Date (or "Pending" / "Declined") |
| **Follow-Up Sent** | Date |
| **Reply** | Date + summary |
| **Meeting Booked** | Y/N + date |
| **Outcome** | Trial / Demo / No Interest / Future |
| **Template Used** | A, B, or C |
| **Notes** | Any relevant context |

### Key Metrics to Track Weekly

| Metric | Target | Action if Below |
|--------|--------|-----------------|
| **Acceptance Rate** | >40% | Improve personalization; switch to 2nd-degree connections |
| **Reply Rate** | >20% | Shorten follow-ups; ask better questions |
| **Meeting Conversion** | >10% of replies | Strengthen offer (extend trial, add free audit) |
| **Restrict/Warning** | 0 | Immediately reduce volume by 50%; add more delays |

### A/B Testing Plan

- Test 2 connection note templates per campaign per week
- Track acceptance rate per template
- After 20+ data points per template, drop the loser
- Feed winning patterns back into OpenClaw instructions

### Monthly Refinement

```
OpenClaw, here are the results from this month's outreach:

Campaign 1 (Consulting): Template A got 55% acceptance, Template B got 35%. Use Template A style going forward.
Campaign 2 (Indigenous): Template C with ICE Network reference got highest replies. Lean into community partnership angle.

Update your approach:
- Use warmer, question-based openings
- Reference specific recent posts more often
- Shorten follow-up DMs by 1 sentence

Generate next batch of 15 prospects for Campaign {X}, following updated templates.
```

---

## Quick Reference: All CEIP URLs for Templates

| Page | URL | Use Case |
|------|-----|----------|
| **Utility Planning Lane** | `https://canada-energy.netlify.app/utility-demand-forecast` | Utilities, consultants, municipal, Ontario LDC |
| **Regulatory Filing** | `https://canada-energy.netlify.app/regulatory-filing` | Utilities, municipal, compliance/export proof |
| **Utility Security** | `https://canada-energy.netlify.app/utility-security` | Procurement-heavy buyers, utilities |
| **UtilityAPI Sandbox** | `https://canada-energy.netlify.app/utilityapi-demo` | Utility innovation teams, XML parser sandbox |
| **Forecast Benchmarking** | `https://canada-energy.netlify.app/forecast-benchmarking` | Model-review and trust conversations |
| **API Docs** | `https://canada-energy.netlify.app/api-docs` | Consulting firms, technical evaluators |
| **Asset Health** | `https://canada-energy.netlify.app/asset-health` | Municipal, utility asset managers, advisors |
| **Funder Reporting** | `https://canada-energy.netlify.app/funder-reporting` | Indigenous coordinators |
| **AICEI Reporting** | `https://canada-energy.netlify.app/aicei` | Alberta Indigenous clean energy programs |
| **OCAP Data Vault** | `https://canada-energy.netlify.app/sovereign-vault` | Indigenous executives, early-access only |
| **Municipal Landing** | `https://canada-energy.netlify.app/municipal` | Municipal officers |
| **ROI Calculator** | `https://canada-energy.netlify.app/roi-calculator` | Industrial + Municipal |
| **Credit Banking** | `https://canada-energy.netlify.app/credit-banking` | Industrial TIER follow-on |
| **Shadow Billing** | `https://canada-energy.netlify.app/shadow-billing` | Bill-comparison and procurement follow-on |
| **Rate Watchdog** | `https://canada-energy.netlify.app/watchdog` | B2C amplifiers |
| **Competitor Comparison** | `https://canada-energy.netlify.app/compare` | All campaigns (trust) |
| **Pricing** | `https://canada-energy.netlify.app/pricing` | All campaigns (late stage) |
| **Enterprise Contact** | `https://canada-energy.netlify.app/enterprise` | High-value leads |
| **Enterprise + Industry** | `https://canada-energy.netlify.app/enterprise?tier=indigenous` | Pre-filled contact form |

---

## MVP Proof Stack & UI Verification (May 2026)

### Primary Proof Stack (Lead With These First)

| Feature | URL | Outreach Proof Point | What Prospect Sees | How to Verify (UI) |
|---------|-----|----------------------|--------------------|--------------------|
| Utility Demand Forecasting Lane | `/utility-demand-forecast` | "We turn buyer load history into a planning and filing-ready workflow." | Scenario overlays, planning memo path, export-oriented flow, benchmark-linked narrative. | Open page → confirm planning workflow, scenario framing, and export surfaces are visible. |
| Regulatory Filing Templates | `/regulatory-filing` | "We package forecasts and asset evidence into OEB Chapter 5 / AUC Rule 005 style exports." | Jurisdiction-aware filing pack, schedule/checklist outputs, route links into planning and asset proof. | Open page → preview filing content → verify export controls are present. |
| Utility Security & Data Handling | `/utility-security` | "We reduce procurement friction by making review boundaries explicit." | Control matrix, checklist, evidence index, review-pack structure. | Open page → verify custody/retention/revocation and review language is visible. |
| UtilityAPI / Green Button Sandbox | `/utilityapi-demo` | "We can parse Green Button-style XML and build a forecast package in a safe sandbox." | Fixture replay, interval summary, forecast preview, operator-gated live controls. | Open page → click `Continue with Fixture Replay` → verify `replayed` and `Intervals: 48`. |
| Forecast Benchmarking Trust Layer | `/forecast-benchmarking` | "We show MAE/MAPE/RMSE and baseline comparisons instead of black-box claims." | Benchmark metrics, persistence and seasonal-naive baselines, trust framing. | Open page → verify metrics blocks and baseline comparisons render. |

### Secondary Proof Surfaces (Use by Persona)

| Feature | URL | Outreach Proof Point | What Prospect Sees | How to Verify (UI) |
|---------|-----|----------------------|--------------------|--------------------|
| Asset Health Index (CSV CBRM-lite) | `/asset-health` | "CSV-based health scoring with no SCADA requirement." | Upload/sample loader, charts, scored table, export path. | Load sample → verify charts and results populate. |
| TIER Compliance Savings Calculator | `/roi-calculator` | "Three-pathway TIER scenario with explicit pricing provenance." | Fund vs market-scenario vs Direct Investment comparison and memo outputs. | Open page → verify provenance text and artifact actions are visible. |
| Credit Banking Dashboard | `/credit-banking` | "Compliance-year allocation and expiry-risk audit trail." | Position summary, allocation schedule, expiry-risk outputs. | Open page → confirm import/export and allocation workflow elements are visible. |
| Shadow Billing Module | `/shadow-billing` | "Energy-supply-only bill comparison with memo and delta outputs." | Upload table, comparison outputs, explicit scope disclaimer. | Open page → confirm supply-only disclosure is present. |
| AICEI Reporting | `/aicei` | "Alberta-specific Indigenous reporting support." | Portfolio/reporting workflow with approval-gap handling and exports. | Open page → verify Alberta program framing and export controls. |

### Optional Future Items (Not Committed / Use Carefully)
- 12CP Peak Shaving Calculator (L2) — not built; do NOT promise.
- REA Landing Page (L3) — not built; do NOT promise.
- Banyon Displacement Research (L4) — research-only; do NOT promise migration tooling.
- OCAP data vault hardening (encryption, key mgmt) — still early-access; be transparent.

### UI Smoke Test Steps (before outreach claims)
1) **Utility planning:** Go to `/utility-demand-forecast` → verify planning workflow, scenario framing, and proof-pack path are visible.
2) **Regulatory filing:** Go to `/regulatory-filing` → preview a filing pack and verify export controls.
3) **Utility security:** Go to `/utility-security` → verify explicit review-boundary language is present.
4) **UtilityAPI sandbox:** Go to `/utilityapi-demo` → click fixture replay → confirm `replayed` and `Intervals: 48`.
5) **Forecast benchmarking:** Go to `/forecast-benchmarking` → verify `MAE`, `MAPE`, `RMSE`, persistence, and seasonal-naive proof surfaces.

---

## Optional Future Items (Not Committed)

Use these as "roadmap/early thinking" only; never present as shipped:
- 12CP Peak Shaving Calculator (Alberta T&D charge optimizer)
- REA-specific landing + offers (<$75K sole-source framing)
- Banyon displacement playbook (billing migration research)
- OCAP encryption/key custody (nation-held) beyond current early-access design

---

## Outreach Inserts for New Features (Use in relevant campaigns)

- **For Consulting Firms / Municipal / Industrial:**
  - "We publish accuracy vs persistence + seasonal-naive baselines; MAE/MAPE/RMSE are visible on `/forecast-benchmarking`."
  - "We position forecasting as a planning and filing workflow, not a generic dashboard, at `/utility-demand-forecast`."
  - "Regulatory exports: AUC Rule 005 Schedules 4.2/10/17/22 and OEB Ch5 5.2/5.3/5.4 downloadable as CSV at `/regulatory-filing`."
- **For Ontario LDCs / Innovation teams:**
  - "We can show the utility-planning lane, the filing pack, and the Green Button XML sandbox in one proof sequence without overstating production onboarding."
- **For Utility Asset Managers:**
  - "CSV-based Asset Health Index (age/loading/maintenance/environment) — no SCADA required — live at `/asset-health` with charts + export."
- **For Industrial TIER buyers:**
  - "The TIER workflow uses current fund-basis provenance and separates fallback planning scenarios from live market quotes."

Keep honesty constraints: no AI-as-headline, no SCADA, no live pricing, no social proof claims.

---

## Multi-Channel Outreach Strategy (Beyond LinkedIn)

### Channel Priority Matrix

| Channel | Effort | CAC | Speed | Best For | Priority |
|---------|--------|-----|-------|----------|----------|
| **LinkedIn** | Medium | Low | Fast | Consulting firms, Industrial | 🔴 HIGH |
| **Cold Email** | Low | Low | Fast | Consulting, Municipal, REAs | 🔴 HIGH |
| **Industry Events** | High | Medium | Slow | All segments (trust-building) | 🟡 MEDIUM |
| **Content/SEO** | High | Very Low | Slow | Long-term inbound | 🟡 MEDIUM |
| **Reddit/Communities** | Low | Very Low | Medium | B2C (Watchdog), thought leadership | 🟡 MEDIUM |
| **Partnerships** | Medium | Zero | Medium | ICE Network, MCCAC, AFREA | 🔴 HIGH |

### A. Cold Email Playbook

**Approach:**
- LinkedIn engagement (Day 1-3) → Connection request (Day 4) → Email if no LinkedIn reply (Day 7-10)
- Volume: 20-30 personalized emails/week (NOT mass blasts)
- Tool: Apollo.io or Instantly.ai for sequencing

**Template — Consulting Firms:**
```
Subject: Canadian energy API — faster than manual AESO scraping

Hi {FirstName},

I noticed {Company}'s work on {specific project/report}. I built a Canadian energy API 
with 44 endpoints (AESO pool price, IESO demand, emissions, TIER credits) — designed 
to replace manual data pulls.

It's $149/mo vs Orennia's $10-30K/yr, and I'm offering free Pro access to 5 analysts 
for beta testing.

Would a 5-minute Loom demo be useful? Here's the API docs: 
https://canada-energy.netlify.app/api-docs

Best,
{Your name}
```

**Template — Municipal Officers:**
```
Subject: Free Climate Baseline Audit for {Municipality}

Hi {FirstName},

I built a climate reporting tool specifically for Alberta municipalities — priced at 
$70,800/yr to stay below the $75K NWPTA sole-source threshold.

I'd like to offer {Municipality} a free 30-minute Climate Baseline Audit. You keep 
the report either way — no commitment.

Here's a quick overview: https://canada-energy.netlify.app/municipal

Would next week work for a quick call?

Best,
{Your name}
```

**Template — Ontario LDCs (with MVP proof stack pitch):**
```
Subject: OEB Innovation Sandbox co-application — ML for DSP

Hi {FirstName},

I'm building ML-assisted distribution planning tools for small Ontario LDCs (<12,500 
customers) and now have a public proof stack covering utility planning, filing export, utility security, and benchmark transparency.

The pilot would provide your team with:
• Planning-lane load forecasting tied to filing/export workflow
• Asset Health Index scoring from CSV — no SCADA required
• Pre-formatted OEB Chapter 5 DSP exports (Sections 5.2, 5.3, 5.4)

I'm looking for 1-2 LDCs to co-apply. Would a 20-minute conversation be useful?

Best,
{Your name}
```

### B. Industry Events Calendar (2025-2026)

| Event | Location | Timing | Target Segment | Action |
|-------|----------|--------|----------------|--------|
| **ICE Network Gathering** | TBD | Annual | Indigenous energy | **#1 priority** — attend + present |
| **MCCAC Workshops** | Alberta cities | Monthly | Municipal sustainability | Free; present demo |
| **IPPSA Annual Conference** | Banff, AB | Oct 2026 | Alberta IPPs, REAs | Attend (don't sponsor) |
| **EDA EDIST** | Various | Spring/Fall | Ontario LDCs | Attend + demo at networking |
| **ERA Annual Forum** | Calgary | Fall | Industrial TIER | Target mid-tier emitters |

**Event Playbook:**
1. Register 2+ months early
2. Download attendee list (if available)
3. Pre-event LinkedIn outreach to 10-15 attendees
4. Bring QR code linking to `/api-docs` or `/regulatory-filing`
5. Post-event: Connect on LinkedIn + follow-up email within 48 hours

### C. Content Marketing (Minimal Viable)

**Q1 2026 Strategy:**
- **Keystone asset:** "2026 Canadian Energy Data Landscape Report"
- **Repurpose into:** 5 LinkedIn posts, 2 blog articles, 1 webinar, email nurture series

**Content Calendar:**
| Week | Content Type | Topic | Channel |
|------|--------------|-------|---------|
| 1 | LinkedIn Post | TIER fund vs market credit spread ($70/t arbitrage) | LinkedIn |
| 2 | Blog Article | "How to automate AUC Rule 005 filings" | Website + LinkedIn |
| 3 | LinkedIn Post | Ontario demand forecast accuracy demo | LinkedIn |
| 4 | Newsletter | Monthly Canadian energy data roundup | Email list |

### D. Reddit / Communities

**Target Subreddits:**
- r/Calgary, r/Edmonton, r/Alberta — Rate Watchdog content
- r/energy — thought leadership, API announcements
- r/solar, r/electricvehicles — renewable integration content

**Approach:**
- **Ratio:** 10 helpful comments : 1 subtle self-mention
- **Never:** Direct pitch or link spam
- **Do:** Answer questions, share insights, build reputation over 4-8 weeks before mentioning CEIP

### E. Partnership Outreach

| Partner | Type | Value | Outreach Approach |
|---------|------|-------|-------------------|
| **ICE Network** | Channel | 1,500+ Indigenous energy coordinators | "CEIP as 'data layer' for ICE members" |
| **MCCAC** | Referral | Alberta municipal climate network | "Free Climate Baseline Audits for workshop attendees" |
| **AFREA** | Channel | 60 Alberta REAs | "Rule 005 template automation partnership" |
| **Elenchus/METSCO** | Referral | Ontario LDC advisors | "White-label Asset Health scoring for LDC clients" |

---

## OpenClaw Session Starter — Copy This First

```
You are my safe OpenClaw LinkedIn outreach assistant for CEIP (Canada Energy Intelligence Platform — https://canada-energy.netlify.app).

CEIP is a comprehensive Canadian energy intelligence platform with:
• Utility planning workflow: /utility-demand-forecast
• Regulatory filing workflow: /regulatory-filing
• Utility trust page: /utility-security
• Green Button sandbox: /utilityapi-demo
• Forecast benchmarking trust layer: /forecast-benchmarking
• Technical/API proof: /api-docs
• Alberta TIER, municipal, and Indigenous reporting follow-on pages

DO NOT CLAIM: "AI-powered" as headline • "live market pricing" • "used by consultants" • "nation-held encryption keys" • "bill auditing" or "peak shaving" • "$500/year savings" • "auto-generates reports" • production utility onboarding

I am a solo developer relocating to Alberta. My approach is value-first: offer free tools, beta access, and design partnerships. Be honest about early-stage status. Never hard-sell.

TODAY'S CAMPAIGN: {Campaign Name}
TARGET: {Persona description}
SEARCH: {LinkedIn search query}

SAFETY RULES (NEVER VIOLATE):
• Max 15 new connection requests today
• Max 25 engagements (likes/comments)
• 2-5 minute delays between all actions
• Personalize every message with prospect-specific details
• Engage (like + comment) BEFORE connecting
• Stop immediately on any LinkedIn warning
• Log all actions for my tracking sheet

DEFAULT PROOF ORDER FOR ANY DEMO REQUEST:
1. /utility-demand-forecast
2. /regulatory-filing
3. /utility-security
4. /utilityapi-demo
5. /forecast-benchmarking

CONNECTION NOTE TEMPLATE:
{Paste template}

FOLLOW-UP DM TEMPLATE:
{Paste template}

Show me 10 prospect drafts for approval before sending. Include: Name, Company, Title, Personalization angle, Draft message.
```

---

*Document version: 5.0 (MVP freeze realignment) | Aligned with DEEP_RESEARCH_GTM_STRATEGY_2026.md and docs/Top20.md | All primary proof URLs verified against live codebase*
