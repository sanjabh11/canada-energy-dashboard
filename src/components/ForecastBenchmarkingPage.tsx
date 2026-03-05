import React, { useMemo, useState } from 'react';
import { BarChart3, Download, TrendingUp, Wind, Sun, Activity, Info, ExternalLink, FileText } from 'lucide-react';
import { SEOHead } from './SEOHead';
import { ForecastAccuracyPanel } from './ForecastAccuracyPanel';
import { DataFreshnessBadge } from './DataFreshnessBadge';
import { DATA_SNAPSHOT_DATE, DATA_SNAPSHOT_LABEL } from '../lib/aesoService';
import { Link } from 'react-router-dom';
import { assertExportAllowed } from '../lib/dataConfidence';
import { ExportBlockedModal } from './ExportBlockedModal';
import { trackEvent } from '../lib/analytics';
import { createExportJob, waitForExportJob, ExportJobError } from '../lib/exportJobsClient';

const ForecastBenchmarkingPage: React.FC = () => {
  const [resourceType, setResourceType] = useState<'solar' | 'wind'>('solar');
  const [province, setProvince] = useState('ON');
  const [showBlockedModal, setShowBlockedModal] = useState(false);
  const [blockedReason, setBlockedReason] = useState<string | undefined>();
  const [officialJobStatus, setOfficialJobStatus] = useState<string | null>(null);
  const [lastOfficialUrl, setLastOfficialUrl] = useState<string | null>(null);
  const [isQueueingOfficial, setIsQueueingOfficial] = useState(false);

  const provinces = [
    { value: 'ON', label: 'Ontario' },
    { value: 'AB', label: 'Alberta' },
    { value: 'BC', label: 'British Columbia' },
    { value: 'QC', label: 'Quebec' },
  ];

  const exportGate = useMemo(
    () =>
      assertExportAllowed(
        [
          {
            source: 'forecast_dataset',
            lastUpdated: DATA_SNAPSHOT_DATE,
            dataConfidence: 'cached',
            dataSource: 'cached',
            label: DATA_SNAPSHOT_LABEL,
          },
          {
            source: 'aeso_pool',
            lastUpdated: DATA_SNAPSHOT_DATE,
            dataConfidence: 'cached',
            dataSource: 'cached',
            label: DATA_SNAPSHOT_LABEL,
          },
        ],
        'medium'
      ),
    []
  );
  const canOfficialExport = exportGate.allowed;
  const canForceOfficialExport = import.meta.env.VITE_ALLOW_LOW_CONFIDENCE_EXPORTS === 'true';

  const downloadCsv = (official: boolean) => {
    if (official && !canOfficialExport && !canForceOfficialExport) {
      setBlockedReason(exportGate.reason);
      setShowBlockedModal(true);
      trackEvent('export_blocked_low_confidence', {
        surface: 'forecast_benchmarking',
        cta: 'official_csv',
        confidence: exportGate.confidence,
        reason: exportGate.reason ?? 'low confidence',
      });
      return;
    }

    const csvLines = [
      'report_type,resource_type,province,data_confidence,data_snapshot_date,generated_at',
      `${official ? 'official' : 'draft'},${resourceType},${province},${exportGate.confidence},${DATA_SNAPSHOT_DATE},${new Date().toISOString()}`,
      'note,interactive charts remain available even when official exports are blocked',
    ];
    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${official ? 'official' : 'draft'}-forecast-benchmark-${resourceType}-${province}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    trackEvent('export_job_created', {
      surface: 'forecast_benchmarking',
      type: official ? 'official_csv' : 'draft_csv',
      confidence: exportGate.confidence,
    });
  };

  const downloadPdf = async (official: boolean) => {
    if (official && !canOfficialExport && !canForceOfficialExport) {
      setBlockedReason(exportGate.reason);
      setShowBlockedModal(true);
      trackEvent('export_blocked_low_confidence', {
        surface: 'forecast_benchmarking',
        cta: 'official_pdf',
        confidence: exportGate.confidence,
        reason: exportGate.reason ?? 'low confidence',
      });
      return;
    }

    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Forecast Benchmarking Report', 14, 18);
    doc.setFontSize(11);
    doc.text(`Mode: ${official ? 'Official' : 'Draft (with caveat)'}`, 14, 28);
    doc.text(`Resource: ${resourceType.toUpperCase()} | Province: ${province}`, 14, 36);
    doc.text(`Data confidence: ${exportGate.confidence}`, 14, 44);
    doc.text(`Data snapshot: ${DATA_SNAPSHOT_LABEL} (${DATA_SNAPSHOT_DATE})`, 14, 52);
    if (!official) {
      doc.text('Draft only: data may be stale and should not be used as official filing evidence.', 14, 62);
    }
    doc.text(`Generated: ${new Date().toISOString()}`, 14, 72);
    doc.save(`${official ? 'official' : 'draft'}-forecast-benchmark-${resourceType}-${province}.pdf`);
    trackEvent('export_job_created', {
      surface: 'forecast_benchmarking',
      type: official ? 'official_pdf' : 'draft_pdf',
      confidence: exportGate.confidence,
    });
  };

  const queueOfficialExport = async (
    format: 'csv' | 'pdf',
    forceOfficial = false
  ) => {
    if (!canOfficialExport && !canForceOfficialExport && !forceOfficial) {
      setBlockedReason(exportGate.reason);
      setShowBlockedModal(true);
      return;
    }

    setIsQueueingOfficial(true);
    try {
      setOfficialJobStatus('queued');
      const createResult = await createExportJob({
        template: 'forecast_benchmarking',
        request_source: 'forecast_benchmarking',
        request_context: {
          resource_type: resourceType,
          province,
          requested_format: format,
          input_updated_at: new Date().toISOString(),
          submitted_at: new Date().toISOString(),
          client_generated_at: new Date().toISOString(),
          data_snapshot_date: DATA_SNAPSHOT_DATE,
          data_snapshot_label: DATA_SNAPSHOT_LABEL,
          fpic_required: false,
        },
        force_export: forceOfficial || (!canOfficialExport && canForceOfficialExport),
        sources: ['forecast_dataset', 'aeso_pool'],
      });

      const finalJob = await waitForExportJob(createResult.jobId, {
        onUpdate: (job) => setOfficialJobStatus(job.status),
      });

      if (finalJob.status === 'success' && finalJob.outputSignedUrl) {
        setLastOfficialUrl(finalJob.outputSignedUrl);
        setOfficialJobStatus('success');
        window.open(finalJob.outputSignedUrl, '_blank', 'noopener,noreferrer');
        trackEvent('export_job_created', {
          surface: 'forecast_benchmarking',
          type: `official_${format}`,
          confidence: exportGate.confidence,
        });
        return;
      }

      if (finalJob.status === 'blocked_stale') {
        setBlockedReason(finalJob.reason || exportGate.reason);
        setShowBlockedModal(true);
        return;
      }

      alert('Official export did not complete. Please retry.');
    } catch (error) {
      if (error instanceof ExportJobError) {
        if (error.status === 409) {
          setBlockedReason(error.payload.reason || exportGate.reason);
          setShowBlockedModal(true);
          return;
        }
        if (error.status === 403) {
          window.location.href = '/enterprise?intent=official-export-access&surface=forecast-benchmarking';
          return;
        }
        alert(error.payload.reason || error.message);
        return;
      }
      alert('Failed to queue official export.');
    } finally {
      setIsQueueingOfficial(false);
    }
  };

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
            />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto py-8 px-6">
        {!canOfficialExport ? (
          <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
            <div className="text-sm font-semibold text-amber-200">
              Official exports are currently gated by data confidence
            </div>
            <div className="mt-1 text-xs text-amber-300">
              {exportGate.reason} Interactive benchmarking remains available.
            </div>
          </div>
        ) : null}

        <div className="mb-6 grid gap-3 md:grid-cols-4">
          <button
            onClick={() => { void queueOfficialExport('csv'); }}
            disabled={isQueueingOfficial}
            className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
              canOfficialExport
                ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <Download className="h-4 w-4" />
            Official CSV
          </button>
          <button
            onClick={() => { void queueOfficialExport('pdf'); }}
            disabled={isQueueingOfficial}
            className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
              canOfficialExport
                ? 'bg-cyan-600 text-white hover:bg-cyan-500'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <FileText className="h-4 w-4" />
            Official PDF
          </button>
          <button
            onClick={() => downloadCsv(false)}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-700"
          >
            <Download className="h-4 w-4" />
            Draft CSV
          </button>
          <button
            onClick={() => downloadPdf(false)}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-700"
          >
            <FileText className="h-4 w-4" />
            Draft PDF
          </button>
        </div>
        {officialJobStatus ? (
          <div className="mb-6 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-xs text-slate-300">
            Official export status: <span className="font-semibold text-white">{officialJobStatus}</span>
            {lastOfficialUrl ? (
              <a
                href={lastOfficialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-cyan-300 underline"
              >
                Latest
              </a>
            ) : null}
          </div>
        ) : null}

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
      <ExportBlockedModal
        isOpen={showBlockedModal}
        title="Official Forecast Export Blocked"
        reason={blockedReason || exportGate.reason}
        onClose={() => {
          setShowBlockedModal(false);
          setBlockedReason(undefined);
        }}
        onRequestRefresh={() => {
          setShowBlockedModal(false);
          setBlockedReason(undefined);
          trackEvent('refresh_request', { surface: 'forecast_benchmarking' });
          window.location.href = '/enterprise?intent=data-refresh&surface=forecast-benchmarking';
        }}
        onDownloadDraft={() => {
          setShowBlockedModal(false);
          downloadCsv(false);
        }}
        canForceExport={canForceOfficialExport}
        onForceExport={() => {
          setShowBlockedModal(false);
          setBlockedReason(undefined);
          void queueOfficialExport('csv', true);
        }}
      />
    </div>
  );
};

export default ForecastBenchmarkingPage;
