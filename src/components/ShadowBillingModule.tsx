/**
 * Shadow Billing Module (M1)
 * Based on Value Proposition Research Dec 2025
 * 
 * Purpose: Shows users "What if I had switched?" analysis
 * - Compares actual bills vs. hypothetical RoLR/retailer rates
 * - Identifies missed savings opportunities
 * - High conversion hook for Rate Watchdog tier
 */

import React, { useState, useMemo } from 'react';
import {
    TrendingDown,
    TrendingUp,
    AlertTriangle,
    CheckCircle,
    DollarSign,
    Calendar,
    ArrowRight,
    RefreshCcw,
    Zap
} from 'lucide-react';

interface MonthlyBill {
    month: string;
    year: number;
    actualRate: number; // ¢/kWh paid
    rolrRate: number; // RoLR rate that month
    poolPrice: number; // Avg wholesale pool price
    consumption: number; // kWh
}

// Simulated historical data (would come from API in production)
const HISTORICAL_DATA: MonthlyBill[] = [
    { month: 'Jan', year: 2025, actualRate: 14.2, rolrRate: 12.0, poolPrice: 8.5, consumption: 850 },
    { month: 'Feb', year: 2025, actualRate: 14.2, rolrRate: 12.0, poolPrice: 7.8, consumption: 820 },
    { month: 'Mar', year: 2025, actualRate: 14.2, rolrRate: 12.0, poolPrice: 6.9, consumption: 720 },
    { month: 'Apr', year: 2025, actualRate: 14.2, rolrRate: 12.0, poolPrice: 5.2, consumption: 650 },
    { month: 'May', year: 2025, actualRate: 14.2, rolrRate: 12.0, poolPrice: 4.8, consumption: 580 },
    { month: 'Jun', year: 2025, actualRate: 14.2, rolrRate: 12.0, poolPrice: 6.1, consumption: 620 },
    { month: 'Jul', year: 2025, actualRate: 14.2, rolrRate: 12.0, poolPrice: 9.2, consumption: 780 },
    { month: 'Aug', year: 2025, actualRate: 14.2, rolrRate: 12.0, poolPrice: 11.5, consumption: 820 },
    { month: 'Sep', year: 2025, actualRate: 14.2, rolrRate: 12.0, poolPrice: 8.3, consumption: 700 },
    { month: 'Oct', year: 2025, actualRate: 14.2, rolrRate: 12.0, poolPrice: 7.1, consumption: 680 },
    { month: 'Nov', year: 2025, actualRate: 14.2, rolrRate: 12.0, poolPrice: 8.8, consumption: 750 },
    { month: 'Dec', year: 2025, actualRate: 14.2, rolrRate: 12.0, poolPrice: 10.2, consumption: 900 },
];

// ROLR fixed at 12¢ for 2025-2026 per research
const ROLR_RATE = 12.0;

export const ShadowBillingModule: React.FC = () => {
    const [currentRate, setCurrentRate] = useState<number>(14.2);
    const [showDetails, setShowDetails] = useState<boolean>(false);

    // Calculate shadow billing results
    const analysis = useMemo(() => {
        let totalActualCost = 0;
        let totalRolrCost = 0;
        let totalPoolCost = 0;

        const monthlyAnalysis = HISTORICAL_DATA.map(month => {
            const actualCost = (month.consumption * currentRate) / 100;
            const rolrCost = (month.consumption * ROLR_RATE) / 100;
            const poolCost = (month.consumption * month.poolPrice) / 100;

            totalActualCost += actualCost;
            totalRolrCost += rolrCost;
            totalPoolCost += poolCost;

            return {
                ...month,
                actualCost,
                rolrCost,
                poolCost,
                savingsVsRolr: actualCost - rolrCost,
                savingsVsPool: actualCost - poolCost
            };
        });

        const rolrSavings = totalActualCost - totalRolrCost;
        const poolSavings = totalActualCost - totalPoolCost;
        const recommendation = rolrSavings > 0 ? 'switch_rolr' : 'stay_current';

        return {
            monthly: monthlyAnalysis,
            totalActualCost,
            totalRolrCost,
            totalPoolCost,
            rolrSavings,
            poolSavings,
            recommendation,
            monthsOverpaid: monthlyAnalysis.filter(m => m.savingsVsRolr > 0).length
        };
    }, [currentRate]);

    const formatCurrency = (value: number): string => {
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD',
            minimumFractionDigits: 2
        }).format(value);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-4 bg-amber-600/20 rounded-2xl">
                        <RefreshCcw className="h-10 w-10 text-amber-400" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-white">Shadow Billing Analysis</h1>
                        <p className="text-slate-400 text-lg">
                            "What if I had switched?" — See your missed savings
                        </p>
                    </div>
                </div>

                {/* Input Section */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 mb-8">
                    <h2 className="text-lg font-semibold text-white mb-4">Your Current Rate</h2>
                    <div className="flex items-center gap-4">
                        <div className="flex-1">
                            <label className="block text-sm text-slate-400 mb-2">
                                Current Retailer Rate (¢/kWh)
                            </label>
                            <input
                                type="number"
                                value={currentRate}
                                onChange={(e) => setCurrentRate(Number(e.target.value))}
                                step="0.1"
                                className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white text-xl font-semibold focus:border-amber-500"
                            />
                        </div>
                        <div className="text-center px-6">
                            <div className="text-sm text-slate-400">vs</div>
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm text-slate-400 mb-2">
                                2025 RoLR Rate (Fixed)
                            </label>
                            <div className="px-4 py-3 bg-emerald-900/30 border border-emerald-500/50 rounded-lg text-emerald-400 text-xl font-semibold">
                                12.0 ¢/kWh
                            </div>
                        </div>
                    </div>
                </div>

                {/* Results Summary */}
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                    {/* What You Paid */}
                    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <DollarSign className="h-6 w-6 text-slate-400" />
                            <h3 className="text-lg font-semibold text-white">What You Paid (2025)</h3>
                        </div>
                        <div className="text-4xl font-bold text-white">
                            {formatCurrency(analysis.totalActualCost)}
                        </div>
                        <p className="text-sm text-slate-400 mt-2">
                            At {currentRate}¢/kWh average
                        </p>
                    </div>

                    {/* What RoLR Would Cost */}
                    <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Zap className="h-6 w-6 text-emerald-400" />
                            <h3 className="text-lg font-semibold text-emerald-400">RoLR Would Cost</h3>
                        </div>
                        <div className="text-4xl font-bold text-emerald-400">
                            {formatCurrency(analysis.totalRolrCost)}
                        </div>
                        <p className="text-sm text-emerald-400/80 mt-2">
                            At fixed 12¢/kWh
                        </p>
                    </div>

                    {/* Your Missed Savings */}
                    <div className={`rounded-2xl p-6 ${analysis.rolrSavings > 0
                            ? 'bg-red-900/20 border border-red-500/30'
                            : 'bg-emerald-900/20 border border-emerald-500/30'
                        }`}>
                        <div className="flex items-center gap-3 mb-4">
                            {analysis.rolrSavings > 0 ? (
                                <TrendingDown className="h-6 w-6 text-red-400" />
                            ) : (
                                <TrendingUp className="h-6 w-6 text-emerald-400" />
                            )}
                            <h3 className="text-lg font-semibold text-white">
                                {analysis.rolrSavings > 0 ? 'Missed Savings' : 'You Saved'}
                            </h3>
                        </div>
                        <div className={`text-4xl font-bold ${analysis.rolrSavings > 0 ? 'text-red-400' : 'text-emerald-400'
                            }`}>
                            {formatCurrency(Math.abs(analysis.rolrSavings))}
                        </div>
                        <p className="text-sm text-slate-400 mt-2">
                            {analysis.monthsOverpaid} of 12 months overpaid
                        </p>
                    </div>
                </div>

                {/* Recommendation Card */}
                {analysis.rolrSavings > 0 && (
                    <div className="bg-gradient-to-r from-amber-600/20 to-red-600/20 border-2 border-amber-500 rounded-2xl p-6 mb-8">
                        <div className="flex items-start gap-4">
                            <AlertTriangle className="h-8 w-8 text-amber-400 flex-shrink-0" />
                            <div className="flex-1">
                                <h3 className="text-xl font-bold text-white mb-2">
                                    You're Overpaying by {formatCurrency(analysis.rolrSavings)}/year
                                </h3>
                                <p className="text-slate-300 mb-4">
                                    The RoLR (Rate of Last Resort) is fixed at 12¢/kWh until December 2026.
                                    At your current rate of {currentRate}¢/kWh, you're paying a premium of{' '}
                                    {(currentRate - ROLR_RATE).toFixed(1)}¢ per kWh.
                                </p>
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => window.location.href = '/pricing'}
                                        className="px-6 py-3 bg-amber-600 hover:bg-amber-500 rounded-lg font-semibold text-white transition-all flex items-center gap-2"
                                    >
                                        Get Rate Watchdog Alerts
                                        <ArrowRight className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => setShowDetails(!showDetails)}
                                        className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium text-white transition-all"
                                    >
                                        {showDetails ? 'Hide' : 'Show'} Monthly Breakdown
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Monthly Breakdown */}
                {showDetails && (
                    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 mb-8">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-slate-400" />
                            Monthly Shadow Bill Comparison
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-700">
                                        <th className="text-left py-3 px-4 text-slate-400 font-medium">Month</th>
                                        <th className="text-right py-3 px-4 text-slate-400 font-medium">Usage (kWh)</th>
                                        <th className="text-right py-3 px-4 text-slate-400 font-medium">You Paid</th>
                                        <th className="text-right py-3 px-4 text-slate-400 font-medium">RoLR Cost</th>
                                        <th className="text-right py-3 px-4 text-slate-400 font-medium">Pool Cost</th>
                                        <th className="text-right py-3 px-4 text-slate-400 font-medium">Difference</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {analysis.monthly.map((month, idx) => (
                                        <tr key={idx} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                                            <td className="py-3 px-4 text-white">{month.month} {month.year}</td>
                                            <td className="py-3 px-4 text-right text-slate-300">{month.consumption}</td>
                                            <td className="py-3 px-4 text-right text-white">{formatCurrency(month.actualCost)}</td>
                                            <td className="py-3 px-4 text-right text-emerald-400">{formatCurrency(month.rolrCost)}</td>
                                            <td className="py-3 px-4 text-right text-cyan-400">{formatCurrency(month.poolCost)}</td>
                                            <td className={`py-3 px-4 text-right font-semibold ${month.savingsVsRolr > 0 ? 'text-red-400' : 'text-emerald-400'
                                                }`}>
                                                {month.savingsVsRolr > 0 ? '+' : ''}{formatCurrency(month.savingsVsRolr)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-slate-700/30">
                                        <td className="py-3 px-4 text-white font-semibold">Total</td>
                                        <td className="py-3 px-4 text-right text-slate-300 font-semibold">
                                            {HISTORICAL_DATA.reduce((sum, m) => sum + m.consumption, 0).toLocaleString()}
                                        </td>
                                        <td className="py-3 px-4 text-right text-white font-semibold">
                                            {formatCurrency(analysis.totalActualCost)}
                                        </td>
                                        <td className="py-3 px-4 text-right text-emerald-400 font-semibold">
                                            {formatCurrency(analysis.totalRolrCost)}
                                        </td>
                                        <td className="py-3 px-4 text-right text-cyan-400 font-semibold">
                                            {formatCurrency(analysis.totalPoolCost)}
                                        </td>
                                        <td className={`py-3 px-4 text-right font-bold ${analysis.rolrSavings > 0 ? 'text-red-400' : 'text-emerald-400'
                                            }`}>
                                            {analysis.rolrSavings > 0 ? '+' : ''}{formatCurrency(analysis.rolrSavings)}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                )}

                {/* Key Insight */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Key 2025 Insight</h3>
                    <div className="flex items-start gap-4">
                        <CheckCircle className="h-6 w-6 text-emerald-500 flex-shrink-0" />
                        <div>
                            <p className="text-slate-300">
                                <strong className="text-white">The RoLR is fixed at 12¢/kWh until December 2026.</strong>{' '}
                                Unlike the old RRO which fluctuated monthly, the Rate of Last Resort provides
                                price certainty. However, locking in at a market peak remains a risk —
                                if wholesale prices drop significantly, you could miss savings.
                            </p>
                            <p className="text-sm text-slate-400 mt-3">
                                Source: Alberta Utilities Commission (AUC), Direct Energy RoLR rate schedule
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ShadowBillingModule;
