/**
 * Indigenous Economic Dashboard
 *
 * Strategic Priority: ESG Ratings, Reconciliation, Federal Funding Eligibility
 * Focus: Indigenous equity ownership, revenue agreements (IBAs), economic impact
 *
 * Features:
 * - Equity ownership tracking (Wataynikaneyap, Clearwater Wind, Makwa Solar)
 * - Revenue agreements (IBAs) registry
 * - Economic impact metrics (jobs, GDP, procurement)
 * - Community investment tracking
 */

import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import {
  Users, DollarSign, TrendingUp, Briefcase, Building2,
  FileText, Award, CheckCircle, AlertTriangle, Home
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { HelpButton } from './HelpButton';

// Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// ============================================================================
// INTERFACES
// ============================================================================

interface EquityOwnership {
  id: string;
  project_name: string;
  project_type: string;
  indigenous_community: string;
  nation_or_band: string;
  ownership_percent: number;
  ownership_type: string;
  equity_value_cad: number;
  project_capacity_mw: number;
  province: string;
  annual_dividend_cad: number;
  total_return_to_date_cad: number;
  board_seats: number;
  status: string;
}

interface RevenueAgreement {
  id: string;
  agreement_name: string;
  project_name: string;
  indigenous_community: string;
  operator: string;
  agreement_type: string;
  total_value_cad: number;
  cumulative_payments_cad: number;
  jobs_created: number;
  training_investment_cad: number;
  status: string;
}

interface EconomicImpact {
  community_name: string;
  year: number;
  direct_jobs: number;
  indirect_jobs: number;
  total_revenue_from_energy_projects_cad: number;
  equity_dividends_cad: number;
  royalty_payments_cad: number;
  iba_payments_cad: number;
  local_procurement_value_cad: number;
  education_investment_cad: number;
  infrastructure_investment_cad: number;
}

interface DashboardData {
  equity_projects: EquityOwnership[];
  revenue_agreements: RevenueAgreement[];
  economic_impact: EconomicImpact[];
  summary: {
    total_equity_value: number;
    total_annual_dividends: number;
    total_iba_value: number;
    total_jobs: number;
    total_communities: number;
  };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const IndigenousEconomicDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'equity' | 'agreements' | 'impact'>('overview');

  // Fetch Indigenous economic data
  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    if (!supabase) {
      setError('Supabase not configured');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch equity ownership
      const { data: equityData, error: equityError } = await supabase
        .from('indigenous_equity_ownership')
        .select('*')
        .eq('status', 'Active')
        .order('equity_value_cad', { ascending: false });

      if (equityError) throw equityError;

      // Fetch revenue agreements
      const { data: agreementsData, error: agreementsError } = await supabase
        .from('indigenous_revenue_agreements')
        .select('*')
        .eq('status', 'Active')
        .order('total_value_cad', { ascending: false });

      if (agreementsError) throw agreementsError;

      // Fetch economic impact (latest year)
      const { data: impactData, error: impactError } = await supabase
        .from('indigenous_economic_impact')
        .select('*')
        .eq('year', 2023)
        .order('total_revenue_from_energy_projects_cad', { ascending: false });

      if (impactError) throw impactError;

      // Calculate summary
      const summary = {
        total_equity_value: equityData?.reduce((sum, e) => sum + (e.equity_value_cad || 0), 0) || 0,
        total_annual_dividends: equityData?.reduce((sum, e) => sum + (e.annual_dividend_cad || 0), 0) || 0,
        total_iba_value: agreementsData?.reduce((sum, a) => sum + (a.total_value_cad || 0), 0) || 0,
        total_jobs: impactData?.reduce((sum, i) => sum + (i.direct_jobs || 0) + (i.indirect_jobs || 0), 0) || 0,
        total_communities: new Set([
          ...equityData?.map(e => e.indigenous_community) || [],
          ...agreementsData?.map(a => a.indigenous_community) || []
        ]).size
      };

      setData({
        equity_projects: equityData || [],
        revenue_agreements: agreementsData || [],
        economic_impact: impactData || [],
        summary
      });

      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch Indigenous economic data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Indigenous economic data...</p>
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
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Users className="h-8 w-8 text-purple-600" />
          <h1 className="text-3xl font-bold text-gray-900">Indigenous Economic Impact</h1>
          <HelpButton id="indigenous.overview" />
        </div>
        <p className="text-gray-600 text-lg">
          Equity Ownership, Revenue Agreements & Economic Benefits Tracking
        </p>
      </div>

      {/* Key Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={<DollarSign className="h-6 w-6" />}
          title="Total Equity Value"
          value={`$${(data.summary.total_equity_value / 1e6).toFixed(0)}M`}
          subtitle={`${data.equity_projects.length} active projects`}
          color="green"
        />
        <StatCard
          icon={<TrendingUp className="h-6 w-6" />}
          title="Annual Dividends"
          value={`$${(data.summary.total_annual_dividends / 1e6).toFixed(1)}M/year`}
          subtitle="From equity investments"
          color="blue"
        />
        <StatCard
          icon={<FileText className="h-6 w-6" />}
          title="IBA Value"
          value={`$${(data.summary.total_iba_value / 1e9).toFixed(2)}B`}
          subtitle={`${data.revenue_agreements.length} active agreements`}
          color="purple"
        />
        <StatCard
          icon={<Briefcase className="h-6 w-6" />}
          title="Jobs Created"
          value={data.summary.total_jobs.toLocaleString()}
          subtitle={`${data.summary.total_communities} communities`}
          color="orange"
        />
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <TabButton
              active={activeTab === 'overview'}
              onClick={() => setActiveTab('overview')}
              icon={<Home className="h-5 w-5" />}
              label="Overview"
            />
            <TabButton
              active={activeTab === 'equity'}
              onClick={() => setActiveTab('equity')}
              icon={<Award className="h-5 w-5" />}
              label="Equity Ownership"
            />
            <TabButton
              active={activeTab === 'agreements'}
              onClick={() => setActiveTab('agreements')}
              icon={<FileText className="h-5 w-5" />}
              label="Revenue Agreements"
            />
            <TabButton
              active={activeTab === 'impact'}
              onClick={() => setActiveTab('impact')}
              icon={<TrendingUp className="h-5 w-5" />}
              label="Economic Impact"
            />
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && <OverviewSection data={data} />}
          {activeTab === 'equity' && <EquitySection data={data} />}
          {activeTab === 'agreements' && <AgreementsSection data={data} />}
          {activeTab === 'impact' && <ImpactSection data={data} />}
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
  color: 'green' | 'blue' | 'purple' | 'orange';
}

const StatCard: React.FC<StatCardProps> = ({ icon, title, value, subtitle, color }) => {
  const colorClasses = {
    green: 'bg-green-50 text-green-600 border-green-200',
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    orange: 'bg-orange-50 text-orange-600 border-orange-200'
  };

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
      <div className={`inline-flex p-3 rounded-lg ${colorClasses[color]} mb-4`}>
        {icon}
      </div>
      <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
      <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
      <p className="text-sm text-gray-500">{subtitle}</p>
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
        ? 'border-purple-600 text-purple-600'
        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
    }`}
  >
    {icon}
    {label}
  </button>
);

// ============================================================================
// OVERVIEW SECTION
// ============================================================================

const OverviewSection: React.FC<{ data: DashboardData }> = ({ data }) => {
  // Prepare charts data
  const equityByType = data.equity_projects.reduce((acc: any[], project) => {
    const existing = acc.find(item => item.name === project.project_type);
    if (existing) {
      existing.value += project.equity_value_cad;
      existing.count += 1;
    } else {
      acc.push({ name: project.project_type, value: project.equity_value_cad, count: 1 });
    }
    return acc;
  }, []).sort((a, b) => b.value - a.value);

  const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];

  return (
    <div className="space-y-6">
      {/* Reconciliation Banner */}
      <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <CheckCircle className="h-6 w-6 text-purple-600 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-purple-900 mb-2">
              Indigenous Economic Participation in Canada's Energy Transition
            </h3>
            <p className="text-purple-800 mb-3">
              Indigenous communities are active partners in Canada's clean energy economy through equity ownership,
              revenue-sharing agreements, and employment opportunities. This dashboard tracks economic benefits
              and reconciliation progress.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-purple-600 font-medium">Communities Participating</p>
                <p className="text-2xl font-bold text-purple-900">{data.summary.total_communities}+</p>
              </div>
              <div>
                <p className="text-sm text-purple-600 font-medium">Total Equity Invested</p>
                <p className="text-2xl font-bold text-purple-900">
                  ${(data.summary.total_equity_value / 1e6).toFixed(0)}M
                </p>
              </div>
              <div>
                <p className="text-sm text-purple-600 font-medium">Annual Economic Benefit</p>
                <p className="text-2xl font-bold text-purple-900">
                  ${(data.summary.total_annual_dividends / 1e6).toFixed(0)}M/year
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Equity by Project Type */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Equity Distribution by Project Type</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={equityByType}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: $${(entry.value / 1e6).toFixed(0)}M (${entry.count})`}
                outerRadius={80}
                dataKey="value"
              >
                {equityByType.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `$${(value / 1e6).toFixed(1)}M`} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top 5 Communities by Revenue */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Communities by Annual Revenue</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.economic_impact.slice(0, 5)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="community_name" angle={-45} textAnchor="end" height={100} fontSize={11} />
              <YAxis label={{ value: 'CAD (Millions)', angle: -90, position: 'insideLeft' }} />
              <Tooltip formatter={(value: number) => `$${(value / 1e6).toFixed(1)}M`} />
              <Bar dataKey="total_revenue_from_energy_projects_cad" fill="#8b5cf6" name="Total Revenue" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// EQUITY OWNERSHIP SECTION
// ============================================================================

const EquitySection: React.FC<{ data: DashboardData }> = ({ data }) => {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr className="text-left text-sm text-gray-600">
                <th className="px-4 py-3 font-medium">Project</th>
                <th className="px-4 py-3 font-medium">Community</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium text-right">Ownership %</th>
                <th className="px-4 py-3 font-medium text-right">Equity Value</th>
                <th className="px-4 py-3 font-medium text-right">Annual Dividend</th>
                <th className="px-4 py-3 font-medium text-right">Total Returns</th>
                <th className="px-4 py-3 font-medium text-center">Board Seats</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.equity_projects.map((project) => (
                <tr key={project.id} className="text-sm hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{project.project_name}</td>
                  <td className="px-4 py-3 text-gray-700">{project.indigenous_community}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                      {project.project_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-purple-600">
                    {project.ownership_percent}%
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900">
                    ${(project.equity_value_cad / 1e6).toFixed(1)}M
                  </td>
                  <td className="px-4 py-3 text-right text-green-600 font-semibold">
                    ${(project.annual_dividend_cad / 1e6).toFixed(2)}M
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900">
                    ${(project.total_return_to_date_cad / 1e6).toFixed(1)}M
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-semibold">{project.board_seats}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Key Insights */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">Equity Ownership Highlights</h3>
        <ul className="space-y-1 text-sm text-blue-800">
          <li>• <strong>Wataynikaneyap Power:</strong> 51% Indigenous ownership ($340M) - First majority Indigenous-owned transmission company</li>
          <li>• <strong>Makwa Solar:</strong> 100% Ermineskin Cree Nation ownership - First 100% Indigenous utility-scale solar in Alberta</li>
          <li>• <strong>Governance:</strong> Indigenous communities hold {data.equity_projects.reduce((sum, p) => sum + p.board_seats, 0)} board seats across projects</li>
          <li>• <strong>Returns:</strong> ${(data.summary.total_annual_dividends / 1e6).toFixed(1)}M annual dividends funding community development</li>
        </ul>
      </div>
    </div>
  );
};

// ============================================================================
// AGREEMENTS SECTION
// ============================================================================

const AgreementsSection: React.FC<{ data: DashboardData }> = ({ data }) => {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr className="text-left text-sm text-gray-600">
                <th className="px-4 py-3 font-medium">Agreement</th>
                <th className="px-4 py-3 font-medium">Community</th>
                <th className="px-4 py-3 font-medium">Operator</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium text-right">Total Value</th>
                <th className="px-4 py-3 font-medium text-right">Paid to Date</th>
                <th className="px-4 py-3 font-medium text-right">Jobs Created</th>
                <th className="px-4 py-3 font-medium text-right">Training Investment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.revenue_agreements.map((agreement) => (
                <tr key={agreement.id} className="text-sm hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{agreement.agreement_name}</td>
                  <td className="px-4 py-3 text-gray-700">{agreement.indigenous_community}</td>
                  <td className="px-4 py-3 text-gray-600">{agreement.operator}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                      {agreement.agreement_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    ${(agreement.total_value_cad / 1e6).toFixed(0)}M
                  </td>
                  <td className="px-4 py-3 text-right text-green-600">
                    ${(agreement.cumulative_payments_cad / 1e6).toFixed(1)}M
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900">
                    {agreement.jobs_created.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900">
                    ${(agreement.training_investment_cad / 1e6).toFixed(1)}M
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Key Insights */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <h3 className="font-semibold text-green-900 mb-2">Impact Benefit Agreement (IBA) Highlights</h3>
        <ul className="space-y-1 text-sm text-green-800">
          <li>• <strong>Coastal GasLink:</strong> $620M in benefits to 20 First Nations over project lifetime</li>
          <li>• <strong>Keeyask:</strong> $4B project with 4 Cree Nations as 51% equity partners + revenue sharing</li>
          <li>• <strong>Employment:</strong> {data.revenue_agreements.reduce((sum, a) => sum + a.jobs_created, 0).toLocaleString()} jobs created through IBAs</li>
          <li>• <strong>Training:</strong> ${(data.revenue_agreements.reduce((sum, a) => sum + a.training_investment_cad, 0) / 1e6).toFixed(0)}M invested in capacity building</li>
        </ul>
      </div>
    </div>
  );
};

// ============================================================================
// ECONOMIC IMPACT SECTION
// ============================================================================

const ImpactSection: React.FC<{ data: DashboardData }> = ({ data }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {data.economic_impact.slice(0, 3).map((community) => (
          <div key={community.community_name} className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-4">{community.community_name}</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Total Revenue (2023)</p>
                <p className="text-2xl font-bold text-purple-600">
                  ${(community.total_revenue_from_energy_projects_cad / 1e6).toFixed(1)}M
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-600">Direct Jobs</p>
                  <p className="font-semibold">{community.direct_jobs}</p>
                </div>
                <div>
                  <p className="text-gray-600">Indirect Jobs</p>
                  <p className="font-semibold">{community.indirect_jobs}</p>
                </div>
                <div>
                  <p className="text-gray-600">Procurement</p>
                  <p className="font-semibold">${(community.local_procurement_value_cad / 1e6).toFixed(1)}M</p>
                </div>
                <div>
                  <p className="text-gray-600">Education</p>
                  <p className="font-semibold">${(community.education_investment_cad / 1e6).toFixed(1)}M</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue Breakdown Chart */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Sources Breakdown</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.economic_impact}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="community_name" angle={-45} textAnchor="end" height={100} fontSize={11} />
            <YAxis label={{ value: 'CAD (Millions)', angle: -90, position: 'insideLeft' }} />
            <Tooltip formatter={(value: number) => `$${(value / 1e6).toFixed(1)}M`} />
            <Legend />
            <Bar dataKey="equity_dividends_cad" fill="#10b981" name="Equity Dividends" stackId="a" />
            <Bar dataKey="royalty_payments_cad" fill="#3b82f6" name="Royalty Payments" stackId="a" />
            <Bar dataKey="iba_payments_cad" fill="#8b5cf6" name="IBA Payments" stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default IndigenousEconomicDashboard;
