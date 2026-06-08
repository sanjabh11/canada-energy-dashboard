---
description: Master workflow for staff-engineer grade task execution — plan, implement, test, review
---

# Staff Engineer Workflow: Plan → Implement → Test → Review

Execute the requested task end-to-end with staff-engineer standards. Prioritize correctness, minimal impact, and verifiable outcomes.

## Operating Rules

- Start by inspecting the codebase and relevant files before changing anything.
- Identify the root cause, not a workaround.
- Keep changes as small and localized as possible.
- Preserve existing behavior unless the task explicitly requires a change.
- Prefer reuse over duplication.
- Do not claim a fix until it is verified.
- If a task spans 3+ steps or has architectural impact, write a short plan first.
- If you discover a mistake, update the plan and correct it immediately.
- Never introduce hardcoded secrets, silent failures, or misleading live/demo claims.
- Treat fallback/demo behavior as explicit and label it honestly.
- If tests or build fail, fix the cause before moving on.

## 1. Plan

**Before any code changes:**

1. Summarize the problem in 2-5 bullets.
2. Identify the files likely involved (use code_search, grep_search, or list_dir).
3. Write a step-by-step implementation plan with checkpoints.
4. State any risks or unknowns.

**Task-specific planning guidance:**
- Dashboard/data work: Account for live, stale, demo, fallback, and mock states.
- API work: Plan for source, last_updated, freshness_status, and is_fallback fields.
- Route work: Verify direct navigation, not only internal tab switching.
- UI work: Plan loading, error, and fallback states.
- Analytics/AI features: Ensure outputs are provenance-aware.

## 2. Implement

**Make changes with discipline:**

1. Make the minimum code changes needed to solve the problem.
2. Keep related changes together in logical commits.
3. Add or adjust tests alongside code changes (not after).
4. If multiple files are involved, touch only what is required.
5. Update imports, types, and exports as you go — never leave broken references.

**Code quality checks during implementation:**
- No hardcoded secrets or API keys.
- No silent try/catch blocks — log or surface errors.
- No misleading copy like "Live" or "Real-time" without verified data pipelines.
- Explicit fallback labeling (e.g., "Demo Data", "Sample Values").

## 3. Test

**Verify rigorously:**

1. Run the smallest relevant tests first (unit tests for changed functions).
2. Run broader verification: `pnpm exec vitest run` or equivalent.
3. Run build check: `pnpm exec vite build` or equivalent.
4. Run E2E tests if the user-facing flow changed.
5. Confirm the task works in the browser or via API when applicable.
6. If a browser flow is involved, verify the actual rendered UI, not just code paths.

**Testing discipline:**
- Fix test failures before proceeding.
- If tests don't exist for the changed logic, add them.
- Verify error states and edge cases, not just happy paths.

## 4. Review

**Re-scan with adversarial mindset:**

1. Review the diff for regressions, broken routes, or misleading copy.
2. Check for missing provenance/freshness handling in data components.
3. Check for security issues: input handling, secrets, auth, data exposure.
4. Verify the final result matches the requested outcome, not just the implementation idea.
5. Look for: broken imports, type errors, missing exports, orphaned code.

**Task-specific review checklist:**
- [ ] Dashboard: live/stale/demo/fallback states explicitly labeled.
- [ ] API responses: include source, last_updated, freshness_status, is_fallback.
- [ ] Routes: direct navigation works, not just tab switching.
- [ ] UI: loading, error, and empty states are visible and user-friendly.
- [ ] Analytics/AI: outputs include provenance, no unsupported real-time claims.

## 5. Final Report

**Summarize factually:**

1. State exactly what changed (files, functions, behavior).
2. List tests run and their results (pass/fail counts).
3. Mention any remaining limitations or follow-up items.
4. Keep the summary concise and verifiable.

**Report template:**
```
## Summary
- **Files modified:** N files (list key ones)
- **Behavior changed:** What does differently now
- **Tests:** X passed, Y failed (if any)
- **Verification:** How it was confirmed working

## Remaining Items
- Any follow-up work identified
```

## Quick Reference: Task Types

| Task Type | Key Considerations |
|-----------|-------------------|
| Bug fix | Root cause first, minimal change, regression test |
| Feature | Plan first, reusable components, provenance-aware |
| Refactor | Behavior preservation, test coverage, type safety |
| UI/UX | Loading/error states, accessibility, responsive |
| Data/API | Freshness metadata, fallback labeling, source attribution |
| Route/Nav | Direct navigation, params handling, 404 states |
| Security | Input validation, auth guards, CORS, rate limits |

## Execution Mode

- **Bug fix:** Proceed directly after inspection and plan.
- **Feature/Refactor:** Plan first, get alignment if architectural.
- **Review/Analysis:** Focus first on findings, summarize if needed.
