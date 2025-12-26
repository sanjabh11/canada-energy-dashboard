/**
 * Rate Watchdog Calculator
 * 
 * The VIRAL HOOK for B2C users.
 * Compares user's current electricity rate against:
 * 1. RoLR (Rate of Last Resort) - 12¢/kWh as of Jan 2025
 * 2. Competitive market average
 * 
 * Shows potential savings and drives upgrades.
 */

import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
    Calculator, AlertTriangle, CheckCircle, TrendingDown,
    ArrowLeft, Zap, Bell, ChevronRight
} from 'lucide-react';

interface WhopMiniUser {
    id: string;
    tier: 'free' | 'basic' | 'pro';
    isWhopUser: boolean;
}

// Static rate data (no API calls)
const RATES = {
    rolr: 0.1199, // Rate of Last Resort as of Jan 2025 (12¢/kWh)
    marketAverage: 0.0925, // Competitive retailer average
    marketLow: 0.0799, // Best available rate
    marketHigh: 0.1499, // Highest retailer rate
};

// Common retailers in Alberta
const RETAILERS = [
    { name: 'RoLR (Default)', rate: RATES.rolr },
    { name: 'ENMAX Easy Max', rate: 0.1149 },
    { name: 'Direct Energy', rate: 0.0999 },
    { name: 'ATCO EnergySense', rate: 0.0949 },
    { name: 'Just Energy', rate: 0.1099 },
    { name: 'Other / Custom', rate: 0 },
];

interface CalculationResult {
    currentAnnualCost: number;
    rolrAnnualCost: number;
    marketLowAnnualCost: number;
    potentialSavings: number;
    verdict: 'overpaying' | 'fair' | 'good_deal';
    verdictMessage: string;
}

function calculateSavings(monthlyKwh: number, currentRate: number): CalculationResult {
    const currentAnnualCost = monthlyKwh * 12 * currentRate;
    const rolrAnnualCost = monthlyKwh * 12 * RATES.rolr;
    const marketLowAnnualCost = monthlyKwh * 12 * RATES.marketLow;
    const potentialSavings = currentAnnualCost - marketLowAnnualCost;

    let verdict: 'overpaying' | 'fair' | 'good_deal';
    let verdictMessage: string;

    if (currentRate > RATES.rolr) {
        verdict = 'overpaying';
        verdictMessage = `You're paying MORE than the RoLR benchmark. Switch immediately to save $${potentialSavings.toFixed(0)}/year.`;
    } else if (currentRate > RATES.marketAverage) {
        verdict = 'fair';
        verdictMessage = `You're paying a fair rate, but competitive retailers could save you $${potentialSavings.toFixed(0)}/year.`;
    } else {
        verdict = 'good_deal';
        verdictMessage = `Great job! You have a competitive rate. You're already saving vs. RoLR.`;
    }

    return {
        currentAnnualCost,
        rolrAnnualCost,
        marketLowAnnualCost,
        potentialSavings,
        verdict,
        verdictMessage
    };
}

export default function WatchdogCalculator({ user }: { user: WhopMiniUser | null }) {
    const [monthlyKwh, setMonthlyKwh] = useState<number>(600); // Average Alberta home
    const [selectedRetailer, setSelectedRetailer] = useState<string>('RoLR (Default)');
    const [customRate, setCustomRate] = useState<number>(0.12);
    const [showResults, setShowResults] = useState(false);

    const currentRate = useMemo(() => {
        if (selectedRetailer === 'Other / Custom') {
            return customRate;
        }
        const retailer = RETAILERS.find(r => r.name === selectedRetailer);
        return retailer?.rate || RATES.rolr;
    }, [selectedRetailer, customRate]);

    const result = useMemo(() => {
        return calculateSavings(monthlyKwh, currentRate);
    }, [monthlyKwh, currentRate]);

    const handleCalculate = () => {
        setShowResults(true);
    };

    return (
        <div className="min-h-screen bg-slate-900">
            {/* Header */}
            <div className="bg-slate-800 border-b border-slate-700">
                <div className="max-w-2xl mx-auto px-4 py-4">
                    <Link to="/whop-mini" className="inline-flex items-center text-slate-400 hover:text-white mb-4">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Academy
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                            <Calculator className="w-6 h-6 text-green-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">Rate Watchdog</h1>
                            <p className="text-slate-400">Are you overpaying for electricity?</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-2xl mx-auto px-4 py-8">
                {!showResults ? (
                    /* Input Form */
                    <div className="space-y-6">
                        {/* RoLR Info Banner */}
                        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <Zap className="w-5 h-5 text-cyan-400 mt-0.5" />
                                <div>
                                    <p className="text-cyan-300 font-medium">Alberta RoLR Update (Jan 2025)</p>
                                    <p className="text-slate-400 text-sm mt-1">
                                        The Rate of Last Resort is now ~12¢/kWh, fixed for 2 years.
                                        Competitive retailers may offer better rates.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Monthly Usage */}
                        <div>
                            <label className="block text-white font-medium mb-2">
                                Monthly Electricity Usage (kWh)
                            </label>
                            <input
                                type="number"
                                value={monthlyKwh}
                                onChange={(e) => setMonthlyKwh(Number(e.target.value))}
                                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white
                           focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
                                placeholder="600"
                                min={100}
                                max={5000}
                            />
                            <p className="text-slate-500 text-sm mt-1">
                                Average Alberta home: 600 kWh/month
                            </p>
                        </div>

                        {/* Retailer Selection */}
                        <div>
                            <label className="block text-white font-medium mb-2">
                                Your Current Retailer
                            </label>
                            <select
                                value={selectedRetailer}
                                onChange={(e) => setSelectedRetailer(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white
                           focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
                            >
                                {RETAILERS.map(r => (
                                    <option key={r.name} value={r.name}>
                                        {r.name} {r.rate > 0 ? `(${(r.rate * 100).toFixed(1)}¢/kWh)` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Custom Rate Input */}
                        {selectedRetailer === 'Other / Custom' && (
                            <div>
                                <label className="block text-white font-medium mb-2">
                                    Your Rate (¢/kWh)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={customRate * 100}
                                    onChange={(e) => setCustomRate(Number(e.target.value) / 100)}
                                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white
                             focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
                                    placeholder="12.00"
                                />
                            </div>
                        )}

                        {/* Calculate Button */}
                        <button
                            onClick={handleCalculate}
                            className="w-full bg-gradient-to-r from-green-500 to-cyan-500 text-white font-semibold 
                         py-4 rounded-lg hover:from-green-600 hover:to-cyan-600 transition-all"
                        >
                            Calculate My Savings
                        </button>
                    </div>
                ) : (
                    /* Results */
                    <div className="space-y-6">
                        {/* Verdict Card */}
                        <div className={`rounded-xl p-6 border ${result.verdict === 'overpaying'
                                ? 'bg-red-500/10 border-red-500/30'
                                : result.verdict === 'fair'
                                    ? 'bg-amber-500/10 border-amber-500/30'
                                    : 'bg-green-500/10 border-green-500/30'
                            }`}>
                            <div className="flex items-center gap-3 mb-4">
                                {result.verdict === 'overpaying' ? (
                                    <AlertTriangle className="w-8 h-8 text-red-400" />
                                ) : result.verdict === 'fair' ? (
                                    <TrendingDown className="w-8 h-8 text-amber-400" />
                                ) : (
                                    <CheckCircle className="w-8 h-8 text-green-400" />
                                )}
                                <h2 className={`text-2xl font-bold ${result.verdict === 'overpaying'
                                        ? 'text-red-300'
                                        : result.verdict === 'fair'
                                            ? 'text-amber-300'
                                            : 'text-green-300'
                                    }`}>
                                    {result.verdict === 'overpaying'
                                        ? 'You\'re Overpaying!'
                                        : result.verdict === 'fair'
                                            ? 'Room for Improvement'
                                            : 'Great Rate!'}
                                </h2>
                            </div>
                            <p className="text-white text-lg">{result.verdictMessage}</p>
                        </div>

                        {/* Cost Comparison */}
                        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                            <h3 className="text-lg font-semibold text-white mb-4">Annual Cost Comparison</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400">Your Current Cost</span>
                                    <span className="text-xl font-bold text-white">
                                        ${result.currentAnnualCost.toFixed(0)}/year
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400">RoLR Benchmark</span>
                                    <span className="text-lg text-slate-300">
                                        ${result.rolrAnnualCost.toFixed(0)}/year
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400">Best Available Rate</span>
                                    <span className="text-lg text-green-400">
                                        ${result.marketLowAnnualCost.toFixed(0)}/year
                                    </span>
                                </div>
                                <div className="border-t border-slate-700 pt-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-white font-semibold">Potential Savings</span>
                                        <span className="text-2xl font-bold text-green-400">
                                            ${result.potentialSavings.toFixed(0)}/year
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Upsell CTA */}
                        <div className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 
                            rounded-xl p-6">
                            <div className="flex items-center gap-3 mb-3">
                                <Bell className="w-6 h-6 text-cyan-400" />
                                <h3 className="text-lg font-semibold text-white">Get Rate Alerts</h3>
                            </div>
                            <p className="text-slate-400 mb-4">
                                Upgrade to Pro to receive alerts when competitive rates drop below your current rate.
                                Never miss a savings opportunity.
                            </p>
                            <a
                                href="https://whop.com/canada-energy/?plan=basic"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center bg-cyan-500 text-white font-semibold px-6 py-3 
                           rounded-lg hover:bg-cyan-600 transition-colors"
                            >
                                Unlock Rate Alerts
                                <ChevronRight className="w-4 h-4 ml-2" />
                            </a>
                        </div>

                        {/* Recalculate Button */}
                        <button
                            onClick={() => setShowResults(false)}
                            className="w-full border border-slate-600 text-slate-300 font-medium py-3 rounded-lg 
                         hover:bg-slate-800 transition-colors"
                        >
                            Calculate Again
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
