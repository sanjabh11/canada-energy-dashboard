/**
 * SMR (Small Modular Reactor) Deployment Dashboard
 *
 * Strategic Priority: OPG Darlington 2029 target, SaskPower feasibility, nuclear innovation
 * Key Features:
 * - SMR project tracking with CNSC regulatory milestones
 * - Technology vendor comparison
 * - Economics and timeline visualization
 * - Map of Canadian SMR projects
 */

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Atom, Calendar, DollarSign, MapPin, CheckCircle, Clock, AlertTriangle, Zap, Activity } from 'lucide-react';
import { fetchEdgeJson } from '../lib/edge';
import { HelpButton } from './HelpButton';

interface SMRProject {
  id: string;
  project_name: string;
  province_code: string;
  operator: string;
  reactor_vendor: string;
  reactor_model: string;
  capacity_mwe: number;
  status: string;
  cnsc_license_stage: string;
  target_commercial_operation: string;
  estimated_capex_cad: number;
  federal_funding_cad: number;
  hydrogen_cogeneration: boolean;
}

const SMRDeploymentDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSMRData();
  }, []);

  const fetchSMRData = async () => {
    try {
      setLoading(true);
      const result = await fetchEdgeJson(['api-v2-smr', 'api/smr'], {});
      setData(result.json);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch SMR data:', err);
      setError('Failed to load SMR data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-lg">Loading SMR data...</div></div>;
  }

  if (error) {
    return <div className="bg-secondary border border-red-200 rounded-lg p-4 text-danger">{error}</div>;
  }

  if (!data || !data.projects) {
    return <div className="bg-secondary border border-yellow-200 rounded-lg p-4">No SMR data available</div>;
  }

  const projects = data.projects || [];
  const vendors = data.vendors || [];

  // Status distribution
  const statusData = projects.reduce((acc: any[], p: SMRProject) => {
    const existing = acc.find(item => item.status === p.status);
    if (existing) {
      existing.count++;
      existing.capacity += p.capacity_mwe;
    } else {
      acc.push({ status: p.status, count: 1, capacity: p.capacity_mwe });
    }
    return acc;
  }, []);

  // Timeline chart
  const timelineData = projects
    .filter((p: SMRProject) => p.target_commercial_operation)
    .map((p: SMRProject) => ({
      name: p.project_name.substring(0, 30),
      year: new Date(p.target_commercial_operation).getFullYear(),
      capacity: p.capacity_mwe,
      capex: p.estimated_capex_cad / 1000000000, // Billions
    }));

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const totalCapacity = projects.reduce((sum: number, p: SMRProject) => sum + p.capacity_mwe, 0);
  const totalInvestment = projects.reduce((sum: number, p: SMRProject) => sum + (p.estimated_capex_cad || 0), 0);
  const federalFunding = projects.reduce((sum: number, p: SMRProject) => sum + (p.federal_funding_cad || 0), 0);

  return (
    <div className="min-h-screen bg-primary p-6 space-y-6">
      {/* Header */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(139, 92, 246, 0.12)' }}
                >
                  <Atom className="h-6 w-6 text-purple-400" />
                </div>
                <h1 className="hero-title">SMR Deployment Tracker</h1>
              </div>
              <p className="hero-subtitle">
                Canada's Small Modular Reactor pipeline - OPG Darlington construction license issued April 2025
              </p>
            </div>
            <HelpButton id="smr.overview" />
          </div>
        </div>
      </section>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card card-metric">
          <div className="flex items-center justify-between">
            <div>
              <p className="metric-label">Total Projects</p>
              <p className="metric-value">{projects.length}</p>
            </div>
            <Atom className="h-6 w-6 text-electric" />
          </div>
        </div>

        <div className="card card-metric">
          <div className="flex items-center justify-between">
            <div>
              <p className="metric-label">Total Capacity</p>
              <p className="metric-value">{totalCapacity} MW</p>
            </div>
            <Zap className="h-6 w-6 text-success" />
          </div>
        </div>

        <div className="card card-metric">
          <div className="flex items-center justify-between">
            <div>
              <p className="metric-label">Total Investment</p>
              <p className="metric-value">${(totalInvestment / 1000000000).toFixed(1)}B</p>
            </div>
            <DollarSign className="h-6 w-6 text-electric" />
          </div>
        </div>

        <div className="card card-metric">
          <div className="flex items-center justify-between">
            <div>
              <p className="metric-label">Federal Funding</p>
              <p className="metric-value">${(federalFunding / 1000000).toFixed(0)}M</p>
            </div>
            <CheckCircle className="h-6 w-6 text-success" />
          </div>
        </div>
      </div>

      {/* Project Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Activity size={20} />
            Project Status Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ status, count }) => `${status} (${count})`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="count"
              >
                {statusData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar size={20} />
            Deployment Timeline
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis label={{ value: 'Capacity (MW)', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="capacity" fill="#3b82f6" name="Capacity (MW)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Projects Table */}
      <div className="card shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <MapPin size={20} />
            Canadian SMR Projects
          </h3>
          <HelpButton id="smr.projects" />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Province</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Operator</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reactor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Capacity</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">CNSC Stage</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Target COD</th>
              </tr>
            </thead>
            <tbody className="bg-secondary divide-y divide-gray-200">
              {projects.map((project: SMRProject) => (
                <tr key={project.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-primary">{project.project_name}</td>
                  <td className="px-4 py-3 text-sm text-secondary">{project.province_code}</td>
                  <td className="px-4 py-3 text-sm text-secondary">{project.operator}</td>
                  <td className="px-4 py-3 text-sm text-secondary">{project.reactor_model}</td>
                  <td className="px-4 py-3 text-sm text-secondary">{project.capacity_mwe} MW</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      project.status === 'Construction License Issued' ? 'bg-green-100 text-green-800' :
                      project.status === 'Feasibility Study' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {project.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-secondary">{project.cnsc_license_stage || 'N/A'}</td>
                  <td className="px-4 py-3 text-sm text-secondary">
                    {project.target_commercial_operation ? new Date(project.target_commercial_operation).getFullYear() : 'TBD'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Technology Vendors */}
      <div className="card shadow p-6">
        <h3 className="text-lg font-semibold mb-4">SMR Technology Vendors</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vendors.map((vendor: any) => (
            <div key={vendor.id} className="border rounded-lg p-4">
              <h4 className="font-semibold text-electric mb-2">{vendor.vendor_name}</h4>
              <p className="text-sm text-secondary mb-1"><strong>Design:</strong> {vendor.reactor_design}</p>
              <p className="text-sm text-secondary mb-1"><strong>Capacity:</strong> {vendor.capacity_mwe} MW</p>
              <p className="text-sm text-secondary mb-1"><strong>CNSC VDR:</strong> {vendor.cnsc_vdr_status}</p>
              <p className="text-sm text-secondary"><strong>Generation:</strong> {vendor.reactor_generation}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Data Source */}
      <div className="text-sm text-tertiary text-center">
        Data Source: {data.metadata?.source || 'CNSC, OPG, SaskPower, NB Power'} | Last Updated: {new Date().toLocaleDateString()}
      </div>
    </div>
  );
};

export default SMRDeploymentDashboard;
