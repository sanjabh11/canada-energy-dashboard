/**
 * Renewable Penetration Heatmap
 * 
 * Visual heatmap showing renewable energy penetration by province.
 * Color-coded tiles from red (low) to green (high) renewable percentage.
 * Phase III.0 - High Visual Impact (3 hours, 92/100 ROI)
 * 
 * Data Source: Provincial Generation stream
 */

import React, { useMemo, useState } from 'react';
import { Zap, TrendingUp, Award, MapPin, Info, Eye } from 'lucide-react';

interface ProvinceData {
  province: string;
  renewable_mw: number;
  fossil_mw: number;
  total_mw: number;
  renewable_pct: number;
  sources: {
    hydro?: number;
    wind?: number;
    solar?: number;
    biomass?: number;
    nuclear?: number;
    natural_gas?: number;
    coal?: number;
  };
}

interface RenewablePenetrationHeatmapProps {
  provincialData?: ProvinceData[];
  compact?: boolean;
}

// Canadian provinces and territories
const PROVINCES = [
  { code: 'ON', name: 'Ontario', region: 'Central' },
  { code: 'QC', name: 'Quebec', region: 'Central' },
  { code: 'BC', name: 'British Columbia', region: 'West' },
  { code: 'AB', name: 'Alberta', region: 'West' },
  { code: 'SK', name: 'Saskatchewan', region: 'West' },
  { code: 'MB', name: 'Manitoba', region: 'Central' },
  { code: 'NS', name: 'Nova Scotia', region: 'East' },
  { code: 'NB', name: 'New Brunswick', region: 'East' },
  { code: 'PE', name: 'Prince Edward Island', region: 'East' },
  { code: 'NL', name: 'Newfoundland and Labrador', region: 'East' },
  { code: 'YT', name: 'Yukon', region: 'North' },
  { code: 'NT', name: 'Northwest Territories', region: 'North' },
  { code: 'NU', name: 'Nunavut', region: 'North' }
];

export const RenewablePenetrationHeatmap: React.FC<RenewablePenetrationHeatmapProps> = ({
  provincialData = [],
  compact = false
}) => {
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'heatmap' | 'list'>('heatmap');

  const enrichedData = useMemo(() => {
    // Merge PROVINCES with actual data
    return PROVINCES.map(province => {
      const data = provincialData.find(d => 
        d.province.toLowerCase().includes(province.name.toLowerCase()) ||
        province.name.toLowerCase().includes(d.province.toLowerCase())
      );

      if (data) {
        return {
          ...province,
          ...data,
          hasData: true
        };
      }

      // Default/estimated data for provinces without real data
      return {
        ...province,
        renewable_mw: 0,
        fossil_mw: 0,
        total_mw: 0,
        renewable_pct: 0,
        sources: {},
        hasData: false
      };
    });
  }, [provincialData]);

  const getColor = (percentage: number): string => {
    if (percentage >= 90) return '#10b981'; // green-500
    if (percentage >= 75) return '#22c55e'; // green-400
    if (percentage >= 60) return '#84cc16'; // lime-500
    if (percentage >= 45) return '#eab308'; // yellow-500
    if (percentage >= 30) return '#f59e0b'; // amber-500
    if (percentage >= 15) return '#f97316'; // orange-500
    return '#ef4444'; // red-500
  };

  const getColorClass = (percentage: number): string => {
    if (percentage >= 90) return 'bg-green-500 text-white';
    if (percentage >= 75) return 'bg-green-400 text-white';
    if (percentage >= 60) return 'bg-lime-500 text-white';
    if (percentage >= 45) return 'bg-yellow-500 text-slate-900';
    if (percentage >= 30) return 'bg-amber-500 text-slate-900';
    if (percentage >= 15) return 'bg-orange-500 text-white';
    return 'bg-red-500 text-white';
  };

  const getRating = (percentage: number): string => {
    if (percentage >= 90) return 'Excellent';
    if (percentage >= 75) return 'Very Good';
    if (percentage >= 60) return 'Good';
    if (percentage >= 45) return 'Moderate';
    if (percentage >= 30) return 'Fair';
    if (percentage >= 15) return 'Low';
    return 'Very Low';
  };

  const topPerformers = useMemo(() => {
    return enrichedData
      .filter(d => d.hasData)
      .sort((a, b) => b.renewable_pct - a.renewable_pct)
      .slice(0, 3);
  }, [enrichedData]);

  const nationalAverage = useMemo(() => {
    const dataWithValues = enrichedData.filter(d => d.hasData);
    if (dataWithValues.length === 0) return 0;
    
    const totalRenewable = dataWithValues.reduce((sum, d) => sum + d.renewable_mw, 0);
    const totalGeneration = dataWithValues.reduce((sum, d) => sum + d.total_mw, 0);
    
    return totalGeneration > 0 ? (totalRenewable / totalGeneration) * 100 : 0;
  }, [enrichedData]);

  const selectedData = useMemo(() => {
    return enrichedData.find(d => d.name === selectedProvince);
  }, [enrichedData, selectedProvince]);

  if (compact) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-900">Renewable Penetration</h3>
          <Zap className="text-green-600" size={20} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {enrichedData.slice(0, 9).map((province) => (
            <div
              key={province.code}
              className={`${getColorClass(province.renewable_pct)} rounded p-2 text-center cursor-pointer hover:opacity-80 transition-opacity`}
              onClick={() => setSelectedProvince(province.name)}
            >
              <div className="text-xs font-medium">{province.code}</div>
              <div className="text-sm font-bold">{province.renewable_pct.toFixed(0)}%</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-b-2 border-green-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-3 rounded-xl border-2 border-green-200">
              <Zap className="text-green-600" size={28} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Renewable Energy Penetration</h2>
              <p className="text-sm text-slate-600">Provincial renewable share in electricity generation</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode(viewMode === 'heatmap' ? 'list' : 'heatmap')}
              className={`px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                viewMode === 'heatmap' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-white text-slate-700 hover:bg-green-50'
              }`}
            >
              <Eye size={16} className="inline mr-1" />
              {viewMode === 'heatmap' ? 'Heatmap' : 'List'}
            </button>
          </div>
        </div>

        {/* National Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 border-2 border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="text-green-600" size={20} />
              <span className="text-sm font-medium text-slate-700">National Average</span>
            </div>
            <div className="text-3xl font-bold text-green-600">
              {nationalAverage.toFixed(1)}%
            </div>
            <div className="text-xs text-slate-600 mt-1">Renewable share</div>
          </div>

          <div className="bg-white rounded-lg p-4 border-2 border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <Award className="text-yellow-600" size={20} />
              <span className="text-sm font-medium text-slate-700">Top Performer</span>
            </div>
            {topPerformers.length > 0 ? (
              <>
                <div className="text-lg font-bold text-slate-900">
                  {topPerformers[0].name}
                </div>
                <div className="text-sm text-green-600 font-medium">
                  {topPerformers[0].renewable_pct.toFixed(1)}% renewable
                </div>
              </>
            ) : (
              <div className="text-sm text-slate-500">No data available</div>
            )}
          </div>

          <div className="bg-white rounded-lg p-4 border-2 border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="text-blue-600" size={20} />
              <span className="text-sm font-medium text-slate-700">Provinces Tracked</span>
            </div>
            <div className="text-3xl font-bold text-blue-600">
              {enrichedData.filter(d => d.hasData).length}
            </div>
            <div className="text-xs text-slate-600 mt-1">of 13 provinces/territories</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {viewMode === 'heatmap' ? (
          <>
            {/* Color Legend */}
            <div className="mb-6 flex items-center justify-center gap-2 flex-wrap">
              <span className="text-sm text-slate-600 font-medium">Legend:</span>
              {[
                { min: 90, label: '90%+', color: 'bg-green-500' },
                { min: 75, label: '75-89%', color: 'bg-green-400' },
                { min: 60, label: '60-74%', color: 'bg-lime-500' },
                { min: 45, label: '45-59%', color: 'bg-yellow-500' },
                { min: 30, label: '30-44%', color: 'bg-amber-500' },
                { min: 15, label: '15-29%', color: 'bg-orange-500' },
                { min: 0, label: '0-14%', color: 'bg-red-500' }
              ].map(({ label, color }) => (
                <div key={label} className="flex items-center gap-1">
                  <div className={`w-4 h-4 ${color} rounded`}></div>
                  <span className="text-xs text-slate-600">{label}</span>
                </div>
              ))}
            </div>

            {/* Heatmap Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {enrichedData.map((province) => (
                <div
                  key={province.code}
                  onClick={() => setSelectedProvince(province.name)}
                  className={`${getColorClass(province.renewable_pct)} rounded-lg p-4 cursor-pointer hover:shadow-lg transition-all transform hover:scale-105 ${
                    !province.hasData ? 'opacity-50' : ''
                  }`}
                >
                  <div className="text-xs font-medium opacity-90 mb-1">{province.code}</div>
                  <div className="text-2xl font-bold mb-1">
                    {province.renewable_pct.toFixed(1)}%
                  </div>
                  <div className="text-xs opacity-90 truncate">{province.name}</div>
                  {!province.hasData && (
                    <div className="text-xs mt-1 opacity-75">
                      <Info size={10} className="inline mr-1" />
                      No data
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          /* List View */
          <div className="space-y-2">
            {enrichedData
              .filter(d => d.hasData)
              .sort((a, b) => b.renewable_pct - a.renewable_pct)
              .map((province, idx) => (
                <div
                  key={province.code}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
                  onClick={() => setSelectedProvince(province.name)}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="text-lg font-bold text-slate-400 w-8">
                      #{idx + 1}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">{province.name}</div>
                      <div className="text-xs text-slate-600">{province.region} Canada</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">
                        {province.renewable_pct.toFixed(1)}%
                      </div>
                      <div className="text-xs text-slate-600">{getRating(province.renewable_pct)}</div>
                    </div>
                    <div className={`w-12 h-12 ${getColorClass(province.renewable_pct)} rounded-lg flex items-center justify-center`}>
                      <span className="font-bold text-lg">{province.code}</span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Province Detail Modal */}
        {selectedProvince && selectedData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-slate-900">{selectedData.name}</h3>
                <button
                  onClick={() => setSelectedProvince(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ×
                </button>
              </div>

              {selectedData.hasData ? (
                <>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
                      <div className="text-sm text-green-700 font-medium mb-1">Renewable Share</div>
                      <div className="text-3xl font-bold text-green-600">
                        {selectedData.renewable_pct.toFixed(1)}%
                      </div>
                      <div className="text-xs text-slate-600 mt-1">
                        {selectedData.renewable_mw.toFixed(0)} MW
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-lg p-4 border-2 border-slate-200">
                      <div className="text-sm text-slate-700 font-medium mb-1">Total Capacity</div>
                      <div className="text-3xl font-bold text-slate-900">
                        {selectedData.total_mw.toFixed(0)}
                      </div>
                      <div className="text-xs text-slate-600 mt-1">MW installed</div>
                    </div>
                  </div>

                  {Object.keys(selectedData.sources).length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-semibold text-slate-900 mb-3">Generation Mix</h4>
                      <div className="space-y-2">
                        {Object.entries(selectedData.sources)
                          .filter(([_, value]) => value && value > 0)
                          .sort(([, a], [, b]) => (b as number) - (a as number))
                          .map(([source, mw]) => (
                            <div key={source} className="flex items-center justify-between">
                              <span className="text-sm text-slate-700 capitalize">{source.replace('_', ' ')}</span>
                              <div className="flex items-center gap-2">
                                <div className="w-32 bg-slate-200 rounded-full h-2">
                                  <div
                                    className="bg-green-500 h-2 rounded-full"
                                    style={{ width: `${((mw as number) / selectedData.total_mw) * 100}%` }}
                                  ></div>
                                </div>
                                <span className="text-sm font-medium text-slate-900 w-16 text-right">
                                  {(mw as number).toFixed(0)} MW
                                </span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                    <div className="flex items-center gap-2">
                      <Info size={16} className="text-blue-600" />
                      <span className="text-sm text-blue-900">
                        Rating: <strong>{getRating(selectedData.renewable_pct)}</strong>
                        {selectedData.renewable_pct > nationalAverage && (
                          <span className="ml-2 text-green-600">
                            ({(selectedData.renewable_pct - nationalAverage).toFixed(1)}% above national average)
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <Info size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No real-time data available for {selectedData.name}</p>
                  <p className="text-sm mt-2">Data will be displayed when generation mix is available</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RenewablePenetrationHeatmap;
