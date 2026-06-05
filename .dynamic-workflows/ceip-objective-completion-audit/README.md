# Dynamic Workflow Backlog: ceip-objective-completion-audit

Goal: CEIP commercial launch readiness objective completion audit: map the commercial-launch-readiness-orchestrator required deliverables to current manifest/report evidence, expose remaining blockers explicitly, and harden repo checks without deploys, worker execution, external account access, branch mutation, or touching unrelated staged changes

## Commands

- Status: `node skills/dynamic-workflow-backlog/scripts/dynamic-workflow-backlog.js status --run /Users/sanjayb/minimax/canada-energy-dashboard/.dynamic-workflows/ceip-objective-completion-audit`
- Next: `node skills/dynamic-workflow-backlog/scripts/dynamic-workflow-backlog.js next --run /Users/sanjayb/minimax/canada-energy-dashboard/.dynamic-workflows/ceip-objective-completion-audit`
- Preview workers: `node skills/dynamic-workflow-backlog/scripts/dynamic-workflow-backlog.js run-workers --run /Users/sanjayb/minimax/canada-energy-dashboard/.dynamic-workflows/ceip-objective-completion-audit --dry-run`
- Execute workers: `node skills/dynamic-workflow-backlog/scripts/dynamic-workflow-backlog.js run-workers --run /Users/sanjayb/minimax/canada-energy-dashboard/.dynamic-workflows/ceip-objective-completion-audit --execute`
- Dashboard: `node skills/dynamic-workflow-backlog/scripts/dynamic-workflow-backlog.js dashboard --run /Users/sanjayb/minimax/canada-energy-dashboard/.dynamic-workflows/ceip-objective-completion-audit`
- Export worktree plan: `node skills/dynamic-workflow-backlog/scripts/dynamic-workflow-backlog.js export-worktree-plan --run /Users/sanjayb/minimax/canada-energy-dashboard/.dynamic-workflows/ceip-objective-completion-audit --out .orchestration/ceip-objective-completion-audit.json`

## Files

- `workflow.json`: run metadata and safety limits
- `workflow.js`: run-specific executable wrapper for status, next, synthesize, and export commands
- `backlog.jsonl`: task state
- `results.jsonl`: completion evidence
- `claims.jsonl`: claim and review evidence
- `waves/`: optional worker wave plans, status files, and handoffs
