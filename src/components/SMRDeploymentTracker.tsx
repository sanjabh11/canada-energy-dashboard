/**
 * SMR Deployment Tracker Dashboard
 *
 * Strategic Priority: Canada's $30B+ SMR Pipeline
 * Key Focus: OPG Darlington $26B (4x BWRX-300), CNL Chalk River, SaskPower, NB Power
 *
 * Features:
 * - SMR project registry with real operational data
 * - Regulatory milestone tracking (CNSC VDR, EA, licensing)
 * - Technology vendor comparison
 * - Provincial deployment strategies
 * - Federal regulatory pathway (CNSC)
 * - Economics and funding dashboard
 *
 * Data Sources: OPG, CNL, SaskPower, NB Power, CNSC public announcements
 */

import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ScatterChart, Scatter
} from 'recharts';
import {
  Zap, MapPin, Calendar, DollarSign, TrendingUp, AlertTriangle,
  CheckCircle, Clock, Building2, Award, FileText, Shield, Info
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

// ============================================================================
// INTERFACES
// ============================================================================

interface SMRProject {
  id: string;
  project_name: string;
  operator: string;
  province: string;
  location_city: string | null;
  reactor_vendor: string;
  reactor_model: string;
  reactor_type: string | null;
  unit_capacity_mw: number;
  number_of_units: number;
  total_capacity_mw: number;
  status: string;
  announcement_date: string | null;
  environmental_assessment_approval_date: string | null;
  construction_start_date: string | null;
  target_operational_date: string | null;
  actual_operational_date: string | null;
  estimated_capex_cad: number | null;
  primary_use_case: string | null;
  cnsc_vendor_design_review_status: string | null;
  environmental_assessment_status: string | null;
  construction_license_status: string | null;
  data_source: string | null;
  project_website: string | null;
  notes: string | null;
}

interface SMRVendor {
  id: string;
  vendor_name: string;
  headquarters_country: string | null;
  reactor_models: string[];
  cnsc_vdr_phase: string | null;
  cnsc_vdr_start_date: string | null;
  technology_readiness_level: number | null;
  canadian_partners: string[];
  website: string | null;
  notes: string | null;
}

interface RegulatoryMilestone {
  id: number;
  project_id: string;
  milestone_type: string;
  status: string;
  target_date: string | null;
  actual_date: string | null;
  authority: string | null;
  notes: string | null;
}

interface DashboardData {
  projects: SMRProject[];
  vendors: SMRVendor[];
  milestones: RegulatoryMilestone[];
  summary: {
    total_projects: number;
    total_capacity_mw: number;
    total_investment_cad: number;
    provinces_active: number;
    vendors_active: number;
    projects_in_licensing: number;
  };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const SMRDeploymentTracker: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'vendors' | 'regulatory' | 'economics'>('overview');
  const [selectedProvince, setSelectedProvince] = useState<string>('All');

  // Fetch SMR data
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        // Fetch projects
        const { data: projectsData, error: projectsError } = await supabase
          .from('smr_projects')
          .select('*')
          .order('estimated_capex_cad', { ascending: false, nullsFirst: false });

        if (projectsError) throw projectsError;

        // Fetch vendors
        const { data: vendorsData, error: vendorsError } = await supabase
          .from('smr_vendors')
          .select('*')
          .order('cnsc_vdr_phase', { ascending: false });

        if (vendorsError) throw vendorsError;

        // Fetch regulatory milestones
        const { data: milestonesData, error: milestonesError } = await supabase
          .from('smr_regulatory_milestones')
          .select('*')
          .order('target_date', { ascending: true });

        if (milestonesError) throw milestonesError;

        // Calculate summary
        const projects = projectsData || [];
        const summary = {
          total_projects: projects.length,
          total_capacity_mw: projects.reduce((sum, p) => sum + (p.total_capacity_mw || 0), 0),
          total_investment_cad: projects.reduce((sum, p) => sum + (p.estimated_capex_cad || 0), 0),
          provinces_active: new Set(projects.map(p => p.province)).size,
          vendors_active: new Set(projects.map(p => p.reactor_vendor)).size,
          projects_in_licensing: projects.filter(p => p.status === 'Licensing' || p.status === 'Pre-Licensing').length
        };

        setData({
          projects,
          vendors: vendorsData || [],
          milestones: milestonesData || [],
          summary
        });
        setError(null);
      } catch (err: any) {
        console.error('Failed to fetch SMR data:', err);
        setError(err.message || 'Failed to load SMR data');
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
          <p className="mt-4 text-gray-600">Loading SMR deployment data...</p>
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

  // Filter projects by province
  const filteredProjects = selectedProvince === 'All'
    ? data.projects
    : data.projects.filter(p => p.province === selectedProvince);

  const provinces = ['All', ...Array.from(new Set(data.projects.map(p => p.province))).sort()];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">SMR Deployment Tracker</h1>
        <p className="text-gray-600">
          Canada's Small Modular Reactor Pipeline - Real-time tracking of $30B+ SMR investments
        </p>
      </div>

      {/* Key Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={<Zap className="h-8 w-8 text-blue-600" />}
          title="Total Capacity"
          value={`${data.summary.total_capacity_mw.toFixed(0)} MW`}
          subtitle={`${data.summary.total_projects} projects`}
        />
        <StatCard
          icon={<DollarSign className="h-8 w-8 text-green-600" />}
          title="Total Investment"
          value={`$${(data.summary.total_investment_cad / 1e9).toFixed(1)}B`}
          subtitle="Estimated CapEx"
        />
        <StatCard
          icon={<MapPin className="h-8 w-8 text-purple-600" />}
          title="Provinces Active"
          value={data.summary.provinces_active.toString()}
          subtitle={`${data.summary.vendors_active} technology vendors`}
        />
        <StatCard
          icon={<FileText className="h-8 w-8 text-orange-600" />}
          title="In Licensing"
          value={data.summary.projects_in_licensing.toString()}
          subtitle="Regulatory review"
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <TabButton
            active={activeTab === 'overview'}
            onClick={() => setActiveTab('overview')}
            label="Overview"
          />
          <TabButton
            active={activeTab === 'projects'}
            onClick={() => setActiveTab('projects')}
            label="Projects"
          />
          <TabButton
            active={activeTab === 'vendors'}
            onClick={() => setActiveTab('vendors')}
            label="Technology Vendors"
          />
          <TabButton
            active={activeTab === 'regulatory'}
            onClick={() => setActiveTab('regulatory')}
            label="Regulatory Pipeline"
          />
          <TabButton
            active={activeTab === 'economics'}
            onClick={() => setActiveTab('economics')}
            label="Economics"
          />
        </nav>
      </div>

      {/* Province Filter */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Province:</label>
        <select
          value={selectedProvince}
          onChange={(e) => setSelectedProvince(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {provinces.map(prov => (
            <option key={prov} value={prov}>{prov === 'All' ? 'All Provinces' : prov}</option>
          ))}
        </select>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && <OverviewSection data={data} filteredProjects={filteredProjects} />}
        {activeTab === 'projects' && <ProjectsSection projects={filteredProjects} />}
        {activeTab === 'vendors' && <VendorsSection vendors={data.vendors} projects={data.projects} />}
        {activeTab === 'regulatory' && <RegulatorySection projects={filteredProjects} milestones={data.milestones} />}
        {activeTab === 'economics' && <EconomicsSection projects={filteredProjects} />}
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
  <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
    <div className="flex items-center justify-between mb-4">
      {icon}
    </div>
    <h3 className="text-sm font-medium text-gray-500 mb-1">{title}</h3>
    <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
    <p className="text-sm text-gray-600">{subtitle}</p>
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
    className={`
      py-2 px-1 border-b-2 font-medium text-sm transition-colors
      ${active
        ? 'border-blue-500 text-blue-600'
        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }
    `}
  >
    {label}
  </button>
);

// ============================================================================
// OVERVIEW SECTION
// ============================================================================

interface OverviewSectionProps {
  data: DashboardData;
  filteredProjects: SMRProject[];
}

const OverviewSection: React.FC<OverviewSectionProps> = ({ data, filteredProjects }) => {
  // Capacity by province
  const capacityByProvince = Object.entries(
    data.projects.reduce((acc, p) => {
      acc[p.province] = (acc[p.province] || 0) + (p.total_capacity_mw || 0);
      return acc;
    }, {} as Record<string, number>)
  ).map(([province, capacity]) => ({ province, capacity }));

  // Projects by status
  const projectsByStatus = Object.entries(
    data.projects.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([status, count]) => ({ status, count }));

  // Vendor market share
  const vendorShare = Object.entries(
    data.projects.reduce((acc, p) => {
      acc[p.reactor_vendor] = (acc[p.reactor_vendor] || 0) + (p.total_capacity_mw || 0);
      return acc;
    }, {} as Record<string, number>)
  ).map(([vendor, capacity]) => ({ vendor, capacity }));

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  return (
    <div className="space-y-6">
      {/* Strategic Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <Info className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              Canada's SMR Leadership Strategy
            </h3>
            <p className="text-blue-800 mb-3">
              Canada is deploying Small Modular Reactors (SMRs) to achieve net-zero goals, support industrial decarbonization, and maintain nuclear technology leadership. The SMR Roadmap targets deployment of multiple units by 2030.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="font-semibold text-blue-900">Key Project</p>
                <p className="text-blue-700">OPG Darlington (4x300MW)</p>
              </div>
              <div>
                <p className="font-semibold text-blue-900">Timeline</p>
                <p className="text-blue-700">First unit operational ~2029</p>
              </div>
              <div>
                <p className="font-semibold text-blue-900">Technology</p>
                <p className="text-blue-700">GE Hitachi BWRX-300</p>
              </div>
              <div>
                <p className="font-semibold text-blue-900">Federal Support</p>
                <p className="text-blue-700">$970M committed to OPG</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Capacity by Province */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Total Capacity by Province</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={capacityByProvince}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="province" />
              <YAxis label={{ value: 'Capacity (MW)', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Bar dataKey="capacity" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Projects by Status */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Projects by Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={projectsByStatus}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={(entry) => `${entry.status}: ${entry.count}`}
              >
                {projectsByStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vendor Market Share */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Vendor Market Share (by Capacity)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={vendorShare} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" label={{ value: 'Capacity (MW)', position: 'insideBottom', offset: -5 }} />
              <YAxis type="category" dataKey="vendor" width={150} />
              <Tooltip />
              <Bar dataKey="capacity" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Timeline Scatter */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Timeline vs. Capacity</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="target_year"
                type="number"
                domain={[2025, 2040]}
                label={{ value: 'Target Operational Year', position: 'insideBottom', offset: -5 }}
              />
              <YAxis
                dataKey="total_capacity_mw"
                label={{ value: 'Capacity (MW)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Scatter
                name="SMR Projects"
                data={data.projects
                  .filter(p => p.target_operational_date)
                  .map(p => ({
                    ...p,
                    target_year: new Date(p.target_operational_date!).getFullYear()
                  }))}
                fill="#8B5CF6"
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// PROJECTS SECTION
// ============================================================================

interface ProjectsSectionProps {
  projects: SMRProject[];
}

const ProjectsSection: React.FC<ProjectsSectionProps> = ({ projects }) => {
  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      'Operational': 'bg-green-100 text-green-800',
      'Under Construction': 'bg-blue-100 text-blue-800',
      'Licensing': 'bg-yellow-100 text-yellow-800',
      'Pre-Licensing': 'bg-purple-100 text-purple-800',
      'Feasibility Study': 'bg-gray-100 text-gray-800',
      'Concept': 'bg-slate-100 text-slate-800',
      'On Hold': 'bg-orange-100 text-orange-800',
      'Cancelled': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200">
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          SMR Projects Registry ({projects.length} projects)
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Operator</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Province</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Technology</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Capacity</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Investment</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {projects.map((project) => (
                <tr key={project.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{project.project_name}</div>
                    {project.location_city && (
                      <div className="text-xs text-gray-500">{project.location_city}</div>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{project.operator}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{project.province}</td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-900">{project.reactor_model}</div>
                    <div className="text-xs text-gray-500">{project.reactor_vendor}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                    {project.number_of_units > 1 && <span className="text-gray-500">{project.number_of_units}×</span>}
                    {project.unit_capacity_mw} MW
                    {project.number_of_units > 1 && (
                      <div className="text-xs text-gray-500">= {project.total_capacity_mw} MW total</div>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(project.status)}`}>
                      {project.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                    {project.estimated_capex_cad
                      ? `$${(project.estimated_capex_cad / 1e9).toFixed(1)}B`
                      : 'TBD'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                    {project.target_operational_date
                      ? new Date(project.target_operational_date).getFullYear()
                      : 'TBD'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// VENDORS SECTION
// ============================================================================

interface VendorsSectionProps {
  vendors: SMRVendor[];
  projects: SMRProject[];
}

const VendorsSection: React.FC<VendorsSectionProps> = ({ vendors, projects }) => {
  const getCNSCBadge = (phase: string | null) => {
    const colors: Record<string, string> = {
      'Completed': 'bg-green-100 text-green-800',
      'Phase 3': 'bg-blue-100 text-blue-800',
      'Phase 2': 'bg-yellow-100 text-yellow-800',
      'Phase 1': 'bg-purple-100 text-purple-800',
      'Not Started': 'bg-gray-100 text-gray-800'
    };
    return colors[phase || ''] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {vendors.map((vendor) => {
        const vendorProjects = projects.filter(p => p.reactor_vendor === vendor.vendor_name);
        const totalCapacity = vendorProjects.reduce((sum, p) => sum + (p.total_capacity_mw || 0), 0);

        return (
          <div key={vendor.id} className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{vendor.vendor_name}</h3>
                <p className="text-sm text-gray-600">{vendor.headquarters_country}</p>
              </div>
              <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${getCNSCBadge(vendor.cnsc_vdr_phase)}`}>
                CNSC VDR: {vendor.cnsc_vdr_phase || 'Not Started'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Reactor Models</p>
                <p className="text-base text-gray-900">{vendor.reactor_models.join(', ')}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Technology Readiness</p>
                <p className="text-base text-gray-900">TRL {vendor.technology_readiness_level || 'N/A'}/9</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Canadian Projects</p>
                <p className="text-base text-gray-900">{vendorProjects.length} ({totalCapacity.toFixed(0)} MW)</p>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm font-medium text-gray-500 mb-2">Canadian Partners</p>
              <div className="flex flex-wrap gap-2">
                {vendor.canadian_partners.map((partner, idx) => (
                  <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                    {partner}
                  </span>
                ))}
              </div>
            </div>

            {vendor.notes && (
              <p className="text-sm text-gray-600 border-t border-gray-200 pt-4">{vendor.notes}</p>
            )}

            {vendor.website && (
              <a
                href={vendor.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline mt-2 inline-block"
              >
                Visit website →
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ============================================================================
// REGULATORY SECTION
// ============================================================================

interface RegulatorySectionProps {
  projects: SMRProject[];
  milestones: RegulatoryMilestone[];
}

const RegulatorySection: React.FC<RegulatorySectionProps> = ({ projects, milestones }) => {
  const getMilestoneBadge = (status: string) => {
    const colors: Record<string, string> = {
      'Completed': 'bg-green-100 text-green-800',
      'In Progress': 'bg-blue-100 text-blue-800',
      'Pending': 'bg-gray-100 text-gray-800',
      'Delayed': 'bg-orange-100 text-orange-800',
      'Cancelled': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {projects.map((project) => {
        const projectMilestones = milestones.filter(m => m.project_id === project.id);

        return (
          <div key={project.id} className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{project.project_name}</h3>
            <p className="text-sm text-gray-600 mb-4">{project.operator} - {project.province}</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <p className="text-sm font-medium text-gray-500">CNSC VDR Status</p>
                <p className="text-base text-gray-900">{project.cnsc_vendor_design_review_status || 'Not Started'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Environmental Assessment</p>
                <p className="text-base text-gray-900">{project.environmental_assessment_status || 'Not Required'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Construction License</p>
                <p className="text-base text-gray-900">{project.construction_license_status || 'Not Applied'}</p>
              </div>
            </div>

            {projectMilestones.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Regulatory Milestones</h4>
                <div className="space-y-2">
                  {projectMilestones.map((milestone) => (
                    <div key={milestone.id} className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-200">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">{milestone.milestone_type}</span>
                          <span className={`px-2 py-1 inline-flex text-xs leading-4 font-semibold rounded-full ${getMilestoneBadge(milestone.status)}`}>
                            {milestone.status}
                          </span>
                        </div>
                        {milestone.notes && (
                          <p className="text-xs text-gray-600 mt-1">{milestone.notes}</p>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-xs text-gray-500">
                          {milestone.actual_date
                            ? `Completed: ${new Date(milestone.actual_date).toLocaleDateString()}`
                            : milestone.target_date
                            ? `Target: ${new Date(milestone.target_date).toLocaleDateString()}`
                            : 'TBD'}
                        </p>
                        {milestone.authority && (
                          <p className="text-xs text-gray-400">{milestone.authority}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ============================================================================
// ECONOMICS SECTION
// ============================================================================

interface EconomicsSectionProps {
  projects: SMRProject[];
}

const EconomicsSection: React.FC<EconomicsSectionProps> = ({ projects }) => {
  // Investment by province
  const investmentByProvince = Object.entries(
    projects.reduce((acc, p) => {
      acc[p.province] = (acc[p.province] || 0) + (p.estimated_capex_cad || 0);
      return acc;
    }, {} as Record<string, number>)
  ).map(([province, investment]) => ({
    province,
    investment: investment / 1e9 // Convert to billions
  }));

  // Cost per MW
  const costPerMW = projects
    .filter(p => p.estimated_capex_cad && p.total_capacity_mw)
    .map(p => ({
      project_name: p.project_name,
      cost_per_mw: p.estimated_capex_cad! / p.total_capacity_mw
    }))
    .sort((a, b) => a.cost_per_mw - b.cost_per_mw);

  return (
    <div className="space-y-6">
      {/* Investment Banner */}
      <div className="bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-green-900 mb-2">Federal SMR Investment Strategy</h3>
        <p className="text-green-800 mb-4">
          The federal government has committed $970M to OPG's Darlington SMR project and supports the SMR Action Plan. Provincial governments (Ontario, Saskatchewan, New Brunswick) are co-investing in regulatory frameworks and site preparation.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="font-semibold text-green-900">OPG Federal Funding</p>
            <p className="text-green-700">$970M committed</p>
          </div>
          <div>
            <p className="font-semibold text-green-900">Total Pipeline</p>
            <p className="text-green-700">${(projects.reduce((sum, p) => sum + (p.estimated_capex_cad || 0), 0) / 1e9).toFixed(1)}B</p>
          </div>
          <div>
            <p className="font-semibold text-green-900">Avg. Cost/MW</p>
            <p className="text-green-700">$8-12M/MW</p>
          </div>
          <div>
            <p className="font-semibold text-green-900">Jobs</p>
            <p className="text-green-700">2,300+ (Darlington alone)</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Investment by Province */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Investment by Province</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={investmentByProvince}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="province" />
              <YAxis label={{ value: 'Investment ($B CAD)', angle: -90, position: 'insideLeft' }} />
              <Tooltip formatter={(value: number) => `$${value.toFixed(1)}B`} />
              <Bar dataKey="investment" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Cost per MW */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Capital Cost per MW</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={costPerMW} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" label={{ value: 'Cost per MW ($M CAD/MW)', position: 'insideBottom', offset: -5 }} />
              <YAxis type="category" dataKey="project_name" width={180} />
              <Tooltip formatter={(value: number) => `$${(value / 1e6).toFixed(1)}M/MW`} />
              <Bar dataKey="cost_per_mw" fill="#F59E0B" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Economics Table */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Economics Summary</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total CapEx</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Capacity</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost/MW</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Use Case</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {projects.map((project) => (
                <tr key={project.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 text-sm font-medium text-gray-900">{project.project_name}</td>
                  <td className="px-4 py-4 text-sm text-gray-700">
                    {project.estimated_capex_cad
                      ? `$${(project.estimated_capex_cad / 1e9).toFixed(1)}B`
                      : 'TBD'}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-700">{project.total_capacity_mw} MW</td>
                  <td className="px-4 py-4 text-sm text-gray-700">
                    {project.estimated_capex_cad && project.total_capacity_mw
                      ? `$${(project.estimated_capex_cad / project.total_capacity_mw / 1e6).toFixed(1)}M/MW`
                      : 'TBD'}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-700">{project.primary_use_case}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SMRDeploymentTracker;
