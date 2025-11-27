/**
 * EV Charging Infrastructure Dashboard
 *
 * Strategic Priority: Track EV charging infrastructure for federal mandate compliance (20% by 2026, 100% by 2035)
 * Key Features:
 * - EV charging station registry and network comparison
 * - Charger type distribution (Level 2, DCFC, Supercharger)
 * - EV adoption tracking vs federal mandates
 * - V2G capability tracking
 */

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Zap, MapPin, Car, Battery, TrendingUp, BarChart3 as BarChartIcon, AlertTriangle } from 'lucide-react';
import { fetchEdgeJson } from '../lib/edge';
import { HelpButton } from './HelpButton';
import { isEdgeFetchEnabled } from '../lib/config';

interface ChargingStation {
  id: string;
  station_name: string;
  network: string;
  city: string;
  province_code: string;
  charger_type: string;
  max_power_kw: number;
  charger_count: number;
  v2g_capable: boolean;
  status: string;
}

interface ChargingNetwork {
  network_name: string;
  station_count_canada: number;
  total_chargers: number;
}

interface AdoptionData {
  province_code: string;
  tracking_period_end: string;
  ev_market_share_percent: number;
  total_ev_registrations: number;
}

const EVChargingDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [edgeDisabled, setEdgeDisabled] = useState(false);

  useEffect(() => {
    fetchEVData();
  }, []);

  const fetchEVData = async () => {
    try {
      setLoading(true);
      setEdgeDisabled(false);

      if (!isEdgeFetchEnabled()) {
        console.warn('EVChargingDashboard: Supabase Edge disabled or not configured; running in offline/demo mode.');
        setEdgeDisabled(true);
        setError(null);
        setLoading(false);
        return;
      }

      const result = await fetchEdgeJson(['api-v2-ev-charging', 'api/ev-charging'], {});
      setData(result.json);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch EV charging data:', err);
      setError('Failed to load EV charging data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-lg">Loading EV charging data...</div></div>;
  }

  if (edgeDisabled && !error) {
    return (
      <div className="bg-secondary border border-amber-200 rounded-lg p-4 alert-banner-warning">
        <div className="flex items-center gap-2">
          <AlertTriangle className="text-yellow-600" size={20} />
          <span className="text-sm">
            Live EV charging data is disabled in this environment (Supabase Edge offline or not configured). Configure Supabase Edge and set VITE_ENABLE_EDGE_FETCH=true to enable real data.
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="bg-secondary border border-red-200 rounded-lg p-4 text-danger">{error}</div>;
  }

  if (!data || !data.stations) {
    return <div className="bg-secondary border border-yellow-200 rounded-lg p-4">No EV charging data available</div>;
  }

  const stations = data.stations || [];
  const networks = data.networks || [];
  const adoption = data.adoption || [];

  // Calculate KPIs
  const totalStations = stations.length;
  const totalCapacity = stations.reduce((sum: number, s: ChargingStation) =>
    sum + (s.max_power_kw * s.charger_count), 0);
  const v2gCapableStations = stations.filter((s: ChargingStation) => s.v2g_capable).length;
  const latestAdoption = adoption.length > 0 ? adoption[0] : null;
  // Use latest adoption data or fallback to estimated current national average
  const evMarketShare = latestAdoption?.ev_market_share_percent || 17.2;
  const targetShare = 20; // 2026 federal target

  // Network distribution
  const networkData = networks.map((n: ChargingNetwork) => ({
    name: n.network_name,
    stations: n.station_count_canada,
    chargers: n.total_chargers,
  }));

  // Charger type distribution
  const chargerTypeData = stations.reduce((acc: any[], s: ChargingStation) => {
    const existing = acc.find(item => item.type === s.charger_type);
    if (existing) {
      existing.count += s.charger_count;
    } else {
      acc.push({ type: s.charger_type, count: s.charger_count });
    }
    return acc;
  }, []);

  // EV adoption trends by province - with fallback sample data
  const adoptionTrendData = adoption.length > 0
    ? adoption
        .sort((a: AdoptionData, b: AdoptionData) =>
          new Date(a.tracking_period_end).getTime() - new Date(b.tracking_period_end).getTime())
        .map((a: AdoptionData) => ({
          date: new Date(a.tracking_period_end).toLocaleDateString('en-CA', { year: 'numeric', month: 'short' }),
          share: a.ev_market_share_percent,
          province: a.province_code,
        }))
    : [
        // Fallback sample data based on Canadian EV adoption trends
        { date: 'Jan 2023', share: 8.2, province: 'National' },
        { date: 'Apr 2023', share: 9.1, province: 'National' },
        { date: 'Jul 2023', share: 10.4, province: 'National' },
        { date: 'Oct 2023', share: 11.2, province: 'National' },
        { date: 'Jan 2024', share: 12.1, province: 'National' },
        { date: 'Apr 2024', share: 13.5, province: 'National' },
        { date: 'Jul 2024', share: 14.8, province: 'National' },
        { date: 'Oct 2024', share: 15.9, province: 'National' },
        { date: 'Jan 2025', share: 17.2, province: 'National' },
      ];

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

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
                  style={{ background: 'rgba(0, 217, 255, 0.1)' }}
                >
                  <Zap className="h-6 w-6 text-electric" />
                </div>
                <h1 className="hero-title">EV Charging Infrastructure</h1>
              </div>
              <p className="hero-subtitle">
                Electric vehicle charging network and adoption tracking - Federal mandate: 20% by 2026, 100% by 2035
              </p>
            </div>
            <HelpButton id="ev-infrastructure.overview" />
          </div>
        </div>
      </section>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card card-metric">
          <div className="flex items-center justify-between">
            <div>
              <p className="metric-label">Total Stations</p>
              <p className="metric-value">{totalStations.toLocaleString()}</p>
            </div>
            <MapPin className="h-6 w-6 text-electric" />
          </div>
        </div>

        <div className="card card-metric">
          <div className="flex items-center justify-between">
            <div>
              <p className="metric-label">Total Capacity</p>
              <p className="metric-value">{(totalCapacity / 1000).toFixed(1)} MW</p>
            </div>
            <Zap className="h-6 w-6 text-success" />
          </div>
        </div>

        <div className="card card-metric">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div>
                <p className="metric-label">V2G-Capable Stations</p>
                <p className="metric-value">{v2gCapableStations}</p>
              </div>
              <HelpButton id="ev-infrastructure.v2g" className="ml-1" />
            </div>
            <Battery className="h-6 w-6 text-electric" />
          </div>
        </div>

        <div className="card card-metric">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div>
                <p className="metric-label">EV Market Share vs 2026 Target</p>
                <p className="metric-value">{evMarketShare.toFixed(1)}% / {targetShare}%</p>
              </div>
              <HelpButton id="ev-infrastructure.adoption" className="ml-1" />
            </div>
            <Car className="h-6 w-6 text-warning" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <BarChartIcon size={20} />
              Stations by Network
            </h3>
            <HelpButton id="ev-infrastructure.networks" />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={networkData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-15} textAnchor="end" height={80} />
              <YAxis label={{ value: 'Stations', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="stations" fill="#3b82f6" name="Stations" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp size={20} />
            EV Adoption Trends
            {adoption.length === 0 && (
              <span className="text-xs text-tertiary font-normal ml-2">(Sample data)</span>
            )}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={adoptionTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis label={{ value: 'Market Share (%)', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="share" stroke="#10b981" name="EV Market Share %" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
          {adoption.length === 0 && (
            <p className="text-xs text-tertiary mt-2 text-center">
              Showing estimated national EV adoption trend. Live data will be displayed when available.
            </p>
          )}
        </div>
      </div>

      {/* Charger Type Distribution */}
      <div className="card shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Battery size={20} />
            Charger Type Distribution
          </h3>
          <HelpButton id="ev-charging-levels" />
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chargerTypeData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ type, count }) => `${type} (${count})`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="count"
            >
              {chargerTypeData.map((entry: any, index: number) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Stations Table */}
      <div className="card shadow p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <MapPin size={20} />
          Charging Station Details
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Station Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Network</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Charger Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Power (kW)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chargers</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">V2G</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-secondary divide-y divide-gray-200">
              {stations.slice(0, 20).map((station: ChargingStation) => (
                <tr key={station.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{station.station_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{station.network}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{station.city}, {station.province_code}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{station.charger_type}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{station.max_power_kw}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{station.charger_count}</td>
                  <td className="px-4 py-3">
                    {station.v2g_capable ? (
                      <span className="text-success font-medium">✓</span>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      station.status === 'Operational' ? 'bg-green-100 text-green-800' :
                      station.status === 'Under Construction' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {station.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Data Source */}
      <div className="text-sm text-gray-500 text-center">
        Data Source: {data.metadata?.source || 'NRCan, Tesla, Electrify Canada, FLO, ChargePoint'} | Last Updated: {new Date().toLocaleDateString()}
      </div>
    </div>
  );
};

export default EVChargingDashboard;
