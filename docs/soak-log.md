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
