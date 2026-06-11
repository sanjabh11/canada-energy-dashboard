/**
 * B18 – Agentic Analyst Copilot Tool Manifest
 *
 * Defines the typed tool catalogue for the EnergyCopilot multi-step agent.
 * Each tool has:
 *   - A Zod input schema (validated before dispatch)
 *   - A structured output type
 *   - A budget cost (token-equivalent units for ToolBudgetTracker in B09)
 *   - A provenance label (trust tier of its primary data source)
 *
 * Tool dispatch (`dispatchCopilotTool`) routes to the correct substrate
 * function (B01–B12) and wraps execution in the B09 hardenedCall pattern.
 *
 * References:
 * - B09 AgentHardening: hardenedCall, ToolBudgetTracker (agentHardening.ts)
 * - B10 SensitivityEngine (sensitivityEngine.ts)
 * - B11 UncertaintyEngine (uncertaintyEngine.ts)
 * - B12 ScenarioComparator (scenarioComparator.ts)
 * - B07 PolicyGraph (policyGraph.ts)
 * - B08 HybridSearch (hybridSearch.ts)
 * - CER Energy Futures 2026 / OEB Chapter 5 / AUC Rule 005 context
 */

import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Tool names
// ─────────────────────────────────────────────────────────────────────────────

export const COPILOT_TOOL_NAMES = [
  'build_scenario_draft',
  'explain_pathway',
  'compare_scenarios',
  'find_evidence',
  'identify_conflicts',
  'summarize_uncertainty',
  'generate_policy_memo',
] as const;

export type CopilotToolName = (typeof COPILOT_TOOL_NAMES)[number];

// ─────────────────────────────────────────────────────────────────────────────
// Input schemas (Zod)
// ─────────────────────────────────────────────────────────────────────────────

export const BuildScenarioDraftInput = z.object({
  jurisdiction: z.string().describe('Canadian province or "Canada" for national scope'),
  horizonYears: z.array(z.number().int().min(2024).max(2070)).min(1).max(10),
  sectors: z.array(z.string()).min(1),
  policyLevers: z.record(z.unknown()).optional(),
  macroAssumptions: z.record(z.unknown()).optional(),
  description: z.string().optional(),
});

export const ExplainPathwayInput = z.object({
  pathwayId: z.string().describe('Policy graph node or pathway identifier'),
  detailLevel: z.enum(['summary', 'detailed', 'technical']).default('summary'),
  includeConflicts: z.boolean().default(false),
});

export const CompareScenariosInput = z.object({
  scenarioIdA: z.string(),
  scenarioIdB: z.string(),
  metrics: z.array(z.string()).optional().describe('Which metrics to compare; empty = all'),
  confidenceLevel: z.number().min(0.8).max(0.99).default(0.95),
});

export const FindEvidenceInput = z.object({
  query: z.string().min(3).max(500),
  topK: z.number().int().min(1).max(20).default(5),
  domains: z.array(z.string()).optional().describe('Optional domain filter e.g. ["statcan","cer"]'),
  minTrustTier: z.enum(['official_historical', 'official_projection', 'proxy', 'simulated', 'demo', 'stale']).optional(),
});

export const IdentifyConflictsInput = z.object({
  policyIds: z.array(z.string()).min(2).describe('Policy IDs to check for mutual conflict'),
  includeTransitive: z.boolean().default(true),
});

export const SummarizeUncertaintyInput = z.object({
  scenarioId: z.string(),
  numSamples: z.number().int().min(100).max(5000).default(500),
  outputMetric: z.string().describe('Which output metric to summarise (e.g. "total_emissions_mt")'),
  confidenceLevel: z.number().min(0.8).max(0.99).default(0.95),
});

export const GeneratePolicyMemoInput = z.object({
  scenarioId: z.string(),
  audience: z.enum(['regulator', 'executive', 'technical', 'public']).default('executive'),
  jurisdiction: z.string(),
  includeUncertainty: z.boolean().default(true),
  maxWords: z.number().int().min(100).max(2000).default(500),
});

// ─────────────────────────────────────────────────────────────────────────────
// Tool registry
// ─────────────────────────────────────────────────────────────────────────────

export interface CopilotToolDefinition {
  name: CopilotToolName;
  description: string;
  /** Token-equivalent cost for ToolBudgetTracker */
  budgetCost: number;
  /** Primary trust tier of data consumed by this tool */
  provenanceTier: 'official_historical' | 'official_projection' | 'proxy' | 'simulated' | 'demo';
  inputSchema: z.ZodTypeAny;
  /** Human-readable parameter list for API documentation */
  parameters: Array<{ name: string; type: string; required: boolean; description: string }>;
}

export const COPILOT_TOOL_REGISTRY: Record<CopilotToolName, CopilotToolDefinition> = {
  build_scenario_draft: {
    name: 'build_scenario_draft',
    description:
      'Build a structured scenario draft from natural-language inputs. Returns a Scenario object ' +
      'with default CER 2026 assumption values that the analyst can refine before running.',
    budgetCost: 300,
    provenanceTier: 'official_projection',
    inputSchema: BuildScenarioDraftInput,
    parameters: [
      { name: 'jurisdiction', type: 'string', required: true, description: 'Province or "Canada"' },
      { name: 'horizonYears', type: 'number[]', required: true, description: 'Forecast years e.g. [2030, 2040, 2050]' },
      { name: 'sectors', type: 'string[]', required: true, description: 'Energy sectors to model' },
      { name: 'policyLevers', type: 'object', required: false, description: 'Policy lever overrides' },
      { name: 'macroAssumptions', type: 'object', required: false, description: 'GDP/population overrides' },
      { name: 'description', type: 'string', required: false, description: 'Free-text context' },
    ],
  },
  explain_pathway: {
    name: 'explain_pathway',
    description:
      'Retrieve and explain a policy pathway from the PolicyGraph (B07). Returns the pathway node, ' +
      'its dependencies, downstream impacts, and any detected conflicts.',
    budgetCost: 100,
    provenanceTier: 'official_historical',
    inputSchema: ExplainPathwayInput,
    parameters: [
      { name: 'pathwayId', type: 'string', required: true, description: 'Policy graph node ID' },
      { name: 'detailLevel', type: 'enum', required: false, description: 'summary | detailed | technical' },
      { name: 'includeConflicts', type: 'boolean', required: false, description: 'Include conflict detection' },
    ],
  },
  compare_scenarios: {
    name: 'compare_scenarios',
    description:
      'Compare two scenario runs using ScenarioComparator (B12). Returns metric deltas, ' +
      'statistical tests (Welch t or Mann-Whitney), dominance scoring, and a narrative summary.',
    budgetCost: 250,
    provenanceTier: 'simulated',
    inputSchema: CompareScenariosInput,
    parameters: [
      { name: 'scenarioIdA', type: 'string', required: true, description: 'Reference scenario ID' },
      { name: 'scenarioIdB', type: 'string', required: true, description: 'Comparison scenario ID' },
      { name: 'metrics', type: 'string[]', required: false, description: 'Metrics to compare (empty = all)' },
      { name: 'confidenceLevel', type: 'number', required: false, description: 'Statistical confidence (default 0.95)' },
    ],
  },
  find_evidence: {
    name: 'find_evidence',
    description:
      'Hybrid search (B08) across the knowledge base for evidence supporting a claim or query. ' +
      'Returns ranked evidence chunks with source, trust tier, and excerpt.',
    budgetCost: 150,
    provenanceTier: 'official_historical',
    inputSchema: FindEvidenceInput,
    parameters: [
      { name: 'query', type: 'string', required: true, description: 'Natural-language search query' },
      { name: 'topK', type: 'number', required: false, description: 'Number of results (default 5)' },
      { name: 'domains', type: 'string[]', required: false, description: 'Connector domain filter' },
      { name: 'minTrustTier', type: 'enum', required: false, description: 'Minimum trust tier filter' },
    ],
  },
  identify_conflicts: {
    name: 'identify_conflicts',
    description:
      'Detect policy conflicts between a set of policy IDs using the PolicyGraph (B07). ' +
      'Returns direct and transitive conflicts with explanatory notes.',
    budgetCost: 100,
    provenanceTier: 'official_historical',
    inputSchema: IdentifyConflictsInput,
    parameters: [
      { name: 'policyIds', type: 'string[]', required: true, description: 'Policy IDs to check (min 2)' },
      { name: 'includeTransitive', type: 'boolean', required: false, description: 'Include transitive conflicts' },
    ],
  },
  summarize_uncertainty: {
    name: 'summarize_uncertainty',
    description:
      'Run Monte Carlo uncertainty quantification (B11) for a scenario metric and return ' +
      'P5/P50/P95 statistics, distribution shape, and convergence confidence.',
    budgetCost: 400,
    provenanceTier: 'simulated',
    inputSchema: SummarizeUncertaintyInput,
    parameters: [
      { name: 'scenarioId', type: 'string', required: true, description: 'Scenario to analyse' },
      { name: 'numSamples', type: 'number', required: false, description: 'MC sample count (100–5000)' },
      { name: 'outputMetric', type: 'string', required: true, description: 'Metric to quantify' },
      { name: 'confidenceLevel', type: 'number', required: false, description: 'Confidence interval level' },
    ],
  },
  generate_policy_memo: {
    name: 'generate_policy_memo',
    description:
      'Generate a structured policy memo from a scenario run, including key findings, ' +
      'uncertainty range, and recommended next steps. Audience-appropriate language.',
    budgetCost: 500,
    provenanceTier: 'official_projection',
    inputSchema: GeneratePolicyMemoInput,
    parameters: [
      { name: 'scenarioId', type: 'string', required: true, description: 'Scenario to summarise' },
      { name: 'audience', type: 'enum', required: false, description: 'regulator | executive | technical | public' },
      { name: 'jurisdiction', type: 'string', required: true, description: 'Province or Canada' },
      { name: 'includeUncertainty', type: 'boolean', required: false, description: 'Include P5–P95 range' },
      { name: 'maxWords', type: 'number', required: false, description: 'Target word count (100–2000)' },
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Tool dispatcher
// ─────────────────────────────────────────────────────────────────────────────

export interface CopilotToolResult<T = unknown> {
  tool: CopilotToolName;
  success: boolean;
  data?: T;
  error?: string;
  budgetUsed: number;
  provenanceTier: CopilotToolDefinition['provenanceTier'];
  executedAt: string;
}

export type CopilotToolHandler<TInput = unknown, TOutput = unknown> = (
  input: TInput,
) => Promise<TOutput>;

/** Registry of runtime handlers. Populated by the app layer (EnergyCopilot or Edge Function). */
const handlers = new Map<CopilotToolName, CopilotToolHandler>();

export function registerCopilotToolHandler<TInput, TOutput>(
  toolName: CopilotToolName,
  handler: CopilotToolHandler<TInput, TOutput>,
): void {
  handlers.set(toolName, handler as CopilotToolHandler);
}

export function unregisterCopilotToolHandler(toolName: CopilotToolName): void {
  handlers.delete(toolName);
}

/**
 * Dispatch a copilot tool call.
 * - Validates input against the tool's Zod schema
 * - Calls the registered handler (or returns error if none registered)
 * - Tracks budget and provenance
 */
export async function dispatchCopilotTool<TOutput = unknown>(
  toolName: CopilotToolName,
  rawInput: unknown,
): Promise<CopilotToolResult<TOutput>> {
  const definition = COPILOT_TOOL_REGISTRY[toolName];
  const executedAt = new Date().toISOString();

  // Input validation
  const parsed = definition.inputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      tool: toolName,
      success: false,
      error: `Input validation failed: ${parsed.error.message}`,
      budgetUsed: 0,
      provenanceTier: definition.provenanceTier,
      executedAt,
    };
  }

  // Handler lookup
  const handler = handlers.get(toolName);
  if (!handler) {
    return {
      tool: toolName,
      success: false,
      error: `No handler registered for tool "${toolName}". Register via registerCopilotToolHandler().`,
      budgetUsed: 0,
      provenanceTier: definition.provenanceTier,
      executedAt,
    };
  }

  // Execution
  try {
    const data = await handler(parsed.data) as TOutput;
    return {
      tool: toolName,
      success: true,
      data,
      budgetUsed: definition.budgetCost,
      provenanceTier: definition.provenanceTier,
      executedAt,
    };
  } catch (err) {
    return {
      tool: toolName,
      success: false,
      error: err instanceof Error ? err.message : String(err),
      budgetUsed: Math.floor(definition.budgetCost * 0.1), // partial charge on error
      provenanceTier: definition.provenanceTier,
      executedAt,
    };
  }
}

/**
 * Calculate total budget cost for a proposed sequence of tool calls.
 * Use before execution to check against ToolBudgetTracker cap.
 */
export function calculateBudgetCost(toolNames: CopilotToolName[]): number {
  return toolNames.reduce((sum, name) => sum + (COPILOT_TOOL_REGISTRY[name]?.budgetCost ?? 0), 0);
}

/**
 * Returns the tool registry as a plain array for API documentation / OpenAPI generation.
 */
export function listCopilotTools(): CopilotToolDefinition[] {
  return COPILOT_TOOL_NAMES.map((name) => COPILOT_TOOL_REGISTRY[name]);
}
