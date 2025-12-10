/**
 * Whop SDK Integration for Canada Energy Academy
 * 
 * Implements access control, tier management, and user authentication
 * for the Whop Marketplace monetization strategy.
 * 
 * KEY CHANGES FOR WHOP COMPLIANCE:
 * - Uses Whop JWT authentication (no custom login)
 * - Integrates with @whop-sdk/core for real SDK ops
 * - Supports standalone mode for non-Whop deployments
 * 
 * Access Tiers:
 * - Free: Public dashboards only
 * - Basic ($29/mo): Full citations + French
 * - Pro ($99/mo): AI co-pilot + Policy Map + Impact Dashboard + Consent logs
 * - Team ($299/mo): Bulk seats + API key + Team management
 * 
 * Environment Variables:
 * - VITE_WHOP_API_KEY: Whop API key for production
 * - VITE_WHOP_MODE: 'live' | 'simulated' | 'standalone' (default: 'standalone')
 */

// Check if we're in live mode with real Whop SDK
const WHOP_MODE = import.meta.env.VITE_WHOP_MODE || 'standalone';
const WHOP_API_KEY = import.meta.env.VITE_WHOP_API_KEY || '';
const WHOP_CLIENT_ID = import.meta.env.VITE_WHOP_CLIENT_ID || '';

/**
 * Check if Whop is configured for live mode
 */
export function isWhopLiveMode(): boolean {
  return WHOP_MODE === 'live' && !!WHOP_API_KEY;
}

/**
 * Check if running in standalone mode (no Whop)
 */
export function isStandaloneMode(): boolean {
  return WHOP_MODE === 'standalone';
}

/**
 * Get Whop configuration status
 */
export function getWhopConfigStatus(): {
  mode: 'live' | 'simulated' | 'standalone';
  hasApiKey: boolean;
  hasClientId: boolean;
  ready: boolean;
  message: string;
} {
  const mode = WHOP_MODE as 'live' | 'simulated' | 'standalone';
  const hasApiKey = !!WHOP_API_KEY;
  const hasClientId = !!WHOP_CLIENT_ID;

  let ready = false;
  let message = '';

  if (mode === 'live') {
    ready = hasApiKey && hasClientId;
    message = ready ? 'Whop live mode active' : 'Missing VITE_WHOP_API_KEY or VITE_WHOP_CLIENT_ID';
  } else if (mode === 'simulated') {
    ready = true;
    message = 'Running in simulated Whop mode';
  } else {
    ready = true;
    message = 'Running in standalone mode (no Whop integration)';
  }

  return { mode, hasApiKey, hasClientId, ready, message };
}

// Whop SDK types
export type WhopTier = 'free' | 'basic' | 'pro' | 'team';

export interface WhopUser {
  id: string;
  email: string;
  name?: string;
  tier: WhopTier;
  teamId?: string;
  apiKey?: string;
  subscriptionStatus: 'active' | 'cancelled' | 'past_due' | 'trialing' | 'none';
  subscriptionEndDate?: string;
  features: string[];
  createdAt: string;
  lastLoginAt: string;
  isWhopUser: boolean; // true = authenticated via Whop, false = standalone/guest
}

export interface WhopTeam {
  id: string;
  name: string;
  ownerId: string;
  memberCount: number;
  maxMembers: number;
  tier: 'team';
  apiKey: string;
  createdAt: string;
}

export interface WhopAccessMatrix {
  tier: WhopTier;
  price: number;
  features: string[];
  limits: {
    apiCallsPerDay: number;
    teamMembers: number;
    exportFormats: string[];
    dataRetentionDays: number;
    aiQueriesPerDay: number;
  };
}

// Access tier definitions
export const WHOP_ACCESS_MATRIX: Record<WhopTier, WhopAccessMatrix> = {
  free: {
    tier: 'free',
    price: 0,
    features: [
      'public_dashboards',
      'basic_charts',
      'sample_data',
      'help_tooltips',
      'certificates_preview'
    ],
    limits: {
      apiCallsPerDay: 100,
      teamMembers: 1,
      exportFormats: ['csv'],
      dataRetentionDays: 7,
      aiQueriesPerDay: 5
    }
  },
  basic: {
    tier: 'basic',
    price: 29,
    features: [
      'public_dashboards',
      'basic_charts',
      'full_data_access',
      'data_citations',
      'french_language',
      'help_tooltips',
      'data_freshness_badges',
      'email_support',
      'certificate_tracks',
      'module_access'
    ],
    limits: {
      apiCallsPerDay: 1000,
      teamMembers: 1,
      exportFormats: ['csv', 'json'],
      dataRetentionDays: 30,
      aiQueriesPerDay: 25
    }
  },
  pro: {
    tier: 'pro',
    price: 99,
    features: [
      'public_dashboards',
      'basic_charts',
      'full_data_access',
      'data_citations',
      'french_language',
      'help_tooltips',
      'data_freshness_badges',
      'ai_copilot',
      'policy_dependency_map',
      'impact_metrics_dashboard',
      'consent_audit_logs',
      'crisis_simulator',
      'ai_demand_scenarios',
      'indigenous_case_studies',
      'advanced_analytics',
      'priority_support',
      'custom_alerts',
      'certificate_tracks',
      'module_access',
      'cohort_management',
      'unlimited_ai_queries'
    ],
    limits: {
      apiCallsPerDay: 10000,
      teamMembers: 1,
      exportFormats: ['csv', 'json', 'xlsx', 'pdf'],
      dataRetentionDays: 365,
      aiQueriesPerDay: 100
    }
  },
  team: {
    tier: 'team',
    price: 299,
    features: [
      'public_dashboards',
      'basic_charts',
      'full_data_access',
      'data_citations',
      'french_language',
      'help_tooltips',
      'data_freshness_badges',
      'ai_copilot',
      'policy_dependency_map',
      'impact_metrics_dashboard',
      'consent_audit_logs',
      'crisis_simulator',
      'ai_demand_scenarios',
      'indigenous_case_studies',
      'advanced_analytics',
      'priority_support',
      'custom_alerts',
      'team_management',
      'bulk_seats',
      'api_access',
      'white_label_reports',
      'dedicated_support',
      'sla_guarantee',
      'certificate_tracks',
      'module_access',
      'cohort_management',
      'unlimited_ai_queries',
      'creator_dashboard'
    ],
    limits: {
      apiCallsPerDay: 100000,
      teamMembers: 25,
      exportFormats: ['csv', 'json', 'xlsx', 'pdf', 'api'],
      dataRetentionDays: 730,
      aiQueriesPerDay: -1 // unlimited
    }
  }
};

// Feature to tier mapping for quick lookups
export const FEATURE_TIER_MAP: Record<string, WhopTier[]> = {
  public_dashboards: ['free', 'basic', 'pro', 'team'],
  basic_charts: ['free', 'basic', 'pro', 'team'],
  sample_data: ['free'],
  full_data_access: ['basic', 'pro', 'team'],
  data_citations: ['basic', 'pro', 'team'],
  french_language: ['basic', 'pro', 'team'],
  help_tooltips: ['free', 'basic', 'pro', 'team'],
  data_freshness_badges: ['basic', 'pro', 'team'],
  ai_copilot: ['pro', 'team'],
  policy_dependency_map: ['pro', 'team'],
  impact_metrics_dashboard: ['pro', 'team'],
  consent_audit_logs: ['pro', 'team'],
  crisis_simulator: ['pro', 'team'],
  ai_demand_scenarios: ['pro', 'team'],
  indigenous_case_studies: ['pro', 'team'],
  advanced_analytics: ['pro', 'team'],
  team_management: ['team'],
  bulk_seats: ['team'],
  api_access: ['team'],
  white_label_reports: ['team'],
  email_support: ['basic', 'pro', 'team'],
  priority_support: ['pro', 'team'],
  dedicated_support: ['team'],
  sla_guarantee: ['team'],
  certificate_tracks: ['basic', 'pro', 'team'],
  module_access: ['basic', 'pro', 'team'],
  cohort_management: ['pro', 'team'],
  creator_dashboard: ['team'],
  unlimited_ai_queries: ['pro', 'team']
};

/**
 * Verify Whop JWT token
 * In production, this validates the x-whop-user-token header
 */
export async function verifyWhopToken(token: string): Promise<{
  valid: boolean;
  userId?: string;
  email?: string;
  tier?: WhopTier;
  error?: string;
}> {
  if (!token) {
    return { valid: false, error: 'No token provided' };
  }

  if (isStandaloneMode()) {
    return { valid: false, error: 'Running in standalone mode' };
  }

  if (!isWhopLiveMode()) {
    // Simulated mode - decode mock JWT
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        valid: true,
        userId: payload.sub || payload.user_id,
        email: payload.email,
        tier: payload.tier || 'free'
      };
    } catch {
      return { valid: false, error: 'Invalid token format' };
    }
  }

  // Live mode - verify with Whop API
  try {
    const response = await fetch('https://api.whop.com/v5/me', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return { valid: false, error: `Whop API error: ${response.status}` };
    }

    const data = await response.json();

    // Determine tier from Whop membership data
    let tier: WhopTier = 'free';
    if (data.memberships && data.memberships.length > 0) {
      const activeMembership = data.memberships.find((m: any) => m.status === 'active');
      if (activeMembership) {
        // Map Whop product to our tiers
        tier = mapWhopProductToTier(activeMembership.product_id);
      }
    }

    return {
      valid: true,
      userId: data.id,
      email: data.email,
      tier
    };
  } catch (error) {
    return { valid: false, error: `Token verification failed: ${error}` };
  }
}

/**
 * Map Whop product ID to our tier system
 * Configure these in your Whop dashboard
 */
function mapWhopProductToTier(productId: string): WhopTier {
  const tierMap: Record<string, WhopTier> = {
    // These should match your Whop product IDs
    'prod_basic': 'basic',
    'prod_pro': 'pro',
    'prod_team': 'team',
    // Add your actual Whop product IDs here
  };
  return tierMap[productId] || 'free';
}

/**
 * Get Whop OAuth URL for login
 */
export function getWhopLoginUrl(redirectUri?: string): string {
  const clientId = WHOP_CLIENT_ID;
  const redirect = redirectUri || window.location.origin + '/auth/whop/callback';

  if (!clientId) {
    console.warn('[Whop] No client ID configured, returning placeholder URL');
    return '#';
  }

  return `https://whop.com/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirect)}&response_type=code`;
}

/**
 * Handle Whop OAuth callback
 */
export async function handleWhopCallback(code: string): Promise<{
  success: boolean;
  user?: WhopUser;
  error?: string;
}> {
  if (!code) {
    return { success: false, error: 'No authorization code provided' };
  }

  if (isStandaloneMode()) {
    return { success: false, error: 'Whop integration not enabled in standalone mode' };
  }

  try {
    // Exchange code for token via your backend
    // In production, this should go through your Supabase Edge Function
    const response = await fetch('/api/auth/whop/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });

    if (!response.ok) {
      return { success: false, error: 'Failed to exchange authorization code' };
    }

    const data = await response.json();
    const user = await whopClient.loginFromToken(data.access_token);

    return { success: true, user };
  } catch (error) {
    return { success: false, error: `OAuth callback failed: ${error}` };
  }
}

/**
 * Check if user has access to a specific experience
 * Used for Whop iframe integration
 */
export async function checkWhopAccess(userId: string, experienceId?: string): Promise<{
  hasAccess: boolean;
  tier: WhopTier;
  features: string[];
}> {
  if (isStandaloneMode()) {
    // Standalone mode - use local user data
    const user = whopClient.getCurrentUser();
    return {
      hasAccess: true,
      tier: user?.tier || 'free',
      features: user?.features || WHOP_ACCESS_MATRIX.free.features
    };
  }

  // TODO: Implement checkAccess via @whop-sdk/core when running in iframe
  // For now, use the current user's cached data
  const user = whopClient.getCurrentUser();
  return {
    hasAccess: !!user,
    tier: user?.tier || 'free',
    features: user?.features || WHOP_ACCESS_MATRIX.free.features
  };
}

/**
 * Whop Client - handles authentication and access control
 */
class WhopClient {
  private currentUser: WhopUser | null = null;
  private initialized: boolean = false;

  /**
   * Initialize Whop SDK
   */
  async initialize(): Promise<void> {
    const config = getWhopConfigStatus();
    console.info(`[Whop] Initializing in ${config.mode} mode: ${config.message}`);

    this.initialized = true;

    // Check for existing session
    const storedUser = localStorage.getItem('whop_user');
    if (storedUser) {
      try {
        this.currentUser = JSON.parse(storedUser);
      } catch {
        localStorage.removeItem('whop_user');
      }
    }

    // Check for Whop token in URL params (iframe mode)
    if (!isStandaloneMode()) {
      await this.checkWhopIframeSession();
    }
  }

  /**
   * Check for Whop session when embedded in iframe
   */
  private async checkWhopIframeSession(): Promise<void> {
    // Get token from URL if present (Whop passes it on initial load)
    const urlParams = new URLSearchParams(window.location.search);
    const whopToken = urlParams.get('whop_token');

    if (whopToken) {
      const verified = await verifyWhopToken(whopToken);
      if (verified.valid && verified.userId) {
        await this.loginFromToken(whopToken);
        // Clean up URL
        urlParams.delete('whop_token');
        const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
        window.history.replaceState({}, '', newUrl);
      }
    }
  }

  /**
   * Get current user
   */
  getCurrentUser(): WhopUser | null {
    return this.currentUser;
  }

  /**
   * Get current tier
   */
  getCurrentTier(): WhopTier {
    return this.currentUser?.tier || 'free';
  }

  /**
   * Check if user has access to a feature
   */
  hasFeature(feature: string): boolean {
    const userTier = this.getCurrentTier();
    const allowedTiers = FEATURE_TIER_MAP[feature];

    if (!allowedTiers) {
      // Unknown feature - default to free access
      return true;
    }

    return allowedTiers.includes(userTier);
  }

  /**
   * Check if user has access to a specific tier level
   */
  hasTierAccess(requiredTier: WhopTier): boolean {
    const tierOrder: WhopTier[] = ['free', 'basic', 'pro', 'team'];
    const userTierIndex = tierOrder.indexOf(this.getCurrentTier());
    const requiredTierIndex = tierOrder.indexOf(requiredTier);

    return userTierIndex >= requiredTierIndex;
  }

  /**
   * Get access matrix for current user
   */
  getAccessMatrix(): WhopAccessMatrix {
    return WHOP_ACCESS_MATRIX[this.getCurrentTier()];
  }

  /**
   * Login from Whop JWT token
   */
  async loginFromToken(token: string): Promise<WhopUser> {
    const verified = await verifyWhopToken(token);

    if (!verified.valid) {
      throw new Error(verified.error || 'Invalid token');
    }

    const user: WhopUser = {
      id: verified.userId!,
      email: verified.email || '',
      tier: verified.tier || 'free',
      subscriptionStatus: 'active',
      features: WHOP_ACCESS_MATRIX[verified.tier || 'free'].features,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      isWhopUser: true
    };

    this.currentUser = user;
    localStorage.setItem('whop_user', JSON.stringify(user));
    localStorage.setItem('whop_token', token);

    return user;
  }

  /**
   * Login as guest (standalone mode)
   * Provides free tier access without Whop authentication
   */
  loginAsGuest(): WhopUser {
    const user: WhopUser = {
      id: `guest_${Date.now()}`,
      email: '',
      tier: 'free',
      subscriptionStatus: 'none',
      features: WHOP_ACCESS_MATRIX.free.features,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      isWhopUser: false
    };

    this.currentUser = user;
    localStorage.setItem('whop_user', JSON.stringify(user));

    return user;
  }

  /**
   * Simulate login for development/demo (only in simulated mode)
   */
  async simulateLogin(tier: WhopTier = 'free'): Promise<WhopUser> {
    if (isWhopLiveMode()) {
      throw new Error('Cannot simulate login in live mode');
    }

    const user: WhopUser = {
      id: `sim_${Date.now()}`,
      email: 'demo@ceip.ca',
      name: 'Demo User',
      tier,
      subscriptionStatus: 'active',
      features: WHOP_ACCESS_MATRIX[tier].features,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      isWhopUser: false
    };

    this.currentUser = user;
    localStorage.setItem('whop_user', JSON.stringify(user));

    return user;
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    this.currentUser = null;
    localStorage.removeItem('whop_user');
    localStorage.removeItem('whop_token');
  }

  /**
   * Get upgrade URL for a specific tier
   */
  getUpgradeUrl(tier: WhopTier): string {
    // TODO: Replace with your actual Whop product URLs
    const productMap: Record<WhopTier, string> = {
      free: '#',
      basic: 'https://whop.com/canada-energy-academy/?d2c=true&plan=basic',
      pro: 'https://whop.com/canada-energy-academy/?d2c=true&plan=pro',
      team: 'https://whop.com/canada-energy-academy/?d2c=true&plan=team'
    };
    return productMap[tier];
  }

  /**
   * Sync user from Whop webhook
   * Called by Supabase Edge Function when Whop sends webhook
   */
  async syncFromWebhook(webhookData: {
    userId: string;
    email: string;
    tier: WhopTier;
    status: 'active' | 'cancelled' | 'past_due';
  }): Promise<void> {
    if (this.currentUser?.id === webhookData.userId) {
      this.currentUser = {
        ...this.currentUser,
        tier: webhookData.tier,
        subscriptionStatus: webhookData.status,
        features: WHOP_ACCESS_MATRIX[webhookData.tier].features
      };
      localStorage.setItem('whop_user', JSON.stringify(this.currentUser));
    }
  }
}

// Singleton instance
export const whopClient = new WhopClient();

/**
 * React hook for Whop access control
 */
export function useWhopAccess() {
  const user = whopClient.getCurrentUser();
  const tier = whopClient.getCurrentTier();
  const matrix = whopClient.getAccessMatrix();
  const config = getWhopConfigStatus();

  return {
    user,
    tier,
    matrix,
    config,
    isAuthenticated: !!user,
    isWhopUser: user?.isWhopUser ?? false,
    isStandalone: isStandaloneMode(),
    isPro: tier === 'pro' || tier === 'team',
    isTeam: tier === 'team',
    hasFeature: (feature: string) => whopClient.hasFeature(feature),
    hasTierAccess: (requiredTier: WhopTier) => whopClient.hasTierAccess(requiredTier),
    loginFromToken: whopClient.loginFromToken.bind(whopClient),
    loginAsGuest: whopClient.loginAsGuest.bind(whopClient),
    simulateLogin: whopClient.simulateLogin.bind(whopClient),
    logout: whopClient.logout.bind(whopClient),
    getUpgradeUrl: whopClient.getUpgradeUrl.bind(whopClient),
    getWhopLoginUrl
  };
}

/**
 * Feature gate component props
 */
export interface FeatureGateProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Tier gate component props
 */
export interface TierGateProps {
  requiredTier: WhopTier;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

// Initialize on module load
if (typeof window !== 'undefined') {
  whopClient.initialize();
}
