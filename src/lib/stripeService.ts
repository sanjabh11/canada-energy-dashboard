/**
 * Stripe Service - Payment & Subscription Management
 * 
 * Handles:
 * - Individual subscriptions (Edubiz $99/mo, Pro $1500/mo)
 * - Cohort purchases ($1,500-5,000 one-time)
 * - Webhook processing for subscription events
 * 
 * Required ENV variables:
 * - VITE_STRIPE_PUBLISHABLE_KEY
 * - STRIPE_SECRET_KEY (server-side only, via Edge Function)
 */

// Stripe Product/Price IDs (configure in Stripe Dashboard)
export const STRIPE_PRODUCTS = {
  edubiz: {
    productId: 'prod_edubiz_monthly',
    priceId: 'price_edubiz_99_monthly',
    name: 'Edubiz',
    price: 99,
    interval: 'month' as const,
    features: [
      'All 3 certificate tracks (15 modules)',
      'Unlimited AI queries',
      'Live webinars (monthly)',
      'Badge & gamification system',
      'Priority email support'
    ]
  },
  pro: {
    productId: 'prod_pro_monthly',
    priceId: 'price_pro_1500_monthly',
    name: 'Pro',
    price: 1500,
    interval: 'month' as const,
    features: [
      'Everything in Edubiz',
      'Green Button data import',
      'Custom dashboards & reports',
      'API access & webhooks',
      'Dedicated account manager'
    ]
  }
};

export const STRIPE_COHORT_PRODUCTS = {
  starter: {
    productId: 'prod_cohort_starter',
    priceId: 'price_cohort_1500',
    name: 'Starter Cohort',
    price: 1500,
    learners: 10,
    type: 'one_time' as const
  },
  standard: {
    productId: 'prod_cohort_standard',
    priceId: 'price_cohort_3000',
    name: 'Standard Cohort',
    price: 3000,
    learners: 25,
    type: 'one_time' as const
  },
  enterprise: {
    productId: 'prod_cohort_enterprise',
    priceId: 'price_cohort_5000',
    name: 'Enterprise Cohort',
    price: 5000,
    learners: 50,
    type: 'one_time' as const
  }
};

export type SubscriptionTier = 'free' | 'edubiz' | 'pro';
export type CohortTier = 'starter' | 'standard' | 'enterprise';

interface CreateCheckoutOptions {
  tier: SubscriptionTier | CohortTier;
  userId: string;
  userEmail: string;
  successUrl?: string;
  cancelUrl?: string;
  isCohort?: boolean;
  cohortName?: string;
}

interface CheckoutSessionResponse {
  sessionId: string;
  url: string;
}

/**
 * Create a Stripe Checkout Session for subscription or cohort purchase
 * This calls a Supabase Edge Function that has the Stripe secret key
 */
export async function createCheckoutSession(
  options: CreateCheckoutOptions
): Promise<CheckoutSessionResponse> {
  const { tier, userId, userEmail, successUrl, cancelUrl, isCohort, cohortName } = options;

  // Determine product based on tier type
  let priceId: string;
  let mode: 'subscription' | 'payment';

  if (isCohort) {
    const cohortProduct = STRIPE_COHORT_PRODUCTS[tier as CohortTier];
    if (!cohortProduct) {
      throw new Error(`Invalid cohort tier: ${tier}`);
    }
    priceId = cohortProduct.priceId;
    mode = 'payment'; // One-time payment for cohorts
  } else {
    if (tier === 'free') {
      throw new Error('Cannot create checkout for free tier');
    }
    const subProduct = STRIPE_PRODUCTS[tier as 'edubiz' | 'pro'];
    if (!subProduct) {
      throw new Error(`Invalid subscription tier: ${tier}`);
    }
    priceId = subProduct.priceId;
    mode = 'subscription';
  }

  // Call Edge Function to create checkout session
  const response = await fetch(`${getEdgeBaseUrl()}/stripe-checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getEdgeHeaders()
    },
    body: JSON.stringify({
      priceId,
      mode,
      userId,
      userEmail,
      successUrl: successUrl || `${window.location.origin}/profile?checkout=success`,
      cancelUrl: cancelUrl || `${window.location.origin}/pricing?checkout=cancelled`,
      metadata: {
        tier,
        isCohort: isCohort ? 'true' : 'false',
        cohortName: cohortName || ''
      }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create checkout session');
  }

  return response.json();
}

/**
 * Redirect user to Stripe Checkout
 * Note: For Whop integration, we primarily use Whop checkout URLs.
 * This function is a fallback for direct Stripe checkout if needed.
 */
export async function redirectToCheckout(sessionId: string, checkoutUrl?: string): Promise<void> {
  // If we have a checkout URL from the session, use it directly
  if (checkoutUrl) {
    window.location.href = checkoutUrl;
    return;
  }

  const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
  
  if (!stripeKey) {
    // Fallback: Open checkout URL directly if Stripe.js not available
    console.warn('Stripe publishable key not configured, using URL redirect');
    return;
  }

  // Dynamic import of Stripe.js
  const { loadStripe } = await import('@stripe/stripe-js');
  const stripe = await loadStripe(stripeKey);
  
  if (!stripe) {
    throw new Error('Failed to load Stripe');
  }

  // Use Stripe Checkout redirect - type assertion needed for older API
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stripeAny = stripe as any;
  if (typeof stripeAny.redirectToCheckout === 'function') {
    const result = await stripeAny.redirectToCheckout({ sessionId });
    if (result?.error) {
      throw new Error(result.error.message);
    }
  } else {
    // Fallback: construct checkout URL manually
    console.warn('Stripe.redirectToCheckout not available, session ID:', sessionId);
  }
}

/**
 * Get customer portal URL for managing subscriptions
 */
export async function getCustomerPortalUrl(userId: string): Promise<string> {
  const response = await fetch(`${getEdgeBaseUrl()}/stripe-portal`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getEdgeHeaders()
    },
    body: JSON.stringify({
      userId,
      returnUrl: `${window.location.origin}/profile`
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to get portal URL');
  }

  const { url } = await response.json();
  return url;
}

/**
 * Check if Stripe is configured
 */
export function isStripeConfigured(): boolean {
  return !!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
}

/**
 * Get subscription status from user's edubiz record
 */
export function getSubscriptionStatus(tier: string | null | undefined): {
  isActive: boolean;
  isPro: boolean;
  isEdubiz: boolean;
  isFree: boolean;
} {
  const normalizedTier = (tier || 'free').toLowerCase();
  return {
    isActive: normalizedTier !== 'free',
    isPro: normalizedTier === 'pro',
    isEdubiz: normalizedTier === 'edubiz',
    isFree: normalizedTier === 'free'
  };
}

// Helper functions (imported from config)
function getEdgeBaseUrl(): string {
  return import.meta.env.VITE_SUPABASE_URL 
    ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`
    : '';
}

function getEdgeHeaders(): Record<string, string> {
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return anonKey ? { 'Authorization': `Bearer ${anonKey}` } : {};
}
