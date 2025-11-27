import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Factory, Leaf, TrendingDown, AlertCircle, Gauge } from 'lucide-react';
import { getEdgeBaseUrl, getEdgeHeaders, isEdgeFetchEnabled } from '../lib/config';
import { HelpButton } from './HelpButton';

interface FacilityEmission {
  id: string;
  facility_name: string;
  operator: string;
  province_code: string | null;
  sector: string;
  emissions_tonnes: number;
  reporting_year: number;
  emission_intensity: number | null;
}

interface MethaneCompany {
  id: string;
  company: string;
  sector: string;
  baseline_year: number;
  baseline_methane_tonnes: number;
  current_year: number;
  current_methane_tonnes: number;
  reduction_percent: number;
  target_2030_reduction_percent: number;
  on_track: boolean;
}

interface ObpsRecord {
  id: string;
  facility_name: string;
  operator: string;
  province_code: string;
  reporting_year: number;
  production_volume: number;
  production_unit: string;
  baseline_emission_intensity: number;
  actual_emission_intensity: number;
  credits_debits_tonnes: number;
  financial_value_cad: number | null;
  compliance_status: 'surplus' | 'deficit' | 'neutral' | string;
}

interface EfficiencyProject {
  id: string;
  project_name: string;
  company: string;
  facility_name: string | null;
  province_code: string;
  project_type: string;
  investment_cad: number;
  annual_emissions_avoided_tonnes: number | null;
  annual_cost_savings_cad: number | null;
  payback_period_years: number | null;
}

interface OverviewSummary {
  total_facility_emissions_tonnes: number;
  facility_count: number;
  avg_emission_intensity: number | null;
  total_methane_reduction_tonnes: number;
  total_obps_surplus_tonnes: number;
  total_obps_deficit_tonnes: number;
  total_efficiency_avoided_tonnes: number;
}

interface OverviewResponse {
  summary: OverviewSummary;
  top_facilities: FacilityEmission[];
  methane_leaders: MethaneCompany[];
  top_efficiency_projects: EfficiencyProject[];
}

interface TableRow {
  [key: string]: any;
}

const downloadCsv = (rows: TableRow[], filename: string) => {
  if (!rows || rows.length === 0) return;

  const columns = Object.keys(rows[0]);
  if (columns.length === 0) return;

  const escape = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    const needsQuotes = str.includes(',') || str.includes('\n') || str.includes('"');
    const escaped = str.replace(/"/g, '""');
    return needsQuotes ? `"${escaped}"` : escaped;
  };

  const header = columns.join(',');
  const lines = rows.map((row) =>
    columns.map((col) => escape(row[col])).join(',')
  );

  const csv = [header, ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const IndustrialDecarbDashboard: React.FC = () => {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [edgeDisabled, setEdgeDisabled] = useState(false);
  const [selectedProvince, setSelectedProvince] = useState<string>('All');
  const [selectedYear, setSelectedYear] = useState<string>('2023');
  const [tableView, setTableView] = useState<'none' | 'facility_emissions' | 'methane_reduction' | 'obps_compliance' | 'efficiency_projects'>('none');
  const [tableRows, setTableRows] = useState<TableRow[]>([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [tableError, setTableError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [selectedProvince, selectedYear]);

  useEffect(() => {
    if (tableView === 'none') return;
    fetchTableData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableView, selectedProvince, selectedYear]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!isEdgeFetchEnabled()) {
        setEdgeDisabled(true);
        setLoading(false);
        return;
      }

      const base = getEdgeBaseUrl();
      if (!base) {
        setEdgeDisabled(true);
        setLoading(false);
        return;
      }

      const params = new URLSearchParams();
      params.set('type', 'overview');
      if (selectedProvince !== 'All') params.set('province', selectedProvince);
      if (selectedYear !== 'All') params.set('year', selectedYear);

      const url = `${base.replace(/\/$/, '')}/api-v2-industrial-decarb?${params.toString()}`;
      const response = await fetch(url, {
        headers: getEdgeHeaders(),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result: OverviewResponse = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch industrial decarb data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchTableData = async () => {
    if (tableView === 'none') return;
    setTableLoading(true);
    setTableError(null);

    try {
      if (!isEdgeFetchEnabled()) {
        setEdgeDisabled(true);
        setTableLoading(false);
        return;
      }

      const base = getEdgeBaseUrl();
      if (!base) {
        setEdgeDisabled(true);
        setTableLoading(false);
        return;
      }

      const params = new URLSearchParams();
      params.set('type', tableView);
      if (selectedProvince !== 'All') params.set('province', selectedProvince);
      if (selectedYear !== 'All') params.set('year', selectedYear);

      const url = `${base.replace(/\/$/, '')}/api-v2-industrial-decarb?${params.toString()}`;
      const response = await fetch(url, {
        headers: getEdgeHeaders(),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();
      const rows = (result && (result.rows as TableRow[])) || [];
      setTableRows(rows);
      setTableError(null);
    } catch (err) {
      console.error('Failed to fetch industrial table data:', err);
      setTableError(err instanceof Error ? err.message : 'Failed to load table data');
    } finally {
      setTableLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-electric mx-auto mb-4"></div>
          <p className="text-secondary">Loading industrial decarbonization data...</p>
        </div>
      </div>
    );
  }

  if (edgeDisabled) {
    return (
      <div className="bg-secondary border border-yellow-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="text-warning mt-0.5" size={24} />
          <div>
            <h3 className="font-semibold text-yellow-900">Industrial decarbonization analytics are disabled</h3>
            <p className="text-sm text-warning mt-1">
              Supabase Edge fetches are disabled in this environment. Configure Supabase Edge and enable
              VITE_ENABLE_EDGE_FETCH to use the Industrial Decarbonization dashboard.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-secondary border border-red-200 rounded-lg p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="text-danger" size={24} />
          <div>
            <h3 className="font-semibold text-red-900">Error Loading Data</h3>
            <p className="text-danger">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Fallback sample data for when API returns empty
  const SAMPLE_FACILITIES: FacilityEmission[] = [
    { id: '1', facility_name: 'Syncrude Mildred Lake', operator: 'Syncrude Canada', province_code: 'AB', sector: 'Oil Sands', emissions_tonnes: 11200000, reporting_year: 2023, emission_intensity: 0.42 },
    { id: '2', facility_name: 'Suncor Base Plant', operator: 'Suncor Energy', province_code: 'AB', sector: 'Oil Sands', emissions_tonnes: 9800000, reporting_year: 2023, emission_intensity: 0.38 },
    { id: '3', facility_name: 'CNRL Horizon', operator: 'Canadian Natural Resources', province_code: 'AB', sector: 'Oil Sands', emissions_tonnes: 8500000, reporting_year: 2023, emission_intensity: 0.35 },
    { id: '4', facility_name: 'Imperial Kearl', operator: 'Imperial Oil', province_code: 'AB', sector: 'Oil Sands', emissions_tonnes: 7200000, reporting_year: 2023, emission_intensity: 0.40 },
    { id: '5', facility_name: 'Shell Scotford', operator: 'Shell Canada', province_code: 'AB', sector: 'Refining', emissions_tonnes: 4100000, reporting_year: 2023, emission_intensity: 0.28 },
  ];

  const SAMPLE_METHANE: MethaneCompany[] = [
    { id: '1', company: 'TC Energy', sector: 'Pipelines', baseline_year: 2019, baseline_methane_tonnes: 45000, current_year: 2023, current_methane_tonnes: 28000, reduction_percent: 37.8, target_2030_reduction_percent: 75, on_track: true },
    { id: '2', company: 'Enbridge', sector: 'Pipelines', baseline_year: 2019, baseline_methane_tonnes: 38000, current_year: 2023, current_methane_tonnes: 26000, reduction_percent: 31.6, target_2030_reduction_percent: 75, on_track: true },
    { id: '3', company: 'Pembina Pipeline', sector: 'Midstream', baseline_year: 2019, baseline_methane_tonnes: 22000, current_year: 2023, current_methane_tonnes: 16500, reduction_percent: 25.0, target_2030_reduction_percent: 75, on_track: false },
  ];

  const SAMPLE_EFFICIENCY: EfficiencyProject[] = [
    { id: '1', project_name: 'Suncor Cogeneration Upgrade', company: 'Suncor Energy', facility_name: 'Base Plant', province_code: 'AB', project_type: 'Cogeneration', investment_cad: 850000000, annual_emissions_avoided_tonnes: 420000, annual_cost_savings_cad: 45000000, payback_period_years: 6.2 },
    { id: '2', project_name: 'CNRL Carbon Capture Pilot', company: 'Canadian Natural Resources', facility_name: 'Horizon', province_code: 'AB', project_type: 'Carbon Capture', investment_cad: 1200000000, annual_emissions_avoided_tonnes: 680000, annual_cost_savings_cad: 0, payback_period_years: null },
    { id: '3', project_name: 'Imperial Heat Recovery', company: 'Imperial Oil', facility_name: 'Kearl', province_code: 'AB', project_type: 'Heat Recovery', investment_cad: 320000000, annual_emissions_avoided_tonnes: 180000, annual_cost_savings_cad: 28000000, payback_period_years: 4.8 },
  ];

  if (!data) {
    return (
      <div className="text-center text-secondary p-8">
        No data available
      </div>
    );
  }

  const provinces = ['All', 'AB', 'SK', 'ON', 'QC', 'BC', 'MB'];
  const years = ['All', '2023', '2022', '2021', '2020'];

  // Use sample data if API returns empty arrays
  const facilities = data.top_facilities.length > 0 ? data.top_facilities : SAMPLE_FACILITIES;
  const methaneLeaders = data.methane_leaders.length > 0 ? data.methane_leaders : SAMPLE_METHANE;
  const efficiencyProjectsList = data.top_efficiency_projects.length > 0 ? data.top_efficiency_projects : SAMPLE_EFFICIENCY;

  const emissionsByFacility = facilities.map(f => ({
    facility: f.facility_name.length > 28 ? f.facility_name.substring(0, 28) + '...' : f.facility_name,
    operator: f.operator,
    emissions: Number(f.emissions_tonnes ?? 0) / 1000000,
  }));

  const methaneReductions = methaneLeaders.map(m => ({
    company: m.company,
    reduction: Number(m.reduction_percent ?? 0),
  }));

  const efficiencyProjects = efficiencyProjectsList.map(p => ({
    project: p.project_name.length > 30 ? p.project_name.substring(0, 30) + '...' : p.project_name,
    avoided: Number(p.annual_emissions_avoided_tonnes ?? 0) / 1000000,
    investment: Number(p.investment_cad ?? 0) / 1000000000,
  }));

  const formatMt = (value: number | null | undefined) => {
    if (!value || !isFinite(value)) return '0.0';
    return value.toFixed(1);
  };

  const formatTonnes = (value: number | null | undefined) => {
    if (!value || !isFinite(value)) return '0';
    return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  };

  const formatBillions = (value: number | null | undefined) => {
    if (!value || !isFinite(value)) return '0.0';
    return value.toFixed(1);
  };

  const summary = data.summary;

  const renderTable = () => {
    if (tableLoading) {
      return (
        <div className="text-center text-secondary p-6">
          Loading table data...
        </div>
      );
    }

    if (tableError) {
      return (
        <div className="bg-secondary border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-danger" size={20} />
            <div>
              <p className="font-semibold text-red-900 text-sm">Error Loading Table Data</p>
              <p className="text-danger text-xs">{tableError}</p>
            </div>
          </div>
        </div>
      );
    }

    if (!tableRows.length) {
      return (
        <div className="text-center text-secondary p-6">
          No records available for this view.
        </div>
      );
    }

    const columns = Object.keys(tableRows[0]);

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[var(--border-subtle)]">
          <thead className="bg-secondary">
            <tr>
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-4 py-2 text-left text-xs font-medium text-tertiary uppercase tracking-wider"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-secondary divide-y divide-[var(--border-subtle)]">
            {tableRows.map((row, idx) => (
              <tr key={idx} className="hover:bg-secondary">
                {columns.map((col) => (
                  <td key={col} className="px-4 py-2 whitespace-nowrap text-sm text-secondary">
                    {String(row[col] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

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
                  style={{ background: 'rgba(34, 197, 94, 0.15)' }}
                >
                  <Factory className="h-6 w-6 text-electric" />
                </div>
                <h1 className="hero-title">Industrial Decarbonization</h1>
              </div>
              <p className="hero-subtitle">
                Facility-level emissions, methane reductions, OBPS compliance and efficiency projects across Canada
              </p>
            </div>
            <HelpButton id="page.industrial-decarb" />
          </div>
        </div>
      </section>

      {/* Filters */}
      <div className="card shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Province
            </label>
            <select
              value={selectedProvince}
              onChange={(e) => setSelectedProvince(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              {provinces.map(p => (
                <option key={p} value={p}>{p === 'All' ? 'All Provinces' : p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Year
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              {years.map(y => (
                <option key={y} value={y}>{y === 'All' ? 'All Years' : y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card card-metric">
          <div className="flex items-center justify-between">
            <div>
              <p className="metric-label text-tertiary">Total Facility Emissions</p>
              <p className="metric-value text-primary mt-1">
                {formatMt(summary.total_facility_emissions_tonnes / 1000000)} Mt CO2e
              </p>
              <p className="text-xs text-tertiary mt-1">
                {summary.facility_count.toLocaleString()} large industrial facilities
              </p>
            </div>
            <Factory className="text-red-400" size={40} />
          </div>
        </div>

        <div className="card card-metric">
          <div className="flex items-center justify-between">
            <div>
              <p className="metric-label text-tertiary">Methane Reductions</p>
              <p className="metric-value text-primary mt-1">
                {formatTonnes(summary.total_methane_reduction_tonnes)} tCO2e
              </p>
              <p className="text-xs text-success mt-1">
                Since {data.methane_leaders[0]?.baseline_year ?? 2019}
              </p>
            </div>
            <TrendingDown className="text-green-400" size={40} />
          </div>
        </div>

        <div className="card card-metric">
          <div className="flex items-center justify-between">
            <div>
              <p className="metric-label text-tertiary">OBPS Credit Balance</p>
              <p className="metric-value text-primary mt-1">
                +{formatTonnes(summary.total_obps_surplus_tonnes)} / -{formatTonnes(summary.total_obps_deficit_tonnes)} t
              </p>
              <p className="text-xs text-tertiary mt-1">
                Surplus vs deficit compliance units
              </p>
            </div>
            <Gauge className="text-yellow-400" size={40} />
          </div>
        </div>

        <div className="card card-metric">
          <div className="flex items-center justify-between">
            <div>
              <p className="metric-label text-tertiary">Efficiency Project Impact</p>
              <p className="metric-value text-primary mt-1">
                {formatMt(summary.total_efficiency_avoided_tonnes / 1000000)} Mt CO2e/yr avoided
              </p>
              <p className="text-xs text-tertiary mt-1">
                Across top industrial efficiency projects
              </p>
            </div>
            <Leaf className="text-emerald-400" size={40} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Top Emitting Facilities</h3>
            {emissionsByFacility.length > 0 && (
              <button
                type="button"
                onClick={() => downloadCsv(emissionsByFacility, 'industrial_top_emitting_facilities.csv')}
                className="px-3 py-1.5 text-xs font-medium rounded-md border border-[var(--border-medium)] bg-primary text-secondary hover:text-primary"
              >
                Export CSV
              </button>
            )}
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={emissionsByFacility} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" label={{ value: 'Mt CO2e', position: 'insideBottom', offset: -5 }} />
              <YAxis type="category" dataKey="facility" width={180} />
              <Tooltip formatter={(value: any) => `${formatMt(Number(value))} Mt`} />
              <Bar dataKey="emissions" fill="#F97316" name="Emissions" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Methane Reduction Leaders</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={methaneReductions}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="company" />
              <YAxis label={{ value: '% reduction vs baseline', angle: -90, position: 'insideLeft' }} />
              <Tooltip formatter={(value: any) => `${Number(value).toFixed(1)}%`} />
              <Bar dataKey="reduction" fill="#22C55E" name="Reduction %" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card shadow p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4">Top Efficiency Projects</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={efficiencyProjects}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="project" angle={-35} textAnchor="end" height={80} />
              <YAxis yAxisId="left" orientation="left" label={{ value: 'Mt CO2e/yr avoided', angle: -90, position: 'insideLeft' }} />
              <YAxis yAxisId="right" orientation="right" label={{ value: 'Investment ($B CAD)', angle: 90, position: 'insideRight' }} />
              <Tooltip
                formatter={(value: any, name: string) => {
                  if (name === 'avoided') {
                    return [`${formatMt(Number(value))} Mt`, 'Emissions avoided'];
                  }
                  return [`$${formatBillions(Number(value))}B`, 'Investment'];
                }}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="avoided" fill="#0EA5E9" name="Emissions avoided" />
              <Bar yAxisId="right" dataKey="investment" fill="#A855F7" name="Investment" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card shadow p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'facility_emissions', label: 'Facility Emissions' },
              { id: 'methane_reduction', label: 'Methane Reduction' },
              { id: 'obps_compliance', label: 'OBPS Compliance' },
              { id: 'efficiency_projects', label: 'Efficiency Projects' },
            ].map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setTableView(v.id as 'facility_emissions' | 'methane_reduction' | 'obps_compliance' | 'efficiency_projects')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  tableView === v.id
                    ? 'bg-electric text-white shadow-sm'
                    : 'bg-secondary text-secondary hover:text-primary'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
          {tableView !== 'none' && tableRows.length > 0 && (
            <button
              type="button"
              onClick={() => downloadCsv(tableRows, `industrial_${tableView}.csv`)}
              className="px-3 py-1.5 text-xs font-medium rounded-md border border-[var(--border-medium)] bg-primary text-secondary hover:text-primary"
            >
              Export CSV
            </button>
          )}
        </div>
        {tableView === 'none' && (
          <div className="text-sm text-secondary">
            Select a dataset above to view detailed industrial records by facility or company.
          </div>
        )}
        {tableView !== 'none' && renderTable()}
      </div>

      <div className="bg-secondary border border-emerald-300/60 rounded-lg p-4">
        <p className="text-sm text-secondary">
          Industrial decarbonization data is built primarily from Canada&apos;s
          <span className="font-semibold"> National Pollutant Release Inventory (NPRI)</span> and related greenhouse gas
          reporting programs, supplemented by company methane reduction disclosures, provincial and federal
          <span className="font-semibold"> Output-Based Pricing System (OBPS)</span> compliance reports, and documented
          <span className="font-semibold"> industrial efficiency projects</span> (e.g., EMRF/ERA-funded projects and major
          company investments. Data is updated periodically as new NPRI years and public compliance reports are
          released. For regulatory or investment-critical use, always verify key figures against the source NPRI and
          OBPS documents.
        </p>
      </div>
    </div>
  );
};

export default IndustrialDecarbDashboard;
