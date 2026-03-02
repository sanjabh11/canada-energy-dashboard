# CEIP OpenClaw Outreach Strategy — LinkedIn Cold Connection & Messaging Playbook

**Date:** March 1, 2026 (v4.0 — Blockers Removed + OpenClaw-Ready)

> **⚡ v4.0 BLOCKER FIXES APPLIED:** (1) TIER/EPC prices updated to current March 2026 data, (2) Canoe Procurement claim removed from Campaign 3, (3) Campaign 2 rewritten to ICE Network org-level entry (NO cold individual DMs), (4) Manual-first protocol enforced Weeks 1-3 before OpenClaw automation.
**Tool:** OpenClaw Console (`https://claw.kilosessions.ai/chat?session=main`) + OpenClaw browser automation
**Aligned with:** `DEEP_RESEARCH_GTM_STRATEGY_2026.md` + `ADVERSARIAL_USP_ANALYSIS.md`
**Live URLs:** All pages deployed at `https://canada-energy.netlify.app`

> **Migration Note:** This version supersedes Comet-specific operating instructions. All outreach execution should now run through OpenClaw workflows.

> **Companion execution docs:**
> - `docs/OPENCLAW_MONETIZATION_IMPLEMENTATION_DELIVERABLE.md` (phase owners, KPI thresholds, acceptance gates)
> - `docs/OPENCLAW_CONSOLE_KICKSTART_STRATEGY.md` (step-by-step OpenClaw console startup runbook)

> **CRITICAL RULE:** Every claim in outreach must be verifiable by the prospect clicking through.
> See `ADVERSARIAL_USP_ANALYSIS.md` for what we can and cannot claim.

> **New capabilities to reference (NOW LIVE):**
> - Ontario Demand Forecasting (seasonal decomposition, accuracy vs baselines) — `/demand-forecast`
> - Regulatory Filing Templates (AUC Rule 005 Schedules 4.2/10/17/22 + OEB Chapter 5 Sections 5.2/5.3/5.4) — `/regulatory-filing`
> - Asset Health Index (CSV-based CBRM-lite scoring, no SCADA required) — `/asset-health`
> - OEB Innovation Sandbox pilot proposal (for credibility with Ontario LDCs) — `docs/OEB_SANDBOX_PROPOSAL.md`

---

## TABLE OF CONTENTS

1. [Safety Rules & Rate Limits](#1-safety-rules--rate-limits)
2. [Master OpenClaw Runbook Template](#2-master-openclaw-runbook-template)
3. [Campaign 1: Energy Consulting Firms (Fastest Revenue)](#campaign-1-energy-consulting-firm-api-access)
4. [Campaign 2: Indigenous Energy Coordinators (Blue Ocean)](#campaign-2-indigenous-energy-coordinators)
5. [Campaign 3: Municipal Sustainability Officers (B2G)](#campaign-3-municipal-sustainability-officers)
6. [Campaign 4: Industrial TIER Compliance Managers](#campaign-4-industrial-tier-compliance-managers)
7. [Campaign 5: Alberta Residential / Rate Watchdog (B2C)](#campaign-5-alberta-rate-watchdog-b2c)
8. [Weekly Cadence & Scaling Plan](#weekly-cadence--scaling-plan)
9. [Tracking & Optimization](#tracking--optimization)
10. [Feature Change Log & UI Verification (Feb 2026)](#feature-change-log--ui-verification-feb-2026)
11. [Optional Future Items (Not Committed)](#optional-future-items-not-committed)

---

## 1. Safety Rules & Rate Limits

**Non-negotiable rules for every OpenClaw session:**

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

## 2. Master OpenClaw Runbook Template

Copy-paste this as the base prompt in OpenClaw, then customize per campaign:

```
You are my safe OpenClaw LinkedIn outreach assistant for CEIP (Canada Energy Intelligence Platform).

CONTEXT: CEIP is a comprehensive Canadian energy intelligence platform with 25+ sector dashboards, 44 API endpoints, a TIER compliance calculator, and OCAP-aligned Indigenous energy tools. Built by a Senior Technology & Management Consultant (GenAI + digital transformation specialist). Early-stage, seeking design partners and beta testers. Live at https://canada-energy.netlify.app

IMPORTANT — DO NOT CLAIM:
- "AI-powered" as a primary differentiator
- Any specific EPC credit price without adding "as of March 2026" — prices are volatile (ranged $17-$41/t in the last 4 months)
- "Used by consultants" or any social proof we don't have
- "Nation-held encryption keys" or "full data sovereignty" (architecture exists, implementation is early-access)
- "Bill auditing" or "peak shaving alerts" for Rate Watchdog

GOAL: Build genuine connections with {TARGET_PERSONA}. We are NOT selling — we are offering free tools, beta access, and partnership opportunities. Position as honest early-stage builder seeking feedback.

SAFETY: Follow 2026 LinkedIn best practices. Personalize deeply, engage content first (like + comment thoughtfully), add natural 2-5 min delays between actions, limit to 15-20 connection requests/day max, keep messages short and conversational. Stop if ANY warning appears.

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
**Live demo URL:** `https://canada-energy.netlify.app/api-docs`

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

### OpenClaw Search Query

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

### OpenClaw Search Query

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

### OpenClaw Search Query

```
("Environmental" OR "Compliance" OR "Sustainability" OR "EHS" OR "Regulatory") AND ("Manager" OR "Director" OR "Lead" OR "Engineer") AND ("TIER" OR "carbon" OR "emissions" OR "GHG") AND Alberta
```

### Connection Request Note (≤250 chars)

> **⚡ v4.0 — TIER PRICE UPDATE:** EPC credits rebounded from $17/t (Nov 2025 low) to ~$41/t by late Jan 2026 (ClearBlue Markets / S&P Global). Fund frozen at $95/t (Alberta.ca, May 2025 announcement). Spread is now ~$54/t — still highly material. Update templates monthly; always include "as of [month]" qualifier.

**Template A — Arbitrage Hook (UPDATED PRICING):**
```
Hi {FirstName}, the TIER fund-credit spread is ~$54/t right now (fund $95/t, EPC credits ~$41/t as of March 2026). I built a free 3-pathway compliance calculator (fund vs market credits vs Direct Investment). Useful for {Company}?
```
*(241 chars — fits ≤250 limit)*

**Template B — Direct Investment Hook:**
```
Hi {FirstName}, saw {Company}'s sustainability work. With the new Direct Investment pathway under TIER, I built a compliance calculator comparing all 3 pathways. Happy to share — connect?
```

**Template C — Compliance Angle (UPDATED PRICING):**
```
Hi {FirstName}, noticed your environmental compliance role at {Company}. I built a free TIER calculator: fund ($95/t) vs market credits (~$41/t, March 2026) vs Direct Investment. Worth a look?
```

**Template D — Consultant Credibility Hook (NEW in v4.0):**
```
Hi {FirstName}, I published analysis on GenAI for Canadian utilities and went deep on TIER compliance modelling. Built a 3-pathway calculator (fund vs EPC vs Direct Investment). Might be useful for {Company}?
```
*(Link your Canada utilities article in the follow-up DM)*

### Follow-Up DM (if accepted)

**Template A — ROI Calculator Lead (UPDATED PRICING):**
```
Thanks for connecting, {FirstName}! Your compliance work at {Company} is right in my wheelhouse.

Quick question: is {Company} currently paying into the TIER fund at $95/tonne, or buying market credits?

I ask because the spread right now is significant — EPC credits are trading around $41/t (as of March 2026, up from $17/t in November 2025 — market is active), meaning facilities can save ~$54/tonne by buying credits instead of paying the fund. For a facility emitting 100K tonnes, that's potentially $5.4M/year in savings.

I built a calculator that models this exactly: https://canada-energy.netlify.app/roi-calculator

It also covers the new Direct Investment pathway (Dec 2025 amendments). Would a 15-minute walkthrough be useful?
```

**Template B — Subject Matter Expert Approach (UPDATED PRICING):**
```
Appreciate the connection, {FirstName}! I've been deep in the TIER compliance space — I also published analysis on GenAI for Canadian utilities if you'd like background context.

Current TIER data points:
• Fund price: $95/t (Alberta.ca — frozen indefinitely as of May 2025; next review tied to federal carbon price negotiations by April 1, 2026)
• Market EPC credits: ~$41/t (ClearBlue Markets / S&P Global, late Jan 2026 — up from $17/t at Nov 2025 low)
• EPC compliance limit: 90% of obligations from 2026 onwards (up from previous cap)
• New Direct Investment pathway: capex can offset compliance obligations

I built a calculator that models the optimal compliance pathway across all three options: https://canada-energy.netlify.app/roi-calculator

⚠️ Note: EPC prices are volatile — the calculator uses current data. Always confirm with your broker before transacting.

For a facility with 20K tonnes exceedance, the spread between fund payment and market credits is ~$1.08M/yr at current prices. Worth exploring for {Company}?
```

> **⚡ MONTHLY MAINTENANCE REQUIRED:** Update the EPC price in templates every month. Sources: ClearBlue Markets (clearbluemarkets.com), S&P Global Platts, or ccarbon.info. Set a calendar reminder for the 1st of each month.

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

### OpenClaw Search Query

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
| **API Docs** | `https://canada-energy.netlify.app/api-docs` | Consulting firms |
| **Funder Reporting** | `https://canada-energy.netlify.app/funder-reporting` | Indigenous coordinators |
| **OCAP Data Vault** | `https://canada-energy.netlify.app/sovereign-vault` | Indigenous executives |
| **Indigenous Dashboard** | `https://canada-energy.netlify.app/indigenous` | Indigenous general |
| **Municipal Landing** | `https://canada-energy.netlify.app/municipal` | Municipal officers |
| **ROI Calculator** | `https://canada-energy.netlify.app/roi-calculator` | Industrial + Municipal |
| **Rate Watchdog** | `https://canada-energy.netlify.app/watchdog` | B2C amplifiers |
| **Competitor Comparison** | `https://canada-energy.netlify.app/compare` | All campaigns (trust) |
| **Pricing** | `https://canada-energy.netlify.app/pricing` | All campaigns (late stage) |
| **Enterprise Contact** | `https://canada-energy.netlify.app/enterprise` | High-value leads |
| **Enterprise + Industry** | `https://canada-energy.netlify.app/enterprise?tier=indigenous` | Pre-filled contact form |

---

## Feature Change Log & UI Verification (Feb 2026)

### Newly Implemented (P2–P5)

| Feature | URL | Outreach Proof Point | What Prospect Sees | How to Verify (UI) |
|---------|-----|----------------------|--------------------|--------------------|
| Ontario Demand Forecasting (Seasonal Decomposition) | `/demand-forecast` | "We provide MAE/MAPE/RMSE vs persistence & seasonal naive baselines on Ontario load." | 4 tabs: Overview, Forecast, Decomposition, Accuracy with charts and CSV export. | Open page → Generate forecast → View charts; compare metrics block; export CSV. |
| Regulatory Filing Templates (AUC Rule 005 + OEB Ch5) | `/regulatory-filing` | "We export AUC Rule 005 Schedules 4.2/10/17/22 and OEB Ch5 Sections 5.2/5.3/5.4 to CSV with sample data." | Template selector, jurisdiction filter, preview table, download CSV. | Select template → preview sample rows → click Export CSV downloads file. |
| Asset Health Index (CSV CBRM-lite) | `/asset-health` | "CSV-based Health Index (age/loading/maintenance/environment) with condition/risk charts. No SCADA required." | Upload/ sample loader, condition & risk pies, age vs HI scatter, scored table, export. | Load sample → see charts populate → export results CSV; verify recommendations column. |
| OEB Sandbox Pilot Proposal | `docs/OEB_SANDBOX_PROPOSAL.md` | "We prepared a 12-month pilot proposal for small Ontario LDCs (<12,500 customers)." | Markdown doc with Exec Summary, Problem, Solution, Budget, Success Metrics. | Open doc; check Sections 1–9; budget table present. |

### Optional Future Items (Not Committed / Use Carefully)
- 12CP Peak Shaving Calculator (L2) — not built; do NOT promise.
- REA Landing Page (L3) — not built; do NOT promise.
- Banyon Displacement Research (L4) — research-only; do NOT promise migration tooling.
- OCAP data vault hardening (encryption, key mgmt) — still early-access; be transparent.

### UI Smoke Test Steps (before outreach claims)
1) **Demand Forecast:** Go to `/demand-forecast` → click "Generate Forecast" → confirm charts render and metrics show values.
2) **Regulatory Templates:** Go to `/regulatory-filing` → choose AUC Rule 005 Schedule 4.2 → click Export CSV → file downloads.
3) **Asset Health:** Go to `/asset-health` → click "Load Sample Data" → pies/scatter/table populate → export results.
4) **Docs:** Open `docs/OEB_SANDBOX_PROPOSAL.md` in repo → confirm budget + success metrics present.

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
  - "We publish accuracy vs persistence + seasonal naive baselines; MAE/MAPE/RMSE are visible on `/demand-forecast`."
  - "Regulatory exports: AUC Rule 005 Schedules 4.2/10/17/22 and OEB Ch5 5.2/5.3/5.4 downloadable as CSV at `/regulatory-filing`."
- **For Ontario LDCs / Innovation teams:**
  - "We drafted an OEB Innovation Sandbox pilot for small LDCs (<12,500 customers) — ready to share for co-application." (Point to `docs/OEB_SANDBOX_PROPOSAL.md`)
- **For Utility Asset Managers:**
  - "CSV-based Asset Health Index (age/loading/maintenance/environment) — no SCADA required — live at `/asset-health` with charts + export."

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

**Template — Ontario LDCs (with Sandbox pitch):**
```
Subject: OEB Innovation Sandbox co-application — ML for DSP

Hi {FirstName},

I'm building ML-assisted distribution planning tools for small Ontario LDCs (<12,500 
customers) and have drafted an OEB Innovation Sandbox pilot proposal.

The pilot would provide your team with:
• Automated load forecasting (MAE/MAPE benchmarked vs baselines)
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
• 25+ specialized energy dashboards (AESO, IESO, hydrogen, CCUS, ESG, etc.)
• 44 REST API endpoints with Canadian grid, emissions, and compliance data
• TIER carbon credit compliance calculator (3-pathway: fund vs market vs Direct Investment)
• OCAP-aligned Indigenous energy tools (early-access, seeking community co-design partner)
• Municipal climate tools designed for simplified procurement (<$75K)
• Funder report templates for Wah-ila-toos, CERRC, Northern REACHE programs (early-access)

DO NOT CLAIM: "AI-powered" as headline • "live pricing" • "used by consultants" • "nation-held encryption keys" • "bill auditing" or "peak shaving" • "$500/year savings" • "auto-generates reports"

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

CONNECTION NOTE TEMPLATE:
{Paste template}

FOLLOW-UP DM TEMPLATE:
{Paste template}

Show me 10 prospect drafts for approval before sending. Include: Name, Company, Title, Personalization angle, Draft message.
```

---

*Document version: 3.0 (OpenClaw migration) | Aligned with DEEP_RESEARCH_GTM_STRATEGY_2026.md | All URLs verified against live codebase*
