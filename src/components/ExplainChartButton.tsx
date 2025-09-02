import React, { useState } from 'react';
import { getEdgeBaseUrl, getEdgeHeaders } from '@/lib/config';

type ExplainResult = {
  tl_dr?: string;
  trends?: string[];
  classroom_activity?: string;
  provenance?: Array<{ id: string; last_updated?: string; note?: string }>;
  text?: string;
};

export default function ExplainChartButton({ datasetPath, panelId, timeframe }: { datasetPath: string; panelId: string; timeframe?: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExplainResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedbackSent, setFeedbackSent] = useState(false);

  async function handleExplain() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const base = getEdgeBaseUrl();
      if (!base) {
        setError('Edge base URL not configured.');
        setLoading(false);
        return;
      }
      const resp = await fetch(`${base}/llm/explain-chart`, {
        method: 'POST',
        headers: { ...getEdgeHeaders() },
        body: JSON.stringify({ datasetPath, panelId, timeframe })
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({} as any));
        setError(err.error || `Request failed (${resp.status})`);
        setLoading(false);
        return;
      }
      const json = await resp.json();
      setResult(json.result || json);
    } catch (e: any) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function sendFeedback(up: boolean) {
    if (feedbackSent) return;
    try {
      const base = getEdgeBaseUrl();
      if (!base) return;
      await fetch(`${base}/llm/feedback`, {
        method: 'POST',
        headers: { ...getEdgeHeaders() },
        body: JSON.stringify({ userId: 'demo-user', endpoint: 'explain-chart', feedback: up ? 'up' : 'down', detail: result })
      });
      setFeedbackSent(true);
    } catch {
      // ignore
    }
  }

  return (
    <div className="explain-chart">
      <button onClick={handleExplain} disabled={loading} className="btn btn-primary">
        {loading ? 'Explaining...' : 'Explain this chart'}
      </button>

      {error && <div className="mt-3 text-red-600">Error: {error}</div>}

      {result && (
        <div className="mt-3 p-3 border rounded bg-white">
          {result.tl_dr && (
            <div>
              <strong>TL;DR:</strong> {result.tl_dr}
            </div>
          )}
          {result.trends && (
            <div className="mt-2">
              <strong>Trends:</strong>
              <ul>
                {result.trends.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          )}
          {result.classroom_activity && (
            <div className="mt-2">
              <strong>Classroom activity:</strong>
              <div>{result.classroom_activity}</div>
            </div>
          )}
          {result.provenance && (
            <div className="mt-2">
              <strong>Provenance:</strong>
              <ul>
                {result.provenance.map((p, i) => (
                  <li key={i}>
                    {p.id} (last updated: {p.last_updated || 'unknown'}) — {p.note || ''}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {!result.tl_dr && result.text && (
            <div className="mt-2">
              <pre>{result.text}</pre>
            </div>
          )}
          <div className="mt-3">
            <button onClick={() => sendFeedback(true)} className="mr-2 btn btn-success" disabled={feedbackSent}>
              👍 Helpful
            </button>
            <button onClick={() => sendFeedback(false)} className="btn btn-danger" disabled={feedbackSent}>
              👎 Not helpful
            </button>
            {feedbackSent && <span className="ml-2 text-sm text-gray-600">Thanks for feedback</span>}
          </div>
        </div>
      )}
    </div>
  );
}
