/**
 * TIER ROI Calculator Component
 * Based on Value Proposition Research (Dec 2025)
 * Shows 776% ROI story for Industrial clients
 */

import React, { useState, useMemo } from 'react';
import { Calculator, TrendingUp, DollarSign, Percent, ArrowRight, CheckCircle } from 'lucide-react';

interface ROIResults {
    fundPayment: number;
    marketCredits: number;
    ceipFee: number;
    netSavings: number;
    roiPercent: number;
}

export const TIERROICalculator: React.FC = () => {
    // User inputs
    const [annualEmissions, setAnnualEmissions] = useState<number>(150000);
    const [benchmarkExceedance, setBenchmarkExceedance] = useState<number>(20000);

    // Market constants (from research)
    const FUND_PRICE = 95; // TIER fund price (frozen)
    const MARKET_PRICE = 25; // Current EPC/Offset market price
    const CEIP_BASE_FEE = 18000; // $1,500/mo × 12
    const SUCCESS_FEE_RATE = 0.20; // 20% of savings

    // Calculate ROI
    const results: ROIResults = useMemo(() => {
        const fundPayment = benchmarkExceedance * FUND_PRICE;
        const marketCredits = benchmarkExceedance * MARKET_PRICE;
        const grossSavings = fundPayment - marketCredits;
        const successFee = grossSavings * SUCCESS_FEE_RATE;
        const ceipFee = CEIP_BASE_FEE + successFee;
        const netSavings = grossSavings - ceipFee;
        const roiPercent = (netSavings / ceipFee) * 100;

        return {
            fundPayment,
            marketCredits,
            ceipFee,
            netSavings,
            roiPercent
        };
    }, [benchmarkExceedance]);

    const formatCurrency = (value: number): string => {
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    };

    return (
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl border border-slate-700 p-8">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-emerald-600/20 rounded-xl">
                    <Calculator className="h-8 w-8 text-emerald-400" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white">TIER Arbitrage Calculator</h2>
                    <p className="text-slate-400">Calculate your compliance savings in 30 seconds</p>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                {/* Inputs */}
                <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <span className="bg-emerald-600 text-white text-sm px-2 py-0.5 rounded">1</span>
                        Your Facility Data
                    </h3>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm text-slate-400 mb-2">
                                Annual Emissions (tonnes CO₂e)
                            </label>
                            <input
                                type="number"
                                value={annualEmissions}
                                onChange={(e) => setAnnualEmissions(Number(e.target.value))}
                                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-slate-400 mb-2">
                                Benchmark Exceedance (tonnes above limit)
                            </label>
                            <input
                                type="number"
                                value={benchmarkExceedance}
                                onChange={(e) => setBenchmarkExceedance(Number(e.target.value))}
                                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                            />
                            <p className="text-sm text-slate-500 mt-1">
                                Your compliance liability = {benchmarkExceedance.toLocaleString()} tonnes
                            </p>
                        </div>
                    </div>

                    {/* Market Prices */}
                    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-slate-400 mb-3">2025 Market Prices</h4>
                        <div className="flex justify-between items-center">
                            <div>
                                <div className="text-sm text-red-400">TIER Fund Price</div>
                                <div className="text-2xl font-bold text-red-500">${FUND_PRICE}/t</div>
                            </div>
                            <div className="text-slate-500">vs</div>
                            <div className="text-right">
                                <div className="text-sm text-emerald-400">Market Credit Price</div>
                                <div className="text-2xl font-bold text-emerald-400">${MARKET_PRICE}/t</div>
                            </div>
                        </div>
                        <div className="mt-3 text-center">
                            <span className="text-sm bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full">
                                ${FUND_PRICE - MARKET_PRICE}/tonne arbitrage opportunity
                            </span>
                        </div>
                    </div>
                </div>

                {/* Results */}
                <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <span className="bg-emerald-600 text-white text-sm px-2 py-0.5 rounded">2</span>
                        Your Savings with CEIP
                    </h3>

                    <div className="space-y-3">
                        {/* Without CEIP */}
                        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                            <div className="flex justify-between items-center">
                                <div>
                                    <div className="text-sm text-red-400">Without CEIP (Fund Payment)</div>
                                    <div className="text-xs text-slate-500">
                                        {benchmarkExceedance.toLocaleString()} t × ${FUND_PRICE}
                                    </div>
                                </div>
                                <div className="text-2xl font-bold text-red-500">
                                    {formatCurrency(results.fundPayment)}
                                </div>
                            </div>
                        </div>

                        {/* With CEIP */}
                        <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-lg p-4">
                            <div className="flex justify-between items-center">
                                <div>
                                    <div className="text-sm text-emerald-400">With CEIP (Market Credits)</div>
                                    <div className="text-xs text-slate-500">
                                        {benchmarkExceedance.toLocaleString()} t × ${MARKET_PRICE}
                                    </div>
                                </div>
                                <div className="text-2xl font-bold text-emerald-400">
                                    {formatCurrency(results.marketCredits)}
                                </div>
                            </div>
                        </div>

                        {/* CEIP Fee */}
                        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                            <div className="flex justify-between items-center">
                                <div>
                                    <div className="text-sm text-slate-400">CEIP Platform Fee</div>
                                    <div className="text-xs text-slate-500">
                                        ${CEIP_BASE_FEE.toLocaleString()} base + 20% success fee
                                    </div>
                                </div>
                                <div className="text-lg font-semibold text-slate-300">
                                    {formatCurrency(results.ceipFee)}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Net Result */}
                    <div className="bg-gradient-to-r from-emerald-600/20 to-green-600/20 border-2 border-emerald-500 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <div className="text-sm text-emerald-400">Your Net Savings</div>
                                <div className="text-4xl font-bold text-white">
                                    {formatCurrency(results.netSavings)}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm text-emerald-400">ROI</div>
                                <div className="text-3xl font-bold text-emerald-400">
                                    {results.roiPercent.toFixed(0)}%
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 text-emerald-300 text-sm">
                            <TrendingUp className="h-4 w-4" />
                            <span>
                                {results.roiPercent >= 500
                                    ? "Exceptional ROI - You're leaving money on the table without CEIP"
                                    : "Strong ROI - CEIP pays for itself many times over"}
                            </span>
                        </div>
                    </div>

                    {/* CTA */}
                    <button
                        onClick={() => window.location.href = '/enterprise?tier=industrial'}
                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2"
                    >
                        Start Saving {formatCurrency(results.netSavings)} This Year
                        <ArrowRight className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* Trust Elements */}
            <div className="mt-8 pt-6 border-t border-slate-700 grid grid-cols-3 gap-4 text-center">
                <div className="flex flex-col items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                    <span className="text-sm text-slate-400">Live EPC/Offset Pricing</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                    <span className="text-sm text-slate-400">Direct Investment Automation</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                    <span className="text-sm text-slate-400">Bank-Ready Compliance Reports</span>
                </div>
            </div>
        </div>
    );
};

export default TIERROICalculator;
