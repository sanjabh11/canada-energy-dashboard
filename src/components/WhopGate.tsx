/**
 * Whop Access Gate Components
 * 
 * React components for feature and tier-based access control.
 * Integrates with Whop SDK for monetization.
 */

import React from 'react';
import { Lock, Crown, Users, Zap, ArrowRight } from 'lucide-react';
import { 
  whopClient, 
  useWhopAccess, 
  type WhopTier, 
  WHOP_ACCESS_MATRIX 
} from '../lib/whop';

interface FeatureGateProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgrade?: boolean;
}

interface TierGateProps {
  requiredTier: WhopTier;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgrade?: boolean;
}

/**
 * Gate content based on feature access
 */
export const FeatureGate: React.FC<FeatureGateProps> = ({
  feature,
  children,
  fallback,
  showUpgrade = true
}) => {
  const { hasFeature, tier } = useWhopAccess();

  if (hasFeature(feature)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (showUpgrade) {
    return <UpgradePrompt feature={feature} currentTier={tier} />;
  }

  return null;
};

/**
 * Gate content based on tier level
 */
export const TierGate: React.FC<TierGateProps> = ({
  requiredTier,
  children,
  fallback,
  showUpgrade = true
}) => {
  const { hasTierAccess, tier } = useWhopAccess();

  if (hasTierAccess(requiredTier)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (showUpgrade) {
    return <UpgradePrompt requiredTier={requiredTier} currentTier={tier} />;
  }

  return null;
};

/**
 * Upgrade prompt component
 */
interface UpgradePromptProps {
  feature?: string;
  requiredTier?: WhopTier;
  currentTier: WhopTier;
}

const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  feature,
  requiredTier,
  currentTier
}) => {
  const tierIcons: Record<WhopTier, React.ReactNode> = {
    free: <Lock className="h-6 w-6" />,
    basic: <Zap className="h-6 w-6" />,
    pro: <Crown className="h-6 w-6" />,
    team: <Users className="h-6 w-6" />
  };

  const tierColors: Record<WhopTier, string> = {
    free: 'from-slate-500 to-slate-600',
    basic: 'from-blue-500 to-blue-600',
    pro: 'from-purple-500 to-purple-600',
    team: 'from-amber-500 to-amber-600'
  };

  const suggestedTier = requiredTier || 'pro';
  const tierInfo = WHOP_ACCESS_MATRIX[suggestedTier];

  const handleUpgrade = () => {
    const url = whopClient.getUpgradeUrl(suggestedTier);
    window.open(url, '_blank');
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-700 bg-slate-800/50 p-6">
      {/* Blur overlay */}
      <div className="absolute inset-0 backdrop-blur-sm bg-slate-900/30 z-10" />
      
      {/* Content */}
      <div className="relative z-20 text-center">
        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br ${tierColors[suggestedTier]} mb-4`}>
          {tierIcons[suggestedTier]}
        </div>
        
        <h3 className="text-xl font-bold text-white mb-2">
          {feature ? `Unlock ${formatFeatureName(feature)}` : `Upgrade to ${suggestedTier.charAt(0).toUpperCase() + suggestedTier.slice(1)}`}
        </h3>
        
        <p className="text-slate-400 mb-4 max-w-md mx-auto">
          {feature 
            ? `This feature requires a ${suggestedTier} subscription.`
            : `Get access to premium features with ${suggestedTier} tier.`
          }
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-4">
          <span className="text-3xl font-bold text-white">
            ${tierInfo.price}
          </span>
          <span className="text-slate-400">/month</span>
        </div>

        <button
          onClick={handleUpgrade}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all"
        >
          Upgrade Now
          <ArrowRight className="h-4 w-4" />
        </button>

        <p className="text-xs text-slate-500 mt-4">
          Currently on: {currentTier.charAt(0).toUpperCase() + currentTier.slice(1)} tier
        </p>
      </div>
    </div>
  );
};

/**
 * Pro badge component
 */
export const ProBadge: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs font-semibold rounded-full ${className}`}>
    <Crown className="h-3 w-3" />
    PRO
  </span>
);

/**
 * Team badge component
 */
export const TeamBadge: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold rounded-full ${className}`}>
    <Users className="h-3 w-3" />
    TEAM
  </span>
);

/**
 * Feature lock indicator
 */
export const FeatureLock: React.FC<{ 
  feature: string;
  size?: 'sm' | 'md' | 'lg';
}> = ({ feature, size = 'md' }) => {
  const { hasFeature } = useWhopAccess();
  
  if (hasFeature(feature)) {
    return null;
  }

  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  return (
    <Lock className={`${sizeClasses[size]} text-slate-500`} aria-label="Premium feature" />
  );
};

/**
 * Pricing card component
 */
interface PricingCardProps {
  tier: WhopTier;
  highlighted?: boolean;
  onSelect?: () => void;
}

export const PricingCard: React.FC<PricingCardProps> = ({
  tier,
  highlighted = false,
  onSelect
}) => {
  const tierInfo = WHOP_ACCESS_MATRIX[tier];
  const { tier: currentTier } = useWhopAccess();
  const isCurrentTier = tier === currentTier;

  const tierLabels: Record<WhopTier, string> = {
    free: 'Free',
    basic: 'Basic',
    pro: 'Professional',
    team: 'Team'
  };

  const tierDescriptions: Record<WhopTier, string> = {
    free: 'Get started with public dashboards',
    basic: 'Full data access with citations',
    pro: 'AI-powered insights and advanced features',
    team: 'Collaborate with your entire organization'
  };

  return (
    <div className={`relative rounded-xl border p-6 ${
      highlighted 
        ? 'border-purple-500 bg-purple-900/20' 
        : 'border-slate-700 bg-slate-800/50'
    }`}>
      {highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="px-3 py-1 bg-purple-500 text-white text-xs font-semibold rounded-full">
            MOST POPULAR
          </span>
        </div>
      )}

      <h3 className="text-xl font-bold text-white mb-1">
        {tierLabels[tier]}
      </h3>
      <p className="text-sm text-slate-400 mb-4">
        {tierDescriptions[tier]}
      </p>

      <div className="flex items-baseline gap-1 mb-6">
        <span className="text-4xl font-bold text-white">
          ${tierInfo.price}
        </span>
        <span className="text-slate-400">/mo</span>
      </div>

      <ul className="space-y-2 mb-6">
        {tierInfo.features.slice(0, 6).map((feature) => (
          <li key={feature} className="flex items-center gap-2 text-sm text-slate-300">
            <span className="text-emerald-400">✓</span>
            {formatFeatureName(feature)}
          </li>
        ))}
        {tierInfo.features.length > 6 && (
          <li className="text-sm text-slate-500">
            +{tierInfo.features.length - 6} more features
          </li>
        )}
      </ul>

      <button
        onClick={onSelect}
        disabled={isCurrentTier}
        className={`w-full py-2 px-4 rounded-lg font-semibold transition-colors ${
          isCurrentTier
            ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
            : highlighted
              ? 'bg-purple-500 text-white hover:bg-purple-600'
              : 'bg-slate-700 text-white hover:bg-slate-600'
        }`}
      >
        {isCurrentTier ? 'Current Plan' : tier === 'free' ? 'Get Started' : 'Upgrade'}
      </button>
    </div>
  );
};

/**
 * Format feature name for display
 */
function formatFeatureName(feature: string): string {
  return feature
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default FeatureGate;
