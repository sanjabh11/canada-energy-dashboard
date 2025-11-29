/**
 * Whop SDK Integration for CEIP
 * 
 * Implements access control, tier management, and user sync
 * for the Whop Marketplace monetization strategy.
 * 
 * Addresses Gap #7: Whop SDK B2B Tools (HIGH Priority)
 * 
 * Access Tiers:
 * - Free: Public dashboards only
 * - Basic ($29/mo): Full citations + French
 * - Pro ($99/mo): AI co-pilot + Policy Map + Impact Dashboard + Consent logs
 * - Team ($299/mo): Bulk seats + API key + Team management
 * 
 * Environment Variables:
 * - VITE_WHOP_API_KEY: Whop API key for production
 * - VITE_WHOP_MODE: 'live' | 'simulated' (default: 'simulated')
 */

// Check if we're in live mode with real Whop SDK
const WHOP_MODE = import.meta.env.VITE_WHOP_MODE || 'simulated';
const WHOP_API_KEY = import.meta.env.VITE_WHOP_API_KEY || '';

/**
 * Check if Whop is configured for live mode
 */
export function isWhopLiveMode(): boolean {
  return WHOP_MODE === 'live' && !!WHOP_API_KEY;
}

/**
 * Get Whop configuration status
 */
export function getWhopConfigStatus(): {
  mode: 'live' | 'simulated';
  hasApiKey: boolean;
  ready: boolean;
} {
  return {
    mode: WHOP_MODE as 'live' | 'simulated',
    hasApiKey: !!WHOP_API_KEY,
    ready: WHOP_MODE === 'simulated' || !!WHOP_API_KEY
  };
}

// Whop SDK types (simulated until @whop-sdk/client is installed)
export type WhopTier = 'free' | 'basic' | 'pro' | 'team';

export interface WhopUser {
  id: string;
  email: string;
  name?: string;
  tier: WhopTier;
  teamId?: string;
  apiKey?: string;
  subscriptionStatus: 'active' | 'cancelled' | 'past_due' | 'trialing';
  subscriptionEndDate?: string;
  features: string[];
  createdAt: string;
  lastLoginAt: string;
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
      'help_tooltips'
    ],
    limits: {
      apiCallsPerDay: 100,
      teamMembers: 1,
      exportFormats: ['csv'],
      dataRetentionDays: 7
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
      'email_support'
    ],
    limits: {
      apiCallsPerDay: 1000,
      teamMembers: 1,
      exportFormats: ['csv', 'json'],
      dataRetentionDays: 30
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
      'custom_alerts'
    ],
    limits: {
      apiCallsPerDay: 10000,
      teamMembers: 1,
      exportFormats: ['csv', 'json', 'xlsx', 'pdf'],
      dataRetentionDays: 365
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
      'sla_guarantee'
    ],
    limits: {
      apiCallsPerDay: 100000,
      teamMembers: 25,
      exportFormats: ['csv', 'json', 'xlsx', 'pdf', 'api'],
      dataRetentionDays: 730
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
  sla_guarantee: ['team']
};

/**
 * Whop Client - handles authentication and access control
 */
class WhopClient {
  private currentUser: WhopUser | null = null;
  private initialized: boolean = false;

  /**
   * Initialize Whop SDK with API key
   * In production with VITE_WHOP_MODE=live, this would use @whop-sdk/client
   */
  async initialize(apiKey?: string): Promise<void> {
    const effectiveApiKey = apiKey || WHOP_API_KEY;
    
    if (isWhopLiveMode() && effectiveApiKey) {
      // Production mode with real Whop SDK
      // TODO: Uncomment when @whop-sdk/client is installed
      // import { WhopSDK } from '@whop-sdk/client';
      // await WhopSDK.init({ apiKey: effectiveApiKey });
      console.info('[Whop] Live mode enabled - SDK integration pending');
    } else {
      // Simulated mode for development/demo
      console.info('[Whop] Running in simulated mode');
    }
    
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
   * Simulate login (in production, this would redirect to Whop OAuth)
   */
  async login(tier: WhopTier = 'free'): Promise<WhopUser> {
    const user: WhopUser = {
      id: `user_${Date.now()}`,
      email: 'demo@ceip.ca',
      name: 'Demo User',
      tier,
      subscriptionStatus: 'active',
      features: WHOP_ACCESS_MATRIX[tier].features,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
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
  }

  /**
   * Upgrade tier (redirects to Whop checkout in production)
   */
  async upgradeTier(newTier: WhopTier): Promise<string> {
    // In production, this would return a Whop checkout URL
    const checkoutUrl = `https://whop.com/checkout/ceip-${newTier}`;
    return checkoutUrl;
  }

  /**
   * Get upgrade URL for a specific tier
   */
  getUpgradeUrl(tier: WhopTier): string {
    return `https://whop.com/checkout/ceip-${tier}`;
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

  return {
    user,
    tier,
    matrix,
    isAuthenticated: !!user,
    isPro: tier === 'pro' || tier === 'team',
    isTeam: tier === 'team',
    hasFeature: (feature: string) => whopClient.hasFeature(feature),
    hasTierAccess: (requiredTier: WhopTier) => whopClient.hasTierAccess(requiredTier),
    login: whopClient.login.bind(whopClient),
    logout: whopClient.logout.bind(whopClient),
    getUpgradeUrl: whopClient.getUpgradeUrl.bind(whopClient)
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
