import React, { useEffect, useState } from 'react';
import { BarChart3, Download, TrendingUp, Wind, Sun, Activity, Info, ExternalLink } from 'lucide-react';
import { SEOHead } from './SEOHead';
import { ForecastAccuracyPanel } from './ForecastAccuracyPanel';
import { DataFreshnessBadge } from './DataFreshnessBadge';
import { DATA_SNAPSHOT_DATE, DATA_SNAPSHOT_LABEL } from '../lib/aesoService';
import { Link } from 'react-router-dom';
import { runMlForecast } from '../lib/mlForecastingClient';
import { fetchGasBasisTrainingWindow, fetchMarketSpikeTrainingWindow } from '../lib/timeseriesSource';
import { getLatestRetainedFeatures } from '../lib/featureRankingsSource';
import { fetchFeatureRankingParitySummary } from '../lib/featureRankingParitySource';

const ForecastBenchmarkingPage: React.FC = () => {
  const [resourceType, setResourceType] = useState<'solar' | 'wind'>('solar');
  const [province, setProvince] = useState('ON');
  const [mlRun, setMlRun] = useState<any>(null);
  const [marketSpikeRun, setMarketSpikeRun] = useState<any>(null);
  const [gasBasisRun, setGasBasisRun] = useState<any>(null);
  const [retainedFeatures, setRetainedFeatures] = useState<string[]>([]);
  const [paritySummary, setParitySummary] = useState<any>(null);

  const provinces = [
    { value: 'ON', label: 'Ontario' },
    { value: 'AB', label: 'Alberta' },
    { value: 'BC', label: 'British Columbia' },
    { value: 'QC', label: 'Quebec' },
  ];

  useEffect(() => {
    let cancelled = false;
    getLatestRetainedFeatures('svm-rfe-adapter-v1').then((result) => {
      if (!cancelled) setRetainedFeatures(result.retainedFeatures);
    }).catch(() => {
      if (!cancelled) setRetainedFeatures([]);
    });
    fetchFeatureRankingParitySummary().then((result) => {
      if (!cancelled) setParitySummary(result);
    }).catch(() => {
      if (!cancelled) setParitySummary(null);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    runMlForecast({
      domain: resourceType,
      province,
      horizon_hours: 24,
      scenario: { reserveMarginPercent: 8 },
    }).then(({ data }) => {
      if (!cancelled) setMlRun(data);
    });
    return () => { cancelled = true; };
  }, [resourceType, province]);

  useEffect(() => {
    let cancelled = false;
    fetchMarketSpikeTrainingWindow(730).then((trainingRows) => runMlForecast({
      domain: 'price_spike',
      province,
      horizon_hours: 24,
      scenario: {
        poolPriceCadPerMwh: province === 'AB' ? 250 : 180,
        demandMw: province === 'AB' ? 10800 : 9200,
        reserveMarginPercent: province === 'AB' ? 7 : 10,
        windGenerationMw: province === 'AB' ? 420 : 600,
        temperatureC: province === 'AB' ? -18 : 6,
        trainingRows,
      },
    })).then(({ data }) => {
      if (!cancelled) setMarketSpikeRun(data);
    }).catch(() => {
      if (!cancelled) setMarketSpikeRun(null);
    });
    return () => { cancelled = true; };
  }, [province]);

  useEffect(() => {
    let cancelled = false;
    fetchGasBasisTrainingWindow(730).then((trainingRows) => {
      const latest = trainingRows.at(-1);
      return runMlForecast({
        domain: 'gas_basis',
        province: 'AB',
        horizon_hours: 24,
        scenario: {
          aecoCadPerGj: latest?.aecoCadPerGj ?? 1.62,
          henryHubCadPerGj: latest?.henryHubCadPerGj ?? 3.08,
          pipelineCurtailmentPct: latest?.pipelineCurtailmentPct ?? 8,
          storageDeficitPct: latest?.storageDeficitPct ?? 11,
          temperatureC: latest?.temperatureC ?? -14,
          basisLag1: latest?.basisLag1 ?? 1.42,
          basisLag7: latest?.basisLag7 ?? 1.38,
          historyRows: trainingRows,
          backtestRows: trainingRows.slice(-Math.max(30, Math.floor(trainingRows.length / 4))),
          sourceProfile: trainingRows.length > 0 ? 'real' : 'synthetic',
        },
      });
    }).then(({ data }) => {
      if (!cancelled) setGasBasisRun(data);
    }).catch(() => {
      if (!cancelled) setGasBasisRun(null);
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-slate-900">
      <SEOHead
        title="Forecast Benchmarking Tool | Canadian Energy Forecast Accuracy"
        description="Evaluate energy forecasts against industry baselines. MAE, MAPE, RMSE metrics across 1h-48h horizons with persistence and seasonal naive benchmarks for Canadian renewable energy."
        path="/forecast-benchmarking"
        keywords={['energy forecast accuracy', 'load forecasting benchmark', 'Canadian renewable forecast', 'MAE MAPE RMSE', 'forecast evaluation']}
      />

      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 rounded-xl">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Forecast Benchmarking</h1>
                <p className="text-indigo-100">
                  Evaluate forecast accuracy against industry-standard baselines
                </p>
              </div>
            </div>
            <DataFreshnessBadge
              snapshotDate={DATA_SNAPSHOT_DATE}
              snapshotLabel={DATA_SNAPSHOT_LABEL}
              isFallback
              source="AESO snapshot / benchmark baselines"
            />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto py-8 px-6">
        {/* What This Tool Does */}
        <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-indigo-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-white mb-2">What This Tool Does</h3>
              <p className="text-slate-300 text-sm mb-3">
                Compare your renewable energy forecasts against standard statistical baselines 
                used across the industry. We evaluate accuracy across multiple time horizons 
                (1h to 48h) using MAE, MAPE, and RMSE metrics.
              </p>
              <p className="text-xs text-amber-200/90">
                Current baselines are static benchmark datasets. Treat them as demo/training references until live provenance is wired through the forecasting pipeline.
              </p>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <div className="text-indigo-400 font-medium mb-1">Persistence Baseline</div>
                  <div className="text-slate-400">Tomorrow = Today. The simplest forecast — any ML model must beat this.</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <div className="text-indigo-400 font-medium mb-1">Seasonal Naive</div>
                  <div className="text-slate-400">Same hour, same day last week. Captures weekly patterns in load/generation.</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <div className="text-indigo-400 font-medium mb-1">Uplift Score</div>
                  <div className="text-slate-400">% improvement over baseline. Proves your forecast model adds real value.</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => setResourceType('solar')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                resourceType === 'solar'
                  ? 'bg-amber-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sun className="h-4 w-4" />
              Solar
            </button>
            <button
              onClick={() => setResourceType('wind')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                resourceType === 'wind'
                  ? 'bg-cyan-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Wind className="h-4 w-4" />
              Wind
            </button>
          </div>

          <select
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2 text-sm"
          >
            {provinces.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {/* Main Forecast Accuracy Panel */}
        <div className="mb-8">
          <ForecastAccuracyPanel
            resourceType={resourceType}
            province={province}
          />
        </div>

        {mlRun?.meta && (
          <div className="bg-cyan-950/30 border border-cyan-500/30 rounded-xl p-5 mb-8">
            <h2 className="text-white font-semibold mb-2">Latest ML Governance Run</h2>
            <p className="text-sm text-slate-300">
              {mlRun.meta.model_version} · {mlRun.province} · {mlRun.predictions?.length ?? 0} predictions · confidence {(mlRun.meta.confidence_score * 100).toFixed(0)}%
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-4 text-xs text-slate-300">
              <div className="rounded-lg border border-cyan-500/20 bg-slate-900/40 p-3">
                <div className="text-slate-500">Training data</div>
                <div className="text-white font-medium">{mlRun.meta.training_data_profile ?? 'unknown'}</div>
              </div>
              <div className="rounded-lg border border-cyan-500/20 bg-slate-900/40 p-3">
                <div className="text-slate-500">Calibration</div>
                <div className="text-white font-medium">{mlRun.meta.calibration_status ?? 'uncalibrated'}</div>
              </div>
              <div className="rounded-lg border border-cyan-500/20 bg-slate-900/40 p-3">
                <div className="text-slate-500">Claim label</div>
                <div className="text-white font-medium">{mlRun.meta.claim_label ?? 'estimated'}</div>
              </div>
              <div className="rounded-lg border border-cyan-500/20 bg-slate-900/40 p-3">
                <div className="text-slate-500">Evaluation</div>
                <div className="text-white font-medium">
                  {mlRun.meta.evaluation_summary
                    ? `${mlRun.meta.evaluation_summary.sample_count} samples`
                    : 'n/a'}
                </div>
              </div>
            </div>
            {retainedFeatures.length > 0 && (
              <p className="mt-3 text-xs text-cyan-200">
                Latest SVM-RFE retained set: {retainedFeatures.join(', ')}
              </p>
            )}
            <p className="text-xs text-slate-500 mt-2">
              Reads from the `ml-forecast` adapter when Edge is enabled; otherwise shows local fallback metadata. Uplift still requires backtest evidence.
            </p>
          </div>
        )}

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 mb-8" data-testid="feature-ranking-benchmark-card">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-white font-semibold">Feature Ranking / Parity Benchmark</h2>
              <p className="text-sm text-slate-400">
                Retained sensor set from the live SVM-RFE adapter plus the latest aligned parity benchmark snapshot.
              </p>
            </div>
            <div className={`rounded-full px-3 py-1 text-xs font-semibold ${
              paritySummary?.available && paritySummary?.artifact?.parityPassed
                ? 'bg-emerald-500/15 text-emerald-200'
                : 'bg-amber-500/15 text-amber-200'
            }`}>
              {paritySummary?.statusLabel ?? 'artifact not uploaded yet'}
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-4 text-sm">
            <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
              <div className="text-slate-500">Retained features</div>
              <div className="mt-1 text-white font-medium">{retainedFeatures.length}</div>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
              <div className="text-slate-500">Parity overlap</div>
              <div className="mt-1 text-white font-medium">
                {paritySummary?.artifact ? `${(Number(paritySummary.artifact.overlapRatio) * 100).toFixed(0)}%` : 'Artifact unavailable'}
              </div>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
              <div className="text-slate-500">Dataset fingerprint</div>
              <div className="mt-1 break-all text-xs text-slate-300">
                {paritySummary?.artifact?.datasetFingerprint ?? 'Artifact unavailable'}
              </div>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
              <div className="text-slate-500">Seed / samples</div>
              <div className="mt-1 text-white font-medium">
                {paritySummary?.artifact ? `${paritySummary.artifact.seed} / ${Number(paritySummary.artifact.sampleCount).toLocaleString()}` : '42 / n/a'}
              </div>
            </div>
          </div>
          {retainedFeatures.length > 0 && (
            <p className="mt-4 text-sm text-cyan-200">
              Retained set: {retainedFeatures.join(', ')}
            </p>
          )}
          {paritySummary?.artifact ? (
            <>
              <p className="mt-2 text-xs text-slate-400">
                TypeScript source of truth: {paritySummary.artifact.tsModelVersion} · aligned reference: {paritySummary.artifact.referenceModelVersion}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Reference retained set: {paritySummary.artifact.referenceRetainedFeatures.join(', ')}
              </p>
            </>
          ) : (
            <p className="mt-2 text-xs text-slate-500">
              The ranking UI is live, but the benchmark artifact has not been uploaded into this deployment yet.
            </p>
          )}
        </div>

        {marketSpikeRun?.analysis && (
          <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-5 mb-8">
            <h2 className="text-white font-semibold mb-2">Wholesale Spike Screen</h2>
            <p className="text-sm text-slate-300">
              {marketSpikeRun.meta.model_version} · risk {(Number(marketSpikeRun.analysis.riskScore ?? 0) * 100).toFixed(0)}% · threshold {Number(marketSpikeRun.analysis.spikeThresholdCadPerMwh ?? 1000).toFixed(0)} CAD/MWh
            </p>
            <div className="mt-4 grid md:grid-cols-3 gap-3 text-sm">
              <div className="rounded-lg border border-amber-500/20 bg-slate-900/40 p-3">
                <div className="text-slate-400">Drivers</div>
                <div className="text-white font-semibold">{(marketSpikeRun.analysis.reasons ?? []).join(', ') || 'n/a'}</div>
              </div>
              <div className="rounded-lg border border-amber-500/20 bg-slate-900/40 p-3">
                <div className="text-slate-400">Confidence</div>
                <div className="text-white font-semibold">{(Number(marketSpikeRun.meta.confidence_score ?? 0) * 100).toFixed(0)}%</div>
              </div>
              <div className="rounded-lg border border-amber-500/20 bg-slate-900/40 p-3">
                <div className="text-slate-400">Evaluation</div>
                <div className="text-cyan-100">
                  {marketSpikeRun.meta.evaluation_summary
                    ? `AUC ${(marketSpikeRun.meta.evaluation_summary.auc ?? 0).toFixed(2)} · P ${(marketSpikeRun.meta.evaluation_summary.precision ?? 0).toFixed(2)} · R ${(marketSpikeRun.meta.evaluation_summary.recall ?? 0).toFixed(2)}`
                    : 'Backtest against historical Alberta pool-price spikes before using as an operational trigger.'}
                </div>
              </div>
            </div>
            <p className="mt-3 text-xs text-amber-200">
              Training profile: {marketSpikeRun.meta.training_data_profile ?? 'unknown'} · claim {marketSpikeRun.meta.claim_label ?? 'estimated'} · calibration {marketSpikeRun.meta.calibration_status ?? 'uncalibrated'}
            </p>
          </div>
        )}

        {gasBasisRun?.analysis && (
          <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-5 mb-8">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-white font-semibold mb-1">AECO vs Henry Hub Basis Benchmark</h2>
                <p className="text-sm text-slate-300">
                  Alberta-focused gas-basis screen sourced from the existing `gas_basis_series` corpus when rows are available.
                </p>
              </div>
              <p className="text-xs text-emerald-200">
                {gasBasisRun.meta.model_version} · widening risk {(Number(gasBasisRun.analysis.wideningRisk ?? 0) * 100).toFixed(0)}%
              </p>
            </div>
            <div className="mt-4 grid md:grid-cols-4 gap-3 text-sm">
              <div className="rounded-lg border border-emerald-500/20 bg-slate-900/40 p-3">
                <div className="text-slate-400">Predicted spread</div>
                <div className="text-white font-semibold">{Number(gasBasisRun.analysis.predictedSpreadCadPerGj ?? 0).toFixed(3)} CAD/GJ</div>
              </div>
              <div className="rounded-lg border border-emerald-500/20 bg-slate-900/40 p-3">
                <div className="text-slate-400">Dominant drivers</div>
                <div className="text-white font-semibold">{(gasBasisRun.analysis.drivers ?? []).join(', ') || 'n/a'}</div>
              </div>
              <div className="rounded-lg border border-emerald-500/20 bg-slate-900/40 p-3">
                <div className="text-slate-400">Backtest</div>
                <div className="text-emerald-100">
                  {gasBasisRun.meta.evaluation_summary
                    ? `MAE ${(gasBasisRun.meta.evaluation_summary.mae ?? 0).toFixed(3)} · RMSE ${(gasBasisRun.meta.evaluation_summary.rmse ?? 0).toFixed(3)}`
                    : 'Backtest summary unavailable'}
                </div>
              </div>
              <div className="rounded-lg border border-emerald-500/20 bg-slate-900/40 p-3">
                <div className="text-slate-400">Directional accuracy</div>
                <div className="text-white font-semibold">
                  {gasBasisRun.meta.evaluation_summary?.directional_accuracy != null
                    ? `${(gasBasisRun.meta.evaluation_summary.directional_accuracy * 100).toFixed(0)}%`
                    : 'n/a'}
                </div>
              </div>
            </div>
            <p className="mt-3 text-xs text-emerald-200">
              Training profile: {gasBasisRun.meta.training_data_profile ?? 'unknown'} · claim {gasBasisRun.meta.claim_label ?? 'estimated'} · calibration {gasBasisRun.meta.calibration_status ?? 'uncalibrated'}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              This benchmark remains Alberta-focused even when another province is selected above because AECO-C vs Henry Hub is the governing gas-basis spread used in the source corpus.
            </p>
          </div>
        )}

        {/* Use Cases */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <Activity className="h-6 w-6 text-emerald-400 mb-3" />
            <h3 className="text-white font-semibold mb-2">For Consulting Firms</h3>
            <p className="text-slate-400 text-sm mb-3">
              Evaluate forecast models for client engagements. Export accuracy metrics 
              for reports and regulatory filings.
            </p>
            <Link
              to="/api-docs"
              className="text-emerald-400 text-sm hover:text-emerald-300 flex items-center gap-1"
            >
              Access via API <ExternalLink className="h-3 w-3" />
            </Link>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <TrendingUp className="h-6 w-6 text-cyan-400 mb-3" />
            <h3 className="text-white font-semibold mb-2">For Grid Operators</h3>
            <p className="text-slate-400 text-sm mb-3">
              Benchmark renewable output forecasts against baselines. 
              Track accuracy improvement over time for regulatory compliance.
            </p>
            <Link
              to="/grid"
              className="text-cyan-400 text-sm hover:text-cyan-300 flex items-center gap-1"
            >
              Grid Dashboard <ExternalLink className="h-3 w-3" />
            </Link>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <Download className="h-6 w-6 text-purple-400 mb-3" />
            <h3 className="text-white font-semibold mb-2">For Municipal Planners</h3>
            <p className="text-slate-400 text-sm mb-3">
              Understand forecast reliability for Community Energy Plans. 
              Support OEB DSP filings with accuracy evidence.
            </p>
            <Link
              to="/municipal"
              className="text-purple-400 text-sm hover:text-purple-300 flex items-center gap-1"
            >
              Municipal Tools <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Methodology */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">Methodology</h2>
          <div className="grid md:grid-cols-2 gap-6 text-sm text-slate-300">
            <div>
              <h3 className="text-white font-medium mb-2">Error Metrics</h3>
              <ul className="space-y-2">
                <li><span className="text-indigo-400 font-medium">MAE</span> — Mean Absolute Error. Average magnitude of forecast errors in physical units (MW).</li>
                <li><span className="text-indigo-400 font-medium">MAPE</span> — Mean Absolute Percentage Error. Scale-independent accuracy measure.</li>
                <li><span className="text-indigo-400 font-medium">RMSE</span> — Root Mean Square Error. Penalizes large errors more heavily than MAE.</li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-medium mb-2">Baseline Models</h3>
              <ul className="space-y-2">
                <li><span className="text-indigo-400 font-medium">Persistence</span> — Uses the most recent observation as the forecast. Horizon-adjusted.</li>
                <li><span className="text-indigo-400 font-medium">Seasonal Naive</span> — Uses same hour from the previous week (168-hour period).</li>
                <li><span className="text-indigo-400 font-medium">Skill Score</span> — 1 - (Model MAE / Baseline MAE). Positive = model outperforms baseline.</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-700">
            <p className="text-xs text-slate-500">
              Baselines computed using forecastBaselines.ts library. Calibration cross-referenced with 
              Environment Canada Climate Data (ECCC). Industry-standard methodology per IEC 61400-12 (wind) 
              and IEC 61724 (solar).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForecastBenchmarkingPage;
