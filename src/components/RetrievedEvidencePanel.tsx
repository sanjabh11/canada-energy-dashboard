import React, { useEffect, useRef, useState } from 'react';
import { Database, ExternalLink, Loader2, WifiOff } from 'lucide-react';
import { searchEnergyRag, type RagSearchResponse } from '../lib/llmClient';
import { isEdgeFetchEnabled } from '../lib/config';

interface RetrievedEvidencePanelProps {
  query: string;
  sourceTypes?: string[];
  title?: string;
  limit?: number;
}

const RetrievedEvidencePanel: React.FC<RetrievedEvidencePanelProps> = ({
  query,
  sourceTypes = ['energy_corpus'],
  title = 'Retrieved Evidence',
  limit = 3,
}) => {
  const [data, setData] = useState<RagSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isOfflineRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const sourceTypesKey = sourceTypes.join('|');

  useEffect(() => {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      setData(null);
      setError(null);
      isOfflineRef.current = false;
      setLoading(false);
      return;
    }

    // Check offline status before fetching
    const offline = !isEdgeFetchEnabled();
    isOfflineRef.current = offline;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await searchEnergyRag(normalizedQuery, { limit, sourceTypes }, { signal: controller.signal });
        if (!controller.signal.aborted) {
          setData(response);
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        if (!controller.signal.aborted) {
          const errorMessage = err?.message || 'Failed to load evidence';
          setError(errorMessage);
          // Also mark as offline for network errors (fetch failures)
          if (errorMessage.toLowerCase().includes('fetch') || errorMessage.toLowerCase().includes('network') || err?.name === 'TypeError') {
            isOfflineRef.current = true;
          }
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    run();
    return () => controller.abort();
  }, [limit, query, sourceTypesKey]);

  if (!query.trim()) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-slate-600" />
          <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
        </div>
        {data && (
          <span className="text-xs text-slate-500">
            {data.mode === 'vector' ? 'Semantic' : 'Lexical'} • {data.meta.resultCount} results
          </span>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Retrieving evidence…</span>
        </div>
      )}

      {!loading && error && (
        <div className="text-sm">
          {isOfflineRef.current ? (
            <div className="flex items-center gap-2 text-slate-500">
              <WifiOff className="h-4 w-4" />
              <span>Evidence retrieval requires Supabase Edge access. Offline mode active.</span>
            </div>
          ) : (
            <div className="text-red-600">{error}</div>
          )}
        </div>
      )}

      {!loading && !error && data && data.results.length === 0 && (
        <div className="text-sm">
          {data.meta?.fallbackReason === 'edge_fetch_disabled' ? (
            <div className="flex items-center gap-2 text-slate-500">
              <WifiOff className="h-4 w-4" />
              <span>Evidence retrieval requires Supabase Edge access. Enable VITE_ENABLE_EDGE_FETCH for RAG search.</span>
            </div>
          ) : (
            <div className="text-slate-600">No matching evidence found for this query.</div>
          )}
        </div>
      )}

      {!loading && !error && data && data.results.length > 0 && (
        <div className="space-y-3">
          {data.results.map((result) => {
            const citationId = typeof result.metadata?.citation_id === 'string' ? result.metadata.citation_id : `${result.source_id}:${result.chunk_index + 1}`;
            return (
              <div key={result.id || citationId} className="rounded-md border border-slate-200 bg-white p-3">
                <div className="mb-1 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-slate-800">{result.title || result.source_id}</div>
                    <div className="text-xs text-slate-500">{citationId}</div>
                  </div>
                  {result.source_url && (
                    <a href={result.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-700 underline">
                      <ExternalLink className="h-3 w-3" />
                      Source
                    </a>
                  )}
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-line">{result.content}</p>
                <div className="mt-2 text-xs text-slate-500">
                  {result.source_updated_at ? `Updated: ${new Date(result.source_updated_at).toLocaleString()}` : 'Updated: unknown'}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RetrievedEvidencePanel;
