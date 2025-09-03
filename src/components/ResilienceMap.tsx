import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter } from 'recharts';
import { MapPin, AlertTriangle, Shield, Zap, Eye, TrendingUp } from 'lucide-react';
import { resilienceEngine, type AssetProfile, ResilienceUtils } from '../lib/resilienceScoring';

// Mock infrastructure data for Phase 2B demonstration
const mockAssets: AssetProfile[] = [
  {
    id: 'electra_01',
    name: 'Metro Downtown Grid',
    latitude: 43.6532,
    longitude: -79.3832,
    assetType: 'power_grid' as any,
    currentValue: 1500000000,
    dependents: 250000,
    criticalityScore: 9.5,
    constructionYear: 1995,
    expectedLifespan: 50,
    currentCondition: 8.2,
    area_sq_km: 45
  },
  {
    id: 'water_01',
    name: 'River Water Treatment',
    latitude: 43.6828,
    longitude: -79.3872,
    assetType: 'water_systems' as any,
    currentValue: 800000000,
    dependents: 180000,
    criticalityScore: 8.7,
    constructionYear: 2005,
    expectedLifespan: 40,
    currentCondition: 8.8,
    area_sq_km: 25
  },
  {
    id: 'road_01',
    name: 'Highway Bridge',
    latitude: 43.735,
    longitude: -79.4408,
    assetType: 'transportation' as any,
    currentValue: 500000000,
    dependents: 95000,
    criticalityScore: 8.2,
    constructionYear: 2010,
    expectedLifespan: 75,
    currentCondition: 7.5,
    area_sq_km: 2
  }
];

// Climate scenario definitions
const climateScenarios = {
  current_2C: {
    name: 'Current Trajectory (+2°C)',
    temperatureIncrease: 2.0,
    seaLevelRise: 0.15,
    description: 'Moderate warming scenario'
  },
  four_degree: {
    name: 'High Emissions (+4°C)',
    temperatureIncrease: 4.0,
    seaLevelRise: 0.65,
    description: 'High risk warming scenario'
  },
  one_five_degree: {
    name: 'Ambitious (+1.5°C)',
    temperatureIncrease: 1.5,
    seaLevelRise: 0.1,
    description: 'Ambitious climate goal'
  }
};

// Hazard profiles for different locations
const getLocationHazards = (scenario: typeof climateScenarios.current_2C, timeHorizon: number = 20) => ({
  flooding: Math.min(100, (scenario.seaLevelRise / 0.5) * 100 + (timeHorizon / 50) * 80),
  wildfire: Math.max(10, timeHorizon / 10 + Math.random() * 20),
  hurricane: Math.max(5, timeHorizon / 25 + Math.random() * 10),
  sea_level_rise: Math.min(100, (scenario.seaLevelRise / 1.0) * 100),
  extreme_heat: Math.min(100, (scenario.temperatureIncrease / 3) * 100),
  drought: Math.max(15, timeHorizon / 30 + Math.random() * 25),
  landslide: Math.max(8, timeHorizon / 20 + Math.random() * 12),
  erosion: Math.min(90, (scenario.seaLevelRise / 0.8) * 100)
});

export const ResilienceMap: React.FC = () => {
  const [selectedAsset, setSelectedAsset] = useState<string | null>('electra_01');
  const [selectedScenario, setSelectedScenario] = useState<keyof typeof climateScenarios>('current_2C');
  const [timeHorizon, setTimeHorizon] = useState<number>(20);
  const [loading, setLoading] = useState(false);

  // Calculate resilience analysis for selected asset
  const assetAnalysis = useMemo(() => {
    if (!selectedAsset) return null;

    const asset = mockAssets.find(a => a.id === selectedAsset);
    if (!asset) return null;

    const scenario = climateScenarios[selectedScenario];
    const hazards = getLocationHazards(scenario, timeHorizon);

    // Format asset for the engine (matches required interface)
    const assetForEngine = {
      id: asset.id,
      name: asset.name,
      assetType: asset.assetType,
      currentCondition: asset.currentCondition,
      latitude: asset.latitude,
      longitude: asset.longitude,
      criticalDependents: asset.dependents
    };

    const assessment = resilienceEngine.assessOverallResilience(assetForEngine, hazards);

    return {
      asset,
      assessment,
      scenario,
      hazards
    };
  }, [selectedAsset, selectedScenario, timeHorizon]);

  // Simulate loading state
  useEffect(() => {
    setLoading(true);
    setTimeout(() => setLoading(false), 500);
  }, [selectedAsset, selectedScenario, timeHorizon]);

  // Generate heat map data points
  const heatMapData = useMemo(() => {
    return mockAssets.map(asset => {
      const scenario = climateScenarios[selectedScenario];
      const hazards = getLocationHazards(scenario, timeHorizon);

      // Format asset for engine
      const assetForEngine = {
        id: asset.id,
        name: asset.name,
        assetType: asset.assetType,
        currentCondition: asset.currentCondition,
        latitude: asset.latitude,
        longitude: asset.longitude,
        criticalDependents: asset.dependents
      };

      const assessment = resilienceEngine.assessOverallResilience(assetForEngine, hazards);

      return {
        x: asset.longitude,
        y: asset.latitude,
        risk: assessment.overallScore,
        name: asset.name,
        type: asset.assetType
      };
    });
  }, [selectedScenario, timeHorizon]);

  // Scenario comparison data
  const scenarioComparison = useMemo(() => {
    if (!selectedAsset) return [];

    const asset = mockAssets.find(a => a.id === selectedAsset);
    if (!asset) return [];

    // Format asset for engine
    const assetForEngine = {
      id: asset.id,
      name: asset.name,
      assetType: asset.assetType,
      currentCondition: asset.currentCondition,
      latitude: asset.latitude,
      longitude: asset.longitude,
      criticalDependents: asset.dependents
    };

    const scenarios: Array<{ scenario: string; risk: number }> = [];

    Object.entries(climateScenarios).forEach(([key, config]) => {
      const hazards = getLocationHazards(config, timeHorizon);
      const assessment = resilienceEngine.assessOverallResilience(assetForEngine, hazards);
      scenarios.push({
        scenario: config.name,
        risk: assessment.overallScore
      });
    });

    return scenarios;
  }, [selectedAsset, timeHorizon]);

  if (!assetAnalysis) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <span className="text-slate-600">Loading resilience analysis...</span>
      </div>
    );
  }

  const { asset, assessment, scenario, hazards } = assetAnalysis;
  const riskInfo = ResilienceUtils.getRiskLevelInfo(assessment.riskLevel);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center space-x-4 mb-4">
          <div className="bg-red-500 p-3 rounded-lg">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Infrastructure Resilience Map</h1>
            <p className="text-slate-600">Interactive vulnerability assessment with climate scenario modeling</p>
          </div>
        </div>

        {/* Scenario Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Climate Scenario
            </label>
            <select
              value={selectedScenario}
              onChange={(e) => setSelectedScenario(e.target.value as keyof typeof climateScenarios)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(climateScenarios).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Time Horizon
            </label>
            <select
              value={timeHorizon}
              onChange={(e) => setTimeHorizon(Number(e.target.value))}
              className="w-full border border-slate-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value={10}>10 Years</option>
              <option value={20}>20 Years</option>
              <option value={30}>30 Years</option>
              <option value={50}>50 Years</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Critical Asset
            </label>
            <select
              value={selectedAsset}
              onChange={(e) => setSelectedAsset(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
            >
              {mockAssets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Current Assessment Summary */}
        <div className="bg-slate-50 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-800">{assessment.overallScore}/100</div>
              <div className="text-sm text-slate-600">Risk Score</div>
            </div>
            <div className="text-center">
              <div className={`text-xl font-semibold ${riskInfo.className}`}>
                {riskInfo.description}
              </div>
              <div className="text-sm text-slate-600">Risk Level</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-800">{asset.dependents.toLocaleString()}</div>
              <div className="text-sm text-slate-600">People Dependent</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Vulnerability Heat Map */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center">
              <MapPin className="h-5 w-5 mr-2 text-blue-600" />
              Infrastructure Vulnerability Map
            </h3>
          </div>
          <div className="p-4">
            {/* Simplified Map Representation */}
            <div className="bg-slate-100 rounded-lg p-6">
              <div className="text-center text-slate-600 mb-4">
                Critical Infrastructure Network
              </div>

              {/* Heat Map Visualization - Simplified */}
              <div className="space-y-2">
                {heatMapData.map((point, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-white rounded-lg"
                    style={{
                      borderLeft: `4px solid ${point.risk > 70 ? '#ef4444' : point.risk > 50 ? '#f59e0b' : '#22c55e'}`
                    }}
                  >
                    <div className="flex-1">
                      <div className="font-medium text-slate-800">{point.name}</div>
                      <div className="text-sm text-slate-600">{point.type.replace('_', ' ').toUpperCase()}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-slate-800">{point.risk}/100</div>
                      <div className="text-xs text-slate-500">Risk Score</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Hazard Analysis */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-red-600" />
              Climate Hazard Analysis
            </h3>
          </div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={Object.entries(hazards).map(([hazard, score]) => ({
                hazard: hazard.replace('_', ' ').toUpperCase(),
                risk: score
              }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hazard" angle={-45} textAnchor="end" height={80} />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="risk" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Scenario Comparison */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center">
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
                <Line
                  type="monotone"
                  dataKey="risk"
                  stroke="#8b5cf6"
                  strokeWidth={3}
                  dot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-2 text-sm text-slate-600">
              Risk scores for {asset.name} across climate scenarios
            </div>
          </div>
        </div>

        {/* AI Resilience Insights */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center">
              <Eye className="h-5 w-5 mr-2 text-green-600" />
              AI Resilience Insights
            </h3>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="font-medium text-green-800 mb-1">Priority Reconnections</div>
                <div className="text-sm text-green-700">
                  {assessment.riskLevel === 'high' || assessment.riskLevel === 'critical'
                    ? `Immediate attention required for ${asset.name}. Recommended adaptations include system redundancy and elevated construction.`
                    : `Moderate risk level suggests monitoring and proactive maintenance schedule.`
                  }
                </div>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="font-medium text-blue-800 mb-1">Cost-Effective Solutions</div>
                <div className="text-sm text-blue-700">
                  Estimated adaptation costs: ${(asset.currentValue * 0.1).toLocaleString()} - ${(asset.currentValue * 0.3).toLocaleString()}
                  over {timeHorizon} years.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};