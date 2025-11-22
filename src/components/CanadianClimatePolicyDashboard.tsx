/**
 * Canadian Climate Policy Dashboard
 * 
 * Comprehensive tracking of federal climate policy compliance including:
 * - Federal Carbon Pricing System
 * - Clean Fuel Regulations
 * - Net Zero Emissions Accountability Act
 * - Provincial climate policy alignment
 */

import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  Leaf, TrendingDown, Target, DollarSign, Fuel,
  CheckCircle, AlertTriangle, Calendar, FileText,
  Globe, Factory, Zap, Download, Filter
} from 'lucide-react';
import { HelpButton } from './HelpButton';
import { CERComplianceDashboard } from './CERComplianceDashboard';
import { fetchEdgeWithParams } from '../lib/edge';

interface ClimatePolicy {
  id: string;
  policy_name: string;
  jurisdiction: string;
  instrument_type: string;
  sector: string;
  status: string;
  date_effective?: string;
  description: string;
  source: string;
  source_url: string;
  last_updated: string;
}

interface ClimatePolicyStatistics {
  total_policies: number;
  by_jurisdiction: Record<string, number>;
  by_instrument: Record<string, number>;
  by_sector: Record<string, number>;
  by_status: Record<string, number>;
  active_policies: number;
  federal_policies: number;
}

interface ClimatePolicyMetadata {
  sources: string[];
  license: string;
  last_updated: string;
  policy_count: number;
  data_urls: string[];
  provenance: string;
  update_frequency: string;
}

interface ClimatePolicyApiResponse {
  policies: ClimatePolicy[];
  statistics: ClimatePolicyStatistics;
  metadata: ClimatePolicyMetadata;
}

interface ClimateMetrics {
  policyCount: number;
  activePolicyShare: number;
  federalPolicyShare: number;
  electricityPolicyCount: number;
  transportPolicyCount: number;
}

interface PolicyTimelinePoint {
  year: number;
  total_policies: number;
  active_policies: number;
}

export const CanadianClimatePolicyDashboard: React.FC = () => {
  const [policies, setPolicies] = useState<ClimatePolicy[]>([]);
  const [stats, setStats] = useState<ClimatePolicyStatistics | null>(null);
  const [metadata, setMetadata] = useState<ClimatePolicyMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'overview' | 'carbon_pricing' | 'clean_fuel' | 'net_zero' | 'cer_compliance'>('overview');
  const [selectedProvince, setSelectedProvince] = useState<string>('');

  useEffect(() => {
    loadClimateData();
  }, []);

  const loadClimateData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (selectedProvince) {
        params.jurisdiction = selectedProvince;
      }

      const response = await fetchEdgeWithParams(
        ['api-v2-climate-policy'],
        params
      );

      const apiData = await response.json() as ClimatePolicyApiResponse;
      console.log('[CLIMATE] Loaded from API:', apiData);

      setPolicies(apiData.policies || []);
      setStats(apiData.statistics || null);
      setMetadata(apiData.metadata || null);
    } catch (err) {
      console.error('Error loading climate policy data:', err);
      setError(err instanceof Error ? err.message : String(err));
      setPolicies([]);
      setStats(null);
      setMetadata(null);
    } finally {
      setLoading(false);
    }
  };

  // Calculate metrics
  const metrics: ClimateMetrics = useMemo(() => {
    if (!stats) {
      return {
        policyCount: 0,
        activePolicyShare: 0,
        federalPolicyShare: 0,
        electricityPolicyCount: 0,
        transportPolicyCount: 0
      };
    }

    const total = stats.total_policies || 0;
    const active = stats.active_policies || 0;
    const federal = stats.federal_policies || 0;
    const electricityPolicies = stats.by_sector?.['Electricity'] ?? 0;
    const transportPolicies = stats.by_sector?.['Transportation'] ?? 0;

    return {
      policyCount: total,
      activePolicyShare: total ? (active / total) * 100 : 0,
      federalPolicyShare: total ? (federal / total) * 100 : 0,
      electricityPolicyCount: electricityPolicies,
      transportPolicyCount: transportPolicies
    };
  }, [stats]);

  // Generate policy timeline data
  const policyTimeline: PolicyTimelinePoint[] = useMemo(() => {
    if (!policies.length) return [];

    const byYear = new Map<number, { total: number; active: number }>();

    for (const policy of policies) {
      const dateStr = policy.date_effective || policy.last_updated;
      if (!dateStr) continue;
      const year = new Date(dateStr).getFullYear();
      if (!Number.isFinite(year)) continue;

      const current = byYear.get(year) || { total: 0, active: 0 };
      current.total += 1;
      if (policy.status && policy.status.toLowerCase() === 'active') {
        current.active += 1;
      }
      byYear.set(year, current);
    }

    return Array.from(byYear.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([year, counts]) => ({
        year,
        total_policies: counts.total,
        active_policies: counts.active
      }));
  }, [policies]);

  const instrumentMix = useMemo(() => {
    if (!stats?.by_instrument) return [];
    return Object.entries(stats.by_instrument).map(([instrument, count]) => ({
      instrument,
      count
    }));
  }, [stats]);

  const jurisdictionSummary = useMemo(() => {
    if (!stats?.by_jurisdiction) return [];
    return Object.entries(stats.by_jurisdiction).map(([jurisdiction, count]) => ({
      jurisdiction,
      count
    }));
  }, [stats]);

  const carbonPricingPolicies = useMemo(() => {
    if (!policies.length) return [];
    const keywords = ['carbon', 'price', 'ets'];
    return policies.filter(policy => {
      const type = policy.instrument_type?.toLowerCase() || '';
      return keywords.some(kw => type.includes(kw));
    });
  }, [policies]);

  const netZeroPoliciesBySector = useMemo(() => {
    if (!policies.length) return [];

    const keywords = ['net zero', 'net-zero', 'netzero', '2030', '2050'];
    const bySector = new Map<string, ClimatePolicy[]>();

    for (const policy of policies) {
      const text = `${policy.policy_name} ${policy.description}`.toLowerCase();
      if (!keywords.some(kw => text.includes(kw))) continue;
      const sector = policy.sector || 'Other';
      const list = bySector.get(sector) || [];
      list.push(policy);
      bySector.set(sector, list);
    }

    return Array.from(bySector.entries()).map(([sector, sectorPolicies]) => ({
      sector,
      policies: sectorPolicies
    }));
  }, [policies]);

  if (loading && !policies.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-success"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-900 via-emerald-800 to-teal-900 rounded-lg shadow-xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Leaf className="text-green-300" size={32} />
            <div>
              <h1 className="text-2xl font-bold">Canadian Climate Policy Dashboard</h1>
              <p className="text-green-200">Federal Carbon Pricing • Clean Fuel Regulations • Net Zero Accountability Act</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <HelpButton id="climate.policy.overview" />
            <div className="flex bg-white/10 rounded-lg p-1">
              {['overview', 'carbon_pricing', 'clean_fuel', 'net_zero', 'cer_compliance'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode as any)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    viewMode === mode
                      ? 'bg-white text-success shadow-sm'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  {mode.replace('_', ' ').charAt(0).toUpperCase() + mode.replace('_', ' ').slice(1)}
                </button>
              ))}
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-white text-success rounded-lg hover:bg-secondary transition-colors">
              <Download size={16} />
              Climate Report
            </button>
          </div>
          </div>

          {error && (
            <div className="mt-4 text-sm text-red-200">
              <p>Climate policy data could not be fully loaded. Showing partial or empty results.</p>
            </div>
          )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white/10 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown size={16} className="text-green-300" />
              <span className="text-sm font-medium">Total Policies</span>
            </div>
            <div className="text-lg font-bold">{metrics.policyCount}</div>
          </div>
          
          <div className="bg-white/10 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign size={16} className="text-yellow-300" />
              <span className="text-sm font-medium">Active Policies</span>
            </div>
            <div className="text-lg font-bold">{metrics.activePolicyShare.toFixed(0)}%</div>
          </div>
          
          <div className="bg-white/10 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Fuel size={16} className="text-blue-300" />
              <span className="text-sm font-medium">Federal Share</span>
            </div>
            <div className="text-lg font-bold">{metrics.federalPolicyShare.toFixed(0)}%</div>
          </div>
          
          <div className="bg-white/10 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Target size={16} className="text-purple-300" />
              <span className="text-sm font-medium">Electricity Policies</span>
            </div>
            <div className="text-lg font-bold">{metrics.electricityPolicyCount}</div>
          </div>
          
          <div className="bg-white/10 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle size={16} className="text-emerald-300" />
              <span className="text-sm font-medium">Transport Policies</span>
            </div>
            <div className="text-lg font-bold">{metrics.transportPolicyCount}</div>
          </div>
        </div>
      </div>

      {/* Content based on view mode */}
      {viewMode === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* National Emissions Trend */}
          <div className="card shadow p-6">
            <h3 className="text-lg font-semibold text-primary mb-4">Climate Policy Rollout Over Time</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={policyTimeline}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="total_policies" stroke="#10B981" strokeWidth={2} name="Total Policies" />
                <Line type="monotone" dataKey="active_policies" stroke="#3B82F6" strokeWidth={2} name="Active Policies" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Carbon Price Evolution */}
          <div className="card shadow p-6">
            <h3 className="text-lg font-semibold text-primary mb-4">Climate Policy Instrument Mix</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={instrumentMix}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="instrument" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} name="Number of Policies" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {viewMode === 'carbon_pricing' && (
        <div className="space-y-6">
          <div className="card shadow p-6">
            <h3 className="text-lg font-semibold text-primary mb-4">Carbon Pricing Policy Landscape</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Provincial Systems Breakdown */}
              <div>
                <h4 className="font-medium text-primary mb-3">Policies by Jurisdiction</h4>
                <div className="space-y-3">
                  {jurisdictionSummary.map(({ jurisdiction, count }) => (
                    <div key={jurisdiction || 'unknown'} className="border border-[var(--border-subtle)] rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{jurisdiction || 'Unspecified'}</span>
                        <span className="text-sm text-secondary">{count} policies</span>
                      </div>
                      <div className="text-sm text-secondary">
                        <p>Share of total policies: {metrics.policyCount ? ((count / metrics.policyCount) * 100).toFixed(1) : '0.0'}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Compliance Instruments */}
              <div>
                <h4 className="font-medium text-primary mb-3">Policy Instrument Mix</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={instrumentMix}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="instrument" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3B82F6" name="Number of Policies" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Facility Details */}
          <div className="card shadow p-6">
            <h4 className="font-medium text-primary mb-3">Carbon Pricing Related Policies</h4>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)]">
                    <th className="text-left py-3 px-4 font-medium text-primary">Policy</th>
                    <th className="text-left py-3 px-4 font-medium text-primary">Jurisdiction</th>
                    <th className="text-left py-3 px-4 font-medium text-primary">Sector</th>
                    <th className="text-left py-3 px-4 font-medium text-primary">Instrument</th>
                    <th className="text-left py-3 px-4 font-medium text-primary">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {carbonPricingPolicies.map((policy) => (
                    <tr key={policy.id} className="border-b border-slate-100 hover:bg-secondary">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{policy.policy_name}</p>
                          <p className="text-sm text-secondary truncate max-w-xs">{policy.description}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">{policy.jurisdiction}</td>
                      <td className="py-3 px-4">{policy.sector}</td>
                      <td className="py-3 px-4">{policy.instrument_type}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                          policy.status?.toLowerCase() === 'active'
                            ? 'bg-green-100 text-green-800'
                            : policy.status?.toLowerCase() === 'planned'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                        }`}>
                          {policy.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'net_zero' && (
        <div className="space-y-6">
          <div className="card shadow p-6">
            <h3 className="text-lg font-semibold text-primary mb-4">Net Zero & Long-Term Target Policies</h3>

            <div className="space-y-6">
              {netZeroPoliciesBySector.map((group) => (
                <div key={group.sector} className="border border-[var(--border-subtle)] rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-medium text-primary">{group.sector}</h4>
                      <p className="text-sm text-secondary">{group.policies.length} net zero / long-term target policies</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {group.policies.map((policy) => (
                      <div key={policy.id} className="p-3 bg-secondary rounded flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium text-primary">{policy.policy_name}</p>
                          <p className="text-xs text-secondary mb-1">{policy.jurisdiction} • {policy.instrument_type}</p>
                          <p className="text-sm text-secondary line-clamp-2">{policy.description}</p>
                        </div>
                        <div className="text-right text-sm text-secondary min-w-[120px]">
                          <p>Status: <span className="font-medium">{policy.status}</span></p>
                          {policy.date_effective && (
                            <p>Effective: {new Date(policy.date_effective).toLocaleDateString()}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {viewMode === 'cer_compliance' && (
        <div className="space-y-6">
          <CERComplianceDashboard />
        </div>
      )}
    </div>
  );
};

export default CanadianClimatePolicyDashboard;
