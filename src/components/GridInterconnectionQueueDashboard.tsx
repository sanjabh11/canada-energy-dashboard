/**
 * Grid Interconnection Queue Dashboard
 *
 * Strategic Priority: Track Ontario's ~3GW battery storage + 5GW renewable procurement pipeline
 * Key Features:
 * - IESO interconnection queue visualization
 * - Procurement program tracker (LT1, LT2, LT3, LT4)
 * - Project pipeline by technology type
 * - Queue capacity trends and contract awards
 */

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Cable, Battery, Sun, Wind, TrendingUp, Calendar, CheckCircle, BarChart3 as BarChartIcon } from 'lucide-react';
import { fetchEdgeJson } from '../lib/edge';
import { HelpButton } from './HelpButton';

interface QueueProject {
  id: string;
  project_name: string;
  project_type: string;
  capacity_mw: number;
  status: string;
  in_service_date: string;
  developer: string;
}

interface ProcurementProgram {
  program_name: string;
  target_capacity_mw: number;
  contracted_capacity_mw: number;
  status: string;
}

const GridInterconnectionQueueDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchQueueData();
  }, []);

  const fetchQueueData = async () => {
    try {
      setLoading(true);
      const result = await fetchEdgeJson(['api-v2-ieso-queue', 'api/ieso-queue'], {});
      setData(result.json);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch IESO queue data:', err);
      setError('Failed to load interconnection queue data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-lg">Loading interconnection queue data...</div></div>;
  }

  if (error) {
    return <div className="bg-secondary border border-red-200 rounded-lg p-4 text-danger">{error}</div>;
  }

  if (!data || !data.queue) {
    return <div className="bg-secondary border border-yellow-200 rounded-lg p-4">No queue data available</div>;
  }

  const rawQueue = data.queue || [];
  const queue: QueueProject[] = rawQueue.map((p: any) => ({
    ...p,
    developer: p.developer ?? p.proponent ?? '',
    in_service_date: p.in_service_date ?? p.proposed_in_service_date ?? ''
  }));
  const programs: ProcurementProgram[] = (data.programs || data.procurement_programs || []) as ProcurementProgram[];

  // Capacity by project type
  const typeData = queue.reduce((acc: any[], p: QueueProject) => {
    const existing = acc.find(item => item.type === p.project_type);
    if (existing) {
      existing.capacity += p.capacity_mw;
      existing.count++;
    } else {
      acc.push({ type: p.project_type, capacity: p.capacity_mw, count: 1 });
    }
    return acc;
  }, []);

  // Calculate KPIs
  const totalCapacity = queue.reduce((sum: number, p: QueueProject) => sum + p.capacity_mw, 0);
  const batteryCapacity = queue
    .filter((p: QueueProject) => p.project_type === 'Battery Storage')
    .reduce((sum: number, p: QueueProject) => sum + p.capacity_mw, 0);
  const totalProcurementValue = programs.reduce((sum: number, p: ProcurementProgram) =>
    sum + (p.target_capacity_mw * 0.15), 0) / 1000; // Rough estimate $150k/MW = $0.15M/MW

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

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
                  style={{ background: 'rgba(34, 197, 94, 0.12)' }}
                >
                  <Cable className="h-6 w-6 text-success" />
                </div>
                <h1 className="hero-title">Grid Interconnection Queue</h1>
              </div>
              <p className="hero-subtitle">
                Ontario's renewable energy and battery storage project pipeline - IESO procurement tracking
              </p>
            </div>
            <HelpButton id="queue.overview" />
          </div>
        </div>
      </section>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card card-metric">
          <div className="flex items-center justify-between">
            <div>
              <p className="metric-label">Total Queue Capacity</p>
              <p className="metric-value">{totalCapacity.toLocaleString()} MW</p>
            </div>
            <Cable className="h-6 w-6 text-electric" />
          </div>
        </div>

        <div className="card card-metric">
          <div className="flex items-center justify-between">
            <div>
              <p className="metric-label">Battery Storage Pipeline</p>
              <p className="metric-value">{batteryCapacity.toLocaleString()} MW</p>
            </div>
            <Battery className="h-6 w-6 text-success" />
          </div>
        </div>

        <div className="card card-metric">
          <div className="flex items-center justify-between">
            <div>
              <p className="metric-label">Projects in Queue</p>
              <p className="metric-value">{queue.length}</p>
            </div>
            <TrendingUp className="h-6 w-6 text-electric" />
          </div>
        </div>

        <div className="card card-metric">
          <div className="flex items-center justify-between">
            <div>
              <p className="metric-label">Total Procurement Value</p>
              <p className="metric-value">${totalProcurementValue.toFixed(1)}B</p>
            </div>
            <CheckCircle className="h-6 w-6 text-success" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChartIcon size={20} />
            Capacity by Project Type
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={typeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="type" angle={-15} textAnchor="end" height={80} />
              <YAxis label={{ value: 'Capacity (MW)', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="capacity" fill="#3b82f6" name="Capacity (MW)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp size={20} />
            LT RFP Procurement Programs
          </h3>
          <div className="space-y-4">
            {programs.map((program: ProcurementProgram, idx: number) => (
              <div key={idx} className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-semibold text-electric">{program.program_name}</h4>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    program.status === 'Awarded' ? 'bg-green-100 text-green-800' :
                    program.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {program.status}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-secondary">
                  <span>Target: {program.target_capacity_mw} MW</span>
                  <span>Contracted: {program.contracted_capacity_mw || 0} MW</span>
                </div>
                <div className="mt-2 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-secondary0 h-2 rounded-full"
                    style={{ width: `${Math.min(100, ((program.contracted_capacity_mw || 0) / program.target_capacity_mw) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Projects Table */}
      <div className="card shadow p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calendar size={20} />
          Interconnection Queue Projects
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Capacity (MW)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Developer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">In-Service Date</th>
              </tr>
            </thead>
            <tbody className="bg-secondary divide-y divide-gray-200">
              {queue.slice(0, 20).map((project: QueueProject) => (
                <tr key={project.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-primary">{project.project_name}</td>
                  <td className="px-4 py-3 text-sm text-secondary">
                    <span className="flex items-center gap-1">
                      {project.project_type === 'Battery Storage' && <Battery size={16} />}
                      {project.project_type === 'Solar' && <Sun size={16} />}
                      {project.project_type === 'Wind' && <Wind size={16} />}
                      {project.project_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-secondary">{project.capacity_mw}</td>
                  <td className="px-4 py-3 text-sm text-secondary">{project.developer}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      project.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                      project.status === 'Contracted' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {project.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-secondary">
                    {project.in_service_date ? new Date(project.in_service_date).toLocaleDateString() : 'TBD'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Data Source */}
      <div className="text-sm text-tertiary text-center">
        Data Source: {data.metadata?.source || 'IESO'} | Last Updated: {new Date().toLocaleDateString()}
      </div>
    </div>
  );
};

export default GridInterconnectionQueueDashboard;
