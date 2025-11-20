/**
 * CCUS Project Tracker Dashboard
 *
 * Strategic Priority: Alberta's $30B CCUS Corridor
 * Key Focus: Pathways Alliance $16.5B proposal tracking
 *
 * Features:
 * - CCUS facilities registry (Quest, ACTL, Boundary Dam)
 * - Pathways Alliance project tracking (6 member companies)
 * - CO2 capture capacity monitoring
 * - Storage site tracking
 * - Federal tax credit calculator
 * - Economics dashboard
 */

import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, Area
} from 'recharts';
import {
  Factory, Cloud, Database, DollarSign, TrendingUp,
  MapPin, Activity, AlertTriangle, CheckCircle, Info,
  Zap, Building2, Pipette
} from 'lucide-react';
import { fetchEdgeJson } from '../lib/edge';
import { CardTable } from './CardTable';

// ============================================================================
// INTERFACES
// ============================================================================

interface CCUSFacility {
  id: string;
  facility_name: string;
  operator: string;
  location_city: string;
  province: string;
  status: string;
  design_capture_capacity_mt_per_year: number;
  current_capture_capacity_mt_per_year: number;
  capture_technology: string;
  capture_point_source: string;
  storage_type: string;
  cumulative_stored_mt: number;
  capital_cost_cad: number;
  federal_tax_credit_value_cad: number;
  latitude: number;
  longitude: number;
  actual_operational_date: string | null;
}

interface PathwaysProject {
  id: string;
  project_name: string;
  member_company: string;
  facility_type: string;
  capture_capacity_mt_per_year: number;
  status: string;
  capex_cad: number;
  federal_tax_credit_requested_cad: number;
  target_operational_date: string;
  connected_to_actl: boolean;
}

interface CCUSPipeline {
  id: string;
  pipeline_name: string;
  operator: string;
  from_location: string;
  to_location: string;
  total_length_km: number;
  design_capacity_mt_per_year: number;
  current_throughput_mt_per_year: number;
  status: string;
}

interface StorageSite {
  id: string;
  site_name: string;
  operator: string;
  location: string;
  reservoir_type: string;
  total_storage_capacity_mt: number;
  cumulative_injected_mt: number;
  remaining_capacity_mt: number;
}

interface CCUSDashboardData {
  facilities: CCUSFacility[];
  pathways_alliance: {
    total_investment: number;
    total_capacity: number;
    federal_tax_credit_requested: number;
    projects: PathwaysProject[];
    project_count: number;
    member_companies: number;
  };
  pipelines: CCUSPipeline[];
  storage_sites: StorageSite[];
  summary: {
    total_operational_capacity_mt: number;
    total_proposed_capacity_mt: number;
    total_cumulative_stored_mt: number;
    total_storage_capacity_mt: number;
    total_federal_investment: number;
    pathways_total_investment: number;
    facility_count: {
      operational: number;
      under_construction: number;
      proposed: number;
      total: number;
    };
  };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const CCUSProjectTracker: React.FC = () => {
  const [data, setData] = useState<CCUSDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'pathways' | 'facilities' | 'economics'>('pathways');

  // Fetch CCUS data
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const result = await fetchEdgeJson(['api-v2-ccus?province=AB']);
        setData(result.json);
        setError(null);
      } catch (err: any) {
        console.error('Failed to fetch CCUS data:', err);
        setError(err.message || 'Failed to load CCUS data');
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
          <p className="mt-4 text-gray-600">Loading CCUS data...</p>
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

  return (
    <div className="min-h-screen bg-primary p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Factory className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-primary">CCUS Project Tracker</h1>
        </div>
        <p className="text-secondary text-lg">
          Alberta's $30B Carbon Capture & Storage Corridor
        </p>
      </div>

      {/* Key Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={<Cloud className="h-6 w-6" />}
          title="Operational Capacity"
          value={`${data.summary.total_operational_capacity_mt.toFixed(1)} Mt/year`}
          subtitle="CO₂ Captured Annually"
          color="green"
        />
        <StatCard
          icon={<TrendingUp className="h-6 w-6" />}
          title="Proposed Capacity"
          value={`${data.summary.total_proposed_capacity_mt.toFixed(1)} Mt/year`}
          subtitle="Including Pathways Alliance"
          color="blue"
        />
        <StatCard
          icon={<Database className="h-6 w-6" />}
          title="Storage Used"
          value={`${data.summary.total_cumulative_stored_mt.toFixed(1)} Mt`}
          subtitle={`of ${data.summary.total_storage_capacity_mt.toFixed(0)} Mt total`}
          color="purple"
        />
        <StatCard
          icon={<DollarSign className="h-6 w-6" />}
          title="Pathways Investment"
          value={`$${(data.summary.pathways_total_investment / 1e9).toFixed(1)}B`}
          subtitle="6 Member Companies"
          color="red"
        />
      </div>

      {/* Tab Navigation */}
      <div className="card mb-6">
        <div className="border-b border-[var(--border-subtle)]">
          <nav className="flex -mb-px">
            <TabButton
              active={activeTab === 'pathways'}
              onClick={() => setActiveTab('pathways')}
              icon={<Building2 className="h-5 w-5" />}
              label="Pathways Alliance"
            />
            <TabButton
              active={activeTab === 'overview'}
              onClick={() => setActiveTab('overview')}
              icon={<Activity className="h-5 w-5" />}
              label="Overview"
            />
            <TabButton
              active={activeTab === 'facilities'}
              onClick={() => setActiveTab('facilities')}
              icon={<Factory className="h-5 w-5" />}
              label="Facilities"
            />
            <TabButton
              active={activeTab === 'economics'}
              onClick={() => setActiveTab('economics')}
              icon={<DollarSign className="h-5 w-5" />}
              label="Economics"
            />
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'pathways' && <PathwaysAllianceSection data={data} />}
          {activeTab === 'overview' && <OverviewSection data={data} />}
          {activeTab === 'facilities' && <FacilitiesSection data={data} />}
          {activeTab === 'economics' && <EconomicsSection data={data} />}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle: string;
  color: 'green' | 'blue' | 'purple' | 'red';
}

const StatCard: React.FC<StatCardProps> = ({ icon, title, value, subtitle, color }) => {
  const colorClasses = {
    green: 'bg-emerald-900/40 text-success border-emerald-500/40',
    blue: 'bg-sky-900/40 text-electric border-sky-500/40',
    purple: 'bg-violet-900/40 text-electric border-violet-500/40',
    red: 'bg-rose-900/40 text-danger border-rose-500/40'
  };

  return (
    <div className="card p-6">
      <div className={`inline-flex p-3 rounded-lg border ${colorClasses[color]} mb-4`}>
        {icon}
      </div>
      <h3 className="text-sm font-medium text-tertiary mb-1">{title}</h3>
      <p className="text-2xl font-bold text-primary mb-1">{value}</p>
      <p className="text-sm text-secondary">{subtitle}</p>
    </div>
  );
};

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

const TabButton: React.FC<TabButtonProps> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm transition-colors ${
      active
        ? 'border-blue-600 text-blue-600'
        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
    }`}
  >
    {icon}
    {label}
  </button>
);

// ============================================================================
// PATHWAYS ALLIANCE SECTION
// ============================================================================

const PathwaysAllianceSection: React.FC<{ data: CCUSDashboardData }> = ({ data }) => {
  const pathways = data.pathways_alliance;

  // Calculate federal tax credit gap
  const federalAllocated = 2600000000; // $2.6B allocated
  const gap = pathways.federal_tax_credit_requested - federalAllocated;

  return (
    <div className="space-y-6">
      {/* Critical Banner */}
      <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-red-900 mb-2">
              $16.5B Proposal Awaiting Federal Decision
            </h3>
            <p className="text-red-800 mb-3">
              The Pathways Alliance (Suncor, CNRL, Cenovus, Imperial Oil, ConocoPhillips, MEG Energy)
              has proposed Canada's largest CCUS project, requiring federal tax credit clarity to proceed.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-red-600 font-medium">Total Investment</p>
                <p className="text-2xl font-bold text-red-900">
                  ${(pathways.total_investment / 1e9).toFixed(1)}B
                </p>
              </div>
              <div>
                <p className="text-sm text-red-600 font-medium">CO₂ Capture Capacity</p>
                <p className="text-2xl font-bold text-red-900">
                  {pathways.total_capacity.toFixed(1)} Mt/year
                </p>
              </div>
              <div>
                <p className="text-sm text-red-600 font-medium">Tax Credit Requested</p>
                <p className="text-2xl font-bold text-red-900">
                  ${(pathways.federal_tax_credit_requested / 1e9).toFixed(2)}B
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Federal Tax Credit Gap */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-blue-600" />
          Federal Tax Credit Gap Analysis
        </h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Allocated (Federal Budget)</span>
              <span className="font-semibold text-gray-900">
                ${(federalAllocated / 1e9).toFixed(1)}B (21%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-green-500 h-3 rounded-full"
                style={{ width: '21%' }}
              ></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Requested (Pathways Alliance)</span>
              <span className="font-semibold text-gray-900">
                ${(pathways.federal_tax_credit_requested / 1e9).toFixed(2)}B (79%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-red-500 h-3 rounded-full"
                style={{ width: '79%' }}
              ></div>
            </div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
            <p className="text-sm font-medium text-yellow-900">
              <strong>Funding Gap: ${(gap / 1e9).toFixed(2)}B</strong> - Additional federal support needed
              for project to proceed.
            </p>
          </div>
        </div>
      </div>

      {/* Projects Table */}
      <CardTable title="Member Company Projects">
        <table className="w-full divide-y divide-[var(--border-subtle)]">
          <thead className="bg-secondary">
            <tr className="text-left text-sm text-tertiary">
              <th className="pb-3 font-medium">Company</th>
              <th className="pb-3 font-medium">Project</th>
              <th className="pb-3 font-medium">Type</th>
              <th className="pb-3 font-medium text-right">Capacity (Mt/year)</th>
              <th className="pb-3 font-medium text-right">CapEx</th>
              <th className="pb-3 font-medium text-right">Tax Credit</th>
              <th className="pb-3 font-medium">Target Date</th>
              <th className="pb-3 font-medium">ACTL</th>
            </tr>
          </thead>
          <tbody className="bg-secondary divide-y divide-[var(--border-subtle)]">
            {pathways.projects.map((project) => (
              <tr key={project.id} className="text-sm hover:bg-secondary">
                <td className="py-3 font-medium text-primary">{project.member_company}</td>
                <td className="py-3 text-secondary">{project.project_name}</td>
                <td className="py-3 text-secondary">{project.facility_type}</td>
                <td className="py-3 text-right font-semibold text-primary">
                  {project.capture_capacity_mt_per_year.toFixed(1)}
                </td>
                <td className="py-3 text-right text-primary">
                  ${(project.capex_cad / 1e9).toFixed(1)}B
                </td>
                <td className="py-3 text-right text-primary">
                  ${(project.federal_tax_credit_requested_cad / 1e9).toFixed(2)}B
                </td>
                <td className="py-3 text-secondary">
                  {new Date(project.target_operational_date).getFullYear()}
                </td>
                <td className="py-3">
                  {project.connected_to_actl ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <span className="text-xs text-tertiary">No</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardTable>

      {/* Capacity Chart */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Capture Capacity by Project</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={pathways.projects}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="member_company" angle={-45} textAnchor="end" height={100} />
            <YAxis label={{ value: 'Mt CO₂/year', angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            <Bar dataKey="capture_capacity_mt_per_year" fill="#ef4444" name="Capture Capacity" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// ============================================================================
// OVERVIEW SECTION
// ============================================================================

const OverviewSection: React.FC<{ data: CCUSDashboardData }> = ({ data }) => {
  // Prepare capacity chart data
  const capacityData = [
    { name: 'Operational', value: data.summary.total_operational_capacity_mt, fill: '#10b981' },
    { name: 'Under Construction', value: data.facilities.filter(f => f.status === 'Under Construction')
        .reduce((sum, f) => sum + (f.design_capture_capacity_mt_per_year || 0), 0), fill: '#f59e0b' },
    { name: 'Proposed (excl. Pathways)', value: data.facilities.filter(f => f.status === 'Proposed')
        .reduce((sum, f) => sum + (f.design_capture_capacity_mt_per_year || 0), 0), fill: '#3b82f6' },
    { name: 'Pathways Alliance', value: data.pathways_alliance.total_capacity, fill: '#ef4444' }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Capacity Breakdown */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">CO₂ Capture Capacity Breakdown</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={capacityData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: ${entry.value.toFixed(1)} Mt`}
                outerRadius={80}
                dataKey="value"
              >
                {capacityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Storage Utilization */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Storage Capacity Utilization</h3>
          <div className="space-y-4">
            {data.storage_sites.map((site) => {
              const utilizationPercent = (site.cumulative_injected_mt / site.total_storage_capacity_mt) * 100;
              return (
                <div key={site.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">{site.site_name}</span>
                    <span className="text-gray-600">
                      {site.cumulative_injected_mt.toFixed(1)}/{site.total_storage_capacity_mt.toFixed(0)} Mt
                      ({utilizationPercent.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full"
                      style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Alberta CCUS Corridor Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <Info className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">Alberta CCUS Corridor Overview</h3>
            <p className="text-blue-800 text-sm mb-2">
              The Edmonton-Calgary corridor is home to Canada's most advanced CCUS infrastructure:
            </p>
            <ul className="list-disc list-inside text-blue-800 text-sm space-y-1">
              <li><strong>Quest:</strong> World's first commercial-scale CCUS in oil sands (operational since 2015, 6+ Mt stored)</li>
              <li><strong>ACTL:</strong> North America's largest CO₂ pipeline (240 km, 14.6 Mt/year capacity)</li>
              <li><strong>Pathways Alliance:</strong> $16.5B proposal to capture 15+ Mt/year from oil sands</li>
              <li><strong>Storage:</strong> 655+ Mt total geological storage capacity in saline aquifers and depleted reservoirs</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// FACILITIES SECTION
// ============================================================================

const FacilitiesSection: React.FC<{ data: CCUSDashboardData }> = ({ data }) => {
  return (
    <div className="space-y-6">
      <CardTable className="overflow-hidden">
        <table className="w-full divide-y divide-[var(--border-subtle)]">
          <thead className="bg-secondary">
            <tr className="text-left text-sm text-tertiary">
              <th className="px-4 py-3 font-medium">Facility</th>
              <th className="px-4 py-3 font-medium">Operator</th>
              <th className="px-4 py-3 font-medium">Location</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Technology</th>
              <th className="px-4 py-3 font-medium text-right">Capacity (Mt/year)</th>
              <th className="px-4 py-3 font-medium text-right">Stored (Mt)</th>
            </tr>
          </thead>
          <tbody className="bg-secondary divide-y divide-[var(--border-subtle)]">
            {data.facilities.map((facility) => (
              <tr key={facility.id} className="text-sm hover:bg-secondary">
                <td className="px-4 py-3 font-medium text-primary">{facility.facility_name}</td>
                <td className="px-4 py-3 text-secondary">{facility.operator}</td>
                <td className="px-4 py-3 text-secondary">{facility.location_city}, {facility.province}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={facility.status} />
                </td>
                <td className="px-4 py-3 text-secondary text-xs">{facility.capture_technology}</td>
                <td className="px-4 py-3 text-right font-semibold text-primary">
                  {facility.current_capture_capacity_mt_per_year?.toFixed(1) || facility.design_capture_capacity_mt_per_year.toFixed(1)}
                </td>
                <td className="px-4 py-3 text-right text-secondary">
                  {facility.cumulative_stored_mt?.toFixed(1) || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardTable>
    </div>
  );
};

// ============================================================================
// ECONOMICS SECTION
// ============================================================================

const EconomicsSection: React.FC<{ data: CCUSDashboardData }> = ({ data }) => {
  const totalCapex = data.facilities.reduce((sum, f) => sum + (f.capital_cost_cad || 0), 0) +
                      data.pathways_alliance.total_investment;
  const totalFederalCredits = data.summary.total_federal_investment +
                              data.pathways_alliance.federal_tax_credit_requested;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <p className="text-sm text-gray-600 mb-1">Total Capital Investment</p>
          <p className="text-3xl font-bold text-gray-900">${(totalCapex / 1e9).toFixed(1)}B</p>
          <p className="text-xs text-gray-500 mt-1">Operational + Proposed</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <p className="text-sm text-gray-600 mb-1">Federal Tax Credits</p>
          <p className="text-3xl font-bold text-blue-600">${(totalFederalCredits / 1e9).toFixed(1)}B</p>
          <p className="text-xs text-gray-500 mt-1">50% of capital costs</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <p className="text-sm text-gray-600 mb-1">Private Investment</p>
          <p className="text-3xl font-bold text-green-600">${((totalCapex - totalFederalCredits) / 1e9).toFixed(1)}B</p>
          <p className="text-xs text-gray-500 mt-1">Industry contribution</p>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="font-semibold text-yellow-900 mb-2">Economic Impact</h3>
        <ul className="space-y-1 text-sm text-yellow-800">
          <li>• <strong>Jobs:</strong> Estimated 10,000+ construction jobs, 2,000+ permanent operational jobs</li>
          <li>• <strong>GDP:</strong> $30B+ total economic impact over 10 years</li>
          <li>• <strong>Emissions:</strong> 20+ Mt CO₂/year reduction potential (equivalent to taking 4.3M cars off the road)</li>
          <li>• <strong>Technology Leadership:</strong> Positions Canada as global CCUS leader</li>
        </ul>
      </div>
    </div>
  );
};

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const statusColors: Record<string, string> = {
    'Operational': 'bg-green-100 text-green-800 border-green-200',
    'Under Construction': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'Proposed': 'bg-blue-100 text-blue-800 border-blue-200',
    'Awaiting Federal Decision': 'bg-red-100 text-red-800 border-red-200',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[status] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
      {status}
    </span>
  );
};

export default CCUSProjectTracker;
