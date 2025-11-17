/**
 * AuthProvider - React Context for Authentication State
 *
 * Provides global auth state to the entire app:
 * - Current user
 * - Current session
 * - User tier (free/edubiz/pro)
 * - Loading state
 * - Sign in/out functions
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import {
  getCurrentUser,
  getSession,
  signOut as authSignOut,
  onAuthStateChange,
  getEdubizUser,
  type EdubizUser
} from '../../lib/authService';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  edubizUser: EdubizUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [edubizUser, setEdubizUser] = useState<EdubizUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch edubiz_users record when user changes
  useEffect(() => {
    if (user?.id) {
      loadEdubizUser(user.id);
    } else {
      setEdubizUser(null);
    }
  }, [user?.id]);

  // Load edubiz_users record
  const loadEdubizUser = async (userId: string) => {
    try {
      const { edubizUser: data, error } = await getEdubizUser(userId);
      if (error) {
        console.error('Error loading edubiz user:', error);
        return;
      }
      setEdubizUser(data);
    } catch (error) {
      console.error('Unexpected error loading edubiz user:', error);
    }
  };

  // Refresh user data (useful after tier upgrades)
  const refreshUser = async () => {
    if (user?.id) {
      await loadEdubizUser(user.id);
    }
  };

  // Sign out function
  const handleSignOut = async () => {
    try {
      await authSignOut();
      setUser(null);
      setSession(null);
      setEdubizUser(null);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // Initialize auth state on mount
  useEffect(() => {
    // Get initial session
    const initAuth = async () => {
      try {
        const { session: currentSession } = await getSession();
        setSession(currentSession);

        if (currentSession?.user) {
          setUser(currentSession.user);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: authListener } = onAuthStateChange((event, newSession) => {
      console.log('Auth state changed:', event);
      setSession(newSession);
      setUser(newSession?.user ?? null);

      // Handle specific events
      if (event === 'SIGNED_IN') {
        console.log('User signed in');
      } else if (event === 'SIGNED_OUT') {
        console.log('User signed out');
        setEdubizUser(null);
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed');
      }
    });

    // Cleanup
    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const value: AuthContextType = {
    user,
    session,
    edubizUser,
    loading,
    signOut: handleSignOut,
    refreshUser,
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

// Helper hook to check if user has specific tier
export function useHasTier(requiredTier: 'free' | 'edubiz' | 'pro'): boolean {
  const { edubizUser } = useAuth();

  if (!edubizUser) return false;

  const tierHierarchy = { free: 0, edubiz: 1, pro: 2 };
  const userTierLevel = tierHierarchy[edubizUser.tier];
  const requiredTierLevel = tierHierarchy[requiredTier];

  return userTierLevel >= requiredTierLevel;
}

// Helper hook to get user's tier
export function useUserTier(): 'free' | 'edubiz' | 'pro' | null {
  const { edubizUser } = useAuth();
  return edubizUser?.tier ?? null;
}
