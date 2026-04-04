/**
 * AskDataPage - Standalone Natural Language Query Interface
 * 
 * Full-page version of the AskDataPanel for dedicated data exploration.
 * Route: /ask-data
 */

import React from 'react';
import { AskDataPanel } from './AskDataPanel';
import { SEOHead } from './SEOHead';
import { Sparkles, Database } from 'lucide-react';
import { FoundationRepairGate } from './FoundationRepairGate';

export function AskDataPage() {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title="Ask Your Data | Natural Language Energy Analytics"
        description="Query Canadian energy data using natural language. Ask questions like 'Show me Alberta pool prices' or 'Compare Ontario and Alberta demand'."
        path="/ask-data"
        keywords={['natural language query', 'energy analytics', 'Alberta pool price', 'Ontario demand', 'SQL query', 'data exploration']}
      />
      
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Ask Your Data</h1>
              <p className="text-sm text-muted-foreground">
                Query Canadian energy data using natural language
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Info Banner */}
          <div className="mb-6 p-4 rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-950 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <Database className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Natural Language to SQL
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  Ask questions in plain English and get instant results from our database. 
                  Try: "Show me Alberta pool prices yesterday", "What's the average Ontario demand last week?", 
                  or "Compare carbon emissions by province."
                </p>
              </div>
            </div>
          </div>

          <FoundationRepairGate
            surfaceName="Ask Your Data"
            summary="NL2SQL stays gated until provenance metadata, demo-data labeling, and release safety checks are consistently enforced."
            dataTestId="foundation-repair-gate"
          >
            <div className="bg-card rounded-lg border p-6 shadow-sm">
              <AskDataPanel />
            </div>
          </FoundationRepairGate>

          {/* Tips Section */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <h3 className="font-medium mb-2">Available Data Sources</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Alberta (AESO) pool prices & grid data</li>
                <li>• Ontario (IESO) HOEP & demand forecasts</li>
                <li>• Provincial carbon emissions tracking</li>
                <li>• Renewable generation & curtailment</li>
                <li>• Storage dispatch & battery status</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <h3 className="font-medium mb-2">Query Tips</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Be specific about provinces (AB, ON, QC)</li>
                <li>• Include time ranges (yesterday, last week, last month)</li>
                <li>• Ask for aggregations (average, total, maximum)</li>
                <li>• Request comparisons between provinces</li>
                <li>• All queries are read-only for safety</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
