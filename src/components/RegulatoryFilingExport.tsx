import React, { useState, useMemo, useCallback } from 'react';
import {
  FileText, Download, Shield, Building2, MapPin,
  ChevronRight, CheckCircle2, Info, ExternalLink,
  Table, AlertTriangle, Landmark, Scale,
} from 'lucide-react';
import { SEOHead } from './SEOHead';
import { Link } from 'react-router-dom';
import { DATA_SNAPSHOT_DATE, DATA_SNAPSHOT_LABEL } from '../lib/aesoService';
import { assertExportAllowed } from '../lib/dataConfidence';
import { ExportBlockedModal } from './ExportBlockedModal';
import { trackEvent } from '../lib/analytics';
import { createExportJob, waitForExportJob, ExportJobError } from '../lib/exportJobsClient';
import {
  REGULATORY_TEMPLATES,
  templateToCSV,
  generateSampleRule005_4_2,
  generateSampleRule005_10,
  generateSampleOEB_AssetCondition,
  generateSampleOEB_LoadForecast,
  generateSampleOEB_Reliability,
  type TemplateType,
  type TemplateDefinition,
} from '../lib/regulatoryTemplates';

// ============================================================================
// TYPES
// ============================================================================

type Jurisdiction = 'all' | 'Alberta' | 'Ontario';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const RegulatoryFilingExport: React.FC = () => {
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType | null>(null);
  const [previewData, setPreviewData] = useState<Record<string, unknown>[] | null>(null);
  const [showBlockedModal, setShowBlockedModal] = useState(false);
  const [blockedReason, setBlockedReason] = useState<string | undefined>();
  const [officialJobStatus, setOfficialJobStatus] = useState<string | null>(null);
  const [lastOfficialUrl, setLastOfficialUrl] = useState<string | null>(null);
  const [isOfficialExporting, setIsOfficialExporting] = useState(false);
  const canForceOfficialExport = import.meta.env.DEV || import.meta.env.VITE_ALLOW_LOW_CONFIDENCE_EXPORTS === 'true';

  const templates = useMemo(() => {
    const all = Object.values(REGULATORY_TEMPLATES);
    if (jurisdiction === 'all') return all;
    return all.filter(t => t.jurisdiction === jurisdiction);
  }, [jurisdiction]);

  const exportGate = useMemo(
    () =>
      assertExportAllowed(
        [
          {
            source: 'compliance_pack',
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
          {
            source: 'tier_inputs',
            lastUpdated: DATA_SNAPSHOT_DATE,
            label: DATA_SNAPSHOT_LABEL,
          },
        ],
        'medium'
      ),
    []
  );

  const handleSelectTemplate = useCallback((id: TemplateType) => {
    setSelectedTemplate(id);
    // Load sample data for preview
    const sampleData = getSampleData(id);
    setPreviewData(sampleData);
  }, []);

  const handleExportCSV = useCallback((template: TemplateDefinition, data: Record<string, unknown>[]) => {
    const csv = templateToCSV(template, data);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.id}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    trackEvent('export_job_created', {
      surface: 'regulatory_filing_export',
      template: template.id,
      mode: 'draft',
      confidence: exportGate.confidence,
    });
  }, [exportGate]);

  const handleOfficialExport = useCallback(async (
    template: TemplateDefinition,
    data: Record<string, unknown>[],
    forceOfficial = false
  ) => {
    if (!exportGate.allowed && !canForceOfficialExport && !forceOfficial) {
      setBlockedReason(exportGate.reason);
      setShowBlockedModal(true);
      trackEvent('export_blocked_low_confidence', {
        surface: 'regulatory_filing_export',
        template: template.id,
        confidence: exportGate.confidence,
        reason: exportGate.reason ?? 'low confidence',
      });
      return;
    }

    setIsOfficialExporting(true);
    try {
      setOfficialJobStatus('queued');
      const createResult = await createExportJob({
        template: 'regulatory_filing',
        request_source: 'regulatory_filing_export',
        request_context: {
          filing_template: template.id,
          jurisdiction: template.jurisdiction,
          regulation: template.regulation,
          preview_rows: data.length,
          input_updated_at: new Date().toISOString(),
          submitted_at: new Date().toISOString(),
          client_generated_at: new Date().toISOString(),
          data_snapshot_date: DATA_SNAPSHOT_DATE,
          data_snapshot_label: DATA_SNAPSHOT_LABEL,
          fpic_required: false,
        },
        force_export: forceOfficial || (!exportGate.allowed && canForceOfficialExport),
        sources: ['aeso_pool', 'tier_inputs', 'compliance_pack'],
      });

      const finalJob = await waitForExportJob(createResult.jobId, {
        onUpdate: (job) => setOfficialJobStatus(job.status),
      });

      if (finalJob.status === 'success' && finalJob.outputSignedUrl) {
        setLastOfficialUrl(finalJob.outputSignedUrl);
        setOfficialJobStatus('success');
        window.open(finalJob.outputSignedUrl, '_blank', 'noopener,noreferrer');
        trackEvent('export_job_created', {
          surface: 'regulatory_filing_export',
          template: template.id,
          mode: 'official',
          confidence: exportGate.confidence,
        });
        return;
      }

      if (finalJob.status === 'blocked_stale') {
        setBlockedReason(finalJob.reason || exportGate.reason);
        setShowBlockedModal(true);
        return;
      }

      alert('Official filing export did not complete. Please retry.');
    } catch (error) {
      if (error instanceof ExportJobError) {
        if (error.status === 409) {
          setBlockedReason(error.payload.reason || exportGate.reason);
          setShowBlockedModal(true);
          return;
        }
        if (error.status === 403) {
          window.location.href = '/enterprise?intent=official-export-access&surface=regulatory-filing';
          return;
        }
        alert(error.payload.reason || error.message);
        return;
      }
      alert('Failed to queue official filing export.');
    } finally {
      setIsOfficialExporting(false);
    }
  }, [canForceOfficialExport, exportGate]);

  const activeTemplate = selectedTemplate ? REGULATORY_TEMPLATES[selectedTemplate] : null;

  return (
    <div className="min-h-screen bg-slate-900">
      <SEOHead
        title="Regulatory Filing Templates | AUC Rule 005 & OEB Chapter 5 Export"
        description="Export-ready regulatory filing templates for Alberta (AUC Rule 005) and Ontario (OEB Chapter 5 DSP). Capital additions, income statements, asset condition, load forecasts, and reliability metrics."
        path="/regulatory-filing"
        keywords={['AUC Rule 005', 'OEB Chapter 5', 'regulatory filing template', 'utility compliance', 'distribution system plan', 'annual information return']}
      />

      {/* Hero */}
      <div className="bg-gradient-to-r from-amber-700 via-orange-700 to-red-800 py-10 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 rounded-xl">
                <Scale className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">
                  Regulatory Filing Templates
                </h1>
                <p className="text-amber-100 text-sm md:text-base">
                  AUC Rule 005 (Alberta) & OEB Chapter 5 DSP (Ontario) export-ready formats
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full font-medium">
                7 Templates
              </span>
              <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full font-medium">
                2 Jurisdictions
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-6 px-6">
        {!exportGate.allowed ? (
          <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
            <div className="text-sm font-semibold text-amber-200">
              Official filing exports are confidence-gated
            </div>
            <div className="mt-1 text-xs text-amber-300">
              {exportGate.reason} You can continue previewing templates while source feeds refresh.
            </div>
          </div>
        ) : null}

        {/* Value Prop */}
        <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl p-5 mb-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-white mb-2">Why Regulatory Templates?</h3>
              <p className="text-slate-300 text-sm mb-3">
                Alberta REAs and Ontario small LDCs spend <strong>40-80 hours annually</strong> preparing regulatory filings manually.
                These templates pre-format your data into the exact schedule/section structure required by the AUC and OEB,
                reducing filing preparation to hours instead of weeks.
              </p>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="h-4 w-4 text-blue-400" />
                    <span className="text-blue-400 font-medium">Alberta — AUC Rule 005</span>
                  </div>
                  <p className="text-slate-400">
                    Annual Information Return. Schedules 4.2, 10, 17, 22 covering capital, income, rate base, and O&M.
                    Required for all distribution utilities.
                  </p>
                </div>
                <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="h-4 w-4 text-emerald-400" />
                    <span className="text-emerald-400 font-medium">Ontario — OEB Chapter 5 DSP</span>
                  </div>
                  <p className="text-slate-400">
                    Distribution System Plan. Sections 5.2-5.4 covering asset condition, load forecasting, and reliability.
                    Required for rate applications.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Jurisdiction Filter */}
        <div className="flex items-center gap-3 mb-6">
          <Shield className="h-4 w-4 text-slate-400" />
          <span className="text-sm text-slate-300">Filter by jurisdiction:</span>
          <div className="flex bg-slate-800 rounded-lg p-1">
            {(['all', 'Alberta', 'Ontario'] as Jurisdiction[]).map(j => (
              <button
                key={j}
                onClick={() => setJurisdiction(j)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  jurisdiction === j
                    ? 'bg-amber-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {j === 'all' ? 'All' : j}
              </button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Template List */}
          <div className="space-y-3">
            <h2 className="text-white font-semibold text-sm uppercase tracking-wider mb-2">
              Available Templates ({templates.length})
            </h2>
            {templates.map(template => (
              <button
                key={template.id}
                onClick={() => handleSelectTemplate(template.id)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  selectedTemplate === template.id
                    ? 'bg-amber-900/30 border-amber-500/50'
                    : 'bg-slate-800 border-slate-700 hover:border-slate-500'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        template.jurisdiction === 'Alberta'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {template.jurisdiction}
                      </span>
                    </div>
                    <h3 className="text-white text-sm font-medium">{template.name}</h3>
                    <p className="text-slate-500 text-xs mt-1">{template.regulation}</p>
                  </div>
                  <ChevronRight className={`h-4 w-4 flex-shrink-0 mt-1 transition-colors ${
                    selectedTemplate === template.id ? 'text-amber-400' : 'text-slate-600'
                  }`} />
                </div>
              </button>
            ))}
          </div>

          {/* Template Detail + Preview */}
          <div className="md:col-span-2">
            {activeTemplate && previewData ? (
              <TemplateDetail
                template={activeTemplate}
                data={previewData}
                onExportOfficial={() => { void handleOfficialExport(activeTemplate, previewData); }}
                onExportDraft={() => handleExportCSV(activeTemplate, previewData)}
                officialExportDisabled={isOfficialExporting}
                officialJobStatus={officialJobStatus}
                latestOfficialUrl={lastOfficialUrl}
              />
            ) : (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 flex flex-col items-center justify-center text-center">
                <FileText className="h-12 w-12 text-slate-600 mb-4" />
                <h3 className="text-white font-medium mb-2">Select a Template</h3>
                <p className="text-slate-500 text-sm max-w-md">
                  Choose a regulatory filing template from the left panel to preview its structure,
                  see sample data, and export to CSV format.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Cross-links */}
        <div className="mt-8 grid md:grid-cols-3 gap-4">
          <Link
            to="/demand-forecast"
            className="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-amber-500/50 transition-colors group"
          >
            <Landmark className="h-5 w-5 text-emerald-400 mb-2" />
            <h4 className="text-white font-medium text-sm group-hover:text-amber-400">Demand Forecasting</h4>
            <p className="text-slate-500 text-xs mt-1">ML load forecasts for OEB Section 5.3 filings</p>
          </Link>
          <Link
            to="/asset-health"
            className="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-amber-500/50 transition-colors group"
          >
            <Building2 className="h-5 w-5 text-cyan-400 mb-2" />
            <h4 className="text-white font-medium text-sm group-hover:text-amber-400">Asset Health Index</h4>
            <p className="text-slate-500 text-xs mt-1">CSV-based scoring for Section 5.2 asset condition</p>
          </Link>
          <Link
            to="/forecast-benchmarking"
            className="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-amber-500/50 transition-colors group"
          >
            <Table className="h-5 w-5 text-purple-400 mb-2" />
            <h4 className="text-white font-medium text-sm group-hover:text-amber-400">Forecast Benchmarking</h4>
            <p className="text-slate-500 text-xs mt-1">Accuracy evidence for regulatory submissions</p>
          </Link>
        </div>
      </div>
      <ExportBlockedModal
        isOpen={showBlockedModal}
        title="Official Compliance Export Blocked"
        reason={blockedReason || exportGate.reason}
        onClose={() => {
          setShowBlockedModal(false);
          setBlockedReason(undefined);
        }}
        onRequestRefresh={() => {
          setShowBlockedModal(false);
          setBlockedReason(undefined);
          trackEvent('refresh_request', { surface: 'regulatory_filing_export' });
          window.location.href = '/enterprise?intent=data-refresh&surface=regulatory-filing';
        }}
        onDownloadDraft={() => {
          if (activeTemplate && previewData) {
            handleExportCSV(activeTemplate, previewData);
          }
          setShowBlockedModal(false);
          setBlockedReason(undefined);
        }}
        canForceExport={canForceOfficialExport}
        onForceExport={() => {
          if (activeTemplate && previewData) {
            void handleOfficialExport(activeTemplate, previewData, true);
          }
          setShowBlockedModal(false);
          setBlockedReason(undefined);
        }}
      />
    </div>
  );
};

// ============================================================================
// TEMPLATE DETAIL COMPONENT
// ============================================================================

function TemplateDetail({ template, data, onExportOfficial, onExportDraft, officialExportDisabled, officialJobStatus, latestOfficialUrl }: {
  template: TemplateDefinition;
  data: Record<string, unknown>[];
  onExportOfficial: () => void;
  onExportDraft: () => void;
  officialExportDisabled: boolean;
  officialJobStatus: string | null;
  latestOfficialUrl: string | null;
}) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                template.jurisdiction === 'Alberta'
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'bg-emerald-500/20 text-emerald-400'
              }`}>
                {template.jurisdiction}
              </span>
              <span className="text-xs text-slate-500">{template.regulation}</span>
            </div>
            <h2 className="text-white text-xl font-bold">{template.name}</h2>
            <p className="text-slate-400 text-sm mt-1">{template.description}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <button
              onClick={onExportOfficial}
              disabled={officialExportDisabled}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors flex-shrink-0"
            >
              <Download className="h-4 w-4" />
              Official Export
            </button>
            <button
              onClick={onExportDraft}
              className="text-xs text-slate-300 underline underline-offset-2 hover:text-white"
            >
              Download Draft CSV
            </button>
            {officialJobStatus ? (
              <div className="text-[11px] text-slate-400">
                Job: <span className="text-white">{officialJobStatus}</span>
                {latestOfficialUrl ? (
                  <a
                    href={latestOfficialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-cyan-300 underline"
                  >
                    Latest
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        {/* Column definitions */}
        <div className="mt-4 pt-4 border-t border-slate-700">
          <h4 className="text-slate-300 text-xs font-medium uppercase tracking-wider mb-2">
            Columns ({template.columns.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {template.columns.map(col => (
              <span
                key={col.key}
                className="inline-flex items-center gap-1 text-xs bg-slate-700/50 text-slate-300 px-2 py-1 rounded"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${
                  col.type === 'number' ? 'bg-cyan-400' :
                  col.type === 'percent' ? 'bg-amber-400' :
                  col.type === 'date' ? 'bg-purple-400' : 'bg-slate-400'
                }`} />
                {col.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Data Preview */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-700 flex items-center justify-between">
          <h3 className="text-white font-semibold text-sm flex items-center gap-2">
            <Table className="h-4 w-4 text-slate-400" />
            Sample Data Preview ({data.length} rows)
          </h3>
          <span className="text-xs text-amber-400 bg-amber-400/10 px-2 py-1 rounded">
            Sample — Replace with your data
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-700/30">
              <tr>
                {template.columns.slice(0, 7).map(col => (
                  <th key={col.key} className="text-left text-slate-400 px-3 py-2 font-medium whitespace-nowrap">
                    {col.label}
                  </th>
                ))}
                {template.columns.length > 7 && (
                  <th className="text-left text-slate-500 px-3 py-2 font-medium">+{template.columns.length - 7} more</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {data.slice(0, 8).map((row, i) => (
                <tr key={i} className="hover:bg-slate-700/20">
                  {template.columns.slice(0, 7).map(col => (
                    <td key={col.key} className="px-3 py-2 text-slate-300 whitespace-nowrap">
                      {formatCellValue(row[col.key], col.type)}
                    </td>
                  ))}
                  {template.columns.length > 7 && (
                    <td className="px-3 py-2 text-slate-500">...</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          Regulatory Notes
        </h3>
        <ul className="space-y-2">
          {template.notes.map((note, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
              <CheckCircle2 className="h-3.5 w-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
              {note}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ============================================================================
// UTILITIES
// ============================================================================

function getSampleData(templateId: TemplateType): Record<string, unknown>[] {
  switch (templateId) {
    case 'rule005_schedule_4_2':
      return generateSampleRule005_4_2() as unknown as Record<string, unknown>[];
    case 'rule005_schedule_10':
      return generateSampleRule005_10() as unknown as Record<string, unknown>[];
    case 'rule005_schedule_17':
      // Generate from 4.2 data — rate base is derived
      return generateSampleRule005_4_2().map(row => ({
        rate_base_component: row.asset_category,
        opening_balance_cad: row.net_book_value_cad,
        additions_cad: row.additions_current_year_cad,
        retirements_cad: row.retirements_current_year_cad,
        depreciation_cad: row.original_cost_cad * (row.depreciation_rate_pct / 100),
        closing_balance_cad: row.net_book_value_cad + row.additions_current_year_cad - row.retirements_current_year_cad - (row.original_cost_cad * (row.depreciation_rate_pct / 100)),
        mid_year_value_cad: (row.net_book_value_cad + row.net_book_value_cad + row.additions_current_year_cad - row.retirements_current_year_cad - (row.original_cost_cad * (row.depreciation_rate_pct / 100))) / 2,
      })) as unknown as Record<string, unknown>[];
    case 'rule005_schedule_22':
      // Generate O&M from income statement
      return [
        { expense_category: 'Vegetation Management', account_number: '571', current_year_cad: 680000, prior_year_cad: 620000, budget_cad: 650000, variance_to_budget_cad: 30000, fte_count: 3, notes: 'Enhanced program' },
        { expense_category: 'Line Maintenance', account_number: '572', current_year_cad: 520000, prior_year_cad: 490000, budget_cad: 510000, variance_to_budget_cad: 10000, fte_count: 5, notes: '' },
        { expense_category: 'Station Maintenance', account_number: '573', current_year_cad: 380000, prior_year_cad: 350000, budget_cad: 370000, variance_to_budget_cad: 10000, fte_count: 2, notes: '' },
        { expense_category: 'Meter Reading & Services', account_number: '586', current_year_cad: 210000, prior_year_cad: 200000, budget_cad: 215000, variance_to_budget_cad: -5000, fte_count: 2, notes: '' },
        { expense_category: 'Customer Service', account_number: '901', current_year_cad: 420000, prior_year_cad: 395000, budget_cad: 410000, variance_to_budget_cad: 10000, fte_count: 4, notes: '' },
        { expense_category: 'Administrative & General', account_number: '920', current_year_cad: 890000, prior_year_cad: 850000, budget_cad: 875000, variance_to_budget_cad: 15000, fte_count: 6, notes: '' },
        { expense_category: 'Fleet & Vehicles', account_number: '935', current_year_cad: 180000, prior_year_cad: 165000, budget_cad: 175000, variance_to_budget_cad: 5000, fte_count: 1, notes: '' },
        { expense_category: 'IT & Telecommunications', account_number: '940', current_year_cad: 320000, prior_year_cad: 290000, budget_cad: 310000, variance_to_budget_cad: 10000, fte_count: 2, notes: 'Cybersecurity upgrade' },
      ] as unknown as Record<string, unknown>[];
    case 'oeb_dsp_asset_condition':
      return generateSampleOEB_AssetCondition() as unknown as Record<string, unknown>[];
    case 'oeb_dsp_load_forecast':
      return generateSampleOEB_LoadForecast() as unknown as Record<string, unknown>[];
    case 'oeb_dsp_reliability':
      return generateSampleOEB_Reliability() as unknown as Record<string, unknown>[];
    default:
      return [];
  }
}

function formatCellValue(value: unknown, type: string): string {
  if (value === null || value === undefined) return '—';
  if (type === 'number' && typeof value === 'number') {
    return value >= 1000 ? value.toLocaleString('en-CA', { maximumFractionDigits: 0 }) : String(value);
  }
  if (type === 'percent' && typeof value === 'number') {
    return `${value}%`;
  }
  return String(value);
}

export default RegulatoryFilingExport;
