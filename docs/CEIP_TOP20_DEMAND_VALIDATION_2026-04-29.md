# CEIP Alberta-First Repositioning, Feature Ranking, and UI Refocus

> Date: April 29, 2026
> Scope: Alberta-first, Canada-expandable
> Primary objective: prioritize the first `25% to 40%` of product that can win customers fastest, then expand after live demand is proven.

## Executive Summary

The original prediction-led thesis was directionally right, but too broad for the way Alberta and Canadian buyers actually spend. The market is not rewarding generic forecasting or wide dashboards first. It is rewarding narrow workflows with an obvious budget owner, an urgent compliance or savings problem, and a short proof path.

That changes CEIP's commercial story:

- Prediction stays central, but only where it changes a filing, savings estimate, maintenance decision, or funder report.
- The first five wedges to sell are:
  - `TIER Compliance Savings Calculator`
  - `Regulatory Filing Templates`
  - `Asset Health Index`
  - `Indigenous Funder Reporting Dashboard`
  - `Utility Demand Forecasting Lane`
- The next two reserve wedges are:
  - `Shadow Billing Module`
  - `AICEI Grant Reporting Module`
- The current broad dashboard should stop being the front door. It is now supporting proof, not the primary sales surface.

## Scoring Method Applied

- `Pain urgency and immediacy`: `25%`
- `Budget clarity and budget owner`: `20%`
- `Procurement speed / friction`: `15%`
- `Financial or compliance ROI`: `15%`
- `Proof burden inverse`: `15%`
- `Implemented proof-fit`: `10%`

### Penalty Rules Applied

- `Sandbox-only`, `illustrative`, or `fallback-heavy` routes were capped or discounted.
- Features with slow procurement, diffuse ownership, or production-trust gaps were penalized.
- `Absent` features remained eligible for ranking, but received `0/5` for implemented proof-fit.

## 1. Top 15 Challenges

| Rank | User segment | Exact problem | Why now | Budget owner | Procurement path | Main substitutes | Evidence basis |
|---|---|---|---|---|---|---|---|
| 1 | Alberta industrial emitters | Choosing the cheapest TIER compliance path across fund payments, EPCs, offsets, and direct investment is still spreadsheet-heavy and economically material. | The TIER regime remains active, credit markets are getting more transparent, and annual compliance decisions hit cash flow directly. | VP Operations, Director of Sustainability, CFO | Compliance advisory budget, plant operations budget, short pilot with facility data | Internal spreadsheets, consultants, price services | [Official: Alberta TIER Regulation](https://www.alberta.ca/technology-innovation-and-emissions-reduction-regulation.aspx) / [Market: S&P Global TIER assessments](https://www.spglobal.com/energy/en/pricing-benchmarks/our-methodology/subscriber-notes/061125-platts-to-launch-alberta-tier-emission-performance-credit-offset-credit-assessments) |
| 2 | Utilities, REAs, planning consultants | Regulatory filings still require manual conversion of forecasts, asset evidence, and reliability narratives into approved structures. | OEB Chapter 5 and AUC filing expectations still require structured evidence and repeatable schedules. | Director of Regulatory Affairs, Engineering Manager, utility GM | Utility operating budget, consultant scope, filing-prep budget | Consultants, Excel, legacy planning tools | [Official: OEB Chapter 5](https://www.oeb.ca/regulatory-rules-and-documents/rules-codes-and-requirements/filing-requirements-transmission-distribution-applications) / [Market: Itron Grid Planning](https://na.itron.com/what-we-offer/grid-planning) |
| 3 | Utilities, REAs, municipal utilities | Utilities need defensible asset-condition justification before approving replacements, deferments, and reliability spend. | Aging infrastructure plus reliability-target scrutiny force better evidence for capex choices. | Asset Manager, Engineering Director, Finance | Capital-planning workflow, consultant assessment, utility engineering budget | Copperleaf, consultant asset studies, Excel-based CBRM | [Official: OEB Chapter 5 asset-management expectations](https://www.oeb.ca/sites/default/files/OEB%20Filing%20Reqs_Chapter%205_2024_20241209.pdf) / [Market: Copperleaf asset investment planning](https://www.copperleaf.com/why-copperleaf/what-is-asset-investment-planning/) |
| 4 | Indigenous community energy teams | Communities must repeatedly assemble project milestones, funding use, outcomes, and narrative reporting for funders. | Wah-ila-toos, CERRC, and similar programs continue to require periodic progress evidence. | Energy manager, economic development lead, program manager | Grant administration budget, project-management budget, direct procurement | Smartsheet, spreadsheets, consultant report assembly | [Official: Wah-ila-toos funding opportunities](https://www.canada.ca/en/services/environment/weather/climatechange/climate-plan/reduce-emissions/reducing-reliance-diesel/wah-ila-toos-funding-opportunities.html) / [Market: Smartsheet grant management](https://www.smartsheet.com/grant-management) |
| 5 | Utilities, planning consultants, large-load advisors | Utilities need scenario-ready demand planning that reflects electrification, large loads, DER offsets, and future reliability pressure. | Ontario APO demand growth and Alberta data-centre pressure both raise the cost of getting assumptions wrong. | Planning Director, VP Engineering, consultant lead | Utility planning budget, consultant project, innovation pilot | Itron, consultant forecasting studies, internal models | [Official: IESO 2026 APO](https://www.ieso.ca/en/Sector-Participants/Planning-and-Forecasting/Annual-Planning-Outlook) / [Market: Itron Grid Forecast & Planner](https://na.itron.com/what-we-offer/grid-planning) |
| 6 | Electricity distributors and transmitters | Cyber reporting and security review requirements are increasing, but many utilities still struggle to package evidence clearly. | The OEB issued new cyber guidance in 2025 and incident-reporting obligations tightened. | CIO, CISO, Director of Compliance | Security budget, risk/compliance budget, formal review process | Dragos, OT consultants, internal cyber teams | [Official: OEB electricity utility cyber security](https://www.oeb.ca/consultations-and-projects/policy-initiatives-and-consultations/electricity-utility-cyber-security) / [Market: Dragos electric grid cybersecurity](https://www.dragos.com/electric-grid-cybersecurity/) |
| 7 | Commercial energy managers, public-sector operators | Buyers need to verify bill accuracy and tariff fit without manual invoice review across every account. | Price pressure and invoice complexity make recoverable errors and misclassified rates commercially meaningful. | Finance, energy manager, facilities director | Opex pilot, utility-bill audit budget, consulting scope | Utility bill audit firms, EnergyCAP, internal analysts | [Official: NRCan energy audit manual](https://natural-resources.canada.ca/sites/nrcan/files/oee/pdf/publications/infosource/pub/cipec/energyauditmanualandtool.pdf) / [Market: EnergyCAP bill auditing](https://www.energycap.com/product-features/utility-bill-auditing-software/) |
| 8 | Alberta SMEs and public-sector buyers | Many Alberta buyers still struggle to understand whether default power service, fixed contracts, or variable plans are actually better for them. | Alberta RoLR pricing is fixed through December 31, 2026, which creates a concrete comparison anchor now. | Small-business owner, controller, facilities manager | Direct purchase, broker referral, simple SaaS or advisory spend | Retailers, broker comparison tools, 8760, EPCOR plan pages | [Official: UCA default rates / RoLR](https://ucahelps.alberta.ca/regulated-rates.aspx) / [Market: 8760 Alberta small-business rates](https://www.8760.ca/small-business-electricity-rates) |
| 9 | Large-load developers, utilities, transmission planners | Data-centre and other large-load projects need earlier answers on connection readiness, constraints, and planning assumptions. | AESO large-load requests far exceed short-term grid capacity, making readiness analysis high value. | Development director, utility planner, interconnection advisor | Consultant/engineering budget, interconnection pre-feasibility scope | Engineering consultants, internal transmission studies, Itron | [Official: AESO large-load integration update](https://www.aeso.ca/aeso/newsroom/aeso-announces-interim-approach-to-large-load-connections/) / [Market: Itron electric utilities planning](https://na.itron.com/who-we-serve/electric-utilities) |
| 10 | Ontario distributors and DER planners | Utilities need to understand flexible hosting, DER integration, and non-wires alternatives more concretely. | OEB innovation and DER-hosting changes put more pressure on distribution planning quality. | DER planning lead, engineering director | Utility planning budget, consultant scope | Grid-planning vendors, consultants, internal studies | [Official: OEB Innovation Handbook](https://www.oeb.ca/sites/default/files/uploads/documents/regulatorycodes/2024-09/oeb-innovation-handbook-20240904.pdf) / [Market: Itron hosting-capacity and grid planning](https://na.itron.com/what-we-offer/grid-planning) |
| 11 | Alberta Indigenous clean-energy project teams | Alberta Indigenous projects need program-specific grant reporting around generation, GHG outcomes, and capacity building. | AICEI is live and highly relevant for Alberta communities, but reporting remains manual. | Project manager, nation-owned energy entity, grant coordinator | Grant admin budget, program support budget | Spreadsheets, Smartsheet, custom consultant reporting | [Official: AICEI program page](https://www.canada.ca/en/prairies-economic-development/services/funding/alberta-indigenous-clean-energy-initiative.html) / [Market: Smartsheet portfolio reporting](https://www.smartsheet.com/marketplace/apps/grant-management) |
| 12 | Industrial compliance teams and carbon strategists | Facilities need better visibility into credit inventory, offset rules, and price risk before making compliance decisions. | Alberta offset rules remain active and daily TIER pricing transparency is improving. | Sustainability lead, carbon market lead, CFO | Compliance tool budget, carbon-market advisory spend | Carbon Assessors, consultants, manual position tracking | [Official: Alberta Emission Offset System](https://www.alberta.ca/alberta-emission-offset-system) / [Market: Carbon Assessors Alberta products](https://www.carbonassessors.com/products/alberta) |
| 13 | Utilities, municipalities, rural infrastructure owners | Wildfire and outage risk are rising, but resilience planning often sits in disconnected PDFs, maps, and engineering studies. | Alberta wildfire mitigation remains a live infrastructure and public-safety issue. | CAO, emergency manager, utility operations lead | Capital planning, resilience grants, municipal procurement | Consultants, OMS/GIS studies, asset-planning vendors | [Official: Alberta Wildfire Mitigation Strategy](https://www.alberta.ca/alberta-wildfire-mitigation-strategy) / [Market: Copperleaf climate-resilience planning](https://www.copperleaf.com/landing-page/utility-capital-investment-planning-reach-beyond-reliability-to-climate-resilience/) |
| 14 | Renewable operators, market analysts, developers | Curtailment and congestion still erode value, but many teams lack a simple workflow to tie market data to lost revenue. | Alberta transmission and congestion work continues, and buyers increasingly need visibility into congestion and curtailment economics. | Commercial lead, trading desk, development team | Market-analytics budget, advisory budget | Yes Energy, LevelTen, trader-built analytics | [Official: AESO 2025 Long-Term Transmission Plan](https://www.aeso.ca/grid/grid-planning/long-term-transmission-plan/) / [Market: Yes Energy congestion analytics](https://www.yesenergy.com/blog/spotting-congestion-related-electricity-market-opportunities) |
| 15 | Municipalities, Indigenous communities, public-sector buyers | Procurement and trust friction slows adoption even when the underlying energy problem is real. | Public buyers want trade-compliant procurement paths and auditable vendor claims before moving quickly. | CAO, procurement lead, program director | Group procurement, pilot budget, direct award where permitted | Canoe, consultants, incumbent software vendors | [Official: RMA / Canoe procurement](https://rmalberta.com/canoe/) / [Market: Smartsheet reporting templates](https://www.smartsheet.com/content/reporting-requirements-templates) |

## 2. Top 10 Sellable Features

| Rank | Feature | Mapped challenge(s) | Current status | Primary buyer | Exact problem solved | Urgency / willingness to pay | Budget owner + procurement path | Main substitutes | Proof required | Demand score (1-5) | Recommendation | Evidence basis |
|---|---|---|---|---|---|---|---|---|---|---:|---|---|
| 1 | TIER Compliance Savings Calculator | `TIER cost optimization`, `carbon credit and offset management` | Implemented | Alberta industrial emitters, EPCs, compliance advisors | Compares fund price, market-credit pricing, and direct-investment pathways using a cash-savings lens. | Very high. Immediate annual compliance cash impact makes willingness to pay strong. | CFO, Sustainability, Operations. Usually advisory, compliance, or pilot budget. | Consultants, spreadsheets, Carbon Assessors, price feeds | Facility case study, current pricing source labels, downloadable savings memo | 4.7 | Lead now | [Official](https://www.alberta.ca/technology-innovation-and-emissions-reduction-regulation.aspx) / [Market](https://www.spglobal.com/energy/en/pricing-benchmarks/our-methodology/subscriber-notes/061125-platts-to-launch-alberta-tier-emission-performance-credit-offset-credit-assessments) |
| 2 | Regulatory Filing Templates | `regulatory filing burden` | Implemented | Utilities, REAs, consultants | Converts planning and asset data into AUC/OEB-shaped schedules and sample filing exports. | High. Filing work is mandatory and recurring. | Regulatory affairs, utility GM, consultant budget | Excel, consultants, legacy templates | Export compatibility, reviewer acceptance, one customer-ready sample pack | 4.5 | Lead now | [Official](https://www.oeb.ca/regulatory-rules-and-documents/rules-codes-and-requirements/filing-requirements-transmission-distribution-applications) / [Market](https://na.itron.com/what-we-offer/grid-planning) |
| 3 | Asset Health Index | `asset aging and condition justification` | Implemented | Utilities, REAs, municipal utilities | Gives utilities a CSV-first condition score to justify replacement, deferment, and capex prioritization. | High. Reliability pressure plus aging assets create clear demand. | Asset manager, engineering director, finance | Copperleaf, consultants, spreadsheet scoring | Sample fleet upload, method note, exportable priority list | 4.3 | Lead now | [Official](https://www.oeb.ca/sites/default/files/OEB%20Filing%20Reqs_Chapter%205_2024_20241209.pdf) / [Market](https://www.copperleaf.com/why-copperleaf/what-is-asset-investment-planning/) |
| 4 | Indigenous Funder Reporting Dashboard | `Indigenous funder reporting`, `procurement and trust friction` | Implemented | Indigenous communities, nation-owned project teams | Centralizes milestones, costs, outcomes, and narrative exports for funder reporting. | High for live projects; willingness to pay comes from admin time saved and reporting quality. | Program manager, energy manager, economic development office | Smartsheet, spreadsheets, consultant reporting | One live project book, one export workflow, clear governance language | 4.2 | Lead now | [Official](https://www.canada.ca/en/services/environment/weather/climatechange/climate-plan/reduce-emissions/reducing-reliance-diesel/wah-ila-toos-funding-opportunities.html) / [Market](https://www.smartsheet.com/grant-management) |
| 5 | Utility Demand Forecasting Lane | `load-growth planning`, `large-load/data-centre connection readiness`, `DER hosting and non-wires planning` | Implemented | Utilities, REAs, planning consultants | Packages demand-growth scenarios, point-load assumptions, DER offsets, and planning outputs in one lane. | High pain, but procurement slower than the top four. | Planning director, VP Engineering, consultant lead | Itron, consultant studies, internal models | Accuracy framing, scenario traceability, connector-truth discipline | 4.0 | Lead now | [Official](https://www.ieso.ca/en/Sector-Participants/Planning-and-Forecasting/Annual-Planning-Outlook) / [Market](https://na.itron.com/what-we-offer/grid-planning) |
| 6 | Shadow Billing Module | `shadow billing and bill accuracy`, `retail bill volatility` | Implemented | Commercial operators, municipalities, public-sector facilities | Tests invoice accuracy, tariff fit, and switching outcomes in a more CFO-readable way. | Medium-high. Savings are concrete but project sizes are smaller. | Finance, facilities, energy manager | Utility Audit, EnergyCAP, manual bill review | Real invoice comparison, anomaly reports, account-level savings proof | 3.8 | Follow-up proof | [Official](https://natural-resources.canada.ca/sites/nrcan/files/oee/pdf/publications/infosource/pub/cipec/energyauditmanualandtool.pdf) / [Market](https://www.utilityaudit.com/) |
| 7 | Credit Banking Dashboard | `carbon credit and offset management`, `TIER cost optimization` | Implemented | Industrial compliance teams, carbon strategists | Tracks credit position and price exposure adjacent to TIER decisions. | Medium-high. Strong adjacency to TIER but not always first purchase. | Sustainability lead, CFO, carbon-market team | Carbon Assessors, brokers, manual ledgers | Current position model, pricing labels, auditability | 3.7 | Follow-up proof | [Official](https://www.alberta.ca/alberta-emission-offset-system) / [Market](https://www.carbonassessors.com/products/alberta) |
| 8 | AICEI Grant Reporting Module | `grant program reporting` | Implemented | Alberta Indigenous clean-energy project teams | Gives Alberta-specific reporting around generation, GHG reduction, and capacity building. | Medium-high. Program fit is strong but market is narrower than the broader funder dashboard. | Project manager, grant coordinator | Spreadsheets, Smartsheet, consultants | Program-specific export, cleaner live-data story, less demo feel | 3.7 | Follow-up proof | [Official](https://www.canada.ca/en/prairies-economic-development/services/funding/alberta-indigenous-clean-energy-initiative.html) / [Market](https://www.smartsheet.com/marketplace/apps/grant-management) |
| 9 | Utility Cyber Reporting & Trust Pack | `cyber and compliance reporting`, `procurement and trust friction` | Partial | Utility procurement teams, security reviewers | Packages security posture, data-handling disclosures, and reporting expectations into a buyer-facing trust surface. | Pain is real, but procurement is formal and proof burden is heavy. | CIO, CISO, procurement, legal | Dragos, internal security teams, consultants | Security review artifacts, evidence of controls, not just narrative pages | 3.4 | Park until proof improves | [Official](https://www.oeb.ca/consultations-and-projects/policy-initiatives-and-consultations/electricity-utility-cyber-security) / [Market](https://www.dragos.com/electric-grid-cybersecurity/) |
| 10 | Large-Load Connection Readiness Pack | `large-load/data-centre connection readiness`, `load-growth planning` | Absent in current product | Data-centre developers, utilities, planners | Would translate large-load scenarios into connection-readiness, timeline, and constraint narratives. | Pain is high and budgets exist, but proof burden is large and current implementation is absent. | Development lead, interconnection advisor, utility planning sponsor | Engineering studies, consultants, internal planning tools | Real project workflow, utility-grade engineering assumptions, customer evidence | 3.2 | Park for now | [Official](https://www.aeso.ca/aeso/newsroom/aeso-announces-interim-approach-to-large-load-connections/) / [Market](https://na.itron.com/who-we-serve/electric-utilities) |

### Official + Market Evidence Used Across the Top 10

- [Alberta TIER Regulation](https://www.alberta.ca/technology-innovation-and-emissions-reduction-regulation.aspx)
- [Alberta Emission Offset System](https://www.alberta.ca/alberta-emission-offset-system)
- [OEB Chapter 5 filing requirements](https://www.oeb.ca/regulatory-rules-and-documents/rules-codes-and-requirements/filing-requirements-transmission-distribution-applications)
- [OEB electricity utility cyber security](https://www.oeb.ca/consultations-and-projects/policy-initiatives-and-consultations/electricity-utility-cyber-security)
- [IESO Annual Planning Outlook](https://www.ieso.ca/en/Sector-Participants/Planning-and-Forecasting/Annual-Planning-Outlook)
- [AESO large-load integration update](https://www.aeso.ca/aeso/newsroom/aeso-announces-interim-approach-to-large-load-connections/)
- [Wah-ila-toos funding opportunities](https://www.canada.ca/en/services/environment/weather/climatechange/climate-plan/reduce-emissions/reducing-reliance-diesel/wah-ila-toos-funding-opportunities.html)
- [AICEI program page](https://www.canada.ca/en/prairies-economic-development/services/funding/alberta-indigenous-clean-energy-initiative.html)
- [Itron Grid Planning](https://na.itron.com/what-we-offer/grid-planning)
- [Copperleaf Asset Investment Planning](https://www.copperleaf.com/why-copperleaf/what-is-asset-investment-planning/)
- [Dragos Electric Grid Cybersecurity](https://www.dragos.com/electric-grid-cybersecurity/)
- [Smartsheet Grant Management](https://www.smartsheet.com/grant-management)
- [EnergyCAP Utility Bill Auditing](https://www.energycap.com/product-features/utility-bill-auditing-software/)
- [Utility Audit](https://www.utilityaudit.com/)
- [Carbon Assessors Alberta products](https://www.carbonassessors.com/products/alberta)

## 3. Top-5 + Next-5 Implementation and Score-Uplift Plan

Score improvement in this phase comes from two levers only:

- raising `Current Implementation Score`
- lowering `Additional Effort to first sellable pilot`

`Demand Score` remains fixed in this pass. Final `Build-Now Rating` continues to use the locked formula and one-decimal half-up rounding.

### 3.1 Immediate Priority: Top 5

| Feature | Route / Component | Current Build-Now Rating | Target Build-Now Rating | Current State | Minimum Sellable Slice | What To Improve First | What Not To Build Yet | Proof Artifact Needed | 30-Day Implementation Steps | 60-Day Pilot-Readiness Target | Why Buyers Will Pay |
|---|---|---:|---:|---|---|---|---|---|---|---|---|
| TIER Compliance Savings Calculator | `TIERROICalculator` | 4.4 | 4.8 | Strong Alberta-specific route with good framing, lead capture, and current pricing logic, but outputs still need to look more board-ready. | One facility workflow with source-labeled assumptions, a downloadable CFO memo, and a clearer fund-vs-market-vs-direct-investment comparison. | Add explicit pricing source/freshness labels, standardize assumptions, add one sample facility case, and sharpen the executive CTA. | Do not build multi-facility portfolio management, trading automation, or broker integrations yet. | Downloadable CFO memo showing compliance-path comparison, assumptions, and net savings. | Add source/freshness tags to every pricing field, create a memo export, tighten executive summary copy, and add one worked facility example. | A buyer can enter one facility scenario and leave with a CFO-readable decision memo that justifies a paid pilot. | The value is immediate cash savings and a finance-ready decision artifact. |
| Regulatory Filing Templates | `RegulatoryFilingExport` | 4.3 | 4.7 | The route already shows jurisdiction-specific templates and export behavior, but it still reads like a demo more than a filing-prep tool. | One customer-grade AUC pack and one customer-grade OEB pack with reviewer notes and obvious filing-prep workflow. | Improve sample packs, reviewer checklist, and export labeling so the tool feels filing-ready instead of illustrative. | Do not build full filing workflow software, regulator submission integrations, or collaboration features yet. | Export-ready filing pack with reviewer checklist and annotated schedules. | Create customer-grade Alberta and Ontario sample packs, annotate exports, and link filing routes to relevant proof pages. | One utility or consultant can use the route to prepare and internally review a real sample filing pack. | Buyers already spend money on filing prep, and saved manual time is easy to justify. |
| Asset Health Index | `AssetHealthDashboard` | 4.2 | 4.6 | The scoring flow works and the CSV-first posture is strong, but decision-ready packaging is still too thin for buyer meetings. | One sample fleet workflow with executive summary export, prioritized replacement list, and “why this asset” recommendation text. | Strengthen summary outputs, replacement-priority packaging, and municipal/REA positioning. | Do not build SCADA integration, sensor telemetry, or work-order integration yet. | Sample fleet pack with executive summary and prioritized replacement list. | Add executive export, sample fleet examples, explanation text for each priority asset, and visuals that support capex discussion. | A buyer can upload a fleet subset and leave with a meeting-ready package for replacement or deferment decisions. | It gives utilities a no-integration starting point for capex justification and asset prioritization. |
| Indigenous Funder Reporting Dashboard | `FunderReportingDashboard` | 3.6 | 4.2 | The route has strong template framing and reporting structure, but too much of the current experience still reads as demo fallback. | One hardened live-project reporting path with one funder-ready quarterly export, explicit governance language, and a repeatable reporting cycle. | Reduce demo feel, tighten project import/input flow, and make one report export unquestionably funder-ready and OCAP-aligned. | Do not build a grant CRM, cross-program operating system, or broad community ERP behavior yet. | Funder-ready quarterly report export for one live project portfolio. | Harden one template end to end, improve project input/import, raise narrative quality, and make governance language explicit in the route. | One community team can complete one reporting cycle for one project portfolio and export a funder-ready report. | Reporting is repetitive, under-resourced, and directly tied to funding continuity. |
| Utility Demand Forecasting Lane | `UtilityDemandForecastPage` | 3.5 | 4.1 | The route is strategically strong, but its trust burden is high and the current proof pack is too complex for a fastest-pilot motion. | One board/regulator-facing planning pack export with one benchmark appendix, simpler forecast-to-export flow, and stricter sample-vs-live disclosure. | Simplify the forecast-to-export path, sharpen benchmark references, and tighten connector-truth language. | Do not claim production utility onboarding, native `15-minute` telemetry, interconnection workflow expansion, or UtilityAPI live-lane commercialization. | Scenario-to-export planning pack with assumptions, benchmark appendix, and conservative trust notice. | Add a standard planning-pack export, reduce route complexity, inline benchmark/security references, and tighten stale/fallback/live disclosure. | One utility or consultant can run one scenario pack for one territory and leave with a pilot-grade planning artifact. | Buyers pay for defensible planning outputs when assumptions and proofs are visible. |

### 3.2 Next Priority: Next 5

| Feature | Route / Component | Current Build-Now Rating | Target Build-Now Rating | Current State | Deliver in This Phase | What To Hold Back | Proof Artifact Needed | 30-Day Preparation Steps | 60-Day Follow-On Target | Why It Is Not Page-One Lead Yet |
|---|---|---:|---:|---|---|---|---|---|---|---|
| Shadow Billing Module | `ShadowBillingModule` | 3.4 | 4.1 | Strong concept, but currently too simulated and not yet anchored in a real invoice-comparison artifact. | Create one real invoice-comparison proof asset, one municipal/public-sector savings narrative, and cleaner export/report output. | Keep it off the homepage and do not build full billing ingestion or account portfolio tooling yet. | Invoice-comparison proof report with clear savings delta. | Replace purely simulated framing with one proof-oriented sample, sharpen copy for municipal/public-sector buyers, and add export/report output. | Reach one proof-backed pilot story that can move the route from secondary to “prepare next” commercialization. | The savings story is real, but current proof is too thin and budgets are smaller than the top five. |
| Credit Banking Dashboard | `CreditBankingDashboard` | 3.3 | 3.9 | Good TIER adjacency, but still reads like a companion dashboard instead of a disciplined compliance-year workflow. | Add stronger inventory/audit model, clearer compliance-year allocation flow, and tighter tie-in to the main TIER route. | Do not position it as a standalone lead wedge or build trading integrations yet. | Credit position summary with compliance-year allocation logic. | Tighten sample holding logic, add allocation workflow clarity, and make provenance/disclosure more prominent. | Make it a strong TIER follow-on route that supports upsell after initial compliance conversion. | It is usually a second purchase rather than the first budget line. |
| AICEI Grant Reporting Module | `AICEIReportingModule` | 2.9 | 3.9 | Highly relevant program-wise, but currently too static and demo-heavy to sell confidently. | Add a program-grade export, a credible live-project input path, and less static reporting behavior. | Keep it under Indigenous proof/support positioning and do not promote it as a homepage lead surface yet. | AICEI-specific program report export for one live-style project. | Replace static examples with a tighter reporting workflow, improve inputs, and make outcome reporting feel operational rather than illustrative. | Become a credible Alberta-specific support route that strengthens the broader Indigenous reporting lane. | The niche is real, but the current route does not yet carry enough live-proof weight. |
| Utility Cyber Reporting & Trust Pack | `UtilitySecurityStatement` | 2.7 | 3.8 | Useful trust surface, but mostly narrative today and not yet a formal review artifact. | Add control matrix, utility-review checklist, downloadable security review pack, and route links from the utility forecast proof flow. | Keep it as a trust-enabler, not a lead wedge, and do not imply certification or production approval. | Downloadable security review pack with control matrix and checklist. | Convert narrative into structured review material, add artifact links, and tighten the route’s relationship to the forecast lane. | Support paid utility discovery by reducing procurement friction in planning conversations. | It helps close utility deals, but it does not itself create fast pilot demand. |
| Large-Load Connection Readiness Pack | `AIDataCentreDashboard` incubation | 1.8 | 3.4 | The market need is strong, but the workflow is largely absent and the current AI-data-centre route is still hybrid and planning-oriented. | Incubate one planning-mode overlay for large-load scenario narrative, one constraint/readiness summary, and one backlog-shaping document. | Do not spin up a new standalone route or present it as a commercial lead in this phase. | Constraint/readiness summary with one large-load planning narrative. | Add one planning overlay concept inside the existing AI-data-centre dashboard, map missing assumptions, and draft the backlog for future customer-specific work. | Become an incubation lane that informs future product design rather than near-term homepage positioning. | The budget exists, but implementation and proof are not mature enough yet. |

### 3.3 Score Uplift Path

| Feature | Current Build-Now Rating | Target Build-Now Rating | Implementation Score Change | Effort Change | Primary Uplift Driver | Top-Three Segment Outcome |
|---|---:|---:|---|---|---|---|
| TIER Compliance Savings Calculator | 4.4 | 4.8 | `4.1 -> 4.7` | `2 -> 1` | CFO-ready proof artifact plus stronger pricing-source trust | Clear top-three shortlist candidate in Alberta industrial compliance |
| Regulatory Filing Templates | 4.3 | 4.7 | `4.2 -> 4.8` | `2 -> 1` | Customer-grade filing packs and reviewer-oriented exports | Clear top-three shortlist candidate for small-utility filing prep |
| Asset Health Index | 4.2 | 4.6 | `4.0 -> 4.7` | `2 -> 1` | Decision-ready packaging and stronger executive outputs | Clear top-three shortlist candidate for CSV-first utility asset prioritization |
| Indigenous Funder Reporting Dashboard | 3.6 | 4.2 | `3.0 -> 4.3` | `3 -> 2` | Reduced demo feel plus one hardened funder-ready workflow | Top-three shortlist candidate in the Indigenous/community reporting niche |
| Utility Demand Forecasting Lane | 3.5 | 4.1 | `3.1 -> 4.2` | `3 -> 2` | Simpler planning-pack proof and stricter trust language | Top-three shortlist candidate in the small-utility planning-proof niche |
| Shadow Billing Module | 3.4 | 4.1 | `3.0 -> 4.5` | `3 -> 2` | Real invoice-comparison proof artifact | Border-case shortlist candidate only after proof asset lands |
| Credit Banking Dashboard | 3.3 | 3.9 | `2.8 -> 4.2` | `3 -> 2` | Better inventory/audit workflow tied to TIER decisions | Strong follow-on route, but not a top-three primary wedge yet |
| AICEI Grant Reporting Module | 2.9 | 3.9 | `2.0 -> 4.0` | `4 -> 2` | Program-grade export and less static reporting flow | Strong niche support surface, but not a top-three primary wedge yet |
| Utility Cyber Reporting & Trust Pack | 2.7 | 3.8 | `2.0 -> 4.3` | `4 -> 2` | Structured utility-review artifacts instead of narrative-only trust copy | Close-support trust asset, not a lead category wedge |
| Large-Load Connection Readiness Pack | 1.8 | 3.4 | `0.0 -> 4.0` | `5 -> 3` | Incubated workflow definition inside AI-data-centre planning mode | Incubation only; not a top-three candidate in this phase |

Implementation alone cannot make every feature top-three. Some features remain capped by slower procurement cycles, narrower budget ownership, or heavier proof requirements even after product quality improves.

After the constructed-proof sprint, score uplift needs to be tracked across three separate readiness layers:

- `implemented/product-ready`: the route can complete the intended workflow and generate the promised artifact from the current product surface
- `constructed-proof-ready`: the route now includes a realistic Alberta/Canada scenario bundle with explicit disclosure that it is not a customer file or audited production artifact
- `live-buyer-proof-ready`: the route has been exercised with a real buyer or partner dataset and can support outreach without constructed-data caveats

### 3.4 Proof Readiness Matrix After Constructed-Proof Sprint

| Feature | Implemented / Product-Ready | Constructed-Proof-Ready | Live-Buyer-Proof-Ready | Current Proof Asset | What Still Needs To Happen |
|---|---|---|---|---|---|
| Utility Demand Forecasting Lane | Yes | Yes | No | Ontario LDC DSP and Alberta municipal planning cases with planning memo, benchmark appendix, jurisdiction export, and attached utility security review pack | Replace at least one constructed planning case with a real utility or consultant load-history file run through the same export path. |
| Shadow Billing Module | Yes | Yes | No | Alberta municipal invoice-comparison case with uploaded-bill workflow, memo export, and monthly delta CSV | Run one live bill set through the energy-supply-only comparison flow and capture a buyer-facing savings memo. |
| Credit Banking Dashboard | Yes | Yes | No | Alberta industrial holdings/liability case with allocation schedule, expiry-risk export, and audit-style memo | Use one live holdings ledger plus liability schedule to validate the allocation workflow under a real compliance-year review. |
| AICEI Grant Reporting Module | Yes | Yes | No | Constructed Alberta portfolio with quarterly report, metrics CSV, and missing-approval checklist | Replace the constructed portfolio with one Nation- or partner-reviewed reporting set before claiming live program proof. |
| Indigenous Funder Reporting Dashboard | Yes | Yes | No | Constructed Wah-ila-toos quarterly report plus outreach cover note with explicit owner-supplied governance markers | Graduate one real community-backed project set into the same reporting path and preserve OCAP/FPIC review language in the exported pack. |
| Utility Cyber Reporting & Trust Pack | Yes | Yes | No | Structured security review pack, questionnaire template, owner-supplied checklist, and evidence-mapping sheet attached to the forecast pilot | Fill one buyer-specific questionnaire using real counterparty inputs and map each answer to repo-backed or owner-supplied evidence. |
| Large-Load Connection Readiness Pack | Yes | Yes | No | Alberta screening scenario with readiness summary and backlog checklist labeled as planning narrative only | Use one buyer-specific large-load scenario in a live Alberta conversation; keep the route as support-only until that happens. |

Constructed scenarios improve demo credibility, sales readiness, and workflow completion. They do not fully replace live buyer proof, so any score narrative must still distinguish `constructed-proof-ready` from `live-buyer-proof-ready`.

### 3.5 Live-Buyer-Proof Graduation Status After Repo-Safe Cleanup

The repo-safe blockers have now been reduced in three ways:

- `TIER pricing integrity corrected`
  - the default public pricing basis now reflects the current `2026` Alberta fund-price footing instead of stale `$95/t` copy
  - market-credit fallback pricing is now labeled as a planning snapshot rather than an official or live quote
- `Indigenous reporting claim risk reduced`
  - public funder-reporting copy now says `OCAP-aligned workflow` and requires owner-supplied governance review before external sharing
  - the route no longer presents itself as certified sovereignty infrastructure or nation-held-key production infrastructure
- `Bridge/live-proof work still blocked externally`
  - a real buyer bill, real utility load-history file, real credit ledger, or real community portfolio is still required to cross from `constructed-proof-ready` to `live-buyer-proof-ready`
  - burner staging for the London-Hydro-first bridge still requires a disposable domain, a VPS, and Supabase staging secrets outside this repo

| Track | Repo-Side Status | External Blocker | Immediate Next Step |
|---|---|---|---|
| Shadow Billing live proof | Product-ready and constructed-proof-ready | Need one real 12-month buyer bill file | Upload one real file, generate the `energy-supply-only` invoice-comparison memo, and keep the distributor-specific RoLR anchor explicit. |
| Utility Forecast upload-first proof | Product-ready and constructed-proof-ready | Need one real utility or consultant CSV | Run one real load-history CSV through the upload-first planning-pack flow before spending more time on bridge work. |
| Utility bridge Layer A/B | Local helpers and runtime tests validated; Layer C intentionally blocked | Need burner domain, staging host, VPS signer, and Supabase secrets | Provision `app-staging.<burner-domain>` and `gb-staging.<burner-domain>`, then run Layer A and Layer B only. |
| Credit Banking live proof | Product-ready and constructed-proof-ready | Need one real holdings ledger plus liability schedule | Replace the constructed files with one real buyer ledger only after refreshing or explicitly disclosing the pricing basis. |
| AICEI live proof | Product-ready and constructed-proof-ready | Need one Nation- or partner-reviewed reporting portfolio | Run one real portfolio through the export path and preserve owner-supplied governance markers in the report. |
| Indigenous Funder Reporting live proof | Product-ready and constructed-proof-ready | Need one community-backed Wah-ila-toos-style project set | Generate one real quarterly report after community review and keep the route in `OCAP-aligned` language. |
| Utility Security / Large-Load | Support-pack ready | Need a real forecast pilot or Alberta large-load conversation | Keep both as support surfaces only; do not treat either as an independent lead wedge. |

What can be executed from the CLI today inside the repo is limited to validation and evidence helpers:

```bash
node ops/utility-connector-bridge/scripts/bridge-evidence.mjs --help
bash ops/utility-connector-bridge/scripts/layer-c-tls-evidence.sh
npx vitest run \
  tests/unit/utilityConnectorRuntime.test.ts \
  tests/unit/utilityConnectorBridge.test.ts \
  tests/unit/utilityApiDemoRuntime.test.ts \
  tests/unit/utilitySubmissionReadiness.test.ts
```

Those commands validate the local bridge/tooling layer only. They do not substitute for a real staging domain, real secrets, or real buyer files.

## 4. UI Restructure Plan

### What was wrong with the previous front door

- `/` opened to a broad dashboard-first experience.
- The strongest commercial routes were buried deeper in navigation.
- Operational noise, fallback behavior, and generic analytics density diluted the sales message.
- Prediction was visible, but not attached tightly enough to a budget-owned buyer workflow.

### What is now implemented

The front-end restructure is now wired through these files:

- [src/components/CommercialLandingPage.tsx](/Users/sanjayb/minimax/canada-energy-dashboard/src/components/CommercialLandingPage.tsx)
- [src/components/SolutionsNavigatorPage.tsx](/Users/sanjayb/minimax/canada-energy-dashboard/src/components/SolutionsNavigatorPage.tsx)
- [src/lib/commercialPositioning.ts](/Users/sanjayb/minimax/canada-energy-dashboard/src/lib/commercialPositioning.ts)
- [src/App.tsx](/Users/sanjayb/minimax/canada-energy-dashboard/src/App.tsx)

### New route architecture

- `/` is now a dedicated commercial landing page.
- `/solutions` and `/use-cases` are now the page-two navigator for the top five wedges.
- `/dashboard` remains available as the broad product surface, but no longer acts as the default front door.
- `/features` now redirects to `/solutions` instead of dropping the buyer back into the broad dashboard journey.

### Page 1 structure now implemented

- `Problem-led hero`
  - prediction is framed as the engine inside filings, savings, maintenance, and reporting
- `5 wedge cards`
  - TIER, Regulatory Filing, Asset Health, Indigenous Reporting, Utility Forecasting
- `Segment switcher`
  - Utility
  - Industrial
  - Indigenous/Community
  - Municipal/Public Sector
- `Proof ribbon`
  - Forecast Benchmarking
  - Utility Security
  - AICEI proof
- `Trust strip`
  - explicit demotion of dashboard-first and sandbox-first positioning

Only the `Immediate Priority` top five remain page-one/page-two promoted surfaces. The next-priority five stay secondary until their proof artifacts land.

### Page 2 structure now implemented

- Buyer-segment filter
- Wedge-by-wedge use-case cards containing:
  - buyer
  - pain
  - minimum pilot scope
  - timeline to value
  - proof artifact
  - CTA
- Reserve-lane section for:
  - Shadow Billing
  - AICEI

### Design rules applied

- Alberta-first commercial framing
- no purple-led hero treatment
- darker slate, emerald, cyan, and amber palette
- stronger typography hierarchy
- route-level CTAs for pilots instead of generic dashboard exploration
- dashboard preserved as supporting proof, not primary conversion path

### Acceptance bar for the new UI

- a buyer should understand the top five wedges in under `90 seconds`
- one click should reach a wedge or proof page
- the homepage should explain what CEIP sells before it shows broad analytics
- top five routes must remain the primary sales path
- utility-connector and API-trust claims must stay conservative and explicit

## Bottom Line

The last three to six months of work were not wasted. The mistake was not building prediction. The mistake was letting prediction and dashboard breadth lead the story before CEIP had narrowed the product to the few workflows buyers will actually fund quickly.

The repositioning is now clearer:

- sell `compliance`, `cost savings`, `asset justification`, and `funder reporting` first
- keep `prediction` as the engine underneath those outcomes
- use the homepage and solutions page to force that message immediately
- expand only after the first five wedges prove demand with customers
