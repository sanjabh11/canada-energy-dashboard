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
import { Zap, MapPin, Car, Battery, TrendingUp, BarChart3 as BarChartIcon } from 'lucide-react';
import { fetchEdgeJson } from '../lib/edge';
import { HelpButton } from './HelpButton';

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

  useEffect(() => {
    fetchEVData();
  }, []);

  const fetchEVData = async () => {
    try {
      setLoading(true);
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
    return <div className="flex items-center justify-center h-64"><div className="text-lg text-secondary">Loading EV charging data...</div></div>;
  }

  if (error) {
    return <div className="premium-card p-4" style={{ borderLeft: '4px solid var(--color-critical)' }}><span className="text-danger">{error}</span></div>;
  }

  if (!data || !data.stations) {
    return <div className="premium-card p-4" style={{ borderLeft: '4px solid var(--color-solar)' }}><span className="text-warning">No EV charging data available</span></div>;
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
  const evMarketShare = latestAdoption?.ev_market_share_percent || 0;
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

  // EV adoption trends by province
  const adoptionTrendData = adoption
    .sort((a: AdoptionData, b: AdoptionData) =>
      new Date(a.tracking_period_end).getTime() - new Date(b.tracking_period_end).getTime())
    .map((a: AdoptionData) => ({
      date: new Date(a.tracking_period_end).toLocaleDateString('en-CA', { year: 'numeric', month: 'short' }),
      share: a.ev_market_share_percent,
      province: a.province_code,
    }));

  const COLORS = ['#00D9FF', '#168B6A', '#FFB627', '#FF4757']; // Electric, Forest, Solar, Critical - NO PURPLE

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="premium-card" style={{ background: 'linear-gradient(135deg, rgba(11, 79, 60, 0.95) 0%, rgba(22, 139, 106, 0.9) 50%, rgba(0, 217, 255, 0.85) 100%)' }}>
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-3">
            <Zap size={32} style={{ color: 'var(--color-electric)' }} />
            <h1 className="text-3xl font-bold text-primary">EV Charging Infrastructure</h1>
          </div>
          <HelpButton id="ev-infrastructure.overview" />
        </div>
        <p className="text-secondary">Electric vehicle charging network and adoption tracking - Federal mandate: 20% by 2026, 100% by 2035</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="premium-card p-4" style={{ borderLeft: '4px solid var(--color-electric)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-secondary">Total Stations</p>
              <p className="text-2xl font-bold text-primary">{totalStations.toLocaleString()}</p>
            </div>
            <MapPin className="text-electric" size={24} />
          </div>
        </div>

        <div className="premium-card p-4" style={{ borderLeft: '4px solid var(--color-forest)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-secondary">Total Capacity</p>
              <p className="text-2xl font-bold text-primary">{(totalCapacity / 1000).toFixed(1)} MW</p>
            </div>
            <Zap className="text-forest" size={24} />
          </div>
        </div>

        <div className="premium-card p-4" style={{ borderLeft: '4px solid var(--color-electric)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div>
                <p className="text-sm text-secondary">V2G-Capable Stations</p>
                <p className="text-2xl font-bold text-primary">{v2gCapableStations}</p>
              </div>
              <HelpButton id="ev-infrastructure.v2g" className="ml-1" />
            </div>
            <Battery className="text-electric" size={24} />
          </div>
        </div>

        <div className="premium-card p-4" style={{ borderLeft: '4px solid var(--color-solar)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div>
                <p className="text-sm text-secondary">EV Market Share vs 2026 Target</p>
                <p className="text-2xl font-bold text-primary">{evMarketShare.toFixed(1)}% / {targetShare}%</p>
              </div>
              <HelpButton id="ev-infrastructure.adoption" className="ml-1" />
            </div>
            <Car className="text-solar" size={24} />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="premium-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
              <BarChartIcon size={20} className="text-electric" />
              Stations by Network
            </h3>
            <HelpButton id="ev-infrastructure.networks" />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={networkData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 217, 255, 0.15)" />
              <XAxis dataKey="name" angle={-15} textAnchor="end" height={80} stroke="var(--text-secondary)" />
              <YAxis label={{ value: 'Stations', angle: -90, position: 'insideLeft' }} stroke="var(--text-secondary)" />
              <Tooltip contentStyle={{ backgroundColor: 'rgba(26, 58, 46, 0.95)', border: '1px solid rgba(0, 217, 255, 0.3)' }} />
              <Legend />
              <Bar dataKey="stations" fill="#00D9FF" name="Stations" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="premium-card p-6">
          <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-forest" />
            EV Adoption Trends
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={adoptionTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 217, 255, 0.15)" />
              <XAxis dataKey="date" stroke="var(--text-secondary)" />
              <YAxis label={{ value: 'Market Share (%)', angle: -90, position: 'insideLeft' }} stroke="var(--text-secondary)" />
              <Tooltip contentStyle={{ backgroundColor: 'rgba(26, 58, 46, 0.95)', border: '1px solid rgba(0, 217, 255, 0.3)' }} />
              <Legend />
              <Line type="monotone" dataKey="share" stroke="#168B6A" name="EV Market Share %" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charger Type Distribution */}
      <div className="premium-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
            <Battery size={20} className="text-electric" />
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
              fill="#00D9FF"
              dataKey="count"
            >
              {chargerTypeData.map((entry: any, index: number) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ backgroundColor: 'rgba(26, 58, 46, 0.95)', border: '1px solid rgba(0, 217, 255, 0.3)' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Stations Table */}
      <div className="premium-card p-6">
        <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
          <MapPin size={20} className="text-electric" />
          Charging Station Details
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y border-subtle" style={{ borderColor: 'rgba(0, 217, 255, 0.15)' }}>
            <thead style={{ backgroundColor: 'rgba(0, 217, 255, 0.05)' }}>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase">Station Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase">Network</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase">Location</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase">Charger Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase">Power (kW)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase">Chargers</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase">V2G</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase">Status</th>
              </tr>
            </thead>
            <tbody style={{ backgroundColor: 'transparent' }}>
              {stations.slice(0, 20).map((station: ChargingStation) => (
                <tr key={station.id} className="hover:bg-opacity-10" style={{ borderTop: '1px solid rgba(0, 217, 255, 0.1)' }}>
                  <td className="px-4 py-3 text-sm font-medium text-primary">{station.station_name}</td>
                  <td className="px-4 py-3 text-sm text-secondary">{station.network}</td>
                  <td className="px-4 py-3 text-sm text-secondary">{station.city}, {station.province_code}</td>
                  <td className="px-4 py-3 text-sm text-secondary">{station.charger_type}</td>
                  <td className="px-4 py-3 text-sm text-secondary">{station.max_power_kw}</td>
                  <td className="px-4 py-3 text-sm text-secondary">{station.charger_count}</td>
                  <td className="px-4 py-3">
                    {station.v2g_capable ? (
                      <span className="text-success font-medium">✓</span>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${
                      station.status === 'Operational' ? 'badge-success' :
                      station.status === 'Under Construction' ? 'badge-info' :
                      'badge-warning'
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
      <div className="text-sm text-secondary text-center">
        Data Source: {data.metadata?.source || 'NRCan, Tesla, Electrify Canada, FLO, ChargePoint'} | Last Updated: {new Date().toLocaleDateString()}
      </div>
    </div>
  );
};

export default EVChargingDashboard;
