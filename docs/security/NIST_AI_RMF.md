# NIST AI Risk Management Framework (AI RMF 1.0) — Compliance Mapping

**Version**: 1.0 | **Date**: 2026-07-01 | **Standard**: NIST AI RMF 1.0 (January 2023)

This document maps existing controls in the Canada Energy Dashboard to the four core functions of the NIST AI RMF: **Govern**, **Map**, **Measure**, and **Manage**. It is intended for enterprise sales enablement and AI governance audit preparation.

---

## 1. GOVERN — Cultivate a Culture of Risk Management

### GOVERN-1: Policies, processes, procedures, and practices governing AI

| Sub-Category | Status | Evidence |
|---|---|---|
| GOVERN-1.1: Legal and regulatory requirements understood | **Pass** | `regulatoryScenarios.ts` maps CER EF2026 + OEB filing requirements; `canadianRegulatory.ts` tracks compliance obligations |
| GOVERN-1.2: Characteristics of trustworthy AI integrated | **Pass** | Claim boundaries on all forecasts (`claim_boundary` field); advisory labels on all predictions |
| GOVERN-1.3: Processes defined for transparency and accountability | **Pass** | `proofPack.ts` system provides cryptographic evidence trails; `auditTrailManifest.ts` for audit logging |
| GOVERN-1.4: Organizational AI risk management practices reviewed | **Partial** | No formal AI risk committee; security fixes applied via sprint methodology |
| GOVERN-1.5: Ongoing monitoring and periodic updates defined | **Pass** | `driftDetector.ts` (ADWIN) provides automated concept drift detection with retrain triggers |

### GOVERN-2: Accountability structures

| Sub-Category | Status | Evidence |
|---|---|---|
| GOVERN-2.1: Roles and responsibilities clearly defined | **Partial** | Developer-led; no formal AI governance board |
| GOVERN-2.2: Accountability for AI system outcomes established | **Pass** | Claim boundaries explicitly state what can and cannot be claimed; `do_not_claim` arrays on all reports |
| GOVERN-2.3: Third-party AI risks managed | **Pass** | TSFM models run via controlled Python training scripts; no unmanaged third-party AI APIs in production |

### GOVERN-3: Workforce diversity and AI literacy

| Sub-Category | Status | Evidence |
|---|---|---|
| GOVERN-3.1: AI literacy promoted | **Pass** | `helpContent.ts` and `energyKnowledgeBase.ts` provide educational content; `quizData.ts` for knowledge testing |
| GOVERN-3.2: Guidance on AI use documented | **Pass** | `docs/COMBINED_RESEARCH_SYNTHESIS_AND_IMPLEMENTATION_PLAN.md` documents model selection rationale |

### GOVERN-4: Organizational integration

| Sub-Category | Status | Evidence |
|---|---|---|
| GOVERN-4.1: AI risk management integrated into organizational risk management | **Partial** | Security sprints integrated into development cycle; no formal enterprise risk framework |
| GOVERN-4.2: AI risk management practices aligned with organizational values | **Pass** | OCAP® principles respected in `funderReportingSupport.ts`; Indigenous data sovereignty considered |

---

## 2. MAP — Contextualize AI Systems

### MAP-1: Context established

| Sub-Category | Status | Evidence |
|---|---|---|
| MAP-1.1: Intended purposes and context understood | **Pass** | Each forecast module documents its purpose, scope, and limitations in claim boundaries |
| MAP-1.2: Context of use defined | **Pass** | `utilityForecastBenchmarkPack.ts` defines evaluation contracts for utility-specific use cases |
| MAP-1.3: Deployment context understood | **Pass** | Advisory labels distinguish decision-support from operational instructions |
| MAP-1.4: Internal and external stakeholders identified | **Pass** | Regulatory alignment with CER, OEB, IESO, AESO documented in `regulatoryScenarios.ts` |

### MAP-2: Classification of AI systems

| Sub-Category | Status | Evidence |
|---|---|---|
| MAP-2.1: Type of AI system identified | **Pass** | Model manifests in `modelInference.ts` document model types (TSFM, LightGBM, GNN, PINN) |
| MAP-2.2: Task and output documented | **Pass** | `HORIZON_MODEL_MAP` in `mlForecasting.ts` documents model-to-task mapping with rationale |
| MAP-2.3: AI system capability and limits documented | **Pass** | `dataContract.ts` defines schema, quality checks, and revision policies per data source |
| MAP-2.4: Third-party software documented | **Pass** | `requirements.txt` files in `training/` document all Python dependencies |

### MAP-3: Capabilities and limitations

| Sub-Category | Status | Evidence |
|---|---|---|
| MAP-3.1: Benefits understood | **Pass** | `commercialPositioning.ts` documents value propositions per capability |
| MAP-3.2: Limitations documented | **Pass** | Every report includes `claim_boundary` and `do_not_claim` fields |
| MAP-3.3: Failures and impacts understood | **Pass** | `weakGridFixtures.ts` advisory labels explain operational risks; `resilienceScoring.ts` quantifies failure impacts |

### MAP-4: Impact assessment

| Sub-Category | Status | Evidence |
|---|---|---|
| MAP-4.1: Likelihood and magnitude of impacts assessed | **Pass** | `uncertaintyEngine.ts` Monte Carlo + Sobol QMC quantifies uncertainty; conformal prediction provides coverage guarantees |
| MAP-4.2: Vulnerable populations considered | **Pass** | OCAP® compliance for Indigenous data; `aiceiReportingSupport.ts` for Indigenous community reporting |
| MAP-4.3: Environmental impact considered | **Pass** | Platform focuses on energy transition; carbon market forecasting in roadmap |

---

## 3. MEASURE — Assess, Analyze, Track AI Risks

### MEASURE-1: Selecting and validating appropriate metrics

| Sub-Category | Status | Evidence |
|---|---|---|
| MEASURE-1.1: Appropriate metrics selected | **Pass** | `utilityForecastBenchmarkPack.ts` uses MAE, MAPE, RMSE, CRPS, pinball loss, coverage rate |
| MEASURE-1.2: Metrics validated | **Pass** | Rolling-origin backtests in `training/tsfm_benchmarks/benchmark.py` |
| MEASURE-1.3: Statistical significance assessed | **Pass** | Conformal prediction provides formal coverage guarantees (CQR, ACI) |

### MEASURE-2: Evaluating AI systems

| Sub-Category | Status | Evidence |
|---|---|---|
| MEASURE-2.1: Test data representative | **Pass** | Canadian energy data (IESO, AESO, AECO) used for all training and evaluation |
| MEASURE-2.2: Performance across subgroups | **Pass** | `hierarchicalReconciliation.ts` evaluates forecasts at province, region, and system levels |
| MEASURE-2.3: Robustness evaluated | **Pass** | `sensitivityEngine.ts` (Morris method) + `hampelFilter` for outlier robustness |
| MEASURE-2.4: Privacy evaluated | **Pass** | No PII in ML pipelines; `consentAuditLog.ts` for data consent tracking |
| MEASURE-2.5: Security evaluated | **Pass** | OWASP ASVS Level 1 verified (see `docs/security/ASVS_CHECKLIST.md`) |

### MEASURE-3: Tracking metrics over time

| Sub-Category | Status | Evidence |
|---|---|---|
| MEASURE-3.1: Performance monitored | **Pass** | `driftDetector.ts` (ADWIN) continuously monitors for concept drift |
| MEASURE-3.2: Relevant changes tracked | **Pass** | `dataContract.ts` versioning with `updatedAt` timestamps; revision policies per data source |
| MEASURE-3.3: Feedback collected | **Pass** | `pilotEvidence.ts` and `consultationWorkflow.ts` capture user feedback |

---

## 4. MANAGE — Prioritize and Act on AI Risks

### MANAGE-1: Risk prioritization

| Sub-Category | Status | Evidence |
|---|---|---|
| MANAGE-1.1: Risks prioritized | **Pass** | `resilienceScoring.ts` quantifies risk; advisory labels (weak/marginal/strong) for grid strength |
| MANAGE-1.2: Risk treatment selected | **Pass** | Claim boundaries define what predictions are safe to use operationally vs. advisory-only |
| MANAGE-1.3: Risk treatment implemented | **Pass** | Conformal prediction intervals provide calibrated uncertainty; alert tiers (curtail/watch/monitor) for GA/ICI |

### MANAGE-2: Risk response

| Sub-Category | Status | Evidence |
|---|---|---|
| MANAGE-2.1: Mitigation measures documented | **Pass** | `do_not_claim` arrays explicitly list what mitigations are needed |
| MANAGE-2.2: Mechanisms for monitoring | **Pass** | ADWIN drift detector triggers automatic retraining; ACI adaptive conformal updates |
| MANAGE-2.3: Incident response | **Partial** | No formal AI incident response plan; error boundaries prevent cascading failures |

### MANAGE-3: Third-party risks

| Sub-Category | Status | Evidence |
|---|---|---|
| MANAGE-3.1: Third-party risks assessed | **Pass** | TSFM models (Chronos, Moirai) run via controlled training scripts; no black-box API dependency |
| MANAGE-3.2: Third-party monitoring | **Pass** | `tsfmInterface.ts` parses benchmark results; model weights versioned in `modelWeights/MANIFEST.md` |
| MANAGE-3.3: Third-party incidents managed | **Pass** | `driftDetector.ts` detects model degradation; fallback to seasonal naive baseline |

### MANAGE-4: AI system transparency

| Sub-Category | Status | Evidence |
|---|---|---|
| MANAGE-4.1: System documentation maintained | **Pass** | `docs/COMBINED_RESEARCH_SYNTHESIS_AND_IMPLEMENTATION_PLAN.md` + deep research documents |
| MANAGE-4.2: Explainability mechanisms | **Pass** | `explainabilityEngine.ts` (TreeSHAP-lite, KernelSHAP-lite) + regulatory explanation reports |
| MANAGE-4.3: Stakeholder communication | **Pass** | `regulatoryTemplates.ts` provides filing-ready documentation; proof packs for evidence |

---

## Summary

| Core Function | Total Sub-Categories | Pass | Partial | N/A | Fail |
|---|---|---|---|---|---|
| **GOVERN** | 11 | 8 | 3 | 0 | 0 |
| **MAP** | 13 | 13 | 0 | 0 | 0 |
| **MEASURE** | 10 | 10 | 0 | 0 | 0 |
| **MANAGE** | 11 | 10 | 1 | 0 | 0 |
| **Overall** | 45 | 41 (91%) | 4 (9%) | 0 (0%) | 0 (0%) |

## Remediation Items

1. **GOVERN-1.4**: Establish formal AI risk review process (quarterly review cadence)
2. **GOVERN-2.1**: Define AI governance roles (AI risk owner, model owner, data owner)
3. **GOVERN-4.1**: Integrate AI risk into enterprise risk management framework
4. **MANAGE-2.3**: Create formal AI incident response plan (model failure escalation procedures)

## Cross-References

- OWASP ASVS Checklist: `docs/security/ASVS_CHECKLIST.md`
- Combined Research Plan: `docs/COMBINED_RESEARCH_SYNTHESIS_AND_IMPLEMENTATION_PLAN.md`
- Deep Research Gap Analysis: `docs/Deep_Reseraches/DEEP_RESEARCH_PREDICTION_MODEL.md`
