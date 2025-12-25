/**
 * Competitive Comparison Page (M5)
 * Based on Value Proposition Research Dec 2025
 * 
 * Purpose: SEO-optimized comparison vs. Carbonhound, Measurabl, Energy Toolbase
 * Shows why CEIP wins for Canadian energy compliance
 */

import React from 'react';
import {
    CheckCircle,
    XCircle,
    Minus,
    ArrowRight,
    Shield,
    Zap,
    Building2,
    DollarSign,
    Globe,
    Leaf
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface CompetitorFeature {
    feature: string;
    ceip: 'yes' | 'no' | 'partial';
    energyToolbase: 'yes' | 'no' | 'partial';
    carbonhound: 'yes' | 'no' | 'partial';
    measurabl: 'yes' | 'no' | 'partial';
    importance: 'critical' | 'high' | 'medium';
}

const FEATURES: CompetitorFeature[] = [
    { feature: 'Alberta TIER dual-pricing ($95/$25)', ceip: 'yes', energyToolbase: 'no', carbonhound: 'no', measurabl: 'no', importance: 'critical' },
    { feature: 'TIER Credit Arbitrage Engine', ceip: 'yes', energyToolbase: 'no', carbonhound: 'no', measurabl: 'no', importance: 'critical' },
    { feature: 'Direct Investment (DIP) Automation', ceip: 'yes', energyToolbase: 'no', carbonhound: 'no', measurabl: 'no', importance: 'critical' },
    { feature: 'OCAP® Indigenous Data Sovereignty', ceip: 'yes', energyToolbase: 'no', carbonhound: 'no', measurabl: 'no', importance: 'critical' },
    { feature: 'RoLR 12¢ Benchmark Comparison', ceip: 'yes', energyToolbase: 'no', carbonhound: 'no', measurabl: 'no', importance: 'high' },
    { feature: 'NWPTA Procurement-Ready Pricing', ceip: 'yes', energyToolbase: 'no', carbonhound: 'partial', measurabl: 'partial', importance: 'high' },
    { feature: 'CAD-Native Billing (Paddle MoR)', ceip: 'yes', energyToolbase: 'no', carbonhound: 'yes', measurabl: 'no', importance: 'high' },
    { feature: 'Real-time AESO Pool Price', ceip: 'yes', energyToolbase: 'partial', carbonhound: 'no', measurabl: 'no', importance: 'high' },
    { feature: 'Methane Quantification (AB Protocol)', ceip: 'yes', energyToolbase: 'no', carbonhound: 'partial', measurabl: 'no', importance: 'high' },
    { feature: 'FCM/AICEI Grant Templates', ceip: 'yes', energyToolbase: 'no', carbonhound: 'no', measurabl: 'no', importance: 'medium' },
    { feature: 'Professional Certification LMS', ceip: 'yes', energyToolbase: 'no', carbonhound: 'no', measurabl: 'no', importance: 'medium' },
    { feature: 'Bank-Ready Export (TD/RBC)', ceip: 'yes', energyToolbase: 'no', carbonhound: 'no', measurabl: 'partial', importance: 'medium' },
    { feature: 'Solar/Storage Project Modeling', ceip: 'partial', energyToolbase: 'yes', carbonhound: 'no', measurabl: 'no', importance: 'medium' },
    { feature: 'Scope 1/2/3 Carbon Accounting', ceip: 'partial', energyToolbase: 'no', carbonhound: 'yes', measurabl: 'yes', importance: 'medium' },
    { feature: 'GRESB/CDP Real Estate Reporting', ceip: 'no', energyToolbase: 'no', carbonhound: 'partial', measurabl: 'yes', importance: 'medium' },
];

const COMPETITORS = [
    {
        id: 'ceip',
        name: 'CEIP',
        fullName: 'Canada Energy Intelligence Platform',
        pricing: '$9 - $5,900/mo',
        focus: 'Canadian Compliance & Sovereignty',
        color: 'emerald'
    },
    {
        id: 'energyToolbase',
        name: 'Energy Toolbase',
        fullName: 'Energy Toolbase',
        pricing: '$170 - $224 USD/mo',
        focus: 'Solar & Storage Modeling',
        color: 'slate'
    },
    {
        id: 'carbonhound',
        name: 'Carbonhound',
        fullName: 'Carbonhound',
        pricing: '$50 - $300 USD/mo',
        focus: 'SME Carbon Accounting',
        color: 'slate'
    },
    {
        id: 'measurabl',
        name: 'Measurabl',
        fullName: 'Measurabl',
        pricing: 'Free - $25/building/mo',
        focus: 'Real Estate ESG',
        color: 'slate'
    },
];

const StatusIcon: React.FC<{ status: 'yes' | 'no' | 'partial' }> = ({ status }) => {
    switch (status) {
        case 'yes':
            return <CheckCircle className="h-5 w-5 text-emerald-400" />;
        case 'no':
            return <XCircle className="h-5 w-5 text-red-400" />;
        case 'partial':
            return <Minus className="h-5 w-5 text-yellow-400" />;
    }
};

export const CompetitorComparison: React.FC = () => {
    const ceipWins = FEATURES.filter(f => f.ceip === 'yes' && f.importance === 'critical').length;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Hero */}
            <header className="px-6 py-16 text-center">
                <div className="max-w-4xl mx-auto">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600/20 rounded-full text-emerald-400 text-sm font-medium mb-6">
                        <Shield className="h-4 w-4" />
                        The Only Platform Built for Canadian Compliance
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
                        CEIP vs. The Competition
                    </h1>
                    <p className="text-xl text-slate-300 max-w-2xl mx-auto">
                        Why Energy Toolbase, Carbonhound, and Measurabl can't match our
                        Alberta TIER, OCAP®, and procurement-optimized pricing
                    </p>
                </div>
            </header>

            {/* Quick Stats */}
            <div className="max-w-6xl mx-auto px-6 mb-12">
                <div className="grid md:grid-cols-4 gap-6">
                    <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-2xl p-6 text-center">
                        <div className="text-4xl font-bold text-emerald-400">{ceipWins}</div>
                        <div className="text-sm text-slate-400 mt-1">Critical Features Only CEIP Has</div>
                    </div>
                    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 text-center">
                        <div className="text-4xl font-bold text-white">$70</div>
                        <div className="text-sm text-slate-400 mt-1">Arbitrage per Tonne ($95 - $25)</div>
                    </div>
                    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 text-center">
                        <div className="text-4xl font-bold text-white">776%</div>
                        <div className="text-sm text-slate-400 mt-1">Avg Industrial Client ROI</div>
                    </div>
                    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 text-center">
                        <div className="text-4xl font-bold text-white">&lt;$75k</div>
                        <div className="text-sm text-slate-400 mt-1">NWPTA Sole-Source Ready</div>
                    </div>
                </div>
            </div>

            {/* Comparison Table */}
            <div className="max-w-6xl mx-auto px-6 mb-16">
                <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-700">
                                    <th className="text-left py-4 px-6 text-slate-400 font-medium">Feature</th>
                                    {COMPETITORS.map(comp => (
                                        <th key={comp.id} className={`text-center py-4 px-4 ${comp.id === 'ceip' ? 'bg-emerald-900/20' : ''
                                            }`}>
                                            <div className={`font-bold ${comp.id === 'ceip' ? 'text-emerald-400' : 'text-white'}`}>
                                                {comp.name}
                                            </div>
                                            <div className="text-xs text-slate-400 mt-1">{comp.pricing}</div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {FEATURES.map((feature, idx) => (
                                    <tr
                                        key={idx}
                                        className={`border-b border-slate-700/50 ${feature.importance === 'critical' ? 'bg-slate-700/20' : ''
                                            }`}
                                    >
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-2">
                                                {feature.importance === 'critical' && (
                                                    <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded">CRITICAL</span>
                                                )}
                                                <span className="text-white">{feature.feature}</span>
                                            </div>
                                        </td>
                                        <td className="text-center py-4 px-4 bg-emerald-900/10">
                                            <div className="flex justify-center">
                                                <StatusIcon status={feature.ceip} />
                                            </div>
                                        </td>
                                        <td className="text-center py-4 px-4">
                                            <div className="flex justify-center">
                                                <StatusIcon status={feature.energyToolbase} />
                                            </div>
                                        </td>
                                        <td className="text-center py-4 px-4">
                                            <div className="flex justify-center">
                                                <StatusIcon status={feature.carbonhound} />
                                            </div>
                                        </td>
                                        <td className="text-center py-4 px-4">
                                            <div className="flex justify-center">
                                                <StatusIcon status={feature.measurabl} />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Legend */}
                    <div className="p-4 border-t border-slate-700 flex items-center justify-center gap-8 text-sm">
                        <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-emerald-400" />
                            <span className="text-slate-400">Full Support</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Minus className="h-4 w-4 text-yellow-400" />
                            <span className="text-slate-400">Partial/Limited</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <XCircle className="h-4 w-4 text-red-400" />
                            <span className="text-slate-400">Not Supported</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Why CEIP Wins */}
            <div className="max-w-6xl mx-auto px-6 mb-16">
                <h2 className="text-2xl font-bold text-white text-center mb-8">
                    Why Canadian Organizations Choose CEIP
                </h2>
                <div className="grid md:grid-cols-3 gap-6">
                    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                        <div className="p-3 bg-emerald-600/20 rounded-xl inline-block mb-4">
                            <DollarSign className="h-8 w-8 text-emerald-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">TIER Credit Arbitrage</h3>
                        <p className="text-slate-400 text-sm">
                            Save $70/tonne by buying market credits at $25 instead of paying the $95 fund price.
                            No competitor offers live EPC pricing or Direct Investment automation.
                        </p>
                    </div>

                    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                        <div className="p-3 bg-blue-600/20 rounded-xl inline-block mb-4">
                            <Shield className="h-8 w-8 text-blue-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">OCAP® Data Sovereignty</h3>
                        <p className="text-slate-400 text-sm">
                            The only platform designed for Indigenous data sovereignty. US-based competitors
                            (Measurabl, Energy Toolbase) fail the "Possession" principle of OCAP®.
                        </p>
                    </div>

                    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                        <div className="p-3 bg-amber-600/20 rounded-xl inline-block mb-4">
                            <Building2 className="h-8 w-8 text-amber-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">Procurement-Ready</h3>
                        <p className="text-slate-400 text-sm">
                            Our Municipal tier at $70,800/year is priced specifically below the $75k NWPTA
                            threshold. Skip the RFP process and deploy in 30 days.
                        </p>
                    </div>
                </div>
            </div>

            {/* CTA */}
            <div className="max-w-4xl mx-auto px-6 pb-16">
                <div className="bg-gradient-to-r from-emerald-600/20 to-blue-600/20 border-2 border-emerald-500 rounded-2xl p-8 text-center">
                    <h2 className="text-2xl font-bold text-white mb-4">
                        Ready to Switch from a Generic Platform?
                    </h2>
                    <p className="text-slate-300 mb-6 max-w-2xl mx-auto">
                        Stop paying for features you don't need. Start with the only platform built
                        specifically for Canadian energy compliance and Indigenous data sovereignty.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            to="/roi-calculator"
                            className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-semibold text-white transition-all inline-flex items-center justify-center gap-2"
                        >
                            Calculate Your Savings
                            <ArrowRight className="h-5 w-5" />
                        </Link>
                        <Link
                            to="/pricing"
                            className="px-8 py-4 bg-slate-700 hover:bg-slate-600 rounded-xl font-medium text-white transition-all inline-flex items-center justify-center gap-2"
                        >
                            View Pricing
                        </Link>
                    </div>
                </div>
            </div>

            {/* SEO Footer */}
            <footer className="border-t border-slate-800 py-8 px-6 text-center text-sm text-slate-500">
                <p>
                    Comparing CEIP to Energy Toolbase, Carbonhound, and Measurabl for Canadian energy compliance,
                    Alberta TIER credit tracking, OCAP® data sovereignty, and municipal climate action planning.
                </p>
                <p className="mt-2">
                    © 2025 Canada Energy Intelligence Platform. Built for Canada. Priced for Procurement.
                </p>
            </footer>
        </div>
    );
};

export default CompetitorComparison;
