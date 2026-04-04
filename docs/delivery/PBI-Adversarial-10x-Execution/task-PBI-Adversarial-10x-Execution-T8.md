# Task: Bundle and Performance Hardening for Large Vite Chunks

**ID:** PBI-Adversarial-10x-Execution-T8
**Tier:** Tier 2 (Feature / Behavioral)
**Status:** Review
**Owner:** AI_Agent

## 1. Context
The build is green, but Vite reports large chunk warnings driven by heavy charting and export/documentation stacks. This task reduces user-facing bundle weight via targeted lazy loading and chunk refinement.

## 2. Scope / Files
- `vite.config.ts`
- `src/lib/pdfGenerator.ts`
- `src/components/MicroGenWizard.tsx`

## 3. Acceptance Criteria
- [ ] Heavy export/documentation dependencies are dynamically loaded on demand.
- [ ] Bundle warnings are reduced materially without destabilizing routing.
- [ ] Existing validation checks remain green.

## 4. Test Plan
1. `pnpm exec tsc -b`
2. `pnpm exec vitest run`
3. `pnpm exec vite build`
4. Compare build output chunk warnings before/after

## 5. Status History
- 2026-03-24: Task created (Proposed)
- 2026-03-24: Initial performance hardening implementation started with PDF/export lazy-loading as the first bundle reduction slice
- 2026-03-24: Added on-demand loading for PDF generation and help modal/content paths, plus refined manual chunking for export dependencies
- 2026-03-24: Validation completed with `pnpm exec tsc -b`, `pnpm exec vitest run`, and `pnpm exec vite build`
