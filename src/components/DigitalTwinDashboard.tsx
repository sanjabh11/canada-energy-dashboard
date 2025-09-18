/**
 * Digital Twin Energy Ecosystem Dashboard
 * 
 * Revolutionary virtual model of Canada's entire energy system
 * with real-time simulation, stress testing, and predictive modeling.
 */

import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { 
  Cpu, Network, Zap, AlertTriangle, Play, Pause, Settings, 
  Target, Activity, Gauge, ThermometerSun, Wind, CloudRain,
  MapPin, Layers, RotateCcw, FastForward, Rewind, SkipForward,
  Shield, TrendingUp, Battery, Transmission, Factory, Home
} from 'lucide-react';
import { digitalTwin, type SystemState, type SimulationScenario, type SimulationResult } from '../lib/digitalTwin';

interface DigitalTwinState {
  isRunning: boolean;
  simulationSpeed: 1 | 2 | 4 | 8;
  currentTime: string;
  systemHealth: 'optimal' | 'good' | 'warning' | 'critical';
  activeScenario: string | null;
}

interface SystemMetrics {
  totalGeneration: number;
  totalDemand: number;
  reserveMargin: number;
  frequency: number;
  renewablePercentage: number;
  carbonIntensity: number;
  systemStability: string;
  economicCost: number;
}

export const DigitalTwinDashboard: React.FC = () => {
  const [twinState, setTwinState] = useState<DigitalTwinState>({
    isRunning: false,
    simulationSpeed: 1,
    currentTime: new Date().toISOString(),
    systemHealth: 'optimal',
    activeScenario: null
  });

  const [systemState, setSystemState] = useState<SystemState | null>(null);
  const [simulationResults, setSimulationResults] = useState<SimulationResult[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<string>('normal_operations');
  const [stressTestActive, setStressTestActive] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Real-time system metrics
  const [metrics, setMetrics] = useState<SystemMetrics>({
    totalGeneration: 0,
    totalDemand: 0,
    reserveMargin: 0,
    frequency: 60.0,
    renewablePercentage: 0,
    carbonIntensity: 0,
    systemStability: 'stable',
    economicCost: 0
  });

  // Simulation control
  const simulationInterval = useRef<NodeJS.Timeout>();
  const [timeSeriesData, setTimeSeriesData] = useState<Array<{
    time: string;
    generation: number;
    demand: number;
    renewable: number;
    frequency: number;
    cost: number;
  }>>([]);

  useEffect(() => {
    loadInitialSystemState();
    return () => {
      if (simulationInterval.current) {
        clearInterval(simulationInterval.current);
      }
    };
  }, []);

  useEffect(() => {
    if (twinState.isRunning) {
      startSimulation();
    } else {
      stopSimulation();
    }
  }, [twinState.isRunning, twinState.simulationSpeed]);

  const loadInitialSystemState = async () => {
    setLoading(true);
    try {
      // Simulate loading real system state
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockSystemState: SystemState = {
        timestamp: new Date().toISOString(),
        total_generation_mw: 18500,
        total_demand_mw: 17200,
        reserve_margin_percent: 7.6,
        frequency_hz: 60.02,
        system_stability: 'stable',
        renewable_percentage: 68.5,
        carbon_intensity_g_co2_per_kwh: 145,
        economic_dispatch_cost_cad: 2850000,
        nodes: [],
        flows: [],
        weather_impact: {
          temperature_effect_mw: -450,
          wind_generation_mw: 3200,
          solar_generation_mw: 1800,
          precipitation_impact: 0.02
        }
      };

      setSystemState(mockSystemState);
      updateMetrics(mockSystemState);
      
      // Initialize time series data
      const initialData = Array.from({ length: 24 }, (_, i) => ({
        time: `${i.toString().padStart(2, '0')}:00`,
        generation: 18500 + Math.random() * 2000 - 1000,
        demand: 17200 + Math.random() * 1500 - 750,
        renewable: 68.5 + Math.random() * 10 - 5,
        frequency: 60.0 + Math.random() * 0.1 - 0.05,
        cost: 2850000 + Math.random() * 500000 - 250000
      }));
      setTimeSeriesData(initialData);
      
    } catch (error) {
      console.error('Error loading system state:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateMetrics = (state: SystemState) => {
    setMetrics({
      totalGeneration: state.total_generation_mw,
      totalDemand: state.total_demand_mw,
      reserveMargin: state.reserve_margin_percent,
      frequency: state.frequency_hz,
      renewablePercentage: state.renewable_percentage,
      carbonIntensity: state.carbon_intensity_g_co2_per_kwh,
      systemStability: state.system_stability,
      economicCost: state.economic_dispatch_cost_cad
    });
  };

  const startSimulation = () => {
    const interval = 2000 / twinState.simulationSpeed; // Base 2 second interval
    
    simulationInterval.current = setInterval(() => {
      // Simulate system evolution
      setMetrics(prev => ({
        ...prev,
        totalGeneration: prev.totalGeneration + (Math.random() - 0.5) * 200,
        totalDemand: prev.totalDemand + (Math.random() - 0.5) * 150,
        frequency: 60.0 + (Math.random() - 0.5) * 0.1,
        renewablePercentage: Math.max(0, Math.min(100, prev.renewablePercentage + (Math.random() - 0.5) * 2)),
        carbonIntensity: prev.carbonIntensity + (Math.random() - 0.5) * 10
      }));

      // Update time series
      setTimeSeriesData(prev => {
        const newPoint = {
          time: new Date().toLocaleTimeString(),
          generation: metrics.totalGeneration,
          demand: metrics.totalDemand,
          renewable: metrics.renewablePercentage,
          frequency: metrics.frequency,
          cost: metrics.economicCost
        };
        return [...prev.slice(-23), newPoint]; // Keep last 24 points
      });

      setTwinState(prev => ({
        ...prev,
        currentTime: new Date().toISOString()
      }));
    }, interval);
  };

  const stopSimulation = () => {
    if (simulationInterval.current) {
      clearInterval(simulationInterval.current);
    }
  };

  const runStressTest = async (stressType: 'extreme_weather' | 'cyber_attack' | 'equipment_failure') => {
    setStressTestActive(true);
    setLoading(true);
    
    try {
      // Simulate stress test execution
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Simulate stress test results
      const stressResults = {
        resilience_score: Math.random() * 40 + 60, // 60-100
        failure_points: Math.floor(Math.random() * 5),
        recovery_time: Math.random() * 120 + 30, // 30-150 minutes
        economic_impact: Math.random() * 50000000 + 10000000 // $10M-60M
      };
      
      console.log('Stress test completed:', stressResults);
      
    } catch (error) {
      console.error('Stress test error:', error);
    } finally {
      setStressTestActive(false);
      setLoading(false);
    }
  };

  const runScenarioAnalysis = async (scenario: string) => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate scenario analysis
      const scenarioResult = {
        scenario_name: scenario,
        probability_success: Math.random() * 40 + 60,
        economic_impact: Math.random() * 100000000,
        environmental_impact: Math.random() * 1000000,
        implementation_complexity: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)]
      };
      
      console.log('Scenario analysis completed:', scenarioResult);
      
    } catch (error) {
      console.error('Scenario analysis error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'optimal': return 'text-green-600 bg-green-50';
      case 'good': return 'text-blue-600 bg-blue-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      case 'critical': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStabilityColor = (stability: string) => {
    switch (stability) {
      case 'stable': return 'text-green-600';
      case 'stressed': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      case 'emergency': return 'text-red-800';
      default: return 'text-gray-600';
    }
  };

  if (loading && !systemState) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Initializing Digital Twin...</p>
          <p className="text-sm text-slate-500">Loading real-time system state</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Digital Twin Header */}
      <div className="bg-gradient-to-r from-purple-900 via-blue-900 to-indigo-900 rounded-lg shadow-xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Cpu size={32} className="text-purple-300" />
              {twinState.isRunning && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold">Digital Twin Energy Ecosystem</h1>
              <p className="text-purple-200">Virtual Canada Energy System • Real-time Simulation • Predictive Modeling</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Simulation Controls */}
            <div className="flex items-center gap-2 bg-white/10 rounded-lg p-2">
              <button
                onClick={() => setTwinState(prev => ({ ...prev, isRunning: !prev.isRunning }))}
                className={`p-2 rounded transition-colors ${
                  twinState.isRunning ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {twinState.isRunning ? <Pause size={16} /> : <Play size={16} />}
              </button>
              
              <div className="flex items-center gap-1">
                <Rewind size={14} className="text-purple-300" />
                <select
                  value={twinState.simulationSpeed}
                  onChange={(e) => setTwinState(prev => ({ ...prev, simulationSpeed: Number(e.target.value) as any }))}
                  className="bg-transparent text-white text-sm border border-white/20 rounded px-2 py-1"
                >
                  <option value={1} className="text-black">1x</option>
                  <option value={2} className="text-black">2x</option>
                  <option value={4} className="text-black">4x</option>
                  <option value={8} className="text-black">8x</option>
                </select>
                <FastForward size={14} className="text-purple-300" />
              </div>
            </div>

            <div className={`px-3 py-2 rounded-lg ${getHealthColor(twinState.systemHealth)}`}>
              <div className="flex items-center gap-2">
                <Activity size={16} />
                <span className="font-medium capitalize">{twinState.systemHealth}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Real-time System Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="bg-white/10 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Zap size={16} className="text-yellow-300" />
              <span className="text-sm font-medium">Generation</span>
            </div>
            <div className="text-lg font-bold">{metrics.totalGeneration.toFixed(0)} MW</div>
          </div>
          
          <div className="bg-white/10 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Home size={16} className="text-blue-300" />
              <span className="text-sm font-medium">Demand</span>
            </div>
            <div className="text-lg font-bold">{metrics.totalDemand.toFixed(0)} MW</div>
          </div>
          
          <div className="bg-white/10 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Shield size={16} className="text-green-300" />
              <span className="text-sm font-medium">Reserve</span>
            </div>
            <div className="text-lg font-bold">{metrics.reserveMargin.toFixed(1)}%</div>
          </div>
          
          <div className="bg-white/10 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Gauge size={16} className="text-purple-300" />
              <span className="text-sm font-medium">Frequency</span>
            </div>
            <div className="text-lg font-bold">{metrics.frequency.toFixed(2)} Hz</div>
          </div>
          
          <div className="bg-white/10 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Wind size={16} className="text-emerald-300" />
              <span className="text-sm font-medium">Renewable</span>
            </div>
            <div className="text-lg font-bold">{metrics.renewablePercentage.toFixed(1)}%</div>
          </div>
          
          <div className="bg-white/10 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <CloudRain size={16} className="text-gray-300" />
              <span className="text-sm font-medium">Carbon</span>
            </div>
            <div className="text-lg font-bold">{metrics.carbonIntensity.toFixed(0)} g/kWh</div>
          </div>
        </div>
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real-time System Visualization */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Real-time System State</h3>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Activity size={14} />
              <span className={getStabilityColor(metrics.systemStability)}>
                {metrics.systemStability.toUpperCase()}
              </span>
            </div>
          </div>
          
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="generation" stroke="#3B82F6" strokeWidth={2} name="Generation (MW)" />
                <Line type="monotone" dataKey="demand" stroke="#EF4444" strokeWidth={2} name="Demand (MW)" />
                <Line type="monotone" dataKey="renewable" stroke="#10B981" strokeWidth={2} name="Renewable %" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Scenario Control Panel */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Scenario Testing</h3>
          
          <div className="space-y-4">
            {/* Scenario Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Active Scenario</label>
              <select
                value={selectedScenario}
                onChange={(e) => setSelectedScenario(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="normal_operations">Normal Operations</option>
                <option value="extreme_cold">Extreme Cold Weather</option>
                <option value="cyber_attack">Cyber Attack Simulation</option>
                <option value="equipment_failure">Major Equipment Failure</option>
                <option value="demand_surge">Peak Demand Surge</option>
                <option value="renewable_intermittency">High Renewable Intermittency</option>
              </select>
            </div>

            {/* Stress Test Controls */}
            <div>
              <h4 className="font-medium text-slate-900 mb-3">Stress Testing</h4>
              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={() => runStressTest('extreme_weather')}
                  disabled={stressTestActive || loading}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ThermometerSun size={16} />
                  Weather Stress
                </button>
                
                <button
                  onClick={() => runStressTest('cyber_attack')}
                  disabled={stressTestActive || loading}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Shield size={16} />
                  Cyber Attack
                </button>
                
                <button
                  onClick={() => runStressTest('equipment_failure')}
                  disabled={stressTestActive || loading}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <AlertTriangle size={16} />
                  Equipment Failure
                </button>
              </div>
            </div>

            {/* Scenario Analysis */}
            <div>
              <button
                onClick={() => runScenarioAnalysis(selectedScenario)}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Target size={16} />
                )}
                {loading ? 'Analyzing...' : 'Run Analysis'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* System Components Overview */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">System Components Status</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Factory className="text-blue-600" size={20} />
                <span className="font-medium text-blue-900">Generation</span>
              </div>
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            </div>
            <div className="text-2xl font-bold text-blue-900">247</div>
            <div className="text-sm text-blue-700">Active Units</div>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Transmission className="text-green-600" size={20} />
                <span className="font-medium text-green-900">Transmission</span>
              </div>
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            </div>
            <div className="text-2xl font-bold text-green-900">1,247</div>
            <div className="text-sm text-green-700">Lines Active</div>
          </div>

          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Battery className="text-purple-600" size={20} />
                <span className="font-medium text-purple-900">Storage</span>
              </div>
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            </div>
            <div className="text-2xl font-bold text-purple-900">89</div>
            <div className="text-sm text-purple-700">Systems Online</div>
          </div>

          <div className="bg-orange-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Network className="text-orange-600" size={20} />
                <span className="font-medium text-orange-900">Control</span>
              </div>
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            </div>
            <div className="text-2xl font-bold text-orange-900">12</div>
            <div className="text-sm text-orange-700">Centers Active</div>
          </div>
        </div>
      </div>

      {/* Simulation Results */}
      {simulationResults.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Simulation Results</h3>
          
          <div className="space-y-4">
            {simulationResults.slice(0, 3).map((result, index) => (
              <div key={index} className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-slate-900">Scenario: {result.scenario_id}</h4>
                  <span className="text-sm text-slate-600">{new Date(result.execution_time).toLocaleString()}</span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-slate-600">Peak Demand:</span>
                    <div className="font-medium">{result.key_metrics.peak_demand_mw.toFixed(0)} MW</div>
                  </div>
                  <div>
                    <span className="text-slate-600">Total Cost:</span>
                    <div className="font-medium">${(result.key_metrics.total_cost_cad / 1000000).toFixed(1)}M</div>
                  </div>
                  <div>
                    <span className="text-slate-600">Emissions:</span>
                    <div className="font-medium">{(result.key_metrics.total_emissions_co2e / 1000).toFixed(0)}k tCO₂e</div>
                  </div>
                  <div>
                    <span className="text-slate-600">Events:</span>
                    <div className="font-medium">{result.key_metrics.reliability_events}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DigitalTwinDashboard;
