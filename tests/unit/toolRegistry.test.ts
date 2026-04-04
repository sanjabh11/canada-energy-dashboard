import { describe, expect, it } from 'vitest';
import { TOOLS, getToolSchemasForLLM } from '../../supabase/functions/llm/tools/registry';

describe('tool registry', () => {
  it('exposes the documented eight tools', () => {
    expect(TOOLS).toHaveLength(8);
    expect(TOOLS.map((tool) => tool.name)).toEqual([
      'get_grid_status',
      'get_pool_prices',
      'get_emissions',
      'get_demand_forecast',
      'search_corpus',
      'run_nl2sql',
      'get_grid_context',
      'get_storage_status',
    ]);
  });

  it('exports matching schemas for function calling', () => {
    const schemas = getToolSchemasForLLM();
    expect(schemas).toHaveLength(8);
    expect(schemas.every((tool) => tool.parameters.type === 'object')).toBe(true);
    expect(schemas.every((tool) => typeof tool.name === 'string')).toBe(true);
  });
});
