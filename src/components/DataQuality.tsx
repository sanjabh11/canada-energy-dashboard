import React, { useEffect, useRef, useState } from 'react';
import { getDataQuality, type DataQualityResponse } from '../lib/llmClient';
import { FileDown, Loader2, Link as LinkIcon } from 'lucide-react';

interface Props {
  datasetPath: string;
}

const DataQuality: React.FC<Props> = ({ datasetPath }) => {
  const [data, setData] = useState<DataQualityResponse | null>(null);
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
        const json = await getDataQuality(datasetPath, '', { signal: controller.signal });
        if (!controller.signal.aborted) setData(json);
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
        setError(e?.message || 'Failed to load data quality');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    run();

    return () => controller.abort();
  }, [datasetPath]);

  const issues: string[] = Array.isArray(data?.issues) ? (data!.issues as string[]) : [];
  const recommendations: string[] = Array.isArray(data?.recommendations) ? (data!.recommendations as string[]) : [];
  const alerts: string[] = Array.isArray(data?.alerts) ? (data!.alerts as string[]) : [];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">Data Quality</h3>
        <button
          onClick={() => { if (data) { const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `data-quality_${datasetPath}.json`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); } }}
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
            <span>Generating quality report…</span>
          </div>
        )}
        {error && (
          <div className="text-sm text-red-600">{error}</div>
        )}
        {!loading && !error && data && (
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-slate-800 mb-1">Summary</h4>
              <p className="text-sm text-slate-700 whitespace-pre-line">{data.summary}</p>
            </div>
            {issues.length > 0 && (
              <div>
                <h4 className="font-semibold text-slate-800 mb-1">Issues</h4>
                <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
                  {issues.map((issue, i) => (
                    <li key={i}>{issue}</li>
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
            {alerts.length > 0 && (
              <div>
                <h4 className="font-semibold text-slate-800 mb-1">Alerts</h4>
                <ul className="list-disc pl-5 text-sm text-red-600 space-y-1">
                  {alerts.map((alert, i) => (
                    <li key={i}>{alert}</li>
                  ))}
                </ul>
              </div>
            )}
            {(data.confidence !== undefined && data.confidence !== null) && (
              <div className="text-sm text-slate-600"><span className="font-medium">Confidence:</span> {String(data.confidence)}</div>
            )}
            {Array.isArray(data.sources) && data.sources.length > 0 && (
              <div>
                <h4 className="font-semibold text-slate-800 mb-1">Citations</h4>
                <ul className="list-disc pl-5 text-sm text-blue-700 space-y-1">
                  {data.sources.map((s: any, i) => {
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

export default DataQuality;
