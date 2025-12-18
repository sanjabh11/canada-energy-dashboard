/**
 * Local Entitlement Cache - Portability Layer
 * 
 * WHOP PORTABILITY PATTERN (whop_criterias.md Section 6.2):
 * "Constraint: Do not query the Whop API (checkAccess) on every page load.
 * This creates a hard dependency on Whop's uptime and latency."
 * 
 * "Implementation Strategy: Create a local Entitlements table in your 
 * local database with fields like status, plan_id, expiry_date, and 
 * provider ('whop')."
 * 
 * This module provides:
 * - Local entitlement caching (localStorage for now, Supabase for prod)
 * - Webhook-driven state updates
 * - Provider-agnostic entitlement checks
 */

import { WhopTier } from './whop';
import { BillingProvider } from './billingAdapter';

// ============================================================================
// ENTITLEMENT INTERFACES
// ============================================================================

export interface Entitlement {
    id: string;
    userId: string;               // Internal user UUID (not Whop ID)
    tier: WhopTier;
    status: EntitlementStatus;
    provider: BillingProvider;
    providerId: string;           // Whop pass ID, Stripe sub ID, etc.
    planId: string;
    startDate: string;
    expiryDate: string;
    cancelAtPeriodEnd: boolean;
    lastSyncedAt: string;
    metadata: Record<string, string>;
}

export type EntitlementStatus =
    | 'active'
    | 'trialing'
    | 'past_due'
    | 'cancelled'
    | 'expired'
    | 'none';

export interface EntitlementCheckResult {
    hasAccess: boolean;
    tier: WhopTier;
    status: EntitlementStatus;
    expiresAt?: string;
    daysRemaining?: number;
    provider?: BillingProvider;
}

// ============================================================================
// LOCAL STORAGE KEYS
// ============================================================================

const STORAGE_KEYS = {
    ENTITLEMENT: 'ceip_entitlement',
    LAST_SYNC: 'ceip_entitlement_sync',
    USER_ID: 'ceip_user_id'
} as const;

// Sync interval: 5 minutes
const SYNC_INTERVAL_MS = 5 * 60 * 1000;

// ============================================================================
// ENTITLEMENT MANAGER
// ============================================================================

class EntitlementManager {
    private cache: Entitlement | null = null;
    private initialized = false;

    /**
     * Initialize from localStorage
     */
    initialize(): void {
        if (this.initialized) return;

        const stored = localStorage.getItem(STORAGE_KEYS.ENTITLEMENT);
        if (stored) {
            try {
                this.cache = JSON.parse(stored);
            } catch {
                this.cache = null;
            }
        }
        this.initialized = true;
    }

    /**
     * Get current entitlement (from cache, no API call)
     */
    getEntitlement(): Entitlement | null {
        this.initialize();
        return this.cache;
    }

    /**
     * Check if user has access to a specific tier
     */
    checkAccess(requiredTier: WhopTier = 'basic'): EntitlementCheckResult {
        this.initialize();

        const tierOrder: WhopTier[] = ['free', 'basic', 'pro', 'team'];

        // No entitlement = free tier
        if (!this.cache) {
            return {
                hasAccess: requiredTier === 'free',
                tier: 'free',
                status: 'none'
            };
        }

        // Check if entitlement is expired
        const now = new Date();
        const expiry = new Date(this.cache.expiryDate);

        if (now > expiry && this.cache.status !== 'trialing') {
            return {
                hasAccess: requiredTier === 'free',
                tier: 'free',
                status: 'expired',
                expiresAt: this.cache.expiryDate
            };
        }

        // Check if tier is sufficient
        const userTierIndex = tierOrder.indexOf(this.cache.tier);
        const requiredTierIndex = tierOrder.indexOf(requiredTier);

        const hasAccess = userTierIndex >= requiredTierIndex;
        const daysRemaining = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        return {
            hasAccess,
            tier: this.cache.tier,
            status: this.cache.status,
            expiresAt: this.cache.expiryDate,
            daysRemaining: Math.max(0, daysRemaining),
            provider: this.cache.provider
        };
    }

    /**
     * Update entitlement from webhook data
     * Called by webhook handler when Whop/Stripe sends events
     */
    updateFromWebhook(data: {
        userId: string;
        tier: WhopTier;
        status: EntitlementStatus;
        provider: BillingProvider;
        providerId: string;
        planId: string;
        expiryDate: string;
        metadata?: Record<string, string>;
    }): void {
        const entitlement: Entitlement = {
            id: `ent_${Date.now()}`,
            userId: data.userId,
            tier: data.tier,
            status: data.status,
            provider: data.provider,
            providerId: data.providerId,
            planId: data.planId,
            startDate: this.cache?.startDate || new Date().toISOString(),
            expiryDate: data.expiryDate,
            cancelAtPeriodEnd: false,
            lastSyncedAt: new Date().toISOString(),
            metadata: data.metadata || {}
        };

        this.cache = entitlement;
        this.persist();
    }

    /**
     * Grant trial access (for ?trial=true flow)
     */
    grantTrial(userId: string, tier: WhopTier = 'pro', durationDays: number = 7): void {
        const now = new Date();
        const expiry = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

        const entitlement: Entitlement = {
            id: `trial_${Date.now()}`,
            userId,
            tier,
            status: 'trialing',
            provider: 'manual',
            providerId: 'trial',
            planId: 'trial_pro',
            startDate: now.toISOString(),
            expiryDate: expiry.toISOString(),
            cancelAtPeriodEnd: true,
            lastSyncedAt: now.toISOString(),
            metadata: { source: 'url_param' }
        };

        this.cache = entitlement;
        this.persist();
    }

    /**
     * Clear entitlement (logout or cancellation)
     */
    clear(): void {
        this.cache = null;
        localStorage.removeItem(STORAGE_KEYS.ENTITLEMENT);
        localStorage.removeItem(STORAGE_KEYS.LAST_SYNC);
    }

    /**
     * Check if sync is needed (for background refresh)
     */
    needsSync(): boolean {
        const lastSync = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
        if (!lastSync) return true;

        const lastSyncTime = new Date(lastSync).getTime();
        return Date.now() - lastSyncTime > SYNC_INTERVAL_MS;
    }

    /**
     * Persist to localStorage
     */
    private persist(): void {
        if (this.cache) {
            localStorage.setItem(STORAGE_KEYS.ENTITLEMENT, JSON.stringify(this.cache));
            localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
        }
    }
}

// Singleton instance
export const entitlementManager = new EntitlementManager();

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Check if user has paid access (any tier above free)
 */
export function hasSubscription(): boolean {
    const result = entitlementManager.checkAccess('basic');
    return result.hasAccess && result.status !== 'none';
}

/**
 * Check if user has pro or team access
 */
export function isPro(): boolean {
    const result = entitlementManager.checkAccess('pro');
    return result.hasAccess;
}

/**
 * Check if user is on trial
 */
export function isTrialing(): boolean {
    const result = entitlementManager.checkAccess();
    return result.status === 'trialing';
}

/**
 * Get current tier
 */
export function getCurrentTier(): WhopTier {
    const result = entitlementManager.checkAccess();
    return result.tier;
}

// ============================================================================
// REACT HOOK
// ============================================================================

/**
 * React hook for entitlement checks
 */
export function useEntitlement() {
    const entitlement = entitlementManager.getEntitlement();
    const access = entitlementManager.checkAccess();

    return {
        entitlement,
        tier: access.tier,
        status: access.status,
        hasAccess: (tier: WhopTier) => entitlementManager.checkAccess(tier).hasAccess,
        isSubscribed: hasSubscription(),
        isPro: isPro(),
        isTrialing: isTrialing(),
        daysRemaining: access.daysRemaining,
        expiresAt: access.expiresAt,
        provider: entitlement?.provider,

        // Mutations
        grantTrial: (userId: string, tier?: WhopTier, days?: number) =>
            entitlementManager.grantTrial(userId, tier, days),
        clear: () => entitlementManager.clear()
    };
}

// Initialize on module load
if (typeof window !== 'undefined') {
    entitlementManager.initialize();
}
