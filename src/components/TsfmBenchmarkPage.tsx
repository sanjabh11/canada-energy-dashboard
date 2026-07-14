import { useState, useEffect } from 'react';
import {
  parseBenchmarkReport,
  type TsfmBenchmarkReport,
  type TsfmBenchmarkMetrics,
  TSFM_MODEL_INFO,
} from '../lib/tsfmInterface';

export default function TsfmBenchmarkPage() {
  const [report, setReport] = useState<TsfmBenchmarkReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/data/tsfm-benchmark-results.json')
      .then((res) => res.json())
      .then((data) => {
        try {
          setReport(parseBenchmarkReport(data));
        } catch {
          setReport(data as TsfmBenchmarkReport);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(String(err));
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">TSFM Benchmark Results</h1>
        <p className="text-muted-foreground">Loading benchmark data...</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">TSFM Benchmark Results</h1>
        <p className="text-red-500">Failed to load benchmark data: {error}</p>
      </div>
    );
  }

  const horizons = [...new Set(report.results.map((r) => r.horizon))].sort((a, b) => a - b);
  const models = [...new Set(report.results.map((r) => r.modelType))];

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">TSFM Benchmark Results</h1>
        <p className="text-muted-foreground mt-1">
          Zero-shot evaluation of Time Series Foundation Models for Canadian energy demand
          forecasting. Benchmark date: {new Date(report.benchmarkDate).toLocaleDateString()} | Data
          source: {report.dataSource} | Train size: {report.trainSize} points
        </p>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <h2 className="text-lg font-semibold mb-3">
          Best Model: {TSFM_MODEL_INFO[report.bestModel]?.name ?? report.bestModel}
        </h2>
        <p className="text-sm text-muted-foreground">
          Best performance at {report.bestHorizon}h horizon. Results below show all models across
          horizons.
        </p>
      </div>

      {horizons.map((h) => {
        const horizonResults = report.results.filter((r) => r.horizon === h);
        return (
          <div key={h} className="rounded-lg border bg-card p-4">
            <h3 className="text-md font-semibold mb-3">{h}h Horizon</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Model</th>
                    <th className="text-right py-2">MAE</th>
                    <th className="text-right py-2">RMSE</th>
                    <th className="text-right py-2">MAPE</th>
                    <th className="text-right py-2">CRPS</th>
                    <th className="text-right py-2">Skill vs Persistence</th>
                    <th className="text-right py-2">Inference (ms)</th>
                  </tr>
                </thead>
                <tbody>
                  {horizonResults.map((r: TsfmBenchmarkMetrics) => (
                    <tr key={r.modelType} className="border-b">
                      <td className="py-2 font-medium">
                        {TSFM_MODEL_INFO[r.modelType]?.name ?? r.modelType}
                      </td>
                      <td className="text-right py-2">{r.mae.toFixed(2)}</td>
                      <td className="text-right py-2">{r.rmse.toFixed(2)}</td>
                      <td className="text-right py-2">{r.mape.toFixed(2)}%</td>
                      <td className="text-right py-2">{r.crps.toFixed(3)}</td>
                      <td className="text-right py-2">
                        {(r.skillVsPersistence * 100).toFixed(1)}%
                      </td>
                      <td className="text-right py-2">{r.inferenceTimeMs}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      <div className="rounded-lg border bg-card p-4">
        <h3 className="text-md font-semibold mb-2">Model Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {models.map((mt) => {
            const info = TSFM_MODEL_INFO[mt as keyof typeof TSFM_MODEL_INFO];
            if (!info) return null;
            return (
              <div key={mt} className="border rounded p-3">
                <p className="font-medium">{info.name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {info.params} params | Max context: {info.maxContext} | Covariates:{' '}
                  {info.supportsCovariates ? 'Yes' : 'No'} | Multivariate:{' '}
                  {info.supportsMultivariate ? 'Yes' : 'No'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">HuggingFace: {info.hfId}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        <p>
          Benchmarks run using <code>training/tsfm_benchmarks/benchmark.py</code> with
          rolling-origin backtests. CRPS computed via pinball loss at P10/P50/P90. Skill scores
          compare against persistence and seasonal-naive baselines.
        </p>
      </div>
    </div>
  );
}
