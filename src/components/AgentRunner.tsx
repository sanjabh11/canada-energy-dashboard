/**
 * Agent Runner - Automated Workflow Interface
 * 
 * Allows users to run pre-built agent workflows:
 * - Morning Briefing
 * - Opportunity Detection
 * - Compliance Report
 * 
 * Displays progress and results with export options.
 */

import React, { useState, useCallback } from 'react';
import { fetchEdgePostJson } from '@/lib/edge';
import { SEOHead } from './SEOHead';
import { cn } from '@/lib/utils';
import { FoundationRepairGate } from './FoundationRepairGate';
import {
  Play,
  Loader2,
  Bot,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Download,
  Sun,
  TrendingUp,
  FileText,
  ChevronRight,
  Sparkles,
  RefreshCw,
  Calendar,
  Settings,
} from 'lucide-react';

interface Workflow {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  estimatedTime: string;
  config: Record<string, unknown>;
}

const WORKFLOWS: Workflow[] = [
  {
    id: 'morning_briefing',
    name: 'Morning Briefing',
    description: 'Automated daily summary: overnight events, price spikes, curtailment alerts, emissions, and opportunities.',
    icon: <Sun className="h-5 w-5" />,
    estimatedTime: '~30 seconds',
    config: {
      provinces: ['AB', 'ON'],
      includeEmissions: true,
      includeForecasts: true,
      includeStorage: true,
      includeOpportunities: true,
    },
  },
  {
    id: 'opportunity_detection',
    name: 'Opportunity Detection',
    description: 'Scans intertie capacity, price forecasts, and constraints to flag real arbitrage opportunities.',
    icon: <TrendingUp className="h-5 w-5" />,
    estimatedTime: '~45 seconds',
    config: {
      scanType: 'arbitrage',
      provinces: ['AB', 'ON', 'QC'],
      minSpread: 5,
    },
  },
  {
    id: 'compliance_report',
    name: 'Compliance Report',
    description: 'Auto-generates TIER compliance drafts with emissions data, benchmarks, and citations.',
    icon: <FileText className="h-5 w-5" />,
    estimatedTime: '~60 seconds',
    config: {
      reportType: 'tier_compliance',
      includeForecasts: true,
      includeHistorical: true,
    },
  },
];

interface WorkflowResult {
  success: boolean;
  briefing?: {
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
  error?: string;
}

export function AgentRunner() {
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow>(WORKFLOWS[0]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const [result, setResult] = useState<WorkflowResult | null>(null);
  const [history, setHistory] = useState<Array<{ workflow: string; time: string; success: boolean }>>([]);

  const runWorkflow = useCallback(async () => {
    setIsRunning(true);
    setProgress('Initializing workflow...');
    setResult(null);

    try {
      setProgress('Planning execution steps...');
      await new Promise(r => setTimeout(r, 1000));

      setProgress('Gathering data from multiple sources...');
      const { json } = await fetchEdgePostJson(
        [`llm/agent/${selectedWorkflow.id}`],
        { config: selectedWorkflow.config }
      );

      setProgress('Synthesizing results...');
      
      if (json?.error) {
        throw new Error(json.error);
      }

      setResult(json as WorkflowResult);
      setHistory(prev => [{
        workflow: selectedWorkflow.name,
        time: new Date().toLocaleTimeString(),
        success: Boolean(json?.success),
      }, ...prev].slice(0, 10));

    } catch (error) {
      setResult({
        success: false,
        executionTimeMs: 0,
        dataSources: [],
        error: error instanceof Error ? error.message : 'Workflow failed',
      });
    } finally {
      setIsRunning(false);
      setProgress('');
    }
  }, [selectedWorkflow]);

  const downloadReport = () => {
    if (!result?.briefing) return;

    const report = `
# ${selectedWorkflow.name} Report
Generated: ${result.briefing.generatedAt}
Execution Time: ${(result.executionTimeMs / 1000).toFixed(1)}s
Data Sources: ${result.dataSources.join(', ')}

## Summary
${result.briefing.summary}

## Sections
${result.briefing.sections.map(s => `
### ${s.title} (${s.priority} priority)
${s.content}
`).join('\n')}

## Action Items
${result.briefing.actionItems.map(item => `- ${item}`).join('\n')}
`;

    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedWorkflow.id}_${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title="Agent Runner | Automated Energy Workflows"
        description="Run automated energy analysis workflows: Morning Briefings, Opportunity Detection, Compliance Reports."
        path="/agent"
        keywords={['agent workflow', 'automation', 'morning briefing', 'opportunity detection', 'compliance report']}
      />

      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Agent Runner</h1>
              <p className="text-sm text-muted-foreground">
                Automated energy analysis workflows
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <FoundationRepairGate
          surfaceName="Agent Runner"
          summary="Agent workflows are intentionally gated until source freshness, demo-data honesty, and release verification are complete."
          dataTestId="foundation-repair-gate"
        >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Workflow Selection */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Select Workflow
            </h2>
            
            {WORKFLOWS.map((workflow) => (
              <button
                key={workflow.id}
                onClick={() => setSelectedWorkflow(workflow)}
                disabled={isRunning}
                className={cn(
                  'w-full text-left p-4 rounded-lg border transition-all',
                  selectedWorkflow.id === workflow.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'p-2 rounded-md',
                    selectedWorkflow.id === workflow.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}>
                    {workflow.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">{workflow.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {workflow.description}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {workflow.estimatedTime}
                    </div>
                  </div>
                  {selectedWorkflow.id === workflow.id && (
                    <ChevronRight className="h-4 w-4 text-primary" />
                  )}
                </div>
              </button>
            ))}

            {/* Run History */}
            {history.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Recent Runs
                </h3>
                <div className="space-y-2">
                  {history.map((h, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-sm p-2 rounded bg-muted"
                    >
                      <span>{h.workflow}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{h.time}</span>
                        {h.success ? (
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                        ) : (
                          <AlertTriangle className="h-3 w-3 text-amber-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Workflow Execution */}
          <div className="lg:col-span-2 space-y-6">
            {/* Control Panel */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold">{selectedWorkflow.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {selectedWorkflow.description}
                  </p>
                </div>
              <button
                data-testid="agent-run-workflow"
                onClick={runWorkflow}
                  disabled={isRunning}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Run Workflow
                    </>
                  )}
                </button>
              </div>

              {/* Progress */}
              {isRunning && progress && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
                  <span className="text-sm text-blue-900 dark:text-blue-100">{progress}</span>
                </div>
              )}
            </div>

            {/* Results */}
            {result && (
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    {result.success ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                    )}
                    <h3 className="font-semibold">
                      {result.success ? 'Workflow Complete' : 'Workflow Failed'}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {(result.executionTimeMs / 1000).toFixed(1)}s
                    </span>
                    {result.success && (
                      <button
                        onClick={downloadReport}
                        className="p-2 rounded-lg hover:bg-secondary transition-colors"
                        title="Download report"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {result.error && (
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950 text-red-900 dark:text-red-100 text-sm mb-4">
                    Error: {result.error}
                  </div>
                )}

                {result.briefing && (
                  <div className="space-y-6">
                    {/* Summary */}
                    <div className="p-4 rounded-lg bg-muted">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <h4 className="font-medium">Summary</h4>
                      </div>
                      <p className="text-sm">{result.briefing.summary}</p>
                    </div>

                    {/* Sections */}
                    {result.briefing.sections.map((section, i) => (
                      <div key={i} className="border-l-2 pl-4" style={{
                        borderColor: section.priority === 'high' ? '#ef4444' : 
                                    section.priority === 'medium' ? '#f59e0b' : '#10b981'
                      }}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn(
                            'text-xs px-2 py-0.5 rounded-full font-medium',
                            section.priority === 'high' && 'bg-red-100 text-red-700',
                            section.priority === 'medium' && 'bg-amber-100 text-amber-700',
                            section.priority === 'low' && 'bg-green-100 text-green-700'
                          )}>
                            {section.priority}
                          </span>
                          <h4 className="font-medium">{section.title}</h4>
                        </div>
                        <p className="text-sm text-muted-foreground">{section.content}</p>
                      </div>
                    ))}

                    {/* Action Items */}
                    {result.briefing.actionItems.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Action Items</h4>
                        <ul className="space-y-1">
                          {result.briefing.actionItems.map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Data Sources */}
                    <div className="pt-4 border-t">
                      <p className="text-xs text-muted-foreground">
                        Data sources: {result.dataSources.join(', ')}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Generated: {new Date(result.briefing.generatedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Empty State */}
            {!result && !isRunning && (
              <div className="card p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                  <RefreshCw className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-medium mb-1">Ready to Run</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Select a workflow from the left panel and click "Run Workflow" to start the automated analysis.
                </p>
              </div>
            )}
          </div>
        </div>
        </FoundationRepairGate>
      </div>
    </div>
  );
}
