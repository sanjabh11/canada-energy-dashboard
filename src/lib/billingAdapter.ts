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

import { debug } from './debug';
import { getSupabaseConfig } from './config';
import { type CanonicalTier } from './entitlements';
import { WhopTier, WHOP_ACCESS_MATRIX } from './whop';
import { CEIP_PRICING } from './pricingCatalog';

// ============================================================================
// BILLING ADAPTER INTERFACES (Provider-Agnostic)
// ============================================================================

export type BillingProvider = 'whop' | 'stripe' | 'manual';

export interface BillingPlan {
  id: string;
  name: string;
  tier: CanonicalTier;
  price: number;
  currency: string;
  interval: 'month' | 'year' | 'one_time';
  features: string[];
  trialDays?: number; // Optional trial period
  metadata?: Record<string, string>; // Provider-specific metadata
}

export interface CheckoutOptions {
  planId: string;
  userId?: string; // Internal user UUID (for metadata injection)
  email?: string; // Pre-captured email (for dual capture)
  successUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, string>;
}

export interface CheckoutSession {
  id: string;
  url: string;
  provider?: BillingProvider;
  status?: 'pending' | 'complete' | 'expired';
  expiresAt?: string; // When the checkout URL expires
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  tier?: CanonicalTier;
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
  providerId: string; // The provider-specific customer ID
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

/**
 * Resolve a caller-supplied redirect URL to a safe value. Checkout redirect
 * URLs must never leave this origin — an arbitrary absolute URL would let any
 * caller turn our checkout link into an open redirect to a look-alike site.
 * Returns the fallback when the input is missing or not same-origin.
 */
export function resolveRedirectUrl(url: string | undefined, fallbackPath: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
  const fallback = `${origin}${fallbackPath}`;
  if (!url) return fallback;
  try {
    if (url.startsWith('/')) return `${origin}${url}`;
    const parsed = new URL(url);
    return parsed.origin === origin ? parsed.toString() : fallback;
  } catch {
    return fallback;
  }
}

// ============================================================================
// WHOP BILLING ADAPTER IMPLEMENTATION
// ============================================================================

export class WhopBillingAdapter implements IBillingAdapter {
  provider: BillingProvider = 'whop';

  async createCheckoutSession(): Promise<CheckoutSession> {
    throw new Error(
      'New Whop checkout is disabled; existing customers can manage their membership portal.',
    );
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
    return [];
  }

  getPlan(): BillingPlan | null {
    return null;
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
    price: CEIP_PRICING.direct.consumer_watchdog,
    currency: 'USD',
    interval: 'month',
    features: WHOP_ACCESS_MATRIX.basic.features.slice(0, 5),
  },
  {
    id: 'stripe_pro',
    name: 'CEIP Pro',
    tier: 'pro',
    price: CEIP_PRICING.whop.whop_pro,
    currency: 'USD',
    interval: 'month',
    features: WHOP_ACCESS_MATRIX.pro.features,
  },
];

// Stripe price IDs (configure in Stripe dashboard)
// Stripe price IDs now sourced from externalized config
// Legacy plan ID to canonical tier mapping
export class StripeBillingAdapter implements IBillingAdapter {
  provider: BillingProvider = 'stripe';

  async createCheckoutSession(): Promise<CheckoutSession> {
    throw new Error(
      'New Stripe checkout is disabled until an authenticated, price-allowlisted server handler is implemented and verified.',
    );
  }

  async getSubscription(subscriptionId: string): Promise<Subscription | null> {
    const response = await fetch(`/api/billing/stripe/subscription/${subscriptionId}`);
    if (!response.ok) return null;
    return response.json();
  }

  async cancelSubscription(subscriptionId: string): Promise<boolean> {
    const response = await fetch(`/api/billing/stripe/subscription/${subscriptionId}/cancel`, {
      method: 'POST',
    });
    return response.ok;
  }

  async getCustomerPortalUrl(customerId: string): Promise<string> {
    const response = await fetch('/api/billing/stripe/portal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId }),
    });
    const data = await response.json();
    return data.url;
  }

  getPlans(): BillingPlan[] {
    return STRIPE_PLANS;
  }

  getPlan(planId: string): BillingPlan | null {
    return STRIPE_PLANS.find((p) => p.id === planId) || null;
  }
}

// ============================================================================
// MANUAL BILLING ADAPTER — offline/ops-reconciled billing
// ============================================================================

/**
 * Manual billing mode: subscriptions are reconciled offline by ops (invoice /
 * contract), so this deployment must NEVER start a provider checkout.
 * Fails closed — the same posture as an unconfigured payment provider.
 */
export class ManualBillingAdapter implements IBillingAdapter {
  provider: BillingProvider = 'manual';

  async createCheckoutSession(): Promise<CheckoutSession> {
    throw new Error(
      'Manual billing mode: checkout is handled offline via invoice. ' +
        'No payment provider checkout can be started in this deployment.',
    );
  }

  async getSubscription(): Promise<Subscription | null> {
    return null;
  }

  async cancelSubscription(): Promise<boolean> {
    throw new Error('Manual billing mode: cancellation is handled offline by ops.');
  }

  async getCustomerPortalUrl(): Promise<string> {
    throw new Error('Manual billing mode: no self-serve portal. Contact ops for account changes.');
  }

  getPlans(): BillingPlan[] {
    return [];
  }

  getPlan(): BillingPlan | null {
    return null;
  }
}

// ============================================================================
// BILLING ADAPTER FACTORY
// ============================================================================

let currentAdapter: IBillingAdapter | null = null;

/**
 * Get the active billing adapter. New checkout is disabled until an approved
 * server-side provider path is implemented and verified.
 */
/**
 * Resolve the configured billing provider.
 * Provider selection is a deployment-level decision made at build time via
 * VITE_BILLING_PROVIDER — it must NOT be switchable from the client at runtime
 * (a localStorage override lets any user force-load an alternate adapter).
 */
function resolveConfiguredProvider(
  configured: string | undefined = import.meta.env.VITE_BILLING_PROVIDER,
): BillingProvider {
  // Whop is retained only for existing-customer account access. Stripe's
  // client adapter is not selected until its server-side checkout route is
  // implemented and verified. Unknown, absent, and other values fail closed.
  return configured === 'whop' ? 'whop' : 'manual';
}

/** @internal Test seam for the deployment-level provider default. */
export function _resolveConfiguredProviderForTests(configured?: string): BillingProvider {
  return resolveConfiguredProvider(configured);
}

export function getBillingAdapter(): IBillingAdapter {
  if (!currentAdapter) {
    currentAdapter = createAdapter(resolveConfiguredProvider());
  }
  return currentAdapter;
}

function createAdapter(provider: BillingProvider): IBillingAdapter {
  switch (provider) {
    case 'stripe':
      return new StripeBillingAdapter();
    case 'manual':
      return new ManualBillingAdapter();
    case 'whop':
    default:
      return new WhopBillingAdapter();
  }
}

/**
 * Testing seam only — NOT part of the public API. Runtime provider switching
 * was removed because provider choice is a deployment decision; a client-side
 * switch lets any user force-load an alternate checkout (audit G5).
 * @internal
 */
export function _setBillingProviderForTests(provider: BillingProvider): void {
  currentAdapter = createAdapter(provider);
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
  };
}
