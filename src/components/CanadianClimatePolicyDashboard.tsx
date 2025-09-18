/**
 * Canadian Climate Policy Dashboard
 * 
 * Comprehensive tracking of federal climate policy compliance including:
 * - Federal Carbon Pricing System
 * - Clean Fuel Regulations
 * - Net Zero Emissions Accountability Act
 * - Provincial climate policy alignment
 */

import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { 
  Leaf, TrendingDown, Target, DollarSign, Fuel, 
  CheckCircle, AlertTriangle, Calendar, FileText,
  Globe, Factory, Zap, Download, Filter
} from 'lucide-react';
import { 
  canadianRegulatoryService,
  type CarbonPricingCompliance,
  type CleanFuelRegulationsCompliance,
  type NetZeroAccountabilityTracking
} from '../lib/canadianRegulatory';

interface ClimateMetrics {
  totalEmissionsReduction: number;
  carbonPriceRevenue: number;
  cleanFuelComplianceRate: number;
  netZeroProgress: number;
  sectoralAlignment: number;
}

interface EmissionsTrend {
  year: number;
  actual_emissions: number;
  target_emissions: number;
  reduction_percent: number;
  carbon_price: number;
}

export const CanadianClimatePolicyDashboard: React.FC = () => {
  const [carbonPricingData, setCarbonPricingData] = useState<CarbonPricingCompliance[]>([]);
  const [cleanFuelData, setCleanFuelData] = useState<CleanFuelRegulationsCompliance[]>([]);
  const [netZeroData, setNetZeroData] = useState<NetZeroAccountabilityTracking[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'overview' | 'carbon_pricing' | 'clean_fuel' | 'net_zero'>('overview');
  const [selectedProvince, setSelectedProvince] = useState<string>('');

  useEffect(() => {
    loadClimateData();
  }, []);

  const loadClimateData = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Sample Carbon Pricing Data
      const sampleCarbonPricing: CarbonPricingCompliance[] = [
        {
          id: 'cp_001',
          facility_id: 'facility_001',
          facility_name: 'Suncor Oil Sands Operations',
          operator: 'Suncor Energy',
          province: 'Alberta',
          carbon_pricing_system: 'provincial_system',
          annual_emissions_co2e: 25000000,
          carbon_price_cad_per_tonne: 65,
          annual_carbon_cost_cad: 1625000000,
          compliance_instruments: [
            {
              instrument_type: 'allowance',
              quantity: 20000000,
              vintage_year: 2024,
              cost_cad: 1300000000
            },
            {
              instrument_type: 'offset',
              quantity: 3000000,
              vintage_year: 2024,
              cost_cad: 195000000
            },
            {
              instrument_type: 'payment',
              quantity: 2000000,
              vintage_year: 2024,
              cost_cad: 130000000
            }
          ],
          reporting_compliance: {
            ghg_report_submitted: true,
            submission_deadline: '2024-06-01',
            verification_status: 'verified'
          }
        },
        {
          id: 'cp_002',
          facility_id: 'facility_002',
          facility_name: 'Nanticoke Generating Station',
          operator: 'Ontario Power Generation',
          province: 'Ontario',
          carbon_pricing_system: 'federal_backstop',
          annual_emissions_co2e: 8500000,
          carbon_price_cad_per_tonne: 65,
          annual_carbon_cost_cad: 552500000,
          compliance_instruments: [
            {
              instrument_type: 'payment',
              quantity: 8500000,
              vintage_year: 2024,
              cost_cad: 552500000
            }
          ],
          reporting_compliance: {
            ghg_report_submitted: true,
            submission_deadline: '2024-06-01',
            verification_status: 'verified'
          }
        }
      ];

      // Sample Clean Fuel Regulations Data
      const sampleCleanFuel: CleanFuelRegulationsCompliance[] = [
        {
          id: 'cfr_001',
          fuel_supplier: 'Imperial Oil Limited',
          fuel_type: 'gasoline',
          annual_volume_liters: 5000000000,
          carbon_intensity_baseline: 93.67,
          carbon_intensity_actual: 89.2,
          carbon_intensity_reduction_percent: 4.77,
          compliance_credits: 2500000,
          compliance_deficit: 0,
          compliance_actions: [
            {
              action_type: 'biofuel_blending',
              description: 'Ethanol blending at 10% volume',
              carbon_intensity_reduction: 3.2,
              cost_cad: 45000000
            },
            {
              action_type: 'credit_purchase',
              description: 'Purchase of renewable fuel credits',
              carbon_intensity_reduction: 1.57,
              cost_cad: 12000000
            }
          ]
        },
        {
          id: 'cfr_002',
          fuel_supplier: 'Shell Canada',
          fuel_type: 'diesel',
          annual_volume_liters: 3200000000,
          carbon_intensity_baseline: 95.1,
          carbon_intensity_actual: 91.8,
          carbon_intensity_reduction_percent: 3.47,
          compliance_credits: 1800000,
          compliance_deficit: 500000,
          compliance_actions: [
            {
              action_type: 'biofuel_blending',
              description: 'Biodiesel blending at 5% volume',
              carbon_intensity_reduction: 2.1,
              cost_cad: 28000000
            },
            {
              action_type: 'project_investment',
              description: 'Investment in renewable diesel production',
              carbon_intensity_reduction: 1.37,
              cost_cad: 85000000
            }
          ]
        }
      ];

      // Sample Net Zero Accountability Data
      const sampleNetZero: NetZeroAccountabilityTracking[] = [
        {
          id: 'nz_001',
          sector: 'Electricity',
          subsector: 'Electricity Generation',
          baseline_emissions_2005: 118000000,
          current_emissions_co2e: 61000000,
          emissions_reduction_percent: 48.3,
          net_zero_target_year: 2035,
          interim_targets: [
            {
              target_year: 2030,
              target_emissions_co2e: 35000000,
              progress_status: 'on_track'
            },
            {
              target_year: 2035,
              target_emissions_co2e: 0,
              progress_status: 'on_track'
            }
          ],
          sectoral_plan_alignment: {
            plan_exists: true,
            plan_updated: '2024-03-15',
            key_measures: [
              'Clean Electricity Standard',
              'Renewable energy investments',
              'Grid modernization',
              'Energy storage deployment'
            ],
            investment_committed_cad: 15000000000
          }
        },
        {
          id: 'nz_002',
          sector: 'Oil and Gas',
          subsector: 'Upstream Oil and Gas',
          baseline_emissions_2005: 158000000,
          current_emissions_co2e: 191000000,
          emissions_reduction_percent: -20.9,
          net_zero_target_year: 2050,
          interim_targets: [
            {
              target_year: 2030,
              target_emissions_co2e: 110000000,
              progress_status: 'behind'
            },
            {
              target_year: 2050,
              target_emissions_co2e: 0,
              progress_status: 'behind'
            }
          ],
          sectoral_plan_alignment: {
            plan_exists: true,
            plan_updated: '2024-06-20',
            key_measures: [
              'Methane emissions reduction',
              'Carbon capture and storage',
              'Clean technology adoption',
              'Regulatory frameworks'
            ],
            investment_committed_cad: 8500000000
          }
        }
      ];

      setCarbonPricingData(sampleCarbonPricing);
      setCleanFuelData(sampleCleanFuel);
      setNetZeroData(sampleNetZero);
    } catch (error) {
      console.error('Error loading climate policy data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate metrics
  const metrics: ClimateMetrics = useMemo(() => {
    const totalEmissionsReduction = netZeroData.reduce((sum, sector) => 
      sum + Math.max(0, sector.emissions_reduction_percent), 0
    ) / netZeroData.length;

    const carbonPriceRevenue = carbonPricingData.reduce((sum, facility) => 
      sum + facility.annual_carbon_cost_cad, 0
    );

    const cleanFuelComplianceRate = cleanFuelData.length > 0 ?
      (cleanFuelData.filter(supplier => supplier.compliance_deficit === 0).length / cleanFuelData.length) * 100 : 0;

    const netZeroProgress = netZeroData.length > 0 ?
      netZeroData.reduce((sum, sector) => {
        const onTrackTargets = sector.interim_targets.filter(t => t.progress_status === 'on_track').length;
        return sum + (onTrackTargets / sector.interim_targets.length) * 100;
      }, 0) / netZeroData.length : 0;

    const sectoralAlignment = netZeroData.filter(sector => sector.sectoral_plan_alignment.plan_exists).length / netZeroData.length * 100;

    return {
      totalEmissionsReduction,
      carbonPriceRevenue,
      cleanFuelComplianceRate,
      netZeroProgress,
      sectoralAlignment
    };
  }, [carbonPricingData, cleanFuelData, netZeroData]);

  // Generate emissions trend data
  const emissionsTrend: EmissionsTrend[] = useMemo(() => {
    return Array.from({ length: 10 }, (_, i) => {
      const year = 2015 + i;
      const baselineEmissions = 730000000; // 2005 baseline
      const currentReduction = Math.min(year - 2015, 8) * 3.2; // Progressive reduction
      const actualEmissions = baselineEmissions * (1 - currentReduction / 100);
      const targetReduction = Math.min(year - 2015, 8) * 4.5; // Target reduction
      const targetEmissions = baselineEmissions * (1 - targetReduction / 100);
      
      return {
        year,
        actual_emissions: Math.round(actualEmissions / 1000000), // Convert to Mt
        target_emissions: Math.round(targetEmissions / 1000000),
        reduction_percent: currentReduction,
        carbon_price: Math.min(10 + (year - 2015) * 6, 65) // Progressive carbon price
      };
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-900 via-emerald-800 to-teal-900 rounded-lg shadow-xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Leaf className="text-green-300" size={32} />
            <div>
              <h1 className="text-2xl font-bold">Canadian Climate Policy Dashboard</h1>
              <p className="text-green-200">Federal Carbon Pricing • Clean Fuel Regulations • Net Zero Accountability Act</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex bg-white/10 rounded-lg p-1">
              {['overview', 'carbon_pricing', 'clean_fuel', 'net_zero'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode as any)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    viewMode === mode
                      ? 'bg-white text-green-600 shadow-sm'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  {mode.replace('_', ' ').charAt(0).toUpperCase() + mode.replace('_', ' ').slice(1)}
                </button>
              ))}
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-white text-green-600 rounded-lg hover:bg-green-50 transition-colors">
              <Download size={16} />
              Climate Report
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white/10 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown size={16} className="text-green-300" />
              <span className="text-sm font-medium">Emissions Reduction</span>
            </div>
            <div className="text-lg font-bold">{metrics.totalEmissionsReduction.toFixed(1)}%</div>
          </div>
          
          <div className="bg-white/10 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign size={16} className="text-yellow-300" />
              <span className="text-sm font-medium">Carbon Revenue</span>
            </div>
            <div className="text-lg font-bold">${(metrics.carbonPriceRevenue / 1000000000).toFixed(1)}B</div>
          </div>
          
          <div className="bg-white/10 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Fuel size={16} className="text-blue-300" />
              <span className="text-sm font-medium">Clean Fuel Compliance</span>
            </div>
            <div className="text-lg font-bold">{metrics.cleanFuelComplianceRate.toFixed(0)}%</div>
          </div>
          
          <div className="bg-white/10 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Target size={16} className="text-purple-300" />
              <span className="text-sm font-medium">Net Zero Progress</span>
            </div>
            <div className="text-lg font-bold">{metrics.netZeroProgress.toFixed(0)}%</div>
          </div>
          
          <div className="bg-white/10 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle size={16} className="text-emerald-300" />
              <span className="text-sm font-medium">Sectoral Alignment</span>
            </div>
            <div className="text-lg font-bold">{metrics.sectoralAlignment.toFixed(0)}%</div>
          </div>
        </div>
      </div>

      {/* Content based on view mode */}
      {viewMode === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* National Emissions Trend */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">National Emissions Trajectory</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={emissionsTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="actual_emissions" stroke="#EF4444" strokeWidth={2} name="Actual Emissions (Mt CO₂e)" />
                <Line type="monotone" dataKey="target_emissions" stroke="#10B981" strokeWidth={2} strokeDasharray="5 5" name="Target Emissions (Mt CO₂e)" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Carbon Price Evolution */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Federal Carbon Price Trajectory</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={emissionsTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="carbon_price" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} name="Carbon Price (CAD/tonne)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {viewMode === 'carbon_pricing' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Carbon Pricing System Compliance</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Provincial Systems Breakdown */}
              <div>
                <h4 className="font-medium text-slate-900 mb-3">Provincial Carbon Pricing Systems</h4>
                <div className="space-y-3">
                  {['federal_backstop', 'provincial_system', 'cap_and_trade'].map((system) => {
                    const facilities = carbonPricingData.filter(f => f.carbon_pricing_system === system);
                    const totalCost = facilities.reduce((sum, f) => sum + f.annual_carbon_cost_cad, 0);
                    
                    return (
                      <div key={system} className="border border-slate-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium capitalize">{system.replace('_', ' ')}</span>
                          <span className="text-sm text-slate-600">{facilities.length} facilities</span>
                        </div>
                        <div className="text-sm text-slate-600">
                          <p>Total Cost: ${(totalCost / 1000000).toFixed(0)}M CAD</p>
                          <p>Avg Price: $65/tonne CO₂e</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Compliance Instruments */}
              <div>
                <h4 className="font-medium text-slate-900 mb-3">Compliance Instruments Usage</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={[
                    { instrument: 'Allowances', usage: 65, cost: 1300 },
                    { instrument: 'Offsets', usage: 25, cost: 195 },
                    { instrument: 'Payments', usage: 10, cost: 130 }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="instrument" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="usage" fill="#3B82F6" name="Usage %" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Facility Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <h4 className="font-medium text-slate-900 mb-3">Large Emitter Compliance</h4>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-medium text-slate-900">Facility</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-900">Province</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-900">Emissions (tCO₂e)</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-900">Carbon Cost</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-900">Compliance Status</th>
                  </tr>
                </thead>
                <tbody>
                  {carbonPricingData.map((facility) => (
                    <tr key={facility.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{facility.facility_name}</p>
                          <p className="text-sm text-slate-600">{facility.operator}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">{facility.province}</td>
                      <td className="py-3 px-4">{(facility.annual_emissions_co2e / 1000000).toFixed(1)}M</td>
                      <td className="py-3 px-4">${(facility.annual_carbon_cost_cad / 1000000).toFixed(0)}M</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                          facility.reporting_compliance.verification_status === 'verified' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {facility.reporting_compliance.verification_status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'net_zero' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Net Zero Emissions Accountability Act Progress</h3>
            
            <div className="space-y-6">
              {netZeroData.map((sector) => (
                <div key={sector.id} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-medium text-slate-900">{sector.sector} - {sector.subsector}</h4>
                      <p className="text-sm text-slate-600">Target: Net Zero by {sector.net_zero_target_year}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${
                        sector.emissions_reduction_percent > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {sector.emissions_reduction_percent > 0 ? '-' : '+'}{Math.abs(sector.emissions_reduction_percent).toFixed(1)}%
                      </p>
                      <p className="text-sm text-slate-600">vs 2005 baseline</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-medium text-slate-700 mb-2">Interim Targets Progress</h5>
                      <div className="space-y-2">
                        {sector.interim_targets.map((target, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                            <span className="text-sm">{target.target_year}: {(target.target_emissions_co2e / 1000000).toFixed(0)}Mt</span>
                            <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                              target.progress_status === 'on_track' ? 'bg-green-100 text-green-800' :
                              target.progress_status === 'ahead' ? 'bg-blue-100 text-blue-800' :
                              target.progress_status === 'behind' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {target.progress_status.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h5 className="font-medium text-slate-700 mb-2">Sectoral Plan Measures</h5>
                      <div className="space-y-1">
                        {sector.sectoral_plan_alignment.key_measures.map((measure, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <CheckCircle size={12} className="text-green-500" />
                            <span>{measure}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 text-sm text-slate-600">
                        <p>Investment Committed: ${(sector.sectoral_plan_alignment.investment_committed_cad / 1000000000).toFixed(1)}B CAD</p>
                        <p>Plan Updated: {new Date(sector.sectoral_plan_alignment.plan_updated).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CanadianClimatePolicyDashboard;
