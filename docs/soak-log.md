# Soak Log

This file records the trained-path soak status for the dispatch and PV closeout
workstreams.

## Dispatch

- Artifact: `dispatch-pinn-v2`
- Soak cadence: every 30 minutes
- Gate: `VITE_TRAINED_DISPATCH_ENABLED=true`
- Fallback metric source: `job_execution_log`
- Current status: soaking
- Latest workflow run: `24923562405`
- Ledger verification: `model_key=dispatch-pinn-v2`, `git_commit_sha=b240ad255e3f4b26bedbf6b2cd9f71dc3ca53626`

## PV Fault

- Artifact: `pv-gnn-v2`
- Soak cadence: every 30 minutes
- Gate: `VITE_TRAINED_PV_FAULT_ENABLED=true`
- Fallback metric source: `job_execution_log`
- Current status: soaking
- Latest workflow run: `24923742863`
- Ledger verification: `model_key=pv-gnn-v2`, `git_commit_sha=dd18586963912e7ed8a7e20fa9005db6a6fff663`

## Notes

- Production flag flips remain blocked until the 7-day rolling fallback rate is
  below 1%.
- Append dated entries here after each staging or production soak check.

## Groundsource

- Proof date: `2026-04-25`
- Verification mode: direct production invocation of the deployed function URL
  used by `cron-groundsource-miner.yml`
- Result: verified
- Live deployment notes:
  - `groundsource-miner` was added to `supabase/config.toml` and deployed to project `qnymbecjgeaoxsfphrti`
  - live secret corrections applied during proof: `GEMINI_MODEL=gemini-2.5-flash`, `GROUNDSOURCE_MAX_DURATION_MS=600000`
  - extractor stability fix applied: `thinkingBudget=0` plus compact JSON contract for Gemini
- Verified production invocations:
  - `utility_public`: `llm_source_count=1`, `extraction_mode='llm'`, document `37d342e1-b11b-4dd1-a7fc-a3a240969db0`, event `967f4703-9800-4ae6-ba0b-fdb68386ef65`, ops run `bf315773-c954-4b76-b235-7113c3c2a1d1`, job log `24411648-f7cf-4010-96fd-9aeacb9b189a`
  - `policy_public`: `llm_source_count=1`, `extraction_mode='llm'`, document `2cb47b08-c632-4966-b68d-9f9560a55a1a`, event `ce882592-f1bc-4493-8f53-a968fa5dbc4c`, ops run `0b825eb0-815b-4d9b-be06-61a4117ced33`, job log `31a4e2ac-d24a-41e0-9144-1cdf855c97d4`
- Earlier blockers resolved during Wave E:
  - initial live endpoint returned `404` before the function was deployed
  - live Supabase secret `GEMINI_MODEL` was pinned to deprecated `gemini-2.0-flash`
  - Gemini JSON responses were truncated until `thinkingBudget=0` and a tighter response contract were added
- Conclusion: `#1` is now operationally proven in production and can be scored
  at `4.3`.
