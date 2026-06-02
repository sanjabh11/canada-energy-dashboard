# CEIP Hermes Outreach Operating Plan

**Last updated:** May 29, 2026
**Primary runtime:** Hermes CLI + gateway on this workstation
**Secondary support only:** OpenClaw local gateway and `ceip-outreach` browser profile

## Summary

- Hermes is the primary outreach operating system for CEIP.
- OpenClaw is optional support only for browser-side inspection and draft review.
- The active business lane is **proof-pack pilot outreach**.
- All sending remains **manual and human-approved**.
- CEIP leads with buyer-ready proof packs, not broad dashboards, generic AI, or production connector claims.

## Daily Workflow

1. Verify Hermes health:
   - `hermes --version`
   - `hermes gateway status`
   - `hermes cron list`
   - if `hermes cron list` looks stale, trust `~/.hermes/cron/jobs.json`
2. Use the proof-pack draft loop:
   - job: `ceip-consultant-outreach`
   - skill: `daily-code-outreach`
   - context script: `~/.hermes/scripts/ceip_outreach_context.py`
3. Select exactly one proof pack per prospect from the route-selection matrix below.
4. Review the generated draft manually before any send decision.
5. Send manually only.
6. Immediately log each real send:
   - `python3 ~/.hermes/scripts/ceip_log_manual_send.py --target "<full name>" --channel linkedin --variant <variant_id>`
7. Start Phase F repo evidence collection from a zero-evidence workspace, not from hand-edited CSV files:
   - `pnpm run create:phase-f-evidence-workspace -- --output-dir /tmp/ceip-phase-f-evidence`
   - `pnpm run report:phase-f-evidence-workspace -- --workspace-dir /tmp/ceip-phase-f-evidence`
   - after `update:pilot-evidence-register-row` writes an updated candidate register inside that workspace, rerun `pnpm run report:phase-f-evidence-workspace -- --workspace-dir /tmp/ceip-phase-f-evidence --register-file /tmp/ceip-phase-f-evidence/phase-f-minimum-register-updated.csv`
8. Mirror only anonymized proof-pack response evidence into the repo when a completed send or reply changes pilot follow-up:
   - append rows with `pnpm run append:outreach-response-log-row -- --log-file /tmp/ceip-phase-f-evidence/outreach/outreach-response-log.csv ...`
   - do not hand-edit confidence-moving CSV rows
   - validate status with `pnpm run validate:outreach-response-log -- /tmp/ceip-phase-f-evidence/outreach/outreach-response-log.csv`
   - summarize with `pnpm run report:outreach-response-log -- /tmp/ceip-phase-f-evidence/outreach/outreach-response-log.csv`
   - plan intake with `pnpm run plan:outreach-intake -- /tmp/ceip-phase-f-evidence/outreach/outreach-response-log.csv`
   - create intake packets only for actionable rows with `pnpm run create:outreach-intake-packets -- --log-file /tmp/ceip-phase-f-evidence/outreach/outreach-response-log.csv --output-dir /tmp/ceip-phase-f-evidence/outreach-intake-packets`
9. Keep market confidence unchanged until retained buyer artifacts and the register pass:
   - `pnpm run report:buyer-evidence-readiness -- --root /tmp/ceip-phase-f-evidence --evidence-root /tmp/ceip-phase-f-evidence/phase-f-minimum-intake`
   - `pnpm run validate:pilot-evidence -- path/to/filled-pilot-evidence-register.csv --require-95 --evidence-root path/to/redacted-artifacts`

## Route-Selection Matrix

Ratings are current sellability-confidence ratings from the strategy confidence audit, not target ratings. Do not raise them in outreach material until matching buyer evidence is logged and the filled pilot evidence register passes the 95% gate with `--evidence-root` hash verification against retained redacted artifacts.

| Rank | `proof_pack_id` | Buyer lane | Route | Rating | Lead / attach / park |
|---:|---|---|---|---:|---|
| 1 | `utility_forecast_planning_pack` | Utility planners, LDCs, REAs, consultants | `/utility-demand-forecast` | 4.5/5 | Lead |
| 2 | `forecast_benchmark_provenance` | Forecast reviewers, consultants | `/forecast-benchmarking` | 4.6/5 | Attach to every forecast claim |
| 3 | `regulatory_filing_pack` | Regulatory teams, consultants | `/regulatory-filing` | 4.3/5 | Lead |
| 4 | `ga_ici_5cp_decision_support_pack` | Ontario Class A industrials, energy managers, advisors | `/ga-ici-5cp` | 4.2/5 | Lead when Ontario peak-risk pain is explicit |
| 5 | `byo_csv_privacy_proof_pack` | Utility privacy, security, procurement, planning reviewers | `/byo-csv-proof` | 4.1/5 | Attach before data-sharing asks |
| 6 | `tier_cfo_savings_pack` | Alberta emitters, EPCs, compliance advisors | `/roi-calculator` | 4.0/5 | Lead for industrial compliance |
| 7 | `tier_credit_banking_audit_pack` | Alberta emitters, CFOs, compliance leads | `/credit-banking` | 3.9/5 | Pair with TIER CFO memo |
| 8 | `asset_health_capex_pack` | Asset managers, municipal utilities | `/asset-health` | 4.1/5 | Lead when capex/replace/defer pain is explicit |
| 9 | `utility_security_procurement_pack` | Security, privacy, procurement reviewers | `/utility-security` | 4.0/5 | Attach when data sharing or procurement appears |
| 10 | `shadow_billing_invoice_pack` | Municipal/public-sector energy managers | `/shadow-billing` | 3.8/5 | Lead when invoice audit pain is explicit |
| Reserve | `large_load_readiness_overlay` | Utilities, data-centre advisors | `/ai-datacentres` | 3.2/5 | Overlay only |
| Reserve | `consultant_api_data_pack` | Consultants, analysts, integrators | `/api-docs` | 3.1/5 | Follow-on after workflow fit |
| Reserve | `indigenous_funder_aicei_pack` | Indigenous energy/project teams | `/funder-reporting`, `/aicei` | 3.2/5 | Park until partner-backed review |

## Variant IDs

- `ufp_ldc_planner`: utility planning pack for LDC/REA planner.
- `ufp_consultant`: utility planning pack for consultant delivery.
- `reg_oeb_auc`: OEB/AUC filing evidence pack.
- `bench_trust`: benchmark/provenance appendix.
- `asset_capex`: asset replace/defer capex pack.
- `tier_cfo`: TIER source-dated CFO memo.
- `tier_credit_banking`: TIER credit allocation and expiry-risk audit pack.
- `ga_ici_5cp`: Ontario GA/ICI 5CP decision-support pack.
- `byo_csv_privacy`: BYO-CSV privacy proof pack.
- `security_procurement`: utility security questionnaire pack.
- `shadow_billing`: invoice comparison proof pack.
- `indigenous_reporting`: funder/AICEI reporting pack.
- `api_data_pack`: consultant/API data pack.
- `large_load_overlay`: planning overlay for data-centre/large-load pressure.

## Hermes Logging Fields

Every real send must capture:

- `target`
- `channel`
- `proof_pack_id`
- `buyer_lane`
- `route`
- `rating`
- `variant_id`
- `caveat_used`
- `artifact_promised`
- `reply_status`

If the current Hermes logger cannot accept all fields, record them in the Hermes notes column or append them to the manual Hermes activity row until that external script is upgraded. The repo mirror must still use `append:outreach-response-log-row` so `buyer_lane`, `proof_pack_id`, direct-identifier screening, future-date screening, and evidence-action rules are validated before the row is retained.

Repo-retained response logs must stay anonymized. Use `target_label` values such as `utility_consultant_001`; keep full names, emails, phone numbers, account IDs, meter IDs, addresses, and sensitive originals outside this repo. The response log is an outreach evidence queue only; it does not move market confidence until the matching buyer evidence register and retained artifact hashes pass validation.

## Weekly Workflow

1. Use the Friday review loop:
   - job: `ceip-consultant-review`
   - skill: `consultant-review`
   - review script: `~/.hermes/scripts/ceip_outreach_review_context.py`
2. Review:
   - sends by `proof_pack_id`
   - replies by buyer lane
   - strongest variant
   - weakest variant
   - caveats that prevented overclaiming
   - enrichment gaps
   - next five contacts
3. Tighten prompts only where proof routing, why-now logic, or honesty drift is weak.

## Stop Conditions

Do not send if the draft implies:

- production onboarding with a utility
- specific utility readiness that has not been externally proven
- customer deployment proof that has not been supplied
- real-time TIER price discovery or trading advice
- certified Indigenous data-sovereignty infrastructure
- model superiority over enterprise forecasting vendors
- approved production UtilityAPI bridge status
- power-flow, SCADA, ADMS, or engineering approval capability

## Manual Send Limits

- maximum 3 sends per weekday
- maximum 1 send per firm per day
- maximum 2 contacts per firm across the active batch
- update `~/.hermes/outreach/activity.csv` immediately after each real send

## OpenClaw Role

Use OpenClaw only when you need:

- browser-based profile inspection
- optional live draft review
- operator-side navigation support

Do not use OpenClaw as the system of record for:

- scheduled cadence
- logging
- weekly review
- authoritative outreach state
