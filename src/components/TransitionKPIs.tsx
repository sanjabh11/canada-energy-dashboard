import React, { useEffect, useRef, useState } from 'react';
import { getTransitionKpis, type TransitionKpisResponse } from '../lib/llmClient';
import { FileDown, Loader2, Link as LinkIcon } from 'lucide-react';

interface Props {
  datasetPath: string;
  timeframe: string;
}

const TransitionKPIs: React.FC<Props> = ({ datasetPath, timeframe }) => {
  const [data, setData] = useState<TransitionKpisResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const json = await getTransitionKpis(datasetPath, timeframe, { signal: controller.signal });
        if (!controller.signal.aborted) setData(json);
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
        setError(e?.message || 'Failed to load transition KPIs');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    run();

    return () => controller.abort();
  }, [datasetPath, timeframe]);

  // Use a permissive proxy to read optional fields without breaking types
  const anyData: any = data as any;
  const progress: string[] = Array.isArray(anyData?.progress) ? anyData.progress as string[] : [];
  const risks: string[] = Array.isArray(anyData?.risks) ? anyData.risks as string[] : [];
  const recommendations: string[] = Array.isArray(anyData?.recommendations) ? anyData.recommendations as string[] : [];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">Transition KPIs</h3>
        <button
          onClick={() => { if (data) { const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `transition-kpis_${datasetPath}_${timeframe}.json`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); } }}
          disabled={!data}
          className="flex items-center space-x-2 text-sm bg-slate-100 hover:bg-slate-200 disabled:opacity-50 px-3 py-2 rounded"
        >
          <FileDown className="h-4 w-4" />
          <span>Download JSON</span>
        </button>
      </div>
      <div className="p-4">
        {loading && (
          <div className="flex items-center space-x-2 text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Generating KPIs report…</span>
          </div>
        )}
        {error && (
          <div className="text-sm text-red-600">{error}</div>
        )}
        {!loading && !error && data && (
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-slate-800 mb-1">Summary</h4>
              <p className="text-sm text-slate-700 whitespace-pre-line">{String(anyData?.summary ?? '')}</p>
            </div>
            {progress.length > 0 && (
              <div>
                <h4 className="font-semibold text-slate-800 mb-1">Progress</h4>
                <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
                  {progress.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>
            )}
            {risks.length > 0 && (
              <div>
                <h4 className="font-semibold text-slate-800 mb-1">Risks</h4>
                <ul className="list-disc pl-5 text-sm text-red-600 space-y-1">
                  {risks.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
            {recommendations.length > 0 && (
              <div>
                <h4 className="font-semibold text-slate-800 mb-1">Recommendations</h4>
                <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
                  {recommendations.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
            {(anyData?.confidence !== undefined && anyData?.confidence !== null) && (
              <div className="text-sm text-slate-600"><span className="font-medium">Confidence:</span> {String(anyData.confidence)}</div>
            )}
            {Array.isArray(anyData?.sources) && anyData.sources.length > 0 && (
              <div>
                <h4 className="font-semibold text-slate-800 mb-1">Citations</h4>
                <ul className="list-disc pl-5 text-sm text-blue-700 space-y-1">
                  {anyData.sources.map((s: any, i: number) => {
                    const label = s?.id || s?.title || 'Source';
                    const meta = s?.last_updated ? ` (updated: ${s.last_updated})` : '';
                    const excerpt = s?.excerpt ? String(s.excerpt) : '';
                    return (
                      <li key={i} className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <LinkIcon className="h-3 w-3" />
                          {s?.url ? (
                            <a href={s.url} target="_blank" rel="noreferrer" className="underline break-all">{label}</a>
                          ) : (
                            <span className="break-all">{label}{meta}</span>
                          )}
                        </div>
                        {excerpt && <div className="text-xs text-slate-600 break-words">{excerpt}</div>}
                        {Array.isArray(s?.snippets) && s.snippets.length > 0 && (
                          <ul className="list-disc pl-5 text-xs text-slate-600 space-y-0.5">
                            {s.snippets.map((sn: any, j: number) => (
                              <li key={j} className="break-words">
                                {sn?.text || ''}
                                {sn?.context ? <span className="text-slate-500"> ({sn.context})</span> : null}
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TransitionKPIs;
