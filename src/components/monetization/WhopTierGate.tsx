/**
 * WhopTierGate - Tier-aware Feature Gating Component
 * 
 * Wraps content that should be restricted based on user's subscription tier.
 * Shows upgrade prompt for users who don't have access.
 * 
 * Tiers (Whop-aligned):
 * - free: Basic features only (Rate Watchdog free tier)
 * - watchdog: Alberta Rate Watchdog ($9/mo)
 * - advanced: CEIP Advanced ($29/mo)
 * - enterprise: CEIP Enterprise ($99/mo)
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Lock, Crown, Sparkles, ArrowRight } from 'lucide-react';
import { useAuth } from '../auth';

export type WhopTier = 'free' | 'watchdog' | 'advanced' | 'enterprise';

interface WhopTierGateProps {
  /** Minimum tier required to view content */
  requiredTier: WhopTier;
  /** Content to show if user has access */
  children: React.ReactNode;
  /** Optional custom locked message */
  lockedMessage?: string;
  /** Show as inline badge vs full overlay */
  variant?: 'overlay' | 'inline' | 'banner';
  /** Feature name for upgrade prompt */
  featureName?: string;
}

// Tier hierarchy for comparison
const TIER_LEVELS: Record<WhopTier, number> = {
  free: 0,
  watchdog: 1,
  advanced: 2,
  enterprise: 3
};

const TIER_NAMES: Record<WhopTier, string> = {
  free: 'Free',
  watchdog: 'Rate Watchdog',
  advanced: 'CEIP Advanced',
  enterprise: 'CEIP Enterprise'
};

const TIER_PRICES: Record<WhopTier, number> = {
  free: 0,
  watchdog: 9,
  advanced: 29,
  enterprise: 99
};

/**
 * Check if user's tier meets the required tier level
 */
export function hasTierAccess(userTier: WhopTier | string | null | undefined, requiredTier: WhopTier): boolean {
  const normalizedUserTier = normalizeUserTier(userTier);
  return TIER_LEVELS[normalizedUserTier] >= TIER_LEVELS[requiredTier];
}

/**
 * Normalize various tier string formats to WhopTier
 */
export function normalizeUserTier(tier: string | null | undefined): WhopTier {
  if (!tier) return 'free';
  
  const lowerTier = tier.toLowerCase();
  
  // Map various tier names to WhopTier
  if (lowerTier === 'free' || lowerTier === 'guest') return 'free';
  if (lowerTier === 'watchdog' || lowerTier === 'basic' || lowerTier === 'base') return 'watchdog';
  if (lowerTier === 'advanced' || lowerTier === 'pro' || lowerTier === 'edubiz') return 'advanced';
  if (lowerTier === 'enterprise') return 'enterprise';
  
  return 'free';
}

export function WhopTierGate({
  requiredTier,
  children,
  lockedMessage,
  variant = 'overlay',
  featureName
}: WhopTierGateProps) {
  const { edubizUser, isWhopUser } = useAuth();
  
  // Get user's current tier
  const userTier = normalizeUserTier(edubizUser?.tier);
  const hasAccess = hasTierAccess(userTier, requiredTier);
  
  // If user has access, render children
  if (hasAccess) {
    return <>{children}</>;
  }
  
  // Otherwise, show upgrade prompt based on variant
  const tierName = TIER_NAMES[requiredTier];
  const tierPrice = TIER_PRICES[requiredTier];
  const message = lockedMessage || `${featureName || 'This feature'} requires ${tierName}`;
  
  if (variant === 'inline') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs">
        <Lock className="h-3 w-3" />
        {tierName}
      </span>
    );
  }
  
  if (variant === 'banner') {
    return (
      <div className="bg-gradient-to-r from-purple-900/30 to-indigo-900/30 border border-purple-500/30 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Lock className="h-5 w-5 text-purple-400" />
            <div>
              <div className="font-medium text-white">{message}</div>
              <div className="text-sm text-slate-400">Upgrade to unlock this feature</div>
            </div>
          </div>
          <Link
            to="/pricing"
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Crown className="h-4 w-4" />
            Upgrade ${tierPrice}/mo
          </Link>
        </div>
      </div>
    );
  }
  
  // Default: overlay variant
  return (
    <div className="relative">
      {/* Blurred content preview */}
      <div className="filter blur-sm pointer-events-none select-none opacity-50">
        {children}
      </div>
      
      {/* Overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm rounded-xl">
        <div className="text-center p-6 max-w-sm">
          <div className="p-3 bg-purple-500/20 rounded-full w-fit mx-auto mb-4">
            <Lock className="h-8 w-8 text-purple-400" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">{message}</h3>
          <p className="text-sm text-slate-400 mb-4">
            Unlock {featureName || 'this feature'} with {tierName} for ${tierPrice}/month
          </p>
          <Link
            to="/pricing"
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
          >
            <Sparkles className="h-5 w-5" />
            Upgrade Now
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to check tier access
 */
export function useWhopTier() {
  const { edubizUser, isWhopUser } = useAuth();
  const userTier = normalizeUserTier(edubizUser?.tier);
  
  return {
    tier: userTier,
    tierName: TIER_NAMES[userTier],
    tierLevel: TIER_LEVELS[userTier],
    isWhopUser,
    hasAccess: (requiredTier: WhopTier) => hasTierAccess(userTier, requiredTier),
    isFree: userTier === 'free',
    isWatchdog: userTier === 'watchdog',
    isAdvanced: userTier === 'advanced',
    isEnterprise: userTier === 'enterprise',
    isPaid: userTier !== 'free'
  };
}

export default WhopTierGate;
