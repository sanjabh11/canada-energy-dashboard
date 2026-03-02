/**
 * WhopTierGate - Tier-aware Feature Gating Component
 * 
 * Wraps content that should be restricted based on user's subscription tier.
 * Shows upgrade prompt for users who don't have access.
 * 
 * Tiers (Whop-aligned):
 * - free: Basic features only (Rate Watchdog free tier)
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Lock, Crown, Zap, Building2, AlertCircle } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { type CanonicalTier, normalizeTier, hasTierAccess, getTierDisplayName, getTierPrice } from '../../lib/entitlements';

// Legacy type alias for backward compatibility - use CanonicalTier from entitlements.ts
export type WhopTier = CanonicalTier;

interface WhopTierGateProps {
  /** Minimum tier required to view content */
  requiredTier: WhopTier;
  /** Content to show if user has access */
  children: React.ReactNode;
  /** Optional fallback content to show if user doesn't have access */
  fallback?: React.ReactNode;
  /** Show as inline badge vs full overlay */
  variant?: 'modal' | 'inline' | 'banner';
  /** Feature name for upgrade prompt */
  featureName?: string;
}

interface TierInfo {
  name: string;
  price: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TIER_HIERARCHY: Record<CanonicalTier, TierInfo> = {
  free: {
    name: 'Free',
    price: '$0',
    icon: Lock
  },
  basic: {
    name: 'Basic',
    price: '$49/mo',
    icon: Zap
  },
  pro: {
    name: 'Pro',
    price: '$149/mo',
    icon: Crown
  },
  team: {
    name: 'Team',
    price: '$299/mo',
    icon: Building2
  }
};

// Tier access check delegated to entitlements.ts hasTierAccess()

export function WhopTierGate({
  requiredTier,
  children,
  fallback,
  variant = 'modal',
  featureName
}: WhopTierGateProps) {
  // Get user's current tier
  const { tier } = useAuth();
  const normalizedUserTier = normalizeTier(tier);
  const hasRequiredAccess = hasTierAccess(normalizedUserTier, requiredTier);
  
  // If user has access, render children
  if (hasRequiredAccess) {
    return <>{children}</>;
  }
  
  // Otherwise, show upgrade prompt based on variant
  const tierInfo = TIER_HIERARCHY[requiredTier];
  const message = `${featureName || 'This feature'} requires ${tierInfo.name}`;
  
  if (variant === 'inline') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs">
        <Lock className="h-3 w-3" />
        {tierInfo.name}
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
            Upgrade {tierInfo.price}
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
            Unlock {featureName || 'this feature'} with {tierInfo.name} for {tierInfo.price}
          </p>
          <Link
            to="/pricing"
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
          >
            <Crown className="h-5 w-5" />
            Upgrade Now
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
  const { tier, isWhopUser } = useAuth();
  const normalizedTier = normalizeTier(tier);
  
  return {
    tier: normalizedTier,
    tierName: getTierDisplayName(normalizedTier),
    isWhopUser,
    hasAccess: (requiredTier: WhopTier) => hasTierAccess(normalizedTier, requiredTier),
    isFree: normalizedTier === 'free',
    isBasic: normalizedTier === 'basic',
    isPro: normalizedTier === 'pro',
    isTeam: normalizedTier === 'team',
    isPaid: normalizedTier !== 'free'
  };
}

export default WhopTierGate;
