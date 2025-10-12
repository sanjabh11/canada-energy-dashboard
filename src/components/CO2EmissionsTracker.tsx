/**
 * Real-Time CO2 Emissions Tracker
 * 
 * Displays live CO2 emissions from electricity generation.
 * Calculates emissions from provincial generation mix using standard emission factors.
 * Phase III.0 - High Impact (2 hours, 95/100 ROI)
 * 
 * Data Source: NRCan emission factors + Provincial Generation stream
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Leaf, TrendingDown, TrendingUp, AlertCircle, Download, Info } from 'lucide-react';

interface GenerationSource {
  source_type: string;
  capacity_mw: number;
  percentage: number;
}

interface CO2Data {
  total_co2_tonnes_hour: number;
  total_co2_kg_hour: number;
  fossil_co2: number;
  renewable_co2: number;
  intensity_kg_per_mwh: number;
  breakdown: Array<{
    source: string;
    mw: number;
    co2_kg: number;
    percentage: number;
  }>;
  trend: 'up' | 'down' | 'stable';
  comparison_to_avg: number;
}

interface CO2EmissionsTrackerProps {
  generationData?: GenerationSource[];
  compact?: boolean;
  showBreakdown?: boolean;
}

// Emission factors in kg CO2 per MWh (from NRCan, EPA, IPCC data)
const EMISSION_FACTORS: Record<string, number> = {
  coal: 820,
  'natural gas': 490,
  'natural_gas': 490,
  gas: 490,
  oil: 778,
  petroleum: 778,
  diesel: 778,
  nuclear: 12,
  hydro: 24,
  hydroelectric: 24,
  wind: 11,
  solar: 48,
  biomass: 230,
  geothermal: 38,
  'battery storage': 0, // Assuming charged from grid mix
  other: 400 // Conservative estimate
};

// Canadian national average for comparison (kg CO2/MWh)
const CANADIAN_AVERAGE_INTENSITY = 130;

export const CO2EmissionsTracker: React.FC<CO2EmissionsTrackerProps> = ({
  generationData = [],
  compact = false,
  showBreakdown = true
}) => {
  const [historicalData, setHistoricalData] = useState<number[]>([]);
  const [showInfo, setShowInfo] = useState(false);

  const co2Data = useMemo<CO2Data>(() => {
    // Filter out UNCLASSIFIED/UNKNOWN/UNSPECIFIED sources
    const validMix = (generationData ?? []).filter(s => 
      !['UNCLASSIFIED', 'UNKNOWN', 'UNSPECIFIED'].includes((s.source_type ?? '').toUpperCase())
    );

    if (validMix.length === 0) {
      return {
        total_co2_tonnes_hour: 0,
        total_co2_kg_hour: 0,
        fossil_co2: 0,
        renewable_co2: 0,
        intensity_kg_per_mwh: 0,
        breakdown: [],
        trend: 'stable',
        comparison_to_avg: 0
      };
    }

    const totalMW = validMix.reduce((sum, s) => sum + s.capacity_mw, 0);
    
    // Never compute CO2 against zero generation
    if (totalMW <= 0) {
      return {
        total_co2_tonnes_hour: 0,
        total_co2_kg_hour: 0,
        fossil_co2: 0,
        renewable_co2: 0,
        intensity_kg_per_mwh: 0,
        breakdown: [],
        trend: 'stable',
        comparison_to_avg: 0
      };
    }
    
    const breakdown = validMix.map(source => {
      const sourceType = source.source_type.toLowerCase().trim();
      const emissionFactor = EMISSION_FACTORS[sourceType] || EMISSION_FACTORS['other'];
      const co2_kg = source.capacity_mw * emissionFactor;
      
      return {
        source: source.source_type,
        mw: source.capacity_mw,
        co2_kg,
        percentage: source.percentage
      };
    });

    const total_co2_kg_hour = breakdown.reduce((sum, b) => sum + b.co2_kg, 0);
    const total_co2_tonnes_hour = total_co2_kg_hour / 1000;
    
    // Calculate fossil vs renewable
    const fossilSources = ['coal', 'natural gas', 'natural_gas', 'gas', 'oil', 'petroleum', 'diesel'];
    const fossil_co2 = breakdown
      .filter(b => fossilSources.includes(b.source.toLowerCase().trim()))
      .reduce((sum, b) => sum + b.co2_kg, 0);
    const renewable_co2 = total_co2_kg_hour - fossil_co2;
    
    // Emission intensity (kg CO2 per MWh)
    const intensity_kg_per_mwh = totalMW > 0 ? total_co2_kg_hour / totalMW : 0;
    
    // Comparison to Canadian average
    const comparison_to_avg = ((intensity_kg_per_mwh - CANADIAN_AVERAGE_INTENSITY) / CANADIAN_AVERAGE_INTENSITY) * 100;
    
    // Determine trend
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (historicalData.length > 0) {
      const avgHistorical = historicalData.reduce((sum, v) => sum + v, 0) / historicalData.length;
      const change = ((total_co2_tonnes_hour - avgHistorical) / avgHistorical) * 100;
      if (change > 5) trend = 'up';
      else if (change < -5) trend = 'down';
    }

    return {
      total_co2_tonnes_hour,
      total_co2_kg_hour,
      fossil_co2,
      renewable_co2,
      intensity_kg_per_mwh,
      breakdown: breakdown.sort((a, b) => b.co2_kg - a.co2_kg),
      trend,
      comparison_to_avg
    };
  }, [generationData]);

  // Track historical data for trend
  useEffect(() => {
    if (co2Data.total_co2_tonnes_hour > 0) {
      setHistoricalData(prev => [...prev.slice(-23), co2Data.total_co2_tonnes_hour]);
    }
  }, [co2Data.total_co2_tonnes_hour]);

  // Return unavailable card if no valid data
  if (co2Data.total_co2_tonnes_hour === 0 && co2Data.intensity_kg_per_mwh === 0) {
    return (
      <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Leaf className="h-5 w-5 text-gray-400" />
          <div className="text-sm font-semibold text-gray-700">CO₂ Emissions</div>
        </div>
        <div className="text-center py-4">
          <div className="text-gray-400 text-lg font-bold">Data unavailable</div>
          <div className="text-xs text-gray-500 mt-1">No valid generation data</div>
        </div>
      </div>
    );
  }

  const getIntensityColor = (intensity: number): string => {
    if (intensity < 100) return 'text-green-600';
    if (intensity < 300) return 'text-yellow-600';
    if (intensity < 600) return 'text-orange-600';
    return 'text-red-600';
  };

  const getIntensityBgColor = (intensity: number): string => {
    if (intensity < 100) return 'bg-green-50 border-green-200';
    if (intensity < 300) return 'bg-yellow-50 border-yellow-200';
    if (intensity < 600) return 'bg-orange-50 border-orange-200';
    return 'bg-red-50 border-red-200';
  };

  if (compact) {

    return (
      <div className={`${getIntensityBgColor(co2Data.intensity_kg_per_mwh)} border-2 rounded-lg p-4`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Leaf className="h-5 w-5 text-gray-600" />
            <div className="text-sm font-semibold text-gray-700">CO₂ Emissions</div>
          </div>
          <div className={`text-lg font-bold ${getIntensityColor(co2Data.intensity_kg_per_mwh)}`}>
            {co2Data.total_co2_tonnes_hour.toFixed(1)} t/h
          </div>
        </div>
        <div className="text-xs text-gray-600">
          Intensity: {Math.round(co2Data.intensity_kg_per_mwh)} kg/MWh
        </div>
      </div>
    );
  }

  // Full view - show "no data" state
  const hasValidData = generationData.length > 0 && 
    generationData.reduce((sum, s) => sum + s.capacity_mw, 0) > 0;

  if (compact) {
    if (!hasValidData) {
      return (
        <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="text-gray-400" size={20} />
            <h3 className="font-semibold text-gray-700">CO₂ Emissions</h3>
          </div>
          <div className="text-sm text-gray-500">
            Data Unavailable
          </div>
          <div className="text-xs text-gray-400 mt-1">
            Waiting for generation data...
          </div>
        </div>
      );
    }
    
    return (
      <div className={`${getIntensityBgColor(co2Data.intensity_kg_per_mwh)} border-2 rounded-lg p-4`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Leaf className={getIntensityColor(co2Data.intensity_kg_per_mwh)} size={20} />
            <h3 className="font-semibold text-slate-900">CO₂ Emissions</h3>
          </div>
          {co2Data.trend === 'up' && <TrendingUp className="text-red-600" size={16} />}
          {co2Data.trend === 'down' && <TrendingDown className="text-green-600" size={16} />}
        </div>
        
        <div className="space-y-1">
          <div className={`text-2xl font-bold ${getIntensityColor(co2Data.intensity_kg_per_mwh)}`}>
            {co2Data.total_co2_tonnes_hour.toFixed(1)}
            <span className="text-sm font-normal ml-1">tonnes/h</span>
          </div>
          <div className="text-xs text-slate-600">
            Intensity: {co2Data.intensity_kg_per_mwh.toFixed(0)} kg/MWh
          </div>
        </div>
      </div>
    );
  }

  // Full view - show "no data" state
  if (!hasValidData) {
    return (
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-gray-50 border-b-2 border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <AlertCircle className="text-gray-400" size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-700">CO₂ Emissions Tracker</h2>
                <p className="text-sm text-gray-500">Real-time carbon intensity monitoring</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
            <AlertCircle className="mx-auto text-gray-300 mb-4" size={48} />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Data Unavailable</h3>
            <p className="text-gray-500 mb-4">
              CO₂ emissions cannot be calculated without generation data.
            </p>
            <p className="text-sm text-gray-400">
              Waiting for provincial generation mix data to load...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className={`${getIntensityBgColor(co2Data.intensity_kg_per_mwh)} border-b-2 p-6`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`${getIntensityBgColor(co2Data.intensity_kg_per_mwh)} p-3 rounded-xl border-2`}>
              <Leaf className={getIntensityColor(co2Data.intensity_kg_per_mwh)} size={28} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Real-Time CO₂ Emissions</h2>
              <p className="text-sm text-slate-600">Live carbon footprint from electricity generation</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInfo(!showInfo)}
              className="p-2 hover:bg-white/50 rounded-lg transition-colors"
              aria-label="Show info"
            >
              <Info size={20} className="text-slate-600" />
            </button>
            <button
              onClick={exportData}
              className="flex items-center gap-2 px-3 py-2 bg-white text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm"
            >
              <Download size={16} />
              Export
            </button>
          </div>
        </div>

        {/* Info Panel */}
        {showInfo && (
          <div className="bg-white border-2 border-slate-200 rounded-lg p-4 mb-4">
            <h4 className="font-semibold text-slate-900 mb-2">About CO₂ Emission Calculations</h4>
            <ul className="text-xs text-slate-600 space-y-1">
              <li>• Emission factors from NRCan, EPA, and IPCC lifecycle assessments</li>
              <li>• Values include construction, operation, and decommissioning</li>
              <li>• Canadian grid average: {CANADIAN_AVERAGE_INTENSITY} kg CO₂/MWh</li>
              <li>• Real-time calculations based on current generation mix</li>
            </ul>
          </div>
        )}

        {/* Main Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 border-2 border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <Leaf className={getIntensityColor(co2Data.intensity_kg_per_mwh)} size={20} />
              <span className="text-sm font-medium text-slate-700">Total Emissions</span>
            </div>
            <div className={`text-3xl font-bold ${getIntensityColor(co2Data.intensity_kg_per_mwh)}`}>
              {co2Data.total_co2_tonnes_hour.toFixed(2)}
            </div>
            <div className="text-xs text-slate-600 mt-1">tonnes CO₂ per hour</div>
            {co2Data.trend !== 'stable' && (
              <div className="flex items-center gap-1 mt-2">
                {co2Data.trend === 'up' ? (
                  <>
                    <TrendingUp size={14} className="text-red-600" />
                    <span className="text-xs text-red-600 font-medium">Increasing</span>
                  </>
                ) : (
                  <>
                    <TrendingDown size={14} className="text-green-600" />
                    <span className="text-xs text-green-600 font-medium">Decreasing</span>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg p-4 border-2 border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="text-orange-600" size={20} />
              <span className="text-sm font-medium text-slate-700">Intensity</span>
            </div>
            <div className={`text-3xl font-bold ${getIntensityColor(co2Data.intensity_kg_per_mwh)}`}>
              {co2Data.intensity_kg_per_mwh.toFixed(0)}
            </div>
            <div className="text-xs text-slate-600 mt-1">kg CO₂ per MWh</div>
            <div className="mt-2">
              <span className={`text-xs font-medium ${
                co2Data.comparison_to_avg > 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {co2Data.comparison_to_avg > 0 ? '+' : ''}{co2Data.comparison_to_avg.toFixed(0)}% vs. national avg
              </span>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border-2 border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <Leaf className="text-green-600" size={20} />
              <span className="text-sm font-medium text-slate-700">Clean Energy Impact</span>
            </div>
            <div className="space-y-2">
              <div>
                <div className="text-sm text-slate-600">Fossil CO₂</div>
                <div className="text-lg font-bold text-red-600">
                  {(co2Data.fossil_co2 / 1000).toFixed(2)} t/h
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-600">Renewable CO₂</div>
                <div className="text-lg font-bold text-green-600">
                  {(co2Data.renewable_co2 / 1000).toFixed(2)} t/h
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown Table */}
      {showBreakdown && co2Data.breakdown.length > 0 && (
        <div className="p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Emissions Breakdown by Source</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="text-left py-2 px-3 text-slate-700 font-semibold">Source</th>
                  <th className="text-right py-2 px-3 text-slate-700 font-semibold">Capacity (MW)</th>
                  <th className="text-right py-2 px-3 text-slate-700 font-semibold">CO₂ (kg/h)</th>
                  <th className="text-right py-2 px-3 text-slate-700 font-semibold">% of Total</th>
                  <th className="text-right py-2 px-3 text-slate-700 font-semibold">Impact</th>
                </tr>
              </thead>
              <tbody>
                {co2Data.breakdown.map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-3 font-medium text-slate-900 capitalize">
                      {item.source}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-700">
                      {item.mw.toFixed(1)}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-700 font-medium">
                      {item.co2_kg.toFixed(1)}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-600">
                      {item.percentage.toFixed(1)}%
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            item.co2_kg > 100000 ? 'bg-red-500' :
                            item.co2_kg > 50000 ? 'bg-orange-500' :
                            item.co2_kg > 10000 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min((item.co2_kg / co2Data.total_co2_kg_hour) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold border-t-2 border-slate-300">
                  <td className="py-3 px-3 text-slate-900">Total</td>
                  <td className="py-3 px-3 text-right text-slate-900">
                    {generationData.reduce((sum, s) => sum + s.capacity_mw, 0).toFixed(1)}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-900">
                    {co2Data.total_co2_kg_hour.toFixed(1)}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-600">100.0%</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default CO2EmissionsTracker;
