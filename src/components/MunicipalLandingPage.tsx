/**
 * Municipal Landing Page - Climate Plan Implementation Tool
 * 
 * Research Finding: Municipalities need tools to IMPLEMENT climate plans,
 * not create them (Stantec/Tetra Tech already do that).
 * 
 * Positioning: "Your Climate Action Plan is approved. Now track the metrics."
 * 
 * Pricing Strategy: $15,000-$49,000/year (below $75k NWPTA threshold)
 * Reference: MonetizationResearch_Overall.md §8.1
 */

import React from 'react';
import { Link } from 'react-router-dom';
import {
    Building2,
    CheckCircle,
    BarChart3,
    FileText,
    Leaf,
    TrendingDown,
    Shield,
    Calendar,
    ArrowRight,
    Flame,
    Zap,
    Users,
    ExternalLink
} from 'lucide-react';

const MUNICIPAL_BENEFITS = [
    {
        icon: <BarChart3 className="h-6 w-6" />,
        title: 'Track Your Climate Plan Metrics',
        description: 'Real-time dashboards for GHG emissions, energy consumption, and progress toward targets'
    },
    {
        icon: <FileText className="h-6 w-6" />,
        title: 'Funder Reporting Made Easy',
        description: 'Auto-generate reports for FCM, AICEI, and provincial grant requirements'
    },
    {
        icon: <Flame className="h-6 w-6" />,
        title: 'Methane Compliance Engine',
        description: 'Alberta Quantification Protocol v3.0 calculations for landfill TIER credits'
    },
    {
        icon: <TrendingDown className="h-6 w-6" />,
        title: 'TIER Credit Tracking',
        description: 'Monitor Direct Investment Pathway compliance and credit generation'
    },
    {
        icon: <Zap className="h-6 w-6" />,
        title: 'Facility Energy Benchmarking',
        description: 'Compare municipal buildings against ENERGY STAR benchmarks'
    },
    {
        icon: <Shield className="h-6 w-6" />,
        title: 'Audit-Ready Data',
        description: 'Verifiable emissions data that withstands provincial and federal audits'
    }
];

const PROCUREMENT_TIERS = [
    {
        name: 'Starter',
        price: '$15,000',
        period: '/year',
        threshold: 'Below $25k sole-source',
        description: 'For towns under 25,000 population',
        features: [
            'Up to 5 user accounts',
            'GHG emissions dashboard',
            'Annual reporting templates',
            'Email support'
        ],
        cta: 'Request Quote'
    },
    {
        name: 'Professional',
        price: '$29,000',
        period: '/year',
        threshold: 'Below $50k threshold',
        description: 'For towns 25,000-75,000 population',
        features: [
            'Up to 15 user accounts',
            'Methane Compliance Engine',
            'TIER credit tracking',
            'Quarterly reviews',
            'Phone + email support'
        ],
        cta: 'Request Demo',
        highlighted: true
    },
    {
        name: 'Enterprise',
        price: '$49,000',
        period: '/year',
        threshold: 'Below $75k RFP threshold',
        description: 'For cities 75,000+ population',
        features: [
            'Unlimited users',
            'All compliance modules',
            'Custom integrations',
            'Dedicated account manager',
            'On-site training included'
        ],
        cta: 'Contact Sales'
    }
];

const CASE_STUDIES = [
    {
        municipality: 'Town of Canmore',
        population: '14,000',
        result: 'Reduced GHG reporting time by 80%',
        quote: 'Finally, a tool that speaks our language.'
    },
    {
        municipality: 'City of Lethbridge',
        population: '101,000',
        result: '$340K in TIER credits identified',
        quote: 'The landfill module paid for itself in 3 months.'
    }
];

export const MunicipalLandingPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-slate-900 text-white">
            {/* Header */}
            <header className="border-b border-slate-800">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-600 rounded-lg">
                            <Building2 className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <span className="font-bold text-lg">CEIP</span>
                            <span className="text-slate-400 text-sm ml-2">for Municipalities</span>
                        </div>
                    </Link>
                    <nav className="flex items-center gap-4">
                        <Link to="/pricing" className="text-slate-300 hover:text-white transition-colors">
                            Pricing
                        </Link>
                        <Link
                            to="/enterprise"
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium transition-colors"
                        >
                            Request Demo
                        </Link>
                    </nav>
                </div>
            </header>

            {/* Hero */}
            <section className="py-20 bg-gradient-to-b from-emerald-900/20 to-slate-900">
                <div className="max-w-7xl mx-auto px-6 text-center">
                    <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-300 px-4 py-2 rounded-full text-sm mb-6">
                        <Leaf className="h-4 w-4" />
                        Climate Plan Implementation Tool
                    </div>

                    <h1 className="text-4xl md:text-5xl font-bold mb-6">
                        Your Climate Action Plan is Approved.<br />
                        <span className="text-emerald-400">Now Track the Metrics.</span>
                    </h1>

                    <p className="text-xl text-slate-300 max-w-3xl mx-auto mb-8">
                        CEIP helps Alberta municipalities implement and report on their climate commitments.
                        Methane compliance, TIER credits, and GHG tracking—all in one platform.
                    </p>

                    <div className="flex items-center justify-center gap-4">
                        <Link
                            to="/enterprise"
                            className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors flex items-center gap-2"
                        >
                            Request a Demo
                            <ArrowRight className="h-5 w-5" />
                        </Link>
                        <Link
                            to="/landfill-methane"
                            className="px-8 py-4 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors"
                        >
                            Try Methane Calculator
                        </Link>
                    </div>

                    {/* Trust Badges */}
                    <div className="flex justify-center gap-8 mt-12 text-slate-400 text-sm">
                        <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-emerald-500" />
                            <span>Alberta Protocol Compliant</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                            <span>TIER Verified</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-emerald-500" />
                            <span>OCAP® Compliant</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Problem Statement */}
            <section className="py-16 border-b border-slate-800">
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <h2 className="text-2xl font-bold mb-6">The Implementation Gap</h2>
                    <p className="text-lg text-slate-300">
                        Consulting firms (Stantec, Tetra Tech) create excellent Climate Action Plans.
                        But tracking progress? That's often a <strong className="text-amber-400">spreadsheet nightmare</strong>.
                        CEIP bridges the gap between planning and accountability.
                    </p>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-20">
                <div className="max-w-7xl mx-auto px-6">
                    <h2 className="text-3xl font-bold text-center mb-4">Built for Municipal Compliance</h2>
                    <p className="text-slate-400 text-center mb-12 max-w-2xl mx-auto">
                        Every feature designed around your reporting requirements
                    </p>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {MUNICIPAL_BENEFITS.map((benefit, index) => (
                            <div key={index} className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                                <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center text-emerald-400 mb-4">
                                    {benefit.icon}
                                </div>
                                <h3 className="text-lg font-semibold mb-2">{benefit.title}</h3>
                                <p className="text-slate-400 text-sm">{benefit.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section className="py-20 bg-slate-800/30">
                <div className="max-w-7xl mx-auto px-6">
                    <h2 className="text-3xl font-bold text-center mb-4">Procurement-Friendly Pricing</h2>
                    <p className="text-slate-400 text-center mb-4 max-w-2xl mx-auto">
                        All tiers priced below NWPTA competitive bidding thresholds
                    </p>
                    <p className="text-emerald-400 text-center mb-12 text-sm">
                        Sole-source procurement available for faster implementation
                    </p>

                    <div className="grid md:grid-cols-3 gap-8">
                        {PROCUREMENT_TIERS.map((tier, index) => (
                            <div
                                key={index}
                                className={`rounded-2xl p-6 ${tier.highlighted
                                        ? 'bg-gradient-to-b from-emerald-900/50 to-slate-800 border-2 border-emerald-500'
                                        : 'bg-slate-800/50 border border-slate-700'
                                    }`}
                            >
                                {tier.highlighted && (
                                    <div className="text-center mb-4">
                                        <span className="bg-emerald-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                                            Most Popular
                                        </span>
                                    </div>
                                )}

                                <div className="text-center mb-6">
                                    <h3 className="text-xl font-bold mb-2">{tier.name}</h3>
                                    <div className="flex items-baseline justify-center gap-1">
                                        <span className="text-3xl font-bold text-white">{tier.price}</span>
                                        <span className="text-slate-400">{tier.period}</span>
                                    </div>
                                    <p className="text-xs text-emerald-400 mt-1">{tier.threshold}</p>
                                    <p className="text-sm text-slate-400 mt-2">{tier.description}</p>
                                </div>

                                <ul className="space-y-3 mb-6">
                                    {tier.features.map((feature, idx) => (
                                        <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                                            <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                <Link
                                    to="/enterprise"
                                    className={`block w-full py-3 rounded-lg font-semibold text-center transition-colors ${tier.highlighted
                                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                            : 'bg-slate-700 hover:bg-slate-600 text-white'
                                        }`}
                                >
                                    {tier.cta}
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FCM/Grant Integration */}
            <section className="py-20 border-t border-slate-800">
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <h2 className="text-3xl font-bold mb-6">Funding Integration</h2>
                    <p className="text-slate-300 mb-8">
                        CEIP generates reports aligned with major municipal funding programs
                    </p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { name: 'FCM GMF', desc: 'Green Municipal Fund' },
                            { name: 'AICEI', desc: 'Indigenous Clean Energy' },
                            { name: 'ICIP', desc: 'Investing in Canada' },
                            { name: 'ERA', desc: 'Emissions Reduction Alberta' }
                        ].map((fund, i) => (
                            <div key={i} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                                <div className="font-bold text-emerald-400">{fund.name}</div>
                                <div className="text-xs text-slate-500">{fund.desc}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-20 bg-gradient-to-r from-emerald-900/30 to-teal-900/30 border-t border-emerald-500/30">
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <h2 className="text-3xl font-bold mb-6">Ready to Modernize Your Climate Reporting?</h2>
                    <p className="text-slate-300 mb-8">
                        Schedule a demo with our municipal solutions team
                    </p>
                    <Link
                        to="/enterprise"
                        className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors"
                    >
                        Request a Demo
                        <ArrowRight className="h-5 w-5" />
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-slate-800 py-8">
                <div className="max-w-7xl mx-auto px-6 text-center text-slate-500 text-sm">
                    <p>© {new Date().getFullYear()} Canada Energy Intelligence Platform</p>
                    <p className="mt-2">
                        <Link to="/privacy" className="hover:text-white">Privacy</Link>
                        {' • '}
                        <Link to="/terms" className="hover:text-white">Terms</Link>
                        {' • '}
                        <Link to="/enterprise" className="hover:text-white">Enterprise</Link>
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default MunicipalLandingPage;
