/**
 * Emissions Impact Calculator
 * 
 * Converts avoided MWh to CO₂ emissions avoided.
 * Uses conservative factors with uncertainty ranges.
 */

import React from 'react';
import { Leaf, TrendingDown, Info } from 'lucide-react';
import { MethodologyTooltip } from './MethodologyTooltip';

interface EmissionsImpactProps {
  avoidedMWh: number;
  province?: string;
  showRange?: boolean;
}

// CO₂ emission factors by province (kg CO₂/MWh)
// Source: Environment and Climate Change Canada (ECCC)
const EMISSION_FACTORS = {
  ON: {
    grid_average: 30,  // Ontario has very clean grid (nuclear + hydro)
    marginal: 450,     // Gas peaker plants
    conservative: 150  // Conservative estimate
  },
  AB: {
    grid_average: 790,
    marginal: 820,
    conservative: 790
  },
  SK: {
    grid_average: 730,
    marginal: 760,
    conservative: 730
  },
  BC: {
    grid_average: 12,
    marginal: 400,
    conservative: 100
  },
  QC: {
    grid_average: 1.5,
    marginal: 350,
    conservative: 50
  },
  DEFAULT: {
    grid_average: 130,  // Canadian average
    marginal: 450,
    conservative: 200
  }
};

export const EmissionsImpactCalculator: React.FC<EmissionsImpactProps> = ({
  avoidedMWh,
  province = 'ON',
  showRange = true
}) => {
  const factors = EMISSION_FACTORS[province as keyof typeof EMISSION_FACTORS] || EMISSION_FACTORS.DEFAULT;
  
  // Calculate emissions avoided (tonnes CO₂)
  const conservativeEmissions = (avoidedMWh * factors.conservative) / 1000;
  const gridAverageEmissions = (avoidedMWh * factors.grid_average) / 1000;
  const marginalEmissions = (avoidedMWh * factors.marginal) / 1000;
  
  // Calculate equivalent metrics
  const carsOffRoad = Math.round(conservativeEmissions / 4.6); // Average car: 4.6 tonnes CO₂/year
  const treesPlanted = Math.round(conservativeEmissions / 0.021); // Average tree: 21 kg CO₂/year
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-b-2 border-green-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-xl border-2 border-green-200">
              <Leaf className="text-green-600" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Emissions Impact</h3>
              <p className="text-sm text-gray-600">CO₂ avoided from curtailment reduction</p>
            </div>
          </div>

          <MethodologyTooltip
            title="Emissions Calculation"
            formula="CO₂ Avoided = MWh Saved × Emission Factor"
            source="Environment and Climate Change Canada (ECCC)"
            period="Annual emission factors"
            assumptions={[
              `Conservative factor: ${factors.conservative} kg CO₂/MWh`,
              `Grid average: ${factors.grid_average} kg CO₂/MWh`,
              `Marginal (peaker): ${factors.marginal} kg CO₂/MWh`,
              'Assumes displaced generation would be fossil-based',
              'Does not account for transmission losses'
            ]}
            sensitivity={{
              low: gridAverageEmissions,
              median: conservativeEmissions,
              high: marginalEmissions,
              unit: ' tonnes CO₂'
            }}
          />
        </div>
      </div>

      {/* Main Metric */}
      <div className="p-6">
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 mb-6">
          <div className="text-center">
            <div className="text-sm text-green-700 font-medium mb-2">
              CO₂ Emissions Avoided (Conservative Estimate)
            </div>
            <div className="text-5xl font-bold text-green-600 mb-2">
              {conservativeEmissions.toLocaleString(undefined, { maximumFractionDigits: 1 })}
            </div>
            <div className="text-lg text-green-700">
              tonnes CO₂
            </div>
          </div>
        </div>

        {/* Range Display */}
        {showRange && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown className="text-gray-600" size={18} />
              <span className="font-semibold text-gray-900">Uncertainty Range</span>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                <div className="text-xs text-blue-700 mb-1">Low (Grid Avg)</div>
                <div className="text-xl font-bold text-blue-600">
                  {gridAverageEmissions.toFixed(1)}
                </div>
                <div className="text-xs text-blue-600">tonnes CO₂</div>
              </div>
              
              <div className="bg-green-50 border-2 border-green-300 rounded-lg p-3 text-center">
                <div className="text-xs text-green-700 mb-1 font-medium">Conservative</div>
                <div className="text-xl font-bold text-green-600">
                  {conservativeEmissions.toFixed(1)}
                </div>
                <div className="text-xs text-green-600">tonnes CO₂</div>
              </div>
              
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
                <div className="text-xs text-orange-700 mb-1">High (Marginal)</div>
                <div className="text-xl font-bold text-orange-600">
                  {marginalEmissions.toFixed(1)}
                </div>
                <div className="text-xs text-orange-600">tonnes CO₂</div>
              </div>
            </div>
          </div>
        )}

        {/* Equivalent Metrics */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-3">Equivalent To:</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="text-3xl">🚗</div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{carsOffRoad.toLocaleString()}</div>
                <div className="text-xs text-gray-600">cars off the road for 1 year</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="text-3xl">🌳</div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{treesPlanted.toLocaleString()}</div>
                <div className="text-xs text-gray-600">trees planted and grown for 1 year</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Methodology Note */}
      <div className="bg-blue-50 border-t border-blue-200 p-4">
        <div className="flex items-start gap-2 text-sm text-blue-900">
          <Info size={16} className="mt-0.5 flex-shrink-0" />
          <div>
            <strong>Methodology:</strong> We use a conservative emission factor of {factors.conservative} kg CO₂/MWh
            for {province}, which represents a middle ground between grid average ({factors.grid_average}) and
            marginal/peaker plants ({factors.marginal}). This accounts for the fact that curtailment reduction
            typically displaces fossil-based generation. Range reflects uncertainty in which generation sources
            would have been dispatched. Source: Environment and Climate Change Canada (ECCC) 2024 emission factors.
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Compact badge for inline display
 */
export const EmissionsImpactBadge: React.FC<{
  avoidedMWh: number;
  province?: string;
}> = ({ avoidedMWh, province = 'ON' }) => {
  const factors = EMISSION_FACTORS[province as keyof typeof EMISSION_FACTORS] || EMISSION_FACTORS.DEFAULT;
  const conservativeEmissions = (avoidedMWh * factors.conservative) / 1000;
  
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 border border-green-300 rounded-full">
      <Leaf size={14} className="text-green-700" />
      <span className="text-sm font-medium text-green-900">
        {conservativeEmissions.toFixed(1)} tonnes CO₂ avoided
      </span>
    </div>
  );
};
