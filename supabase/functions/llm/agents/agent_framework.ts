/**
 * 3-Node Agent Architecture
 * 
 * Implements the core agent pattern with three specialized nodes:
 * 1. PLANNER: Breaks down tasks into steps, decides what data/tools are needed
 * 2. EXECUTOR: Runs the actual tool calls and data gathering
 * 3. SYNTHESIZER: Combines results into a coherent output
 * 
 * Based on ReAct pattern with structured state management.
 */

import { ToolCall, ToolResult, executeTool } from '../tools/registry.ts';

// ============================================================================
// TYPES
// ============================================================================

export interface AgentState {
  workflowId: string;
  workflowType: string;
  currentStep: number;
  totalSteps: number;
  context: Record<string, unknown>;
  results: Record<string, ToolResult>;
  plan: PlanStep[];
  status: 'planning' | 'executing' | 'synthesizing' | 'complete' | 'error';
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlanStep {
  id: string;
  description: string;
  toolCalls: ToolCall[];
  dependencies: string[]; // Step IDs that must complete before this one
  status: 'pending' | 'running' | 'complete' | 'error';
  result?: ToolResult;
}

export interface AgentConfig {
  maxExecutionTimeMs: number;
  maxRetries: number;
  enableParallelExecution: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export interface WorkflowDefinition {
  name: string;
  description: string;
  requiredTools: string[];
  stepsTemplate: PlanStep[];
}

// ============================================================================
// PLANNER NODE
// ============================================================================

/**
 * Planner Node: Analyzes the goal and creates an execution plan
 */
export class PlannerNode {
  private llmApiKey: string;

  constructor(llmApiKey: string) {
    this.llmApiKey = llmApiKey;
  }

  /**
   * Create an execution plan for a workflow
   */
  async createPlan(
    workflowType: string,
    goal: string,
    context: Record<string, unknown> = {}
  ): Promise<PlanStep[]> {
    const prompt = this.buildPlanningPrompt(workflowType, goal, context);
    
    const response = await this.callLLM(prompt);
    const plan = this.parsePlanResponse(response);
    
    return plan;
  }

  /**
   * Build the planning prompt for the LLM
   */
  private buildPlanningPrompt(
    workflowType: string,
    goal: string,
    context: Record<string, unknown>
  ): string {
    return `You are an expert energy data analyst. Create a step-by-step plan to accomplish this goal:

WORKFLOW TYPE: ${workflowType}
GOAL: ${goal}
CONTEXT: ${JSON.stringify(context, null, 2)}

Available tools:
- get_grid_status: Current supply/demand by province
- get_pool_prices: Real-time and historical prices
- get_emissions: Carbon emissions data
- get_demand_forecast: AI-powered demand forecasts
- search_corpus: Search knowledge base
- run_nl2sql: Complex data queries
- get_grid_context: Comprehensive grid state
- get_storage_status: Battery storage dispatch

Create a plan with 3-7 steps. Each step should:
1. Have a clear description
2. Specify which tool(s) to call with what parameters
3. Note any dependencies on previous steps

Respond in JSON format:
{
  "steps": [
    {
      "id": "step_1",
      "description": "What this step accomplishes",
      "toolCalls": [{"name": "tool_name", "arguments": {"param": "value"}}],
      "dependencies": []
    }
  ]
}`;
  }

  /**
   * Call the LLM for planning
   */
  private async callLLM(prompt: string): Promise<string> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.llmApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`LLM planning failed: ${response.status}`);
    }

    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  /**
   * Parse the LLM response into a plan
   */
  private parsePlanResponse(response: string): PlanStep[] {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return [];

      const parsed = JSON.parse(jsonMatch[0]);
      if (!parsed.steps || !Array.isArray(parsed.steps)) return [];

      return parsed.steps.map((step: any, index: number) => ({
        id: step.id || `step_${index + 1}`,
        description: step.description || 'Execute tool calls',
        toolCalls: step.toolCalls || [],
        dependencies: step.dependencies || [],
        status: 'pending',
      }));
    } catch {
      // Fallback: create a simple single-step plan
      return [{
        id: 'step_1',
        description: 'Execute default data gathering',
        toolCalls: [{ name: 'get_grid_context', arguments: {} }],
        dependencies: [],
        status: 'pending',
      }];
    }
  }
}

// ============================================================================
// EXECUTOR NODE
// ============================================================================

/**
 * Executor Node: Runs tool calls and manages execution
 */
export class ExecutorNode {
  private supabase: any;
  private config: AgentConfig;

  constructor(supabase: any, config: Partial<AgentConfig> = {}) {
    this.supabase = supabase;
    this.config = {
      maxExecutionTimeMs: 30000,
      maxRetries: 2,
      enableParallelExecution: true,
      logLevel: 'info',
      ...config,
    };
  }

  /**
   * Execute all steps in a plan
   */
  async executePlan(plan: PlanStep[]): Promise<PlanStep[]> {
    const executedSteps = [...plan];
    const completedStepIds = new Set<string>();

    for (let i = 0; i < executedSteps.length; i++) {
      const step = executedSteps[i];
      
      // Check dependencies
      const depsSatisfied = step.dependencies.every(id => completedStepIds.has(id));
      if (!depsSatisfied) {
        // Wait for dependencies (in a real system, this would be event-driven)
        await this.waitForDependencies(step.dependencies, executedSteps, completedStepIds);
      }

      // Execute step
      executedSteps[i] = await this.executeStep(step);
      
      if (executedSteps[i].status === 'complete') {
        completedStepIds.add(step.id);
      } else if (executedSteps[i].status === 'error') {
        // Stop on error or continue based on config
        if (this.config.maxRetries === 0) break;
      }
    }

    return executedSteps;
  }

  /**
   * Execute a single step
   */
  private async executeStep(step: PlanStep): Promise<PlanStep> {
    const startTime = Date.now();
    const results: ToolResult[] = [];

    try {
      step.status = 'running';

      // Execute tool calls (in parallel if enabled)
      if (this.config.enableParallelExecution && step.toolCalls.length > 1) {
        const executions = step.toolCalls.map(tc => executeTool(tc, this.supabase));
        const settledResults = await Promise.all(executions);
        results.push(...settledResults);
      } else {
        // Sequential execution
        for (const toolCall of step.toolCalls) {
          const result = await executeTool(toolCall, this.supabase);
          results.push(result);
          
          if (!result.success && this.config.maxRetries > 0) {
            // Retry logic would go here
          }
        }
      }

      const executionTime = Date.now() - startTime;
      
      // Aggregate results
      const allSuccess = results.every(r => r.success);
      
      return {
        ...step,
        status: allSuccess ? 'complete' : 'error',
        result: {
          success: allSuccess,
          data: results.map(r => r.data),
          error: results.find(r => !r.success)?.error,
          metadata: {
            executionTimeMs: executionTime,
            source: 'executor',
            rowCount: results.reduce((sum, r) => sum + (r.metadata?.rowCount || 0), 0),
          },
        },
      };

    } catch (error) {
      return {
        ...step,
        status: 'error',
        result: {
          success: false,
          data: null,
          error: String(error),
          metadata: { executionTimeMs: Date.now() - startTime, source: 'executor' },
        },
      };
    }
  }

  /**
   * Wait for dependencies to complete
   */
  private async waitForDependencies(
    dependencyIds: string[],
    steps: PlanStep[],
    completedIds: Set<string>,
    timeoutMs: number = 30000
  ): Promise<void> {
    const start = Date.now();
    
    while (Date.now() - start < timeoutMs) {
      const allComplete = dependencyIds.every(id => completedIds.has(id));
      if (allComplete) return;
      
      await new Promise(r => setTimeout(r, 100));
    }
    
    throw new Error('Dependency timeout');
  }
}

// ============================================================================
// SYNTHESIZER NODE
// ============================================================================

/**
 * Synthesizer Node: Combines execution results into coherent output
 */
export class SynthesizerNode {
  private llmApiKey: string;

  constructor(llmApiKey: string) {
    this.llmApiKey = llmApiKey;
  }

  /**
   * Synthesize results into final output
   */
  async synthesize(
    workflowType: string,
    goal: string,
    steps: PlanStep[],
    outputFormat: 'brief' | 'detailed' | 'structured' = 'detailed'
  ): Promise<{
    summary: string;
    details: Record<string, unknown>;
    recommendations?: string[];
  }> {
    const prompt = this.buildSynthesisPrompt(workflowType, goal, steps, outputFormat);
    
    const response = await this.callLLM(prompt);
    const synthesis = this.parseSynthesisResponse(response);
    
    return synthesis;
  }

  /**
   * Build the synthesis prompt
   */
  private buildSynthesisPrompt(
    workflowType: string,
    goal: string,
    steps: PlanStep[],
    outputFormat: string
  ): string {
    const results = steps.map(s => ({
      step: s.description,
      status: s.status,
      data: s.result?.data,
      error: s.result?.error,
    }));

    return `You are an expert energy analyst. Synthesize the following execution results into a coherent output.

WORKFLOW TYPE: ${workflowType}
GOAL: ${goal}
OUTPUT FORMAT: ${outputFormat}

EXECUTION RESULTS:
${JSON.stringify(results, null, 2)}

Create a synthesis with:
1. A concise executive summary (2-3 sentences)
2. Key findings and metrics
3. Actionable recommendations (if applicable)
4. Data freshness notes

Respond in JSON format:
{
  "summary": "Executive summary...",
  "details": { "key_metrics": {}, "findings": [] },
  "recommendations": ["Action 1", "Action 2"]
}`;
  }

  /**
   * Call the LLM for synthesis
   */
  private async callLLM(prompt: string): Promise<string> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.llmApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 2048 },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`LLM synthesis failed: ${response.status}`);
    }

    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  /**
   * Parse the synthesis response
   */
  private parseSynthesisResponse(response: string): {
    summary: string;
    details: Record<string, unknown>;
    recommendations?: string[];
  } {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return {
          summary: response.slice(0, 500),
          details: {},
        };
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return {
        summary: parsed.summary || 'Analysis complete',
        details: parsed.details || {},
        recommendations: parsed.recommendations || [],
      };
    } catch {
      return {
        summary: response.slice(0, 500),
        details: { raw: response },
      };
    }
  }
}

// ============================================================================
// AGENT ORCHESTRATOR
// ============================================================================

/**
 * Main Agent Orchestrator: Coordinates the 3-node architecture
 */
export class AgentOrchestrator {
  private planner: PlannerNode;
  private executor: ExecutorNode;
  private synthesizer: SynthesizerNode;

  constructor(
    llmApiKey: string,
    supabase: any,
    private config: Partial<AgentConfig> = {}
  ) {
    this.planner = new PlannerNode(llmApiKey);
    this.executor = new ExecutorNode(supabase, config);
    this.synthesizer = new SynthesizerNode(llmApiKey);
  }

  /**
   * Run a complete workflow
   */
  async runWorkflow(
    workflowType: string,
    goal: string,
    context: Record<string, unknown> = {}
  ): Promise<{
    success: boolean;
    summary: string;
    details: Record<string, unknown>;
    recommendations?: string[];
    executionLog: PlanStep[];
    executionTimeMs: number;
  }> {
    const startTime = Date.now();

    try {
      // PLAN: Create execution plan
      const plan = await this.planner.createPlan(workflowType, goal, context);

      // EXECUTE: Run the plan
      const executedSteps = await this.executor.executePlan(plan);

      // SYNTHESIZE: Create final output
      const synthesis = await this.synthesizer.synthesize(workflowType, goal, executedSteps);

      const allSuccess = executedSteps.every(s => s.status === 'complete');

      return {
        success: allSuccess,
        summary: synthesis.summary,
        details: synthesis.details,
        recommendations: synthesis.recommendations,
        executionLog: executedSteps,
        executionTimeMs: Date.now() - startTime,
      };

    } catch (error) {
      return {
        success: false,
        summary: `Workflow failed: ${error}`,
        details: { error: String(error) },
        executionLog: [],
        executionTimeMs: Date.now() - startTime,
      };
    }
  }
}
