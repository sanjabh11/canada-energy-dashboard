# Task: llmClient Chunk Optimization and Modular Split

**ID:** PBI-Adversarial-10x-Execution-T12
**Tier:** Tier 2 (Feature / Behavioral)
**Status:** Review
**Owner:** AI_Agent

## 1. Context
The llmClient.ts file has grown to 357 lines and produces a 1,311 KB chunk that exceeds Vite's warning threshold of 1,200 KB. This impacts initial bundle load time and is imported by 12 components across the application.

## 2. Scope / Files
- `src/lib/llmClient.ts` - Split into modular structure
- Create `src/lib/llm/` directory:
  - `types.ts` - All interfaces and types
  - `utils.ts` - Helper functions (attachMeta, etc.)
  - `client.ts` - Main client functions (high-frequency use)
  - `rag.ts` - RAG-specific functions
  - `index.ts` - Barrel export for backward compatibility

## 3. Implementation
- Extract all type interfaces to `types.ts`
- Extract utility functions to `utils.ts`
- Split client functions by domain (analytics, planning, RAG)
- Use dynamic imports for heavy functions where possible
- Maintain backward compatibility through barrel exports
- Update vite.config.ts manualChunks if needed

## 4. Acceptance Criteria
- [ ] llmClient chunk size reduced below 1,200 KB
- [ ] All existing imports continue to work (backward compatibility)
- [ ] No functional changes to LLM client behavior
- [ ] Build passes without chunk size warnings
- [ ] TypeScript compilation passes

## 5. Test Plan
1. `pnpm exec tsc -b`
2. `pnpm exec vitest run`
3. `pnpm exec vite build` (verify chunk sizes)

## 6. Status History
- 2026-03-25: Task created (InProgress)
- 2026-03-25: Implemented modular llmClient structure with types.ts, utils.ts, client.ts, rag.ts, and index.ts barrel exports
- 2026-03-25: Updated llmClient.ts to re-export from modular structure for backward compatibility
- 2026-03-25: Validation completed with `pnpm exec tsc -b`, `pnpm exec vitest run`, `pnpm exec vite build`
