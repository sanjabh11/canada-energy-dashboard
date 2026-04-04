import React, { useEffect, useRef, useState } from 'react';
import { getDataQuality, type DataQualityResponse } from '../lib/llmClient';
import { FileDown, Loader2, AlertTriangle, CheckCircle2, Link as LinkIcon } from 'lucide-react';
import RetrievedEvidencePanel from './RetrievedEvidencePanel';

interface Props {
  datasetPath: string;
  timeframe: string;
}

const DataQualityPanel: React.FC<Props> = ({ datasetPath, timeframe }) => {
  const [data, setData] = useState<DataQualityResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ show: boolean; message: string; type: 'success' | 'error' } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const showFeedbackMessage = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ show: true, message, type });
    setTimeout(() => setFeedback(null), 3000);
  };

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const json = await getDataQuality(datasetPath, timeframe, { signal: controller.signal });
        if (!controller.signal.aborted) setData(json);
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
        setError(e?.message || 'Failed to load data quality summary');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    run();

    return () => controller.abort();
  }, [datasetPath, timeframe]);

  const downloadJson = () => {
    if (!data) {
      console.warn('Download attempted but no data available');
      showFeedbackMessage('No data available to download', 'error');
      return;
    }
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeDataset = (datasetPath || 'unknown').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const safeTimeframe = (timeframe || 'latest').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      link.download = `data-quality_${safeDataset}_${safeTimeframe}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showFeedbackMessage('Data quality report downloaded successfully', 'success');
    } catch (err) {
      console.error('Failed to download JSON:', err);
      showFeedbackMessage('Failed to download report', 'error');
    }
  };

  const issues = Array.isArray(data?.issues) ? data!.issues : [];
  const recs = Array.isArray(data?.recommendations) ? data!.recommendations! : [];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      {feedback?.show && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg text-sm font-medium ${
          feedback.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            {feedback.message}
          </div>
        </div>
      )}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">Data Quality</h3>
        <button
          onClick={downloadJson}
          disabled={!data}
          className="flex items-center space-x-2 text-sm bg-white hover:bg-slate-50 disabled:opacity-50 disabled:bg-slate-100 border border-slate-300 shadow-sm text-slate-700 font-medium px-3 py-2 rounded transition-colors"
        >
          <FileDown className="h-4 w-4" />
          <span>Download JSON</span>
        </button>
      </div>
      <div className="p-4">
        {loading && (
          <div className="flex items-center space-x-2 text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Analyzing data quality…</span>
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
            <RetrievedEvidencePanel
              query={data.summary || `${datasetPath} ${timeframe} data quality`}
              sourceTypes={['energy_corpus']}
              title="Supporting Energy Corpus Evidence"
              limit={3}
            />

            {issues.length > 0 && (
              <div>
                <h4 className="font-semibold text-slate-800 mb-2 flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span>Issues</span>
                </h4>
                <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
                  {issues.map((it, i) => (
                    <li key={i}>
                      {typeof it === 'string' ? it : `${it.description}${it.severity ? ` (severity: ${it.severity})` : ''}`}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {recs.length > 0 && (
              <div>
                <h4 className="font-semibold text-slate-800 mb-2 flex items-center space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Recommendations</span>
                </h4>
                <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
                  {recs.map((r, i) => (
                    <li key={i}>{r}</li>
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

export default DataQualityPanel;
