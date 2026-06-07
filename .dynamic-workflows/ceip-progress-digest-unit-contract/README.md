# Dynamic Workflow Backlog: ceip-progress-digest-unit-contract

Goal: CEIP progress digest unit contract: add focused Vitest coverage for report-progress-digest-readiness and check-progress-digest-readiness-report while preserving blocked launch status and without touching staged rename, branches, Supabase, buyer evidence, deployment, production approval state, live services, or secrets

## Commands

- Status: `node skills/dynamic-workflow-backlog/scripts/dynamic-workflow-backlog.js status --run /Users/sanjayb/minimax/canada-energy-dashboard/.dynamic-workflows/ceip-progress-digest-unit-contract`
- Next: `node skills/dynamic-workflow-backlog/scripts/dynamic-workflow-backlog.js next --run /Users/sanjayb/minimax/canada-energy-dashboard/.dynamic-workflows/ceip-progress-digest-unit-contract`
- Preview workers: `node skills/dynamic-workflow-backlog/scripts/dynamic-workflow-backlog.js run-workers --run /Users/sanjayb/minimax/canada-energy-dashboard/.dynamic-workflows/ceip-progress-digest-unit-contract --dry-run`
- Execute workers: `node skills/dynamic-workflow-backlog/scripts/dynamic-workflow-backlog.js run-workers --run /Users/sanjayb/minimax/canada-energy-dashboard/.dynamic-workflows/ceip-progress-digest-unit-contract --execute`
- Dashboard: `node skills/dynamic-workflow-backlog/scripts/dynamic-workflow-backlog.js dashboard --run /Users/sanjayb/minimax/canada-energy-dashboard/.dynamic-workflows/ceip-progress-digest-unit-contract`
- Export worktree plan: `node skills/dynamic-workflow-backlog/scripts/dynamic-workflow-backlog.js export-worktree-plan --run /Users/sanjayb/minimax/canada-energy-dashboard/.dynamic-workflows/ceip-progress-digest-unit-contract --out .orchestration/ceip-progress-digest-unit-contract.json`

## Files

- `workflow.json`: run metadata and safety limits
- `workflow.js`: run-specific executable wrapper for status, next, synthesize, and export commands
- `backlog.jsonl`: task state
- `results.jsonl`: completion evidence
- `claims.jsonl`: claim and review evidence
- `waves/`: optional worker wave plans, status files, and handoffs
