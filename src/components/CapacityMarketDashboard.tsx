/**
 * Capacity Market Dashboard
 *
 * Strategic Priority: Track IESO capacity auction results for grid reliability pricing
 * Key Features:
 * - IESO capacity auction results (2022-2025)
 * - Clearing price trends and analysis
 * - Resource mix breakdown (gas, hydro, storage, nuclear)
 * - Auction-to-auction comparisons
 */

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DollarSign, TrendingUp, BarChart3, Calendar, Activity } from 'lucide-react';
import { fetchEdgeJson } from '../lib/edge';

interface Auction {
  id: string;
  auction_year: number;
  auction_period: string;
  auction_date: string;
  clearing_price_cad_per_mw_day: number;
  cleared_capacity_mw: number;
  target_capacity_mw: number;
  auction_status: string;
}

interface ResourceMix {
  resource_type: string;
  capacity_mw: number;
  percentage: number;
}

const CapacityMarketDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCapacityData();
  }, []);

  const fetchCapacityData = async () => {
    try {
      setLoading(true);
      const result = await fetchEdgeJson(['api-v2-capacity-market', 'api/capacity-market'], {});
      setData(result.json);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch capacity market data:', err);
      setError('Failed to load capacity market data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-lg">Loading capacity market data...</div></div>;
  }

  if (error) {
    return <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>;
  }

  if (!data || !data.auctions) {
    return <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">No capacity market data available</div>;
  }

  const auctions = data.auctions || [];
  const priceHistory = data.price_history || [];
  const resourceMix = data.resource_mix || [];

  // Calculate KPIs
  const latestAuction = auctions.length > 0 ? auctions[0] : null;
  const previousAuction = auctions.length > 1 ? auctions[1] : null;
  const priceChange = latestAuction && previousAuction
    ? ((latestAuction.clearing_price_cad_per_mw_day - previousAuction.clearing_price_cad_per_mw_day) / previousAuction.clearing_price_cad_per_mw_day) * 100
    : 0;
  const totalAuctionValue = latestAuction
    ? (latestAuction.clearing_price_cad_per_mw_day * latestAuction.cleared_capacity_mw * 365) / 1000000
    : 0;

  // Price trend data
  const priceTrendData = priceHistory.map((p: any) => ({
    year: p.delivery_year,
    period: p.delivery_period,
    price: p.clearing_price_cad_per_mw_day,
    capacity: p.cleared_capacity_mw,
  }));

  // Resource mix for pie chart
  const resourceMixData = resourceMix.map((r: ResourceMix) => ({
    name: r.resource_type,
    value: r.capacity_mw,
    percentage: r.percentage,
  }));

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg p-6">
        <div className="flex items-center gap-3 mb-2">
          <BarChart3 size={32} />
          <h1 className="text-3xl font-bold">Capacity Market Analytics</h1>
        </div>
        <p className="text-purple-100">IESO capacity auction results - Grid reliability pricing and resource adequacy tracking</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Latest Clearing Price</p>
              <p className="text-2xl font-bold">${latestAuction?.clearing_price_cad_per_mw_day.toFixed(2)}/MW-day</p>
            </div>
            <DollarSign className="text-blue-500" size={24} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Capacity Cleared</p>
              <p className="text-2xl font-bold">{latestAuction?.cleared_capacity_mw.toLocaleString()} MW</p>
            </div>
            <Activity className="text-green-500" size={24} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Price Change vs Previous</p>
              <p className={`text-2xl font-bold ${priceChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(1)}%
              </p>
            </div>
            <TrendingUp className={priceChange >= 0 ? 'text-red-500' : 'text-green-500'} size={24} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Auction Value</p>
              <p className="text-2xl font-bold">${totalAuctionValue.toFixed(0)}M</p>
            </div>
            <DollarSign className="text-orange-500" size={24} />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp size={20} />
            Clearing Price Trends
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={priceTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis label={{ value: '$/MW-day', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="price" stroke="#3b82f6" name="Clearing Price" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart3 size={20} />
            Resource Mix Breakdown
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={resourceMixData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name} (${percentage?.toFixed(1)}%)`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {resourceMixData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cleared Capacity Bar Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Activity size={20} />
          Cleared Capacity by Resource Type
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={resourceMixData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis label={{ value: 'Capacity (MW)', angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" fill="#3b82f6" name="Capacity (MW)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Auction History Table */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calendar size={20} />
          Auction History
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Auction Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clearing Price</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cleared Capacity</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Target Capacity</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {auctions.map((auction: Auction) => (
                <tr key={auction.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{auction.auction_year}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{auction.auction_period}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(auction.auction_date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    ${auction.clearing_price_cad_per_mw_day.toFixed(2)}/MW-day
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{auction.cleared_capacity_mw} MW</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{auction.target_capacity_mw} MW</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      auction.auction_status === 'Completed' ? 'bg-green-100 text-green-800' :
                      auction.auction_status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {auction.auction_status}
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
        Data Source: {data.metadata?.source || 'IESO Capacity Auction Results'} | Last Updated: {new Date().toLocaleDateString()}
      </div>
    </div>
  );
};

export default CapacityMarketDashboard;
