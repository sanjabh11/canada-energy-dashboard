/**
 * Morning Briefing Workflow
 * 
 * Automated morning briefing that gathers:
 * 1. Overnight grid events (curtailments, price spikes)
 * 2. Current demand forecasts
 * 3. Emissions status
 * 4. Storage/battery activity
 * 5. Arbitrage opportunities
 * 
 * Synthesizes into a concise briefing with action items.
 */

import { AgentOrchestrator } from '../agent_framework.ts';

export interface MorningBriefingConfig {
  provinces: string[];
  includeEmissions: boolean;
  includeForecasts: boolean;
  includeStorage: boolean;
  includeOpportunities: boolean;
  outputFormat: 'executive' | 'detailed' | 'technical';
}

export const DEFAULT_MORNING_BRIEFING_CONFIG: MorningBriefingConfig = {
  provinces: ['AB', 'ON'],
  includeEmissions: true,
  includeForecasts: true,
  includeStorage: true,
  includeOpportunities: true,
  outputFormat: 'executive',
};

/**
 * Run the Morning Briefing workflow
 */
export async function runMorningBriefing(
  llmApiKey: string,
  supabase: any,
  config: Partial<MorningBriefingConfig> = {}
): Promise<{
  success: boolean;
  briefing: {
    summary: string;
    sections: Array<{
      title: string;
      content: string;
      priority: 'high' | 'medium' | 'low';
    }>;
    actionItems: string[];
    generatedAt: string;
  };
  executionTimeMs: number;
  dataSources: string[];
}> {
  const fullConfig = { ...DEFAULT_MORNING_BRIEFING_CONFIG, ...config };
  const startTime = Date.now();

  // Build the goal based on configuration
  const goal = `Generate morning briefing for ${fullConfig.provinces.join(', ')} covering:
${fullConfig.includeEmissions ? '- Carbon emissions status and trends\n' : ''}${fullConfig.includeForecasts ? '- Demand forecasts for today\n' : ''}${fullConfig.includeStorage ? '- Battery storage and dispatch activity\n' : ''}${fullConfig.includeOpportunities ? '- Price arbitrage opportunities\n' : ''}
Format: ${fullConfig.outputFormat}`;

  const orchestrator = new AgentOrchestrator(llmApiKey, supabase, {
    maxExecutionTimeMs: 30000,
    maxRetries: 1,
    enableParallelExecution: true,
  });

  const result = await orchestrator.runWorkflow(
    'morning_briefing',
    goal,
    { config: fullConfig, timestamp: new Date().toISOString() }
  );

  // Transform into structured briefing format
  const briefing = {
    summary: result.summary,
    sections: extractSections(result),
    actionItems: result.recommendations || [],
    generatedAt: new Date().toISOString(),
  };

  const dataSources = extractDataSources(result.executionLog);

  return {
    success: result.success,
    briefing,
    executionTimeMs: result.executionTimeMs,
    dataSources,
  };
}

/**
 * Extract structured sections from synthesis details
 */
function extractSections(result: {
  summary: string;
  details: Record<string, unknown>;
}): Array<{
  title: string;
  content: string;
  priority: 'high' | 'medium' | 'low';
}> {
  const sections: Array<{ title: string; content: string; priority: 'high' | 'medium' | 'low' }> = [];
  const details = result.details;

  if (details.grid_status) {
    sections.push({
      title: 'Grid Status',
      content: String(details.grid_status),
      priority: 'high',
    });
  }

  if (details.prices) {
    sections.push({
      title: 'Market Prices',
      content: String(details.prices),
      priority: 'high',
    });
  }

  if (details.emissions) {
    sections.push({
      title: 'Carbon Emissions',
      content: String(details.emissions),
      priority: 'medium',
    });
  }

  if (details.forecasts) {
    sections.push({
      title: 'Demand Forecasts',
      content: String(details.forecasts),
      priority: 'medium',
    });
  }

  if (details.storage) {
    sections.push({
      title: 'Storage Activity',
      content: String(details.storage),
      priority: 'low',
    });
  }

  if (details.opportunities) {
    sections.push({
      title: 'Opportunities',
      content: String(details.opportunities),
      priority: 'high',
    });
  }

  // If no sections extracted, create a generic one
  if (sections.length === 0) {
    sections.push({
      title: 'Market Overview',
      content: result.summary || 'Analysis complete',
      priority: 'medium',
    });
  }

  return sections;
}

/**
 * Extract data sources from execution log
 */
function extractDataSources(executionLog: any[]): string[] {
  const sources = new Set<string>();

  for (const step of executionLog) {
    if (step.result?.metadata?.source) {
      sources.add(step.result.metadata.source);
    }
    
    // Also check tool calls
    if (step.toolCalls) {
      for (const tc of step.toolCalls) {
        sources.add(tc.name);
      }
    }
  }

  return Array.from(sources);
}
