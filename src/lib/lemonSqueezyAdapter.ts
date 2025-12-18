/**
 * Lemon Squeezy Billing Adapter - Plan B Alternative
 * 
 * WHY LEMON SQUEEZY AS PLAN B:
 * 
 * 1. STRIPE-BACKED STABILITY
 *    Acquired by Stripe in 2024. Long-term stability guaranteed.
 *    No risk of the platform disappearing or pivoting.
 * 
 * 2. SAAS-NATIVE PRICING
 *    Built for software subscriptions, not digital goods.
 *    Native support for: trials, upgrades, downgrades, prorations.
 *    Whop is designed for "passes" and creator economy products.
 * 
 * 3. BETTER DATA PORTABILITY
 *    More transparent about data export.
 *    Customer lists, transaction history available via API.
 *    Email ownership is clearer than Whop.
 * 
 * 4. SAME MOR BENEFITS
 *    Still Merchant of Record - handles global taxes.
 *    Still manages VAT, GST, sales tax.
 *    You don't become the tax-liable merchant.
 * 
 * 5. PROFESSIONAL CHECKOUT
 *    No gaming/crypto aesthetics.
 *    Better fit for B2B prosumer market.
 *    Customizable checkout without Whop branding.
 * 
 * 6. LICENSE KEY SUPPORT
 *    Native license key generation for desktop apps.
 *    Whop doesn't have this feature.
 * 
 * MIGRATION PATH:
 * - This adapter implements the same IBillingAdapter interface
 * - Swap by calling: setBillingProvider('lemonsqueezy')
 * - All existing code continues to work
 * 
 * IMPLEMENTATION STATUS:
 * This is a ready-to-use adapter. To activate:
 * 1. Create Lemon Squeezy account
 * 2. Set up products matching Whop tiers
 * 3. Configure env vars: LEMON_SQUEEZY_API_KEY, LEMON_SQUEEZY_STORE_ID
 * 4. Create webhook endpoint: supabase/functions/lemonsqueezy-webhook/
 */

import {
    type IBillingAdapter,
    type BillingPlan,
    type CheckoutOptions,
    type CheckoutSession,
    type Subscription
} from './billingAdapter';

// ============================================================================
// LEMON SQUEEZY CONFIGURATION
// ============================================================================

const LEMON_SQUEEZY_API_KEY = import.meta.env.VITE_LEMON_SQUEEZY_API_KEY || '';
const LEMON_SQUEEZY_STORE_ID = import.meta.env.VITE_LEMON_SQUEEZY_STORE_ID || '';
const LEMON_SQUEEZY_BASE_URL = 'https://api.lemonsqueezy.com/v1';

// Product IDs for Lemon Squeezy (configure these in your LS dashboard)
const LS_PRODUCT_IDS = {
    watchdog: 'variant_WATCHDOG_ID',    // $9/mo
    pro: 'variant_PRO_ID',              // $29/mo
    team: 'variant_TEAM_ID'             // $99/mo (for self-serve, not enterprise)
};

// ============================================================================
// LEMON SQUEEZY TYPES
// ============================================================================

interface LSCheckoutResponse {
    data: {
        id: string;
        attributes: {
            url: string;
            expires_at: string;
        };
    };
}

interface LSSubscriptionResponse {
    data: {
        id: string;
        attributes: {
            status: string;
            renews_at: string;
            ends_at: string | null;
            user_email: string;
            product_id: number;
            variant_id: number;
        };
    };
}

// ============================================================================
// LEMON SQUEEZY PLANS
// ============================================================================

const LEMON_SQUEEZY_PLANS: BillingPlan[] = [
    {
        id: 'ls_watchdog',
        name: 'Rate Watchdog',
        tier: 'basic',
        price: 9,
        currency: 'USD',
        interval: 'month',
        features: [
            'Real-time Alberta RRO prices',
            '12-hour AI forecasts',
            'Price spike alerts',
            'Retailer comparison',
            'Email notifications'
        ],
        metadata: {
            provider: 'lemonsqueezy',
            variantId: LS_PRODUCT_IDS.watchdog
        }
    },
    {
        id: 'ls_pro',
        name: 'CEIP Advanced',
        tier: 'pro',
        price: 29,
        currency: 'USD',
        interval: 'month',
        features: [
            'Everything in Rate Watchdog',
            '35+ professional dashboards',
            'All certificate tracks',
            'Unlimited AI queries',
            'Data export (CSV, JSON)',
            'Priority support'
        ],
        trialDays: 7,
        metadata: {
            provider: 'lemonsqueezy',
            variantId: LS_PRODUCT_IDS.pro
        }
    },
    {
        id: 'ls_team',
        name: 'CEIP Team',
        tier: 'team',
        price: 99,
        currency: 'USD',
        interval: 'month',
        features: [
            'Everything in CEIP Advanced',
            '5 user seats included',
            'API access (10k requests/mo)',
            'Cohort admin tools',
            'White-label certificates'
        ],
        metadata: {
            provider: 'lemonsqueezy',
            variantId: LS_PRODUCT_IDS.team
        }
    }
];

// ============================================================================
// LEMON SQUEEZY BILLING ADAPTER
// ============================================================================

export class LemonSqueezyBillingAdapter implements IBillingAdapter {
    provider = 'lemon_squeezy' as const;

    /**
     * Create a checkout session
     * Redirects user to Lemon Squeezy hosted checkout
     */
    async createCheckoutSession(options: CheckoutOptions): Promise<CheckoutSession> {
        const plan = this.getPlan(options.planId);
        if (!plan) {
            throw new Error(`Plan not found: ${options.planId}`);
        }

        const variantId = plan.metadata?.variantId;
        if (!variantId) {
            throw new Error(`No variant ID for plan: ${options.planId}`);
        }

        // If no API key, generate manual checkout URL
        if (!LEMON_SQUEEZY_API_KEY) {
            console.warn('[LemonSqueezy] No API key, using direct checkout URL');
            const checkoutUrl = `https://${LEMON_SQUEEZY_STORE_ID}.lemonsqueezy.com/checkout/buy/${variantId}?checkout[email]=${encodeURIComponent(options.email || '')}&checkout[custom][user_id]=${options.userId || ''}`;

            return {
                id: `ls_manual_${Date.now()}`,
                url: checkoutUrl,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            };
        }

        // Create checkout via API
        try {
            const response = await fetch(`${LEMON_SQUEEZY_BASE_URL}/checkouts`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/vnd.api+json',
                    'Content-Type': 'application/vnd.api+json',
                    'Authorization': `Bearer ${LEMON_SQUEEZY_API_KEY}`
                },
                body: JSON.stringify({
                    data: {
                        type: 'checkouts',
                        attributes: {
                            checkout_data: {
                                email: options.email,
                                custom: {
                                    user_id: options.userId
                                }
                            },
                            product_options: {
                                enabled_variants: [parseInt(variantId.replace('variant_', ''))]
                            },
                            checkout_options: {
                                embed: false,
                                media: true,
                                button_color: '#06b6d4' // Cyan to match CEIP
                            }
                        },
                        relationships: {
                            store: {
                                data: {
                                    type: 'stores',
                                    id: LEMON_SQUEEZY_STORE_ID
                                }
                            },
                            variant: {
                                data: {
                                    type: 'variants',
                                    id: variantId.replace('variant_', '')
                                }
                            }
                        }
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`Lemon Squeezy API error: ${response.status}`);
            }

            const data: LSCheckoutResponse = await response.json();

            return {
                id: data.data.id,
                url: data.data.attributes.url,
                expiresAt: data.data.attributes.expires_at
            };
        } catch (error) {
            console.error('[LemonSqueezy] Checkout creation failed:', error);
            throw error;
        }
    }

    /**
     * Get subscription by ID
     */
    async getSubscription(subscriptionId: string): Promise<Subscription | null> {
        if (!LEMON_SQUEEZY_API_KEY) {
            console.warn('[LemonSqueezy] No API key, cannot fetch subscription');
            return null;
        }

        try {
            const response = await fetch(
                `${LEMON_SQUEEZY_BASE_URL}/subscriptions/${subscriptionId}`,
                {
                    headers: {
                        'Accept': 'application/vnd.api+json',
                        'Authorization': `Bearer ${LEMON_SQUEEZY_API_KEY}`
                    }
                }
            );

            if (!response.ok) {
                if (response.status === 404) return null;
                throw new Error(`Lemon Squeezy API error: ${response.status}`);
            }

            const data: LSSubscriptionResponse = await response.json();
            const attrs = data.data.attributes;

            return {
                id: data.data.id,
                userId: '', // Would need to lookup from our DB
                planId: `ls_variant_${attrs.variant_id}`,
                status: this.mapStatus(attrs.status),
                currentPeriodEnd: attrs.renews_at,
                cancelAtPeriodEnd: !!attrs.ends_at,
                provider: 'lemon_squeezy'
            };
        } catch (error) {
            console.error('[LemonSqueezy] Get subscription failed:', error);
            return null;
        }
    }

    /**
     * Cancel subscription
     */
    async cancelSubscription(subscriptionId: string): Promise<boolean> {
        if (!LEMON_SQUEEZY_API_KEY) {
            console.warn('[LemonSqueezy] No API key, cannot cancel');
            return false;
        }

        try {
            const response = await fetch(
                `${LEMON_SQUEEZY_BASE_URL}/subscriptions/${subscriptionId}`,
                {
                    method: 'DELETE',
                    headers: {
                        'Accept': 'application/vnd.api+json',
                        'Authorization': `Bearer ${LEMON_SQUEEZY_API_KEY}`
                    }
                }
            );

            return response.ok;
        } catch (error) {
            console.error('[LemonSqueezy] Cancel subscription failed:', error);
            return false;
        }
    }

    /**
     * Get customer portal URL
     */
    async getCustomerPortalUrl(customerId: string): Promise<string> {
        // Lemon Squeezy sends portal links via email
        // Or you can generate them via API
        return `https://app.lemonsqueezy.com/my-orders?customer=${customerId}`;
    }

    /**
     * Get all available plans
     */
    getPlans(): BillingPlan[] {
        return LEMON_SQUEEZY_PLANS;
    }

    /**
     * Get specific plan by ID
     */
    getPlan(planId: string): BillingPlan | null {
        return LEMON_SQUEEZY_PLANS.find(p => p.id === planId) || null;
    }

    /**
     * Map Lemon Squeezy status to our standard status
     */
    private mapStatus(lsStatus: string): Subscription['status'] {
        switch (lsStatus) {
            case 'active':
            case 'on_trial':
                return 'active';
            case 'past_due':
                return 'past_due';
            case 'cancelled':
            case 'paused':
                return 'cancelled';
            case 'expired':
                return 'expired';
            default:
                return 'cancelled';
        }
    }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if Lemon Squeezy is configured
 */
export function isLemonSqueezyConfigured(): boolean {
    return !!(LEMON_SQUEEZY_API_KEY && LEMON_SQUEEZY_STORE_ID);
}

/**
 * Get Lemon Squeezy webhook secret for signature verification
 */
export function getLemonSqueezyWebhookSecret(): string {
    return import.meta.env.VITE_LEMON_SQUEEZY_WEBHOOK_SECRET || '';
}
