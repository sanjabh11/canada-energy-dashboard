import React, { useState, useEffect } from 'react';
import { Check, Star, Building2, Users, Zap, Shield, ArrowRight, Sparkles, Home } from 'lucide-react';
import { trackEvent, captureAttribution } from '../lib/analytics';
import { Link } from 'react-router-dom';
import { usePaddle } from './billing/PaddleProvider';
import { SEOHead } from './SEOHead';
import { CEIP_PRICING, formatUsd } from '../lib/pricingCatalog';
import { trackRouteIntentCta, trackRouteIntentView } from '../lib/gtm';

interface PricingTier {
    id: string;
    name: string;
    description: string;
    monthlyPrice: number;
    price: string;
    priceDetail: string;
    priceId?: string; // Paddle monthly price ID
    annualMode?: 'sales_assisted' | 'not_available';
    features: string[];
    highlighted?: boolean;
    ctaText: string;
    icon: React.ReactNode;
    badge?: string;
    thresholdNote?: string;
}

// Research-validated pricing tiers (Dec 2025 Value Prop Research)
// Municipal: $70,800/yr = NWPTA sole-source optimal (<$75k)
// Industrial: Base + 20% Success Fee = 776% ROI story
const pricingTiers: PricingTier[] = [
    {
        id: 'free',
        name: 'Free',
        description: 'Real-time grid monitoring for consumers',
        monthlyPrice: 0,
        price: '$0',
        priceDetail: 'forever',
        annualMode: 'not_available',
        features: [
            'Live Alberta pool price tracking',
            'RoLR 12¢ benchmark comparison',
            'Daily price alerts',
            'Public dashboards',
        ],
        ctaText: 'Start Free',
        icon: <Zap className="w-6 h-6" />,
    },
    {
        id: 'consumer',
        name: 'Rate Watchdog',
        description: 'Stop overpaying on electricity',
        monthlyPrice: CEIP_PRICING.direct.consumer_watchdog,
        price: formatUsd(CEIP_PRICING.direct.consumer_watchdog),
        priceDetail: '/month',
        priceId: 'pri_consumer_monthly',
        annualMode: 'not_available',
        features: [
            'Bill auditing & error detection',
            'Retailer switching recommendations',
            'Peak shaving alerts (save 15%)',
            'Historical rate analytics',
            'Unlimited price alerts',
        ],
        ctaText: 'Start Saving $500/yr',
        icon: <Sparkles className="w-6 h-6" />,
        badge: 'Most Popular',
        highlighted: true,
    },
    {
        id: 'professional',
        name: 'Professional',
        description: 'For energy consultants & advisors',
        monthlyPrice: CEIP_PRICING.direct.professional,
        price: formatUsd(CEIP_PRICING.direct.professional),
        priceDetail: '/month',
        priceId: 'pri_professional_monthly',
        annualMode: 'sales_assisted',
        features: [
            'Everything in Rate Watchdog',
            'API access (1,000 calls/day)',
            'Multi-client dashboards',
            'Custom report generation',
            'Methane quantification tools',
            'Priority support',
        ],
        ctaText: 'Start 14-Day Trial',
        icon: <Users className="w-6 h-6" />,
    },
    {
        id: 'industrial',
        name: 'Industrial TIER',
        description: 'Turn compliance into profit',
        monthlyPrice: CEIP_PRICING.direct.industrial_tier,
        price: formatUsd(CEIP_PRICING.direct.industrial_tier),
        priceDetail: '/mo + 20% savings',
        priceId: 'pri_industrial_monthly',
        annualMode: 'not_available',
        features: [
            'Live TIER credit pricing (EPC/Offsets)',
            'Arbitrage alerts: Buy at $25, not $95',
            'Direct Investment audit trail',
            'Bank-ready compliance reports',
            'Dedicated compliance manager',
            '776% avg client ROI',
        ],
        ctaText: 'Calculate My Savings',
        icon: <Building2 className="w-6 h-6" />,
        badge: 'Highest ROI',
        thresholdNote: '20% success fee on documented savings',
    },
    {
        id: 'municipal',
        name: 'Municipal',
        description: '30-Day Climate Action Plan. No RFP.',
        monthlyPrice: CEIP_PRICING.direct.municipal,
        price: formatUsd(CEIP_PRICING.direct.municipal),
        priceDetail: '/month',
        annualMode: 'sales_assisted',
        features: [
            'Everything in Professional',
            'Methane Compliance Engine',
            'TIER credit tracking',
            'FCM/AICEI grant templates',
            'Mayor-ready quarterly reports',
            'Onboarding & training included',
        ],
        ctaText: 'Request Demo',
        icon: <Building2 className="w-6 h-6" />,
        thresholdNote: '$70,800/yr - Below NWPTA threshold',
    },
    {
        id: 'indigenous',
        name: 'Sovereign',
        description: 'Your Data, Your Jurisdiction',
        monthlyPrice: CEIP_PRICING.direct.sovereign,
        price: formatUsd(CEIP_PRICING.direct.sovereign),
        priceDetail: '/month',
        priceId: 'pri_indigenous_monthly',
        annualMode: 'sales_assisted',
        features: [
            'OCAP® compliant architecture',
            'Nation-controlled encryption keys',
            'Greener Homes grant automation',
            'AICEI reporting templates',
            'Capacity building support',
            'ISC grant-aligned pricing',
        ],
        ctaText: 'Book Consultation',
        icon: <Shield className="w-6 h-6" />,
        thresholdNote: 'Data sovereignty guaranteed',
    },
];

export const PricingPage: React.FC = () => {
    const { openCheckout, isLoading } = usePaddle();
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');

    useEffect(() => {
        captureAttribution();
        trackRouteIntentView('pricing', { billing_cycle: billingCycle });
        trackEvent('pricing_page_view', { billing_cycle: billingCycle });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        trackEvent('pricing_billing_cycle_changed', { billing_cycle: billingCycle });
    }, [billingCycle]);

    const supportsAnnualDisplay = (tier: PricingTier): boolean =>
        billingCycle === 'annual' && tier.annualMode === 'sales_assisted';

    const getAnnualMonthlyEquivalent = (tier: PricingTier): string =>
        `$${(Math.round(tier.monthlyPrice * 0.8 * 12) / 12).toFixed(2).replace(/\.00$/, '')}`;

    const getAnnualInvoiceAmount = (tier: PricingTier): number =>
        Math.round(tier.monthlyPrice * 0.8 * 12);

    const handleCtaClick = (tier: PricingTier) => {
        trackRouteIntentCta('pricing', `pricing_${tier.id}_cta`, {
            tier_id: tier.id,
            tier_name: tier.name,
            billing_cycle: billingCycle,
        });

        trackEvent('pricing_cta_click', {
            tier_id: tier.id,
            tier_name: tier.name,
            price: tier.price,
            billing_cycle: billingCycle,
            persona: tier.id === 'municipal' ? 'municipal' : 
                     tier.id === 'indigenous' ? 'indigenous' : 
                     tier.id === 'industrial' ? 'industrial' : 'standard'
        });

        if (billingCycle === 'annual' && tier.annualMode === 'sales_assisted') {
            trackEvent('lead_intent_update', {
                intent: 'annual_quote_request',
                tier: tier.id,
                route: tier.id === 'municipal' ? '/municipal' : '/enterprise',
            });
            if (tier.id === 'municipal') {
                window.location.href = '/municipal';
                return;
            }
            const industryTier = tier.id === 'professional' ? 'consulting' : tier.id;
            window.location.href = `/enterprise?checkout=fallback&priceId=${tier.id}_annual_quote&tier=${industryTier}`;
            return;
        }

        if (billingCycle === 'annual' && tier.annualMode === 'not_available') {
            trackEvent('annual_cycle_not_supported', {
                tier: tier.id,
                fallback: 'monthly',
            });
        }

        if (tier.id === 'free') {
            window.location.href = '/dashboard';
            return;
        }

        if (tier.id === 'municipal') {
            trackEvent('lead_intent_update', { intent: 'municipal_inquiry', tier: 'municipal' });
            window.location.href = '/municipal';
            return;
        }

        if (tier.id === 'indigenous') {
            trackEvent('lead_intent_update', { intent: 'indigenous_inquiry', tier: 'indigenous' });
            window.location.href = '/enterprise?tier=indigenous';
            return;
        }

        if (tier.id === 'industrial') {
            trackEvent('lead_intent_update', { intent: 'industrial_inquiry', tier: 'industrial' });
            window.location.href = '/roi-calculator';
            return;
        }

        if (tier.priceId) {
            trackEvent('lead_intent_update', { intent: 'checkout_initiated', tier: tier.id });
            openCheckout(tier.priceId);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            <SEOHead
                title="CEIP Pricing | From Free to Enterprise — Alberta Energy Compliance Tools"
                description={`Transparent pricing for Canada's energy intelligence platform. Rate Watchdog ${formatUsd(CEIP_PRICING.direct.consumer_watchdog)}/mo, Professional ${formatUsd(CEIP_PRICING.direct.professional)}/mo, Industrial TIER ${formatUsd(CEIP_PRICING.direct.industrial_tier)}/mo, Municipal ${formatUsd(CEIP_PRICING.direct.municipal)}/mo. All under NWPTA sole-source threshold.`}
                path="/pricing"
                keywords={['CEIP pricing', 'energy compliance pricing', 'TIER compliance cost', 'municipal energy tools price', 'Alberta energy platform']}
            />

            {/* Navigation */}
            <nav className="px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
                <Link to="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                    <Home className="h-4 w-4" />
                    <span className="text-sm">Back to Dashboard</span>
                </Link>
                <div className="flex items-center gap-4 text-sm">
                    <Link to="/enterprise" className="text-slate-400 hover:text-white transition-colors">Enterprise</Link>
                    <Link to="/municipal" className="text-slate-400 hover:text-white transition-colors">Municipal</Link>
                    <Link to="/roi-calculator" className="text-emerald-400 hover:text-emerald-300 transition-colors">TIER Calculator</Link>
                </div>
            </nav>

            {/* Header */}
            <header className="px-6 py-8 text-center">
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                    Turn Compliance into Profit
                </h1>
                <p className="text-xl text-slate-300 max-w-2xl mx-auto">
                    Why pay $95/tonne when credits trade at $25? Automate your TIER arbitrage and save 776% more.
                </p>

                <div className="mt-6 mx-auto max-w-4xl rounded-xl border border-slate-700 bg-slate-900/60 p-4 text-sm">
                    <p className="text-slate-200 font-semibold mb-2">Two-Lane GTM Offer Structure</p>
                    <p className="text-slate-400">
                        <span className="text-cyan-300">Whop lane:</span> Wedge + trials ({formatUsd(CEIP_PRICING.whop.whop_basic)} / {formatUsd(CEIP_PRICING.whop.whop_pro)} / {formatUsd(CEIP_PRICING.whop.whop_team)} per month).
                        {' '}
                        <span className="text-emerald-300">Direct lane:</span> Consultancy/municipal/industrial closes ({formatUsd(CEIP_PRICING.direct.professional)}+ per month).
                    </p>
                </div>

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
                <p className="mt-3 text-xs text-slate-500">
                    Annual plans for Professional, Municipal, and Sovereign are sales-assisted.
                </p>
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

                            {/* Price - Dynamic based on billing cycle */}
                            <div className="mb-6">
                                <span className="text-3xl font-bold text-white">
                                    {supportsAnnualDisplay(tier)
                                        ? getAnnualMonthlyEquivalent(tier)
                                        : tier.price}
                                </span>
                                <span className="text-slate-400 ml-1">
                                    {tier.priceDetail}
                                </span>
                                {supportsAnnualDisplay(tier) && (
                                    <p className="text-xs text-emerald-400 mt-1">
                                        {`Annual invoicing quote available (~${getAnnualInvoiceAmount(tier)}/yr equivalent)`}
                                    </p>
                                )}
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

            {/* Cross-Links */}
            <div className="text-center pb-12 space-y-3">
                <p className="text-slate-400">
                    Questions about municipal procurement?{' '}
                    <Link to="/municipal" className="text-emerald-400 hover:underline">
                        See our municipal page →
                    </Link>
                </p>
                <p className="text-slate-400">
                    Want to calculate TIER savings first?{' '}
                    <Link to="/roi-calculator" className="text-emerald-400 hover:underline">
                        Try our free ROI calculator →
                    </Link>
                </p>
                <p className="text-slate-400">
                    See how we compare to alternatives:{' '}
                    <Link to="/compare" className="text-emerald-400 hover:underline">
                        CEIP vs. competitors →
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default PricingPage;
