import React from 'react';
import { useAuth } from './auth';
import { Check, X, Zap, TrendingUp, ArrowRight, Crown, Star } from 'lucide-react';

export function PricingPage() {
  const { user, edubizUser } = useAuth();
  const currentTier = edubizUser?.tier || 'free';

  const tiers = [
    {
      id: 'free',
      name: 'Free',
      icon: '🆓',
      price: 0,
      period: 'forever',
      description: 'Perfect for students and curious learners',
      features: [
        { text: 'View-only dashboards', included: true },
        { text: '10 AI queries per day', included: true },
        { text: 'Community forums access', included: true },
        { text: 'Basic data exports', included: true },
        { text: 'Certificate tracks', included: false },
        { text: 'Live webinars', included: false },
        { text: 'Badge system', included: false },
        { text: 'Unlimited AI queries', included: false },
        { text: 'Green Button data import', included: false },
        { text: 'Priority support', included: false }
      ],
      cta: 'Current Plan',
      ctaStyle: 'bg-slate-700 cursor-not-allowed',
      popular: false
    },
    {
      id: 'edubiz',
      name: 'Edubiz',
      icon: '🎓',
      price: 99,
      period: 'month',
      description: 'For professionals building energy expertise',
      features: [
        { text: 'Everything in Free', included: true },
        { text: 'All 3 certificate tracks (15 modules)', included: true },
        { text: 'Unlimited AI queries', included: true },
        { text: 'Live webinars (monthly)', included: true },
        { text: 'Badge & gamification system', included: true },
        { text: 'Advanced analytics dashboards', included: true },
        { text: 'Priority email support', included: true },
        { text: 'Certificate PDFs', included: true },
        { text: 'Green Button data import', included: false },
        { text: 'Custom reports & API access', included: false }
      ],
      cta: '7-Day Free Trial',
      ctaStyle: 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600',
      popular: true,
      trial: true
    },
    {
      id: 'pro',
      name: 'Pro',
      icon: '⭐',
      price: 1500,
      period: 'month',
      description: 'Enterprise-grade for SME energy managers',
      features: [
        { text: 'Everything in Edubiz', included: true },
        { text: 'Green Button data import', included: true },
        { text: 'Compliance tracking & reporting', included: true },
        { text: 'Custom dashboards & reports', included: true },
        { text: 'API access & webhooks', included: true },
        { text: 'White-label certificates', included: true },
        { text: 'Dedicated account manager', included: true },
        { text: '24/7 phone support', included: true },
        { text: 'On-site training (1x/year)', included: true },
        { text: 'Multi-user team accounts', included: true }
      ],
      cta: 'Contact Sales',
      ctaStyle: 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600',
      popular: false,
      enterprise: true
    }
  ];

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-900 to-purple-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-12 text-center">
          <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-xl text-blue-100 max-w-3xl mx-auto">
            Master Canadian energy systems with professional certificates, AI-powered insights, and live expert training
          </p>

          {user && (
            <div className="mt-6 inline-flex items-center gap-2 bg-blue-800/50 px-6 py-3 rounded-full">
              <span className="text-blue-200">Current plan:</span>
              <span className="font-bold capitalize">{currentTier}</span>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-16">
        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {tiers.map(tier => {
            const isCurrentTier = currentTier === tier.id;
            const canUpgrade = (
              (currentTier === 'free' && (tier.id === 'edubiz' || tier.id === 'pro')) ||
              (currentTier === 'edubiz' && tier.id === 'pro')
            );

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
                    <a
                      href={tier.enterprise ? '/contact-sales' : '/checkout'}
                      className={`block w-full py-4 text-white font-bold rounded-lg transition-all text-center ${tier.ctaStyle}`}
                    >
                      {tier.cta}
                    </a>
                  ) : tier.id === 'free' ? (
                    <button
                      disabled
                      className="w-full py-4 bg-slate-700 text-slate-500 font-bold rounded-lg cursor-not-allowed"
                    >
                      Cannot Downgrade
                    </button>
                  ) : (
                    <a
                      href={tier.enterprise ? '/contact-sales' : user ? '/checkout' : '/signup'}
                      className={`block w-full py-4 text-white font-bold rounded-lg transition-all text-center ${tier.ctaStyle}`}
                    >
                      {tier.cta}
                    </a>
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
