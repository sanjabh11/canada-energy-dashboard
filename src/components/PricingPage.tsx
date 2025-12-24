import React, { useState } from 'react';
import { Check, Star, Building2, Users, Zap, Shield, ArrowRight, Sparkles } from 'lucide-react';
import { usePaddle } from './billing/PaddleProvider';

interface PricingTier {
    id: string;
    name: string;
    description: string;
    price: string;
    priceDetail: string;
    priceId?: string; // Paddle price ID
    features: string[];
    highlighted?: boolean;
    ctaText: string;
    icon: React.ReactNode;
    badge?: string;
    thresholdNote?: string;
}

// Research-validated pricing tiers
// Municipal: Under $25k = sole-source, Under $75k = limited solicitation
const pricingTiers: PricingTier[] = [
    {
        id: 'free',
        name: 'Free',
        description: 'Essential grid monitoring for consumers',
        price: '$0',
        priceDetail: 'forever',
        features: [
            'Real-time Alberta grid status',
            'RoLR vs. retailer comparison (12¢ benchmark)',
            'Basic price alerts (1/day)',
            'Public data dashboards',
        ],
        ctaText: 'Get Started',
        icon: <Zap className="w-6 h-6" />,
    },
    {
        id: 'consumer',
        name: 'Rate Watchdog',
        description: 'For Albertan households saving on electricity',
        price: '$9',
        priceDetail: '/month',
        priceId: 'pri_consumer_monthly', // TODO: Replace with actual Paddle price ID
        features: [
            'Unlimited price alerts',
            'Retailer switching recommendations',
            'Bill auditing & error detection',
            'Historical rate analytics',
            'Peak shaving notifications',
        ],
        ctaText: 'Start Saving',
        icon: <Sparkles className="w-6 h-6" />,
        badge: 'Most Popular',
        highlighted: true,
    },
    {
        id: 'professional',
        name: 'Professional',
        description: 'For energy consultants & small firms',
        price: '$149',
        priceDetail: '/month',
        priceId: 'pri_professional_monthly',
        features: [
            'Everything in Rate Watchdog',
            'API access (1,000 calls/day)',
            'Custom report generation',
            'Multi-client dashboards',
            'Methane quantification tools',
            'Priority support',
        ],
        ctaText: 'Start Trial',
        icon: <Users className="w-6 h-6" />,
    },
    {
        id: 'municipal',
        name: 'Municipal',
        description: 'Climate Action Plan implementation tool',
        price: '$15,000',
        priceDetail: '/year',
        priceId: 'pri_municipal_annual',
        features: [
            'Everything in Professional',
            'Methane Compliance Engine',
            'TIER credit tracking & reporting',
            'GHG emissions dashboard',
            'Funder reporting templates',
            'Onboarding & training included',
            'Dedicated account manager',
        ],
        ctaText: 'Request Demo',
        icon: <Building2 className="w-6 h-6" />,
        thresholdNote: 'Below $25k sole-source threshold',
    },
    {
        id: 'enterprise',
        name: 'Enterprise',
        description: 'For mid-sized cities & utilities',
        price: '$49,000',
        priceDetail: '/year',
        priceId: 'pri_enterprise_annual',
        features: [
            'Everything in Municipal',
            'White-label deployment',
            'Custom integrations',
            'SSO & advanced security',
            'Dedicated infrastructure',
            'SLA guarantee (99.9%)',
            'Quarterly business reviews',
        ],
        ctaText: 'Contact Sales',
        icon: <Shield className="w-6 h-6" />,
        thresholdNote: 'Below $75k RFP threshold',
    },
];

export const PricingPage: React.FC = () => {
    const { openCheckout, isLoading } = usePaddle();
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');

    const handleCtaClick = (tier: PricingTier) => {
        if (tier.id === 'free') {
            window.location.href = '/dashboard';
            return;
        }

        if (tier.id === 'municipal' || tier.id === 'enterprise') {
            // High-value tiers go to contact form
            window.location.href = '/enterprise?tier=' + tier.id;
            return;
        }

        if (tier.priceId) {
            openCheckout(tier.priceId);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Header */}
            <header className="px-6 py-8 text-center">
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                    Simple, Transparent Pricing
                </h1>
                <p className="text-xl text-slate-300 max-w-2xl mx-auto">
                    From household savings to municipal compliance. Built for Alberta, priced for Canada.
                </p>

                {/* Billing Toggle */}
                <div className="mt-8 inline-flex items-center gap-4 bg-slate-800 rounded-full p-1">
                    <button
                        onClick={() => setBillingCycle('monthly')}
                        className={`px-6 py-2 rounded-full transition-all ${billingCycle === 'monthly'
                                ? 'bg-emerald-600 text-white'
                                : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        Monthly
                    </button>
                    <button
                        onClick={() => setBillingCycle('annual')}
                        className={`px-6 py-2 rounded-full transition-all ${billingCycle === 'annual'
                                ? 'bg-emerald-600 text-white'
                                : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        Annual <span className="text-emerald-400 ml-1 text-sm">Save 20%</span>
                    </button>
                </div>
            </header>

            {/* Trust Badges */}
            <div className="flex justify-center gap-8 mb-12 text-slate-400 text-sm">
                <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-500" />
                    <span>Paddle MoR (GST/HST handled)</span>
                </div>
                <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span>CAD Billing</span>
                </div>
                <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-emerald-500" />
                    <span>Cancel anytime</span>
                </div>
            </div>

            {/* Pricing Cards */}
            <div className="max-w-7xl mx-auto px-6 pb-24">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                    {pricingTiers.map((tier) => (
                        <div
                            key={tier.id}
                            className={`relative rounded-2xl p-6 flex flex-col ${tier.highlighted
                                    ? 'bg-gradient-to-b from-emerald-600/20 to-slate-800 border-2 border-emerald-500 scale-105'
                                    : 'bg-slate-800/50 border border-slate-700'
                                }`}
                        >
                            {/* Badge */}
                            {tier.badge && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                    <span className="bg-emerald-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                                        {tier.badge}
                                    </span>
                                </div>
                            )}

                            {/* Icon & Name */}
                            <div className="flex items-center gap-3 mb-4">
                                <div className={`p-2 rounded-lg ${tier.highlighted ? 'bg-emerald-600/30' : 'bg-slate-700'}`}>
                                    {tier.icon}
                                </div>
                                <h3 className="text-xl font-semibold text-white">{tier.name}</h3>
                            </div>

                            {/* Description */}
                            <p className="text-slate-400 text-sm mb-4">{tier.description}</p>

                            {/* Price */}
                            <div className="mb-6">
                                <span className="text-3xl font-bold text-white">{tier.price}</span>
                                <span className="text-slate-400 ml-1">{tier.priceDetail}</span>
                                {tier.thresholdNote && (
                                    <p className="text-xs text-emerald-400 mt-1">{tier.thresholdNote}</p>
                                )}
                            </div>

                            {/* Features */}
                            <ul className="space-y-3 mb-6 flex-grow">
                                {tier.features.map((feature, idx) => (
                                    <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                                        <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            {/* CTA Button */}
                            <button
                                onClick={() => handleCtaClick(tier)}
                                disabled={isLoading}
                                className={`w-full py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${tier.highlighted
                                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                        : 'bg-slate-700 hover:bg-slate-600 text-white'
                                    }`}
                            >
                                {tier.ctaText}
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* FAQ Teaser */}
            <div className="text-center pb-12">
                <p className="text-slate-400">
                    Questions about municipal procurement?{' '}
                    <a href="/enterprise" className="text-emerald-400 hover:underline">
                        See our RFP-friendly packages →
                    </a>
                </p>
            </div>
        </div>
    );
};

export default PricingPage;
