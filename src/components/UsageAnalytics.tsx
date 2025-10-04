/**
 * Usage Analytics Component
 * Visualize and analyze household energy usage patterns
 */

import React, { useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { 
  TrendingUp, TrendingDown, Calendar, DollarSign, Zap, 
  Thermometer, Users, Activity, Target
} from 'lucide-react';
import type { HouseholdProfile, MonthlyUsage, HouseholdBenchmark } from '../lib/types/household';

interface UsageAnalyticsProps {
  profile: HouseholdProfile;
  usage: MonthlyUsage[];
  benchmark: HouseholdBenchmark | null;
}

const UsageAnalytics: React.FC<UsageAnalyticsProps> = ({ profile, usage, benchmark }) => {
  const [view, setView] = useState<'usage' | 'cost' | 'comparison'>('usage');
  const [timeRange, setTimeRange] = useState<'3m' | '6m' | '12m'>('6m');

  // Prepare chart data
  const chartData = usage
    .slice(0, timeRange === '3m' ? 3 : timeRange === '6m' ? 6 : 12)
    .reverse()
    .map(u => ({
      month: new Date(u.month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      usage: u.consumption_kwh,
      cost: u.cost_cad,
      avgTemp: u.weather?.avgTemp || null,
      benchmark: benchmark?.expectedUsage || null,
    }));

  // Calculate statistics
  const totalUsage = usage.reduce((sum, u) => sum + u.consumption_kwh, 0);
  const avgUsage = usage.length > 0 ? Math.round(totalUsage / usage.length) : 0;
  const totalCost = usage.reduce((sum, u) => sum + u.cost_cad, 0);
  const avgCost = usage.length > 0 ? Math.round(totalCost / usage.length * 100) / 100 : 0;

  const trend = usage.length >= 2
    ? ((usage[0].consumption_kwh - usage[1].consumption_kwh) / usage[1].consumption_kwh) * 100
    : 0;

  const comparisonToBenchmark = benchmark && avgUsage
    ? ((avgUsage - benchmark.expectedUsage) / benchmark.expectedUsage) * 100
    : 0;

  // Peak hours analysis
  const allPeakHours = usage.flatMap(u => u.peakUsageHours || []);
  const peakHourDistribution = Array.from({ length: 24 }, (_, hour) => ({
    hour: `${hour}:00`,
    count: allPeakHours.filter(h => h === hour).length,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Energy Usage Analytics
        </h2>
        
        {/* Controls */}
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setView('usage')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                view === 'usage'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              Usage (kWh)
            </button>
            <button
              onClick={() => setView('cost')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                view === 'cost'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              Cost ($)
            </button>
            <button
              onClick={() => setView('comparison')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                view === 'comparison'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              vs Benchmark
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setTimeRange('3m')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                timeRange === '3m'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              3 Months
            </button>
            <button
              onClick={() => setTimeRange('6m')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                timeRange === '6m'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              6 Months
            </button>
            <button
              onClick={() => setTimeRange('12m')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                timeRange === '12m'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              12 Months
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-5 h-5 text-yellow-600" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Monthly Usage</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{avgUsage} kWh</p>
          <div className="flex items-center gap-1 mt-2">
            {trend < 0 ? (
              <TrendingDown className="w-4 h-4 text-green-600" />
            ) : (
              <TrendingUp className="w-4 h-4 text-red-600" />
            )}
            <span className={`text-sm ${trend < 0 ? 'text-green-600' : 'text-red-600'}`}>
              {Math.abs(trend).toFixed(1)}% vs last month
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Monthly Cost</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">${avgCost}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            ${(avgCost / avgUsage * 100).toFixed(2)}/kWh avg rate
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">vs Benchmark</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {benchmark ? benchmark.expectedUsage : 'N/A'}
            {benchmark && ' kWh'}
          </p>
          {benchmark && (
            <div className="flex items-center gap-1 mt-2">
              {comparisonToBenchmark < 0 ? (
                <TrendingDown className="w-4 h-4 text-green-600" />
              ) : (
                <TrendingUp className="w-4 h-4 text-red-600" />
              )}
              <span className={`text-sm ${comparisonToBenchmark < 0 ? 'text-green-600' : 'text-red-600'}`}>
                {Math.abs(comparisonToBenchmark).toFixed(1)}% {comparisonToBenchmark < 0 ? 'below' : 'above'}
              </span>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Tracked</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{usage.length}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            {usage.length} months of data
          </p>
        </div>
      </div>

      {/* Main Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          {view === 'usage' && 'Monthly Usage Trend'}
          {view === 'cost' && 'Monthly Cost Trend'}
          {view === 'comparison' && 'Usage vs Benchmark'}
        </h3>

        {usage.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            {view === 'comparison' ? (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="usage" fill="#10b981" name="Your Usage (kWh)" />
                <Bar dataKey="benchmark" fill="#6b7280" name="Benchmark (kWh)" />
              </BarChart>
            ) : (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                {view === 'usage' && (
                  <>
                    <Line 
                      type="monotone" 
                      dataKey="usage" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      name="Usage (kWh)"
                      dot={{ r: 4 }}
                    />
                    {benchmark && (
                      <Line 
                        type="monotone" 
                        dataKey="benchmark" 
                        stroke="#6b7280" 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        name="Benchmark (kWh)"
                        dot={false}
                      />
                    )}
                  </>
                )}
                {view === 'cost' && (
                  <Line 
                    type="monotone" 
                    dataKey="cost" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="Cost ($)"
                    dot={{ r: 4 }}
                  />
                )}
              </LineChart>
            )}
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            No usage data available. Add your monthly usage to see analytics.
          </div>
        )}
      </div>

      {/* Additional Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Peak Hours */}
        {allPeakHours.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Peak Usage Hours
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={peakHourDistribution.filter(d => d.count > 0)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#f59e0b" name="Usage Events" />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
              Shows when you typically use the most electricity. Consider shifting usage to off-peak hours if you have time-of-use pricing.
            </p>
          </div>
        )}

        {/* Profile Summary */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            Your Energy Profile
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Province</span>
              <span className="font-medium text-gray-900 dark:text-white">{profile.province}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Home Type</span>
              <span className="font-medium text-gray-900 dark:text-white capitalize">{profile.homeType}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Size</span>
              <span className="font-medium text-gray-900 dark:text-white">{profile.squareFootage} sq ft</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Occupants</span>
              <span className="font-medium text-gray-900 dark:text-white">{profile.occupants}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Heating</span>
              <span className="font-medium text-gray-900 dark:text-white capitalize">{profile.heatingType}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Air Conditioning</span>
              <span className="font-medium text-gray-900 dark:text-white">{profile.hasAC ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Solar Panels</span>
              <span className="font-medium text-gray-900 dark:text-white">{profile.hasSolar ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Electric Vehicle</span>
              <span className="font-medium text-gray-900 dark:text-white">{profile.hasEV ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Insights */}
      {benchmark && (
        <div className="bg-gradient-to-br from-blue-50 to-green-50 dark:from-blue-900/10 dark:to-green-900/10 rounded-lg border border-blue-200 dark:border-blue-800 p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            Insights
          </h3>
          <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <p>
              • Your home uses an average of <strong>{avgUsage} kWh/month</strong>, which is{' '}
              <strong>{benchmark.comparisonText}</strong> for similar homes in {profile.province}.
            </p>
            <p>
              • You're in the <strong>{benchmark.percentile}th percentile</strong> compared to similar households.
            </p>
            {trend < -5 && (
              <p className="text-green-700 dark:text-green-300">
                • Great job! Your usage has decreased by {Math.abs(trend).toFixed(1)}% from last month. Keep it up!
              </p>
            )}
            {trend > 10 && (
              <p className="text-orange-700 dark:text-orange-300">
                • Your usage increased by {trend.toFixed(1)}% from last month. Check your recommendations for ways to reduce consumption.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UsageAnalytics;
