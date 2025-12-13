/**
 * ProtectedRoute - Route wrapper for tier-based access control
 *
 * Usage:
 * <ProtectedRoute requiredTier="edubiz">
 *   <CertificateTrackPage />
 * </ProtectedRoute>
 *
 * Features:
 * - Redirects to auth modal if not logged in
 * - Shows upgrade modal if tier insufficient
 * - Loading state while checking auth
 */

import React, { useState, useEffect } from 'react';
import { useAuth, useHasTier } from './AuthProvider';
import { AuthModal } from './AuthModal';
import { UpgradeModal } from './UpgradeModal';
import { type WhopTier } from '../../lib/whop';

// Map legacy tier names to Whop tiers
type LegacyTier = 'free' | 'edubiz' | 'pro';
const legacyToWhopTier: Record<LegacyTier, WhopTier> = {
  'free': 'free',
  'edubiz': 'basic',
  'pro': 'pro'
};

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredTier?: LegacyTier; // Accept legacy tier names for backward compat
  fallback?: React.ReactNode;
}

export function ProtectedRoute({
  children,
  requiredTier = 'free',
  fallback,
}: ProtectedRouteProps) {
  const { user, loading, edubizUser } = useAuth();
  const whopTier = legacyToWhopTier[requiredTier];
  const hasTier = useHasTier(whopTier);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    // If not loading and user is not authenticated, show auth modal
    if (!loading && !user) {
      setShowAuthModal(true);
    }

    // If user is authenticated but doesn't have required tier, show upgrade modal
    if (!loading && user && !hasTier) {
      setShowUpgradeModal(true);
    }
  }, [loading, user, hasTier]);

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Show auth modal if not authenticated - Whop-friendly language
  if (!user) {
    return (
      <>
        {fallback || (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center max-w-md">
              <h2 className="text-2xl font-bold text-white mb-4">
                Get Started to Continue
              </h2>
              <p className="text-slate-400 mb-6">
                Continue with Whop or browse as a guest to access this feature
              </p>
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all"
              >
                Get Started
              </button>
            </div>
          </div>
        )}
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => setShowAuthModal(false)}
        />
      </>
    );
  }

  // Show upgrade modal if tier insufficient
  if (!hasTier) {
    return (
      <>
        {fallback || (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center max-w-md">
              <h2 className="text-2xl font-bold text-white mb-4">
                Upgrade required
              </h2>
              <p className="text-slate-400 mb-2">
                This feature requires <span className="text-cyan-400 font-semibold capitalize">{requiredTier}</span> tier
              </p>
              <p className="text-sm text-slate-500 mb-6">
                Your current tier: <span className="capitalize">{edubizUser?.tier || 'free'}</span>
              </p>
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all"
              >
                Upgrade to {requiredTier}
              </button>
            </div>
          </div>
        )}
        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          targetTier={requiredTier === 'free' ? 'edubiz' : requiredTier}
        />
      </>
    );
  }

  // User has access, render children
  return <>{children}</>;
}

// Helper component for inline tier checks (not full routes)
export function RequiresTier({
  children,
  requiredTier,
  fallback,
}: {
  children: React.ReactNode;
  requiredTier: LegacyTier;
  fallback?: React.ReactNode;
}) {
  const whopTier = legacyToWhopTier[requiredTier];
  const hasTier = useHasTier(whopTier);

  if (!hasTier) {
    return <>{fallback || null}</>;
  }

  return <>{children}</>;
}
