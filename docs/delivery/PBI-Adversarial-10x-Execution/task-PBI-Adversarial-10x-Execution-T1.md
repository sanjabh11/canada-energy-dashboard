# Task: Foundation Safety Net + Lead Capture Hardening

**ID:** PBI-Adversarial-10x-Execution-T1
**Tier:** Tier 2 (Feature / Behavioral)
**Status:** InProgress
**Owner:** AI_Agent

## 1. Context
The adversarial analysis is directionally right about the missing foundation, but the live repo already contains parts of the proposed stack. This task addresses the highest-confidence, highest-leverage gaps that remain real in the current codebase: missing CI, missing real unit-test infrastructure, and insecure/broken lead capture persistence.

## 2. Scope / Files
- `package.json`
- `pnpm-lock.yaml`
- `vite.config.ts`
- `vitest.config.ts` (new)
- `tests/unit/forecastBaselines.test.ts` (new)
- `tests/unit/assetHealthScoring.test.ts` (new)
- `tests/unit/llmClient.test.ts` (new)
- `tests/unit/aesoService.test.ts` (new)
- `src/lib/leadIntake.ts`
- `src/components/TIERROICalculator.tsx`
- `src/components/MunicipalLandingPage.tsx`
- `src/components/enterprise/EnterprisePage.tsx`
- `src/components/billing/EmailCaptureModal.tsx`
- `src/components/StakeholderOverview.tsx`
- `netlify/functions/leads.ts`
- `netlify.toml`
- `.github/workflows/ci.yml` (new)

## 3. Acceptance Criteria
- [ ] Vitest is configured and runnable from `package.json`.
- [ ] The first unit-test suite covers core deterministic behavior in `forecastBaselines.ts`, `assetHealthScoring.ts`, `llmClient.ts`, and `aesoService.ts`.
- [ ] GitHub Actions CI runs install, type-check, build, and unit tests.
- [ ] Email capture no longer stores captured emails in browser `localStorage`.
- [ ] Email capture posts to the correct deployed Netlify function path.
- [ ] Marketing lead forms no longer keep duplicate browser-side lead backups.
- [ ] Netlify leads persistence uses server-side Supabase credentials compatible with the existing lead schema.

## 4. Test Plan
1. `pnpm exec vitest run`
2. `pnpm exec tsc --noEmit`
3. `pnpm exec vite build`
4. Manual verification:
   - Open checkout email capture modal.
   - Submit a valid email.
   - Confirm no captured-email entry is written to browser storage.
   - Confirm the request resolves to the Netlify leads function path.

## 5. Status History
- 2026-03-24: Task created (InProgress)
- 2026-03-24: Validation passed (`pnpm exec tsc -b`, `pnpm exec vitest run`, `pnpm exec vite build`) and task moved to Review
- 2026-03-27: Reopened after verification found residual lead persistence in marketing route components and the shared helper still writing through the browser client
