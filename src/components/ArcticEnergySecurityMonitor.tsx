/**
 * Arctic & Northern Energy Security Monitor
 * 
 * Specialized dashboard for monitoring energy security in Canada's Arctic and Northern regions.
 * Focuses on remote community energy needs, diesel-to-renewable transitions, and
 * traditional knowledge integration for sustainable energy solutions.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { 
  Snowflake, MapPin, Fuel, Zap, Thermometer, Wind,
  AlertTriangle, TrendingUp, Users, Leaf, Clock,
  Battery, Truck, Home, Factory, Download, Filter, Play, Settings
} from 'lucide-react';
import { optimizeDieselToRenewable, PRESET_SCENARIOS, type OptimizationResult, type CommunityEnergyProfile as OptProfileType } from '../lib/arcticOptimization';

interface CommunityEnergyProfile {
  id: string;
  community_name: string;
  province_territory: string;
  population: number;
  coordinates: { latitude: number; longitude: number };
  energy_system: {
    primary_source: 'diesel' | 'hydro' | 'wind' | 'solar' | 'hybrid';
    diesel_consumption_liters_annual: number;
    renewable_capacity_kw: number;
    renewable_percentage: number;
    grid_connected: boolean;
  };
  energy_security: {
    fuel_delivery_frequency: 'weekly' | 'monthly' | 'seasonal' | 'annual';
    fuel_storage_days: number;
    backup_generation_hours: number;
    outage_frequency_annual: number;
    critical_infrastructure_protected: boolean;
  };
  transition_planning: {
    diesel_reduction_target_percent: number;
    renewable_projects_planned: Array<{
      project_type: 'solar' | 'wind' | 'hydro' | 'biomass' | 'battery_storage';
      capacity_kw: number;
      estimated_completion: string;
      funding_secured: boolean;
    }>;
    traditional_knowledge_integrated: boolean;
    community_engagement_level: 'high' | 'medium' | 'low';
  };
  climate_resilience: {
    extreme_weather_preparedness: 'excellent' | 'good' | 'needs_improvement' | 'poor';
    infrastructure_climate_adapted: boolean;
    emergency_response_plan: boolean;
    food_security_impact: 'low' | 'medium' | 'high';
  };
}

interface ArcticMetrics {
  totalCommunities: number;
  dieselDependentCommunities: number;
  renewableTransitionProjects: number;
  averageFuelSecurity: number;
  traditionalKnowledgeIntegration: number;
  climateResilienceScore: number;
}

const ENERGY_SOURCE_COLORS = {
  diesel: '#EF4444',
  hydro: '#3B82F6',
  wind: '#10B981',
  solar: '#F59E0B',
  hybrid: '#8B5CF6'
};

const TERRITORY_COLORS = {
  'Yukon': '#FCD34D',
  'Northwest Territories': '#60A5FA',
  'Nunavut': '#A78BFA',
  'Northern Ontario': '#34D399',
  'Northern Quebec': '#F87171',
  'Northern Manitoba': '#FB923C'
};

export const ArcticEnergySecurityMonitor: React.FC = () => {
  const [communityProfiles, setCommunityProfiles] = useState<CommunityEnergyProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTerritory, setSelectedTerritory] = useState<string>('');
  const [viewMode, setViewMode] = useState<'overview' | 'communities' | 'transitions' | 'resilience' | 'optimizer'>('overview');
  const [selectedCommunity, setSelectedCommunity] = useState<CommunityEnergyProfile | null>(null);
  
  // Optimization engine state
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [selectedScenario, setSelectedScenario] = useState('moderate_transition');
  const [optimizing, setOptimizing] = useState(false);

  useEffect(() => {
    loadArcticEnergyData();
  }, []);

  const loadArcticEnergyData = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const sampleCommunities: CommunityEnergyProfile[] = [
        {
          id: 'arctic_001',
          community_name: 'Iqaluit',
          province_territory: 'Nunavut',
          population: 7740,
          coordinates: { latitude: 63.7467, longitude: -68.5170 },
          energy_system: {
            primary_source: 'diesel',
            diesel_consumption_liters_annual: 12000000,
            renewable_capacity_kw: 150,
            renewable_percentage: 2.1,
            grid_connected: false
          },
          energy_security: {
            fuel_delivery_frequency: 'seasonal',
            fuel_storage_days: 180,
            backup_generation_hours: 72,
            outage_frequency_annual: 12,
            critical_infrastructure_protected: true
          },
          transition_planning: {
            diesel_reduction_target_percent: 25,
            renewable_projects_planned: [
              {
                project_type: 'solar',
                capacity_kw: 500,
                estimated_completion: '2025-08-15',
                funding_secured: true
              },
              {
                project_type: 'battery_storage',
                capacity_kw: 1000,
                estimated_completion: '2025-10-01',
                funding_secured: true
              }
            ],
            traditional_knowledge_integrated: true,
            community_engagement_level: 'high'
          },
          climate_resilience: {
            extreme_weather_preparedness: 'good',
            infrastructure_climate_adapted: true,
            emergency_response_plan: true,
            food_security_impact: 'medium'
          }
        },
        {
          id: 'arctic_002',
          community_name: 'Yellowknife',
          province_territory: 'Northwest Territories',
          population: 20340,
          coordinates: { latitude: 62.4540, longitude: -114.3718 },
          energy_system: {
            primary_source: 'hydro',
            diesel_consumption_liters_annual: 2500000,
            renewable_capacity_kw: 2500,
            renewable_percentage: 85.2,
            grid_connected: true
          },
          energy_security: {
            fuel_delivery_frequency: 'monthly',
            fuel_storage_days: 90,
            backup_generation_hours: 168,
            outage_frequency_annual: 4,
            critical_infrastructure_protected: true
          },
          transition_planning: {
            diesel_reduction_target_percent: 95,
            renewable_projects_planned: [
              {
                project_type: 'solar',
                capacity_kw: 1200,
                estimated_completion: '2024-12-01',
                funding_secured: true
              },
              {
                project_type: 'wind',
                capacity_kw: 800,
                estimated_completion: '2025-06-15',
                funding_secured: false
              }
            ],
            traditional_knowledge_integrated: true,
            community_engagement_level: 'high'
          },
          climate_resilience: {
            extreme_weather_preparedness: 'excellent',
            infrastructure_climate_adapted: true,
            emergency_response_plan: true,
            food_security_impact: 'low'
          }
        },
        {
          id: 'arctic_003',
          community_name: 'Old Crow',
          province_territory: 'Yukon',
          population: 245,
          coordinates: { latitude: 67.5706, longitude: -139.8389 },
          energy_system: {
            primary_source: 'diesel',
            diesel_consumption_liters_annual: 450000,
            renewable_capacity_kw: 40,
            renewable_percentage: 8.5,
            grid_connected: false
          },
          energy_security: {
            fuel_delivery_frequency: 'seasonal',
            fuel_storage_days: 365,
            backup_generation_hours: 48,
            outage_frequency_annual: 8,
            critical_infrastructure_protected: false
          },
          transition_planning: {
            diesel_reduction_target_percent: 50,
            renewable_projects_planned: [
              {
                project_type: 'solar',
                capacity_kw: 200,
                estimated_completion: '2025-05-01',
                funding_secured: true
              },
              {
                project_type: 'battery_storage',
                capacity_kw: 300,
                estimated_completion: '2025-07-01',
                funding_secured: false
              }
            ],
            traditional_knowledge_integrated: true,
            community_engagement_level: 'high'
          },
          climate_resilience: {
            extreme_weather_preparedness: 'needs_improvement',
            infrastructure_climate_adapted: false,
            emergency_response_plan: true,
            food_security_impact: 'high'
          }
        },
        {
          id: 'arctic_004',
          community_name: 'Attawapiskat',
          province_territory: 'Northern Ontario',
          population: 1549,
          coordinates: { latitude: 52.9275, longitude: -82.4186 },
          energy_system: {
            primary_source: 'diesel',
            diesel_consumption_liters_annual: 3200000,
            renewable_capacity_kw: 0,
            renewable_percentage: 0,
            grid_connected: false
          },
          energy_security: {
            fuel_delivery_frequency: 'seasonal',
            fuel_storage_days: 120,
            backup_generation_hours: 24,
            outage_frequency_annual: 18,
            critical_infrastructure_protected: false
          },
          transition_planning: {
            diesel_reduction_target_percent: 30,
            renewable_projects_planned: [
              {
                project_type: 'solar',
                capacity_kw: 600,
                estimated_completion: '2026-03-01',
                funding_secured: false
              }
            ],
            traditional_knowledge_integrated: false,
            community_engagement_level: 'medium'
          },
          climate_resilience: {
            extreme_weather_preparedness: 'poor',
            infrastructure_climate_adapted: false,
            emergency_response_plan: false,
            food_security_impact: 'high'
          }
        }
      ];

      setCommunityProfiles(sampleCommunities);
    } catch (error) {
      console.error('Error loading Arctic energy data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate metrics
  const metrics: ArcticMetrics = useMemo(() => {
    const total = communityProfiles.length;
    const dieselDependent = communityProfiles.filter(c => c.energy_system.primary_source === 'diesel').length;
    const renewableProjects = communityProfiles.reduce((sum, c) => sum + c.transition_planning.renewable_projects_planned.length, 0);
    const avgFuelSecurity = communityProfiles.reduce((sum, c) => sum + c.energy_security.fuel_storage_days, 0) / total;
    const traditionalKnowledge = communityProfiles.filter(c => c.transition_planning.traditional_knowledge_integrated).length;
    
    const resilienceScores = communityProfiles.map(c => {
      let score = 0;
      if (c.climate_resilience.extreme_weather_preparedness === 'excellent') score += 25;
      else if (c.climate_resilience.extreme_weather_preparedness === 'good') score += 20;
      else if (c.climate_resilience.extreme_weather_preparedness === 'needs_improvement') score += 10;
      
      if (c.climate_resilience.infrastructure_climate_adapted) score += 25;
      if (c.climate_resilience.emergency_response_plan) score += 25;
      if (c.climate_resilience.food_security_impact === 'low') score += 25;
      else if (c.climate_resilience.food_security_impact === 'medium') score += 15;
      
      return score;
    });
    const avgResilience = resilienceScores.reduce((sum, score) => sum + score, 0) / total;

    return {
      totalCommunities: total,
      dieselDependentCommunities: dieselDependent,
      renewableTransitionProjects: renewableProjects,
      averageFuelSecurity: avgFuelSecurity,
      traditionalKnowledgeIntegration: (traditionalKnowledge / total) * 100,
      climateResilienceScore: avgResilience
    };
  }, [communityProfiles]);

  // Filter communities
  const filteredCommunities = useMemo(() => {
    if (!selectedTerritory) return communityProfiles;
    return communityProfiles.filter(c => c.province_territory === selectedTerritory);
  }, [communityProfiles, selectedTerritory]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-900 rounded-lg shadow-xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Snowflake className="text-blue-300" size={32} />
            <div>
              <h1 className="text-2xl font-bold">Arctic & Northern Energy Security</h1>
              <p className="text-blue-200">Remote Community Energy • Diesel Transition • Traditional Knowledge Integration</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex bg-slate-900/40 rounded-lg p-1 border border-white/15">
              {['overview', 'communities', 'transitions', 'resilience', 'optimizer'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode as any)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    viewMode === mode
                      ? 'bg-elevated text-electric shadow-sm'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
            <select
              value={selectedTerritory}
              onChange={(e) => setSelectedTerritory(e.target.value)}
              className="px-3 py-2 bg-slate-900/40 text-white border border-white/20 rounded-lg text-sm"
            >
              <option value="" className="text-black">All Territories</option>
              <option value="Nunavut" className="text-black">Nunavut</option>
              <option value="Northwest Territories" className="text-black">Northwest Territories</option>
              <option value="Yukon" className="text-black">Yukon</option>
              <option value="Northern Ontario" className="text-black">Northern Ontario</option>
              <option value="Northern Quebec" className="text-black">Northern Quebec</option>
            </select>
            <button className="flex items-center gap-2 px-4 py-2 bg-electric text-slate-900 rounded-lg hover:bg-electric/80 transition-colors">
              <Download size={16} />
              Arctic Report
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-slate-900/40 rounded-lg p-3 border border-white/15">
            <div className="flex items-center gap-2 mb-1">
              <MapPin size={16} className="text-blue-300" />
              <span className="text-sm font-medium">Communities</span>
            </div>
            <div className="text-lg font-bold">{metrics.totalCommunities}</div>
          </div>
          
          <div className="bg-slate-900/40 rounded-lg p-3 border border-white/15">
            <div className="flex items-center gap-2 mb-1">
              <Fuel size={16} className="text-red-300" />
              <span className="text-sm font-medium">Diesel Dependent</span>
            </div>
            <div className="text-lg font-bold">{metrics.dieselDependentCommunities}</div>
          </div>
          
          <div className="bg-slate-900/40 rounded-lg p-3 border border-white/15">
            <div className="flex items-center gap-2 mb-1">
              <Zap size={16} className="text-green-300" />
              <span className="text-sm font-medium">Renewable Projects</span>
            </div>
            <div className="text-lg font-bold">{metrics.renewableTransitionProjects}</div>
          </div>
          
          <div className="bg-slate-900/40 rounded-lg p-3 border border-white/15">
            <div className="flex items-center gap-2 mb-1">
              <Clock size={16} className="text-yellow-300" />
              <span className="text-sm font-medium">Avg Fuel Security</span>
            </div>
            <div className="text-lg font-bold">{metrics.averageFuelSecurity.toFixed(0)} days</div>
          </div>
          
          <div className="bg-slate-900/40 rounded-lg p-3 border border-white/15">
            <div className="flex items-center gap-2 mb-1">
              <Leaf size={16} className="text-emerald-300" />
              <span className="text-sm font-medium">Traditional Knowledge</span>
            </div>
            <div className="text-lg font-bold">{metrics.traditionalKnowledgeIntegration.toFixed(0)}%</div>
          </div>
          
          <div className="bg-slate-900/40 rounded-lg p-3 border border-white/15">
            <div className="flex items-center gap-2 mb-1">
              <Thermometer size={16} className="text-purple-300" />
              <span className="text-sm font-medium">Climate Resilience</span>
            </div>
            <div className="text-lg font-bold">{metrics.climateResilienceScore.toFixed(0)}/100</div>
          </div>
        </div>
      </div>

      {/* Content based on view mode */}
      {viewMode === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Energy Source Distribution */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Primary Energy Sources</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={Object.entries(ENERGY_SOURCE_COLORS).map(([source, color]) => ({
                    name: source.charAt(0).toUpperCase() + source.slice(1),
                    value: filteredCommunities.filter(c => c.energy_system.primary_source === source).length,
                    color
                  }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => value > 0 ? `${name}: ${value}` : ''}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {Object.entries(ENERGY_SOURCE_COLORS).map(([source, color], index) => (
                    <Cell key={`cell-${index}`} fill={color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Renewable Transition Progress */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Renewable Transition Progress</h3>
            <div className="space-y-4">
              {filteredCommunities.map((community) => (
                <div key={community.id} className="border border-slate-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{community.community_name}</span>
                    <span className="text-sm text-slate-600">{community.energy_system.renewable_percentage.toFixed(1)}% renewable</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 transition-all duration-300"
                      style={{ width: `${community.energy_system.renewable_percentage}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-xs text-slate-500">
                    <span>Target: {community.transition_planning.diesel_reduction_target_percent}% reduction</span>
                    <span>{community.transition_planning.renewable_projects_planned.length} projects planned</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {viewMode === 'communities' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Community Energy Profiles</h3>
          
          <div className="space-y-4">
            {filteredCommunities.map((community) => (
              <div key={community.id} className="border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-medium text-slate-900">{community.community_name}</h4>
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full font-medium">
                        {community.province_territory}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                        community.energy_system.primary_source === 'diesel' ? 'bg-red-100 text-red-800' :
                        community.energy_system.primary_source === 'hydro' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {community.energy_system.primary_source.toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-slate-600 mb-3">
                      <div>
                        <p className="font-medium">Population</p>
                        <p>{community.population.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="font-medium">Renewable %</p>
                        <p>{community.energy_system.renewable_percentage.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="font-medium">Fuel Security</p>
                        <p>{community.energy_security.fuel_storage_days} days</p>
                      </div>
                      <div>
                        <p className="font-medium">Grid Connected</p>
                        <p>{community.energy_system.grid_connected ? 'Yes' : 'No'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm">
                      <span>Delivery: {community.energy_security.fuel_delivery_frequency}</span>
                      <span>Outages: {community.energy_security.outage_frequency_annual}/year</span>
                      <span>Traditional Knowledge: {community.transition_planning.traditional_knowledge_integrated ? 'Integrated' : 'Not Integrated'}</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => setSelectedCommunity(community)}
                    className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <MapPin size={14} />
                    Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Optimizer View */}
      {viewMode === 'optimizer' && (
        <div className="space-y-6">
          <div className="card shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Diesel-to-Renewable Optimization Engine</h2>
                <p className="text-sm text-slate-600">Plan your community's transition with AI-powered scenario modeling</p>
              </div>
              <Settings className="text-blue-600" size={24} />
            </div>

            {/* Community Selector for Optimization */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select Community to Optimize
              </label>
              <select
                value={selectedCommunity?.id || ''}
                onChange={(e) => {
                  const community = communityProfiles.find(c => c.id === e.target.value);
                  setSelectedCommunity(community || null);
                  setOptimizationResult(null);
                }}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Choose a Community --</option>
                {communityProfiles.map(community => (
                  <option key={community.id} value={community.id}>
                    {community.community_name} ({community.province_territory})
                  </option>
                ))}
              </select>
            </div>

            {selectedCommunity && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column: Scenario Builder */}
                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-4">Scenario Parameters</h3>
                    
                    {/* Budget Slider */}
                    <div className="mb-6">
                      <label className="flex items-center justify-between text-sm font-medium text-slate-700 mb-2">
                        <span>Budget (CAD)</span>
                        <span className="text-blue-600 font-bold">
                          ${(selectedScenario === 'custom' ? 
                            (PRESET_SCENARIOS.moderate_transition.budget_cad) : 
                            (PRESET_SCENARIOS[selectedScenario as keyof typeof PRESET_SCENARIOS]?.budget_cad || 2000000)
                          ).toLocaleString()}
                        </span>
                      </label>
                      <input
                        type="range"
                        min="100000"
                        max="10000000"
                        step="100000"
                        disabled={selectedScenario !== 'custom'}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                        style={{
                          background: selectedScenario === 'custom' ? 
                            'linear-gradient(to right, #3b82f6 0%, #3b82f6 50%, #e2e8f0 50%, #e2e8f0 100%)' : 
                            '#e2e8f0'
                        }}
                      />
                      <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>$100K</span>
                        <span>$10M</span>
                      </div>
                    </div>

                    {/* Diesel Reduction Target */}
                    <div className="mb-6">
                      <label className="flex items-center justify-between text-sm font-medium text-slate-700 mb-2">
                        <span>Diesel Reduction Target</span>
                        <span className="text-green-600 font-bold">
                          {selectedScenario === 'custom' ? 
                            50 : 
                            (PRESET_SCENARIOS[selectedScenario as keyof typeof PRESET_SCENARIOS]?.diesel_reduction_target_percent || 50)
                          }%
                        </span>
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        disabled={selectedScenario !== 'custom'}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>0%</span>
                        <span>100%</span>
                      </div>
                    </div>

                    {/* Implementation Timeline */}
                    <div className="mb-6">
                      <label className="flex items-center justify-between text-sm font-medium text-slate-700 mb-2">
                        <span>Implementation Timeline</span>
                        <span className="text-purple-600 font-bold">
                          {selectedScenario === 'custom' ? 
                            5 : 
                            (PRESET_SCENARIOS[selectedScenario as keyof typeof PRESET_SCENARIOS]?.max_implementation_years || 5)
                          } years
                        </span>
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        step="1"
                        disabled={selectedScenario !== 'custom'}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>1 year</span>
                        <span>10 years</span>
                      </div>
                    </div>

                    {/* Min Reliability */}
                    <div className="mb-6">
                      <label className="flex items-center justify-between text-sm font-medium text-slate-700 mb-2">
                        <span>Min Backup Reliability</span>
                        <span className="text-orange-600 font-bold">
                          {selectedScenario === 'custom' ? 
                            72 : 
                            (PRESET_SCENARIOS[selectedScenario as keyof typeof PRESET_SCENARIOS]?.min_reliability_hours || 72)
                          } hours
                        </span>
                      </label>
                      <input
                        type="range"
                        min="24"
                        max="168"
                        step="24"
                        disabled={selectedScenario !== 'custom'}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>24h</span>
                        <span>168h (1 week)</span>
                      </div>
                    </div>

                    {/* Renewable Technology Selector */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-3">
                        Renewable Technologies
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { id: 'solar', label: 'Solar', icon: '☀️' },
                          { id: 'wind', label: 'Wind', icon: '💨' },
                          { id: 'battery_storage', label: 'Battery', icon: '🔋' },
                          { id: 'hydro', label: 'Hydro', icon: '💧' },
                          { id: 'biomass', label: 'Biomass', icon: '🌱' }
                        ].map(tech => (
                          <label
                            key={tech.id}
                            className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border-2 border-slate-200 hover:border-blue-400 cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              defaultChecked={['solar', 'wind', 'battery_storage'].includes(tech.id)}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <span className="text-lg">{tech.icon}</span>
                            <span className="text-sm font-medium">{tech.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Preset Scenarios */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-700 mb-3">Preset Scenarios</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(PRESET_SCENARIOS).map(([key, scenario]) => (
                        <button
                          key={key}
                          onClick={() => setSelectedScenario(key)}
                          className={`px-4 py-3 rounded-lg border-2 transition-all ${
                            selectedScenario === key
                              ? 'border-blue-600 bg-blue-50 text-blue-900'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'
                          }`}
                        >
                          <div className="font-bold text-sm">{scenario.name}</div>
                          <div className="text-xs mt-1 opacity-75">
                            {scenario.diesel_reduction_target_percent}% reduction
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Run Optimization Button */}
                  <button
                    onClick={() => {
                      setOptimizing(true);
                      setTimeout(() => {
                        const result = optimizeDieselToRenewable(
                          {
                            community_name: selectedCommunity.community_name,
                            current_diesel_consumption_liters_annual: selectedCommunity.energy_system.diesel_consumption_liters_annual,
                            diesel_price_per_liter: 1.50,
                            population: selectedCommunity.population,
                            current_renewable_capacity_kw: selectedCommunity.energy_system.renewable_capacity_kw,
                            grid_connected: selectedCommunity.energy_system.grid_connected
                          },
                          PRESET_SCENARIOS[selectedScenario as keyof typeof PRESET_SCENARIOS] || PRESET_SCENARIOS.moderate_transition,
                          ['solar', 'wind', 'battery_storage']
                        );
                        setOptimizationResult(result);
                        setOptimizing(false);
                      }, 1000);
                    }}
                    disabled={optimizing}
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-bold hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                  >
                    {optimizing ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Optimizing...</span>
                      </>
                    ) : (
                      <>
                        <Play size={20} />
                        <span>Run Optimization</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Right Column: Results Display */}
                <div className="space-y-6">
                  {optimizationResult ? (
                    <>
                      {/* Success/Feasibility Indicator */}
                      <div className={`rounded-lg p-4 ${
                        optimizationResult.feasible
                          ? 'bg-green-50 border-2 border-green-200'
                          : 'bg-yellow-50 border-2 border-yellow-200'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          {optimizationResult.feasible ? (
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          ) : (
                            <AlertTriangle className="text-yellow-600" size={20} />
                          )}
                          <span className={`font-bold ${
                            optimizationResult.feasible ? 'text-green-900' : 'text-yellow-900'
                          }`}>
                            {optimizationResult.feasible ? 'Feasible Solution Found' : 'Partially Feasible'}
                          </span>
                        </div>
                        <p className="text-sm">
                          Confidence: <span className="font-bold capitalize">{optimizationResult.confidence}</span>
                        </p>
                      </div>

                      {/* Key Metrics */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white">
                          <p className="text-sm opacity-90 mb-1">Total Investment</p>
                          <p className="text-2xl font-bold">${(optimizationResult.total_cost_cad / 1000000).toFixed(2)}M</p>
                        </div>
                        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 text-white">
                          <p className="text-sm opacity-90 mb-1">Annual Savings</p>
                          <p className="text-2xl font-bold">${(optimizationResult.annual_savings_cad / 1000).toFixed(0)}K</p>
                        </div>
                        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 text-white">
                          <p className="text-sm opacity-90 mb-1">Payback Period</p>
                          <p className="text-2xl font-bold">{optimizationResult.payback_period_years} years</p>
                        </div>
                        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-4 text-white">
                          <p className="text-sm opacity-90 mb-1">Reliability Score</p>
                          <p className="text-2xl font-bold">{optimizationResult.reliability_score}/100</p>
                        </div>
                      </div>

                      {/* Diesel Reduction Gauge */}
                      <div className="bg-white rounded-lg border-2 border-slate-200 p-6">
                        <h4 className="font-bold text-slate-900 mb-4">Diesel Reduction Achievement</h4>
                        <div className="relative pt-1">
                          <div className="flex mb-2 items-center justify-between">
                            <div>
                              <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-green-600 bg-green-200">
                                Target: {PRESET_SCENARIOS[selectedScenario as keyof typeof PRESET_SCENARIOS]?.diesel_reduction_target_percent || 50}%
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-semibold inline-block text-green-600">
                                {optimizationResult.diesel_reduction_percent.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                          <div className="overflow-hidden h-4 mb-4 text-xs flex rounded-full bg-slate-200">
                            <div
                              style={{ width: `${optimizationResult.diesel_reduction_percent}%` }}
                              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-green-400 to-green-600 transition-all duration-500"
                            ></div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Leaf size={16} className="text-green-600" />
                          <span>CO₂ Reduction: <strong>{optimizationResult.co2_reduction_tonnes_annual.toFixed(1)} tonnes/year</strong></span>
                        </div>
                      </div>

                      {/* Recommended Mix */}
                      <div className="bg-white rounded-lg border-2 border-slate-200 p-6">
                        <h4 className="font-bold text-slate-900 mb-4">Recommended Energy Mix</h4>
                        <div className="space-y-3">
                          {optimizationResult.recommended_mix.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
                                  {item.type === 'solar' && '☀️'}
                                  {item.type === 'wind' && '💨'}
                                  {item.type === 'battery_storage' && '🔋'}
                                  {item.type === 'hydro' && '💧'}
                                  {item.type === 'biomass' && '🌱'}
                                </div>
                                <div>
                                  <p className="font-medium text-slate-900 capitalize">{item.type.replace('_', ' ')}</p>
                                  <p className="text-sm text-slate-600">{item.capacity_kw.toFixed(1)} kW</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-blue-600">${(item.cost_cad / 1000).toFixed(0)}K</p>
                                <p className="text-xs text-slate-500">{(item.annual_generation_kwh / 1000).toFixed(0)} MWh/yr</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Implementation Timeline */}
                      <div className="bg-white rounded-lg border-2 border-slate-200 p-6">
                        <h4 className="font-bold text-slate-900 mb-4">Implementation Timeline</h4>
                        <div className="space-y-3">
                          {optimizationResult.timeline.map((phase, idx) => (
                            <div key={idx} className="flex items-start gap-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <Clock size={16} className="text-blue-600" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <p className="font-medium text-slate-900">Year {phase.year}</p>
                                  <p className="font-bold text-blue-600">${(phase.cost_cad / 1000).toFixed(0)}K</p>
                                </div>
                                <p className="text-sm text-slate-600">{phase.action}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Warnings */}
                      {optimizationResult.warnings.length > 0 && (
                        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
                          <h4 className="flex items-center gap-2 font-bold text-yellow-900 mb-2">
                            <AlertTriangle size={18} />
                            Considerations
                          </h4>
                          <ul className="space-y-1 text-sm text-yellow-800">
                            {optimizationResult.warnings.map((warning, idx) => (
                              <li key={idx}>• {warning}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Assumptions */}
                      <div className="bg-slate-50 rounded-lg p-4">
                        <h4 className="font-bold text-slate-700 mb-2 text-sm">Assumptions</h4>
                        <ul className="space-y-1 text-xs text-slate-600">
                          {optimizationResult.assumptions.map((assumption, idx) => (
                            <li key={idx}>• {assumption}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Export Button */}
                      <button
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors"
                      >
                        <Download size={18} />
                        <span>Export Optimization Report</span>
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center py-20">
                      <Settings className="text-slate-300 mb-4" size={64} />
                      <h3 className="text-xl font-bold text-slate-900 mb-2">Ready to Optimize</h3>
                      <p className="text-slate-600 max-w-md">
                        Adjust the parameters on the left and click "Run Optimization" to generate a customized diesel-to-renewable transition plan for {selectedCommunity.community_name}.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!selectedCommunity && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <MapPin className="text-slate-300 mb-4" size={64} />
                <h3 className="text-xl font-bold text-slate-900 mb-2">Select a Community</h3>
                <p className="text-slate-600 max-w-md">
                  Choose a community from the dropdown above to start optimizing their energy transition plan.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Community Details Modal */}
      {selectedCommunity && viewMode !== 'optimizer' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold">{selectedCommunity.community_name} - Energy Profile</h4>
              <button
                onClick={() => setSelectedCommunity(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Energy System Details */}
              <div>
                <h5 className="font-medium text-slate-900 mb-3">Energy System</h5>
                <div className="space-y-3">
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-sm font-medium text-slate-700">Primary Source</p>
                    <p className="text-lg font-bold capitalize">{selectedCommunity.energy_system.primary_source}</p>
                  </div>
                  
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-sm font-medium text-slate-700">Annual Diesel Consumption</p>
                    <p className="text-lg font-bold">{(selectedCommunity.energy_system.diesel_consumption_liters_annual / 1000).toLocaleString()}k L</p>
                  </div>
                  
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-sm font-medium text-slate-700">Renewable Capacity</p>
                    <p className="text-lg font-bold">{selectedCommunity.energy_system.renewable_capacity_kw} kW</p>
                  </div>
                </div>
              </div>

              {/* Transition Planning */}
              <div>
                <h5 className="font-medium text-slate-900 mb-3">Transition Planning</h5>
                <div className="space-y-3">
                  <div className="bg-green-50 rounded-lg p-3">
                    <p className="text-sm font-medium text-green-700">Diesel Reduction Target</p>
                    <p className="text-lg font-bold text-green-900">{selectedCommunity.transition_planning.diesel_reduction_target_percent}%</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-slate-700 mb-2">Planned Projects</p>
                    <div className="space-y-2">
                      {selectedCommunity.transition_planning.renewable_projects_planned.map((project, index) => (
                        <div key={index} className="border border-slate-200 rounded p-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium capitalize">{project.project_type.replace('_', ' ')}</span>
                            <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                              project.funding_secured ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {project.funding_secured ? 'Funded' : 'Pending'}
                            </span>
                          </div>
                          <div className="text-xs text-slate-600 mt-1">
                            <p>{project.capacity_kw} kW • Completion: {new Date(project.estimated_completion).toLocaleDateString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArcticEnergySecurityMonitor;
