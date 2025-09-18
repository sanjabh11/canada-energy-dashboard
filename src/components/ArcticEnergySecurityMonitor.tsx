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
  Battery, Truck, Home, Factory, Download, Filter
} from 'lucide-react';

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
  const [viewMode, setViewMode] = useState<'overview' | 'communities' | 'transitions' | 'resilience'>('overview');
  const [selectedCommunity, setSelectedCommunity] = useState<CommunityEnergyProfile | null>(null);

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
            <div className="flex bg-white/10 rounded-lg p-1">
              {['overview', 'communities', 'transitions', 'resilience'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode as any)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    viewMode === mode
                      ? 'bg-white text-blue-600 shadow-sm'
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
              className="px-3 py-2 bg-white/10 text-white border border-white/20 rounded-lg text-sm"
            >
              <option value="" className="text-black">All Territories</option>
              <option value="Nunavut" className="text-black">Nunavut</option>
              <option value="Northwest Territories" className="text-black">Northwest Territories</option>
              <option value="Yukon" className="text-black">Yukon</option>
              <option value="Northern Ontario" className="text-black">Northern Ontario</option>
              <option value="Northern Quebec" className="text-black">Northern Quebec</option>
            </select>
            <button className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
              <Download size={16} />
              Arctic Report
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white/10 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <MapPin size={16} className="text-blue-300" />
              <span className="text-sm font-medium">Communities</span>
            </div>
            <div className="text-lg font-bold">{metrics.totalCommunities}</div>
          </div>
          
          <div className="bg-white/10 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Fuel size={16} className="text-red-300" />
              <span className="text-sm font-medium">Diesel Dependent</span>
            </div>
            <div className="text-lg font-bold">{metrics.dieselDependentCommunities}</div>
          </div>
          
          <div className="bg-white/10 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Zap size={16} className="text-green-300" />
              <span className="text-sm font-medium">Renewable Projects</span>
            </div>
            <div className="text-lg font-bold">{metrics.renewableTransitionProjects}</div>
          </div>
          
          <div className="bg-white/10 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock size={16} className="text-yellow-300" />
              <span className="text-sm font-medium">Avg Fuel Security</span>
            </div>
            <div className="text-lg font-bold">{metrics.averageFuelSecurity.toFixed(0)} days</div>
          </div>
          
          <div className="bg-white/10 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Leaf size={16} className="text-emerald-300" />
              <span className="text-sm font-medium">Traditional Knowledge</span>
            </div>
            <div className="text-lg font-bold">{metrics.traditionalKnowledgeIntegration.toFixed(0)}%</div>
          </div>
          
          <div className="bg-white/10 rounded-lg p-3">
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
          <div className="bg-white rounded-lg shadow p-6">
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
          <div className="bg-white rounded-lg shadow p-6">
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

      {/* Community Details Modal */}
      {selectedCommunity && (
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
