import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  COPILOT_TOOL_REGISTRY,
  COPILOT_TOOL_NAMES,
  dispatchCopilotTool,
  registerCopilotToolHandler,
  unregisterCopilotToolHandler,
  calculateBudgetCost,
  listCopilotTools,
  type CopilotToolName,
} from '../../src/lib/agents/copilotTools';

// ── Helpers ───────────────────────────────────────────────────────────────────

function registerEcho(toolName: CopilotToolName) {
  registerCopilotToolHandler(toolName, async (input) => ({ echoed: input }));
}

function unregisterAll() {
  COPILOT_TOOL_NAMES.forEach(unregisterCopilotToolHandler);
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('COPILOT_TOOL_REGISTRY', () => {
  it('has exactly 7 tool definitions', () => {
    expect(COPILOT_TOOL_NAMES.length).toBe(7);
  });

  it('every tool has a positive budgetCost', () => {
    COPILOT_TOOL_NAMES.forEach((name) => {
      expect(COPILOT_TOOL_REGISTRY[name].budgetCost).toBeGreaterThan(0);
    });
  });

  it('every tool has at least one parameter defined', () => {
    COPILOT_TOOL_NAMES.forEach((name) => {
      expect(COPILOT_TOOL_REGISTRY[name].parameters.length).toBeGreaterThan(0);
    });
  });

  it('every tool has a valid inputSchema (ZodType)', () => {
    COPILOT_TOOL_NAMES.forEach((name) => {
      expect(COPILOT_TOOL_REGISTRY[name].inputSchema).toBeTruthy();
      expect(typeof COPILOT_TOOL_REGISTRY[name].inputSchema.parse).toBe('function');
    });
  });
});

describe('dispatchCopilotTool', () => {
  beforeEach(unregisterAll);

  it('returns error if no handler registered', async () => {
    const result = await dispatchCopilotTool('find_evidence', { query: 'Ontario solar' });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/No handler registered/);
    expect(result.budgetUsed).toBe(0);
  });

  it('returns error on Zod validation failure', async () => {
    registerEcho('find_evidence');
    // query too short (< 3 chars)
    const result = await dispatchCopilotTool('find_evidence', { query: 'hi' });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Input validation failed/);
    unregisterCopilotToolHandler('find_evidence');
  });

  it('dispatches successfully with valid input', async () => {
    registerEcho('find_evidence');
    const result = await dispatchCopilotTool('find_evidence', { query: 'Alberta carbon price' });
    expect(result.success).toBe(true);
    expect(result.budgetUsed).toBe(COPILOT_TOOL_REGISTRY['find_evidence'].budgetCost);
    expect(result.data).toBeTruthy();
    unregisterCopilotToolHandler('find_evidence');
  });

  it('captures handler errors and returns partial budget charge', async () => {
    registerCopilotToolHandler('compare_scenarios', async () => {
      throw new Error('Simulated failure');
    });
    const result = await dispatchCopilotTool('compare_scenarios', {
      scenarioIdA: 'scen-a',
      scenarioIdB: 'scen-b',
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Simulated failure/);
    expect(result.budgetUsed).toBeGreaterThan(0); // partial charge
    unregisterCopilotToolHandler('compare_scenarios');
  });

  it('includes executedAt ISO timestamp', async () => {
    registerEcho('identify_conflicts');
    const result = await dispatchCopilotTool('identify_conflicts', {
      policyIds: ['carbon-tax-2019', 'ces-2035'],
    });
    expect(result.executedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    unregisterCopilotToolHandler('identify_conflicts');
  });

  it('includes provenanceTier from tool definition', async () => {
    registerEcho('summarize_uncertainty');
    const result = await dispatchCopilotTool('summarize_uncertainty', {
      scenarioId: 'scen-1',
      outputMetric: 'total_emissions_mt',
    });
    expect(result.provenanceTier).toBe('simulated');
    unregisterCopilotToolHandler('summarize_uncertainty');
  });
});

describe('calculateBudgetCost', () => {
  it('returns 0 for empty tool list', () => {
    expect(calculateBudgetCost([])).toBe(0);
  });

  it('sums budget costs correctly', () => {
    const total = calculateBudgetCost(['find_evidence', 'explain_pathway']);
    const expected =
      COPILOT_TOOL_REGISTRY['find_evidence'].budgetCost +
      COPILOT_TOOL_REGISTRY['explain_pathway'].budgetCost;
    expect(total).toBe(expected);
  });
});

describe('listCopilotTools', () => {
  it('returns all 7 tools', () => {
    expect(listCopilotTools()).toHaveLength(7);
  });

  it('each entry has name and description', () => {
    listCopilotTools().forEach((t) => {
      expect(t.name).toBeTruthy();
      expect(t.description.length).toBeGreaterThan(10);
    });
  });
});
