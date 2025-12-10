/**
 * AuthProvider - React Context for Authentication State
 *
 * UPDATED FOR WHOP INTEGRATION:
 * - Supports Whop JWT authentication
 * - Supports standalone mode with guest access
 * - Maintains backward compatibility with Supabase for data storage
 * - NO custom email/password login (Whop compliance)
 * 
 * Provides global auth state to the entire app:
 * - Current user (Whop or guest)
 * - User tier (free/basic/pro/team)
 * - Loading state
 * - Sign in/out functions
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  whopClient,
  useWhopAccess,
  isStandaloneMode,
  isWhopLiveMode,
  getWhopConfigStatus,
  handleWhopCallback,
  type WhopUser,
  type WhopTier
} from '../../lib/whop';

// Legacy Supabase imports - kept for data fetching only
import { supabase } from '../../lib/supabase';

interface AuthContextType {
  // Whop user (primary)
  user: WhopUser | null;
  tier: WhopTier;
  loading: boolean;

  // Auth state
  isAuthenticated: boolean;
  isWhopUser: boolean;
  isGuest: boolean;

  // Actions
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  openAuthModal: () => void;

  // Legacy compatibility
  edubizUser: LegacyEdubizUser | null;

  // Access control
  hasFeature: (feature: string) => boolean;
  hasTierAccess: (requiredTier: WhopTier) => boolean;
}

// Legacy type for backward compatibility
interface LegacyEdubizUser {
  id: string;
  user_id: string;
  email: string;
  full_name?: string;
  province_code?: string;
  tier: 'free' | 'edubiz' | 'pro';
  role_preference?: string;
  ai_queries_today: number;
  stripe_customer_id?: string;
  subscription_status?: string;
  trial_ends_at?: string;
  created_at: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth modal state (simple global for modal trigger)
let openAuthModalFn: (() => void) | null = null;

export function setAuthModalOpener(fn: () => void) {
  openAuthModalFn = fn;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<WhopUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [legacyEdubizUser, setLegacyEdubizUser] = useState<LegacyEdubizUser | null>(null);

  // Get Whop access helpers
  const whopAccess = useWhopAccess();

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check for Whop OAuth callback
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');

        if (code && !isStandaloneMode()) {
          // Handle Whop OAuth callback
          const result = await handleWhopCallback(code);
          if (result.success && result.user) {
            setUser(result.user);
          }
          // Clean URL
          window.history.replaceState({}, '', window.location.pathname);
        } else {
          // Get existing session from Whop client
          const existingUser = whopClient.getCurrentUser();
          if (existingUser) {
            setUser(existingUser);
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // Sync with legacy Supabase data when user changes
  useEffect(() => {
    if (user?.email && user.isWhopUser) {
      syncLegacyData(user.email);
    } else {
      setLegacyEdubizUser(null);
    }
  }, [user?.email, user?.isWhopUser]);

  // Sync with legacy Supabase edubiz_users table
  const syncLegacyData = async (email: string) => {
    try {
      const { data, error } = await supabase
        .from('edubiz_users')
        .select('*')
        .eq('email', email)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching legacy data:', error);
        return;
      }

      if (data) {
        setLegacyEdubizUser(data as LegacyEdubizUser);
      }
    } catch (error) {
      console.error('Unexpected error syncing legacy data:', error);
    }
  };

  // Refresh user data
  const refreshUser = useCallback(async () => {
    const currentUser = whopClient.getCurrentUser();
    if (currentUser) {
      setUser({ ...currentUser, lastLoginAt: new Date().toISOString() });
      if (currentUser.email) {
        await syncLegacyData(currentUser.email);
      }
    }
  }, []);

  // Sign out function
  const handleSignOut = useCallback(async () => {
    try {
      await whopClient.logout();
      setUser(null);
      setLegacyEdubizUser(null);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }, []);

  // Open auth modal
  const openAuthModal = useCallback(() => {
    if (openAuthModalFn) {
      openAuthModalFn();
    } else {
      console.warn('Auth modal opener not set');
    }
  }, []);

  // Feature access check
  const hasFeature = useCallback((feature: string): boolean => {
    return whopClient.hasFeature(feature);
  }, []);

  // Tier access check
  const hasTierAccess = useCallback((requiredTier: WhopTier): boolean => {
    return whopClient.hasTierAccess(requiredTier);
  }, []);

  // Map Whop tier to legacy tier for backward compatibility
  const mapToLegacyEdubizUser = (): LegacyEdubizUser | null => {
    if (!user) return legacyEdubizUser;

    // If we have legacy data, use it
    if (legacyEdubizUser) return legacyEdubizUser;

    // Otherwise, create a virtual legacy user from Whop data
    const legacyTierMap: Record<WhopTier, 'free' | 'edubiz' | 'pro'> = {
      'free': 'free',
      'basic': 'edubiz',
      'pro': 'pro',
      'team': 'pro'
    };

    return {
      id: user.id,
      user_id: user.id,
      email: user.email,
      full_name: user.name,
      tier: legacyTierMap[user.tier],
      ai_queries_today: 0,
      created_at: user.createdAt
    };
  };

  const value: AuthContextType = {
    user,
    tier: user?.tier || 'free',
    loading,
    isAuthenticated: !!user,
    isWhopUser: user?.isWhopUser ?? false,
    isGuest: !!user && !user.isWhopUser,
    signOut: handleSignOut,
    refreshUser,
    openAuthModal,
    edubizUser: mapToLegacyEdubizUser(),
    hasFeature,
    hasTierAccess,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Helper hook to check if user has specific tier (Whop-based)
export function useHasTier(requiredTier: WhopTier): boolean {
  const { hasTierAccess } = useAuth();
  return hasTierAccess(requiredTier);
}

// Helper hook to get user's tier
export function useUserTier(): WhopTier {
  const { tier } = useAuth();
  return tier;
}

// Helper hook to check feature access
export function useHasFeature(feature: string): boolean {
  const { hasFeature } = useAuth();
  return hasFeature(feature);
}

// Legacy compatibility hook - maps to old tier names
export function useLegacyTier(): 'free' | 'edubiz' | 'pro' | null {
  const { edubizUser } = useAuth();
  return edubizUser?.tier ?? null;
}
