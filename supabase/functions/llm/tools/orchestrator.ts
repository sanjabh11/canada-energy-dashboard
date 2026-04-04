/**
 * Tool Orchestrator - LLM Tool Selection Loop
 * 
 * Implements ReAct (Reasoning + Acting) pattern for multi-step tool execution.
 * The LLM decides which tools to call, we execute them, then feed results back
 * for synthesis into a final answer.
 */

import {
  ToolCall,
  ToolResult,
  executeTool,
  getToolSchemasForLLM,
} from './registry.ts';

// Conversation message types
export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
  tool_call_id?: string;
  name?: string;
}

// Orchestrator configuration
export interface OrchestratorConfig {
  maxIterations: number;
  timeoutMs: number;
  maxToolCallsPerQuery: number;
  streamProgress?: boolean;
}

// Default configuration
const DEFAULT_CONFIG: OrchestratorConfig = {
  maxIterations: 5,
  timeoutMs: 30000,
  maxToolCallsPerQuery: 8,
  streamProgress: false,
};

// Progress callback for streaming
export type ProgressCallback = (update: {
  type: 'thinking' | 'tool_call' | 'tool_result' | 'synthesis' | 'complete' | 'error';
  message?: string;
  toolName?: string;
  toolResult?: ToolResult;
  toolCalls?: ToolCall[];
  iteration?: number;
  totalIterations?: number;
}) => void;

/**
 * Build the system prompt for tool-enabled LLM interactions
 */
function buildSystemPrompt(): string {
  const toolSchemas = getToolSchemasForLLM();
  
  const toolDescriptions = toolSchemas.map(tool => {
    const params = Object.entries(tool.parameters.properties)
      .map(([name, schema]) => {
        const required = tool.parameters.required?.includes(name) ? ' (required)' : '';
        return `    - ${name}: ${schema.description}${required}`;
      })
      .join('\n');
    
    return `
${tool.name}: ${tool.description}
Parameters:
${params || '    (none)'}`;
  }).join('\n');

  return `You are an expert energy analyst assistant with access to real-time Canadian energy data.

AVAILABLE TOOLS:
${toolDescriptions}

INSTRUCTIONS:
1. Analyze the user's question to determine what data is needed
2. Decide which tool(s) to call to gather the required information
3. You can call multiple tools in parallel if they are independent
4. After receiving tool results, synthesize a clear, actionable answer
5. ALWAYS cite your sources with timestamps when providing data
6. If data is unavailable, clearly state what you tried and why it failed

RESPONSE FORMAT:
When you need to use tools, respond with JSON tool calls:
{"tool_calls": [{"id": "call_1", "type": "function", "function": {"name": "get_pool_prices", "arguments": "<JSON payload>"}}]}

When you have all the information needed, provide your final answer directly.

IMPORTANT:
- Call tools aggressively to gather data - don't guess
- Combine multiple data sources for comprehensive answers
- Always mention data freshness (for example, "as of 2 hours ago" or "current data")
- If a tool fails, try an alternative approach or explain the limitation`;
}

/**
 * Parse LLM response for tool calls
 */
function parseToolCalls(content: string): ToolCall[] | null {
  try {
    // Look for JSON tool_calls in the response
    const toolCallsMatch = content.match(/\{[\s\S]*"tool_calls"[\s\S]*\}/);
    if (!toolCallsMatch) return null;

    const parsed = JSON.parse(toolCallsMatch[0]);
    if (!parsed.tool_calls || !Array.isArray(parsed.tool_calls)) return null;

    return parsed.tool_calls.map((tc: any) => ({
      name: tc.function?.name || tc.name,
      arguments: typeof tc.function?.arguments === 'string' 
        ? JSON.parse(tc.function.arguments)
        : tc.function?.arguments || tc.arguments || {},
    }));
  } catch {
    return null;
  }
}

/**
 * Execute tool calls in parallel
 */
async function executeToolCalls(
  toolCalls: ToolCall[],
  supabase: any
): Promise<Array<{ call: ToolCall; result: ToolResult }>> {
  const executions = toolCalls.map(async (call) => {
    const result = await executeTool(call, supabase);
    return { call, result };
  });

  return await Promise.all(executions);
}

/**
 * Format tool results for LLM context
 */
function formatToolResults(
  executions: Array<{ call: ToolCall; result: ToolResult }>
): string {
  return executions.map(({ call, result }) => {
    const status = result.success ? 'SUCCESS' : 'FAILED';
    const metadata = result.metadata 
      ? ` [${result.metadata.executionTimeMs}ms, source: ${result.metadata.source}${result.metadata.freshness ? ', freshness: ' + result.metadata.freshness : ''}]`
      : '';
    
    if (result.success) {
      const dataPreview = JSON.stringify(result.data).slice(0, 2000);
      return `Tool: ${call.name}${metadata}\nStatus: ${status}\nData: ${dataPreview}${JSON.stringify(result.data).length > 2000 ? '... (truncated)' : ''}`;
    } else {
      return `Tool: ${call.name}${metadata}\nStatus: ${status}\nError: ${result.error}`;
    }
  }).join('\n\n---\n\n');
}

/**
 * Main orchestration function - ReAct loop
 */
export async function orchestrateWithTools(
  userQuery: string,
  supabase: any,
  config: Partial<OrchestratorConfig> = {},
  progressCallback?: ProgressCallback
): Promise<{
  answer: string;
  toolCalls: ToolCall[];
  iterations: number;
  success: boolean;
  error?: string;
}> {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const conversation: ConversationMessage[] = [
    { role: 'system', content: buildSystemPrompt() },
    { role: 'user', content: userQuery },
  ];

  const allToolCalls: ToolCall[] = [];
  let iterations = 0;

  try {
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('GOOGLE_API_KEY') || '';
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    while (iterations < fullConfig.maxIterations) {
      iterations++;
      progressCallback?.({
        type: 'thinking',
        message: `Iteration ${iterations}: Analyzing query and deciding on tools...`,
        iteration: iterations,
        totalIterations: fullConfig.maxIterations,
      });

      // Call LLM with current conversation
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: conversation.map(msg => ({
              role: msg.role === 'assistant' ? 'model' : msg.role,
              parts: [{ text: msg.content }],
            })),
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 4096,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`LLM API error: ${response.status}`);
      }

      const data = await response.json();
      const llmResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Check for tool calls
      const toolCalls = parseToolCalls(llmResponse);

      if (toolCalls && toolCalls.length > 0) {
        // LLM wants to use tools
        allToolCalls.push(...toolCalls);
        
        progressCallback?.({
          type: 'tool_call',
          message: `Calling ${toolCalls.length} tool(s): ${toolCalls.map(t => t.name).join(', ')}`,
          toolCalls,
          iteration: iterations,
        });

        // Execute tools
        const executions = await executeToolCalls(toolCalls, supabase);

        executions.forEach(({ call, result }) => {
          progressCallback?.({
            type: 'tool_result',
            toolName: call.name,
            toolResult: result,
            iteration: iterations,
          });
        });

        // Add tool calls and results to conversation
        conversation.push({
          role: 'assistant',
          content: llmResponse,
        });

        conversation.push({
          role: 'tool',
          content: formatToolResults(executions),
        });

        // Check if we've hit the tool call limit
        if (allToolCalls.length >= fullConfig.maxToolCallsPerQuery) {
          conversation.push({
            role: 'system',
            content: 'Maximum tool calls reached. Please provide your best answer based on the data gathered so far.',
          });
        }
      } else {
        // LLM provided final answer
        progressCallback?.({
          type: 'complete',
          message: 'Final answer received',
          iteration: iterations,
        });

        return {
          answer: llmResponse,
          toolCalls: allToolCalls,
          iterations,
          success: true,
        };
      }
    }

    // Hit iteration limit
    return {
      answer: 'I apologize, but I was unable to complete the analysis within the allowed number of iterations. Here is what I was able to determine from the available data.',
      toolCalls: allToolCalls,
      iterations,
      success: false,
      error: 'Maximum iterations reached',
    };

  } catch (error) {
    progressCallback?.({
      type: 'error',
      message: String(error),
      iteration: iterations,
    });

    return {
      answer: 'I encountered an error while processing your request. Please try again.',
      toolCalls: allToolCalls,
      iterations,
      success: false,
      error: String(error),
    };
  }
}

/**
 * Simplified single-call version for quick queries
 */
export async function quickToolQuery(
  userQuery: string,
  toolNames: string[],
  supabase: any
): Promise<{
  answer: string;
  results: Record<string, ToolResult>;
  success: boolean;
}> {
  try {
    // Execute specified tools directly without LLM selection
    const toolCalls: ToolCall[] = toolNames.map(name => ({
      name,
      arguments: {}, // Tools will use defaults
    }));

    const executions = await executeToolCalls(toolCalls, supabase);
    
    const results: Record<string, ToolResult> = {};
    executions.forEach(({ call, result }) => {
      results[call.name] = result;
    });

    // Quick synthesis without LLM for simple cases
    const successCount = executions.filter(e => e.result.success).length;
    
    return {
      answer: `Retrieved data from ${successCount}/${toolNames.length} sources.`,
      results,
      success: successCount > 0,
    };

  } catch (error) {
    return {
      answer: 'Failed to retrieve data.',
      results: {},
      success: false,
    };
  }
}
