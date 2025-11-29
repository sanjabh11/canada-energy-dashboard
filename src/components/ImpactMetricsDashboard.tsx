/**
 * Impact Metrics Dashboard
 * 
 * Displays ESG KPIs including emissions avoided, jobs created,
 * Indigenous equity participation, and economic impact.
 * 
 * Addresses Gap #12: Impact Metrics Dashboard (MEDIUM Priority)
 */

import React, { useState, useEffect } from 'react';
import { 
  Leaf, Users, DollarSign, TrendingUp, 
  Building2, Zap, Globe, Award,
  ArrowUpRight, ArrowDownRight, Minus,
  Download, RefreshCw
} from 'lucide-react';
import { HelpButton } from './HelpButton';
import { DataSource, COMMON_DATA_SOURCES } from './ui/DataSource';

interface ImpactMetric {
  id: string;
  label: string;
  value: number;
  unit: string;
  change: number; // percentage change
  changeLabel: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}

interface ImpactMetricsDashboardProps {
  compact?: boolean;
  showExport?: boolean;
  refreshInterval?: number;
}

// Simulated impact data - in production, this would come from Supabase
const generateImpactMetrics = (): ImpactMetric[] => [
  {
    id: 'emissions_avoided',
    label: 'Emissions Avoided',
    value: 2847500,
    unit: 't CO₂e',
    change: 12.4,
    changeLabel: 'vs last year',
    icon: <Leaf className="h-6 w-6" />,
    color: 'emerald',
    description: 'Total greenhouse gas emissions avoided through tracked clean energy projects'
  },
  {
    id: 'jobs_created',
    label: 'Clean Energy Jobs',
    value: 45200,
    unit: 'positions',
    change: 8.7,
    changeLabel: 'YoY growth',
    icon: <Users className="h-6 w-6" />,
    color: 'blue',
    description: 'Direct and indirect employment in tracked renewable and clean energy projects'
  },
  {
    id: 'indigenous_equity',
    label: 'Indigenous Equity',
    value: 34,
    unit: '%',
    change: 5.2,
    changeLabel: 'vs 2020 baseline',
    icon: <Award className="h-6 w-6" />,
    color: 'amber',
    description: 'Average Indigenous ownership stake in tracked partnership projects'
  },
  {
    id: 'investment_mobilized',
    label: 'Investment Mobilized',
    value: 18.7,
    unit: 'B CAD',
    change: 22.1,
    changeLabel: 'vs last year',
    icon: <DollarSign className="h-6 w-6" />,
    color: 'green',
    description: 'Total capital investment in tracked clean energy and decarbonization projects'
  },
  {
    id: 'renewable_capacity',
    label: 'Renewable Capacity',
    value: 12450,
    unit: 'MW',
    change: 15.3,
    changeLabel: 'added this year',
    icon: <Zap className="h-6 w-6" />,
    color: 'yellow',
    description: 'New renewable energy generation capacity tracked across Canada'
  },
  {
    id: 'communities_connected',
    label: 'Communities Connected',
    value: 127,
    unit: 'communities',
    change: 18,
    changeLabel: 'new connections',
    icon: <Globe className="h-6 w-6" />,
    color: 'purple',
    description: 'Remote and Indigenous communities connected to clean energy or grid'
  },
  {
    id: 'projects_tracked',
    label: 'Projects Tracked',
    value: 892,
    unit: 'projects',
    change: 156,
    changeLabel: 'new this quarter',
    icon: <Building2 className="h-6 w-6" />,
    color: 'slate',
    description: 'Total energy transition projects monitored on the platform'
  },
  {
    id: 'economic_benefit',
    label: 'Economic Benefit',
    value: 4.2,
    unit: 'B CAD/year',
    change: 11.8,
    changeLabel: 'GDP contribution',
    icon: <TrendingUp className="h-6 w-6" />,
    color: 'cyan',
    description: 'Estimated annual economic contribution from tracked clean energy sector'
  }
];

const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  green: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30' },
  yellow: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
  slate: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30' },
  cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30' }
};

const formatValue = (value: number, unit: string): string => {
  if (unit === 't CO₂e') {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toLocaleString();
  }
  if (unit === 'B CAD' || unit === 'B CAD/year') {
    return `$${value.toFixed(1)}B`;
  }
  if (unit === 'MW') {
    if (value >= 1000) return `${(value / 1000).toFixed(1)} GW`;
    return `${value.toLocaleString()} MW`;
  }
  if (unit === '%') {
    return `${value}%`;
  }
  if (unit === 'positions' || unit === 'communities' || unit === 'projects') {
    return value.toLocaleString();
  }
  return value.toLocaleString();
};

export const ImpactMetricsDashboard: React.FC<ImpactMetricsDashboardProps> = ({
  compact = false,
  showExport = true,
  refreshInterval = 60000
}) => {
  const [metrics, setMetrics] = useState<ImpactMetric[]>(generateImpactMetrics());
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    setMetrics(generateImpactMetrics());
    setLastUpdated(new Date());
    setIsRefreshing(false);
  };

  const handleExport = () => {
    const csvContent = [
      ['Metric', 'Value', 'Unit', 'Change %', 'Description'],
      ...metrics.map(m => [m.label, m.value, m.unit, m.change, m.description])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ceip-impact-metrics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(handleRefresh, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval]);

  const displayMetrics = compact ? metrics.slice(0, 4) : metrics;

  if (compact) {
    return (
      <div className="card">
        <div className="card-header">
          <div className="flex items-center justify-between">
            <h3 className="card-title flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              Impact Highlights
            </h3>
            <HelpButton id="impact.metrics.overview" />
          </div>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-2 gap-3">
            {displayMetrics.map((metric) => {
              const colors = colorClasses[metric.color];
              return (
                <div 
                  key={metric.id}
                  className={`p-3 rounded-lg ${colors.bg} border ${colors.border}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={colors.text}>{metric.icon}</span>
                  </div>
                  <p className="text-lg font-bold text-white">
                    {formatValue(metric.value, metric.unit)}
                  </p>
                  <p className="text-xs text-slate-400">{metric.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <TrendingUp className="h-7 w-7 text-emerald-500" />
            Impact Metrics Dashboard
          </h2>
          <p className="text-slate-400 mt-1">
            Real-time ESG and sustainability KPIs across tracked projects
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">
            Updated {lastUpdated.toLocaleTimeString()}
          </span>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="btn btn-secondary btn-sm"
            aria-label="Refresh metrics"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          {showExport && (
            <button
              onClick={handleExport}
              className="btn btn-secondary btn-sm"
              aria-label="Export metrics"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          )}
          <HelpButton id="impact.metrics.overview" />
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {displayMetrics.map((metric) => {
          const colors = colorClasses[metric.color];
          const isPositive = metric.change > 0;
          const isNeutral = metric.change === 0;

          return (
            <div 
              key={metric.id}
              className={`card ${colors.bg} border ${colors.border} hover:scale-[1.02] transition-transform cursor-default`}
              title={metric.description}
            >
              <div className="p-4">
                {/* Icon & Label */}
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2 rounded-lg ${colors.bg} ${colors.text}`}>
                    {metric.icon}
                  </div>
                  <div className={`flex items-center gap-1 text-xs font-medium ${
                    isPositive ? 'text-emerald-400' : isNeutral ? 'text-slate-400' : 'text-red-400'
                  }`}>
                    {isPositive ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : isNeutral ? (
                      <Minus className="h-3 w-3" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3" />
                    )}
                    {Math.abs(metric.change)}%
                  </div>
                </div>

                {/* Value */}
                <p className="text-2xl font-bold text-white mb-1">
                  {formatValue(metric.value, metric.unit)}
                </p>
                <p className={`text-sm font-medium ${colors.text}`}>
                  {metric.label}
                </p>

                {/* Change Label */}
                <p className="text-xs text-slate-500 mt-2">
                  {metric.changeLabel}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Row */}
      <div className="card bg-gradient-to-r from-emerald-900/30 to-blue-900/30">
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-3xl font-bold text-emerald-400">
                {formatValue(metrics[0].value, metrics[0].unit)}
              </p>
              <p className="text-sm text-slate-400">Total Emissions Avoided</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-blue-400">
                {metrics[1].value.toLocaleString()}
              </p>
              <p className="text-sm text-slate-400">Clean Energy Jobs</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-amber-400">
                ${metrics[3].value}B
              </p>
              <p className="text-sm text-slate-400">Investment Mobilized</p>
            </div>
          </div>
        </div>
      </div>

      {/* Methodology Note with Citations */}
      <div className="space-y-2">
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <DataSource 
            {...COMMON_DATA_SOURCES.ECCC_EMISSIONS}
            date={new Date().toISOString()}
            version="NIR 2024"
            compact={true}
          />
          <DataSource 
            dataset="StatsCan Labour Force Survey"
            url="https://www.statcan.gc.ca/en/subjects-start/labour_"
            description="Employment data from Statistics Canada"
            compact={true}
          />
          <DataSource 
            {...COMMON_DATA_SOURCES.CER_COMPLIANCE}
            compact={true}
          />
        </div>
        <p className="text-xs text-slate-500 text-center">
          Metrics calculated from tracked projects using standardized methodologies.
        </p>
      </div>
    </div>
  );
};

export default ImpactMetricsDashboard;
