/**
 * InteractiveAnnotation Component
 *
 * Beautiful, educational annotations for charts and data visualizations
 * Inspired by FiveThirtyEight and The Pudding's storytelling approach
 */

import React, { useState } from 'react';
import {
  Info,
  TrendingUp,
  Zap,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  X,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { cn } from '../../lib/utils';

export type AnnotationType =
  | 'info' // General information
  | 'insight' // Data insight
  | 'warning' // Important caution
  | 'success' // Positive outcome
  | 'tip' // Helpful tip
  | 'highlight'; // Key highlight

export interface AnnotationConfig {
  type: AnnotationType;
  title: string;
  message: string;
  position?: 'top' | 'right' | 'bottom' | 'left';
  size?: 'sm' | 'md' | 'lg';
  dismissible?: boolean;
  autoShow?: boolean;
  learnMoreLink?: string;
  comparison?: string; // e.g., "That's enough to power 50,000 homes!"
  icon?: React.ComponentType<any>;
}

export interface InteractiveAnnotationProps extends AnnotationConfig {
  className?: string;
  onDismiss?: () => void;
  onLearnMore?: () => void;
}

const ANNOTATION_STYLES = {
  info: {
    icon: Info,
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-900',
    badgeColor: 'bg-blue-500'
  },
  insight: {
    icon: Lightbulb,
    color: 'from-amber-500 to-orange-500',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-900',
    badgeColor: 'bg-amber-500'
  },
  warning: {
    icon: AlertTriangle,
    color: 'from-red-500 to-rose-500',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-900',
    badgeColor: 'bg-red-500'
  },
  success: {
    icon: CheckCircle,
    color: 'from-emerald-500 to-green-500',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    textColor: 'text-emerald-900',
    badgeColor: 'bg-emerald-500'
  },
  tip: {
    icon: Sparkles,
    color: 'from-purple-500 to-pink-500',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-900',
    badgeColor: 'bg-purple-500'
  },
  highlight: {
    icon: Zap,
    color: 'from-yellow-500 to-amber-500',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    textColor: 'text-yellow-900',
    badgeColor: 'bg-yellow-500'
  }
};

const SIZE_STYLES = {
  sm: {
    container: 'p-3',
    title: 'text-sm',
    message: 'text-xs',
    icon: 'h-4 w-4',
    badge: 'h-8 w-8'
  },
  md: {
    container: 'p-4',
    title: 'text-base',
    message: 'text-sm',
    icon: 'h-5 w-5',
    badge: 'h-10 w-10'
  },
  lg: {
    container: 'p-5',
    title: 'text-lg',
    message: 'text-base',
    icon: 'h-6 w-6',
    badge: 'h-12 w-12'
  }
};

export const InteractiveAnnotation: React.FC<InteractiveAnnotationProps> = ({
  type,
  title,
  message,
  position = 'right',
  size = 'md',
  dismissible = true,
  autoShow = true,
  learnMoreLink,
  comparison,
  icon: CustomIcon,
  className,
  onDismiss,
  onLearnMore
}) => {
  const [isVisible, setIsVisible] = useState(autoShow);
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isVisible) return null;

  const styles = ANNOTATION_STYLES[type];
  const sizeStyles = SIZE_STYLES[size];
  const Icon = CustomIcon || styles.icon;

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  const handleLearnMore = () => {
    if (learnMoreLink) {
      window.open(learnMoreLink, '_blank');
    }
    onLearnMore?.();
  };

  return (
    <div
      className={cn(
        'relative group',
        'animate-in fade-in zoom-in duration-500',
        className
      )}
    >
      {/* Annotation Bubble */}
      <div
        className={cn(
          'relative rounded-xl border-2 shadow-lg',
          'transition-all duration-300 hover:shadow-xl',
          styles.bgColor,
          styles.borderColor,
          sizeStyles.container,
          'max-w-sm'
        )}
      >
        {/* Accent Bar */}
        <div
          className={cn(
            'absolute top-0 left-0 right-0 h-1 rounded-t-lg',
            'bg-gradient-to-r',
            styles.color
          )}
        />

        {/* Content */}
        <div className="flex items-start gap-3">
          {/* Icon Badge */}
          <div
            className={cn(
              'flex-shrink-0 rounded-lg flex items-center justify-center',
              styles.badgeColor,
              sizeStyles.badge,
              'shadow-md'
            )}
          >
            <Icon className={cn('text-white', sizeStyles.icon)} />
          </div>

          {/* Text Content */}
          <div className="flex-1 min-w-0">
            <h4 className={cn('font-bold mb-1', styles.textColor, sizeStyles.title)}>
              {title}
            </h4>
            <p className={cn('text-slate-700 leading-relaxed', sizeStyles.message)}>
              {message}
            </p>

            {/* Comparison (if provided) */}
            {comparison && (
              <div
                className={cn(
                  'mt-2 p-2 rounded-lg border',
                  'bg-white',
                  styles.borderColor
                )}
              >
                <p className="text-xs font-medium text-slate-700 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {comparison}
                </p>
              </div>
            )}

            {/* Actions */}
            {(learnMoreLink || onLearnMore) && (
              <button
                onClick={handleLearnMore}
                className={cn(
                  'mt-3 inline-flex items-center gap-1 text-xs font-semibold',
                  'transition-all duration-200 hover:gap-2',
                  styles.textColor
                )}
              >
                Learn more
                <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Dismiss Button */}
          {dismissible && (
            <button
              onClick={handleDismiss}
              className={cn(
                'flex-shrink-0 p-1 rounded-lg',
                'hover:bg-white/50 transition-colors',
                styles.textColor
              )}
              aria-label="Dismiss annotation"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Pointer/Arrow (optional, based on position) */}
      {position !== 'right' && (
        <div
          className={cn(
            'absolute w-0 h-0',
            position === 'top' && 'bottom-full left-1/2 -translate-x-1/2 mb-2',
            position === 'bottom' && 'top-full left-1/2 -translate-x-1/2 mt-2',
            position === 'left' && 'right-full top-1/2 -translate-y-1/2 mr-2'
          )}
          style={{
            borderLeft: position === 'left' ? '8px solid transparent' : undefined,
            borderRight: position === 'left' ? `8px solid ${styles.borderColor}` : undefined,
            borderTop: position === 'top' ? '8px solid transparent' : undefined,
            borderBottom: position === 'top' ? `8px solid ${styles.borderColor}` : undefined
          }}
        />
      )}
    </div>
  );
};

// Preset annotation types for common scenarios
export const AnnotationPresets = {
  peakDemand: (): AnnotationConfig => ({
    type: 'highlight',
    title: 'Peak Energy Usage',
    message:
      'This spike happens every evening when families cook dinner and watch TV. Energy costs are highest during these times.',
    comparison: 'Demand increases by 30-40% compared to overnight lows'
  }),

  renewableRecord: (): AnnotationConfig => ({
    type: 'success',
    title: 'Wind Power Surge!',
    message:
      'Strong winds today generated a record amount of clean electricity. This reduces our dependence on fossil fuels.',
    comparison: 'Enough to power 500,000 homes for the entire day!'
  }),

  carbonReduction: (): AnnotationConfig => ({
    type: 'success',
    title: 'Carbon Emissions Avoided',
    message:
      'By using more renewable energy today, we avoided significant carbon emissions.',
    comparison: 'Equal to taking 10,000 cars off the road for a day'
  }),

  lowPricing: (): AnnotationConfig => ({
    type: 'tip',
    title: 'Great Time to Use Power!',
    message:
      'Electricity prices are low right now. Perfect time to charge your EV or run the dishwasher.',
    comparison: 'Save up to 50% compared to peak hours'
  }),

  highDemand: (): AnnotationConfig => ({
    type: 'warning',
    title: 'High Demand Period',
    message:
      'The grid is under stress during this time. Consider reducing non-essential energy use.',
    comparison: 'Prices are 2-3x higher than usual'
  }),

  dataInsight: (metric: string, value: string): AnnotationConfig => ({
    type: 'insight',
    title: `📊 ${metric}`,
    message: `Current value: ${value}. This represents the real-time measurement.`,
    comparison: 'Tap for detailed explanation'
  })
};

export default InteractiveAnnotation;
