/**
 * Multi-Province Grid Connection Queue Tracker
 *
 * Strategic Priority: Visibility into renewable energy deployment pipeline
 * Key Focus: Cross-provincial queue analysis for investor insights
 *
 * Features:
 * - Multi-province grid queue tracking (AESO, IESO, SaskPower, BC Hydro, Manitoba Hydro)
 * - Real project data from public connection queues
 * - Technology mix analysis (solar, wind, storage)
 * - Timeline forecasting
 * - Queue status tracking (studies, agreements, construction)
 * - Provincial comparison dashboards
 *
 * Data Sources: AESO, IESO, SaskPower, BC Hydro, Manitoba Hydro public queue data
 */

import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, ComposedChart
} from 'recharts';
import {
  Zap, MapPin, Calendar, TrendingUp, AlertTriangle, CheckCircle,
  Clock, Filter, Info, Building2, Sun, Wind, Battery, Activity
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { CardTable } from './CardTable';

// ============================================================================
// INTERFACES
// ============================================================================

interface GridQueueProject {
  id: string;
  project_name: string;
  proponent: string | null;
  province: string;
  grid_operator: string;
  region: string | null;
  fuel_type: string | null;
  technology_detail: string | null;
  capacity_mw: number;
  storage_duration_hours: number | null;
  queue_status: string | null;
  queue_position: number | null;
  application_date: string | null;
  expected_in_service_date: string | null;
  actual_in_service_date: string | null;
  interconnection_voltage_kv: number | null;
  point_of_interconnection: string | null;
  offtaker: string | null;
  ppa_status: string | null;
  environmental_assessment_status: string | null;
  data_source: string | null;
  notes: string | null;
}

interface QueueStatistics {
  province: string;
  grid_operator: string;
  snapshot_date: string;
  total_projects: number;
  total_capacity_mw: number;
  active_projects: number;
  under_construction_projects: number;
  in_service_projects: number;
  withdrawn_projects: number;
  solar_capacity_mw: number;
  wind_capacity_mw: number;
  storage_capacity_mw: number;
  gas_capacity_mw: number;
  other_capacity_mw: number;
  projects_expected_2025: number;
  projects_expected_2026: number;
  projects_expected_2027_plus: number;
}

interface DashboardData {
  projects: GridQueueProject[];
  statistics: QueueStatistics[];
  summary: {
    total_projects: number;
    total_capacity_mw: number;
    active_capacity_mw: number;
    in_service_capacity_mw: number;
    provinces_tracked: number;
  };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const GridQueueTracker: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'technology' | 'timeline' | 'provincial'>('overview');
  const [selectedProvince, setSelectedProvince] = useState<string>('All');
  const [selectedTechnology, setSelectedTechnology] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');

  // Fetch grid queue data
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        // Fetch projects
        const { data: projectsData, error: projectsError } = await supabase
          .from('grid_queue_projects')
          .select('*')
          .order('capacity_mw', { ascending: false });

        if (projectsError) throw projectsError;

        // Fetch statistics
        const { data: statsData, error: statsError } = await supabase
          .from('grid_queue_statistics')
          .select('*')
          .order('snapshot_date', { ascending: false });

        if (statsError) throw statsError;

        // Calculate summary
        const projects = projectsData || [];
        const summary = {
          total_projects: projects.length,
          total_capacity_mw: projects.reduce((sum, p) => sum + (p.capacity_mw || 0), 0),
          active_capacity_mw: projects
            .filter(p => ['Active', 'System Impact Study', 'Facility Study', 'Interconnection Agreement', 'Under Construction'].includes(p.queue_status || ''))
            .reduce((sum, p) => sum + (p.capacity_mw || 0), 0),
          in_service_capacity_mw: projects
            .filter(p => p.queue_status === 'In-Service')
            .reduce((sum, p) => sum + (p.capacity_mw || 0), 0),
          provinces_tracked: new Set(projects.map(p => p.province)).size
        };

        setData({
          projects,
          statistics: statsData || [],
          summary
        });
        setError(null);
      } catch (err: any) {
        console.error('Failed to fetch grid queue data:', err);
        setError(err.message || 'Failed to load grid queue data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading grid queue data...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-900 text-center mb-2">Failed to Load Data</h3>
          <p className="text-red-700 text-center">{error}</p>
        </div>
      </div>
    );
  }

  // Filter projects
  let filteredProjects = data.projects;
  if (selectedProvince !== 'All') {
    filteredProjects = filteredProjects.filter(p => p.province === selectedProvince);
  }
  if (selectedTechnology !== 'All') {
    filteredProjects = filteredProjects.filter(p => p.fuel_type === selectedTechnology);
  }
  if (selectedStatus !== 'All') {
    filteredProjects = filteredProjects.filter(p => p.queue_status === selectedStatus);
  }

  const provinces = ['All', ...Array.from(new Set(data.projects.map(p => p.province))).sort()];
  const technologies = ['All', ...Array.from(new Set(data.projects.map(p => p.fuel_type).filter(Boolean))).sort()];
  const statuses = ['All', ...Array.from(new Set(data.projects.map(p => p.queue_status).filter(Boolean))).sort()];

  return (
    <div className="min-h-screen bg-primary p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">Multi-Province Grid Connection Queue</h1>
        <p className="text-secondary">
          Real-time tracking of renewable energy projects across Canadian grid queues
        </p>
      </div>

      {/* Key Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={<Zap className="h-8 w-8 text-blue-600" />}
          title="Total Queue"
          value={`${(data.summary.total_capacity_mw / 1000).toFixed(1)} GW`}
          subtitle={`${data.summary.total_projects} projects`}
        />
        <StatCard
          icon={<Activity className="h-8 w-8 text-green-600" />}
          title="Active Pipeline"
          value={`${(data.summary.active_capacity_mw / 1000).toFixed(1)} GW`}
          subtitle="In development"
        />
        <StatCard
          icon={<CheckCircle className="h-8 w-8 text-purple-600" />}
          title="In-Service"
          value={`${(data.summary.in_service_capacity_mw / 1000).toFixed(1)} GW`}
          subtitle="Operational"
        />
        <StatCard
          icon={<MapPin className="h-8 w-8 text-orange-600" />}
          title="Provinces"
          value={data.summary.provinces_tracked.toString()}
          subtitle="Grid operators tracked"
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} label="Overview" />
          <TabButton active={activeTab === 'projects'} onClick={() => setActiveTab('projects')} label="Projects" />
          <TabButton active={activeTab === 'technology'} onClick={() => setActiveTab('technology')} label="Technology Mix" />
          <TabButton active={activeTab === 'timeline'} onClick={() => setActiveTab('timeline')} label="Timeline" />
          <TabButton active={activeTab === 'provincial'} onClick={() => setActiveTab('provincial')} label="Provincial Comparison" />
        </nav>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Province:</label>
          <select
            value={selectedProvince}
            onChange={(e) => setSelectedProvince(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {provinces.map(prov => (
              <option key={prov} value={prov}>{prov === 'All' ? 'All Provinces' : prov}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Technology:</label>
          <select
            value={selectedTechnology}
            onChange={(e) => setSelectedTechnology(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {technologies.map(tech => (
              <option key={tech} value={tech}>{tech === 'All' ? 'All Technologies' : tech}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Status:</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {statuses.map(status => (
              <option key={status} value={status}>{status === 'All' ? 'All Statuses' : status}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && <OverviewSection data={data} filteredProjects={filteredProjects} />}
        {activeTab === 'projects' && <ProjectsSection projects={filteredProjects} />}
        {activeTab === 'technology' && <TechnologySection projects={filteredProjects} />}
        {activeTab === 'timeline' && <TimelineSection projects={filteredProjects} />}
        {activeTab === 'provincial' && <ProvincialSection statistics={data.statistics} projects={data.projects} />}
      </div>
    </div>
  );
};

// ============================================================================
// STAT CARD COMPONENT
// ============================================================================

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, title, value, subtitle }) => (
  <div className="card p-6">
    <div className="flex items-center justify-between mb-4">
      {icon}
    </div>
    <h3 className="text-sm font-medium text-tertiary mb-1">{title}</h3>
    <div className="text-2xl font-bold text-primary mb-1">{value}</div>
    <p className="text-sm text-secondary">{subtitle}</p>
  </div>
);

// ============================================================================
// TAB BUTTON COMPONENT
// ============================================================================

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
}

const TabButton: React.FC<TabButtonProps> = ({ active, onClick, label }) => (
  <button
    onClick={onClick}
    className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
      active ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
    }`}
  >
    {label}
  </button>
);

// ============================================================================
// OVERVIEW SECTION
// ============================================================================

interface OverviewSectionProps {
  data: DashboardData;
  filteredProjects: GridQueueProject[];
}

const OverviewSection: React.FC<OverviewSectionProps> = ({ data, filteredProjects }) => {
  // Capacity by province
  const capacityByProvince = Object.entries(
    data.projects.reduce((acc, p) => {
      acc[p.province] = (acc[p.province] || 0) + (p.capacity_mw || 0);
      return acc;
    }, {} as Record<string, number>)
  ).map(([province, capacity]) => ({ province, capacity: capacity / 1000 })); // Convert to GW

  // Technology distribution
  const techDistribution = Object.entries(
    data.projects.reduce((acc, p) => {
      const tech = p.fuel_type || 'Other';
      acc[tech] = (acc[tech] || 0) + (p.capacity_mw || 0);
      return acc;
    }, {} as Record<string, number>)
  ).map(([technology, capacity]) => ({ technology, capacity: capacity / 1000 })); // Convert to GW

  // Status breakdown
  const statusBreakdown = Object.entries(
    data.projects.reduce((acc, p) => {
      const status = p.queue_status || 'Unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([status, count]) => ({ status, count }));

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

  return (
    <div className="space-y-6">
      {/* Strategic Banner */}
      <div className="bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <Info className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-green-900 mb-2">
              Canada's Renewable Energy Pipeline
            </h3>
            <p className="text-green-800 mb-3">
              Grid connection queues provide visibility into future renewable energy deployment. Current queue: {(data.summary.total_capacity_mw / 1000).toFixed(1)} GW across {data.summary.provinces_tracked} provinces. Active pipeline: {(data.summary.active_capacity_mw / 1000).toFixed(1)} GW in development.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="font-semibold text-green-900">Largest Queue</p>
                <p className="text-green-700">Alberta (AESO)</p>
              </div>
              <div>
                <p className="font-semibold text-green-900">Dominant Tech</p>
                <p className="text-green-700">Solar & Wind</p>
              </div>
              <div>
                <p className="font-semibold text-green-900">Storage Growth</p>
                <p className="text-green-700">Rapid expansion</p>
              </div>
              <div>
                <p className="font-semibold text-green-900">Timeline</p>
                <p className="text-green-700">2025-2030 deployment</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Capacity by Province */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Total Queue by Province (GW)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={capacityByProvince}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="province" />
              <YAxis label={{ value: 'Capacity (GW)', angle: -90, position: 'insideLeft' }} />
              <Tooltip formatter={(value: number) => `${value.toFixed(2)} GW`} />
              <Bar dataKey="capacity" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Technology Distribution */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Technology Mix (GW)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={techDistribution}
                dataKey="capacity"
                nameKey="technology"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={(entry) => `${entry.technology}: ${entry.capacity.toFixed(1)} GW`}
              >
                {techDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `${value.toFixed(2)} GW`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Breakdown */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Projects by Queue Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={statusBreakdown} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="status" width={150} />
              <Tooltip />
              <Bar dataKey="count" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Key Insights */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Insights</h3>
          <div className="space-y-4">
            <InsightCard
              icon={<TrendingUp className="h-6 w-6 text-blue-600" />}
              title="Queue Growth"
              description={`${data.summary.total_projects} projects totaling ${(data.summary.total_capacity_mw / 1000).toFixed(1)} GW in queue across ${data.summary.provinces_tracked} provinces`}
            />
            <InsightCard
              icon={<Sun className="h-6 w-6 text-yellow-600" />}
              title="Solar Dominance"
              description="Solar PV leading new capacity additions, driven by cost competitiveness and scalability"
            />
            <InsightCard
              icon={<Battery className="h-6 w-6 text-purple-600" />}
              title="Storage Surge"
              description="Battery storage projects accelerating to support renewable integration and grid stability"
            />
            <InsightCard
              icon={<Wind className="h-6 w-6 text-cyan-600" />}
              title="Wind Expansion"
              description="Wind continuing strong growth, particularly in Alberta and Ontario"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

interface InsightCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const InsightCard: React.FC<InsightCardProps> = ({ icon, title, description }) => (
  <div className="flex items-start gap-3">
    {icon}
    <div>
      <h4 className="font-semibold text-gray-900 mb-1">{title}</h4>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  </div>
);

// ============================================================================
// PROJECTS SECTION
// ============================================================================

interface ProjectsSectionProps {
  projects: GridQueueProject[];
}

const ProjectsSection: React.FC<ProjectsSectionProps> = ({ projects }) => {
  const getStatusBadge = (status: string | null) => {
    const colors: Record<string, string> = {
      'In-Service': 'bg-green-100 text-green-800',
      'Under Construction': 'bg-blue-100 text-blue-800',
      'Interconnection Agreement': 'bg-purple-100 text-purple-800',
      'Facility Study': 'bg-yellow-100 text-yellow-800',
      'System Impact Study': 'bg-orange-100 text-orange-800',
      'Active': 'bg-gray-100 text-gray-800',
      'Suspended': 'bg-red-100 text-red-800',
      'Withdrawn': 'bg-slate-100 text-slate-800',
      'Cancelled': 'bg-red-200 text-red-900'
    };
    return colors[status || ''] || 'bg-gray-100 text-gray-800';
  };

  return (
    <CardTable
      title={`Grid Queue Projects (${projects.length} projects, ${(projects.reduce((sum, p) => sum + p.capacity_mw, 0) / 1000).toFixed(1)} GW)`}
    >
      <table className="min-w-full divide-y divide-[var(--border-subtle)]">
        <thead className="bg-secondary">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-tertiary uppercase">Project</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-tertiary uppercase">Proponent</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-tertiary uppercase">Province</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-tertiary uppercase">Technology</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-tertiary uppercase">Capacity</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-tertiary uppercase">Status</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-tertiary uppercase">Expected COD</th>
          </tr>
        </thead>
        <tbody className="bg-secondary divide-y divide-[var(--border-subtle)]">
          {projects.map((project) => (
            <tr key={project.id} className="hover:bg-secondary">
              <td className="px-4 py-4">
                <div className="text-sm font-medium text-primary">{project.project_name}</div>
                {project.region && <div className="text-xs text-tertiary">{project.region}</div>}
              </td>
              <td className="px-4 py-4 text-sm text-secondary">{project.proponent || 'N/A'}</td>
              <td className="px-4 py-4 text-sm text-secondary">{project.province}</td>
              <td className="px-4 py-4">
                <div className="text-sm text-primary">{project.fuel_type}</div>
                {project.technology_detail && (
                  <div className="text-xs text-tertiary">{project.technology_detail}</div>
                )}
              </td>
              <td className="px-4 py-4 text-sm text-secondary">
                {project.capacity_mw} MW
                {project.storage_duration_hours && (
                  <div className="text-xs text-tertiary">{project.storage_duration_hours}h storage</div>
                )}
              </td>
              <td className="px-4 py-4">
                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(project.queue_status)}`}>
                  {project.queue_status || 'Unknown'}
                </span>
              </td>
              <td className="px-4 py-4 text-sm text-secondary">
                {project.expected_in_service_date
                  ? new Date(project.expected_in_service_date).toLocaleDateString()
                  : project.actual_in_service_date
                  ? new Date(project.actual_in_service_date).toLocaleDateString()
                  : 'TBD'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </CardTable>
  );
};

// ============================================================================
// TECHNOLOGY SECTION
// ============================================================================

interface TechnologySectionProps {
  projects: GridQueueProject[];
}

const TechnologySection: React.FC<TechnologySectionProps> = ({ projects }) => {
  // Technology breakdown by province
  const techByProvince = projects.reduce((acc, p) => {
    const key = `${p.province}-${p.fuel_type}`;
    if (!acc[key]) {
      acc[key] = {
        province: p.province,
        technology: p.fuel_type || 'Other',
        capacity: 0,
        count: 0
      };
    }
    acc[key].capacity += p.capacity_mw / 1000; // Convert to GW
    acc[key].count += 1;
    return acc;
  }, {} as Record<string, any>);

  const techData = Object.values(techByProvince);

  // Total capacity by technology
  const techTotal = Object.entries(
    projects.reduce((acc, p) => {
      const tech = p.fuel_type || 'Other';
      acc[tech] = (acc[tech] || 0) + p.capacity_mw / 1000;
      return acc;
    }, {} as Record<string, number>)
  ).map(([technology, capacity]) => ({ technology, capacity }))
    .sort((a, b) => b.capacity - a.capacity);

  return (
    <div className="space-y-6">
      {/* Total by Technology */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-primary mb-4">Total Capacity by Technology (GW)</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={techTotal}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="technology" />
            <YAxis label={{ value: 'Capacity (GW)', angle: -90, position: 'insideLeft' }} />
            <Tooltip formatter={(value: number) => `${value.toFixed(2)} GW`} />
            <Bar dataKey="capacity" fill="#10B981" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Technology by Province */}
      <CardTable title="Technology Mix by Province">
        <table className="min-w-full divide-y divide-[var(--border-subtle)]">
          <thead className="bg-secondary">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-tertiary uppercase">Province</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-tertiary uppercase">Technology</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-tertiary uppercase">Projects</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-tertiary uppercase">Capacity (GW)</th>
            </tr>
          </thead>
          <tbody className="bg-secondary divide-y divide-[var(--border-subtle)]">
            {techData.map((item, idx) => (
              <tr key={idx} className="hover:bg-secondary">
                <td className="px-4 py-4 text-sm font-medium text-primary">{item.province}</td>
                <td className="px-4 py-4 text-sm text-secondary">{item.technology}</td>
                <td className="px-4 py-4 text-sm text-secondary">{item.count}</td>
                <td className="px-4 py-4 text-sm text-secondary">{item.capacity.toFixed(2)} GW</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardTable>
    </div>
  );
};

// ============================================================================
// TIMELINE SECTION
// ============================================================================

interface TimelineSectionProps {
  projects: GridQueueProject[];
}

const TimelineSection: React.FC<TimelineSectionProps> = ({ projects }) => {
  // Projects by year
  const projectsByYear = projects
    .filter(p => p.expected_in_service_date || p.actual_in_service_date)
    .reduce((acc, p) => {
      const date = p.actual_in_service_date || p.expected_in_service_date;
      const year = new Date(date!).getFullYear();
      if (!acc[year]) {
        acc[year] = { year, capacity: 0, count: 0 };
      }
      acc[year].capacity += p.capacity_mw / 1000;
      acc[year].count += 1;
      return acc;
    }, {} as Record<number, any>);

  const timelineData = Object.values(projectsByYear).sort((a, b) => a.year - b.year);

  // Cumulative capacity
  let cumulative = 0;
  const cumulativeData = timelineData.map(item => {
    cumulative += item.capacity;
    return { ...item, cumulative };
  });

  return (
    <div className="space-y-6">
      {/* Annual Additions */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-primary mb-4">Expected Annual Capacity Additions (GW)</h3>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={cumulativeData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis yAxisId="left" label={{ value: 'Annual (GW)', angle: -90, position: 'insideLeft' }} />
            <YAxis yAxisId="right" orientation="right" label={{ value: 'Cumulative (GW)', angle: 90, position: 'insideRight' }} />
            <Tooltip />
            <Legend />
            <Bar yAxisId="left" dataKey="capacity" fill="#3B82F6" name="Annual Capacity" />
            <Line yAxisId="right" type="monotone" dataKey="cumulative" stroke="#10B981" strokeWidth={2} name="Cumulative" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Projects by Year Table */}
      <CardTable title="Deployment Timeline">
        <table className="min-w-full divide-y divide-[var(--border-subtle)]">
          <thead className="bg-secondary">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-tertiary uppercase">Year</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-tertiary uppercase">Projects</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-tertiary uppercase">Capacity (GW)</th>
            </tr>
          </thead>
          <tbody className="bg-secondary divide-y divide-[var(--border-subtle)]">
            {timelineData.map((item) => (
              <tr key={item.year} className="hover:bg-secondary">
                <td className="px-4 py-4 text-sm font-medium text-primary">{item.year}</td>
                <td className="px-4 py-4 text-sm text-secondary">{item.count}</td>
                <td className="px-4 py-4 text-sm text-secondary">{item.capacity.toFixed(2)} GW</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardTable>
    </div>
  );
};

// ============================================================================
// PROVINCIAL SECTION
// ============================================================================

interface ProvincialSectionProps {
  statistics: QueueStatistics[];
  projects: GridQueueProject[];
}

const ProvincialSection: React.FC<ProvincialSectionProps> = ({ statistics, projects }) => {
  // Provincial summary
  const provincialSummary = Object.entries(
    projects.reduce((acc, p) => {
      if (!acc[p.province]) {
        acc[p.province] = {
          province: p.province,
          operator: p.grid_operator,
          projects: 0,
          capacity: 0,
          active: 0,
          in_service: 0
        };
      }
      acc[p.province].projects += 1;
      acc[p.province].capacity += p.capacity_mw / 1000;
      if (['Active', 'System Impact Study', 'Facility Study', 'Interconnection Agreement', 'Under Construction'].includes(p.queue_status || '')) {
        acc[p.province].active += p.capacity_mw / 1000;
      }
      if (p.queue_status === 'In-Service') {
        acc[p.province].in_service += p.capacity_mw / 1000;
      }
      return acc;
    }, {} as Record<string, any>)
  ).map(([_, data]) => data)
    .sort((a, b) => b.capacity - a.capacity);

  return (
    <div className="space-y-6">
      {/* Provincial Comparison Chart */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-primary mb-4">Provincial Queue Comparison (GW)</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={provincialSummary}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="province" />
            <YAxis label={{ value: 'Capacity (GW)', angle: -90, position: 'insideLeft' }} />
            <Tooltip formatter={(value: number) => `${value.toFixed(2)} GW`} />
            <Legend />
            <Bar dataKey="capacity" fill="#3B82F6" name="Total Queue" />
            <Bar dataKey="active" fill="#10B981" name="Active Pipeline" />
            <Bar dataKey="in_service" fill="#8B5CF6" name="In-Service" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Provincial Summary Table */}
      <CardTable title="Provincial Summary">
        <table className="min-w-full divide-y divide-[var(--border-subtle)]">
          <thead className="bg-secondary">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-tertiary uppercase">Province</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-tertiary uppercase">Grid Operator</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-tertiary uppercase">Projects</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-tertiary uppercase">Total Queue (GW)</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-tertiary uppercase">Active (GW)</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-tertiary uppercase">In-Service (GW)</th>
            </tr>
          </thead>
          <tbody className="bg-secondary divide-y divide-[var(--border-subtle)]">
            {provincialSummary.map((item) => (
              <tr key={item.province} className="hover:bg-secondary">
                <td className="px-4 py-4 text-sm font-medium text-primary">{item.province}</td>
                <td className="px-4 py-4 text-sm text-secondary">{item.operator}</td>
                <td className="px-4 py-4 text-sm text-secondary">{item.projects}</td>
                <td className="px-4 py-4 text-sm text-secondary">{item.capacity.toFixed(2)}</td>
                <td className="px-4 py-4 text-sm text-secondary">{item.active.toFixed(2)}</td>
                <td className="px-4 py-4 text-sm text-secondary">{item.in_service.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardTable>
    </div>
  );
};

export default GridQueueTracker;
