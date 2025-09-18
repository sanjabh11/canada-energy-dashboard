/**
 * Enhanced Investment Decision Support Dashboard
 * 
 * Comprehensive investment analysis with real local data storage,
 * financial modeling, ESG scoring, and risk assessment.
 * Replaces mock data with persistent local storage.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, ScatterChart, Scatter, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Shield, Leaf, Users, Plus, Edit, Save, X, Download, AlertTriangle, CheckCircle, Calculator, Target } from 'lucide-react';
import { localStorageManager, type InvestmentProjectRecord } from '../lib/localStorageManager';

interface FinancialMetrics {
  totalInvestment: number;
  averageIRR: number;
  totalGHGReduction: number;
  averageESGScore: number;
  projectsByStatus: Array<{ status: string; count: number; value: number }>;
  riskDistribution: Array<{ risk: string; count: number }>;
}

interface ProjectFormData {
  project_name: string;
  project_type: 'renewable' | 'efficiency' | 'grid' | 'storage' | 'other';
  total_investment_cad: number;
  expected_ghg_reduction_tonnes_co2e: number;
  project_status: 'planning' | 'approved' | 'construction' | 'operational' | 'decommissioned';
  financial_metrics: {
    irr_percent?: number;
    payback_years?: number;
    lcoe_cad_per_mwh?: number;
  };
  esg_scores: {
    environmental_score: number;
    social_score: number;
    governance_score: number;
  };
  risk_assessment: {
    market_risk: 'low' | 'medium' | 'high';
    technology_risk: 'low' | 'medium' | 'high';
    regulatory_risk: 'low' | 'medium' | 'high';
    overall_risk_score: number;
  };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export const EnhancedInvestmentDashboard: React.FC = () => {
  const [projects, setProjects] = useState<InvestmentProjectRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddProject, setShowAddProject] = useState(false);
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<InvestmentProjectRecord | null>(null);
  const [viewMode, setViewMode] = useState<'overview' | 'projects' | 'analytics'>('overview');
  
  const [newProject, setNewProject] = useState<ProjectFormData>({
    project_name: '',
    project_type: 'renewable',
    total_investment_cad: 0,
    expected_ghg_reduction_tonnes_co2e: 0,
    project_status: 'planning',
    financial_metrics: {},
    esg_scores: {
      environmental_score: 50,
      social_score: 50,
      governance_score: 50
    },
    risk_assessment: {
      market_risk: 'medium',
      technology_risk: 'medium',
      regulatory_risk: 'medium',
      overall_risk_score: 50
    }
  });

  // Load projects from local storage
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = () => {
    setLoading(true);
    try {
      const investmentProjects = localStorageManager.getInvestmentProjects();
      setProjects(investmentProjects);
    } catch (error) {
      console.error('Error loading investment projects:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate financial metrics
  const metrics: FinancialMetrics = useMemo(() => {
    const totalInvestment = projects.reduce((sum, p) => sum + p.total_investment_cad, 0);
    const averageIRR = projects.length > 0 
      ? projects.reduce((sum, p) => sum + (p.financial_metrics.irr_percent || 0), 0) / projects.length 
      : 0;
    const totalGHGReduction = projects.reduce((sum, p) => sum + p.expected_ghg_reduction_tonnes_co2e, 0);
    const averageESGScore = projects.length > 0
      ? projects.reduce((sum, p) => sum + ((p.esg_scores.environmental_score + p.esg_scores.social_score + p.esg_scores.governance_score) / 3), 0) / projects.length
      : 0;

    const projectsByStatus = ['planning', 'approved', 'construction', 'operational', 'decommissioned'].map(status => ({
      status,
      count: projects.filter(p => p.project_status === status).length,
      value: projects.filter(p => p.project_status === status).reduce((sum, p) => sum + p.total_investment_cad, 0)
    }));

    const riskDistribution = ['low', 'medium', 'high'].map(risk => ({
      risk,
      count: projects.filter(p => {
        const score = p.risk_assessment.overall_risk_score;
        return risk === 'low' ? score < 33 : risk === 'medium' ? score < 67 : score >= 67;
      }).length
    }));

    return {
      totalInvestment,
      averageIRR,
      totalGHGReduction,
      averageESGScore,
      projectsByStatus,
      riskDistribution
    };
  }, [projects]);

  const handleAddProject = () => {
    if (!newProject.project_name || newProject.total_investment_cad <= 0) {
      alert('Please fill in all required fields');
      return;
    }

    const projectData = {
      ...newProject,
      data_source: 'user_input' as const,
      funding_sources: [{
        source: 'To be determined',
        amount_cad: newProject.total_investment_cad,
        type: 'equity' as const
      }],
      financial_metrics: {
        ...newProject.financial_metrics,
        npv_cad: newProject.total_investment_cad * (newProject.financial_metrics.irr_percent || 8) / 100 // Simple NPV estimate
      }
    };

    localStorageManager.addInvestmentProject(projectData);
    loadProjects();
    
    // Reset form
    setNewProject({
      project_name: '',
      project_type: 'renewable',
      total_investment_cad: 0,
      expected_ghg_reduction_tonnes_co2e: 0,
      project_status: 'planning',
      financial_metrics: {},
      esg_scores: {
        environmental_score: 50,
        social_score: 50,
        governance_score: 50
      },
      risk_assessment: {
        market_risk: 'medium',
        technology_risk: 'medium',
        regulatory_risk: 'medium',
        overall_risk_score: 50
      }
    });
    setShowAddProject(false);
  };

  const exportData = () => {
    const data = localStorageManager.exportAllData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ceip_investment_data_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const calculatePortfolioOptimization = () => {
    // Simple portfolio optimization based on risk-return profile
    const optimizedProjects = projects
      .filter(p => p.project_status === 'planning' || p.project_status === 'approved')
      .sort((a, b) => {
        const aScore = (a.financial_metrics.irr_percent || 0) / (a.risk_assessment.overall_risk_score || 50);
        const bScore = (b.financial_metrics.irr_percent || 0) / (b.risk_assessment.overall_risk_score || 50);
        return bScore - aScore;
      });
    
    return optimizedProjects.slice(0, 5); // Top 5 projects
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
            <h2 className="text-2xl font-bold text-slate-900">Investment Decision Support</h2>
            <p className="text-slate-600">Multi-criteria analysis and portfolio optimization for energy projects</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-slate-100 rounded-lg p-1">
              {['overview', 'projects', 'analytics'].map((mode) => (
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
              onClick={() => setShowAddProject(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={16} />
              Add Project
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
              <DollarSign className="text-blue-600" size={24} />
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Investment</p>
                <p className="text-2xl font-bold text-blue-900">
                  ${(metrics.totalInvestment / 1000000).toFixed(1)}M
                </p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="text-green-600" size={24} />
              <div>
                <p className="text-sm text-green-600 font-medium">Average IRR</p>
                <p className="text-2xl font-bold text-green-900">
                  {metrics.averageIRR.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-emerald-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Leaf className="text-emerald-600" size={24} />
              <div>
                <p className="text-sm text-emerald-600 font-medium">GHG Reduction</p>
                <p className="text-2xl font-bold text-emerald-900">
                  {(metrics.totalGHGReduction / 1000).toFixed(0)}k tCO₂e
                </p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Shield className="text-purple-600" size={24} />
              <div>
                <p className="text-sm text-purple-600 font-medium">Avg ESG Score</p>
                <p className="text-2xl font-bold text-purple-900">
                  {metrics.averageESGScore.toFixed(0)}/100
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content based on view mode */}
      {viewMode === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Project Status Distribution */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Project Status Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={metrics.projectsByStatus.filter(item => item.count > 0)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ status, count }) => `${status}: ${count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {metrics.projectsByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Risk vs Return Scatter */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Risk vs Return Analysis</h3>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart>
                <CartesianGrid />
                <XAxis 
                  type="number" 
                  dataKey="risk_score" 
                  name="Risk Score" 
                  domain={[0, 100]}
                  label={{ value: 'Risk Score', position: 'insideBottom', offset: -5 }}
                />
                <YAxis 
                  type="number" 
                  dataKey="irr" 
                  name="IRR %" 
                  label={{ value: 'IRR %', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Scatter 
                  name="Projects" 
                  data={projects.map(p => ({
                    risk_score: p.risk_assessment.overall_risk_score,
                    irr: p.financial_metrics.irr_percent || 0,
                    name: p.project_name
                  }))} 
                  fill="#8884d8" 
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* Portfolio Optimization */}
          <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Optimized Portfolio Recommendations</h3>
              <Calculator className="text-slate-400" size={20} />
            </div>
            <div className="space-y-3">
              {calculatePortfolioOptimization().map((project, index) => (
                <div key={project.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                      index === 0 ? 'bg-green-500' : index === 1 ? 'bg-blue-500' : 'bg-slate-500'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-900">{project.project_name}</h4>
                      <p className="text-sm text-slate-600">{project.project_type} • ${(project.total_investment_cad / 1000000).toFixed(1)}M</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-slate-900">{project.financial_metrics.irr_percent?.toFixed(1)}% IRR</p>
                    <p className="text-sm text-slate-600">Risk: {project.risk_assessment.overall_risk_score}/100</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {viewMode === 'projects' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Investment Projects</h3>
          <div className="space-y-4">
            {projects.map((project) => (
              <div key={project.id} className="border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-slate-900">{project.project_name}</h4>
                    <p className="text-sm text-slate-600 mt-1">{project.project_type} • ${(project.total_investment_cad / 1000000).toFixed(1)}M CAD</p>
                    
                    <div className="flex items-center gap-4 mt-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        project.project_status === 'operational' ? 'bg-green-100 text-green-800' :
                        project.project_status === 'construction' ? 'bg-blue-100 text-blue-800' :
                        project.project_status === 'approved' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {project.project_status.toUpperCase()}
                      </span>
                      
                      {project.financial_metrics.irr_percent && (
                        <span className="text-sm text-slate-600">
                          IRR: {project.financial_metrics.irr_percent.toFixed(1)}%
                        </span>
                      )}
                      
                      <span className="text-sm text-slate-600">
                        ESG: {((project.esg_scores.environmental_score + project.esg_scores.social_score + project.esg_scores.governance_score) / 3).toFixed(0)}/100
                      </span>
                    </div>

                    <div className="mt-3 text-sm text-slate-600">
                      <p>GHG Reduction: {project.expected_ghg_reduction_tonnes_co2e.toLocaleString()} tCO₂e</p>
                      {project.financial_metrics.payback_years && (
                        <p>Payback: {project.financial_metrics.payback_years} years</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedProject(project)}
                      className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                      title="View Details"
                    >
                      <Target size={16} />
                    </button>
                    <button
                      onClick={() => setEditingProject(project.id)}
                      className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                      title="Edit Project"
                    >
                      <Edit size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {projects.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <DollarSign size={48} className="mx-auto mb-4 text-slate-300" />
                <p>No investment projects recorded yet.</p>
                <p className="text-sm">Add your first project to start tracking investments and returns.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Project Modal */}
      {showAddProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold">Add Investment Project</h4>
              <button
                onClick={() => setShowAddProject(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={newProject.project_name}
                  onChange={(e) => setNewProject({...newProject, project_name: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Ontario Solar Farm Development"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Project Type
                </label>
                <select
                  value={newProject.project_type}
                  onChange={(e) => setNewProject({...newProject, project_type: e.target.value as any})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="renewable">Renewable Energy</option>
                  <option value="efficiency">Energy Efficiency</option>
                  <option value="grid">Grid Infrastructure</option>
                  <option value="storage">Energy Storage</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Total Investment (CAD) *
                </label>
                <input
                  type="number"
                  value={newProject.total_investment_cad}
                  onChange={(e) => setNewProject({...newProject, total_investment_cad: Number(e.target.value)})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="250000000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Expected IRR (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={newProject.financial_metrics.irr_percent || ''}
                  onChange={(e) => setNewProject({
                    ...newProject, 
                    financial_metrics: {...newProject.financial_metrics, irr_percent: Number(e.target.value)}
                  })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="8.5"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  GHG Reduction (tCO₂e)
                </label>
                <input
                  type="number"
                  value={newProject.expected_ghg_reduction_tonnes_co2e}
                  onChange={(e) => setNewProject({...newProject, expected_ghg_reduction_tonnes_co2e: Number(e.target.value)})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="125000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Project Status
                </label>
                <select
                  value={newProject.project_status}
                  onChange={(e) => setNewProject({...newProject, project_status: e.target.value as any})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="planning">Planning</option>
                  <option value="approved">Approved</option>
                  <option value="construction">Construction</option>
                  <option value="operational">Operational</option>
                  <option value="decommissioned">Decommissioned</option>
                </select>
              </div>
            </div>

            {/* ESG Scores */}
            <div className="mt-6">
              <h5 className="font-medium text-slate-700 mb-3">ESG Scores (0-100)</h5>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Environmental</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newProject.esg_scores.environmental_score}
                    onChange={(e) => setNewProject({
                      ...newProject,
                      esg_scores: {...newProject.esg_scores, environmental_score: Number(e.target.value)}
                    })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Social</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newProject.esg_scores.social_score}
                    onChange={(e) => setNewProject({
                      ...newProject,
                      esg_scores: {...newProject.esg_scores, social_score: Number(e.target.value)}
                    })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Governance</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newProject.esg_scores.governance_score}
                    onChange={(e) => setNewProject({
                      ...newProject,
                      esg_scores: {...newProject.esg_scores, governance_score: Number(e.target.value)}
                    })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={handleAddProject}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Save size={16} />
                Save Project
              </button>
              <button
                onClick={() => setShowAddProject(false)}
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

export default EnhancedInvestmentDashboard;
