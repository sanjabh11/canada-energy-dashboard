# Dynamic Workflow Backlog: ceip-launch-readiness-proof-lineage-continuation

Goal: Continue CEIP commercial launch readiness proof-lineage safe-fix ratchets without deploy, branch mutation, external account access, buyer contact, or clearing launch blockers.

## Commands

- Status: `node skills/dynamic-workflow-backlog/scripts/dynamic-workflow-backlog.js status --run /Users/sanjayb/minimax/canada-energy-dashboard/.dynamic-workflows/ceip-launch-readiness-proof-lineage-continuation`
- Next: `node skills/dynamic-workflow-backlog/scripts/dynamic-workflow-backlog.js next --run /Users/sanjayb/minimax/canada-energy-dashboard/.dynamic-workflows/ceip-launch-readiness-proof-lineage-continuation`
- Preview workers: `node skills/dynamic-workflow-backlog/scripts/dynamic-workflow-backlog.js run-workers --run /Users/sanjayb/minimax/canada-energy-dashboard/.dynamic-workflows/ceip-launch-readiness-proof-lineage-continuation --dry-run`
- Execute workers: `node skills/dynamic-workflow-backlog/scripts/dynamic-workflow-backlog.js run-workers --run /Users/sanjayb/minimax/canada-energy-dashboard/.dynamic-workflows/ceip-launch-readiness-proof-lineage-continuation --execute`
- Dashboard: `node skills/dynamic-workflow-backlog/scripts/dynamic-workflow-backlog.js dashboard --run /Users/sanjayb/minimax/canada-energy-dashboard/.dynamic-workflows/ceip-launch-readiness-proof-lineage-continuation`
- Export worktree plan: `node skills/dynamic-workflow-backlog/scripts/dynamic-workflow-backlog.js export-worktree-plan --run /Users/sanjayb/minimax/canada-energy-dashboard/.dynamic-workflows/ceip-launch-readiness-proof-lineage-continuation --out .orchestration/ceip-launch-readiness-proof-lineage-continuation.json`

## Files

- `workflow.json`: run metadata and safety limits
- `workflow.js`: run-specific executable wrapper for status, next, synthesize, and export commands
- `backlog.jsonl`: task state
- `results.jsonl`: completion evidence
- `claims.jsonl`: claim and review evidence
- `waves/`: optional worker wave plans, status files, and handoffs
