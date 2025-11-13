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
    return <div className="flex items-center justify-center h-64"><div className="text-lg">Loading EV charging data...</div></div>;
  }

  if (error) {
    return <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>;
  }

  if (!data || !data.stations) {
    return <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">No EV charging data available</div>;
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

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-lg p-6">
        <div className="flex items-center gap-3 mb-2">
          <Zap size={32} />
          <h1 className="text-3xl font-bold">EV Charging Infrastructure</h1>
        </div>
        <p className="text-blue-100">Electric vehicle charging network and adoption tracking - Federal mandate: 20% by 2026, 100% by 2035</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Stations</p>
              <p className="text-2xl font-bold">{totalStations.toLocaleString()}</p>
            </div>
            <MapPin className="text-blue-500" size={24} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Capacity</p>
              <p className="text-2xl font-bold">{(totalCapacity / 1000).toFixed(1)} MW</p>
            </div>
            <Zap className="text-green-500" size={24} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">V2G-Capable Stations</p>
              <p className="text-2xl font-bold">{v2gCapableStations}</p>
            </div>
            <Battery className="text-purple-500" size={24} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">EV Market Share vs 2026 Target</p>
              <p className="text-2xl font-bold">{evMarketShare.toFixed(1)}% / {targetShare}%</p>
            </div>
            <Car className="text-orange-500" size={24} />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChartIcon size={20} />
            Stations by Network
          </h3>
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

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp size={20} />
            EV Adoption Trends
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
        </div>
      </div>

      {/* Charger Type Distribution */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Battery size={20} />
          Charger Type Distribution
        </h3>
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
      <div className="bg-white rounded-lg shadow p-6">
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
            <tbody className="bg-white divide-y divide-gray-200">
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
                      <span className="text-green-600 font-medium">✓</span>
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
