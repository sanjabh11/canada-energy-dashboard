# Repository Stability & Build Compliance Tracker

## Objective
Restore a clean, reproducible baseline for the Canada Energy Intelligence Platform codebase by resolving all lint and TypeScript build failures, removing legacy UI remnants, and hardening shared libraries. This enables reliable Phase 4 feature delivery without compounding technical debt.

## Context
- `pnpm lint` finishes clean (0 errors / 0 warnings) after the hook memoization and Supabase cleanup on 2025-09-26.
- `pnpm build` (2025-09-26 @ 14:58 IST) now completes successfully with 0 TypeScript errors after addressing the dashboard and AI helper regressions noted below.
- `docs/Ph4.md` depends on a stable platform to implement advanced analytics, stakeholder tooling, and AI workflows. Cleanup remains a prerequisite.

## Workstreams

| # | Area | Files / Modules | Key Problems | Proposed Fix | Owner | Status |
|---|------|-----------------|--------------|--------------|-------|--------|
| 1 | Indigenous Dashboard | `src/components/IndigenousDashboard.tsx` | Legacy local modal & handlers; unused imports | Remove modal code, rely on Supabase data, re-run TS check | Cascade | Completed |
| 2 | Territorial Map | `src/components/TerritorialMap.tsx` | Exports mock data causing Fast Refresh lint | Move mock data to fixture or conditionally guard | Cascade | Completed |
| 3 | Regulatory Service | `src/lib/canadianRegulatory.ts` | `fetchEdgePostJson` called with `string` instead of `string[]`; duplicate exports | Accept array params, flatten exports | Cascade | Completed |
| 4 | Digital Twin API | `src/lib/digitalTwin.ts` | Same helper misuse; invalid enums; duplicate exports | Update helper signatures, align enums, consolidate exports | Cascade | Completed |
| 5 | Real Data Service | `src/lib/realDataService.ts` | Access to private `LocalStorageManager` methods; duplicate exports | Expose required methods or refactor usage | Cascade | Completed |
| 6 | Streaming Service | `src/lib/data/streamingService.ts` | `Function` type usage, empty blocks, unused expressions | Replace with typed callbacks; remove dead code | Cascade | Completed |
| 7 | Hooks & Dashboards | `src/components/*`, `src/hooks/*` | Exhaustive-deps warnings | Audit effects, memoize callbacks | Cascade | Completed |
| 8 | Supabase Functions | `supabase/functions/**` | `@ts-nocheck`, syntax errors | Refactor for TS compliance | Cascade | Completed |
| 9 | Test Harness | `tests/*.mjs` | Potential hanging network calls | Add timeouts, avoid long-lived processes | _TBD_ | Backlog |

## Execution Plan

1. **Stabilize Indigenous Dashboard**
   - Drop legacy modal, clean imports/state.
   - Confirm `TerritorialMap` consumes Supabase data without mock exports.
2. **Fix API Helper Usage**
   - Update `fetchEdgePostJson` callers (`canadianRegulatory`, `digitalTwin`) to pass arrays and adjust enums/exports.
3. **Harden Shared Libraries**
   - Resolve `LocalStorageManager` access by promoting safe public methods.
   - Clean `streamingService` expressions and replace `Function` types with typed callbacks.
4. **Lint Compliance Sweep**
   - Address remaining React hook dependency warnings with stable callbacks.
   - Remove `@ts-nocheck` and parse errors from Supabase functions.
5. **Verification Loop**
   - Run `pnpm lint` after each workstream.
   - Run `pnpm build` once lint is clean, iterate until zero errors.
6. **Post-cleanup Guardrails**
   - Document new helper signatures.
   - Add CI steps (if missing) to enforce lint/build.

### Progress Log (2025-09-26)
- Removed residual modal/error legacy handling and now surface API failures inline within `src/components/IndigenousDashboard.tsx`.
- Cleared inline mock territory/point exports from `src/components/TerritorialMap.tsx`; next step is to reintroduce fixtures in a dedicated data module if still required.
- Memoized remaining hook loaders/processors across `src/components/GridOptimizationDashboard.tsx`, `ComplianceDashboard.tsx`, `EnhancedMineralsDashboard.tsx`, `SecurityDashboard.tsx`, `ProvincialGenerationDataManager.tsx`, and related hooks to clear `react-hooks/exhaustive-deps` warnings.
- Deprecated `supabase/functions/llm/index_old.ts` in favor of the modern entry point and removed unused lint suppressions in `supabase/functions/llm/call_llm_adapter.ts`.
- Split the `withHelp` HOC out of `src/components/HelpButton.tsx` (now slated for relocation) to satisfy `react-refresh/only-export-components` and preserve fast refresh semantics.
- Ran `pnpm lint` (2025-09-26 @ 14:00 IST) and achieved a clean run with 0 errors / 0 warnings.

### Progress Log (2025-09-26)
- Removed residual modal/error legacy handling and now surface API failures inline within `src/components/IndigenousDashboard.tsx`.
- Cleared inline mock territory/point exports from `src/components/TerritorialMap.tsx`; next step is to reintroduce fixtures in a dedicated data module if still required.
- Memoized remaining hook loaders/processors across `src/components/GridOptimizationDashboard.tsx`, `ComplianceDashboard.tsx`, `EnhancedMineralsDashboard.tsx`, `SecurityDashboard.tsx`, `ProvincialGenerationDataManager.tsx`, and related hooks to clear `react-hooks/exhaustive-deps` warnings.
- Deprecated `supabase/functions/llm/index_old.ts` in favor of the modern entry point and removed unused lint suppressions in `supabase/functions/llm/call_llm_adapter.ts`.
- Split the `withHelp` HOC out of `src/components/HelpButton.tsx` (now slated for relocation) to satisfy `react-refresh/only-export-components` and preserve fast refresh semantics.
- Ran `pnpm lint` (2025-09-26 @ 14:00 IST) and achieved a clean run with 0 errors / 0 warnings.
- Fixed Supabase edge function typings (`supabase/functions/help/index.ts`, `supabase/functions/manifest/index.ts`) and added module shims in `types/deno-edge.d.ts`.
- Converted remaining `fetchEdgePostJson` callers in `src/lib/aiOracle.ts` to use array paths and removed redundant type re-exports; restored class closure.
- Restored minerals dashboard state/ref wiring in `src/components/MineralsDashboard.tsx`, including memoized chart data, abort handling, and selection guard.
- Resolved the missing icon import in `src/components/CERComplianceDashboard.tsx` and normalized Lucide usage.
- Ran `pnpm build` (2025-09-26 @ 14:58 IST) and confirmed a successful TypeScript compile; only default Vite bundle-size warnings remain.

### Next Actions
- Relocate the `withHelp` higher-order component into its dedicated helper module and ensure call sites point to the shared utility.
- Review `tests/*.mjs` for long-lived requests and add defensive timeouts (Workstream 9).
- Monitor Vite bundle warnings; plan follow-up code splitting where practical but treat as non-blocking.
- Transition to `docs/Ph4.md` planning now that lint and build are green.

## Testing & Validation
- `pnpm lint`
- `pnpm build`
- Spot-check key dashboards (Indigenous, Resilience, EnergyData) in dev after fixes.
- Optional: targeted unit/integration tests once TypeScript passes.

## Risks & Mitigations
- **Wide blast radius**: Take incremental commits per workstream; verify after each.
- **Regression risk**: Smoke-test affected dashboards/APIs after refactors.
- **Time creep**: Track progress in this file; prioritize TypeScript/blocking errors first, then warnings.

## Definition of Done
- Both `pnpm lint` and `pnpm build` pass without errors.
- No lingering `@ts-nocheck` directives or `Function` type placeholders.
- Indigenous dashboard renders using Supabase datasets with no legacy UI artifacts.
- Tracker updated with statuses and follow-up items.
- Documentation of helper usage changes where needed.

## Next Session Checklist
- ✅ Review tracker status.
- ✅ Begin with Workstream 1 (Indigenous dashboard cleanup).
- ✅ Remove residual mock exports in `TerritorialMap`.
- ✅ Re-run `pnpm lint` to measure delta.
- ✅ Update this tracker with progress notes.

## Notes
- Prioritize cleanup before Phase 4 roadmap implementation.
- Maintain Tier2 documentation discipline (link to `docs/Ph4.md` when aligning scope).
