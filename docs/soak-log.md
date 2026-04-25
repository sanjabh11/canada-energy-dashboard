# Soak Log

This file records the trained-path soak status for the dispatch and PV closeout
workstreams.

## Dispatch

- Artifact: `dispatch-pinn-v2`
- Soak cadence: every 30 minutes
- Gate: `VITE_TRAINED_DISPATCH_ENABLED=true`
- Fallback metric source: `job_execution_log`
- Current status: initialized

## PV Fault

- Artifact: `pv-gnn-v2`
- Soak cadence: every 30 minutes
- Gate: `VITE_TRAINED_PV_FAULT_ENABLED=true`
- Fallback metric source: `job_execution_log`
- Current status: initialized

## Notes

- Production flag flips remain blocked until the 7-day rolling fallback rate is
  below 1%.
- Append dated entries here after each staging or production soak check.
