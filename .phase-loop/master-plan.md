# PhaseLoop_v2 Master Plan

Created: 2026-08-20T07:00:08.299Z
Task: Implement the approved Green Button CMD and source-truth action spine for the Canada energy dashboard; preserve unrelated dirty worktree changes.
Tier: 2

## Operating Pattern

research -> baseline -> one focused lever -> verify -> reflect -> ratchet -> next-phase adjustment

## Persistent Artifacts

- `phase-ledger.jsonl`: per-phase baseline, checks, deltas, reflection, decision, and next adjustment.
- `ratchets.json`: latest metric baselines and regression thresholds.
- `improvements.jsonl`: queued self-improvement notes that require explicit approval before mutating global skills or prompts.
- `session-health.jsonl`: disk, memory, load, and zombie-process snapshots for long-running work.

## Phase Plan

- P1: Define baseline and first focused lever.
- P2: Verify, reflect, and update next adjustment from evidence.
- P-polish: Optional optimization/de-slopify round after core acceptance criteria pass.
