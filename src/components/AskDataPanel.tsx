/**
 * AskDataPanel - Natural Language Query Interface
 * 
 * Allows users to ask questions in plain English and get data results.
 * Powered by NL2SQL edge function with safety guardrails.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { fetchEdgePostJson } from '@/lib/edge';
import { 
  Search, 
  Loader2, 
  Table2, 
  BarChart3, 
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  Sparkles,
  History,
  X,
  ChevronDown,
  ChevronUp,
  Download,
  Copy,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface QueryResult {
  naturalQuery: string;
  generatedSQL: string;
  results: Record<string, unknown>[];
  explanation?: string;
  meta: {
    executionTimeMs: number;
    rowCount: number;
    truncated: boolean;
    cacheHit: boolean;
    schemaVersion: string;
  };
}

interface QueryHistoryItem {
  id: string;
  query: string;
  timestamp: string;
  rowCount: number;
  success: boolean;
}

const EXAMPLE_QUERIES = [
  'Show me Alberta pool prices from yesterday',
  "What's the average Ontario demand last week?",
  'Show me carbon emissions by province',
  'Find recent curtailment events in Alberta',
  'Compare renewable generation across provinces',
  'Show storage dispatch actions from last 24 hours',
];

export function AskDataPanel() {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<QueryHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'json'>('table');
  const [copiedSQL, setCopiedSQL] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('nl2sql_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem('nl2sql_history', JSON.stringify(history.slice(0, 20)));
  }, [history]);

  const executeQuery = useCallback(async () => {
    if (!query.trim() || isLoading) return;

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const { json } = await fetchEdgePostJson(
        ['nl2sql'],
        {
          query: query.trim(),
          maxResults: 100,
          includeExplanation: true,
          format: 'json',
        },
        { signal: abortControllerRef.current.signal }
      );

      if (json?.error) {
        throw new Error(json.error);
      }

      const resultData: QueryResult = json;
      setResult(resultData);

      // Add to history
      const historyItem: QueryHistoryItem = {
        id: Date.now().toString(),
        query: query.trim(),
        timestamp: new Date().toISOString(),
        rowCount: resultData.meta.rowCount,
        success: true,
      };
      setHistory(prev => [historyItem, ...prev].slice(0, 20));

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Query failed';
      setError(errorMessage);

      // Add failed query to history
      const historyItem: QueryHistoryItem = {
        id: Date.now().toString(),
        query: query.trim(),
        timestamp: new Date().toISOString(),
        rowCount: 0,
        success: false,
      };
      setHistory(prev => [historyItem, ...prev].slice(0, 20));
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [query, isLoading]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      executeQuery();
    }
  };

  const loadHistoryQuery = (historyQuery: string) => {
    setQuery(historyQuery);
    setShowHistory(false);
  };

  const copySQL = async () => {
    if (!result?.generatedSQL) return;
    await navigator.clipboard.writeText(result.generatedSQL);
    setCopiedSQL(true);
    setTimeout(() => setCopiedSQL(false), 2000);
  };

  const downloadResults = () => {
    if (!result?.results.length) return;
    
    const headers = Object.keys(result.results[0]);
    const csvContent = [
      headers.join(','),
      ...result.results.map(row => 
        headers.map(h => {
          const val = row[h];
          if (val === null) return '';
          if (typeof val === 'string' && val.includes(',')) return `"${val}"`;
          return String(val);
        }).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query-results-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Ask Your Data</h2>
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <History className="h-4 w-4" />
          History
          {showHistory ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>

      {/* Query Input */}
      <div className="relative">
        <textarea
          data-testid="ask-data-query-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question about your energy data... (e.g., 'Show me Alberta pool prices yesterday')"
          className="w-full min-h-[80px] p-3 pr-12 rounded-lg border bg-background resize-y focus:outline-none focus:ring-2 focus:ring-primary/20"
          maxLength={500}
          disabled={isLoading}
        />
        <button
          onClick={executeQuery}
          disabled={!query.trim() || isLoading}
          className="absolute bottom-3 right-3 p-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Example Queries */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-muted-foreground py-1">Examples:</span>
        {EXAMPLE_QUERIES.map((example) => (
          <button
            key={example}
            onClick={() => setQuery(example)}
            className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            {example}
          </button>
        ))}
      </div>

      {/* History Panel */}
      {showHistory && (
        <div className="border rounded-lg p-3 bg-secondary/30">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium">Recent Queries</h3>
            <button
              onClick={() => setHistory([])}
              className="text-xs text-destructive hover:underline"
            >
              Clear
            </button>
          </div>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No queries yet</p>
          ) : (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {history.map((item) => (
                <button
                  key={item.id}
                  onClick={() => loadHistoryQuery(item.query)}
                  className="w-full text-left p-2 rounded hover:bg-secondary transition-colors text-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate flex-1">{item.query}</span>
                    <div className="flex items-center gap-2 ml-2">
                      {item.success ? (
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-3 w-3 text-destructive" />
                      )}
                      <span className="text-xs text-muted-foreground">
                        {item.rowCount} rows
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">Query failed</p>
              <p className="text-sm text-destructive/80">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-3">
          {/* SQL Preview */}
          <div className="rounded-lg border bg-muted/50">
            <div className="flex items-center justify-between px-3 py-2 border-b">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Generated SQL</span>
              </div>
              <button
                onClick={copySQL}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {copiedSQL ? (
                  <>
                    <Check className="h-3 w-3" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    Copy
                  </>
                )}
              </button>
            </div>
            <pre className="p-3 text-xs overflow-x-auto font-mono bg-black/5 rounded-b-lg">
              <code>{result.generatedSQL}</code>
            </pre>
          </div>

          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{result.meta.executionTimeMs}ms</span>
            </div>
            <div className="flex items-center gap-1">
              <Table2 className="h-3 w-3" />
              <span>{result.meta.rowCount} rows</span>
              {result.meta.truncated && (
                <span className="text-amber-500">(truncated)</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Database className="h-3 w-3" />
              <span>Schema v{result.meta.schemaVersion}</span>
            </div>
            {result.meta.cacheHit && (
              <span className="text-green-500">(cached)</span>
            )}
            {result.explanation && (
              <span className="text-primary">{result.explanation}</span>
            )}
          </div>

          {/* Results Table */}
          {result.results.length > 0 && (
            <div className="rounded-lg border">
              {/* Toolbar */}
              <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/50">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewMode('table')}
                    className={cn(
                      'p-1.5 rounded transition-colors',
                      viewMode === 'table' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'
                    )}
                  >
                    <Table2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('json')}
                    className={cn(
                      'p-1.5 rounded transition-colors',
                      viewMode === 'json' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'
                    )}
                  >
                    <span className="text-xs font-mono">{'{ }'}</span>
                  </button>
                </div>
                <button
                  onClick={downloadResults}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Download className="h-3 w-3" />
                  Download CSV
                </button>
              </div>

              {/* Table View */}
              {viewMode === 'table' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        {Object.keys(result.results[0]).map((header) => (
                          <th
                            key={header}
                            className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.results.map((row, i) => (
                        <tr key={i} className="border-t hover:bg-muted/30">
                          {Object.values(row).map((value, j) => (
                            <td
                              key={j}
                              className="px-3 py-2 whitespace-nowrap font-mono text-xs"
                            >
                              {value === null ? (
                                <span className="text-muted-foreground">NULL</span>
                              ) : typeof value === 'object' ? (
                                JSON.stringify(value)
                              ) : (
                                String(value)
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* JSON View */}
              {viewMode === 'json' && (
                <pre className="p-3 text-xs overflow-x-auto font-mono bg-black/5 max-h-96 overflow-y-auto">
                  <code>{JSON.stringify(result.results, null, 2)}</code>
                </pre>
              )}
            </div>
          )}

          {/* No Results */}
          {result.results.length === 0 && !error && (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <Database className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No results found</p>
              <p className="text-xs text-muted-foreground mt-1">
                Try adjusting your query or checking the time range
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
