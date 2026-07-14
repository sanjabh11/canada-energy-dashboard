---
description: Daily eval re-run loop that re-runs yesterday's test suite, distills newly passing patterns into skills, and updates STATE.md
---

# Eval Loop — Daily Test Re-Run & Skill Distillation

This workflow runs daily to re-execute the test suite, identify newly passing
or newly failing tests, and distill patterns into the fable5-prompt skill.

## When to Use

- Daily automated test runs (GitHub Actions or Claude Code Routine)
- After major refactors to verify no regressions
- When building a compounding skill system that learns from each test run

## Prerequisites

- Project has `package.json` with `test` script
- `.fable5/STATE.md` exists for pattern storage
- `fable5-prompt` skill installed for distillation

## Loop Definition

**What to accomplish:** Re-run test suite, identify changes from last run,
distill newly passing patterns into skills.

**How to verify:** `pnpm exec vitest run` passes or failures are documented.

**What to do with what was learned:** Update STATE.md with new patterns.
Distill into SKILL.md rules section if pattern recurs 2+ times.

**When to stop:** All tests pass OR new failures documented in STATE.md.

## Execution Steps

1. **Read STATE.md** — Check last test run results and open failures.

2. **Run test suite:**
   ```bash
   // turbo
   pnpm exec vitest run --reporter=json > .fable5/test-results.json
   ```

3. **Diff against last run** — Compare pass/fail counts and specific test
   names against last entry in `.fable5/audit-log.jsonl`.

4. **If new passes:** Extract the pattern that made the test pass. If this
   pattern has appeared 2+ times in prior runs, distill into a rule:
   - Add to `fable5-prompt/SKILL.md` `## Ground rules` or `## Audit Rules`
   - Update STATE.md verified facts

5. **If new failures:** Document in STATE.md open failures:
   ```
   - [OPEN] TEST-{name}: Failing since {date}, error: {message}
   ```

6. **If all pass:** Update STATE.md last session pointer:
   ```
   - Last eval: {date}, all {N} tests passing, 0 failures
   ```

7. **Write log entry** — Append to `.fable5/audit-log.jsonl`:
   ```json
   {
     "step_id": "EVAL-{date}",
     "type": "eval-loop",
     "tests_total": 128,
     "tests_passing": 126,
     "tests_failing": 2,
     "new_passes": 1,
     "new_failures": 0,
     "patterns_distilled": 1
   }
   ```

## Model Routing

| Role | Model | When |
|---|---|---|
| Test runner | Sonnet 4.6 | Execute tests, parse results |
| Pattern distiller | Fable 5 | Extract rules from recurring patterns |
| Classifier | Haiku 4.5 | Categorize failures by type |
