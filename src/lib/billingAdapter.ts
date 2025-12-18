/**
 * Billing Adapter - Portability Layer for Payment Providers
 * 
 * WHOP PORTABILITY PATTERN (whop_criterias.md Section 7):
 * "DO build an Adapter class for billing. Wrap all Whop SDK calls in a 
 * generic interface. Today, the implementation calls Whop. Tomorrow, 
 * you can rewrite the implementation to call Stripe without changing 
 * the calling code."
 * 
 * This adapter provides a unified billing interface that can be backed
 * by Whop, Stripe, Lemon Squeezy, or any other provider.
 */

import { WhopTier, WHOP_ACCESS_MATRIX } from './whop';

// ============================================================================
// BILLING ADAPTER INTERFACES (Provider-Agnostic)
// ============================================================================

export type BillingProvider = 'whop' | 'stripe' | 'lemon_squeezy' | 'manual';

export interface BillingPlan {
    id: string;
    name: string;
    tier: WhopTier;
    price: number;
    currency: string;
    interval: 'month' | 'year' | 'one_time';
    features: string[];
    trialDays?: number;                     // Optional trial period
    metadata?: Record<string, string>;      // Provider-specific metadata
}

export interface CheckoutOptions {
    planId: string;
    userId?: string;           // Internal user UUID (for metadata injection)
    email?: string;            // Pre-captured email (for dual capture)
    successUrl?: string;
    cancelUrl?: string;
    metadata?: Record<string, string>;
}

export interface CheckoutSession {
    id: string;
    url: string;
    provider?: BillingProvider;
    status?: 'pending' | 'complete' | 'expired';
    expiresAt?: string;                     // When the checkout URL expires
}

export interface Subscription {
    id: string;
    userId: string;
    planId: string;
    tier?: WhopTier;
    status: 'active' | 'cancelled' | 'past_due' | 'trialing' | 'expired';
    provider?: BillingProvider;
    currentPeriodStart?: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
}

export interface BillingCustomer {
    id: string;
    email: string;
    name?: string;
    provider: BillingProvider;
    providerId: string;  // The provider-specific customer ID
}

// ============================================================================
// BILLING ADAPTER INTERFACE
// ============================================================================

export interface IBillingAdapter {
    provider: BillingProvider;

    // Checkout
    createCheckoutSession(options: CheckoutOptions): Promise<CheckoutSession>;

    // Subscriptions
    getSubscription(subscriptionId: string): Promise<Subscription | null>;
    cancelSubscription(subscriptionId: string): Promise<boolean>;

    // Customer Portal
    getCustomerPortalUrl(customerId: string): Promise<string>;

    // Plans
    getPlans(): BillingPlan[];
    getPlan(planId: string): BillingPlan | null;
}

// ============================================================================
// WHOP BILLING ADAPTER IMPLEMENTATION
// ============================================================================

const WHOP_PLANS: BillingPlan[] = [
    {
        id: 'whop_watchdog',
        name: 'Alberta Rate Watchdog',
        tier: 'basic',
        price: 9,
        currency: 'USD',
        interval: 'month',
        features: WHOP_ACCESS_MATRIX.basic.features.slice(0, 5)
    },
    {
        id: 'whop_basic',
        name: 'CEIP Basic',
        tier: 'basic',
        price: 29,
        currency: 'USD',
        interval: 'month',
        features: WHOP_ACCESS_MATRIX.basic.features
    },
    {
        id: 'whop_pro',
        name: 'CEIP Pro',
        tier: 'pro',
        price: 99,
        currency: 'USD',
        interval: 'month',
        features: WHOP_ACCESS_MATRIX.pro.features
    },
    {
        id: 'whop_team',
        name: 'CEIP Team',
        tier: 'team',
        price: 299,
        currency: 'USD',
        interval: 'month',
        features: WHOP_ACCESS_MATRIX.team.features
    }
];

// Whop product IDs (configure in Whop dashboard)
const WHOP_PRODUCT_MAP: Record<string, string> = {
    'whop_watchdog': 'pass_WATCHDOG_PRODUCT_ID',
    'whop_basic': 'pass_BASIC_PRODUCT_ID',
    'whop_pro': 'pass_PRO_PRODUCT_ID',
    'whop_team': 'pass_TEAM_PRODUCT_ID'
};

export class WhopBillingAdapter implements IBillingAdapter {
    provider: BillingProvider = 'whop';

    async createCheckoutSession(options: CheckoutOptions): Promise<CheckoutSession> {
        const plan = this.getPlan(options.planId);
        if (!plan) {
            throw new Error(`Unknown plan: ${options.planId}`);
        }

        const whopProductId = WHOP_PRODUCT_MAP[options.planId];

        // Build checkout URL with metadata injection
        const params = new URLSearchParams({
            d2c: 'true',  // Direct-to-consumer mode
            plan: plan.tier
        });

        // CRITICAL: Inject internal user ID for webhook correlation
        if (options.userId) {
            params.set('metadata_user_id', options.userId);
        }

        // Pre-captured email for dual capture pattern
        if (options.email) {
            params.set('email', options.email);
        }

        // Custom metadata
        if (options.metadata) {
            Object.entries(options.metadata).forEach(([key, value]) => {
                params.set(`metadata_${key}`, value);
            });
        }

        // Redirect URLs
        if (options.successUrl) {
            params.set('redirect_url', options.successUrl);
        }

        const checkoutUrl = `https://whop.com/canada-energy-academy/?${params.toString()}`;

        return {
            id: `whop_checkout_${Date.now()}`,
            url: checkoutUrl,
            provider: 'whop',
            status: 'pending'
        };
    }

    async getSubscription(subscriptionId: string): Promise<Subscription | null> {
        // In production, this would call Whop API
        // For now, return from localStorage cache
        const cached = localStorage.getItem('billing_subscription');
        if (cached) {
            try {
                return JSON.parse(cached);
            } catch {
                return null;
            }
        }
        return null;
    }

    async cancelSubscription(subscriptionId: string): Promise<boolean> {
        // Redirect to Whop customer portal for cancellation
        window.open('https://whop.com/hub/settings/memberships', '_blank');
        return true;
    }

    async getCustomerPortalUrl(customerId: string): Promise<string> {
        return 'https://whop.com/hub/settings/memberships';
    }

    getPlans(): BillingPlan[] {
        return WHOP_PLANS;
    }

    getPlan(planId: string): BillingPlan | null {
        return WHOP_PLANS.find(p => p.id === planId) || null;
    }
}

// ============================================================================
// STRIPE BILLING ADAPTER IMPLEMENTATION (Parallel Path for Migration)
// ============================================================================

const STRIPE_PLANS: BillingPlan[] = [
    {
        id: 'stripe_watchdog',
        name: 'Alberta Rate Watchdog',
        tier: 'basic',
        price: 9,
        currency: 'USD',
        interval: 'month',
        features: WHOP_ACCESS_MATRIX.basic.features.slice(0, 5)
    },
    {
        id: 'stripe_pro',
        name: 'CEIP Pro',
        tier: 'pro',
        price: 99,
        currency: 'USD',
        interval: 'month',
        features: WHOP_ACCESS_MATRIX.pro.features
    }
];

// Stripe price IDs (configure in Stripe dashboard)
const STRIPE_PRICE_MAP: Record<string, string> = {
    'stripe_watchdog': 'price_WATCHDOG_STRIPE_ID',
    'stripe_pro': 'price_PRO_STRIPE_ID'
};

export class StripeBillingAdapter implements IBillingAdapter {
    provider: BillingProvider = 'stripe';

    async createCheckoutSession(options: CheckoutOptions): Promise<CheckoutSession> {
        const plan = this.getPlan(options.planId);
        if (!plan) {
            throw new Error(`Unknown plan: ${options.planId}`);
        }

        // In production, this calls your Supabase Edge Function to create Stripe session
        const response = await fetch('/api/billing/stripe/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                priceId: STRIPE_PRICE_MAP[options.planId],
                userId: options.userId,
                email: options.email,
                successUrl: options.successUrl || `${window.location.origin}/billing/success`,
                cancelUrl: options.cancelUrl || `${window.location.origin}/pricing`,
                metadata: options.metadata
            })
        });

        if (!response.ok) {
            throw new Error('Failed to create Stripe checkout session');
        }

        const data = await response.json();

        return {
            id: data.sessionId,
            url: data.url,
            provider: 'stripe',
            status: 'pending'
        };
    }

    async getSubscription(subscriptionId: string): Promise<Subscription | null> {
        const response = await fetch(`/api/billing/stripe/subscription/${subscriptionId}`);
        if (!response.ok) return null;
        return response.json();
    }

    async cancelSubscription(subscriptionId: string): Promise<boolean> {
        const response = await fetch(`/api/billing/stripe/subscription/${subscriptionId}/cancel`, {
            method: 'POST'
        });
        return response.ok;
    }

    async getCustomerPortalUrl(customerId: string): Promise<string> {
        const response = await fetch('/api/billing/stripe/portal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customerId })
        });
        const data = await response.json();
        return data.url;
    }

    getPlans(): BillingPlan[] {
        return STRIPE_PLANS;
    }

    getPlan(planId: string): BillingPlan | null {
        return STRIPE_PLANS.find(p => p.id === planId) || null;
    }
}

// ============================================================================
// BILLING ADAPTER FACTORY
// ============================================================================

let currentAdapter: IBillingAdapter | null = null;

/**
 * Get the active billing adapter
 * Defaults to Whop, can be switched to Stripe for migration
 */
export function getBillingAdapter(): IBillingAdapter {
    if (!currentAdapter) {
        // Check if Stripe is preferred (for A/B testing or migration)
        const preferStripe = localStorage.getItem('billing_provider') === 'stripe';
        currentAdapter = preferStripe ? new StripeBillingAdapter() : new WhopBillingAdapter();
    }
    return currentAdapter;
}

/**
 * Switch billing provider (for migration or testing)
 * 
 * Usage:
 *   setBillingProvider('whop')          // Current default
 *   setBillingProvider('stripe')        // Full control path
 *   setBillingProvider('lemon_squeezy') // Plan B (MoR alternative)
 */
export function setBillingProvider(provider: BillingProvider): void {
    localStorage.setItem('billing_provider', provider);

    switch (provider) {
        case 'stripe':
            currentAdapter = new StripeBillingAdapter();
            break;
        case 'lemon_squeezy':
            // Lazy import to avoid circular dependencies
            import('./lemonSqueezyAdapter').then(({ LemonSqueezyBillingAdapter }) => {
                currentAdapter = new LemonSqueezyBillingAdapter();
            });
            break;
        case 'whop':
        default:
            currentAdapter = new WhopBillingAdapter();
    }
}

/**
 * Get available plans from current provider
 */
export function getAvailablePlans(): BillingPlan[] {
    return getBillingAdapter().getPlans();
}

/**
 * Create checkout session with current provider
 */
export async function createCheckout(options: CheckoutOptions): Promise<CheckoutSession> {
    return getBillingAdapter().createCheckoutSession(options);
}

// ============================================================================
// CONVENIENCE HOOKS
// ============================================================================

/**
 * React hook for billing operations
 */
export function useBilling() {
    const adapter = getBillingAdapter();

    return {
        provider: adapter.provider,
        plans: adapter.getPlans(),
        getPlan: (planId: string) => adapter.getPlan(planId),
        createCheckout: (options: CheckoutOptions) => adapter.createCheckoutSession(options),
        getSubscription: (subId: string) => adapter.getSubscription(subId),
        cancelSubscription: (subId: string) => adapter.cancelSubscription(subId),
        getPortalUrl: (customerId: string) => adapter.getCustomerPortalUrl(customerId),
        switchProvider: setBillingProvider
    };
}
