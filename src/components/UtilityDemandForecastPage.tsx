import React, { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from 'recharts';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Building2,
  Calendar,
  CheckCircle2,
  Link2,
  Download,
  FileText,
  Info,
  Map,
  Radio,
  Shield,
  TrendingUp,
  Upload,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { SEOHead } from './SEOHead';
import { DataFreshnessBadge } from './DataFreshnessBadge';
import { ProvenanceBadge } from './ProvenanceBadge';
import { DataTrustNotice } from './DataTrustNotice';
import {
  buildUtilityForecastPackage,
  buildUtilityStarterCsv,
  generateUtilityLoadSampleRows,
  parseUtilityHistoricalLoadCsv,
  utilityForecastPackageToAlbertaCsv,
  utilityForecastPackageToCsv,
  type UtilityForecastPackage,
  type UtilityInputSourceKind,
  type UtilityInputGranularity,
  type UtilityJurisdiction,
  type UtilityPlanningScenario,
} from '../lib/utilityForecasting';
import { REGULATORY_TEMPLATES, templateToCSV } from '../lib/regulatoryTemplates';
import { getPublicAppUrl, getUtilityConnectorBaseUrl } from '../lib/config';
import {
  buildConnectionHealthCards,
  buildStarterUtilityBatchSnapshot,
  fetchUtilityPublicContext,
  isConnectorCardLiveConnected,
  normalizeUtilityBatchSnapshot,
  parseGreenButtonXml,
  type UtilityConnectionHealthCard,
  type UtilityConnectorAccount,
  type UtilityPublicContext,
} from '../lib/utilityLiveData';
import { buildOntarioUtilityOnboardingPacks, getOntarioFastFollowNote } from '../lib/utilityConnectorOnboarding';
import {
  buildOntarioSubmissionSprintBundle,
  renderDemoEvidenceMarkdown,
  renderSubmissionPacketMarkdown,
  type UtilitySubmissionPacket,
} from '../lib/utilitySubmissionReadiness';

function createDefaultScenario(jurisdiction: UtilityJurisdiction): UtilityPlanningScenario {
  const defaultGeographyId = jurisdiction === 'Ontario' ? 'ON-FEEDER-1' : 'AB-FEEDER-1';
  return {
    jurisdiction,
    planning_horizon_years: [1, 5, 10],
    weather_case: 'median',
    annual_load_growth_pct: jurisdiction === 'Ontario' ? 1.45 : 1.65,
    committed_load_mw: jurisdiction === 'Ontario' ? 4 : 6,
    ev_growth_mw: jurisdiction === 'Ontario' ? 3.5 : 2.5,
    heat_pump_growth_mw: jurisdiction === 'Ontario' ? 2.8 : 1.4,
    der_offset_mw: jurisdiction === 'Ontario' ? 1.6 : 2.1,
    demand_response_reduction_mw: jurisdiction === 'Ontario' ? 1.2 : 1.4,
    demand_response_shift_pct: jurisdiction === 'Ontario' ? 4 : 5,
    capacity_buffer_pct: 18,
    stress_test_mode: 'none',
    hosting_capacity_limit_mw: jurisdiction === 'Ontario' ? 3.5 : 4.2,
    large_point_loads: [{
      name: 'Committed large point-load',
      geography_id: defaultGeographyId,
      geography_level: 'feeder',
      mw: 0,
      load_factor_pct: 72,
    }],
    industrial_opt_outs: [{
      name: 'Industrial self-supply',
      geography_id: defaultGeographyId,
      geography_level: 'feeder',
      mw: 0,
    }],
    tou_shift_rules: [{
      name: 'Evening EV shift',
      from_hour_start: 17,
      from_hour_end: 21,
      to_hour_start: 0,
      to_hour_end: 5,
      shift_pct: 0,
    }],
  };
}

const UtilityDemandForecastPage: React.FC = () => {
  const [jurisdiction, setJurisdiction] = useState<UtilityJurisdiction>('Ontario');
  const [rows, setRows] = useState(() => generateUtilityLoadSampleRows('Ontario', 'hourly'));
  const [sourceLabel, setSourceLabel] = useState('Ontario starter utility load dataset');
  const [isSampleData, setIsSampleData] = useState(true);
  const [sourceKind, setSourceKind] = useState<UtilityInputSourceKind>('fallback_starter');
  const [sourceObservedAt, setSourceObservedAt] = useState<string | null>(() => generateUtilityLoadSampleRows('Ontario', 'hourly').at(-1)?.timestamp ?? null);
  const [isPersistedSource, setIsPersistedSource] = useState(false);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [draftScenario, setDraftScenario] = useState<UtilityPlanningScenario>(() => createDefaultScenario('Ontario'));
  const [activeScenario, setActiveScenario] = useState<UtilityPlanningScenario>(() => createDefaultScenario('Ontario'));
  const [selectedHorizon, setSelectedHorizon] = useState(5);
  const [publicContext, setPublicContext] = useState<UtilityPublicContext | null>(null);
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [connectorAccounts, setConnectorAccounts] = useState<UtilityConnectorAccount[]>([]);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingContext(true);
    fetchUtilityPublicContext(jurisdiction)
      .then((context) => {
        if (!cancelled) {
          setPublicContext(context);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPublicContext(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingContext(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [jurisdiction]);

  const forecastState = useMemo(() => {
    try {
      return {
        forecastPackage: buildUtilityForecastPackage({
          rows,
          scenario: activeScenario,
          sourceLabel,
          isSampleData,
          sourceKind,
          liveSurfaces: publicContext?.live_surfaces ?? [],
        }),
        error: null as string | null,
      };
    } catch (error) {
      return {
        forecastPackage: null as UtilityForecastPackage | null,
        error: error instanceof Error ? error.message : 'Failed to build utility forecast package.',
      };
    }
  }, [activeScenario, isSampleData, publicContext?.live_surfaces, rows, sourceKind, sourceLabel]);

  const chartData = useMemo(() => {
    if (!forecastState.forecastPackage) return [];
    return forecastState.forecastPackage.cases.expected.yearly.map((expectedYear) => ({
      year: `Y${expectedYear.year}`,
      low: forecastState.forecastPackage?.cases.low.yearly.find((row) => row.year === expectedYear.year)?.peak_demand_mw ?? 0,
      expected: expectedYear.peak_demand_mw,
      high: forecastState.forecastPackage?.cases.high.yearly.find((row) => row.year === expectedYear.year)?.peak_demand_mw ?? 0,
      energy: expectedYear.annual_energy_gwh,
    }));
  }, [forecastState.forecastPackage]);

  const highlightedRows = useMemo(() => {
    if (!forecastState.forecastPackage) return [];
    return forecastState.forecastPackage.highlighted_years.map((year) => ({
      year,
      low: forecastState.forecastPackage?.cases.low.yearly.find((row) => row.year === year),
      expected: forecastState.forecastPackage?.cases.expected.yearly.find((row) => row.year === year),
      high: forecastState.forecastPackage?.cases.high.yearly.find((row) => row.year === year),
    })).filter((row) => row.low && row.expected && row.high);
  }, [forecastState.forecastPackage]);

  const selectedAllocations = useMemo(() => {
    if (!forecastState.forecastPackage) return [];
    return forecastState.forecastPackage.geography_allocations
      .filter((allocation) => allocation.horizon_year === selectedHorizon)
      .sort((left, right) => right.peak_demand_mw - left.peak_demand_mw);
  }, [forecastState.forecastPackage, selectedHorizon]);

  const selectedProfilePreview = useMemo(() => {
    const profile = forecastState.forecastPackage?.profiles_8760.find((entry) =>
      entry.case_label === 'expected' && entry.horizon_year === selectedHorizon,
    );
    return (profile?.points ?? [])
      .filter((_, index) => index < 168 && index % 6 === 0)
      .map((point, index) => ({
        hour: `${index * 6}h`,
        forecast: point.forecast_mw,
        pointLoad: point.point_load_mw,
        derOffset: point.der_offset_mw,
      }));
  }, [forecastState.forecastPackage, selectedHorizon]);

  const selectedReliability = useMemo(() => (
    forecastState.forecastPackage?.reliability_proxy.horizon_scores.find((entry) => entry.horizon_year === selectedHorizon) ?? null
  ), [forecastState.forecastPackage, selectedHorizon]);

  const activeGranularity = forecastState.forecastPackage?.summary.granularity ?? 'hourly';
  const connectionCards = useMemo(() => buildConnectionHealthCards({
    jurisdiction,
    activeSourceKind: sourceKind,
    activeSourceLabel: sourceLabel,
    activeObservedAt: sourceObservedAt,
    activePersisted: isPersistedSource,
    connectorAccounts,
  }), [connectorAccounts, isPersistedSource, jurisdiction, sourceKind, sourceLabel, sourceObservedAt]);

  const isLiveConnected = useMemo(() => connectionCards.some((card) => isConnectorCardLiveConnected(card)), [connectionCards]);
  const ontarioOnboardingPacks = useMemo(
    () => buildOntarioUtilityOnboardingPacks({
      publicAppUrl: getPublicAppUrl(),
      utilityConnectorBaseUrl: getUtilityConnectorBaseUrl(),
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
    }),
    [],
  );
  const ontarioSubmissionBundle = useMemo(
    () => buildOntarioSubmissionSprintBundle({
      canonicalAppUrl: getPublicAppUrl(),
      bridgeBaseUrl: getUtilityConnectorBaseUrl(),
      currentOrigin: typeof window !== 'undefined' ? window.location.origin : null,
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
    }),
    [],
  );

  function getOntarioOnboardingPack(utilityName?: string) {
    return ontarioOnboardingPacks.find((pack) => pack.utility_name === utilityName) ?? ontarioOnboardingPacks[0]!;
  }

  function upsertConnectorAccount(nextAccount: UtilityConnectorAccount) {
    setConnectorAccounts((current) => {
      const index = current.findIndex((account) => account.connector_kind === nextAccount.connector_kind);
      if (index === -1) return [...current, nextAccount];
      return current.map((account, accountIndex) => (accountIndex === index ? nextAccount : account));
    });
  }

  function buildMockGreenButtonAccount(utilityName: 'London Hydro' | 'Alectra Utilities' = 'London Hydro'): UtilityConnectorAccount {
    const pack = getOntarioOnboardingPack(utilityName);
    const now = new Date();
    return {
      id: `mock-${pack.utility_name.toLowerCase().replace(/\s+/g, '-')}`,
      connector_kind: 'ontario_green_button_cmd',
      source_kind: 'green_button_cmd',
      status: 'active',
      jurisdiction: 'Ontario',
      utility_name: pack.utility_name,
      display_name: `${pack.utility_name} Green Button CMD`,
      last_synced_at: now.toISOString(),
      last_error: null,
      metadata: {
        runtime_validation_mode: 'mock',
        oauth_espi_scope: pack.oauth_espi_scope,
        registration_form_categories: pack.registration_form_categories,
        requested_data_categories: pack.requested_data_categories,
        revocation_mode: pack.revocation_mode,
        revocation_url: pack.revocation_url,
        manage_connections_url: pack.manage_connections_url,
        token_expires_at: new Date(now.getTime() + (60 * 60 * 1000)).toISOString(),
        token_material_purged: false,
      },
    };
  }

  function handleDisconnectUtility(card: UtilityConnectionHealthCard) {
    const pack = getOntarioOnboardingPack((card.utility_name as 'London Hydro' | 'Alectra Utilities' | undefined));
    const now = new Date().toISOString();
    const revocationMode = card.revocation_mode ?? pack.revocation_mode;
    const baseAccount = connectorAccounts.find((account) => account.connector_kind === 'ontario_green_button_cmd')
      ?? buildMockGreenButtonAccount(pack.utility_name);

    const nextAccount: UtilityConnectorAccount = {
      ...baseAccount,
      utility_name: pack.utility_name,
      display_name: baseAccount.display_name || `${pack.utility_name} Green Button CMD`,
      last_synced_at: baseAccount.last_synced_at ?? now,
      status: revocationMode === 'api' ? 'revoked' : 'failed',
      last_error: revocationMode === 'api'
        ? null
        : 'Disconnect requested. Complete revocation in the utility portal, then confirm disconnection.',
      metadata: {
        ...(baseAccount.metadata ?? {}),
        runtime_validation_mode: 'mock',
        oauth_espi_scope: pack.oauth_espi_scope,
        registration_form_categories: pack.registration_form_categories,
        requested_data_categories: pack.requested_data_categories,
        revocation_mode: revocationMode,
        revocation_url: card.revocation_url ?? pack.revocation_url,
        manage_connections_url: card.manage_connections_url ?? pack.manage_connections_url,
        revocation_requested_at: now,
        awaiting_revocation_confirmation: revocationMode === 'portal_redirect',
        remote_status: revocationMode === 'api' ? 'revoked_locally' : 'portal_redirect_required',
        token_material_purged: revocationMode === 'api',
        revoked_by: 'utility_lane_mock',
        ...(revocationMode === 'api'
          ? {
              revocation_completed_at: now,
              revoked_at: now,
            }
          : {}),
      },
    };

    upsertConnectorAccount(nextAccount);
    setIsPersistedSource(false);
  }

  function handleConfirmDisconnect(card: UtilityConnectionHealthCard) {
    const pack = getOntarioOnboardingPack((card.utility_name as 'London Hydro' | 'Alectra Utilities' | undefined));
    const baseAccount = connectorAccounts.find((account) => account.connector_kind === 'ontario_green_button_cmd')
      ?? buildMockGreenButtonAccount(pack.utility_name);
    const now = new Date().toISOString();

    upsertConnectorAccount({
      ...baseAccount,
      utility_name: pack.utility_name,
      status: 'revoked',
      last_error: null,
      metadata: {
        ...(baseAccount.metadata ?? {}),
        runtime_validation_mode: 'mock',
        oauth_espi_scope: pack.oauth_espi_scope,
        registration_form_categories: pack.registration_form_categories,
        requested_data_categories: pack.requested_data_categories,
        revocation_mode: card.revocation_mode ?? pack.revocation_mode,
        revocation_url: card.revocation_url ?? pack.revocation_url,
        manage_connections_url: card.manage_connections_url ?? pack.manage_connections_url,
        revocation_requested_at: String(baseAccount.metadata?.revocation_requested_at ?? now),
        revocation_completed_at: now,
        revoked_at: now,
        awaiting_revocation_confirmation: false,
        remote_status: 'confirmed_via_portal',
        token_material_purged: true,
        revoked_by: 'utility_lane_mock',
      },
    });
    setIsPersistedSource(false);
  }

  function loadStarterDataset(nextJurisdiction: UtilityJurisdiction, granularity: UtilityInputGranularity) {
    const nextRows = generateUtilityLoadSampleRows(nextJurisdiction, granularity);
    setJurisdiction(nextJurisdiction);
    setRows(nextRows);
    setSourceLabel(`${nextJurisdiction} starter utility load dataset`);
    setIsSampleData(true);
    setSourceKind('fallback_starter');
    setSourceObservedAt(nextRows.at(-1)?.timestamp ?? null);
    setIsPersistedSource(false);
    setParseErrors([]);
    setConnectorAccounts([]);
    const defaults = createDefaultScenario(nextJurisdiction);
    setDraftScenario(defaults);
    setActiveScenario(defaults);
    setSelectedHorizon(5);
  }

  function loadUtilityBatchStarter(nextJurisdiction: UtilityJurisdiction) {
    const snapshot = buildStarterUtilityBatchSnapshot(nextJurisdiction);
    const normalizedRows = normalizeUtilityBatchSnapshot(snapshot);
    setJurisdiction(nextJurisdiction);
    setRows(normalizedRows);
    setSourceLabel(`${nextJurisdiction} starter utility-system batch snapshot`);
    setIsSampleData(true);
    setSourceKind('utility_system_batch');
    setSourceObservedAt(snapshot.observed_at);
    setIsPersistedSource(false);
    setParseErrors([]);
    setConnectorAccounts([]);
    const defaults = createDefaultScenario(nextJurisdiction);
    setDraftScenario(defaults);
    setActiveScenario(defaults);
    setSelectedHorizon(5);
  }

  function handleRunForecast() {
    setActiveScenario({ ...draftScenario, jurisdiction });
  }

  function loadSettlementStarter() {
    const nextJurisdiction: UtilityJurisdiction = 'Alberta';
    const snapshot = buildStarterUtilityBatchSnapshot(nextJurisdiction);
    const normalizedRows = normalizeUtilityBatchSnapshot(snapshot).map((row, index) => ({
      ...row,
      source_system: 'settlement_mdm',
      quality_flags: [
        ...(row.quality_flags ?? []),
        ...(index % 8 === 0 ? ['vee_estimated' as const] : []),
        ...(index % 13 === 0 ? ['vee_edited' as const] : []),
      ],
    }));

    setJurisdiction(nextJurisdiction);
    setRows(normalizedRows);
    setSourceLabel('Alberta starter settlement/MDM batch snapshot');
    setIsSampleData(true);
    setSourceKind('utility_settlement_batch');
    setSourceObservedAt(snapshot.observed_at);
    setIsPersistedSource(false);
    setParseErrors([]);
    setConnectorAccounts([]);
    const defaults = createDefaultScenario(nextJurisdiction);
    setDraftScenario(defaults);
    setActiveScenario(defaults);
    setSelectedHorizon(5);
  }

  function loadGreenButtonStarter() {
    const xml = buildGreenButtonStarterXml();
    const parsed = parseGreenButtonXml(xml, {
      jurisdiction: 'Ontario',
      geographyId: 'ON-GREEN-BUTTON-1',
      customerClass: 'mixed',
    });

    if (parsed.rows.length === 0) {
      setParseErrors(['Green Button starter XML did not produce any interval rows.']);
      return;
    }

    setJurisdiction('Ontario');
    setRows(parsed.rows);
    setSourceLabel('Ontario Green Button CMD starter feed');
    setIsSampleData(true);
    setSourceKind('green_button_cmd');
    setSourceObservedAt(parsed.rows.at(-1)?.timestamp ?? null);
    setIsPersistedSource(false);
    setParseErrors(parsed.warnings);
    setConnectorAccounts([buildMockGreenButtonAccount('London Hydro')]);
    const defaults = createDefaultScenario('Ontario');
    setDraftScenario(defaults);
    setActiveScenario(defaults);
    setSelectedHorizon(5);
  }

  function handleJurisdictionChange(nextJurisdiction: UtilityJurisdiction) {
    if (isSampleData) {
      loadStarterDataset(nextJurisdiction, activeGranularity);
      return;
    }
    setJurisdiction(nextJurisdiction);
    setDraftScenario((current) => ({ ...current, jurisdiction: nextJurisdiction }));
    setActiveScenario((current) => ({ ...current, jurisdiction: nextJurisdiction }));
  }

  function handleScenarioField<K extends keyof UtilityPlanningScenario>(key: K, value: UtilityPlanningScenario[K]) {
    setDraftScenario((current) => ({ ...current, [key]: value }));
  }

  function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const text = String(loadEvent.target?.result ?? '');
      const parsed = parseUtilityHistoricalLoadCsv(text);
      setParseErrors(parsed.errors);
      if (parsed.rows.length === 0) {
        return;
      }

      setRows(parsed.rows);
      setSourceLabel(file.name);
      setIsSampleData(false);
      setSourceKind('uploaded_historical');
      setSourceObservedAt(parsed.rows.at(-1)?.timestamp ?? null);
      setIsPersistedSource(false);
    };
    reader.readAsText(file);
  }

  function refreshPublicContext() {
    setIsLoadingContext(true);
    fetchUtilityPublicContext(jurisdiction)
      .then((context) => setPublicContext(context))
      .catch(() => setPublicContext(null))
      .finally(() => setIsLoadingContext(false));
  }

  function downloadTextFile(filename: string, content: string, mimeType = 'text/csv') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const exportGenericPack = () => {
    if (!forecastState.forecastPackage) return;
    downloadTextFile(
      `${jurisdiction.toLowerCase()}_utility_forecast_pack.csv`,
      utilityForecastPackageToCsv(forecastState.forecastPackage),
    );
  };

  const exportJurisdictionPack = () => {
    if (!forecastState.forecastPackage) return;
    if (jurisdiction === 'Ontario') {
      downloadTextFile(
        'oeb_chapter5_scenario_matrix.csv',
        templateToCSV(
          REGULATORY_TEMPLATES.oeb_dsp_scenario_matrix,
          forecastState.forecastPackage.regulatory_exports.ontario.scenario_matrix_rows as unknown as Record<string, unknown>[],
        ),
      );
      return;
    }

    downloadTextFile(
      'auc_dsp_data_schedule.csv',
      utilityForecastPackageToAlbertaCsv(forecastState.forecastPackage),
    );
  };

  const exportStarterTemplate = (granularity: UtilityInputGranularity) => {
    downloadTextFile(
      `${jurisdiction.toLowerCase()}_${granularity}_starter_template.csv`,
      buildUtilityStarterCsv(jurisdiction, granularity),
    );
  };

  const exportSubmissionPacket = (packet: UtilitySubmissionPacket) => {
    downloadTextFile(
      `${packet.slug}_submission_packet.md`,
      renderSubmissionPacketMarkdown(packet),
      'text/markdown',
    );
  };

  const exportDemoEvidencePack = () => {
    downloadTextFile(
      'ontario_green_button_demo_evidence_pack.md',
      renderDemoEvidenceMarkdown(ontarioSubmissionBundle),
      'text/markdown',
    );
  };

  function updatePointLoad(field: 'name' | 'geography_id' | 'mw' | 'load_factor_pct', value: string | number) {
    setDraftScenario((current) => ({
      ...current,
      large_point_loads: [{
        ...(current.large_point_loads?.[0] ?? {
          name: 'Committed large point-load',
          geography_id: jurisdiction === 'Ontario' ? 'ON-FEEDER-1' : 'AB-FEEDER-1',
          geography_level: 'feeder',
          mw: 0,
          load_factor_pct: 72,
        }),
        [field]: value,
      }],
    }));
  }

  function updateIndustrialOptOut(field: 'name' | 'geography_id' | 'mw', value: string | number) {
    setDraftScenario((current) => ({
      ...current,
      industrial_opt_outs: [{
        ...(current.industrial_opt_outs?.[0] ?? {
          name: 'Industrial self-supply',
          geography_id: jurisdiction === 'Ontario' ? 'ON-FEEDER-1' : 'AB-FEEDER-1',
          geography_level: 'feeder',
          mw: 0,
        }),
        [field]: value,
      }],
    }));
  }

  function updateTouShift(field: 'shift_pct' | 'from_hour_start' | 'from_hour_end' | 'to_hour_start' | 'to_hour_end', value: number) {
    setDraftScenario((current) => ({
      ...current,
      tou_shift_rules: [{
        ...(current.tou_shift_rules?.[0] ?? {
          name: 'Evening EV shift',
          from_hour_start: 17,
          from_hour_end: 21,
          to_hour_start: 0,
          to_hour_end: 5,
          shift_pct: 0,
        }),
        [field]: value,
      }],
    }));
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <SEOHead
        title="Utility Demand Forecasting | Distribution Planning Lane"
        description="Utility-focused demand forecasting for Ontario LDCs and Alberta utilities. Upload historical load data, benchmark against persistence and seasonal-naive baselines, and export filing-ready planning packs."
        path="/utility-demand-forecast"
        keywords={['utility demand forecasting', 'distribution planning', 'OEB Chapter 5', 'AUC Rule 005', 'load forecast benchmark']}
      />

      <div className="bg-gradient-to-r from-sky-800 via-cyan-800 to-emerald-800 py-10 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-white/20 p-3">
                <Building2 className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white md:text-3xl">Utility Demand Forecasting Lane</h1>
                <p className="text-sm text-cyan-100 md:text-base">
                  Statistical, upload-first planning workflows for utilities, not grid-operator analytics.
                </p>
              </div>
            </div>

            {forecastState.forecastPackage && (
              <div className="flex flex-wrap items-center gap-3">
                <DataFreshnessBadge
                  snapshotDate={forecastState.forecastPackage.summary.date_range.end}
                  snapshotLabel="Historical load window"
                  isFallback={isSampleData}
                  source={sourceLabel}
                />
                <button
                  onClick={exportGenericPack}
                  className="flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/30"
                >
                  <Download className="h-4 w-4" />
                  Export Forecast Pack
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {isSampleData && (
          <DataTrustNotice
            mode="mock"
            title="Starter utility dataset loaded"
            message="This route defaults to a local utility starter dataset so new buyers can validate the workflow without touching advanced operator or AI surfaces."
            className="mb-6"
          />
        )}

        {forecastState.error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-900/20 p-5">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-red-400" />
            <div>
              <h2 className="font-semibold text-red-300">Forecast package unavailable</h2>
              <p className="mt-1 text-sm text-slate-300">{forecastState.error}</p>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.05fr_1.45fr]">
          <section className="space-y-6">
            <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-5" data-testid="utility-connection-panel">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">1. Choose utility profile</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Keep the broader platform intact and run the utility-specific planning workflow here.
                  </p>
                </div>
                <Shield className="h-5 w-5 text-cyan-300" />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                {(['Ontario', 'Alberta'] as UtilityJurisdiction[]).map((option) => (
                  <button
                    key={option}
                    onClick={() => handleJurisdictionChange(option)}
                    className={`rounded-lg border px-4 py-3 text-left transition-colors ${
                      jurisdiction === option
                        ? 'border-cyan-400 bg-cyan-500/10 text-white'
                        : 'border-slate-600 bg-slate-900 text-slate-300 hover:border-cyan-500/40'
                    }`}
                  >
                    <div className="font-medium">{option}</div>
                    <div className="mt-1 text-xs text-slate-400">
                      {option === 'Ontario' ? 'OEB Chapter 5 aligned language' : 'AUC / Alberta utility planning aligned language'}
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  onClick={() => loadStarterDataset(jurisdiction, 'hourly')}
                  className="rounded-lg bg-cyan-500/15 px-4 py-2 text-sm font-medium text-cyan-200 transition-colors hover:bg-cyan-500/25"
                >
                  Load {jurisdiction} hourly starter
                </button>
                <button
                  onClick={() => loadUtilityBatchStarter(jurisdiction)}
                  className="rounded-lg bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-200 transition-colors hover:bg-emerald-500/25"
                >
                  Load utility-system batch starter
                </button>
                <button
                  onClick={() => loadStarterDataset(jurisdiction, 'monthly')}
                  className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-slate-100 transition-colors hover:bg-slate-600"
                >
                  Load {jurisdiction} monthly starter
                </button>
              </div>
            </div>

            {jurisdiction === 'Ontario' && (
              <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-5" data-testid="utility-onboarding-panel">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-white">2b. Ontario onboarding readiness</h2>
                    <p className="mt-1 text-sm text-slate-400">
                      Utility-specific registration metadata and demo steps for the first real CMD submissions.
                    </p>
                  </div>
                  <Shield className="h-5 w-5 text-emerald-300" />
                </div>

                <div className="mt-4 grid gap-4 xl:grid-cols-2">
                  {ontarioOnboardingPacks.map((pack) => (
                    <div key={pack.utility_name} className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
                      <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium text-white">{pack.utility_name}</div>
                            <div className="mt-1 text-xs text-slate-400">
                              Registration categories `{pack.registration_form_categories.join(', ')}` with utility-owned authorization and revocation.
                            </div>
                          </div>
                        <a
                          href={pack.registration_url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg bg-slate-800 px-3 py-1 text-xs font-medium text-cyan-200 transition-colors hover:bg-slate-700"
                        >
                          Registration
                        </a>
                      </div>

                      <div className="mt-4 space-y-3 text-sm text-slate-300">
                        <div>
                          <div className="text-xs uppercase tracking-wide text-slate-500">Redirect URI</div>
                          <div className="mt-1 break-all rounded-lg bg-slate-950/60 px-3 py-2 text-xs text-slate-200">
                            {pack.redirect_uri}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-wide text-slate-500">Application login URL</div>
                          <div className="mt-1 break-all rounded-lg bg-slate-950/60 px-3 py-2 text-xs text-slate-200">
                            {pack.login_url}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-wide text-slate-500">Bridge base URL</div>
                          <div className="mt-1 break-all rounded-lg bg-slate-950/60 px-3 py-2 text-xs text-slate-200">
                            {pack.bridge_base_url}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-wide text-slate-500">Requested data categories</div>
                          <div className="mt-1 text-xs text-slate-300">{pack.requested_data_categories.join(', ')}</div>
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-wide text-slate-500">OAuth / ESPI scope</div>
                          <div className="mt-1 text-xs text-slate-300">{pack.oauth_espi_scope}</div>
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-wide text-slate-500">Revocation mode</div>
                          <div className="mt-1 text-xs text-slate-300">{pack.revocation_mode.replace(/_/g, ' ')}</div>
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-wide text-slate-500">Manage connections URL</div>
                          <div className="mt-1 break-all rounded-lg bg-slate-950/60 px-3 py-2 text-xs text-slate-200">
                            {pack.manage_connections_url}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-wide text-slate-500">Revocation behavior</div>
                          <div className="mt-1 text-xs text-slate-300">{pack.revocation_behavior}</div>
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-wide text-slate-500">Data retention answer</div>
                          <div className="mt-1 text-xs text-slate-300">{pack.data_retention_answer}</div>
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-wide text-slate-500">Privacy / terms mapping</div>
                          <div className="mt-1 text-xs text-slate-300">{pack.privacy_mapping}</div>
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-wide text-slate-500">Callback forward target</div>
                          <div className="mt-1 break-all rounded-lg bg-slate-950/60 px-3 py-2 text-xs text-slate-200">
                            {pack.callback_forward_target}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-wide text-slate-500">Replayable demo script</div>
                          <ol className="mt-1 space-y-1 text-xs text-slate-300">
                            {pack.demo_script.map((step) => (
                              <li key={step}>{step}</li>
                            ))}
                          </ol>
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-wide text-slate-500">Bridge runtime contract</div>
                          <ul className="mt-1 space-y-1 text-xs text-slate-300">
                            {pack.bridge_routes.map((route) => (
                              <li key={`${pack.utility_name}-${route}`}>{route}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
                        <a
                          href={pack.terms_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-cyan-300 transition-colors hover:text-cyan-200"
                        >
                          View utility terms
                        </a>
                        <span className="text-slate-500">
                          Submit only after the custom app host, custom bridge host, and local mock auth/callback/sync harness are all passing.
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-900/20 p-4 text-xs text-amber-100">
                  {getOntarioFastFollowNote()}
                </div>
              </div>
            )}

            {jurisdiction === 'Ontario' && (
              <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-5" data-testid="utility-submission-panel">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-white">2c. London Hydro-first submission sprint</h2>
                    <p className="mt-1 text-sm text-slate-400">
                      Keep London Hydro production submission blocked while moving staging infrastructure onto burner internet hosts, then keep every claim bounded to repo-backed behavior.
                    </p>
                  </div>
                  <FileText className="h-5 w-5 text-cyan-300" />
                </div>

                <div className="mt-4 rounded-lg border border-cyan-500/20 bg-cyan-950/30 p-4 text-xs text-cyan-100">
                  <div className="font-medium text-cyan-50">Submission guardrail</div>
                  <div className="mt-2 space-y-1">
                    {ontarioSubmissionBundle.claim_guardrails.map((guardrail) => (
                      <div key={guardrail}>• {guardrail}</div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 xl:grid-cols-2" data-testid="utility-readiness-tracks">
                  {ontarioSubmissionBundle.readiness_tracks.map((track) => (
                    <div key={track.label} className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium text-white">{track.label}</div>
                          <div className="mt-1 text-xs text-slate-400">{track.summary}</div>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] uppercase tracking-wide ${
                          track.status === 'ready'
                            ? 'bg-emerald-500/15 text-emerald-200'
                            : track.status === 'in_progress'
                              ? 'bg-sky-500/15 text-sky-200'
                              : 'bg-amber-500/15 text-amber-200'
                        }`}>
                          {track.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      {track.blockers.length > 0 && (
                        <div className="mt-3">
                          <div className="text-xs uppercase tracking-wide text-slate-500">Active blockers</div>
                          <ul className="mt-1 space-y-1 text-xs text-slate-300">
                            {track.blockers.map((blocker) => (
                              <li key={`${track.label}-${blocker}`}>• {blocker}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {ontarioSubmissionBundle.warnings.length > 0 && (
                  <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-900/20 p-4 text-xs text-amber-100" data-testid="utility-submission-warning">
                    <div className="font-medium text-amber-50">Do not submit yet</div>
                    <div className="mt-2 space-y-1">
                      {ontarioSubmissionBundle.warnings.map((warning) => (
                        <div key={warning}>• {warning}</div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4 grid gap-4 xl:grid-cols-2">
                  {ontarioSubmissionBundle.packets.map((packet) => (
                    <div
                      key={packet.slug}
                      className="rounded-lg border border-slate-700 bg-slate-900/60 p-4"
                      data-testid={`utility-submission-card-${packet.slug}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium text-white">{packet.utility_name}</div>
                          <div className="mt-1 text-xs text-slate-400">{packet.target_outcome}</div>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] uppercase tracking-wide ${
                          packet.submission_status === 'ready'
                            ? 'bg-emerald-500/15 text-emerald-200'
                            : 'bg-amber-500/15 text-amber-200'
                        }`}>
                          {packet.submission_status === 'ready'
                            ? (packet.phase === 'primary' ? 'primary ready' : 'reserve ready')
                            : 'do not submit yet'}
                        </span>
                      </div>

                      <div className="mt-4 space-y-3 text-sm text-slate-300">
                        <div>
                          <div className="text-xs uppercase tracking-wide text-slate-500">Packet status</div>
                          <div className="mt-1 text-xs text-slate-300">{packet.status_reason}</div>
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-wide text-slate-500">Supported claims</div>
                          <ul className="mt-1 space-y-1 text-xs text-slate-300">
                            {packet.supported_claims.map((claim) => (
                              <li key={claim}>• {claim}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-wide text-slate-500">Claims to avoid</div>
                          <ul className="mt-1 space-y-1 text-xs text-red-200">
                            {packet.blocked_claims.map((claim) => (
                              <li key={claim}>• {claim}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-wide text-slate-500">Owner-supplied items</div>
                          <ul className="mt-1 space-y-1 text-xs text-slate-300">
                            {packet.owner_supplied_items.map((item) => (
                              <li key={item}>• {item}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-wide text-slate-500">Field-mapped packet</div>
                          <ul className="mt-1 space-y-1 text-xs text-slate-300">
                            {packet.field_mappings.map((field) => (
                              <li key={`${packet.slug}-${field.label}`}>
                                <span className="text-slate-100">{field.label}:</span> {field.value}
                                <span className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${
                                  field.source === 'repo_backed'
                                    ? 'bg-emerald-500/10 text-emerald-200'
                                    : 'bg-amber-500/10 text-amber-200'
                                }`}>
                                  {field.source === 'repo_backed' ? 'repo-backed' : 'owner-supplied'}
                                </span>
                                {field.note && <div className="mt-1 text-[11px] text-slate-500">{field.note}</div>}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
                        <button
                          onClick={() => exportSubmissionPacket(packet)}
                          className="rounded-lg bg-cyan-500/15 px-3 py-1.5 font-medium text-cyan-200 transition-colors hover:bg-cyan-500/25"
                        >
                          Download {packet.submission_status === 'ready' ? packet.utility_name : `${packet.utility_name} draft`} packet
                        </button>
                        <Link
                          to="/utility-security"
                          className="text-cyan-300 transition-colors hover:text-cyan-200"
                        >
                          Utility security statement
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-lg border border-slate-700 bg-slate-900/60 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-white">Submission gate checklist</h3>
                      <p className="mt-1 text-xs text-slate-400">
                        Repo-backed items can move onto burner staging hosts first, but London Hydro submission still requires canonical corporate hosts and the operator-owned evidence pack.
                      </p>
                    </div>
                    <button
                      onClick={exportDemoEvidencePack}
                      className="rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-200 transition-colors hover:bg-emerald-500/25"
                    >
                      Download demo evidence pack
                    </button>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {ontarioSubmissionBundle.submission_gate.map((item) => (
                      <div key={item.label} className="rounded-lg border border-slate-700 bg-slate-950/50 p-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className={`h-4 w-4 ${
                            item.status === 'ready'
                              ? 'text-emerald-300'
                              : item.status === 'misconfigured'
                                ? 'text-red-300'
                                : 'text-amber-300'
                          }`} />
                          <div className="text-sm font-medium text-white">{item.label}</div>
                        </div>
                        <div className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">
                          {item.owner === 'repo' ? 'Repo-backed' : 'Owner-supplied'} • {item.status.replace(/_/g, ' ')}
                        </div>
                        <div className="mt-2 text-xs text-slate-400">{item.evidence}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">3. Data connections</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Expose which data path is active now and which connector paths are staged for live utility integration.
                  </p>
                </div>
                <Link2 className="h-5 w-5 text-cyan-300" />
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className={`rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide ${
                  isLiveConnected
                    ? 'bg-emerald-500/15 text-emerald-200'
                    : 'bg-amber-500/15 text-amber-200'
                }`}>
                  {isLiveConnected ? 'Live-connected' : 'Upload-first / staged connectors'}
                </span>
                <span className="text-xs text-slate-500">
                  Connector-backed status only becomes live when a non-fallback connector path has produced persisted normalized data.
                </span>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {connectionCards.map((card) => (
                  <div key={card.id} className="rounded-lg border border-slate-700 bg-slate-900/60 p-4" data-testid={`utility-connection-card-${card.id}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-white">{card.title}</div>
                        <div className="mt-1 text-xs text-slate-400">{card.description}</div>
                        {card.utility_name && (
                          <div className="mt-1 text-[11px] uppercase tracking-wide text-cyan-300">{card.utility_name}</div>
                        )}
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] uppercase tracking-wide ${
                        card.status === 'active'
                          ? 'bg-emerald-500/15 text-emerald-200'
                          : card.status === 'failed' || card.status === 'revoked'
                            ? 'bg-red-500/15 text-red-200'
                            : card.status === 'pending_auth'
                              ? 'bg-sky-500/15 text-sky-200'
                              : 'bg-slate-700 text-slate-300'
                      }`}>
                        {card.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                      <span className="rounded-full bg-slate-800 px-2 py-0.5 uppercase tracking-wide">
                        {card.source_kind.replace(/_/g, ' ')}
                      </span>
                      <span className="rounded-full bg-slate-800 px-2 py-0.5 uppercase tracking-wide">
                        {card.freshness_status}
                      </span>
                      {card.is_fallback && (
                        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 uppercase tracking-wide text-amber-200">
                          fallback
                        </span>
                      )}
                    </div>
                    <div className="mt-3 text-xs text-slate-500">
                      Last sync: {card.last_synced_at ?? 'none'}
                    </div>
                    {card.requested_data_categories && card.requested_data_categories.length > 0 && (
                      <div className="mt-2 text-xs text-slate-400">
                        Requested categories: {card.requested_data_categories.join(', ')}
                        {card.oauth_espi_scope ? ` • scope ${card.oauth_espi_scope}` : ''}
                      </div>
                    )}
                    {card.notes && (
                      <div className="mt-2 text-xs text-slate-400">{card.notes}</div>
                    )}
                    {card.error_message && (
                      <div className="mt-2 text-xs text-red-200">{card.error_message}</div>
                    )}
                    {card.can_disconnect && (
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => handleDisconnectUtility(card)}
                          className="rounded-lg bg-red-500/15 px-3 py-1.5 text-xs font-medium text-red-200 transition-colors hover:bg-red-500/25"
                        >
                          Disconnect Utility
                        </button>
                        {card.awaiting_revocation_confirmation && card.manage_connections_url && (
                          <a
                            href={card.manage_connections_url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-cyan-200 transition-colors hover:bg-slate-700"
                          >
                            Manage connections
                          </a>
                        )}
                        {card.awaiting_revocation_confirmation && (
                          <button
                            onClick={() => handleConfirmDisconnect(card)}
                            className="rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-200 transition-colors hover:bg-emerald-500/25"
                          >
                            Confirm disconnect
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  onClick={() => loadUtilityBatchStarter(jurisdiction)}
                  className="rounded-lg bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-200 transition-colors hover:bg-emerald-500/25"
                >
                  Promote batch starter
                </button>
                <button
                  onClick={loadSettlementStarter}
                  className="rounded-lg bg-amber-500/15 px-4 py-2 text-sm font-medium text-amber-200 transition-colors hover:bg-amber-500/25"
                >
                  Load Alberta settlement starter
                </button>
                <button
                  onClick={loadGreenButtonStarter}
                  className="rounded-lg bg-sky-500/15 px-4 py-2 text-sm font-medium text-sky-200 transition-colors hover:bg-sky-500/25"
                >
                  Load Ontario Green Button starter
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">4. Import utility load history</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Local-first CSV import for feeder, substation, or system load history.
                  </p>
                </div>
                <Upload className="h-5 w-5 text-emerald-300" />
              </div>

              <div className="mt-4 rounded-xl border-2 border-dashed border-slate-600 bg-slate-900/50 p-5">
                <label className="flex cursor-pointer flex-col items-center gap-3 text-center">
                  <Upload className="h-8 w-8 text-cyan-300" />
                  <div>
                    <div className="font-medium text-white">Upload historical load CSV</div>
                    <div className="mt-1 text-xs text-slate-400">
                      Required: timestamp and demand. Optional: geography, customer class, weather zone, temperature, net/gross load, source system, feeder, and substation identifiers.
                    </div>
                  </div>
                  <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileUpload} />
                  <span className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-white">Select CSV</span>
                </label>
              </div>

              {parseErrors.length > 0 && (
                <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-900/20 p-4 text-sm text-amber-100">
                  <div className="font-medium">Import warnings</div>
                  <ul className="mt-2 space-y-1 text-xs text-amber-200/90">
                    {parseErrors.slice(0, 5).map((error) => (
                      <li key={error}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button
                  onClick={() => exportStarterTemplate('hourly')}
                  className="rounded-lg border border-slate-600 bg-slate-900 px-4 py-3 text-left text-sm text-slate-200 transition-colors hover:border-cyan-500/50"
                >
                  <div className="font-medium">Download hourly starter CSV</div>
                  <div className="mt-1 text-xs text-slate-500">For interval-level feeder or substation history</div>
                </button>
                <button
                  onClick={() => exportStarterTemplate('monthly')}
                  className="rounded-lg border border-slate-600 bg-slate-900 px-4 py-3 text-left text-sm text-slate-200 transition-colors hover:border-cyan-500/50"
                >
                  <div className="font-medium">Download monthly starter CSV</div>
                  <div className="mt-1 text-xs text-slate-500">For planning-timescale utility history</div>
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">4. Live public context</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Promote this route beyond upload-only planning with weather and market context plus explicit freshness and fallback labels.
                  </p>
                </div>
                <Radio className="h-5 w-5 text-sky-300" />
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  onClick={refreshPublicContext}
                  className="rounded-lg bg-sky-500/15 px-4 py-2 text-sm font-medium text-sky-200 transition-colors hover:bg-sky-500/25"
                >
                  {isLoadingContext ? 'Refreshing context...' : 'Refresh public context'}
                </button>
                <span className="text-xs text-slate-500">
                  Weather source, market context, and fallback honesty are carried into the forecast package.
                </span>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Weather context</div>
                  <div className="mt-2 text-sm text-white">
                    {publicContext?.weather_observation
                      ? `${publicContext.weather_observation.temperature_c?.toFixed(1) ?? 'NA'}°C from ${publicContext.weather_observation.source}`
                      : 'Weather context unavailable in the current environment'}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    {publicContext?.weather_observation?.observed_at ?? 'No observed weather timestamp'}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-500">
                    {jurisdiction === 'Alberta' ? 'AESO market context' : 'IESO context pathway'}
                  </div>
                  <div className="mt-2 text-sm text-white">
                    {jurisdiction === 'Alberta'
                      ? publicContext?.alberta_pool_price_cad_per_mwh !== null && publicContext?.alberta_pool_price_cad_per_mwh !== undefined
                        ? `${publicContext.alberta_pool_price_cad_per_mwh.toFixed(2)} CAD/MWh`
                        : 'AESO pool price unavailable'
                      : 'Ontario context currently uses the public-context fallback contract'}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    {publicContext?.live_surfaces.find((surface) => surface.source_kind === 'public_enrichment')?.freshness_status ?? 'unknown'} freshness
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {(publicContext?.live_surfaces ?? []).map((surface) => (
                  <div key={`${surface.source}-${surface.observed_at ?? 'none'}`} className="rounded-lg border border-slate-700 bg-slate-900/50 p-3">
                    <div className="flex flex-wrap items-center gap-2 text-sm text-white">
                      <span>{surface.source}</span>
                      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] uppercase tracking-wide text-slate-300">
                        {surface.freshness_status}
                      </span>
                      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] uppercase tracking-wide text-slate-300">
                        {surface.source_kind.replace(/_/g, ' ')}
                      </span>
                      {surface.is_fallback && (
                        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] uppercase tracking-wide text-amber-200">
                          fallback
                        </span>
                      )}
                    </div>
                    {surface.quality_flags.length > 0 && (
                      <div className="mt-2 text-xs text-amber-200">
                        {surface.quality_flags.join(' • ')}
                      </div>
                    )}
                    {surface.notes && (
                      <div className="mt-1 text-xs text-slate-400">{surface.notes}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">5. Set future expectations</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Build low, base, and high planning cases using committed load, electrification, DER, demand response, BYOP, and stress overlays.
                  </p>
                </div>
                <TrendingUp className="h-5 w-5 text-sky-300" />
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="Weather case">
                  <select
                    value={draftScenario.weather_case}
                    onChange={(event) => handleScenarioField('weather_case', event.target.value as UtilityPlanningScenario['weather_case'])}
                    className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white"
                  >
                    <option value="median">Median weather</option>
                    <option value="extreme">Extreme weather</option>
                  </select>
                </Field>
                <Field label="Stress test mode">
                  <select
                    value={draftScenario.stress_test_mode ?? 'none'}
                    onChange={(event) => handleScenarioField('stress_test_mode', event.target.value as UtilityPlanningScenario['stress_test_mode'])}
                    className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white"
                  >
                    <option value="none">No stress test</option>
                    <option value="polar_vortex">Polar vortex</option>
                    <option value="heat_wave">Heat wave</option>
                    <option value="ice_storm">Ice storm</option>
                  </select>
                </Field>
                <Field label="Annual load growth (%)">
                  <NumberInput value={draftScenario.annual_load_growth_pct} onChange={(value) => handleScenarioField('annual_load_growth_pct', value)} />
                </Field>
                <Field label="Capacity buffer (%)">
                  <NumberInput value={draftScenario.capacity_buffer_pct} onChange={(value) => handleScenarioField('capacity_buffer_pct', value)} />
                </Field>
                <Field label="Committed load (MW)">
                  <NumberInput value={draftScenario.committed_load_mw} onChange={(value) => handleScenarioField('committed_load_mw', value)} />
                </Field>
                <Field label="EV growth (MW)">
                  <NumberInput value={draftScenario.ev_growth_mw} onChange={(value) => handleScenarioField('ev_growth_mw', value)} />
                </Field>
                <Field label="Heat-pump growth (MW)">
                  <NumberInput value={draftScenario.heat_pump_growth_mw} onChange={(value) => handleScenarioField('heat_pump_growth_mw', value)} />
                </Field>
                <Field label="DER offset (MW)">
                  <NumberInput value={draftScenario.der_offset_mw} onChange={(value) => handleScenarioField('der_offset_mw', value)} />
                </Field>
                <Field label="Demand-response reduction (MW)">
                  <NumberInput value={draftScenario.demand_response_reduction_mw} onChange={(value) => handleScenarioField('demand_response_reduction_mw', value)} />
                </Field>
                <Field label="Demand-response shift (%)">
                  <NumberInput value={draftScenario.demand_response_shift_pct} onChange={(value) => handleScenarioField('demand_response_shift_pct', value)} />
                </Field>
                <Field label="Hosting capacity limit (MW)">
                  <NumberInput value={draftScenario.hosting_capacity_limit_mw ?? 0} onChange={(value) => handleScenarioField('hosting_capacity_limit_mw', value)} />
                </Field>
                <Field label="Large point-load geography">
                  <input
                    type="text"
                    value={draftScenario.large_point_loads?.[0]?.geography_id ?? ''}
                    onChange={(event) => updatePointLoad('geography_id', event.target.value)}
                    className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white"
                  />
                </Field>
                <Field label="Large point-load (MW)">
                  <NumberInput value={draftScenario.large_point_loads?.[0]?.mw ?? 0} onChange={(value) => updatePointLoad('mw', value)} />
                </Field>
                <Field label="Point-load load factor (%)">
                  <NumberInput value={draftScenario.large_point_loads?.[0]?.load_factor_pct ?? 72} onChange={(value) => updatePointLoad('load_factor_pct', value)} />
                </Field>
                <Field label="Industrial opt-out geography">
                  <input
                    type="text"
                    value={draftScenario.industrial_opt_outs?.[0]?.geography_id ?? ''}
                    onChange={(event) => updateIndustrialOptOut('geography_id', event.target.value)}
                    className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white"
                  />
                </Field>
                <Field label="Industrial opt-out (MW)">
                  <NumberInput value={draftScenario.industrial_opt_outs?.[0]?.mw ?? 0} onChange={(value) => updateIndustrialOptOut('mw', value)} />
                </Field>
                <Field label="ToU shift (%)">
                  <NumberInput value={draftScenario.tou_shift_rules?.[0]?.shift_pct ?? 0} onChange={(value) => updateTouShift('shift_pct', value)} />
                </Field>
                <Field label="ToU from hour start">
                  <NumberInput value={draftScenario.tou_shift_rules?.[0]?.from_hour_start ?? 17} onChange={(value) => updateTouShift('from_hour_start', Math.round(value))} />
                </Field>
                <Field label="ToU from hour end">
                  <NumberInput value={draftScenario.tou_shift_rules?.[0]?.from_hour_end ?? 21} onChange={(value) => updateTouShift('from_hour_end', Math.round(value))} />
                </Field>
                <Field label="ToU to hour start">
                  <NumberInput value={draftScenario.tou_shift_rules?.[0]?.to_hour_start ?? 0} onChange={(value) => updateTouShift('to_hour_start', Math.round(value))} />
                </Field>
                <Field label="ToU to hour end">
                  <NumberInput value={draftScenario.tou_shift_rules?.[0]?.to_hour_end ?? 5} onChange={(value) => updateTouShift('to_hour_end', Math.round(value))} />
                </Field>
              </div>

              <button
                onClick={handleRunForecast}
                className="mt-5 flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-400"
              >
                <CheckCircle2 className="h-4 w-4" />
                Run utility forecast pack
              </button>
            </div>
          </section>

          <section className="space-y-6">
            {forecastState.forecastPackage && (
              <>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  <MetricCard label="Intervals" value={forecastState.forecastPackage.summary.interval_count.toLocaleString()} sub={`${activeGranularity} history`} icon={<Calendar className="h-5 w-5 text-cyan-300" />} />
                  <MetricCard label="Peak baseline" value={`${forecastState.forecastPackage.summary.baseline_peak_mw.toFixed(1)} MW`} sub={`${forecastState.forecastPackage.summary.geography_count} geographies`} icon={<Zap className="h-5 w-5 text-amber-300" />} />
                  <MetricCard label="Annual energy" value={`${forecastState.forecastPackage.summary.baseline_energy_gwh.toFixed(1)} GWh`} sub={`${forecastState.forecastPackage.summary.customer_classes.length} customer classes`} icon={<BarChart3 className="h-5 w-5 text-emerald-300" />} />
                  <MetricCard label="Model skill" value={`${forecastState.forecastPackage.benchmark.skill_score_vs_persistence.toFixed(1)}%`} sub="vs persistence" icon={<TrendingUp className="h-5 w-5 text-sky-300" />} />
                  <MetricCard label="Reliability proxy" value={`${forecastState.forecastPackage.reliability_proxy.current_score.toFixed(1)}`} sub={`quality flags: ${forecastState.forecastPackage.input_provenance_summary.total_quality_flags}`} icon={<Shield className="h-5 w-5 text-violet-300" />} />
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-5" data-testid="utility-forecast-benchmark-card">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold text-white">Benchmark proof pack</h2>
                      <p className="mt-1 text-sm text-slate-400">
                        Every utility run shows the baseline comparison, provenance, live-surface truth contract, and assumption pack.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <ProvenanceBadge type={forecastState.forecastPackage.provenance.type} source={forecastState.forecastPackage.source_label} compact />
                      <span className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-1.5 text-xs text-slate-300">
                        Weather: {forecastState.forecastPackage.scenario.weather_case}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <BenchmarkStat label="MAE" value={forecastState.forecastPackage.benchmark.mae} baseline={forecastState.forecastPackage.benchmark.persistence_mae} />
                    <BenchmarkStat label="MAPE" value={forecastState.forecastPackage.benchmark.mape} baseline={forecastState.forecastPackage.benchmark.persistence_mape} suffix="%" />
                    <BenchmarkStat label="RMSE" value={forecastState.forecastPackage.benchmark.rmse} baseline={forecastState.forecastPackage.benchmark.persistence_rmse} />
                    <BenchmarkStat label="vs persistence" value={forecastState.forecastPackage.benchmark.skill_score_vs_persistence} baseline={0} suffix="%" />
                    <BenchmarkStat label="vs seasonal naive" value={forecastState.forecastPackage.benchmark.skill_score_vs_seasonal} baseline={0} suffix="%" />
                    <BenchmarkStat label="Sample size" value={forecastState.forecastPackage.benchmark.sample_size} baseline={0} baselineLabel="holdout rows" integer />
                  </div>

                  <div className="mt-4 rounded-lg border border-slate-700 bg-slate-900/60 p-4 text-sm text-slate-300">
                    <div className="font-medium text-white">Assumption pack</div>
                    <ul className="mt-3 space-y-2 text-sm text-slate-300">
                      {forecastState.forecastPackage.assumptions.map((assumption) => (
                        <li key={assumption} className="flex gap-2">
                          <ArrowRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-cyan-300" />
                          <span>{assumption}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
                      <div className="font-medium text-white">Live surface truth contract</div>
                      <div className="mt-2 text-xs text-slate-400">
                        Assumption pack version: {forecastState.forecastPackage.input_provenance_summary.assumption_pack_version}
                      </div>
                      <div className="mt-3 space-y-2">
                        {forecastState.forecastPackage.input_provenance_summary.live_surfaces.map((surface) => (
                          <div key={`${surface.source}-${surface.observed_at ?? 'none'}`} className="rounded-lg border border-slate-700 bg-slate-950/60 p-3">
                            <div className="flex flex-wrap items-center gap-2 text-sm text-white">
                              <span>{surface.source}</span>
                              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] uppercase tracking-wide text-slate-300">
                                {surface.freshness_status}
                              </span>
                              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] uppercase tracking-wide text-slate-300">
                                {surface.source_kind.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <div className="mt-1 text-xs text-slate-400">
                              observed_at: {surface.observed_at ?? 'none'}
                            </div>
                            {surface.quality_flags.length > 0 && (
                              <div className="mt-2 text-xs text-amber-200">{surface.quality_flags.join(' • ')}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
                      <div className="font-medium text-white">Input quality summary</div>
                      <div className="mt-3 space-y-2 text-sm text-slate-300">
                        <div className="flex items-center justify-between">
                          <span>Source kind</span>
                          <span className="text-cyan-300">{forecastState.forecastPackage.input_provenance_summary.source_kind.replace(/_/g, ' ')}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Gross reconstitution</span>
                          <span className="text-cyan-300">
                            {forecastState.forecastPackage.input_provenance_summary.gross_reconstitution_applied ? 'applied' : 'not applied'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Total quality flags</span>
                          <span className="text-cyan-300">{forecastState.forecastPackage.input_provenance_summary.total_quality_flags}</span>
                        </div>
                      </div>
                      <div className="mt-3 space-y-2 text-xs text-slate-400">
                        {forecastState.forecastPackage.input_provenance_summary.quality_counts
                          .filter((entry) => entry.count > 0)
                          .map((entry) => (
                            <div key={entry.flag} className="flex items-center justify-between">
                              <span>{entry.flag.replace(/_/g, ' ')}</span>
                              <span>{entry.count}</span>
                            </div>
                          ))}
                        {forecastState.forecastPackage.input_provenance_summary.quality_counts.every((entry) => entry.count === 0) && (
                          <div>No quality flags were detected in the current normalized dataset.</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold text-white">Scenario matrix</h2>
                      <p className="mt-1 text-sm text-slate-400">
                        Low, base, and high cases share one statistical engine and export as a single planning matrix for regulators.
                      </p>
                    </div>
                    <Map className="h-5 w-5 text-cyan-300" />
                  </div>

                  <div className="mt-4 h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="year" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip contentStyle={{ backgroundColor: '#020617', borderColor: '#334155' }} />
                        <Legend />
                        <Line type="monotone" dataKey="low" stroke="#38bdf8" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="expected" stroke="#10b981" strokeWidth={3} dot={false} />
                        <Line type="monotone" dataKey="high" stroke="#f59e0b" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-700 text-sm">
                      <thead className="bg-slate-900/60 text-slate-400">
                        <tr>
                          <th className="px-3 py-2 text-left">Horizon</th>
                          <th className="px-3 py-2 text-right">Low MW</th>
                          <th className="px-3 py-2 text-right">Expected MW</th>
                          <th className="px-3 py-2 text-right">High MW</th>
                          <th className="px-3 py-2 text-right">Expected GWh</th>
                          <th className="px-3 py-2 text-right">Utilization</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-200">
                        {highlightedRows.map((row) => (
                          <tr key={row.year}>
                            <td className="px-3 py-3 font-medium">{row.year} year</td>
                            <td className="px-3 py-3 text-right text-cyan-300">{row.low?.peak_demand_mw.toFixed(1)}</td>
                            <td className="px-3 py-3 text-right text-emerald-300">{row.expected?.peak_demand_mw.toFixed(1)}</td>
                            <td className="px-3 py-3 text-right text-amber-300">{row.high?.peak_demand_mw.toFixed(1)}</td>
                            <td className="px-3 py-3 text-right">{row.expected?.annual_energy_gwh.toFixed(1)}</td>
                            <td className="px-3 py-3 text-right">{row.expected?.utilization_pct.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
                  <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-lg font-semibold text-white">Reliability proxy</h2>
                        <p className="mt-1 text-sm text-slate-400">
                          OEB-style reliability and capacity-strain indicators tied directly to the current planning horizon.
                        </p>
                      </div>
                      <Shield className="h-5 w-5 text-violet-300" />
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <BenchmarkStat label="Current score" value={forecastState.forecastPackage.reliability_proxy.current_score} baseline={80} baselineLabel="watch threshold" />
                      <BenchmarkStat label="Selected horizon" value={selectedReliability?.score ?? 0} baseline={80} baselineLabel="watch threshold" />
                      <BenchmarkStat label="Reserve headroom" value={selectedReliability?.reserve_headroom_mw ?? 0} baseline={0} suffix=" MW" />
                      <BenchmarkStat label="Weather stress" value={selectedReliability?.weather_stress_pct ?? 0} baseline={0} suffix="%" />
                    </div>

                    <div className="mt-4 overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-700 text-sm">
                        <thead className="bg-slate-900/60 text-slate-400">
                          <tr>
                            <th className="px-3 py-2 text-left">Horizon</th>
                            <th className="px-3 py-2 text-right">Score</th>
                            <th className="px-3 py-2 text-left">Band</th>
                            <th className="px-3 py-2 text-right">Utilization</th>
                            <th className="px-3 py-2 text-right">Headroom MW</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-200">
                          {forecastState.forecastPackage.reliability_proxy.horizon_scores
                            .filter((row) => forecastState.forecastPackage.highlighted_years.includes(row.horizon_year))
                            .map((row) => (
                              <tr key={row.horizon_year}>
                                <td className="px-3 py-3">{row.horizon_year} year</td>
                                <td className="px-3 py-3 text-right">{row.score.toFixed(1)}</td>
                                <td className="px-3 py-3">{row.band}</td>
                                <td className="px-3 py-3 text-right">{row.peak_utilization_pct.toFixed(1)}%</td>
                                <td className="px-3 py-3 text-right">{row.reserve_headroom_mw.toFixed(2)}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-lg font-semibold text-white">8,760 profile preview</h2>
                        <p className="mt-1 text-sm text-slate-400">
                          The selected expected-case horizon is expanded into an hourly planning profile with DER, DR, ToU, and BYOP overlays.
                        </p>
                      </div>
                      <Calendar className="h-5 w-5 text-cyan-300" />
                    </div>

                    <div className="mt-4 h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={selectedProfilePreview}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                          <XAxis dataKey="hour" stroke="#94a3b8" />
                          <YAxis stroke="#94a3b8" />
                          <Tooltip contentStyle={{ backgroundColor: '#020617', borderColor: '#334155' }} />
                          <Legend />
                          <Line type="monotone" dataKey="forecast" stroke="#10b981" strokeWidth={2.5} dot={false} />
                          <Line type="monotone" dataKey="pointLoad" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
                          <Line type="monotone" dataKey="derOffset" stroke="#38bdf8" strokeWidth={1.5} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="mt-4 text-xs text-slate-400">
                      Deferred peak load: {forecastState.forecastPackage.deferred_peak_load_mw.toFixed(2)} MW. Exported profiles remain transparent statistical constructions, not opaque ML traces.
                    </div>
                  </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                  <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-lg font-semibold text-white">Geography reconciliation</h2>
                        <p className="mt-1 text-sm text-slate-400">
                          Recent geography shares are reconciled to the utility-wide forecast so local issues stay visible.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {forecastState.forecastPackage.highlighted_years.map((year) => (
                          <button
                            key={year}
                            onClick={() => setSelectedHorizon(year)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                              selectedHorizon === year
                                ? 'bg-cyan-500 text-white'
                                : 'bg-slate-900 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            {year}Y
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={selectedAllocations.slice(0, 8)}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                          <XAxis dataKey="geography_id" stroke="#94a3b8" />
                          <YAxis stroke="#94a3b8" />
                          <Tooltip contentStyle={{ backgroundColor: '#020617', borderColor: '#334155' }} />
                          <Bar dataKey="peak_demand_mw" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="mt-4 overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-700 text-sm">
                        <thead className="bg-slate-900/60 text-slate-400">
                          <tr>
                            <th className="px-3 py-2 text-left">Geography</th>
                            <th className="px-3 py-2 text-left">Class</th>
                            <th className="px-3 py-2 text-right">Share</th>
                            <th className="px-3 py-2 text-right">Peak MW</th>
                            <th className="px-3 py-2 text-left">Constraint</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-200">
                          {selectedAllocations.map((allocation) => (
                            <tr key={`${allocation.horizon_year}-${allocation.geography_id}-${allocation.customer_class}`}>
                              <td className="px-3 py-3">{allocation.geography_id}</td>
                              <td className="px-3 py-3">{allocation.customer_class}</td>
                              <td className="px-3 py-3 text-right">{allocation.share_pct.toFixed(1)}%</td>
                              <td className="px-3 py-3 text-right">{allocation.peak_demand_mw.toFixed(2)}</td>
                              <td className="px-3 py-3">
                                {allocation.constrained ? (
                                  <span className="rounded-full bg-amber-500/15 px-2 py-1 text-[11px] uppercase tracking-wide text-amber-200">
                                    review
                                  </span>
                                ) : (
                                  <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-[11px] uppercase tracking-wide text-emerald-200">
                                    clear
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-5" data-testid="utility-forecast-export-card">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-lg font-semibold text-white">Utility export pack</h2>
                        <p className="mt-1 text-sm text-slate-400">
                          Feed planning outputs directly into the existing regulatory and utility workflows.
                        </p>
                      </div>
                      <FileText className="h-5 w-5 text-emerald-300" />
                    </div>

                    <div className="mt-4 space-y-3">
                      <button
                        onClick={exportGenericPack}
                        className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-3 text-left text-sm text-slate-100 transition-colors hover:border-cyan-500/50"
                      >
                        <div className="font-medium">Export utility forecast package</div>
                        <div className="mt-1 text-xs text-slate-500">Low / expected / high cases with assumptions and benchmark proof</div>
                      </button>
                      <button
                        onClick={exportJurisdictionPack}
                        className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-3 text-left text-sm text-slate-100 transition-colors hover:border-cyan-500/50"
                      >
                        <div className="font-medium">
                          {jurisdiction === 'Ontario' ? 'Export OEB scenario matrix' : 'Export AUC DSP data schedule'}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {jurisdiction === 'Ontario'
                            ? 'Low/base/high scenario rows with reliability proxy for Chapter 5 planning'
                            : 'Exact Alberta data-schedule style rows for utility and REA DSP workflows'}
                        </div>
                      </button>
                    </div>

                    <div className="mt-4 rounded-lg border border-slate-700 bg-slate-900/60 p-4 text-sm text-slate-300">
                      <div className="font-medium text-white">Current source and warnings</div>
                      <div className="mt-2 text-xs text-slate-400">{forecastState.forecastPackage.source_label}</div>
                      {forecastState.forecastPackage.warnings.length > 0 && (
                        <ul className="mt-3 space-y-2 text-xs text-amber-200">
                          {forecastState.forecastPackage.warnings.map((warning) => (
                            <li key={warning} className="flex gap-2">
                              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                              <span>{warning}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {forecastState.forecastPackage.hosting_capacity_warnings.length > 0 && (
                      <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-900/20 p-4 text-sm text-amber-100">
                        <div className="font-medium text-white">Hosting-capacity warnings</div>
                        <ul className="mt-3 space-y-2 text-xs">
                          {forecastState.forecastPackage.hosting_capacity_warnings.slice(0, 5).map((warning) => (
                            <li key={`${warning.horizon_year}-${warning.geography_id}`} className="flex gap-2">
                              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                              <span>{warning.message}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </section>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <Link to="/demand-forecast" className="rounded-xl border border-slate-700 bg-slate-800 p-4 transition-colors hover:border-cyan-500/50">
            <TrendingUp className="mb-2 h-5 w-5 text-cyan-300" />
            <h3 className="text-sm font-medium text-white">Advanced demand lab</h3>
            <p className="mt-1 text-xs text-slate-500">Keep the broader advanced forecasting route intact.</p>
          </Link>
          <Link to="/forecast-benchmarking" className="rounded-xl border border-slate-700 bg-slate-800 p-4 transition-colors hover:border-cyan-500/50">
            <BarChart3 className="mb-2 h-5 w-5 text-indigo-300" />
            <h3 className="text-sm font-medium text-white">Benchmarking trust layer</h3>
            <p className="mt-1 text-xs text-slate-500">Compare forecast discipline against standard baselines.</p>
          </Link>
          <Link to="/regulatory-filing" className="rounded-xl border border-slate-700 bg-slate-800 p-4 transition-colors hover:border-cyan-500/50">
            <FileText className="mb-2 h-5 w-5 text-amber-300" />
            <h3 className="text-sm font-medium text-white">Regulatory filing exports</h3>
            <p className="mt-1 text-xs text-slate-500">Reuse the existing filing templates without leaving the utility workflow.</p>
          </Link>
          <Link to="/asset-health" className="rounded-xl border border-slate-700 bg-slate-800 p-4 transition-colors hover:border-cyan-500/50">
            <Shield className="mb-2 h-5 w-5 text-emerald-300" />
            <h3 className="text-sm font-medium text-white">Asset health planning</h3>
            <p className="mt-1 text-xs text-slate-500">Pair load growth with adjacent utility asset decisions.</p>
          </Link>
        </div>
      </div>
    </div>
  );
};

function buildGreenButtonStarterXml(): string {
  const rows = generateUtilityLoadSampleRows('Ontario', 'hourly').slice(0, 24);
  const intervalReadings = rows.map((row, index) => {
    const startSeconds = Math.floor(new Date(row.timestamp).getTime() / 1000);
    const valueWh = Math.round((row.demand_mw * 1_000_000) * 1);
    return `
      <entry>
        <content>
          <espi:IntervalReading>
            <espi:timePeriod>
              <espi:duration>3600</espi:duration>
              <espi:start>${startSeconds}</espi:start>
            </espi:timePeriod>
            <espi:value>${valueWh + index}</espi:value>
          </espi:IntervalReading>
        </content>
      </entry>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
    <feed xmlns="http://www.w3.org/2005/Atom" xmlns:espi="http://naesb.org/espi">
      <entry>
        <content>
          <espi:ReadingType>
            <espi:uom>72</espi:uom>
            <espi:powerOfTenMultiplier>0</espi:powerOfTenMultiplier>
          </espi:ReadingType>
        </content>
      </entry>
      <entry>
        <content>
          <espi:UsagePoint>
            <espi:mRID>ON-GREEN-BUTTON-1</espi:mRID>
          </espi:UsagePoint>
        </content>
      </entry>
      ${intervalReadings}
    </feed>`;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function NumberInput({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <input
      type="number"
      value={value}
      step="0.1"
      onChange={(event) => onChange(Number(event.target.value))}
      className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white"
    />
  );
}

function MetricCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
          <div className="mt-1 text-xl font-semibold text-white">{value}</div>
          <div className="mt-1 text-xs text-slate-400">{sub}</div>
        </div>
        <div>{icon}</div>
      </div>
    </div>
  );
}

function BenchmarkStat({
  label,
  value,
  baseline,
  baselineLabel = 'baseline',
  suffix = '',
  integer = false,
}: {
  label: string;
  value: number;
  baseline: number;
  baselineLabel?: string;
  suffix?: string;
  integer?: boolean;
}) {
  const formatter = integer ? (input: number) => `${Math.round(input)}${suffix}` : (input: number) => `${input.toFixed(2)}${suffix}`;
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-white">{formatter(value)}</div>
      <div className="mt-1 text-xs text-slate-400">
        {baselineLabel}: {formatter(baseline)}
      </div>
    </div>
  );
}

export default UtilityDemandForecastPage;
