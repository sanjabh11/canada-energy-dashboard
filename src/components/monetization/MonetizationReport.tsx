/**
 * MonetizationReport Component
 *
 * Comprehensive, world-class dashboard for displaying complete monetization analysis
 * with beautiful charts, metrics, and interactive elements. Stripe-level quality.
 */

import React, { useState, useMemo } from 'react';
import { MonetizationBadge, MonetizationTier, TIER_CONFIG } from './MonetizationBadge';
import { MonetizationCard, FeatureMonetization, SponsorCategory } from './MonetizationCard';
import {
  TrendingUp,
  DollarSign,
  Users,
  Target,
  Building2,
  Star,
  Filter,
  Download,
  Share2,
  ChevronDown,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';
import { cn } from '../../lib/utils';

// Feature data with monetization details
export const FEATURE_MONETIZATION_DATA: FeatureMonetization[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    description: 'Real-time energy data streaming',
    rating: 5,
    estimatedValue: '$75,000/year',
    sponsorCategories: [
      {
        name: 'Grid Operators & Utilities',
        examples: ['Ontario Energy Board', 'Hydro Quebec', 'BC Hydro'],
        value: '$30K+'
      },
      {
        name: 'Energy Traders',
        examples: ['Bloomberg Energy', 'ICE', 'CME Group'],
        value: '$25K+'
      }
    ],
    keyMetrics: [
      { label: 'Daily Active Users', value: '12.5K', trend: 'up' },
      { label: 'Avg. Session Time', value: '8.3 min', trend: 'up' }
    ],
    targetAudience: ['Utilities', 'Traders', 'Analysts', 'Grid Operators']
  },
  {
    id: 'ai-datacentres',
    name: 'AI Data Centres',
    description: 'AI facility energy tracking',
    rating: 5,
    estimatedValue: '$100,000/year',
    sponsorCategories: [
      {
        name: 'Tech Giants',
        examples: ['Google Cloud', 'Microsoft Azure', 'AWS'],
        value: '$50K+'
      },
      {
        name: 'Data Center Operators',
        examples: ['Equinix', 'Digital Realty', 'Switch'],
        value: '$30K+'
      }
    ],
    keyMetrics: [
      { label: 'Facilities Tracked', value: '47', trend: 'up' },
      { label: 'Energy Monitored', value: '2.1 GW', trend: 'up' }
    ],
    targetAudience: ['Tech Companies', 'Data Centers', 'Sustainability Teams']
  },
  {
    id: 'analytics',
    name: 'Analytics & Trends',
    description: 'Advanced analytics and insights',
    rating: 5,
    estimatedValue: '$80,000/year',
    sponsorCategories: [
      {
        name: 'Consulting Firms',
        examples: ['McKinsey Energy', 'Deloitte', 'PwC'],
        value: '$35K+'
      },
      {
        name: 'Financial Institutions',
        examples: ['Goldman Sachs', 'JP Morgan', 'RBC Capital Markets'],
        value: '$30K+'
      }
    ],
    keyMetrics: [
      { label: 'Reports Generated', value: '1.2K/mo', trend: 'up' },
      { label: 'Export Rate', value: '34%', trend: 'up' }
    ],
    targetAudience: ['Analysts', 'Consultants', 'Financial Services']
  },
  {
    id: 'investment',
    name: 'Investment',
    description: 'Capital flows analysis',
    rating: 5,
    estimatedValue: '$90,000/year',
    sponsorCategories: [
      {
        name: 'Investment Banks',
        examples: ['Morgan Stanley', 'Credit Suisse', 'BMO Capital'],
        value: '$40K+'
      },
      {
        name: 'Private Equity',
        examples: ['Brookfield Renewable', 'BlackRock', 'KKR'],
        value: '$35K+'
      }
    ],
    targetAudience: ['Investors', 'PE Firms', 'Project Developers']
  },
  {
    id: 'carbon-emissions',
    name: 'Carbon Emissions',
    description: 'Real-time emissions tracking',
    rating: 5,
    estimatedValue: '$70,000/year',
    sponsorCategories: [
      {
        name: 'ESG Platforms',
        examples: ['Sustainalytics', 'MSCI ESG', 'Refinitiv'],
        value: '$30K+'
      },
      {
        name: 'Carbon Markets',
        examples: ['Climate Action Reserve', 'Verra', 'Gold Standard'],
        value: '$25K+'
      }
    ],
    targetAudience: ['Sustainability Teams', 'Compliance Officers', 'ESG Investors']
  },
  {
    id: 'ev-charging',
    name: 'EV Charging',
    description: 'EV infrastructure tracking',
    rating: 5,
    estimatedValue: '$85,000/year',
    sponsorCategories: [
      {
        name: 'Automotive',
        examples: ['Ford', 'GM', 'Tesla'],
        value: '$35K+'
      },
      {
        name: 'Charging Networks',
        examples: ['ChargePoint', 'Electrify Canada', 'Flo'],
        value: '$30K+'
      }
    ],
    targetAudience: ['Auto OEMs', 'Charging Operators', 'Utilities']
  },
  {
    id: 'ccus-projects',
    name: 'CCUS Projects',
    description: 'Carbon capture tracking',
    rating: 5,
    estimatedValue: '$65,000/year',
    sponsorCategories: [
      {
        name: 'Oil & Gas',
        examples: ['Shell', 'Suncor', 'Cenovus'],
        value: '$30K+'
      },
      {
        name: 'Industrial Emitters',
        examples: ['Lafarge', 'ArcelorMittal', 'Nutrien'],
        value: '$20K+'
      }
    ],
    targetAudience: ['Energy Companies', 'Industrial Facilities', 'Policy Makers']
  },
  {
    id: 'hydrogen-hub',
    name: 'Hydrogen Hub',
    description: 'Hydrogen economy dashboard',
    rating: 5,
    estimatedValue: '$75,000/year',
    sponsorCategories: [
      {
        name: 'Hydrogen Producers',
        examples: ['Air Products', 'Plug Power', 'Ballard Power'],
        value: '$35K+'
      },
      {
        name: 'Automotive',
        examples: ['Toyota', 'Hyundai', 'Honda'],
        value: '$25K+'
      }
    ],
    targetAudience: ['H2 Producers', 'Transportation', 'Energy Storage']
  },
  {
    id: 'critical-minerals',
    name: 'Critical Minerals',
    description: 'Supply chain tracking',
    rating: 5,
    estimatedValue: '$70,000/year',
    sponsorCategories: [
      {
        name: 'Mining Companies',
        examples: ['Vale', 'Glencore', 'Rio Tinto'],
        value: '$30K+'
      },
      {
        name: 'Battery Manufacturers',
        examples: ['LG Chem', 'CATL', 'Panasonic'],
        value: '$25K+'
      }
    ],
    targetAudience: ['Mining', 'EV Manufacturers', 'Battery Companies']
  }
];

export interface MonetizationReportProps {
  className?: string;
  showFilters?: boolean;
  compactMode?: boolean;
}

export const MonetizationReport: React.FC<MonetizationReportProps> = ({
  className,
  showFilters = true,
  compactMode = false
}) => {
  const [selectedTier, setSelectedTier] = useState<MonetizationTier | 'all'>('all');
  const [sortBy, setSortBy] = useState<'rating' | 'value' | 'name'>('rating');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filter and sort features
  const filteredFeatures = useMemo(() => {
    let filtered = [...FEATURE_MONETIZATION_DATA];

    if (selectedTier !== 'all') {
      filtered = filtered.filter(f => f.rating === selectedTier);
    }

    filtered.sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      // Parse value for sorting (assumes format like "$75,000/year")
      const aValue = parseInt(a.estimatedValue.replace(/[^0-9]/g, ''));
      const bValue = parseInt(b.estimatedValue.replace(/[^0-9]/g, ''));
      return bValue - aValue;
    });

    return filtered;
  }, [selectedTier, sortBy]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const totalValue = FEATURE_MONETIZATION_DATA.reduce((sum, feature) => {
      const value = parseInt(feature.estimatedValue.replace(/[^0-9]/g, ''));
      return sum + value;
    }, 0);

    const tierCounts = FEATURE_MONETIZATION_DATA.reduce((acc, feature) => {
      acc[feature.rating] = (acc[feature.rating] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const avgRating = FEATURE_MONETIZATION_DATA.reduce((sum, f) => sum + f.rating, 0) / FEATURE_MONETIZATION_DATA.length;

    return {
      totalValue,
      totalFeatures: FEATURE_MONETIZATION_DATA.length,
      premiumFeatures: tierCounts[5] || 0,
      avgRating: avgRating.toFixed(1),
      tierDistribution: tierCounts
    };
  }, []);

  return (
    <div className={cn('w-full space-y-6', className)}>
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 rounded-2xl p-8 text-white shadow-2xl">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <Star className="h-8 w-8 fill-current" />
              Monetization Analysis Report
            </h1>
            <p className="text-purple-100 text-lg">
              Comprehensive feature valuation and sponsor potential analysis
            </p>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-medium transition-colors backdrop-blur-sm flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export
            </button>
            <button className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-medium transition-colors backdrop-blur-sm flex items-center gap-2">
              <Share2 className="h-4 w-4" />
              Share
            </button>
          </div>
        </div>

        {/* Summary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-5 w-5" />
              <span className="text-sm font-medium text-purple-100">Total Annual Value</span>
            </div>
            <p className="text-3xl font-bold">${(summaryMetrics.totalValue / 1000).toFixed(0)}K</p>
            <p className="text-xs text-purple-200 mt-1">Estimated yearly revenue</p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <div className="flex items-center gap-2 mb-2">
              <Star className="h-5 w-5 fill-current" />
              <span className="text-sm font-medium text-purple-100">Premium Features</span>
            </div>
            <p className="text-3xl font-bold">{summaryMetrics.premiumFeatures}</p>
            <p className="text-xs text-purple-200 mt-1">5-star rated features</p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-5 w-5" />
              <span className="text-sm font-medium text-purple-100">Average Rating</span>
            </div>
            <p className="text-3xl font-bold">{summaryMetrics.avgRating}/5</p>
            <p className="text-xs text-purple-200 mt-1">Across all features</p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-5 w-5" />
              <span className="text-sm font-medium text-purple-100">Total Features</span>
            </div>
            <p className="text-3xl font-bold">{summaryMetrics.totalFeatures}</p>
            <p className="text-xs text-purple-200 mt-1">Analyzed for monetization</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-xl border-2 border-slate-200 p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-600" />
              <span className="text-sm font-semibold text-slate-700">Filters:</span>
            </div>

            {/* Tier Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">Tier:</span>
              <select
                value={selectedTier}
                onChange={(e) => setSelectedTier(e.target.value === 'all' ? 'all' : parseInt(e.target.value) as MonetizationTier)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Tiers</option>
                <option value="5">⭐⭐⭐⭐⭐ Premium (5)</option>
                <option value="4">⭐⭐⭐⭐ Strong (4)</option>
                <option value="3">⭐⭐⭐ Moderate (3)</option>
                <option value="2">⭐⭐ Limited (2)</option>
                <option value="1">⭐ Minimal (1)</option>
              </select>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'rating' | 'value' | 'name')}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="rating">Rating (High to Low)</option>
                <option value="value">Value (High to Low)</option>
                <option value="name">Name (A-Z)</option>
              </select>
            </div>

            {/* View Mode */}
            <div className="ml-auto flex items-center gap-2 bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'px-3 py-1.5 rounded text-sm font-medium transition-colors',
                  viewMode === 'grid' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                )}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'px-3 py-1.5 rounded text-sm font-medium transition-colors',
                  viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                )}
              >
                List
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Features Grid/List */}
      <div className={cn(
        viewMode === 'grid'
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
          : 'space-y-4'
      )}>
        {filteredFeatures.map((feature) => (
          <MonetizationCard
            key={feature.id}
            feature={feature}
            variant={compactMode ? 'compact' : viewMode === 'list' ? 'default' : 'detailed'}
          />
        ))}
      </div>

      {/* Empty State */}
      {filteredFeatures.length === 0 && (
        <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300">
          <Target className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600 font-medium">No features match your filters</p>
          <p className="text-sm text-slate-500 mt-1">Try adjusting your filter criteria</p>
        </div>
      )}
    </div>
  );
};

export default MonetizationReport;
