# Agent Tool Manifest — EnergyCopilot (B18)

## Overview

The EnergyCopilot (route `/copilot`) uses a typed multi-tool agent architecture. Tools are defined in `src/lib/agents/copilotTools.ts` and dispatched via `dispatchCopilotTool()`.

Each tool:
- Has a Zod input schema (validated before dispatch)
- Has a `budgetCost` (token-equivalent units, tracked by B09 `ToolBudgetTracker`)
- Returns a `CopilotToolResult<T>` with `success`, `data`, `budgetUsed`, and `provenanceTier`

## Tool Catalogue

| Tool | Budget | Provenance Tier | Primary Substrate |
|------|--------|----------------|-------------------|
| `build_scenario_draft` | 300 | official_projection | B01 Scenario types + CER 2026 defaults |
| `explain_pathway` | 100 | official_historical | B07 PolicyGraph |
| `compare_scenarios` | 250 | simulated | B12 ScenarioComparator |
| `find_evidence` | 150 | official_historical | B08 HybridSearch |
| `identify_conflicts` | 100 | official_historical | B07 PolicyGraph conflict detection |
| `summarize_uncertainty` | 400 | simulated | B11 UncertaintyEngine Monte Carlo |
| `generate_policy_memo` | 500 | official_projection | B01 + B11 + B12 composite |

**Total max budget per session:** 1800 units (configurable via `ToolBudgetTracker`)

## Dispatch Flow

```
POST /api/v2/copilot  { messages, tools_enabled, budget_cap }
    → parse tool call from LLM response
    → dispatchCopilotTool(toolName, rawInput)
        → validate input (Zod) — fail fast on schema error
        → check ToolBudgetTracker remaining
        → call registered handler (hardenedCall wrapper)
        → return CopilotToolResult
    → accumulate provenanceChain across tool calls
    → return { answer, tool_calls_executed, provenance_chain, budget_used }
```

## Registering Handlers

```typescript
import { registerCopilotToolHandler } from 'src/lib/agents/copilotTools';

registerCopilotToolHandler('find_evidence', async (input) => {
  const searcher = new HybridSearcher(supabase);
  return searcher.search(input.query, { topK: input.topK });
});
```

## Adding a New Tool

1. Add the tool name to `COPILOT_TOOL_NAMES` array
2. Define its Zod input schema (export as `<Name>Input`)
3. Add entry to `COPILOT_TOOL_REGISTRY` with `budgetCost`, `provenanceTier`, `parameters[]`
4. Register a handler in the Edge Function or test setup
5. Add tests to `tests/unit/copilotTools.test.ts`

## Security Notes

- Input schemas validated with Zod before any handler is called
- Budget cap enforced before dispatch (prevents runaway tool loops)
- `provenanceTier: 'demo'` tools cannot claim `official_*` data freshness
- All tool results carry `executedAt` ISO timestamp for audit trail (B20)
