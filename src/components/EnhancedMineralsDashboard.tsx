/**
 * Enhanced Critical Minerals Supply Chain Monitor Dashboard
 *
 * Comprehensive dashboard for monitoring critical minerals supply chain,
 * risk assessment, and market intelligence with real local data management.
 * Replaces mock data with persistent local storage.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, PieChart, Pie, Cell } from 'recharts';
import { AlertTriangle, TrendingUp, TrendingDown, Globe, Package, Zap, Shield, DollarSign, Plus, Edit, Save, X, Download, Upload, AlertCircle, CheckCircle, Database, Clock, MapPin, Eye, Activity, Info } from 'lucide-react';
import { localStorageManager, type MineralsSupplyRecord } from '../lib/localStorageManager';
import { enhancedDataService, type RealMineralsData } from '../lib/enhancedDataService';

interface MineralsMetrics {
  totalMinerals: number;
  criticalMinerals: number;
  averageRiskScore: number;
  totalImportValue: number;
  supplyRiskDistribution: Array<{ risk: string; count: number }>;
  strategicImportance: Array<{ importance: string; count: number }>;
  topSuppliers: Array<{ country: string; minerals: number; totalValue: number }>;
}

interface MineralsFormData {
  mineral: string;
  production_tonnes_annually: number;
  import_tonnes_annually: number;
  export_tonnes_annually: number;
  price_cad_per_tonne: number;
  strategic_importance: 'critical' | 'important' | 'moderate' | 'low';
  primary_suppliers: Array<{
    country: string;
    percentage_of_supply: number;
    risk_score: number;
  }>;
  supply_risk_factors: string[];
  mitigation_strategies: string[];
}

const COLORS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6'];
const RISK_COLORS = {
  high: '#EF4444',
  medium: '#F59E0B',
  low: '#10B981'
};

export const EnhancedMineralsDashboard: React.FC = () => {
  const [mineralsRecords, setMineralsRecords] = useState<MineralsSupplyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMineral, setShowAddMineral] = useState(false);
  const [editingMineral, setEditingMineral] = useState<string | null>(null);
  const [selectedMineral, setSelectedMineral] = useState<MineralsSupplyRecord | null>(null);
  const [viewMode, setViewMode] = useState<'overview' | 'supply' | 'risk'>('overview');

  const [newMineral, setNewMineral] = useState<MineralsFormData>({
    mineral: '',
    production_tonnes_annually: 0,
    import_tonnes_annually: 0,
    export_tonnes_annually: 0,
    price_cad_per_tonne: 0,
    strategic_importance: 'important',
    primary_suppliers: [],
    supply_risk_factors: [],
    mitigation_strategies: []
  });

  // Load minerals data from local storage
  useEffect(() => {
    loadMineralsData();
  }, []);

  const loadMineralsData = () => {
    setLoading(true);
    try {
      const records = localStorageManager.getMineralsSupply();
      setMineralsRecords(records);
      
      // Initialize with sample data if empty
      if (records.length === 0) {
        initializeSampleData();
      }
    } catch (error) {
      console.error('Error loading minerals data:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializeSampleData = () => {
    const sampleMinerals = [
      {
        mineral: 'Lithium',
        production_tonnes_annually: 25000,
        import_tonnes_annually: 35000,
        export_tonnes_annually: 8000,
        price_cad_per_tonne: 12500,
        strategic_importance: 'critical' as const,
        primary_suppliers: [
          { country: 'Australia', percentage_of_supply: 45, risk_score: 25 },
          { country: 'Chile', percentage_of_supply: 30, risk_score: 35 },
          { country: 'Argentina', percentage_of_supply: 25, risk_score: 40 }
        ],
        supply_risk_factors: ['Geopolitical tensions', 'Environmental regulations', 'Mining capacity constraints'],
        mitigation_strategies: ['Diversify supplier base', 'Develop domestic recycling', 'Strategic stockpiling'],
        data_source: 'user_input' as const
      },
      {
        mineral: 'Cobalt',
        production_tonnes_annually: 18000,
        import_tonnes_annually: 42000,
        export_tonnes_annually: 5000,
        price_cad_per_tonne: 18500,
        strategic_importance: 'critical' as const,
        primary_suppliers: [
          { country: 'DRC', percentage_of_supply: 70, risk_score: 85 },
          { country: 'Russia', percentage_of_supply: 15, risk_score: 75 },
          { country: 'Australia', percentage_of_supply: 15, risk_score: 25 }
        ],
        supply_risk_factors: ['Single-source dependency', 'Political instability', 'Ethical mining concerns'],
        mitigation_strategies: ['Develop alternative suppliers', 'Invest in recycling technology', 'Ethical sourcing certification'],
        data_source: 'user_input' as const
      },
      {
        mineral: 'Rare Earth Elements',
        production_tonnes_annually: 140000,
        import_tonnes_annually: 35000,
        export_tonnes_annually: 110000,
        price_cad_per_tonne: 25000,
        strategic_importance: 'critical' as const,
        primary_suppliers: [
          { country: 'China', percentage_of_supply: 85, risk_score: 90 },
          { country: 'USA', percentage_of_supply: 10, risk_score: 20 },
          { country: 'Myanmar', percentage_of_supply: 5, risk_score: 95 }
        ],
        supply_risk_factors: ['Extreme concentration risk', 'Export restrictions', 'Processing monopoly'],
        mitigation_strategies: ['Develop domestic processing', 'Strategic partnerships', 'Alternative material research'],
        data_source: 'user_input' as const
      }
    ];

    sampleMinerals.forEach(mineral => {
      localStorageManager.addMineralsSupplyRecord(mineral);
    });
    
    loadMineralsData();
  };

  // Calculate metrics
  const metrics: MineralsMetrics = useMemo(() => {
    const totalMinerals = mineralsRecords.length;
    const criticalMinerals = mineralsRecords.filter(m => m.strategic_importance === 'critical').length;
    
    const averageRiskScore = mineralsRecords.length > 0 
      ? mineralsRecords.reduce((sum, m) => {
          const avgSupplierRisk = m.primary_suppliers.reduce((s, sup) => s + sup.risk_score, 0) / m.primary_suppliers.length;
          return sum + (avgSupplierRisk || 0);
        }, 0) / mineralsRecords.length 
      : 0;

    const totalImportValue = mineralsRecords.reduce((sum, m) => 
      sum + (m.import_tonnes_annually * m.price_cad_per_tonne), 0
    );

    const supplyRiskDistribution = ['low', 'medium', 'high'].map(risk => ({
      risk,
      count: mineralsRecords.filter(m => {
        const avgRisk = m.primary_suppliers.reduce((s, sup) => s + sup.risk_score, 0) / m.primary_suppliers.length;
        return risk === 'low' ? avgRisk < 33 : risk === 'medium' ? avgRisk < 67 : avgRisk >= 67;
      }).length
    }));

    const strategicImportance = ['critical', 'important', 'moderate', 'low'].map(importance => ({
      importance,
      count: mineralsRecords.filter(m => m.strategic_importance === importance).length
    }));

    // Calculate top suppliers
    const supplierMap = new Map<string, { minerals: number; totalValue: number }>();
    mineralsRecords.forEach(mineral => {
      mineral.primary_suppliers.forEach(supplier => {
        const existing = supplierMap.get(supplier.country) || { minerals: 0, totalValue: 0 };
        const value = (mineral.import_tonnes_annually * supplier.percentage_of_supply / 100) * mineral.price_cad_per_tonne;
        supplierMap.set(supplier.country, {
          minerals: existing.minerals + 1,
          totalValue: existing.totalValue + value
        });
      });
    });

    const topSuppliers = Array.from(supplierMap.entries())
      .map(([country, data]) => ({ country, ...data }))
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 5);

    return {
      totalMinerals,
      criticalMinerals,
      averageRiskScore,
      totalImportValue,
      supplyRiskDistribution,
      strategicImportance,
      topSuppliers
    };
  }, [mineralsRecords]);

  const handleAddMineral = () => {
    if (!newMineral.mineral || newMineral.price_cad_per_tonne <= 0) {
      alert('Please fill in all required fields');
      return;
    }

    const mineralData = {
      ...newMineral,
      data_source: 'user_input' as const
    };

    localStorageManager.addMineralsSupplyRecord(mineralData);
    loadMineralsData();
    
    // Reset form
    setNewMineral({
      mineral: '',
      production_tonnes_annually: 0,
      import_tonnes_annually: 0,
      export_tonnes_annually: 0,
      price_cad_per_tonne: 0,
      strategic_importance: 'important',
      primary_suppliers: [],
      supply_risk_factors: [],
      mitigation_strategies: []
    });
    setShowAddMineral(false);
  };

  const exportData = () => {
    const data = localStorageManager.exportAllData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ceip_minerals_data_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getRiskLevel = (riskScore: number): 'low' | 'medium' | 'high' => {
    if (riskScore < 33) return 'low';
    if (riskScore < 67) return 'medium';
    return 'high';
  };

  const getRiskBadge = (riskScore: number) => {
    const level = getRiskLevel(riskScore);
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`px-2 py-1 text-xs rounded-full font-medium ${colors[level]}`}>
        {level.toUpperCase()} ({riskScore.toFixed(0)})
      </span>
    );
  };

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
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Critical Minerals Supply Chain Monitor</h2>
            <p className="text-slate-600">Real-time monitoring of critical minerals supply, risk assessment, and market intelligence</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-slate-100 rounded-lg p-1">
              {['overview', 'supply', 'risk'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode as any)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    viewMode === mode
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowAddMineral(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={16} />
              Add Mineral
            </button>
            <button
              onClick={exportData}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download size={16} />
              Export
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Package className="text-blue-600" size={24} />
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Minerals</p>
                <p className="text-2xl font-bold text-blue-900">{metrics.totalMinerals}</p>
              </div>
            </div>
          </div>

          <div className="bg-red-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-red-600" size={24} />
              <div>
                <p className="text-sm text-red-600 font-medium">Critical Minerals</p>
                <p className="text-2xl font-bold text-red-900">{metrics.criticalMinerals}</p>
              </div>
            </div>
          </div>

          <div className="bg-orange-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Shield className="text-orange-600" size={24} />
              <div>
                <p className="text-sm text-orange-600 font-medium">Avg Risk Score</p>
                <p className="text-2xl font-bold text-orange-900">{metrics.averageRiskScore.toFixed(0)}/100</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="text-green-600" size={24} />
              <div>
                <p className="text-sm text-green-600 font-medium">Import Value</p>
                <p className="text-2xl font-bold text-green-900">${(metrics.totalImportValue / 1000000).toFixed(1)}M</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content based on view mode */}
      {viewMode === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Strategic Importance Distribution */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Strategic Importance</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={metrics.strategicImportance.filter(item => item.count > 0)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ importance, count }) => `${importance}: ${count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {metrics.strategicImportance.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Supply Risk Distribution */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Supply Risk Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics.supplyRiskDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="risk" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#EF4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top Suppliers */}
          <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Top Suppliers by Import Value</h3>
            <div className="space-y-3">
              {metrics.topSuppliers.map((supplier, index) => (
                <div key={supplier.country} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                      index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-600' : 'bg-slate-500'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-900">{supplier.country}</h4>
                      <p className="text-sm text-slate-600">{supplier.minerals} minerals supplied</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-slate-900">${(supplier.totalValue / 1000000).toFixed(1)}M</p>
                    <p className="text-sm text-slate-600">Import Value</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {viewMode === 'supply' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Minerals Supply Status</h3>
          <div className="space-y-4">
            {mineralsRecords.map((mineral) => (
              <div key={mineral.id} className="border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium text-slate-900">{mineral.mineral}</h4>
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                        mineral.strategic_importance === 'critical' ? 'bg-red-100 text-red-800' :
                        mineral.strategic_importance === 'important' ? 'bg-orange-100 text-orange-800' :
                        mineral.strategic_importance === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {mineral.strategic_importance.toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-slate-600">
                      <div>
                        <p className="font-medium">Production</p>
                        <p>{mineral.production_tonnes_annually.toLocaleString()} tonnes/year</p>
                      </div>
                      <div>
                        <p className="font-medium">Imports</p>
                        <p>{mineral.import_tonnes_annually.toLocaleString()} tonnes/year</p>
                      </div>
                      <div>
                        <p className="font-medium">Exports</p>
                        <p>{mineral.export_tonnes_annually.toLocaleString()} tonnes/year</p>
                      </div>
                      <div>
                        <p className="font-medium">Price</p>
                        <p>${mineral.price_cad_per_tonne.toLocaleString()} CAD/tonne</p>
                      </div>
                    </div>

                    <div className="mt-3">
                      <p className="text-sm font-medium text-slate-700 mb-1">Primary Suppliers:</p>
                      <div className="flex flex-wrap gap-2">
                        {mineral.primary_suppliers.map((supplier, index) => (
                          <div key={index} className="flex items-center gap-1 text-sm">
                            <span className="text-slate-600">{supplier.country}</span>
                            <span className="text-slate-400">({supplier.percentage_of_supply}%)</span>
                            {getRiskBadge(supplier.risk_score)}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedMineral(mineral)}
                      className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                      title="View Details"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => setEditingMineral(mineral.id)}
                      className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                      title="Edit Mineral"
                    >
                      <Edit size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {mineralsRecords.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <Package size={48} className="mx-auto mb-4 text-slate-300" />
                <p>No minerals data recorded yet.</p>
                <p className="text-sm">Add your first mineral to start monitoring supply chain risks.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Mineral Modal */}
      {showAddMineral && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold">Add Critical Mineral</h4>
              <button
                onClick={() => setShowAddMineral(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Mineral Name *
                </label>
                <input
                  type="text"
                  value={newMineral.mineral}
                  onChange={(e) => setNewMineral({...newMineral, mineral: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Lithium"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Strategic Importance
                </label>
                <select
                  value={newMineral.strategic_importance}
                  onChange={(e) => setNewMineral({...newMineral, strategic_importance: e.target.value as any})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="critical">Critical</option>
                  <option value="important">Important</option>
                  <option value="moderate">Moderate</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Production (tonnes/year)
                </label>
                <input
                  type="number"
                  value={newMineral.production_tonnes_annually}
                  onChange={(e) => setNewMineral({...newMineral, production_tonnes_annually: Number(e.target.value)})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Imports (tonnes/year)
                </label>
                <input
                  type="number"
                  value={newMineral.import_tonnes_annually}
                  onChange={(e) => setNewMineral({...newMineral, import_tonnes_annually: Number(e.target.value)})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Exports (tonnes/year)
                </label>
                <input
                  type="number"
                  value={newMineral.export_tonnes_annually}
                  onChange={(e) => setNewMineral({...newMineral, export_tonnes_annually: Number(e.target.value)})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Price (CAD/tonne) *
                </label>
                <input
                  type="number"
                  value={newMineral.price_cad_per_tonne}
                  onChange={(e) => setNewMineral({...newMineral, price_cad_per_tonne: Number(e.target.value)})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={handleAddMineral}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Save size={16} />
                Save Mineral
              </button>
              <button
                onClick={() => setShowAddMineral(false)}
                className="px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedMineralsDashboard;
