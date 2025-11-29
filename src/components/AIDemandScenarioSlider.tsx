/**
 * AI Demand Scenario Slider
 * 
 * Interactive slider to simulate AI data center grid load impacts.
 * Shows grid stress, required clean firm power, and emissions impact.
 * 
 * Addresses Gap #14: AI Demand Scenarios Slider (LOW Priority)
 */

import React, { useState, useMemo } from 'react';
import { 
  Cpu, Zap, AlertTriangle, TrendingUp, 
  Leaf, DollarSign, Server, Info,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { HelpButton } from './HelpButton';
import { DataSource } from './ui/DataSource';

interface ScenarioResult {
  gridStress: 'low' | 'moderate' | 'high' | 'critical';
  cleanFirmRequired: number; // GW
  emissionsImpact: number; // Mt CO2e/year
  investmentNeeded: number; // $B
  jobsCreated: number;
  renewableGap: number; // GW shortfall
  nuclearNeeded: number; // GW SMR/nuclear
  storageNeeded: number; // GWh
}

interface AIDemandScenarioSliderProps {
  initialDemand?: number;
  maxDemand?: number;
  showDetails?: boolean;
}

// Canada's current grid capacity context
const CANADA_GRID_CONTEXT = {
  currentCapacity: 150, // GW total installed
  currentPeak: 95, // GW peak demand
  renewableCapacity: 85, // GW hydro + wind + solar
  nuclearCapacity: 14, // GW
  gasCapacity: 25, // GW
  reserveMargin: 0.15, // 15% reserve
  currentAIDemand: 2, // GW estimated current AI/data center load
};

const calculateScenario = (aiDemandGW: number): ScenarioResult => {
  const totalDemand = CANADA_GRID_CONTEXT.currentPeak + aiDemandGW;
  const availableCapacity = CANADA_GRID_CONTEXT.currentCapacity * (1 - CANADA_GRID_CONTEXT.reserveMargin);
  
  // Grid stress calculation
  const utilizationRate = totalDemand / availableCapacity;
  let gridStress: ScenarioResult['gridStress'];
  if (utilizationRate < 0.7) gridStress = 'low';
  else if (utilizationRate < 0.85) gridStress = 'moderate';
  else if (utilizationRate < 0.95) gridStress = 'high';
  else gridStress = 'critical';

  // Clean firm power required (24/7 baseload for AI)
  const cleanFirmRequired = aiDemandGW * 1.2; // 20% buffer for reliability

  // Emissions impact (if met with gas vs clean)
  // Gas emits ~0.4 tCO2/MWh, running 8760 hours/year
  const emissionsIfGas = aiDemandGW * 1000 * 8760 * 0.4 / 1000000; // Mt CO2e/year

  // Investment needed ($2-3B per GW for clean firm power)
  const investmentNeeded = cleanFirmRequired * 2.5;

  // Jobs created (~3000 jobs per GW of clean energy)
  const jobsCreated = Math.round(cleanFirmRequired * 3000);

  // Renewable gap (how much new capacity needed)
  const renewableGap = Math.max(0, totalDemand - availableCapacity);

  // Nuclear/SMR needed for baseload (assume 40% of clean firm)
  const nuclearNeeded = cleanFirmRequired * 0.4;

  // Storage needed (4 hours of AI load)
  const storageNeeded = aiDemandGW * 4 * 1000; // GWh

  return {
    gridStress,
    cleanFirmRequired,
    emissionsImpact: emissionsIfGas,
    investmentNeeded,
    jobsCreated,
    renewableGap,
    nuclearNeeded,
    storageNeeded
  };
};

const stressColors = {
  low: { bg: 'bg-emerald-500', text: 'text-emerald-400', label: 'Low Stress' },
  moderate: { bg: 'bg-amber-500', text: 'text-amber-400', label: 'Moderate Stress' },
  high: { bg: 'bg-orange-500', text: 'text-orange-400', label: 'High Stress' },
  critical: { bg: 'bg-red-500', text: 'text-red-400', label: 'Critical Stress' }
};

export const AIDemandScenarioSlider: React.FC<AIDemandScenarioSliderProps> = ({
  initialDemand = 10,
  maxDemand = 100,
  showDetails = true
}) => {
  const [aiDemand, setAiDemand] = useState(initialDemand);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [targetYear, setTargetYear] = useState(2035);

  const scenario = useMemo(() => calculateScenario(aiDemand), [aiDemand]);
  const stressStyle = stressColors[scenario.gridStress];

  // Interpolate demand based on year (linear growth from current to target)
  const yearlyDemand = useMemo(() => {
    const currentYear = 2025;
    const yearsToTarget = targetYear - currentYear;
    const growthRate = (aiDemand - CANADA_GRID_CONTEXT.currentAIDemand) / yearsToTarget;
    
    return Array.from({ length: yearsToTarget + 1 }, (_, i) => ({
      year: currentYear + i,
      demand: CANADA_GRID_CONTEXT.currentAIDemand + growthRate * i
    }));
  }, [aiDemand, targetYear]);

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center justify-between">
          <h3 className="card-title flex items-center gap-2">
            <Cpu className="h-5 w-5 text-purple-500" />
            AI Data Center Demand Scenario
          </h3>
          <HelpButton id="ai.demand.scenario" />
        </div>
        <p className="text-sm text-slate-400 mt-1">
          Model the impact of AI infrastructure growth on Canada's electricity grid
        </p>
      </div>

      <div className="card-body space-y-6">
        {/* Main Slider */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-300">
              AI Demand by {targetYear}
            </label>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-purple-400">{aiDemand}</span>
              <span className="text-sm text-slate-500">GW</span>
            </div>
          </div>

          <input
            type="range"
            min={1}
            max={maxDemand}
            value={aiDemand}
            onChange={(e) => setAiDemand(Number(e.target.value))}
            className="w-full h-3 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
            aria-label="AI demand in gigawatts"
          />

          <div className="flex justify-between text-xs text-slate-500">
            <span>1 GW (Current)</span>
            <span>50 GW (Moderate)</span>
            <span>{maxDemand} GW (High)</span>
          </div>

          {/* Year Selector */}
          <div className="flex items-center gap-4 mt-4">
            <label className="text-sm text-slate-400">Target Year:</label>
            <div className="flex gap-2">
              {[2030, 2035, 2040, 2050].map((year) => (
                <button
                  key={year}
                  onClick={() => setTargetYear(year)}
                  className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                    targetYear === year
                      ? 'bg-purple-500 text-white'
                      : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                  }`}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Grid Stress Indicator */}
        <div className={`p-4 rounded-xl ${stressStyle.bg}/20 border border-${stressStyle.bg}/30`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full ${stressStyle.bg} animate-pulse`} />
              <div>
                <p className={`font-semibold ${stressStyle.text}`}>{stressStyle.label}</p>
                <p className="text-xs text-slate-500">Grid utilization at {aiDemand} GW AI load</p>
              </div>
            </div>
            {scenario.gridStress === 'critical' && (
              <AlertTriangle className="h-6 w-6 text-red-500" />
            )}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-800/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-slate-500">Clean Firm Power</span>
            </div>
            <p className="text-xl font-bold text-white">{scenario.cleanFirmRequired.toFixed(1)} GW</p>
            <p className="text-xs text-slate-500">24/7 baseload required</p>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Leaf className="h-4 w-4 text-emerald-500" />
              <span className="text-xs text-slate-500">Emissions Risk</span>
            </div>
            <p className="text-xl font-bold text-white">{scenario.emissionsImpact.toFixed(1)} Mt</p>
            <p className="text-xs text-slate-500">CO₂e/year if gas-powered</p>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              <span className="text-xs text-slate-500">Investment Needed</span>
            </div>
            <p className="text-xl font-bold text-white">${scenario.investmentNeeded.toFixed(1)}B</p>
            <p className="text-xs text-slate-500">Clean energy infrastructure</p>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-slate-500">Jobs Created</span>
            </div>
            <p className="text-xl font-bold text-white">{scenario.jobsCreated.toLocaleString()}</p>
            <p className="text-xs text-slate-500">Direct & indirect</p>
          </div>
        </div>

        {/* Advanced Details Toggle */}
        {showDetails && (
          <>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {showAdvanced ? 'Hide' : 'Show'} Infrastructure Requirements
            </button>

            {showAdvanced && (
              <div className="space-y-4 pt-4 border-t border-slate-700">
                <h4 className="text-sm font-semibold text-slate-300">
                  Infrastructure Requirements for {aiDemand} GW AI Load
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-purple-900/30 to-slate-800/50 rounded-lg p-4">
                    <Server className="h-5 w-5 text-purple-400 mb-2" />
                    <p className="text-lg font-bold text-white">{scenario.nuclearNeeded.toFixed(1)} GW</p>
                    <p className="text-sm text-slate-400">SMR/Nuclear Baseload</p>
                    <p className="text-xs text-slate-500 mt-1">
                      ~{Math.ceil(scenario.nuclearNeeded / 0.3)} SMR units (300 MW each)
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-emerald-900/30 to-slate-800/50 rounded-lg p-4">
                    <Zap className="h-5 w-5 text-emerald-400 mb-2" />
                    <p className="text-lg font-bold text-white">{(scenario.cleanFirmRequired * 0.6).toFixed(1)} GW</p>
                    <p className="text-sm text-slate-400">Renewable + Storage</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Wind/Solar with {scenario.storageNeeded.toLocaleString()} GWh storage
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-amber-900/30 to-slate-800/50 rounded-lg p-4">
                    <AlertTriangle className="h-5 w-5 text-amber-400 mb-2" />
                    <p className="text-lg font-bold text-white">{scenario.renewableGap.toFixed(1)} GW</p>
                    <p className="text-sm text-slate-400">Capacity Gap</p>
                    <p className="text-xs text-slate-500 mt-1">
                      New generation needed beyond current
                    </p>
                  </div>
                </div>

                {/* Context Note */}
                <div className="flex items-start gap-3 p-4 bg-blue-900/20 rounded-lg border border-blue-500/30">
                  <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-slate-300">
                    <p className="font-medium text-blue-400 mb-1">Context: Global AI Demand</p>
                    <p>
                      IEA projects global AI data center electricity demand could reach 
                      <strong> 362 GW by 2035</strong>. Canada's share depends on policy, 
                      clean energy availability, and tech company decisions. BC has already 
                      paused new data center connections due to grid constraints.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3">
                      <DataSource 
                        dataset="IEA World Energy Outlook 2024"
                        url="https://www.iea.org/reports/world-energy-outlook-2024"
                        description="AI data center demand projections"
                        compact={true}
                      />
                      <DataSource 
                        dataset="BC Hydro Grid Constraints"
                        url="https://www.bchydro.com/"
                        description="BC data center connection pause"
                        compact={true}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AIDemandScenarioSlider;
