/**
 * Crisis/Scenario Simulator
 * 
 * Simulates grid resilience under various crisis scenarios including
 * wildfires, extreme weather, cyberattacks, and supply disruptions.
 * 
 * Addresses Gap #15: Crisis/Scenario Simulation (LOW Priority)
 */

import React, { useState, useMemo } from 'react';
import { 
  AlertTriangle, Flame, Cloud, Snowflake, 
  Shield, Zap, Clock, TrendingDown,
  Play, Pause, RotateCcw, Download,
  ChevronRight, Info
} from 'lucide-react';
import { HelpButton } from './HelpButton';
import { DataSource } from './ui/DataSource';

type ScenarioType = 'wildfire' | 'heatwave' | 'coldsnap' | 'cyberattack' | 'pipeline_disruption' | 'grid_failure';

interface Scenario {
  id: ScenarioType;
  name: string;
  icon: React.ReactNode;
  description: string;
  severity: 'moderate' | 'severe' | 'extreme';
  duration: string;
  affectedRegions: string[];
  impacts: {
    demandChange: number; // percentage
    supplyReduction: number; // percentage
    priceSpike: number; // multiplier
    emissionsIncrease: number; // percentage
  };
  mitigations: string[];
  historicalExample?: string;
}

interface SimulationResult {
  peakDemand: number;
  availableSupply: number;
  shortfall: number;
  priceEstimate: number;
  blackoutRisk: 'low' | 'moderate' | 'high' | 'critical';
  affectedCustomers: number;
  economicImpact: number; // $M
  recoveryTime: string;
}

const SCENARIOS: Scenario[] = [
  {
    id: 'wildfire',
    name: 'Major Wildfire Event',
    icon: <Flame className="h-5 w-5 text-orange-500" />,
    description: 'Large-scale wildfire affecting transmission infrastructure and forcing evacuations',
    severity: 'severe',
    duration: '2-4 weeks',
    affectedRegions: ['BC', 'AB'],
    impacts: {
      demandChange: -15, // evacuations reduce demand
      supplyReduction: 25, // transmission damage
      priceSpike: 3.5,
      emissionsIncrease: 40 // backup generators
    },
    mitigations: [
      'Activate interprovincial transmission agreements',
      'Deploy mobile generation units',
      'Implement rolling conservation measures',
      'Coordinate with BC Hydro emergency protocols'
    ],
    historicalExample: 'Fort McMurray 2016, BC Wildfires 2023'
  },
  {
    id: 'heatwave',
    name: 'Extreme Heat Dome',
    icon: <Cloud className="h-5 w-5 text-red-500" />,
    description: 'Multi-day extreme heat event causing record cooling demand',
    severity: 'severe',
    duration: '5-10 days',
    affectedRegions: ['BC', 'AB', 'ON'],
    impacts: {
      demandChange: 35, // AC demand surge
      supplyReduction: 10, // thermal derating
      priceSpike: 4.0,
      emissionsIncrease: 25
    },
    mitigations: [
      'Pre-position peaking generation',
      'Activate demand response programs',
      'Issue conservation appeals',
      'Coordinate cooling centers'
    ],
    historicalExample: 'BC Heat Dome 2021 (619 deaths)'
  },
  {
    id: 'coldsnap',
    name: 'Polar Vortex Cold Snap',
    icon: <Snowflake className="h-5 w-5 text-blue-400" />,
    description: 'Extreme cold event causing heating demand surge and gas supply constraints',
    severity: 'extreme',
    duration: '1-2 weeks',
    affectedRegions: ['AB', 'SK', 'MB', 'ON'],
    impacts: {
      demandChange: 45, // heating demand
      supplyReduction: 20, // gas supply constraints
      priceSpike: 8.0,
      emissionsIncrease: 35
    },
    mitigations: [
      'Maximize baseload generation',
      'Coordinate gas supply with pipelines',
      'Implement emergency load shedding protocols',
      'Activate industrial curtailment agreements'
    ],
    historicalExample: 'Texas 2021, Alberta 2024'
  },
  {
    id: 'cyberattack',
    name: 'Grid Cyberattack',
    icon: <Shield className="h-5 w-5 text-purple-500" />,
    description: 'Coordinated cyberattack on grid control systems',
    severity: 'extreme',
    duration: '1-7 days',
    affectedRegions: ['National'],
    impacts: {
      demandChange: 0,
      supplyReduction: 40, // control system compromise
      priceSpike: 10.0,
      emissionsIncrease: 50
    },
    mitigations: [
      'Activate manual grid control protocols',
      'Isolate affected systems',
      'Deploy cybersecurity incident response',
      'Coordinate with CSE and CISA'
    ],
    historicalExample: 'Ukraine 2015, Colonial Pipeline 2021'
  },
  {
    id: 'pipeline_disruption',
    name: 'Major Pipeline Disruption',
    icon: <AlertTriangle className="h-5 w-5 text-amber-500" />,
    description: 'Critical natural gas pipeline outage affecting power generation',
    severity: 'severe',
    duration: '1-3 weeks',
    affectedRegions: ['AB', 'SK', 'ON'],
    impacts: {
      demandChange: 0,
      supplyReduction: 30, // gas generation offline
      priceSpike: 5.0,
      emissionsIncrease: 20 // switch to coal/oil
    },
    mitigations: [
      'Maximize non-gas generation',
      'Activate fuel oil backup systems',
      'Coordinate LNG imports',
      'Implement conservation measures'
    ],
    historicalExample: 'Enbridge Line 5 disputes'
  },
  {
    id: 'grid_failure',
    name: 'Cascading Grid Failure',
    icon: <Zap className="h-5 w-5 text-red-600" />,
    description: 'Major transmission failure causing cascading blackouts',
    severity: 'extreme',
    duration: '12-72 hours',
    affectedRegions: ['ON', 'QC'],
    impacts: {
      demandChange: -80, // blackout
      supplyReduction: 90,
      priceSpike: 15.0,
      emissionsIncrease: 100 // backup generators
    },
    mitigations: [
      'Activate black start procedures',
      'Coordinate island restoration',
      'Deploy emergency generation',
      'Prioritize critical infrastructure'
    ],
    historicalExample: 'Northeast Blackout 2003, Spain 2025'
  }
];

// Baseline grid parameters
const GRID_BASELINE = {
  peakDemand: 25000, // MW (Ontario example)
  totalCapacity: 35000, // MW
  averagePrice: 85, // $/MWh
  totalCustomers: 5500000
};

const calculateSimulation = (scenario: Scenario): SimulationResult => {
  const demandMultiplier = 1 + (scenario.impacts.demandChange / 100);
  const supplyMultiplier = 1 - (scenario.impacts.supplyReduction / 100);

  const peakDemand = Math.round(GRID_BASELINE.peakDemand * demandMultiplier);
  const availableSupply = Math.round(GRID_BASELINE.totalCapacity * supplyMultiplier);
  const shortfall = Math.max(0, peakDemand - availableSupply);

  const priceEstimate = Math.round(GRID_BASELINE.averagePrice * scenario.impacts.priceSpike);

  let blackoutRisk: SimulationResult['blackoutRisk'];
  const shortfallPercent = shortfall / peakDemand;
  if (shortfallPercent === 0) blackoutRisk = 'low';
  else if (shortfallPercent < 0.1) blackoutRisk = 'moderate';
  else if (shortfallPercent < 0.25) blackoutRisk = 'high';
  else blackoutRisk = 'critical';

  const affectedCustomers = Math.round(GRID_BASELINE.totalCustomers * shortfallPercent);
  const economicImpact = Math.round(shortfall * 24 * 500 / 1000); // $500/MWh lost load value

  const recoveryTime = scenario.severity === 'extreme' ? '3-7 days' : 
                       scenario.severity === 'severe' ? '1-3 days' : '12-24 hours';

  return {
    peakDemand,
    availableSupply,
    shortfall,
    priceEstimate,
    blackoutRisk,
    affectedCustomers,
    economicImpact,
    recoveryTime
  };
};

const riskColors = {
  low: { bg: 'bg-emerald-500', text: 'text-emerald-400' },
  moderate: { bg: 'bg-amber-500', text: 'text-amber-400' },
  high: { bg: 'bg-orange-500', text: 'text-orange-400' },
  critical: { bg: 'bg-red-500', text: 'text-red-400' }
};

export const CrisisScenarioSimulator: React.FC = () => {
  const [selectedScenario, setSelectedScenario] = useState<Scenario>(SCENARIOS[0]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const result = useMemo(() => calculateSimulation(selectedScenario), [selectedScenario]);
  const riskStyle = riskColors[result.blackoutRisk];

  const runSimulation = () => {
    setIsSimulating(true);
    setShowResults(false);
    
    // Simulate processing time
    setTimeout(() => {
      setIsSimulating(false);
      setShowResults(true);
    }, 1500);
  };

  const resetSimulation = () => {
    setShowResults(false);
    setIsSimulating(false);
  };

  const exportResults = () => {
    const report = {
      scenario: selectedScenario.name,
      timestamp: new Date().toISOString(),
      results: result,
      mitigations: selectedScenario.mitigations
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crisis-simulation-${selectedScenario.id}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <AlertTriangle className="h-7 w-7 text-amber-500" />
            Crisis Scenario Simulator
          </h2>
          <p className="text-slate-400 mt-1">
            Model grid resilience under various emergency scenarios
          </p>
          <div className="flex flex-wrap gap-3 mt-2">
            <DataSource 
              dataset="WEF Grid Resilience Report"
              url="https://www.weforum.org/publications/fostering-effective-energy-transition-2024/"
              description="World Economic Forum energy resilience analysis"
              compact={true}
            />
            <DataSource 
              dataset="IESO Emergency Protocols"
              url="https://www.ieso.ca/en/Sector-Participants/Market-Operations/Emergency-Preparedness"
              description="Ontario grid emergency procedures"
              compact={true}
            />
          </div>
        </div>
        <HelpButton id="crisis.scenario.simulator" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scenario Selection */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
            Select Scenario
          </h3>
          <div className="space-y-2">
            {SCENARIOS.map((scenario) => (
              <button
                key={scenario.id}
                onClick={() => {
                  setSelectedScenario(scenario);
                  setShowResults(false);
                }}
                className={`w-full p-3 rounded-lg text-left transition-all ${
                  selectedScenario.id === scenario.id
                    ? 'bg-slate-700 border-2 border-purple-500'
                    : 'bg-slate-800/50 border border-slate-700 hover:bg-slate-700/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  {scenario.icon}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{scenario.name}</p>
                    <p className="text-xs text-slate-500">{scenario.severity} • {scenario.duration}</p>
                  </div>
                  {selectedScenario.id === scenario.id && (
                    <ChevronRight className="h-4 w-4 text-purple-400" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Scenario Details & Results */}
        <div className="lg:col-span-2 space-y-4">
          {/* Selected Scenario Card */}
          <div className="card">
            <div className="card-header">
              <div className="flex items-center gap-3">
                {selectedScenario.icon}
                <div>
                  <h3 className="card-title">{selectedScenario.name}</h3>
                  <p className="text-sm text-slate-400">{selectedScenario.description}</p>
                </div>
              </div>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                  <p className="text-xs text-slate-500 uppercase">Severity</p>
                  <p className={`text-sm font-semibold ${
                    selectedScenario.severity === 'extreme' ? 'text-red-400' :
                    selectedScenario.severity === 'severe' ? 'text-orange-400' : 'text-amber-400'
                  }`}>
                    {selectedScenario.severity.charAt(0).toUpperCase() + selectedScenario.severity.slice(1)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-500 uppercase">Duration</p>
                  <p className="text-sm font-semibold text-white">{selectedScenario.duration}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-500 uppercase">Demand Impact</p>
                  <p className={`text-sm font-semibold ${
                    selectedScenario.impacts.demandChange > 0 ? 'text-red-400' : 'text-emerald-400'
                  }`}>
                    {selectedScenario.impacts.demandChange > 0 ? '+' : ''}{selectedScenario.impacts.demandChange}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-500 uppercase">Supply Impact</p>
                  <p className="text-sm font-semibold text-red-400">
                    -{selectedScenario.impacts.supplyReduction}%
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
                <span>Affected Regions:</span>
                {selectedScenario.affectedRegions.map((region) => (
                  <span key={region} className="px-2 py-0.5 bg-slate-700 rounded text-slate-300">
                    {region}
                  </span>
                ))}
              </div>

              {selectedScenario.historicalExample && (
                <div className="flex items-start gap-2 p-3 bg-slate-800/50 rounded-lg text-sm">
                  <Info className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-400">
                    Historical precedent: <span className="text-white">{selectedScenario.historicalExample}</span>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Simulation Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={runSimulation}
              disabled={isSimulating}
              className="btn btn-primary flex items-center gap-2"
            >
              {isSimulating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Simulating...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Run Simulation
                </>
              )}
            </button>
            {showResults && (
              <>
                <button onClick={resetSimulation} className="btn btn-secondary">
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </button>
                <button onClick={exportResults} className="btn btn-secondary">
                  <Download className="h-4 w-4" />
                  Export
                </button>
              </>
            )}
          </div>

          {/* Simulation Results */}
          {showResults && (
            <div className="card border-2 border-purple-500/30">
              <div className="card-header">
                <h3 className="card-title flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-purple-400" />
                  Simulation Results
                </h3>
              </div>
              <div className="card-body space-y-4">
                {/* Risk Indicator */}
                <div className={`p-4 rounded-xl ${riskStyle.bg}/20 border border-${riskStyle.bg}/30`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full ${riskStyle.bg} animate-pulse`} />
                      <div>
                        <p className={`font-semibold ${riskStyle.text}`}>
                          {result.blackoutRisk.charAt(0).toUpperCase() + result.blackoutRisk.slice(1)} Blackout Risk
                        </p>
                        <p className="text-xs text-slate-500">
                          {result.shortfall > 0 ? `${result.shortfall.toLocaleString()} MW shortfall` : 'Supply meets demand'}
                        </p>
                      </div>
                    </div>
                    <Clock className="h-5 w-5 text-slate-500" />
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <p className="text-xs text-slate-500">Peak Demand</p>
                    <p className="text-lg font-bold text-white">{result.peakDemand.toLocaleString()} MW</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <p className="text-xs text-slate-500">Available Supply</p>
                    <p className="text-lg font-bold text-white">{result.availableSupply.toLocaleString()} MW</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <p className="text-xs text-slate-500">Price Estimate</p>
                    <p className="text-lg font-bold text-amber-400">${result.priceEstimate}/MWh</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <p className="text-xs text-slate-500">Recovery Time</p>
                    <p className="text-lg font-bold text-white">{result.recoveryTime}</p>
                  </div>
                </div>

                {/* Impact Summary */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-red-900/20 rounded-lg p-4 border border-red-500/30">
                    <p className="text-xs text-red-400 uppercase tracking-wide">Customers Affected</p>
                    <p className="text-2xl font-bold text-white">{result.affectedCustomers.toLocaleString()}</p>
                  </div>
                  <div className="bg-amber-900/20 rounded-lg p-4 border border-amber-500/30">
                    <p className="text-xs text-amber-400 uppercase tracking-wide">Economic Impact</p>
                    <p className="text-2xl font-bold text-white">${result.economicImpact}M</p>
                  </div>
                </div>

                {/* Mitigations */}
                <div>
                  <h4 className="text-sm font-semibold text-slate-300 mb-2">Recommended Mitigations</h4>
                  <ul className="space-y-2">
                    {selectedScenario.mitigations.map((mitigation, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-slate-400">
                        <span className="text-emerald-400 mt-1">•</span>
                        {mitigation}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CrisisScenarioSimulator;
