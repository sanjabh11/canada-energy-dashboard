import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from './auth';
import { Check, X, Zap, TrendingUp, ArrowRight, Crown, Star, Sparkles } from 'lucide-react';
import { getEdgeBaseUrl } from '../lib/config';

export function PricingPage() {
  const { user, edubizUser, isWhopUser } = useAuth();
  const [checkoutLoadingTier, setCheckoutLoadingTier] = useState<'watchdog' | 'advanced' | 'enterprise' | null>(null);
  const currentTier = edubizUser?.tier || 'free';

  // Whop-aligned pricing tiers (from whop_skill.md)
  const tiers = [
    {
      id: 'watchdog',
      name: 'Rate Watchdog',
      icon: '⚡',
      price: 9,
      period: 'month',
      description: 'Alberta electricity price intelligence',
      features: [
        { text: 'Live RRO price monitoring', included: true },
        { text: 'Daily price summaries', included: true },
        { text: 'Threshold-based alerts', included: true },
        { text: '3-day AI forecast', included: true },
        { text: 'Retailer comparison', included: true },
        { text: 'Email notifications', included: true },
        { text: 'Full dashboard access', included: false },
        { text: 'Certificate tracks', included: false },
        { text: 'API access', included: false },
        { text: 'Data exports', included: false }
      ],
      cta: 'Start for $9/mo',
      ctaStyle: 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600',
      popular: false,
      whopPlan: 'basic'
    },
    {
      id: 'advanced',
      name: 'CEIP Advanced',
      icon: '🚀',
      price: 29,
      period: 'month',
      description: 'Full platform access for energy professionals',
      features: [
        { text: 'Everything in Rate Watchdog', included: true },
        { text: '35+ professional dashboards', included: true },
        { text: 'All 3 certificate tracks (15 modules)', included: true },
        { text: 'Unlimited AI queries', included: true },
        { text: 'Real-time AESO/IESO grid data', included: true },
        { text: 'Renewable & hydrogen analytics', included: true },
        { text: 'ESG & emissions tracking', included: true },
        { text: 'Data export (CSV, JSON)', included: true },
        { text: 'Priority support', included: true },
        { text: 'API access', included: false }
      ],
      cta: '7-Day Free Trial',
      ctaStyle: 'bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600',
      popular: true,
      trial: true,
      whopPlan: 'pro'
    },
    {
      id: 'enterprise',
      name: 'CEIP Enterprise',
      icon: '👑',
      price: 99,
      period: 'month',
      description: 'API access, cohorts & custom solutions',
      features: [
        { text: 'Everything in CEIP Advanced', included: true },
        { text: 'Full API access (v2 endpoints)', included: true },
        { text: 'Cohort admin tools', included: true },
        { text: 'White-label certificates', included: true },
        { text: 'Custom dashboards & reports', included: true },
        { text: 'Regulatory analytics suite', included: true },
        { text: 'Indigenous energy intelligence', included: true },
        { text: 'Dedicated account manager', included: true },
        { text: 'Premium support (< 4hr response)', included: true },
        { text: 'Custom integrations', included: true }
      ],
      cta: 'Contact Sales',
      ctaStyle: 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600',
      popular: false,
      enterprise: true,
      whopPlan: 'enterprise'
    }
  ];

  // Legacy tier mapping for backward compatibility
  const legacyTierMap: Record<string, string> = {
    'free': 'free',
    'edubiz': 'advanced',
    'pro': 'enterprise',
    'basic': 'watchdog',
    'watchdog': 'watchdog',
    'advanced': 'advanced',
    'enterprise': 'enterprise'
  };
  const normalizedCurrentTier = legacyTierMap[currentTier] || 'free';

  async function handleTierCheckout(tierId: 'watchdog' | 'advanced' | 'enterprise') {
    setCheckoutLoadingTier(tierId);
    
    // Map tier to Whop plan
    const tier = tiers.find(t => t.id === tierId);
    const whopPlan = tier?.whopPlan || tierId;
    
    // Redirect to Whop checkout (works for both logged in and guest users)
    window.location.href = `https://whop.com/canada-energy-academy/?d2c=true&plan=${whopPlan}`;
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-900 via-purple-800 to-indigo-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-12 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="h-6 w-6 text-purple-300" />
            <span className="text-purple-200 text-sm">Powered by CEIP — Canada's Energy Intelligence Engine</span>
          </div>
          <h1 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h1>
          <p className="text-xl text-blue-100 max-w-3xl mx-auto">
            From Alberta rate alerts to full energy intelligence — choose the plan that fits your needs
          </p>

          {user && (
            <div className="mt-6 inline-flex items-center gap-2 bg-white/10 px-6 py-3 rounded-full border border-white/20">
              <span className="text-blue-200">Current plan:</span>
              <span className="font-bold capitalize">{normalizedCurrentTier === 'free' ? 'Free' : normalizedCurrentTier}</span>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-16">
        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {tiers.map(tier => {
            const isCurrentTier = normalizedCurrentTier === tier.id;
            const tierLevels: Record<string, number> = { free: 0, watchdog: 1, advanced: 2, enterprise: 3 };
            const userLevel = tierLevels[normalizedCurrentTier] || 0;
            const tierLevel = tierLevels[tier.id] || 0;
            const canUpgrade = tierLevel > userLevel;

            return (
              <div
                key={tier.id}
                className={`
                  relative bg-slate-800 rounded-2xl border-2 overflow-hidden transition-all
                  ${tier.popular ? 'border-cyan-600 shadow-2xl scale-105' : 'border-slate-700'}
                  ${isCurrentTier ? 'ring-4 ring-green-600 ring-offset-4 ring-offset-slate-900' : ''}
                `}
              >
                {/* Popular badge */}
                {tier.popular && (
                  <div className="absolute top-4 right-4">
                    <div className="bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-1 rounded-full flex items-center gap-1">
                      <Star className="h-4 w-4" />
                      <span className="text-sm font-bold">Most Popular</span>
                    </div>
                  </div>
                )}

                <div className="p-8">
                  {/* Tier header */}
                  <div className="text-center mb-8">
                    <div className="text-6xl mb-4">{tier.icon}</div>
                    <h3 className="text-2xl font-bold text-white mb-2">{tier.name}</h3>
                    <p className="text-slate-400 text-sm mb-6">{tier.description}</p>

                    {/* Price */}
                    <div className="mb-4">
                      {tier.price === 0 ? (
                        <div className="text-4xl font-bold text-white">Free</div>
                      ) : (
                        <div>
                          <span className="text-4xl font-bold text-white">${tier.price}</span>
                          <span className="text-slate-400 ml-2">CAD / {tier.period}</span>
                        </div>
                      )}
                    </div>

                    {tier.trial && (
                      <div className="text-sm text-cyan-400 font-medium">
                        ✓ 7-day free trial, cancel anytime
                      </div>
                    )}
                  </div>

                  {/* Features list */}
                  <ul className="space-y-3 mb-8">
                    {tier.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        {feature.included ? (
                          <Check className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                        ) : (
                          <X className="h-5 w-5 text-slate-600 flex-shrink-0 mt-0.5" />
                        )}
                        <span className={`text-sm ${feature.included ? 'text-slate-300' : 'text-slate-600'}`}>
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA button */}
                  {isCurrentTier ? (
                    <button
                      disabled
                      className="w-full py-4 bg-green-600 text-white font-bold rounded-lg cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <Check className="h-5 w-5" />
                      Current Plan
                    </button>
                  ) : canUpgrade ? (
                    tier.enterprise ? (
                      <Link
                        to="/contact"
                        className={`block w-full py-4 text-white font-bold rounded-lg transition-all text-center ${tier.ctaStyle}`}
                      >
                        {tier.cta}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handleTierCheckout(tier.id as 'watchdog' | 'advanced' | 'enterprise')}
                        disabled={checkoutLoadingTier !== null}
                        className={`block w-full py-4 text-white font-bold rounded-lg transition-all text-center ${tier.ctaStyle}`}
                      >
                        {checkoutLoadingTier === tier.id ? 'Redirecting…' : tier.cta}
                      </button>
                    )
                  ) : (
                    <button
                      disabled
                      className="w-full py-4 bg-slate-700 text-slate-500 font-bold rounded-lg cursor-not-allowed"
                    >
                      {tierLevel < userLevel ? 'Included in Your Plan' : 'Sign Up First'}
                    </button>
                  )}

                  {tier.trial && !isCurrentTier && (
                    <p className="text-xs text-slate-500 text-center mt-3">
                      No credit card required for trial
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">Frequently Asked Questions</h2>

          <div className="space-y-6">
            {[
              {
                q: 'How does the 7-day free trial work?',
                a: 'Start your Edubiz trial with full access to all features. No credit card required upfront. After 7 days, you can choose to subscribe at $99/month CAD or revert to the Free plan.'
              },
              {
                q: 'Can I switch plans at any time?',
                a: 'Yes! Upgrade from Free to Edubiz or Pro anytime. Your billing adjusts automatically. Downgrading takes effect at your next billing cycle.'
              },
              {
                q: 'Are the certificates recognized?',
                a: 'Our certificates are issued upon completing all track modules and passing assessments. They demonstrate professional competency in Canadian energy systems and are valued by employers in the sector.'
              },
              {
                q: 'What is included in Pro support?',
                a: 'Pro members get a dedicated account manager, 24/7 phone support, priority email response (< 4 hours), and one on-site training session per year (within Canada).'
              },
              {
                q: 'Is Green Button data import secure?',
                a: 'Yes. We use OAuth 2.0 for secure connections to utility providers. Your data is encrypted in transit and at rest. We never store your utility login credentials. Pro plan only.'
              },
              {
                q: 'Can I get a refund?',
                a: 'We offer a 30-day money-back guarantee for Edubiz subscriptions. Contact support if you\'re not satisfied within the first 30 days for a full refund.'
              },
              {
                q: 'Do you offer team discounts?',
                a: 'Yes! Pro plan supports multi-user accounts. Contact sales for team pricing: 5+ users get 15% off, 10+ users get 25% off, 20+ users get 35% off.'
              },
              {
                q: 'What payment methods do you accept?',
                a: 'We accept all major credit cards (Visa, Mastercard, Amex) and electronic fund transfers (EFT) for annual subscriptions. Invoicing available for Pro accounts.'
              }
            ].map((faq, index) => (
              <details
                key={index}
                className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden group"
              >
                <summary className="cursor-pointer px-6 py-4 font-semibold text-white hover:bg-slate-750 transition-colors list-none flex items-center justify-between">
                  <span>{faq.q}</span>
                  <span className="text-cyan-400 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="px-6 pb-4 text-slate-300 leading-relaxed">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <div className="mt-16 bg-gradient-to-r from-cyan-900/30 to-purple-900/30 rounded-2xl border border-cyan-700 p-12 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Master Canadian Energy?
          </h2>
          <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
            Join thousands of energy professionals advancing their careers with our certificate programs
          </p>
          <div className="flex items-center justify-center gap-4">
            <a
              href={user ? '/certificates' : '/signup'}
              className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold rounded-lg transition-all text-lg flex items-center gap-2"
            >
              {user ? 'Browse Certificates' : 'Start Free Today'}
              <ArrowRight className="h-6 w-6" />
            </a>
            <a
              href="/contact-sales"
              className="px-8 py-4 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition-all text-lg"
            >
              Contact Sales
            </a>
          </div>
          <p className="text-sm text-slate-400 mt-6">
            No credit card required • 7-day free trial • Cancel anytime
          </p>
        </div>
      </div>
    </div>
  );
}
