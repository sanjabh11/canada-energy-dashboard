# Dynamic Workflow Backlog: phase-o-buyer-evidence-dashboard

Goal: Add a browser-local buyer evidence readiness dashboard on /pilot-readiness that reads a redacted pilot evidence register preview and shows lane coverage, reviewer acceptance, confidence delta, fast artifact loop, retained hash, and commercial signal without creating buyer evidence, requiring secrets, deploying production, or touching unrelated staged files.

## Commands

- Status: `node skills/dynamic-workflow-backlog/scripts/dynamic-workflow-backlog.js status --run /Users/sanjayb/minimax/canada-energy-dashboard/.dynamic-workflows/phase-o-buyer-evidence-dashboard`
- Next: `node skills/dynamic-workflow-backlog/scripts/dynamic-workflow-backlog.js next --run /Users/sanjayb/minimax/canada-energy-dashboard/.dynamic-workflows/phase-o-buyer-evidence-dashboard`
- Preview workers: `node skills/dynamic-workflow-backlog/scripts/dynamic-workflow-backlog.js run-workers --run /Users/sanjayb/minimax/canada-energy-dashboard/.dynamic-workflows/phase-o-buyer-evidence-dashboard --dry-run`
- Execute workers: `node skills/dynamic-workflow-backlog/scripts/dynamic-workflow-backlog.js run-workers --run /Users/sanjayb/minimax/canada-energy-dashboard/.dynamic-workflows/phase-o-buyer-evidence-dashboard --execute`
- Dashboard: `node skills/dynamic-workflow-backlog/scripts/dynamic-workflow-backlog.js dashboard --run /Users/sanjayb/minimax/canada-energy-dashboard/.dynamic-workflows/phase-o-buyer-evidence-dashboard`
- Export worktree plan: `node skills/dynamic-workflow-backlog/scripts/dynamic-workflow-backlog.js export-worktree-plan --run /Users/sanjayb/minimax/canada-energy-dashboard/.dynamic-workflows/phase-o-buyer-evidence-dashboard --out .orchestration/phase-o-buyer-evidence-dashboard.json`

## Files

- `workflow.json`: run metadata and safety limits
- `workflow.js`: run-specific executable wrapper for status, next, synthesize, and export commands
- `backlog.jsonl`: task state
- `results.jsonl`: completion evidence
- `claims.jsonl`: claim and review evidence
- `waves/`: optional worker wave plans, status files, and handoffs
