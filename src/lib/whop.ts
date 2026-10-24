/**
 * Whop SDK Integration for Canada Energy Academy
 *
 * Implements access control, tier management, and user authentication
 * for existing Whop memberships and entitlement compatibility.
 *
 * KEY CHANGES FOR WHOP COMPLIANCE:
 * - Uses Whop JWT authentication (no custom login)
 * - Makes NO browser-side Whop API calls; verification is server/edge-only
 * - Supports standalone mode for non-Whop deployments
 *
 * TWO VERIFICATION SURFACES (intentional, by hosting target):
 * - Web dashboard (this file + /api/auth/* Netlify functions): session token
 *   → server verifyWhopSessionToken (documented OAuth userinfo primary,
 *   legacy last-resort) → entitlement DB → tiers free|basic|pro|team.
 * - Whop-embedded mini-app (src/components/whop-mini/): iframe token →
 *   whop-verify-access Supabase edge fn → tiers free|starter|pro|enterprise,
 *   mapped onto free|basic|pro at the client boundary.
 *
 * Access Tiers:
 * - Free: Public dashboards only
 * - Basic ($29/mo): Full citations + French
 * - Pro ($99/mo): AI co-pilot + Policy Map + Impact Dashboard + Consent logs
 * - Team ($299/mo): Bulk seats + API key + Team management
 *
 * Environment Variables:
 * - WHOP_API_KEY: Server-only Whop API key (Edge Functions only, NO VITE_ prefix)
 * - VITE_WHOP_MODE: 'live' | 'simulated' | 'standalone' (default: 'standalone')
 * - VITE_WHOP_CLIENT_ID: Client-safe Whop App ID for OAuth redirects
 */

import { CEIP_PRICING } from './pricingCatalog';

// Check if we're in live mode with real Whop SDK
const WHOP_MODE = import.meta.env.VITE_WHOP_MODE || 'standalone';
// NOTE: WHOP_API_KEY is server-only (Edge Functions). Never expose it to the browser.
const WHOP_CLIENT_ID = import.meta.env.VITE_WHOP_CLIENT_ID || '';

/**
 * Check if Whop is configured for live mode
 * The API key lives server-side only; client checks mode + client ID.
 */
export function isWhopLiveMode(): boolean {
  return WHOP_MODE === 'live' && !!WHOP_CLIENT_ID;
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
  // API key is server-only; in live mode we assume server has it configured
  const hasApiKey = mode === 'live';
  const hasClientId = !!WHOP_CLIENT_ID;

  let ready = false;
  let message = '';

  if (mode === 'live') {
    ready = hasClientId;
    message = ready ? 'Whop live mode active' : 'Missing VITE_WHOP_CLIENT_ID';
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
      'certificates_preview',
    ],
    limits: {
      apiCallsPerDay: 100,
      teamMembers: 1,
      exportFormats: ['csv'],
      dataRetentionDays: 7,
      aiQueriesPerDay: 5,
    },
  },
  basic: {
    tier: 'basic',
    price: CEIP_PRICING.whop.whop_basic,
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
      'module_access',
    ],
    limits: {
      apiCallsPerDay: 1000,
      teamMembers: 1,
      exportFormats: ['csv', 'json'],
      dataRetentionDays: 30,
      aiQueriesPerDay: 25,
    },
  },
  pro: {
    tier: 'pro',
    price: CEIP_PRICING.whop.whop_pro,
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
      'unlimited_ai_queries',
    ],
    limits: {
      apiCallsPerDay: 10000,
      teamMembers: 1,
      exportFormats: ['csv', 'json', 'xlsx', 'pdf'],
      dataRetentionDays: 365,
      aiQueriesPerDay: 100,
    },
  },
  team: {
    tier: 'team',
    price: CEIP_PRICING.whop.whop_team,
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
      'creator_dashboard',
    ],
    limits: {
      apiCallsPerDay: 100000,
      teamMembers: 25,
      exportFormats: ['csv', 'json', 'xlsx', 'pdf', 'api'],
      dataRetentionDays: 730,
      aiQueriesPerDay: -1, // unlimited
    },
  },
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
  unlimited_ai_queries: ['pro', 'team'],
};

/**
 * Client-side Whop token gate — SHAPE CHECK ONLY, never trust.
 *
 * The browser must NOT call the Whop API with a user token:
 * - the legacy Whop "me" endpoint this app once called from the client is
 *   NOT confirmed in official Whop docs as a verification target, and
 * - any client-side membership→tier mapping reintroduces the
 *   unrelated-product defect removed server-side (a membership in ANY
 *   product must never mint a paid tier in the browser).
 *
 * Trust boundary: identity and tier come EXCLUSIVELY from
 * `whopClient.loginFromToken()` → `POST /api/auth/login` → server-side
 * `verifyWhopSessionToken()`, which verifies the token against Whop before
 * minting the HttpOnly session cookie. This function only decides whether
 * a credential is well-formed enough to hand to that server path.
 *
 * - empty/blank token → invalid
 * - standalone mode   → invalid (no Whop integration at all)
 * - simulated mode    → dev-only mock decode (display metadata, no tier)
 * - live mode         → `{ valid: true }` for any non-empty credential;
 *                       NO client-side Whop API call is made.
 */
export async function verifyWhopToken(token: string): Promise<{
  valid: boolean;
  userId?: string;
  email?: string;
  error?: string;
}> {
  if (!token || !token.trim()) {
    return { valid: false, error: 'No token provided' };
  }

  if (isStandaloneMode()) {
    return { valid: false, error: 'Running in standalone mode' };
  }

  if (!isWhopLiveMode()) {
    // Simulated mode — dev-only mock decode for local development. The
    // decoded fields are display metadata, NOT entitlements: no tier is
    // ever returned because a client-decoded payload cannot prove one.
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        valid: true,
        userId: payload.sub || payload.user_id,
        email: payload.email,
      };
    } catch {
      return { valid: false, error: 'Invalid token format' };
    }
  }

  // Live mode — delegate trust entirely. No client-side Whop API call:
  // a non-empty credential is well-formed enough for the server login
  // path, which performs the real verification and entitlement lookup.
  return { valid: true };
}

// NOTE: the Whop OAuth redirect/code-exchange flow was removed. Neither the
// client-side auth callback route nor the server-side code-exchange endpoint
// exists in this deployment, so the path was dead and presented a spoofable
// surface. Existing members authenticate through the Whop iframe token flow
// (whop_token URL param -> verifyWhopToken -> loginFromToken) and manage
// billing via https://whop.com/hub.

/**
 * Check if user has access to a specific experience
 * Used for Whop iframe integration
 */
export async function checkWhopAccess(
  userId: string,
  experienceId?: string,
): Promise<{
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
      features: user?.features || WHOP_ACCESS_MATRIX.free.features,
    };
  }

  // The browser never supplies the identity used for entitlement lookup. The
  // server derives it from the verified HttpOnly Whop session and checks the
  // local entitlement record. `userId` is only a consistency check.
  try {
    void experienceId;
    const response = await fetch('/api/auth/session', { credentials: 'include' });

    if (response.ok) {
      const data = (await response.json()) as {
        authenticated?: boolean;
        user?: { id?: string };
        hasAccess?: boolean;
        tier?: WhopTier;
      };
      const serverTier =
        data.tier && Object.prototype.hasOwnProperty.call(WHOP_ACCESS_MATRIX, data.tier)
          ? data.tier
          : 'free';
      const entitled =
        data.authenticated === true &&
        data.user?.id === userId &&
        data.hasAccess === true &&
        serverTier !== 'free';
      const tier = entitled ? serverTier : 'free';
      return {
        hasAccess: entitled,
        tier,
        features: WHOP_ACCESS_MATRIX[tier].features,
      };
    }
  } catch {
    // Network error — fall through to cached data with reduced trust
  }

  // Fallback: use cached user data with hasAccess=false to fail closed
  return {
    hasAccess: false,
    tier: 'free',
    features: WHOP_ACCESS_MATRIX.free.features,
  };
}

/**
 * Whop Client - handles authentication and access control
 */
class WhopClient {
  private currentUser: WhopUser | null = null;
  private initialized: boolean = false;
  /**
   * True only when the current identity was established this session through a
   * verified path: Whop token verification, a server-confirmed entitlement
   * check, or an explicit guest/simulated login action. A profile restored
   * from localStorage starts unverified and must never grant entitlements on
   * its own — a forged `whop_user` blob plus a minted cookie is not proof of
   * identity (the session endpoint reports only that *a* cookie exists).
   */
  private sessionVerified: boolean = false;

  /**
   * Read the cached profile from localStorage without trusting it.
   * Returns null when nothing valid is stored.
   */
  private readStoredUser(): WhopUser | null {
    const storedUser = localStorage.getItem('whop_user');
    if (!storedUser) {
      return null;
    }

    try {
      const parsed = JSON.parse(storedUser) as WhopUser;
      if (!parsed || typeof parsed.id !== 'string') {
        localStorage.removeItem('whop_user');
        return null;
      }
      return parsed;
    } catch {
      localStorage.removeItem('whop_user');
      return null;
    }
  }

  /**
   * Standalone-mode restore only. Standalone deployments have no server to
   * verify against, so a stored profile can only ever be a local guest/demo
   * identity — scrub any claimed Whop-authenticated flag.
   */
  private restoreStoredUser(): void {
    const stored = this.readStoredUser();
    if (!stored) {
      return;
    }

    this.currentUser = { ...stored, isWhopUser: false };
    this.sessionVerified = true;
  }

  private userFromServerSession(data: unknown): WhopUser | null {
    if (!data || typeof data !== 'object') return null;
    const record = data as Record<string, unknown>;
    const identity =
      record.user && typeof record.user === 'object'
        ? (record.user as Record<string, unknown>)
        : null;
    const id = typeof identity?.id === 'string' ? identity.id.trim() : '';
    if (record.authenticated !== true || !id) return null;

    const claimedTier =
      typeof record.tier === 'string' &&
      Object.prototype.hasOwnProperty.call(WHOP_ACCESS_MATRIX, record.tier)
        ? (record.tier as WhopTier)
        : 'free';
    const tier = record.hasAccess === true ? claimedTier : 'free';
    const email = typeof identity?.email === 'string' ? identity.email : '';
    const name = typeof identity?.name === 'string' ? identity.name : undefined;
    const expiryDate =
      typeof record.subscriptionEndDate === 'string' &&
      Number.isFinite(Date.parse(record.subscriptionEndDate))
        ? record.subscriptionEndDate
        : undefined;

    return {
      id,
      email,
      ...(name ? { name } : {}),
      tier,
      subscriptionStatus: tier === 'free' ? 'none' : 'active',
      ...(expiryDate ? { subscriptionEndDate: expiryDate } : {}),
      features: WHOP_ACCESS_MATRIX[tier].features,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      isWhopUser: true,
    };
  }

  /**
   * Initialize Whop SDK
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const config = getWhopConfigStatus();
    console.info(`[Whop] Initializing in ${config.mode} mode: ${config.message}`);

    this.initialized = true;

    if (isStandaloneMode()) {
      this.restoreStoredUser();
      return;
    }

    // Check for an existing server-held session (httpOnly cookie).
    try {
      const res = await fetch('/api/auth/session', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const serverUser = this.userFromServerSession(data);
        if (serverUser) {
          // The server returned identity after validating the HttpOnly token;
          // tier/features also came from its entitlement check. Ignore the
          // browser cache as an identity or permission source.
          this.currentUser = serverUser;
          this.sessionVerified = true;
          localStorage.setItem('whop_user', JSON.stringify(serverUser));
        } else {
          // No server-confirmed identity — clear the stale browser profile.
          localStorage.removeItem('whop_user');
          this.currentUser = null;
          this.sessionVerified = false;
        }
      } else {
        // Session endpoint error — fail closed; localStorage is not a
        // trusted identity source.
        this.currentUser = null;
        this.sessionVerified = false;
      }
    } catch {
      // Network failure — fail closed. Never restore entitlements from
      // localStorage alone when no server session can be confirmed.
      this.currentUser = null;
      this.sessionVerified = false;
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
      try {
        await this.loginFromToken(whopToken);
        // Clean up URL
        urlParams.delete('whop_token');
        const newUrl =
          window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
        window.history.replaceState({}, '', newUrl);
      } catch {
        this.currentUser = null;
        this.sessionVerified = false;
      }
    }
  }

  /**
   * Get current user.
   * NOTE: a restored-but-unverified profile is returned for display only;
   * use getCurrentTier()/isSessionVerified() for entitlement decisions.
   */
  getCurrentUser(): WhopUser | null {
    return this.currentUser;
  }

  /**
   * Whether the current identity was verified this session via a
   * server-confirmed path (token verification, entitlement check) or an
   * explicit guest/simulated login. Restored localStorage profiles are
   * unverified until confirmSessionServerSide succeeds.
   */
  isSessionVerified(): boolean {
    return this.sessionVerified;
  }

  /**
   * Get current tier.
   * Fails closed to 'free' for unverified restored sessions so that
   * forged localStorage/cookie state cannot grant paid entitlements.
   */
  getCurrentTier(): WhopTier {
    if (!this.currentUser || !this.sessionVerified) {
      return 'free';
    }
    return this.currentUser.tier;
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
    const login = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (!login.ok) {
      this.currentUser = null;
      this.sessionVerified = false;
      localStorage.removeItem('whop_user');
      throw new Error('Server could not verify this Whop session.');
    }

    const session = await fetch('/api/auth/session', { credentials: 'include' });
    if (!session.ok) {
      this.currentUser = null;
      this.sessionVerified = false;
      localStorage.removeItem('whop_user');
      throw new Error('Server could not restore this Whop session.');
    }
    const user = this.userFromServerSession(await session.json());
    if (!user) {
      this.currentUser = null;
      this.sessionVerified = false;
      localStorage.removeItem('whop_user');
      throw new Error('Server did not return a verified Whop identity.');
    }

    this.currentUser = user;
    this.sessionVerified = true;
    localStorage.setItem('whop_user', JSON.stringify(user));
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
      isWhopUser: false,
    };

    this.currentUser = user;
    this.sessionVerified = true;
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
      isWhopUser: false,
    };

    this.currentUser = user;
    this.sessionVerified = true;
    localStorage.setItem('whop_user', JSON.stringify(user));

    return user;
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    this.currentUser = null;
    this.sessionVerified = false;
    localStorage.removeItem('whop_user');

    // Clear httpOnly cookie via Netlify Function
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {
      // Fallback for local dev — cookie may not exist
    }
  }

  /**
   * Existing members may manage their membership; this helper never starts
   * new Whop acquisition or checkout.
   */
  getUpgradeUrl(_tier: WhopTier): string {
    return '/whop/discover';
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
        features: WHOP_ACCESS_MATRIX[webhookData.tier].features,
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
    sessionVerified: whopClient.isSessionVerified(),
    isWhopUser: (user?.isWhopUser ?? false) && whopClient.isSessionVerified(),
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
    isSessionVerified: whopClient.isSessionVerified.bind(whopClient),
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
