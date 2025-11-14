/**
 * MonetizationCard Component
 *
 * Beautiful, Stripe-level quality card for displaying feature monetization details
 * with gorgeous animations, gradients, and visual hierarchy.
 */

import React, { useState } from 'react';
import { MonetizationBadge, MonetizationTier, TIER_CONFIG } from './MonetizationBadge';
import {
  TrendingUp,
  Users,
  Building2,
  Target,
  DollarSign,
  ArrowRight,
  Sparkles,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { cn } from '../../lib/utils';

export interface SponsorCategory {
  name: string;
  examples: string[];
  value: string;
}

export interface FeatureMonetization {
  id: string;
  name: string;
  description: string;
  rating: MonetizationTier;
  estimatedValue: string;
  sponsorCategories: SponsorCategory[];
  keyMetrics?: {
    label: string;
    value: string;
    trend?: 'up' | 'down' | 'neutral';
  }[];
  targetAudience?: string[];
  icon?: React.ComponentType<any>;
}

export interface MonetizationCardProps {
  feature: FeatureMonetization;
  variant?: 'default' | 'compact' | 'detailed';
  interactive?: boolean;
  onClick?: () => void;
  className?: string;
}

export const MonetizationCard: React.FC<MonetizationCardProps> = ({
  feature,
  variant = 'default',
  interactive = true,
  onClick,
  className
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const config = TIER_CONFIG[feature.rating];
  const Icon = feature.icon || Target;

  const gradientBg = {
    5: 'from-purple-500/10 via-pink-500/10 to-rose-500/10',
    4: 'from-blue-500/10 via-indigo-500/10 to-purple-500/10',
    3: 'from-emerald-500/10 to-teal-500/10',
    2: 'from-amber-500/10 to-orange-500/10',
    1: 'from-slate-500/10 to-gray-500/10'
  }[feature.rating];

  const borderGradient = {
    5: 'hover:border-purple-300',
    4: 'hover:border-blue-300',
    3: 'hover:border-emerald-300',
    2: 'hover:border-amber-300',
    1: 'hover:border-slate-300'
  }[feature.rating];

  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'group relative overflow-hidden rounded-xl border-2 border-slate-200',
          'bg-white p-4 transition-all duration-300',
          'hover:shadow-lg hover:scale-[1.02]',
          borderGradient,
          interactive && 'cursor-pointer',
          className
        )}
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Background gradient */}
        <div className={cn('absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-300 group-hover:opacity-100', gradientBg)} />

        <div className="relative z-10 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <div className={cn(
              'rounded-lg p-2 transition-all duration-300',
              config.bgColor,
              'group-hover:scale-110'
            )}>
              <Icon className={cn('h-5 w-5', config.textColor)} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-900 truncate mb-1">{feature.name}</h3>
              <p className="text-sm text-slate-600 line-clamp-2">{feature.description}</p>
            </div>
          </div>
          <MonetizationBadge rating={feature.rating} size="sm" showLabel={false} />
        </div>
      </div>
    );
  }

  if (variant === 'detailed') {
    return (
      <div
        className={cn(
          'group relative overflow-hidden rounded-2xl border-2 border-slate-200',
          'bg-white transition-all duration-500',
          'hover:shadow-2xl hover:scale-[1.01]',
          borderGradient,
          interactive && 'cursor-pointer',
          className
        )}
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Animated background gradient */}
        <div className={cn(
          'absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-500',
          'group-hover:opacity-100',
          gradientBg
        )} />

        {/* Top accent bar */}
        <div className={cn(
          'absolute top-0 inset-x-0 h-1 bg-gradient-to-r transition-all duration-300',
          config.color,
          'scale-x-0 group-hover:scale-x-100'
        )} />

        <div className="relative z-10 p-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-start gap-4">
              <div className={cn(
                'rounded-xl p-3 transition-all duration-300',
                config.bgColor,
                'group-hover:scale-110 group-hover:rotate-3'
              )}>
                <Icon className={cn('h-6 w-6', config.textColor)} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-1">{feature.name}</h3>
                <p className="text-sm text-slate-600">{feature.description}</p>
              </div>
            </div>
            <MonetizationBadge
              rating={feature.rating}
              size="lg"
              showLabel={true}
              variant="detailed"
            />
          </div>

          {/* Revenue Estimate */}
          <div className={cn(
            'rounded-lg p-4 mb-4',
            'bg-gradient-to-r from-slate-50 to-slate-100',
            'border border-slate-200'
          )}>
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-semibold text-slate-700">Estimated Annual Value</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{feature.estimatedValue}</p>
          </div>

          {/* Key Metrics */}
          {feature.keyMetrics && feature.keyMetrics.length > 0 && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              {feature.keyMetrics.map((metric, idx) => (
                <div
                  key={idx}
                  className="rounded-lg bg-white border border-slate-200 p-3 hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-xs font-medium text-slate-600">{metric.label}</span>
                    {metric.trend && (
                      <TrendingUp
                        className={cn(
                          'h-3 w-3',
                          metric.trend === 'up' ? 'text-emerald-500' :
                          metric.trend === 'down' ? 'text-red-500 rotate-180' :
                          'text-slate-400'
                        )}
                      />
                    )}
                  </div>
                  <p className="text-lg font-bold text-slate-900">{metric.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Sponsor Categories */}
          <div className="space-y-3 mb-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-600" />
              <span className="text-sm font-semibold text-slate-700">Potential Sponsors</span>
            </div>
            {feature.sponsorCategories.map((category, idx) => (
              <div
                key={idx}
                className="rounded-lg bg-slate-50 border border-slate-200 p-3 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-900">{category.name}</span>
                  <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    {category.value}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {category.examples.map((example, exIdx) => (
                    <span
                      key={exIdx}
                      className="text-xs text-slate-600 bg-white px-2 py-1 rounded border border-slate-200"
                    >
                      {example}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Target Audience */}
          {feature.targetAudience && feature.targetAudience.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-slate-600" />
                <span className="text-sm font-semibold text-slate-700">Target Audience</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {feature.targetAudience.map((audience, idx) => (
                  <span
                    key={idx}
                    className={cn(
                      'text-xs font-medium px-2.5 py-1 rounded-full',
                      config.bgColor,
                      config.textColor
                    )}
                  >
                    {audience}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          {interactive && (
            <button
              className={cn(
                'w-full mt-2 rounded-lg p-3',
                'bg-gradient-to-r text-white font-semibold',
                'flex items-center justify-center gap-2',
                'transition-all duration-300',
                'hover:shadow-lg hover:scale-[1.02]',
                config.color
              )}
            >
              <span>View Details</span>
              <ChevronRight className={cn(
                'h-4 w-4 transition-transform duration-300',
                isHovered && 'translate-x-1'
              )} />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border-2 border-slate-200',
        'bg-white p-5 transition-all duration-300',
        'hover:shadow-xl hover:scale-[1.02]',
        borderGradient,
        interactive && 'cursor-pointer',
        className
      )}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Background gradient */}
      <div className={cn(
        'absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-300',
        'group-hover:opacity-100',
        gradientBg
      )} />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-3">
            <div className={cn(
              'rounded-lg p-2.5 transition-all duration-300',
              config.bgColor,
              'group-hover:scale-110'
            )}>
              <Icon className={cn('h-5 w-5', config.textColor)} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 mb-1">{feature.name}</h3>
              <p className="text-sm text-slate-600">{feature.description}</p>
            </div>
          </div>
          <MonetizationBadge rating={feature.rating} size="md" showLabel={false} />
        </div>

        {/* Value */}
        <div className="flex items-center justify-between mb-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
          <span className="text-sm font-medium text-slate-600">Est. Annual Value</span>
          <span className="text-lg font-bold text-slate-900">{feature.estimatedValue}</span>
        </div>

        {/* Top Sponsor */}
        {feature.sponsorCategories.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Building2 className="h-4 w-4" />
            <span className="truncate">{feature.sponsorCategories[0].examples[0]}</span>
            {feature.sponsorCategories[0].examples.length > 1 && (
              <span className="text-xs text-slate-500">+{feature.sponsorCategories[0].examples.length - 1} more</span>
            )}
          </div>
        )}

        {/* Arrow indicator */}
        {interactive && (
          <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowRight className="h-5 w-5 text-slate-400" />
          </div>
        )}
      </div>
    </div>
  );
};

export default MonetizationCard;
