# OEB Innovation Sandbox — Project Proposal

## ML-Assisted Distribution System Planning for Small Ontario LDCs

**Applicant:** Canadian Energy Intelligence Platform (CEIP)
**Date:** February 2026
**Sandbox Stream:** Innovation Pilot — AI/ML for Distribution Planning
**Requested Duration:** 12 months
**Target Participants:** 2–3 Ontario LDCs with <12,500 customers

---

## 1. EXECUTIVE SUMMARY

This proposal seeks OEB Innovation Sandbox support to pilot an **ML-assisted distribution system planning tool** designed specifically for small Ontario Local Distribution Companies (LDCs). The pilot addresses a documented capability gap: small LDCs (serving <12,500 customers) lack the technical resources and budget to deploy enterprise-grade analytics tools (e.g., Oracle, Enverus at $100K+/yr), yet face the same OEB filing requirements as larger utilities — including Chapter 5 Distribution System Plans (DSPs) with load forecasting, asset condition assessment, and reliability reporting.

The proposed tool provides:
1. **Automated load forecasting** using seasonal decomposition trained on IESO demand data and weather variables
2. **CSV-based asset health scoring** using CBRM-lite methodology compatible with OEB Appendix 2-AB
3. **Pre-formatted regulatory filing exports** for Chapter 5 DSP Sections 5.2, 5.3, and 5.4
4. **Forecast accuracy benchmarking** with transparent MAE/MAPE/RMSE metrics vs standard baselines

All capabilities run as a web application — no on-premise installation, SCADA integration, or IT infrastructure changes required.

---

## 2. PROBLEM STATEMENT

### 2.1 The "Missing Middle" in Ontario Distribution Planning

Ontario's electricity distribution sector includes approximately **60 LDCs**, of which roughly **30 serve fewer than 12,500 customers**. These small LDCs face a structural disadvantage in distribution system planning:

| Challenge | Impact |
|-----------|--------|
| **Enterprise tools are cost-prohibitive** | Oracle Utilities, Enverus, and similar platforms cost $100K–$500K/yr — often exceeding 10% of a small LDC's total O&M budget |
| **Limited technical staff** | Small LDCs typically have 1–3 engineering staff responsible for all planning, operations, and capital budgeting |
| **Same regulatory requirements** | OEB Chapter 5 DSP filing requirements apply equally to a 3,000-customer LDC and a 300,000-customer LDC |
| **Manual processes dominate** | Load forecasting often relies on spreadsheet-based trending; asset condition assessment uses visual inspection records on paper or basic databases |
| **Legacy billing systems** | Many small LDCs use systems like Banyon Data Systems that provide billing but no analytics capability |

### 2.2 Regulatory Filing Burden

Under the OEB's filing requirements for electricity distribution rate applications, all LDCs must submit:
- **Section 5.2:** Asset condition assessment with health index scoring
- **Section 5.3:** System capability analysis including 5-year load forecasts
- **Section 5.4:** Customer-focused reliability metrics (SAIDI, SAIFI, CAIDI)

For small LDCs, preparing these sections manually typically requires **40–80 staff-hours per filing cycle**, often with results that lack the statistical rigor expected by OEB reviewers. This creates both a compliance burden and a quality gap.

### 2.3 Emerging Complexity

The energy transition is increasing planning complexity for all LDCs:
- **EV adoption** creates new demand patterns (residential evening peaks)
- **Distributed generation** (rooftop solar, battery storage) changes load profiles
- **Extreme weather events** stress aging infrastructure
- **Net-zero commitments** require forward-looking capacity planning

Small LDCs need analytical tools to manage this complexity, but the market provides no appropriately-priced solutions between expensive enterprise platforms and manual spreadsheets.

---

## 3. PROPOSED SOLUTION

### 3.1 Platform Overview

The Canadian Energy Intelligence Platform (CEIP) is a web-based analytics tool that provides distribution system planning capabilities at a fraction of enterprise tool costs. For this pilot, we propose deploying three specific modules:

#### Module 1: ML Load Forecasting Engine

| Feature | Detail |
|---------|--------|
| **Methodology** | Additive seasonal decomposition (trend + hourly + weekly + monthly seasonality) with weather regression |
| **Training data** | 175,000+ hourly IESO Ontario demand records |
| **Forecast horizons** | 1-hour to 30-day ahead |
| **Accuracy metrics** | MAE, MAPE, RMSE benchmarked against persistence and seasonal naive baselines |
| **Weather integration** | Environment Canada temperature data as exogenous variable |
| **Customization** | Model can be re-trained on LDC-specific historical load data from billing system exports |

#### Module 2: Asset Health Scoring (CBRM-Lite)

| Feature | Detail |
|---------|--------|
| **Input format** | CSV upload — no SCADA, sensors, or IT integration required |
| **Scoring methodology** | Weighted composite Health Index (0–100) per OEB Appendix 2-AB |
| **Factors** | Age (30%), Loading (25%), Maintenance history (25%), Environment (20%) |
| **Asset types** | Transformers, poles, underground cable, switchgear, reclosers, capacitor banks, meters, protection relays |
| **Output** | Condition categories (Good/Fair/Poor/Very Poor), risk priority, recommended actions, next inspection dates |
| **Regulatory format** | Direct export to OEB Section 5.2 template format |

#### Module 3: Regulatory Filing Export Templates

| Feature | Detail |
|---------|--------|
| **Ontario templates** | OEB Chapter 5 Sections 5.2, 5.3, 5.4 |
| **Alberta templates** | AUC Rule 005 Schedules 4.2, 10, 17, 22 (for cross-provincial comparisons) |
| **Export formats** | CSV with regulatory headers and notes |
| **Data mapping** | Auto-populates from Module 1 (load forecasts) and Module 2 (asset condition) |

### 3.2 Technical Architecture

- **Deployment:** Cloud-hosted web application (SaaS) — no on-premise installation
- **Access:** Web browser — no software installation required
- **Security:** SOC 2 Type II aligned practices, data encrypted at rest and in transit
- **Data ownership:** All uploaded LDC data remains property of the LDC; data is not shared between pilot participants

---

## 4. CONSUMER BENEFIT

### 4.1 Direct Benefits

| Benefit | Quantification |
|---------|---------------|
| **Reduced filing preparation time** | 40–80 hours/cycle → estimated 8–15 hours (70–80% reduction) |
| **Improved forecast accuracy** | ML models typically achieve 15–30% MAE improvement over manual trending |
| **Better asset investment decisions** | Systematic health scoring identifies highest-risk assets for targeted replacement |
| **Lower regulatory consulting costs** | Small LDCs spend $20K–$50K/year on external consultants for DSP preparation |
| **Improved reliability** | Data-driven asset management correlates with 10–20% SAIDI improvement over 3–5 years (industry benchmarks) |

### 4.2 Indirect Benefits

- **Rate impact mitigation:** Better capital planning reduces unnecessary expenditures that would otherwise be passed through to ratepayers
- **Safety improvement:** Systematic identification of poor-condition assets reduces failure-related safety incidents
- **Regulatory quality:** Higher-quality DSP submissions reduce interrogatories and regulatory processing time
- **Knowledge transfer:** Pilot participants gain analytics capabilities that persist beyond the pilot period

### 4.3 Innovation Value

This pilot tests whether **ML-based analytics can be made accessible to small utilities** through:
- Web-based delivery (no IT infrastructure)
- CSV-based data input (no SCADA integration)
- Pre-formatted regulatory outputs (no custom report building)
- Transparent accuracy metrics (no "black box" AI)

The findings will inform OEB policy on whether to encourage or require analytics-based approaches in DSP filings from all LDCs.

---

## 5. PILOT DESIGN

### 5.1 Participant Selection Criteria

| Criterion | Requirement |
|-----------|-------------|
| **Size** | <12,500 customers |
| **Willingness** | Signed participation agreement |
| **Data availability** | Minimum 2 years of monthly billing data; basic asset registry (CSV or spreadsheet) |
| **Upcoming filing** | Preference for LDCs with DSP filing within 12–18 months of pilot start |
| **Geographic diversity** | Target 1 Northern, 1 Southern, 1 Central Ontario LDC |

### 5.2 Target LDCs (Preliminary)

Based on publicly available OEB data, potential pilot candidates include:
- **Lakefront Utilities** (Cobourg) — ~11,000 customers
- **Centre Wellington Hydro** — ~7,500 customers
- **Westario Power** — ~12,000 customers
- **Orangeville Hydro** — ~10,500 customers

*Note: Formal outreach pending Sandbox approval. No commitments secured.*

### 5.3 Pilot Timeline

| Month | Activity |
|-------|----------|
| **1–2** | Onboarding: Data collection, model customization, staff training |
| **3–6** | Active use: Load forecasting, asset scoring, iterative refinement |
| **7–9** | Filing support: Regulatory export generation, accuracy documentation |
| **10–11** | Evaluation: Metrics collection, participant surveys, cost-benefit analysis |
| **12** | Report: Final report to OEB with findings, recommendations, publication |

### 5.4 Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Filing preparation time reduction | ≥50% | Pre/post time tracking |
| Load forecast MAE improvement vs manual | ≥15% | Backtest on historical data |
| Asset health coverage | ≥80% of distribution assets scored | Asset registry completeness |
| Participant satisfaction | ≥4/5 rating | Post-pilot survey |
| Cost per LDC | <$15,000/year | Total cost of deployment |
| Staff capability improvement | Self-assessed improvement | Pre/post capability survey |

---

## 6. REGULATORY CONSIDERATIONS

### 6.1 Regulatory Relief Requested

**None.** This pilot does not require any exemptions from existing OEB rules or codes. The tool operates within the existing regulatory framework by:
- Using OEB-standard formats for all outputs
- Providing accuracy metrics that allow reviewers to assess forecast quality
- Maintaining full data transparency (no proprietary "black box" methods)

### 6.2 Data Privacy

- All LDC data processed and stored in Canadian data centers (AWS ca-central-1)
- No customer-level data required — the tool operates on aggregate load data and asset registries
- Data Processing Agreement (DPA) with each participating LDC
- Data deleted upon pilot completion unless LDC requests retention

### 6.3 Intellectual Property

- Pilot participants retain full ownership of their data and any outputs generated
- The platform's analytical methodology is documented and transparent
- No lock-in: CSV-based inputs and outputs ensure LDCs can migrate to any other tool

---

## 7. BUDGET

### 7.1 Cost Structure

| Item | Cost (CAD) | Notes |
|------|-----------|-------|
| Platform licensing (3 LDCs × 12 months) | $54,000 | $1,500/mo/LDC — subsidized pilot rate |
| Onboarding & customization | $30,000 | Model training on LDC-specific data, 10h/LDC |
| Training & support | $18,000 | 4 training sessions + ongoing support per LDC |
| Evaluation & reporting | $12,000 | Data collection, analysis, final report |
| Contingency (10%) | $11,400 | |
| **Total** | **$125,400** | |

### 7.2 Funding Sources

| Source | Amount | Status |
|--------|--------|--------|
| Applicant (CEIP) | $54,000 | Committed (in-kind: platform licensing) |
| Participating LDCs | $36,000 | $12,000 each (reduced from standard pricing) |
| OEB Innovation Fund or equivalent | $35,400 | Requested |

### 7.3 Post-Pilot Sustainability

If the pilot demonstrates value, participating LDCs may continue at commercial pricing ($2,500–$5,000/mo depending on customer count). The per-LDC cost remains well below the $20K–$50K/yr currently spent on external consulting for DSP preparation.

---

## 8. TEAM

| Role | Individual | Relevant Experience |
|------|-----------|-------------------|
| **Project Lead / Technical** | [Founder Name] | Energy analytics, ML engineering, Canadian grid data (IESO/AESO) |
| **Regulatory Advisor** | [TBD — seeking partnership] | OEB filing experience, utility rate applications |
| **LDC Liaison** | [TBD — from pilot LDCs] | Internal champion at each participating LDC |

*Note: Team will be finalized upon Sandbox approval. Seeking regulatory consulting partnership with firms experienced in small LDC filings (e.g., Elenchus Research, METSCO Energy Solutions).*

---

## 9. EXPECTED OUTCOMES & NEXT STEPS

### 9.1 For Participating LDCs
- Modernized distribution planning capabilities without capital investment
- Reduced DSP preparation burden
- Improved asset investment prioritization
- Transferable analytical skills for staff

### 9.2 For the OEB
- Evidence on whether ML-based tools improve DSP quality for small LDCs
- Data on cost-effectiveness of analytics vs manual approaches
- Input for potential future guidance on analytical methods in DSP filings
- Published case study for broader LDC community

### 9.3 For Ontario Consumers
- Better-informed utility capital spending decisions
- Reduced regulatory processing costs
- Improved reliability through data-driven asset management
- Lower long-term rate impacts from optimized infrastructure investment

### 9.4 Immediate Next Steps (Upon Sandbox Approval)
1. Finalize regulatory advisory partnership
2. Formal outreach to target LDCs
3. Sign participation agreements
4. Begin data collection and model customization
5. Launch pilot operations (Month 3)

---

## 10. CONTACT

**Canadian Energy Intelligence Platform (CEIP)**
- Website: [ceip.ca — to be configured]
- Email: [contact@ceip.ca — to be configured]
- OEB Sandbox inquiry reference: [To be assigned]

---

*This proposal is submitted in accordance with the OEB Innovation Sandbox process. The applicant understands that Sandbox participation does not constitute OEB endorsement of the product or technology.*

*Prepared: February 2026*
*Version: 1.0*
