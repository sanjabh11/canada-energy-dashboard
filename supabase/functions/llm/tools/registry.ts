/**
 * Tool Registry for Energy Copilot
 * 
 * Defines available tools that the LLM can call to gather data from multiple sources.
 * Each tool has a schema, description, and handler function.
 */

import { fetchGridContext } from '../grid_context.ts';

// JSON Schema type for tool parameters
export interface JSONSchema {
  type: 'object';
  properties: Record<string, {
    type: string;
    description: string;
    enum?: string[];
    minimum?: number;
    maximum?: number;
  }>;
  required?: string[];
}

// Tool definition
export interface Tool {
  name: string;
  description: string;
  parameters: JSONSchema;
  handler: (args: Record<string, unknown>, supabase: any) => Promise<ToolResult>;
}

// Tool execution result
export interface ToolResult {
  success: boolean;
  data: unknown;
  error?: string;
  metadata?: {
    executionTimeMs: number;
    source: string;
    freshness?: string;
    rowCount?: number;
  };
}

// Tool call from LLM
export interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

/**
 * Tool: Get current grid status for a province
 */
async function getGridStatusTool(
  args: Record<string, unknown>,
  supabase: any
): Promise<ToolResult> {
  const startTime = Date.now();
  const province = args.province as string;

  try {
    const { data, error } = await supabase
      .from('grid_snapshots')
      .select('*')
      .eq('province', province)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (error) throw error;

    return {
      success: true,
      data: data || null,
      metadata: {
        executionTimeMs: Date.now() - startTime,
        source: 'grid_snapshots',
        freshness: data?.timestamp,
      },
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: String(error),
      metadata: {
        executionTimeMs: Date.now() - startTime,
        source: 'grid_snapshots',
      },
    };
  }
}

/**
 * Tool: Get pool prices for Alberta or HOEP for Ontario
 */
async function getPoolPricesTool(
  args: Record<string, unknown>,
  supabase: any
): Promise<ToolResult> {
  const startTime = Date.now();
  const province = args.province as string;
  const hours = (args.hours as number) || 24;

  try {
    let data;
    let source: string;

    if (province === 'AB') {
      // Alberta pool prices
      const result = await supabase
        .from('alberta_grid_prices')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(Math.min(hours, 168)); // Max 1 week
      data = result.data;
      source = 'alberta_grid_prices';
    } else if (province === 'ON') {
      // Ontario HOEP
      const result = await supabase
        .from('ontario_hoep_prices')
        .select('*')
        .order('hour', { ascending: false })
        .limit(Math.min(hours, 168));
      data = result.data;
      source = 'ontario_hoep_prices';
    } else {
      return {
        success: false,
        data: null,
        error: `Unsupported province: ${province}. Use 'AB' or 'ON'.`,
        metadata: {
          executionTimeMs: Date.now() - startTime,
          source: 'prices',
        },
      };
    }

    return {
      success: true,
      data: data || [],
      metadata: {
        executionTimeMs: Date.now() - startTime,
        source,
        rowCount: data?.length || 0,
        freshness: data?.[0]?.timestamp || data?.[0]?.hour,
      },
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: String(error),
      metadata: {
        executionTimeMs: Date.now() - startTime,
        source: 'prices',
      },
    };
  }
}

/**
 * Tool: Get carbon emissions data
 */
async function getEmissionsTool(
  args: Record<string, unknown>,
  supabase: any
): Promise<ToolResult> {
  const startTime = Date.now();
  const province = args.province as string | undefined;
  const days = (args.days as number) || 7;

  try {
    let query = supabase
      .from('carbon_emissions')
      .select('*')
      .gte('timestamp', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('timestamp', { ascending: false })
      .limit(1000);

    if (province) {
      query = query.eq('province', province);
    }

    const { data, error } = await query;

    if (error) throw error;

    return {
      success: true,
      data: data || [],
      metadata: {
        executionTimeMs: Date.now() - startTime,
        source: 'carbon_emissions',
        rowCount: data?.length || 0,
        freshness: data?.[0]?.timestamp,
      },
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: String(error),
      metadata: {
        executionTimeMs: Date.now() - startTime,
        source: 'carbon_emissions',
      },
    };
  }
}

/**
 * Tool: Get demand forecasts
 */
async function getDemandForecastTool(
  args: Record<string, unknown>,
  supabase: any
): Promise<ToolResult> {
  const startTime = Date.now();
  const province = args.province as string;
  const hours = (args.hours as number) || 24;

  try {
    const { data, error } = await supabase
      .from('demand_forecasts')
      .select('*')
      .eq('province', province)
      .gte('forecast_time', new Date().toISOString())
      .order('forecast_time', { ascending: true })
      .limit(Math.min(hours, 168));

    if (error) throw error;

    return {
      success: true,
      data: data || [],
      metadata: {
        executionTimeMs: Date.now() - startTime,
        source: 'demand_forecasts',
        rowCount: data?.length || 0,
        freshness: data?.[0]?.forecast_time,
      },
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: String(error),
      metadata: {
        executionTimeMs: Date.now() - startTime,
        source: 'demand_forecasts',
      },
    };
  }
}

/**
 * Tool: Search energy corpus using RAG
 */
async function searchCorpusTool(
  args: Record<string, unknown>,
  supabase: any
): Promise<ToolResult> {
  const startTime = Date.now();
  const query = args.query as string;
  const limit = Math.min((args.limit as number) || 5, 10);

  try {
    // Use the existing RAG search function
    const { data, error } = await supabase.rpc('search_document_embeddings_lexical', {
      search_query: query,
      match_count: limit,
      filter_source_types: null,
    });

    if (error) throw error;

    return {
      success: true,
      data: data || [],
      metadata: {
        executionTimeMs: Date.now() - startTime,
        source: 'document_embeddings',
        rowCount: data?.length || 0,
      },
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: String(error),
      metadata: {
        executionTimeMs: Date.now() - startTime,
        source: 'document_embeddings',
      },
    };
  }
}

/**
 * Tool: Run NL2SQL query
 */
async function runNL2SQLTool(
  args: Record<string, unknown>,
  supabase: any
): Promise<ToolResult> {
  const startTime = Date.now();
  const query = args.query as string;

  try {
    // Call the NL2SQL edge function
    const response = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/nl2sql`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({ query, maxResults: 100 }),
      }
    );

    if (!response.ok) {
      throw new Error(`NL2SQL failed: ${response.status}`);
    }

    const result = await response.json();

    return {
      success: true,
      data: result,
      metadata: {
        executionTimeMs: Date.now() - startTime,
        source: 'nl2sql',
        rowCount: result.meta?.rowCount,
      },
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: String(error),
      metadata: {
        executionTimeMs: Date.now() - startTime,
        source: 'nl2sql',
      },
    };
  }
}

/**
 * Tool: Get comprehensive grid context
 */
async function getGridContextTool(
  _args: Record<string, unknown>,
  supabase: any
): Promise<ToolResult> {
  const startTime = Date.now();

  try {
    const context = await fetchGridContext(supabase);

    return {
      success: true,
      data: context,
      metadata: {
        executionTimeMs: Date.now() - startTime,
        source: 'grid_context',
      },
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: String(error),
      metadata: {
        executionTimeMs: Date.now() - startTime,
        source: 'grid_context',
      },
    };
  }
}

/**
 * Tool: Get storage/battery status
 */
async function getStorageStatusTool(
  args: Record<string, unknown>,
  supabase: any
): Promise<ToolResult> {
  const startTime = Date.now();
  const province = args.province as string | undefined;

  try {
    let query = supabase
      .from('storage_dispatch_actions')
      .select('*')
      .order('dispatched_at', { ascending: false })
      .limit(50);

    if (province) {
      query = query.eq('province', province);
    }

    const { data, error } = await query;

    if (error) throw error;

    return {
      success: true,
      data: data || [],
      metadata: {
        executionTimeMs: Date.now() - startTime,
        source: 'storage_dispatch_actions',
        rowCount: data?.length || 0,
        freshness: data?.[0]?.dispatched_at,
      },
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: String(error),
      metadata: {
        executionTimeMs: Date.now() - startTime,
        source: 'storage_dispatch_actions',
      },
    };
  }
}

// Export all available tools
export const TOOLS: Tool[] = [
  {
    name: 'get_grid_status',
    description: 'Get current grid status (supply, demand, imports/exports) for a specific province',
    parameters: {
      type: 'object',
      properties: {
        province: {
          type: 'string',
          description: 'Province code (AB, ON, QC, BC, etc.)',
          enum: ['AB', 'ON', 'QC', 'BC', 'SK', 'MB', 'NS', 'NB', 'NL', 'PE'],
        },
      },
      required: ['province'],
    },
    handler: getGridStatusTool,
  },
  {
    name: 'get_pool_prices',
    description: 'Get electricity pool prices for Alberta (AESO) or HOEP for Ontario (IESO)',
    parameters: {
      type: 'object',
      properties: {
        province: {
          type: 'string',
          description: 'Province code (AB for Alberta pool price, ON for Ontario HOEP)',
          enum: ['AB', 'ON'],
        },
        hours: {
          type: 'number',
          description: 'Number of hours of historical data to retrieve (default 24, max 168)',
          minimum: 1,
          maximum: 168,
        },
      },
      required: ['province'],
    },
    handler: getPoolPricesTool,
  },
  {
    name: 'get_emissions',
    description: 'Get carbon emissions data by province and time range',
    parameters: {
      type: 'object',
      properties: {
        province: {
          type: 'string',
          description: 'Optional province code to filter by',
          enum: ['AB', 'ON', 'QC', 'BC', 'SK', 'MB', 'NS', 'NB', 'NL', 'PE'],
        },
        days: {
          type: 'number',
          description: 'Number of days of data to retrieve (default 7)',
          minimum: 1,
          maximum: 90,
        },
      },
    },
    handler: getEmissionsTool,
  },
  {
    name: 'get_demand_forecast',
    description: 'Get AI-powered demand forecasts for a province',
    parameters: {
      type: 'object',
      properties: {
        province: {
          type: 'string',
          description: 'Province code (AB, ON, QC, etc.)',
          enum: ['AB', 'ON', 'QC', 'BC', 'SK', 'MB', 'NS', 'NB', 'NL', 'PE'],
        },
        hours: {
          type: 'number',
          description: 'Number of hours of forecast to retrieve (default 24)',
          minimum: 1,
          maximum: 168,
        },
      },
      required: ['province'],
    },
    handler: getDemandForecastTool,
  },
  {
    name: 'search_corpus',
    description: 'Search the energy knowledge corpus for relevant documents and regulations',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Natural language search query',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results (default 5, max 10)',
          minimum: 1,
          maximum: 10,
        },
      },
      required: ['query'],
    },
    handler: searchCorpusTool,
  },
  {
    name: 'run_nl2sql',
    description: 'Execute a natural language query that gets converted to SQL for complex data questions',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Natural language question about energy data',
        },
      },
      required: ['query'],
    },
    handler: runNL2SQLTool,
  },
  {
    name: 'get_grid_context',
    description: 'Get comprehensive grid context including batteries, curtailment, forecasts, and pricing',
    parameters: {
      type: 'object',
      properties: {},
    },
    handler: getGridContextTool,
  },
  {
    name: 'get_storage_status',
    description: 'Get battery storage dispatch actions and current status',
    parameters: {
      type: 'object',
      properties: {
        province: {
          type: 'string',
          description: 'Optional province code to filter by',
          enum: ['AB', 'ON', 'QC', 'BC', 'SK', 'MB', 'NS', 'NB', 'NL', 'PE'],
        },
      },
    },
    handler: getStorageStatusTool,
  },
];

// Tool registry lookup
export function getTool(name: string): Tool | undefined {
  return TOOLS.find(t => t.name === name);
}

// Get tool schemas for LLM function calling
export function getToolSchemasForLLM(): Array<{
  name: string;
  description: string;
  parameters: JSONSchema;
}> {
  return TOOLS.map(({ name, description, parameters }) => ({
    name,
    description,
    parameters,
  }));
}

// Execute a tool call
export async function executeTool(
  toolCall: ToolCall,
  supabase: any
): Promise<ToolResult> {
  const tool = getTool(toolCall.name);
  if (!tool) {
    return {
      success: false,
      data: null,
      error: `Unknown tool: ${toolCall.name}`,
      metadata: {
        executionTimeMs: 0,
        source: 'registry',
      },
    };
  }

  // Validate required parameters
  if (tool.parameters.required) {
    for (const required of tool.parameters.required) {
      if (!(required in toolCall.arguments)) {
        return {
          success: false,
          data: null,
          error: `Missing required parameter: ${required}`,
          metadata: {
            executionTimeMs: 0,
            source: tool.name,
          },
        };
      }
    }
  }

  return await tool.handler(toolCall.arguments, supabase);
}
