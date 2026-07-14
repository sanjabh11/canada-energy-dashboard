---
description: Bounded autonomous loop wrapping the fable5-prompt skill for repeated codebase audits with verify/stop conditions
---

# Audit Loop — Fable 5 Bounded Autonomous Codebase Audit

This workflow wraps the `fable5-prompt` skill in a bounded loop that runs
autonomously until all 15 audit dimensions are complete or diminishing
returns are reached.

## When to Use

- Periodic codebase health audits (weekly, monthly, quarterly)
- Pre-launch readiness checks
- Post-merge regression audits
- When you want the audit to run autonomously without manual intervention

## Prerequisites

- `fable5-prompt` skill installed in `~/.codeium/windsurf/skills/fable5-prompt/`
- `.fable5/STATE.md` directory exists (create if first run)
- Project has `package.json` with lint, test, and build scripts

## Loop Definition

**What to accomplish:** Full 360-degree codebase audit across all 15 dimensions
using the fable5-prompt skill.

**How to verify:** Each finding must cite file:line and survive adversarial
refutation. Run these verification commands after each dimension:

```bash
// turbo
pnpm exec tsc -b --pretty false
pnpm run check:claim-boundaries
pnpm run check:commercial-source
```

**What to do with what was learned:**
- Keep verified findings in the audit report
- Discard refuted findings to the False Positive Log
- Update `.fable5/STATE.md` after each dimension with new verified facts

**When to stop:**
- All 15 dimensions audited with exit criteria met, OR
- 3 consecutive dimension passes produce zero new findings, OR
- User explicitly stops the audit

## Execution Steps

1. **Read STATE.md** — If `.fable5/STATE.md` exists, read it to carry forward
   verified facts and general rules from prior audits. Skip re-deriving them.

2. **Run Phase 0 (Calibration)** — Read all config files, note stack versions,
   verify against latest best practices. Output Calibration Baseline (5-10 bullets).

3. **Run Phase 0.5 (Tooling Discovery)** — Check which tools are installed.
   Note missing tools as Gaps.

4. **Run Phase 1 (Quantitative Discovery)** — Size, complexity, churn, test
   coverage, lint baseline, Top 15 features, market segments, suitability matrix.

5. **Checkpoint — Scope Gate** — Present calibration baseline, refactor priority
   scores, top 15 features, and proposed Phase 2 scope. Pause for user
   confirmation if repo >500 source files or >100K LOC.

6. **Run Phase 2 (Audit Loop)** — For each of the 15 dimensions:
   a. Spawn a subagent with the dimension's 4-component prompt
   b. Subagent reads code deeply, searches internet for best practices
   c. Subagent produces findings with file:line citations
   d. Spawn independent verifier subagent (fresh context, rubric only)
   e. Verifier outputs PASS/FAIL/MAYBE for each finding
   f. Keep findings that PASS, drop/downgrade FAIL, investigate MAYBE
   g. Update STATE.md with new verified facts
   h. If 3 consecutive passes produce no new findings for this dimension, move on

7. **Run Phase 3 (Improvement Strategy)** — Identify 3-5 themes, market alignment
   improvements, seller proposition gains.

8. **Run Phase 4 (Implementation Plan)** — Map findings to phases, create
   agent-executable tasks. **Requires user approval before any code changes.**

9. **Run Phase 5 (Verification)** — Re-check all exit criteria, produce New
   Feature Rating Table, final confidence assessment.

10. **Write STATE.md** — Update `.fable5/STATE.md` with all verified facts,
    general rules, open failures, lessons learned, and last session pointer.

11. **Write Deliverable** — Write `docs/audits/audit-{YYYY-MM-DD}.md` following
    the fable5-prompt deliverable structure.

## Model Routing

| Role | Model | When |
|---|---|---|
| Orchestrator | Fable 5 | Planning, delegation, synthesis, rule distillation |
| Hard subtasks | Opus 4.8 | Architecture, security threats, fallback from refusals |
| Workers | Sonnet 4.6 | Lint, refactors, test scaffolding, doc updates |
| Graders | Haiku 4.5 | Independent verifier, cheap classifier, existence checks |

## Safety

- If `stop_reason: "refusal"` occurs, retry on Opus 4.8 via fallback
- If classifier blocks security dimension, log it and continue with other dimensions
- Never modify code during Phases 0-3 — analysis only
- Phase 4 implementation requires explicit user approval
