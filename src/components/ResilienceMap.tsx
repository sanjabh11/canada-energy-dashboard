import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
} from 'recharts';
import { MapPin, Shield, Zap, Eye } from 'lucide-react';
import { resilienceEngine, ResilienceUtils, AssetType, ClimateHazard, DefaultClimateHazards } from '../lib/resilienceScoring';
import { fetchEdgeJson } from '../lib/edge';
import { realDataService } from '../lib/realDataService';
import { isEdgeFetchEnabled } from '../lib/config';

type ResilienceAsset = {
  asset_uuid: string;
  id: string;
  name: string;
  asset_type?: string | null;
  assetType: AssetType;
  latitude: number;
  longitude: number;
  currentValue: number;
  dependents: number;
  currentCondition: number;
  vulnerability_score?: number | null;
  adaptation_cost?: number | null;
  population_served?: number | null;
  climate_region?: string | null;
};

type HazardAssessment = {
  asset_id: string;
  scenario: string;
  time_horizon_years: number;
  flooding?: number | null;
  wildfire?: number | null;
  hurricane?: number | null;
  sea_level_rise?: number | null;
  extreme_heat?: number | null;
  drought?: number | null;
  landslide?: number | null;
  erosion?: number | null;
  overall_risk?: number | null;
  generated_at?: string;
};

const SCENARIOS: Record<string, { label: string; description: string }> = {
  current_2c: {
    label: 'Current Trajectory (+2°C)',
    description: 'Moderate warming scenario with current policy settings.',
  },
  high_emissions_4c: {
    label: 'High Emissions (+4°C)',
    description: 'High-risk scenario assuming limited mitigation.',
  },
  ambitious_1_5c: {
    label: 'Ambitious (+1.5°C)',
    description: 'Aggressive mitigation pathway aligned with Paris targets.',
  },
};

const TIME_HORIZONS = [10, 20, 30, 50];

const mapAssetType = (value?: string | null): AssetType => {
  const key = (value ?? '').toLowerCase();
  switch (key) {
    case 'water_systems':
    case 'water':
      return AssetType.WATER_SYSTEMS;
    case 'transportation':
    case 'transport':
      return AssetType.TRANSPORTATION;
    case 'telecommunications':
    case 'telecom':
      return AssetType.TELECOMMUNICATIONS;
    case 'healthcare':
      return AssetType.HEALTHCARE;
    case 'transmission_line':
    case 'substation':
    case 'generation_plant':
    case 'distribution_center':
    case 'power':
    case 'emergency_services':
    case 'emergency':
      return AssetType.EMERGENCY_SERVICES;
    case 'critical_manufacturing':
    case 'manufacturing':
      return AssetType.CRITICAL_MANUFACTURING;
    case 'financial_services':
    case 'financial':
      return AssetType.FINANCIAL_SERVICES;
    case 'power_grid':
    case 'grid':
    case 'electric':
    default:
      return AssetType.POWER_GRID;
  }
};

const buildHazardRecord = (assessment?: HazardAssessment | null): Record<ClimateHazard, number> => ({
  [ClimateHazard.FLOODING]: Number(assessment?.flooding ?? 0),
  [ClimateHazard.WILDFIRE]: Number(assessment?.wildfire ?? 0),
  [ClimateHazard.HURRICANE]: Number(assessment?.hurricane ?? 0),
  [ClimateHazard.SEA_LEVEL_RISE]: Number(assessment?.sea_level_rise ?? 0),
  [ClimateHazard.EXTREME_HEAT]: Number(assessment?.extreme_heat ?? 0),
  [ClimateHazard.DROUGHT]: Number(assessment?.drought ?? 0),
  [ClimateHazard.LANDSLIDE]: Number(assessment?.landslide ?? 0),
  [ClimateHazard.EROSION]: Number(assessment?.erosion ?? 0),
});

const formatNumber = (value: number): string =>
  new Intl.NumberFormat('en-CA', { maximumFractionDigits: 0 }).format(value);

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
  }).format(value);

export const ResilienceMap: React.FC = () => {
  const [assets, setAssets] = useState<ResilienceAsset[]>([]);
  const [hazards, setHazards] = useState<HazardAssessment[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [selectedScenario, setSelectedScenario] = useState<string>('current_2c');
  const [timeHorizon, setTimeHorizon] = useState<number>(20);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isFallbackData, setIsFallbackData] = useState<boolean>(false);

  const loadFallbackData = useCallback(async (reason?: string) => {
    const fallbackAssetsRaw = await realDataService.getInfrastructureAssets();

    const buildHazardSet = (
      base: Record<ClimateHazard, number>,
      multiplier: number,
    ) => {
      return Object.entries(base).reduce<Record<ClimateHazard, number>>((acc, [hazard, value]) => {
        acc[hazard as ClimateHazard] = Math.min(
          100,
          Math.max(0, Math.round((value as number) * multiplier)),
        );
        return acc;
      }, {} as Record<ClimateHazard, number>);
    };

    const fallbackAssets: ResilienceAsset[] = fallbackAssetsRaw.map((asset, index) => ({
      asset_uuid: asset.id,
      id: asset.id,
      name: asset.name,
      asset_type: asset.asset_type,
      assetType: mapAssetType(asset.asset_type),
      latitude: asset.location.latitude,
      longitude: asset.location.longitude,
      currentValue: asset.capacity_mw * 1_000_000,
      dependents: Math.max(0, Math.round(asset.capacity_mw * 1200)),
      currentCondition: asset.condition_score,
      vulnerability_score: null,
      adaptation_cost: asset.resilience_measures?.reduce((sum, measure) => sum + (measure.cost_cad ?? 0), 0) ?? null,
      population_served: null,
      climate_region: asset.location.province,
    }));

    const hazardsForAssets: HazardAssessment[] = fallbackAssetsRaw.flatMap((asset) => {
      const provinceKey = (asset.location.province || '').toLowerCase();
      const baseProfile = provinceKey.includes('british columbia')
        ? DefaultClimateHazards.interiorBC
        : DefaultClimateHazards.coastalOntario;

      const scenarioProfiles: Record<string, Record<ClimateHazard, number>> = {
        current_2c: baseProfile,
        high_emissions_4c: buildHazardSet(baseProfile, 1.2),
        ambitious_1_5c: buildHazardSet(baseProfile, 0.8),
      };

      return Object.entries(scenarioProfiles).flatMap(([scenarioKey, values]) =>
        TIME_HORIZONS.map((horizon) => {
          const horizonMultiplier = 1 + (horizon - 20) / 40; // scale relative risk over time horizons
          const horizonValues = buildHazardSet(values, horizonMultiplier);

          return {
            asset_id: asset.id,
            scenario: scenarioKey,
            time_horizon_years: horizon,
            flooding: horizonValues[ClimateHazard.FLOODING] ?? 0,
            wildfire: horizonValues[ClimateHazard.WILDFIRE] ?? 0,
            hurricane: horizonValues[ClimateHazard.HURRICANE] ?? 0,
            sea_level_rise: horizonValues[ClimateHazard.SEA_LEVEL_RISE] ?? 0,
            extreme_heat: horizonValues[ClimateHazard.EXTREME_HEAT] ?? 0,
            drought: horizonValues[ClimateHazard.DROUGHT] ?? 0,
            landslide: horizonValues[ClimateHazard.LANDSLIDE] ?? 0,
            erosion: horizonValues[ClimateHazard.EROSION] ?? 0,
            overall_risk: undefined,
            generated_at: new Date().toISOString(),
          };
        }),
      );
    });

    setAssets(fallbackAssets);
    setHazards(hazardsForAssets);
    setSelectedAssetId((prev) => prev || (fallbackAssets[0]?.asset_uuid ?? ''));
    setError(
      reason ||
        'Using locally generated resilience dataset while Supabase APIs are unavailable.'
    );
    setIsFallbackData(true);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      setIsFallbackData(false);

      if (!isEdgeFetchEnabled()) {
        await loadFallbackData();
        setLoading(false);
        return;
      }
      try {
        const [assetsResponse, hazardsResponse] = await Promise.all([
          fetchEdgeJson(['api-v2-resilience-assets']),
          fetchEdgeJson(['api-v2-resilience-hazards']),
        ]);

        const assetRows: ResilienceAsset[] = (Array.isArray(assetsResponse.json?.assets)
          ? assetsResponse.json.assets
          : Array.isArray(assetsResponse.json)
          ? assetsResponse.json
          : []
        ).map((row: any, index: number) => {
          const assetUuid = String(row.asset_uuid ?? row.id ?? `asset-${index}`);
          return {
            asset_uuid: assetUuid,
            id: assetUuid,
            name: row.name ?? row.asset_name ?? 'Unknown asset',
            asset_type: row.asset_type ?? row.type ?? null,
            assetType: mapAssetType(row.asset_type ?? row.type),
            latitude: Number(row.latitude ?? row.lat ?? 0),
            longitude: Number(row.longitude ?? row.lng ?? 0),
            currentValue: Number(row.current_value ?? row.valuation ?? 0),
            dependents: Number(row.dependents ?? row.population_served ?? 0),
            currentCondition: Number(row.current_condition ?? row.condition_score ?? 7),
            vulnerability_score: row.vulnerability_score ?? null,
            adaptation_cost: row.adaptation_cost ?? null,
            population_served: row.population_served ?? null,
            climate_region: row.climate_region ?? null,
          };
        });

        const hazardRows: HazardAssessment[] = (Array.isArray(hazardsResponse.json?.hazards)
          ? hazardsResponse.json.hazards
          : Array.isArray(hazardsResponse.json)
          ? hazardsResponse.json
          : []
        ).map((row: any) => ({
          asset_id: String(row.asset_uuid ?? row.asset_id ?? row.asset ?? ''),
          scenario: String(row.scenario ?? row.climate_scenario ?? 'current_2c').toLowerCase(),
          time_horizon_years: Number(row.time_horizon_years ?? row.time_horizon ?? 20),
          flooding: row.flooding ?? 0,
          wildfire: row.wildfire ?? 0,
          hurricane: row.hurricane ?? 0,
          sea_level_rise: row.sea_level_rise ?? 0,
          extreme_heat: row.extreme_heat ?? 0,
          drought: row.drought ?? 0,
          landslide: row.landslide ?? 0,
          erosion: row.erosion ?? 0,
          overall_risk: row.overall_risk ?? row.overall_score ?? 0,
          generated_at: row.generated_at,
        }));

        setAssets(assetRows);
        setHazards(hazardRows);

        if (!selectedAssetId && assetRows.length > 0) {
          setSelectedAssetId(assetRows[0].asset_uuid);
        }
        setIsFallbackData(false);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const isCorsFailure = /failed to fetch/i.test(message) || /cors/i.test(message);
        const is500Error = /500/.test(message);
        
        const fallbackReason = isCorsFailure
          ? 'Supabase Edge denied the resilience request (likely CORS or auth). Using local resilience dataset instead.'
          : is500Error
          ? 'API temporarily unavailable. Using local resilience dataset instead.'
          : undefined;

        // Use warn instead of error for expected fallback scenarios
        if (isCorsFailure || is500Error) {
          console.warn('ℹ️ Resilience API unavailable, using local data (this is normal in development):', message);
        } else {
          console.error('Failed to load resilience datasets', err);
        }

        await loadFallbackData(fallbackReason);
      } finally {
        setLoading(false);
      }
    };

    loadData();
    // We only need to load once on mount; dependencies intentionally left empty.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadFallbackData]);

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.asset_uuid === selectedAssetId) ?? null,
    [assets, selectedAssetId]
  );

  const selectedHazard = useMemo(() => {
    if (!selectedAsset) return null;
    const assetKey = selectedAsset.asset_uuid;
    return (
      hazards.find(
        (row) =>
          row.asset_id === assetKey &&
          row.scenario === selectedScenario &&
          row.time_horizon_years === timeHorizon
      ) ?? null
    );
  }, [hazards, selectedAsset, selectedScenario, timeHorizon]);

  const hazardRecord = useMemo(() => buildHazardRecord(selectedHazard), [selectedHazard]);

  const analysis = useMemo(() => {
    if (!selectedAsset) return null;

    const assetForEngine = {
      id: selectedAsset.asset_uuid,
      name: selectedAsset.name,
      assetType: selectedAsset.assetType,
      currentCondition: selectedAsset.currentCondition,
      latitude: selectedAsset.latitude,
      longitude: selectedAsset.longitude,
      criticalDependents: Math.max(
        selectedAsset.dependents ?? selectedAsset.population_served ?? 0,
        0
      ),
    };

    const assessment = resilienceEngine.assessOverallResilience(assetForEngine, hazardRecord);

    return {
      asset: selectedAsset,
      hazardRecord,
      assessment,
    };
  }, [selectedAsset, hazardRecord]);

  const hazardChartData = useMemo(
    () =>
      Object.entries(analysis?.hazardRecord ?? {}).map(([key, value]) => ({
        hazard: key.replace(/_/g, ' ').toUpperCase(),
        risk: value,
      })),
    [analysis]
  );

  const heatmapData = useMemo(() => {
    return assets
      .map((asset) => {
        const hazardRow = hazards.find(
          (row) =>
            row.asset_id === asset.asset_uuid &&
            row.scenario === selectedScenario &&
            row.time_horizon_years === timeHorizon
        );
        const record = buildHazardRecord(hazardRow);
        const assetForEngine = {
          id: asset.asset_uuid,
          name: asset.name,
          assetType: asset.assetType,
          currentCondition: asset.currentCondition,
          latitude: asset.latitude,
          longitude: asset.longitude,
          criticalDependents: Math.max(asset.dependents ?? asset.population_served ?? 0, 0),
        };
        const result = resilienceEngine.assessOverallResilience(assetForEngine, record);

        const rawType = asset.asset_type ?? asset.assetType;
        const typeLabel = typeof rawType === 'string' ? rawType : asset.assetType;

        return {
          x: asset.longitude,
          y: asset.latitude,
          risk: result.overallScore,
          name: asset.name,
          type: typeLabel.toString().replace(/_/g, ' ').toUpperCase(),
        };
      })
      .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
  }, [assets, hazards, selectedScenario, timeHorizon]);

  const scenarioComparison = useMemo(() => {
    if (!selectedAsset) return [];

    return Object.entries(SCENARIOS).map(([scenarioKey, meta]) => {
      const hazardRow = hazards.find(
        (row) =>
          row.asset_id === selectedAsset.asset_uuid &&
          row.scenario === scenarioKey &&
          row.time_horizon_years === timeHorizon
      );
      const record = buildHazardRecord(hazardRow);
      const assetForEngine = {
        id: selectedAsset.asset_uuid,
        name: selectedAsset.name,
        assetType: selectedAsset.assetType,
        currentCondition: selectedAsset.currentCondition,
        latitude: selectedAsset.latitude,
        longitude: selectedAsset.longitude,
        criticalDependents: Math.max(
          selectedAsset.dependents ?? selectedAsset.population_served ?? 0,
          0
        ),
      };
      const assessment = resilienceEngine.assessOverallResilience(assetForEngine, record);
      return {
        scenario: meta.label,
        risk: assessment.overallScore,
      };
    });
  }, [selectedAsset, hazards, timeHorizon]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <span className="text-slate-600">Loading resilience insights…</span>
      </div>
    );
  }

  if (!analysis || !selectedAsset) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[320px] space-y-3">
        <Shield className="h-10 w-10 text-slate-400" />
        <span className="text-slate-600">No resilience data available yet.</span>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    );
  }

  const dependentCount = Math.max(
    analysis.asset.dependents ?? analysis.asset.population_served ?? 0,
    0
  );
  const adaptationLower = analysis.asset.currentValue > 0 ? analysis.asset.currentValue * 0.1 : 0;
  const adaptationUpper = analysis.asset.currentValue > 0 ? analysis.asset.currentValue * 0.3 : 0;
  const scenarioMeta = SCENARIOS[selectedScenario];
  const riskInfo = ResilienceUtils.getRiskLevelInfo(analysis.assessment.riskLevel);

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex items-center space-x-4 mb-4">
          <div className="bg-red-500 p-3 rounded-lg">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Infrastructure Resilience Map</h1>
            <p className="text-slate-600">
              Live risk assessments across climate scenarios for critical energy infrastructure.
            </p>
          </div>
        </div>

        {error && (
          <div
            className={
              isFallbackData
                ? 'alert-banner-warning mb-4'
                : 'bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4'
            }
          >
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Climate Scenario</label>
            <select
              value={selectedScenario}
              onChange={(event) => setSelectedScenario(event.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(SCENARIOS).map(([key, meta]) => (
                <option key={key} value={key}>
                  {meta.label}
                </option>
              ))}
            </select>
            {scenarioMeta && (
              <p className="text-xs text-slate-500 mt-1">{scenarioMeta.description}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Time Horizon</label>
            <select
              value={timeHorizon}
              onChange={(event) => setTimeHorizon(Number(event.target.value))}
              className="w-full border border-slate-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
            >
              {TIME_HORIZONS.map((value) => (
                <option key={value} value={value}>
                  {value} Years
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Critical Asset</label>
            <select
              value={selectedAssetId}
              onChange={(event) => setSelectedAssetId(event.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
            >
              {assets.map((asset) => (
                <option key={asset.asset_uuid} value={asset.asset_uuid}>
                  {asset.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-slate-50 rounded-lg p-4 max-w-3xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-800">
                {analysis.assessment.overallScore}
              </div>
              <div className="text-sm text-slate-600">Risk Score</div>
            </div>
            <div className="text-center">
              <div className={`text-xl font-semibold ${riskInfo.className}`}>
                {riskInfo.description}
              </div>
              <div className="text-sm text-slate-600">Risk Level</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-800">{formatNumber(dependentCount)}</div>
              <div className="text-sm text-slate-600">People Dependent</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <div className="card">
          <div className="p-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center">
              <MapPin className="h-5 w-5 mr-2 text-blue-600" />
              Infrastructure Vulnerability Map
            </h3>
          </div>
          <div className="p-4">
            <div className="bg-slate-100 rounded-lg p-6 space-y-2">
              {heatmapData.length === 0 && (
                <div className="text-center text-slate-500 text-sm">No geographic data available.</div>
              )}
              {heatmapData.map((point, index) => (
                <div
                  key={`${point.name}-${index}`}
                  className="flex items-center justify-between p-3 bg-white rounded-lg"
                  style={{
                    borderLeft: `4px solid ${
                      point.risk >= 80
                        ? '#ef4444'
                        : point.risk >= 60
                        ? '#f97316'
                        : point.risk >= 40
                        ? '#f59e0b'
                        : '#22c55e'
                    }`,
                  }}
                >
                  <div>
                    <div className="font-medium text-slate-800">{point.name}</div>
                    <div className="text-sm text-slate-600">{point.type}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-slate-800">{point.risk}</div>
                    <div className="text-xs text-slate-500">Risk Score</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 flex items.CENTER">
              <Zap className="h-5 w-5 mr-2 text-purple-600" />
              Scenario Comparison
            </h3>
          </div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={scenarioComparison}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="scenario" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="risk" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-2 text-sm text-slate-600">
              Risk scores for {analysis.asset.name} across climate scenarios at {timeHorizon} years.
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center">
              <Eye className="h-5 w-5 mr-2 text-green-600" />
              AI Resilience Insights
            </h3>
          </div>
          <div className="p-4 space-y-3">
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="font-medium text-green-800 mb-1">Priority Reconnections</div>
              <div className="text-sm text-green-700">
                {analysis.assessment.riskLevel === 'high' || analysis.assessment.riskLevel === 'critical'
                  ? `Immediate resilience investment recommended for ${analysis.asset.name}. Prioritise redundancy, flood-hardening, and rapid response plans.`
                  : `Risk is manageable; maintain monitoring cadence and schedule preventative maintenance.`}
              </div>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="font-medium text-blue-800 mb-1">Adaptation Budget Envelope</div>
              <div className="text-sm text-blue-700">
                Estimated adaptation cost range: {formatCurrency(adaptationLower)} – {formatCurrency(adaptationUpper)}
                {' '}over {timeHorizon} years.
              </div>
            </div>
          </div>
        </div>

        <div className="card xl:col-span-3">
          <div className="p-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800">Climate Hazard Breakdown</h3>
          </div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={hazardChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hazard" angle={-35} textAnchor="end" height={80} />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="risk" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 xl:col-span-3">
          <div className="p-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800">Hazard Hotspots</h3>
          </div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={320}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="x" name="Longitude" unit="°" />
                <YAxis dataKey="y" name="Latitude" unit="°" />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Legend />
                <Scatter name="Assets" data={heatmapData} fill="#f97316" />
              </ScatterChart>
            </ResponsiveContainer>
            <div className="mt-2 text-sm text-slate-500">
              Risk hotspot map derived from Supabase resilience assessments (higher values indicate greater risk).
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResilienceMap;
