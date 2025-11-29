/**
 * MonetizationBadge Component
 *
 * Badge component for displaying monetization ratings with animations.
 */

import React from 'react';
import { Star, TrendingUp, Sparkles, DollarSign } from 'lucide-react';
import { cn } from '../../lib/utils';

export type MonetizationTier = 1 | 2 | 3 | 4 | 5;

export interface MonetizationBadgeProps {
  rating: MonetizationTier;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showLabel?: boolean;
  animated?: boolean;
  className?: string;
  variant?: 'default' | 'compact' | 'detailed';
}

const TIER_CONFIG = {
  5: {
    label: 'Premium',
    color: 'from-purple-600 via-pink-600 to-rose-600',
    bgColor: 'bg-gradient-to-r from-purple-50 to-pink-50',
    borderColor: 'border-purple-300',
    textColor: 'text-purple-900',
    icon: Sparkles,
    description: 'Highest monetization potential',
    estimate: '$60K-$100K/year'
  },
  4: {
    label: 'Strong',
    color: 'from-blue-600 via-indigo-600 to-purple-600',
    bgColor: 'bg-gradient-to-r from-blue-50 to-indigo-50',
    borderColor: 'border-blue-300',
    textColor: 'text-blue-900',
    icon: TrendingUp,
    description: 'Strong monetization potential',
    estimate: '$40K-$60K/year'
  },
  3: {
    label: 'Moderate',
    color: 'from-emerald-600 to-teal-600',
    bgColor: 'bg-gradient-to-r from-emerald-50 to-teal-50',
    borderColor: 'border-emerald-300',
    textColor: 'text-emerald-900',
    icon: DollarSign,
    description: 'Moderate monetization potential',
    estimate: '$15K-$30K/year'
  },
  2: {
    label: 'Limited',
    color: 'from-amber-600 to-orange-600',
    bgColor: 'bg-gradient-to-r from-amber-50 to-orange-50',
    borderColor: 'border-amber-300',
    textColor: 'text-amber-900',
    icon: DollarSign,
    description: 'Limited monetization potential',
    estimate: '$5K-$15K/year'
  },
  1: {
    label: 'Minimal',
    color: 'from-slate-600 to-gray-600',
    bgColor: 'bg-gradient-to-r from-slate-50 to-gray-50',
    borderColor: 'border-slate-300',
    textColor: 'text-slate-900',
    icon: DollarSign,
    description: 'Minimal monetization potential',
    estimate: '<$5K/year'
  }
};

const SIZE_CONFIG = {
  xs: { star: 10, gap: 'gap-0.5', text: 'text-xs', padding: 'px-1.5 py-0.5' },
  sm: { star: 12, gap: 'gap-1', text: 'text-xs', padding: 'px-2 py-1' },
  md: { star: 14, gap: 'gap-1', text: 'text-sm', padding: 'px-2.5 py-1.5' },
  lg: { star: 16, gap: 'gap-1.5', text: 'text-base', padding: 'px-3 py-2' },
  xl: { star: 20, gap: 'gap-2', text: 'text-lg', padding: 'px-4 py-2.5' }
};

export const MonetizationBadge: React.FC<MonetizationBadgeProps> = ({
  rating,
  size = 'md',
  showLabel = true,
  animated = true,
  className,
  variant = 'default'
}) => {
  const config = TIER_CONFIG[rating];
  const sizeConfig = SIZE_CONFIG[size];
  const Icon = config.icon;

  const renderStars = () => {
    return Array.from({ length: 5 }, (_, i) => {
      const isFilled = i < rating;
      return (
        <Star
          key={i}
          className={cn(
            'transition-all duration-300',
            isFilled
              ? `fill-current text-yellow-400 ${animated ? 'hover:scale-110' : ''}`
              : 'text-gray-300',
            animated && isFilled && 'animate-pulse'
          )}
          size={sizeConfig.star}
          style={{
            animationDelay: animated ? `${i * 100}ms` : undefined,
            animationDuration: animated ? '2s' : undefined
          }}
        />
      );
    });
  };

  if (variant === 'compact') {
    return (
      <div className={cn('inline-flex items-center gap-1', className)}>
        <div className="flex items-center gap-0.5">
          {renderStars()}
        </div>
      </div>
    );
  }

  if (variant === 'detailed') {
    return (
      <div
        className={cn(
          'inline-flex items-center rounded-lg border-2 backdrop-blur-sm',
          'shadow-md hover:shadow-lg transition-all duration-300',
          config.bgColor,
          config.borderColor,
          sizeConfig.padding,
          sizeConfig.gap,
          className
        )}
      >
        <div className={cn('flex items-center', sizeConfig.gap)}>
          <Icon className={cn('flex-shrink-0', config.textColor)} size={sizeConfig.star + 4} />
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1">
              <div className="flex items-center gap-0.5">{renderStars()}</div>
              <span className={cn('font-bold', config.textColor, sizeConfig.text)}>
                {rating}/5
              </span>
            </div>
            {showLabel && (
              <div className="flex flex-col">
                <span className={cn('font-semibold', config.textColor, sizeConfig.text)}>
                  {config.label}
                </span>
                <span className={cn('text-xs opacity-75', config.textColor)}>
                  {config.estimate}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border-2 backdrop-blur-sm',
        'shadow-sm hover:shadow-md transition-all duration-300',
        config.bgColor,
        config.borderColor,
        sizeConfig.padding,
        sizeConfig.gap,
        animated && 'hover:scale-105',
        className
      )}
    >
      <Icon className={cn('flex-shrink-0', config.textColor)} size={sizeConfig.star + 2} />
      <div className="flex items-center gap-0.5">{renderStars()}</div>
      {showLabel && (
        <span className={cn('font-semibold whitespace-nowrap', config.textColor, sizeConfig.text)}>
          {config.label}
        </span>
      )}
    </div>
  );
};

// Utility component for showing just the tier label with color
export const MonetizationTierLabel: React.FC<{
  rating: MonetizationTier;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ rating, size = 'md', className }) => {
  const config = TIER_CONFIG[rating];
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-semibold',
        config.bgColor,
        config.textColor,
        sizeClasses[size],
        className
      )}
    >
      <Star className="fill-current text-yellow-400" size={size === 'sm' ? 10 : size === 'md' ? 12 : 14} />
      {config.label}
    </span>
  );
};

export { TIER_CONFIG };
