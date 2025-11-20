/**
 * Authentication Service
 * Handles user signup, login, logout, and session management
 */

import { supabase } from './supabase';
import type { User, Session, AuthError } from '@supabase/supabase-js';

export interface EdubizUser {
  id: string;
  user_id: string;
  email: string;
  full_name?: string;
  province_code?: string;
  tier: 'free' | 'edubiz' | 'pro';
  role_preference?: 'student' | 'teacher' | 'homeowner' | 'researcher' | 'general';
  ai_queries_today: number;
  stripe_customer_id?: string;
  subscription_status?: string;
  trial_ends_at?: string;
  created_at: string;
}

export interface SignUpData {
  email: string;
  password: string;
  full_name?: string;
  province_code?: string;
  role_preference?: string;
}

export interface SignInData {
  email: string;
  password: string;
}

/**
 * Sign up a new user
 */
export async function signUp(data: SignUpData): Promise<{
  user: User | null;
  session: Session | null;
  error: AuthError | null;
}> {
  try {
    // Sign up with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.full_name,
          province_code: data.province_code,
          role_preference: data.role_preference,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (authError) {
      console.error('Signup error:', authError);
      return { user: null, session: null, error: authError };
    }

    // The trigger function handles creating edubiz_users record automatically
    // But we can verify it was created
    if (authData.user) {
      // Wait a moment for trigger to execute
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify edubiz_users record exists
      const { data: edubizUser, error: edubizError } = await supabase
        .from('edubiz_users')
        .select('*')
        .eq('user_id', authData.user.id)
        .single();

      if (edubizError && edubizError.code !== 'PGRST116') { // PGRST116 = not found
        console.error('Error creating edubiz_users record:', edubizError);
      }

      console.log('Signup successful, edubiz_users record:', edubizUser);
    }

    return {
      user: authData.user,
      session: authData.session,
      error: null,
    };
  } catch (error) {
    console.error('Unexpected signup error:', error);
    return {
      user: null,
      session: null,
      error: error as AuthError,
    };
  }
}

/**
 * Sign in an existing user
 */
export async function signIn(data: SignInData): Promise<{
  user: User | null;
  session: Session | null;
  error: AuthError | null;
}> {
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (authError) {
      console.error('Sign in error:', authError);
      return { user: null, session: null, error: authError };
    }

    // Update last_login_at
    if (authData.user) {
      await supabase
        .from('edubiz_users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('user_id', authData.user.id);
    }

    return {
      user: authData.user,
      session: authData.session,
      error: null,
    };
  } catch (error) {
    console.error('Unexpected sign in error:', error);
    return {
      user: null,
      session: null,
      error: error as AuthError,
    };
  }
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<{ error: AuthError | null }> {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Sign out error:', error);
      return { error };
    }

    return { error: null };
  } catch (error) {
    console.error('Unexpected sign out error:', error);
    return { error: error as AuthError };
  }
}

/**
 * Get current session
 */
export async function getSession(): Promise<{
  session: Session | null;
  error: AuthError | null;
}> {
  try {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.error('Get session error:', error);
      return { session: null, error };
    }

    return { session: data.session, error: null };
  } catch (error) {
    console.error('Unexpected get session error:', error);
    return { session: null, error: error as AuthError };
  }
}

/**
 * Get current user
 */
export async function getCurrentUser(): Promise<{
  user: User | null;
  error: AuthError | null;
}> {
  try {
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      console.error('Get user error:', error);
      return { user: null, error };
    }

    return { user: data.user, error: null };
  } catch (error) {
    console.error('Unexpected get user error:', error);
    return { user: null, error: error as AuthError };
  }
}

/**
 * Get edubiz_users record for current user
 */
export async function getEdubizUser(userId: string): Promise<{
  edubizUser: EdubizUser | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from('edubiz_users')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Get edubiz user error:', error);
      return { edubizUser: null, error };
    }

    return { edubizUser: data as EdubizUser, error: null };
  } catch (error) {
    console.error('Unexpected get edubiz user error:', error);
    return { edubizUser: null, error: error as Error };
  }
}

/**
 * Check if user has access to a feature based on tier
 */
export async function canAccessFeature(
  userId: string,
  requiredTier: 'free' | 'edubiz' | 'pro'
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .rpc('can_access_feature', {
        p_user_id: userId,
        p_required_tier: requiredTier,
      });

    if (error) {
      console.error('Can access feature error:', error);
      return false;
    }

    return data as boolean;
  } catch (error) {
    console.error('Unexpected can access feature error:', error);
    return false;
  }
}

/**
 * Increment AI query count and check if limit reached
 */
export async function incrementAIQueries(userId: string): Promise<{
  queries_today: number;
  limit_reached: boolean;
  tier: string;
}> {
  try {
    const { data, error } = await supabase
      .rpc('increment_ai_queries', {
        p_user_id: userId,
      })
      .single();

    if (error) {
      console.error('Increment AI queries error:', error);
      throw error;
    }

    return data as { queries_today: number; limit_reached: boolean; tier: string };
  } catch (error) {
    console.error('Unexpected increment AI queries error:', error);
    throw error;
  }
}

/**
 * Update user tier (for manual upgrades during testing)
 */
export async function updateUserTier(
  userId: string,
  tier: 'free' | 'edubiz' | 'pro'
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { error } = await supabase
      .from('edubiz_users')
      .update({ tier })
      .eq('user_id', userId);

    if (error) {
      console.error('Update user tier error:', error);
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Unexpected update user tier error:', error);
    return { success: false, error: error as Error };
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordReset(email: string): Promise<{
  error: AuthError | null;
}> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
      console.error('Send password reset error:', error);
      return { error };
    }

    return { error: null };
  } catch (error) {
    console.error('Unexpected send password reset error:', error);
    return { error: error as AuthError };
  }
}

/**
 * Update password
 */
export async function updatePassword(newPassword: string): Promise<{
  error: AuthError | null;
}> {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      console.error('Update password error:', error);
      return { error };
    }

    return { error: null };
  } catch (error) {
    console.error('Unexpected update password error:', error);
    return { error: error as AuthError };
  }
}

/**
 * Listen to auth state changes
 */
export function onAuthStateChange(callback: (event: string, session: Session | null) => void) {
  return supabase.auth.onAuthStateChange(callback);
}
