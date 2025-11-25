import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, DollarSign, Leaf, AlertCircle } from 'lucide-react';
import { getEdgeBaseUrl, getEdgeHeaders, isEdgeFetchEnabled } from '../lib/config';
import { HelpButton } from './HelpButton';

type View = 'overview' | 'green_bonds' | 'esg_ratings' | 'sustainability_loans' | 'carbon_exposure';

interface OverviewSummary {
  total_green_bonds_cad: number;
  avg_esg_score: string | null;
  total_sustainability_loans_cad: number;
  projected_2030_carbon_cost_millions: string;
}

interface OverviewData {
  summary: OverviewSummary;
  top_performers: any[];
  highest_carbon_exposure: any[];
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

const formatCurrencyBillions = (value: number | null | undefined) => {
  if (value == null || isNaN(Number(value))) return '—';
  return `$${(Number(value) / 1e9).toFixed(2)}B`;
};

const ESGFinanceDashboard: React.FC = () => {
  const [view, setView] = useState<View>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [edgeDisabled, setEdgeDisabled] = useState(false);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [rows, setRows] = useState<TableRow[]>([]);
  const [selectedSector, setSelectedSector] = useState<string>('All');

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, selectedSector]);

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
      params.set('type', view);
      if (selectedSector !== 'All' && (view === 'esg_ratings' || view === 'carbon_exposure')) {
        params.set('sector', selectedSector);
      }

      const url = `${base.replace(/\/$/, '')}/api-v2-esg-finance?${params.toString()}`;
      const response = await fetch(url, {
        headers: getEdgeHeaders(),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (view === 'overview') {
        setOverview(data as OverviewData);
        setRows([]);
      } else {
        const resultRows = (data && (data.rows as TableRow[])) || [];
        setRows(resultRows);
      }
    } catch (err) {
      console.error('Failed to fetch ESG finance data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-electric mx-auto mb-4"></div>
          <p className="text-secondary">Loading ESG finance data...</p>
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
            <h3 className="font-semibold text-yellow-900">ESG finance analytics are disabled</h3>
            <p className="text-sm text-warning mt-1">
              Supabase Edge fetches are disabled in this environment. Configure Supabase Edge and enable
              VITE_ENABLE_EDGE_FETCH to use the Sustainable Finance & ESG dashboard.
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

  const sectors = ['All', 'oil_gas', 'utility', 'renewable', 'mining'];

  const topPerformerData = (overview?.top_performers || []).map((item: any) => ({
    company: item.company,
    sector: item.sector,
    msci_score_numeric: Number(item.msci_score_numeric ?? 0),
  }));

  const carbonExposureData = (overview?.highest_carbon_exposure || []).map((item: any) => ({
    company: item.company,
    sector: item.sector,
    revenue_at_risk_percent: Number(item.revenue_at_risk_percent ?? 0),
    projected_2030_cost_millions: Number(item.projected_2030_cost_millions ?? 0),
  }));

  const renderTable = () => {
    if (!rows.length) {
      return (
        <div className="text-center text-secondary p-6">
          No records available for this view.
        </div>
      );
    }

    const columns = Object.keys(rows[0]);

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
            {rows.map((row, idx) => (
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
      <section className="hero-section">
        <div className="hero-content">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(16, 185, 129, 0.12)' }}
                >
                  <DollarSign className="h-6 w-6 text-electric" />
                </div>
                <h1 className="hero-title">Sustainable Finance & ESG Dashboard</h1>
              </div>
              <p className="hero-subtitle">
                Green bonds, ESG scores, sustainability-linked loans, and carbon pricing exposure for Canadian energy
                companies.
              </p>
            </div>
            <HelpButton id="page.esg-finance" />
          </div>
        </div>
      </section>

      <div className="card shadow p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {(['overview', 'green_bonds', 'esg_ratings', 'sustainability_loans', 'carbon_exposure'] as View[]).map(
            (v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  view === v
                    ? 'bg-electric text-white shadow-sm'
                    : 'bg-secondary text-secondary hover:text-primary'
                }`}
              >
                {v.replace('_', ' ').toUpperCase()}
              </button>
            ),
          )}
        </div>

        {(view === 'esg_ratings' || view === 'carbon_exposure') && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-secondary">Sector</span>
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="px-3 py-1 border border-[var(--border-medium)] rounded-md bg-primary text-sm"
            >
              {sectors.map((s) => (
                <option key={s} value={s}>
                  {s === 'All' ? 'All Sectors' : s}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {view === 'overview' && overview && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card card-metric">
              <div className="flex items-center justify-between">
                <div>
                  <p className="metric-label">Total Green Bonds</p>
                  <p className="metric-value text-success mt-1">
                    {formatCurrencyBillions(overview.summary.total_green_bonds_cad)}
                  </p>
                  <p className="text-xs text-tertiary mt-1">Issued by Canadian energy sector</p>
                </div>
                <Leaf className="h-10 w-10 text-success" />
              </div>
            </div>

            <div className="card card-metric">
              <div className="flex items-center justify-between">
                <div>
                  <p className="metric-label">Average ESG Score</p>
                  <p className="metric-value text-primary mt-1">
                    {overview.summary.avg_esg_score ? `${overview.summary.avg_esg_score}/10` : 'N/A'}
                  </p>
                  <p className="text-xs text-tertiary mt-1">Across tracked companies</p>
                </div>
                <TrendingUp className="h-10 w-10 text-electric" />
              </div>
            </div>

            <div className="card card-metric">
              <div className="flex items-center justify-between">
                <div>
                  <p className="metric-label">Sustainability-Linked Loans</p>
                  <p className="metric-value text-purple-600 mt-1">
                    {formatCurrencyBillions(overview.summary.total_sustainability_loans_cad)}
                  </p>
                  <p className="text-xs text-tertiary mt-1">Tied to ESG performance</p>
                </div>
                <DollarSign className="h-10 w-10 text-purple-500" />
              </div>
            </div>

            <div className="card card-metric">
              <div className="flex items-center justify-between">
                <div>
                  <p className="metric-label">2030 Carbon Cost</p>
                  <p className="metric-value text-danger mt-1">
                    ${overview.summary.projected_2030_carbon_cost_millions}M
                  </p>
                  <p className="text-xs text-tertiary mt-1">Projected at $170/tCO₂e</p>
                </div>
                <AlertCircle className="h-10 w-10 text-danger" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Top ESG Performers (MSCI 0–10)</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topPerformerData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="company" angle={-45} textAnchor="end" height={80} />
                  <YAxis label={{ value: 'Score', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="msci_score_numeric" fill="#10B981" name="MSCI Score" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Highest Carbon Pricing Exposure</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={carbonExposureData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="company" angle={-45} textAnchor="end" height={80} />
                  <YAxis
                    yAxisId="left"
                    label={{ value: '% Revenue at Risk', angle: -90, position: 'insideLeft' }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    label={{ value: '2030 Cost (M CAD)', angle: 90, position: 'insideRight' }}
                  />
                  <Tooltip />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="revenue_at_risk_percent"
                    stroke="#ef4444"
                    name="Revenue at Risk (%)"
                    strokeWidth={2}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="projected_2030_cost_millions"
                    stroke="#3b82f6"
                    name="2030 Carbon Cost (M)"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {view !== 'overview' && (
        <div className="card shadow p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {view === 'green_bonds' && 'Green Bond Issuances'}
              {view === 'esg_ratings' && 'ESG Ratings by Company'}
              {view === 'sustainability_loans' && 'Sustainability-Linked Loans'}
              {view === 'carbon_exposure' && 'Carbon Pricing Exposure by Company'}
            </h2>
            {rows.length > 0 && (
              <button
                type="button"
                onClick={() => downloadCsv(rows, `esg_${view}.csv`)}
                className="px-3 py-1.5 text-xs font-medium rounded-md border border-[var(--border-medium)] bg-primary text-secondary hover:text-primary"
              >
                Export CSV
              </button>
            )}
          </div>
          {renderTable()}
        </div>
      )}

      <div className="bg-secondary border border-emerald-300/60 rounded-lg p-4">
        <p className="text-sm text-secondary">
          ESG finance data combines <span className="font-semibold">Yahoo Finance ESG scores</span> (refreshed weekly via
          automated import), issuer and bank disclosures for <span className="font-semibold">green bonds</span> and
          <span className="font-semibold"> sustainability-linked loans</span>, and modeled
          <span className="font-semibold"> carbon pricing exposure</span> based on reported emissions and Canada&apos;s carbon
          price schedule. Always cross-check critical numbers against underlying company filings and regulatory sources
          before using them in investment decisions or formal reports.
        </p>
      </div>
    </div>
  );
};

export default ESGFinanceDashboard;
