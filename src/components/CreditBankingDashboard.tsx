/**
 * Credit Banking Dashboard (L4)
 * Based on Value Proposition Research Dec 2025
 * 
 * Purpose: Buy TIER credits now at $25, bank for future compliance
 * - "Buy low, use later" strategy
 * - Credit portfolio management
 * - Compliance year allocation
 */

import React, { useState, useMemo } from 'react';
import {
    Wallet,
    TrendingUp,
    TrendingDown,
    Calendar,
    DollarSign,
    PiggyBank,
    ArrowUpRight,
    ArrowDownRight,
    PlusCircle,
    Clock,
    Shield,
    AlertTriangle
} from 'lucide-react';

interface CreditHolding {
    id: string;
    type: 'EPC' | 'Offset';
    vintage: number;
    quantity: number;
    purchasePrice: number;
    purchaseDate: string;
    expiryYear: number;
    status: 'active' | 'allocated' | 'expired';
}

interface ComplianceYear {
    year: number;
    liability: number;
    allocated: number;
    remaining: number;
}

const SAMPLE_HOLDINGS: CreditHolding[] = [
    { id: '1', type: 'EPC', vintage: 2024, quantity: 5000, purchasePrice: 22.50, purchaseDate: '2025-03-15', expiryYear: 2029, status: 'active' },
    { id: '2', type: 'EPC', vintage: 2025, quantity: 8000, purchasePrice: 24.00, purchaseDate: '2025-06-20', expiryYear: 2030, status: 'active' },
    { id: '3', type: 'Offset', vintage: 2024, quantity: 3000, purchasePrice: 26.00, purchaseDate: '2025-01-10', expiryYear: 2029, status: 'allocated' },
    { id: '4', type: 'EPC', vintage: 2023, quantity: 2000, purchasePrice: 35.00, purchaseDate: '2024-08-05', expiryYear: 2028, status: 'active' },
];

const COMPLIANCE_YEARS: ComplianceYear[] = [
    { year: 2025, liability: 15000, allocated: 3000, remaining: 12000 },
    { year: 2026, liability: 16000, allocated: 0, remaining: 16000 },
    { year: 2027, liability: 17000, allocated: 0, remaining: 17000 },
];

const CURRENT_MARKET_PRICE = 25.00;
const TIER_FUND_PRICE = 95.00;

export const CreditBankingDashboard: React.FC = () => {
    const [holdings] = useState<CreditHolding[]>(SAMPLE_HOLDINGS);
    const [showBuyModal, setShowBuyModal] = useState(false);
    const [buyQuantity, setBuyQuantity] = useState<number>(1000);

    // Portfolio calculations
    const portfolio = useMemo(() => {
        const totalCredits = holdings.filter(h => h.status === 'active').reduce((sum, h) => sum + h.quantity, 0);
        const totalInvested = holdings.reduce((sum, h) => sum + (h.quantity * h.purchasePrice), 0);
        const currentValue = holdings.filter(h => h.status !== 'expired').reduce((sum, h) => sum + (h.quantity * CURRENT_MARKET_PRICE), 0);
        const avgCost = totalInvested / holdings.reduce((sum, h) => sum + h.quantity, 0);
        const fundValueSaved = holdings.reduce((sum, h) => sum + (h.quantity * (TIER_FUND_PRICE - h.purchasePrice)), 0);
        const unrealizedGain = currentValue - totalInvested;

        return {
            totalCredits,
            totalInvested,
            currentValue,
            avgCost,
            fundValueSaved,
            unrealizedGain,
            unrealizedGainPercent: (unrealizedGain / totalInvested) * 100
        };
    }, [holdings]);

    // Future compliance needs
    const totalFutureLiability = COMPLIANCE_YEARS.reduce((sum, y) => sum + y.remaining, 0);
    const coverageRatio = (portfolio.totalCredits / totalFutureLiability) * 100;

    const formatCurrency = (value: number): string => {
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD',
            minimumFractionDigits: 0
        }).format(value);
    };

    const simulatePurchase = () => {
        const cost = buyQuantity * CURRENT_MARKET_PRICE;
        const fundCostAvoided = buyQuantity * TIER_FUND_PRICE;
        const savings = fundCostAvoided - cost;

        alert(`Order Simulated!\n\nQuantity: ${buyQuantity.toLocaleString()} credits\nCost: ${formatCurrency(cost)}\nFund Cost Avoided: ${formatCurrency(fundCostAvoided)}\nSavings: ${formatCurrency(savings)}\n\n(In production, this would connect to a credit broker)`);
        setShowBuyModal(false);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-cyan-600/20 rounded-2xl">
                            <PiggyBank className="h-10 w-10 text-cyan-400" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-white">Credit Banking</h1>
                            <p className="text-slate-400 text-lg">
                                Buy low now, use for future compliance years
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowBuyModal(true)}
                        className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-xl font-semibold text-white transition-all flex items-center gap-2"
                    >
                        <PlusCircle className="h-5 w-5" />
                        Buy Credits
                    </button>
                </div>

                {/* Market Alert */}
                <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-2xl p-4 mb-8 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <TrendingDown className="h-6 w-6 text-emerald-400" />
                        <div>
                            <span className="text-emerald-400 font-semibold">Buyer's Market</span>
                            <span className="text-slate-400 ml-2">
                                Credits at ${CURRENT_MARKET_PRICE}/t — {((1 - CURRENT_MARKET_PRICE / TIER_FUND_PRICE) * 100).toFixed(0)}% below $95 fund price
                            </span>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-bold text-emerald-400">${CURRENT_MARKET_PRICE}</div>
                        <div className="text-xs text-slate-400">Current EPC Price</div>
                    </div>
                </div>

                {/* Portfolio Summary */}
                <div className="grid md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-2">
                            <Wallet className="h-5 w-5 text-slate-400" />
                            <span className="text-sm text-slate-400">Credit Balance</span>
                        </div>
                        <div className="text-3xl font-bold text-white">
                            {portfolio.totalCredits.toLocaleString()}
                        </div>
                        <div className="text-sm text-slate-400 mt-1">tonnes banked</div>
                    </div>

                    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-2">
                            <DollarSign className="h-5 w-5 text-slate-400" />
                            <span className="text-sm text-slate-400">Portfolio Value</span>
                        </div>
                        <div className="text-3xl font-bold text-white">
                            {formatCurrency(portfolio.currentValue)}
                        </div>
                        <div className={`text-sm mt-1 flex items-center gap-1 ${portfolio.unrealizedGain >= 0 ? 'text-emerald-400' : 'text-red-400'
                            }`}>
                            {portfolio.unrealizedGain >= 0 ? (
                                <ArrowUpRight className="h-4 w-4" />
                            ) : (
                                <ArrowDownRight className="h-4 w-4" />
                            )}
                            {formatCurrency(Math.abs(portfolio.unrealizedGain))} ({portfolio.unrealizedGainPercent.toFixed(1)}%)
                        </div>
                    </div>

                    <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-2">
                            <Shield className="h-5 w-5 text-emerald-400" />
                            <span className="text-sm text-emerald-400">Fund Cost Avoided</span>
                        </div>
                        <div className="text-3xl font-bold text-emerald-400">
                            {formatCurrency(portfolio.fundValueSaved)}
                        </div>
                        <div className="text-sm text-emerald-400/70 mt-1">vs. paying $95/t</div>
                    </div>

                    <div className={`rounded-2xl p-5 border ${coverageRatio >= 80
                            ? 'bg-emerald-900/20 border-emerald-500/30'
                            : coverageRatio >= 50
                                ? 'bg-amber-900/20 border-amber-500/30'
                                : 'bg-red-900/20 border-red-500/30'
                        }`}>
                        <div className="flex items-center gap-2 mb-2">
                            <Calendar className="h-5 w-5 text-slate-400" />
                            <span className="text-sm text-slate-400">Future Coverage</span>
                        </div>
                        <div className={`text-3xl font-bold ${coverageRatio >= 80 ? 'text-emerald-400' : coverageRatio >= 50 ? 'text-amber-400' : 'text-red-400'
                            }`}>
                            {coverageRatio.toFixed(0)}%
                        </div>
                        <div className="text-sm text-slate-400 mt-1">2025-2027 liability covered</div>
                    </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-8">
                    {/* Holdings Table */}
                    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
                        <div className="p-6 border-b border-slate-700">
                            <h2 className="text-lg font-semibold text-white">Credit Holdings</h2>
                        </div>
                        <div className="divide-y divide-slate-700">
                            {holdings.map(holding => (
                                <div key={holding.id} className="p-4 flex items-center justify-between hover:bg-slate-700/30">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2 rounded-lg ${holding.type === 'EPC' ? 'bg-cyan-600/20' : 'bg-purple-600/20'
                                            }`}>
                                            <Wallet className={`h-5 w-5 ${holding.type === 'EPC' ? 'text-cyan-400' : 'text-purple-400'
                                                }`} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-white font-medium">{holding.type}</span>
                                                <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded">
                                                    V{holding.vintage}
                                                </span>
                                                {holding.status === 'allocated' && (
                                                    <span className="text-xs bg-emerald-600/20 text-emerald-400 px-2 py-0.5 rounded">
                                                        Allocated
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-sm text-slate-400">
                                                {holding.quantity.toLocaleString()} t @ ${holding.purchasePrice.toFixed(2)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-white font-medium">
                                            {formatCurrency(holding.quantity * CURRENT_MARKET_PRICE)}
                                        </div>
                                        <div className={`text-sm ${CURRENT_MARKET_PRICE > holding.purchasePrice ? 'text-emerald-400' : 'text-red-400'
                                            }`}>
                                            {CURRENT_MARKET_PRICE > holding.purchasePrice ? '+' : ''}
                                            {((CURRENT_MARKET_PRICE - holding.purchasePrice) / holding.purchasePrice * 100).toFixed(1)}%
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Compliance Planning */}
                    <div className="space-y-6">
                        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-slate-400" />
                                Compliance Year Allocation
                            </h2>
                            <div className="space-y-4">
                                {COMPLIANCE_YEARS.map(year => (
                                    <div key={year.year} className="p-4 bg-slate-700/30 rounded-xl">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-white font-medium">{year.year}</span>
                                            <span className="text-sm text-slate-400">
                                                {year.allocated.toLocaleString()} / {year.liability.toLocaleString()} t
                                            </span>
                                        </div>
                                        <div className="w-full bg-slate-600 rounded-full h-2">
                                            <div
                                                className={`h-2 rounded-full ${year.allocated / year.liability >= 0.8 ? 'bg-emerald-500' :
                                                        year.allocated / year.liability >= 0.5 ? 'bg-amber-500' : 'bg-red-500'
                                                    }`}
                                                style={{ width: `${(year.allocated / year.liability) * 100}%` }}
                                            />
                                        </div>
                                        <div className="mt-2 flex justify-between text-xs text-slate-400">
                                            <span>Remaining: {year.remaining.toLocaleString()} t</span>
                                            <span>Est. Cost: {formatCurrency(year.remaining * CURRENT_MARKET_PRICE)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Strategy Insight */}
                        <div className="bg-cyan-900/20 border border-cyan-500/30 rounded-2xl p-6">
                            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-cyan-400" />
                                Banking Strategy
                            </h3>
                            <p className="text-slate-300 text-sm mb-4">
                                With credits at ${CURRENT_MARKET_PRICE}/t (74% below fund price),
                                now is an optimal time to bank for future compliance years before
                                tightening stringency increases demand.
                            </p>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="p-3 bg-slate-800/50 rounded-lg">
                                    <div className="text-slate-400">Fund Price</div>
                                    <div className="text-lg font-bold text-red-400">$95/t</div>
                                </div>
                                <div className="p-3 bg-slate-800/50 rounded-lg">
                                    <div className="text-slate-400">Market Price</div>
                                    <div className="text-lg font-bold text-emerald-400">${CURRENT_MARKET_PRICE}/t</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Buy Modal */}
                {showBuyModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-md w-full">
                            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <PlusCircle className="h-6 w-6 text-cyan-400" />
                                Buy TIER Credits
                            </h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm text-slate-400 mb-2">Quantity (tonnes)</label>
                                    <input
                                        type="number"
                                        value={buyQuantity}
                                        onChange={(e) => setBuyQuantity(Number(e.target.value))}
                                        step="100"
                                        min="100"
                                        className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white text-xl font-semibold"
                                    />
                                </div>

                                <div className="bg-slate-700/30 rounded-lg p-4 space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Market Price</span>
                                        <span className="text-white">${CURRENT_MARKET_PRICE}/t</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Total Cost</span>
                                        <span className="text-white font-semibold">{formatCurrency(buyQuantity * CURRENT_MARKET_PRICE)}</span>
                                    </div>
                                    <div className="flex justify-between pt-2 border-t border-slate-600">
                                        <span className="text-emerald-400">Fund Cost Avoided</span>
                                        <span className="text-emerald-400 font-semibold">
                                            {formatCurrency(buyQuantity * (TIER_FUND_PRICE - CURRENT_MARKET_PRICE))}
                                        </span>
                                    </div>
                                </div>

                                <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-3 flex gap-2">
                                    <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0" />
                                    <p className="text-sm text-amber-400">
                                        This is a simulation. Production version would connect to NGX or OTC brokers.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-4 mt-6">
                                <button
                                    onClick={() => setShowBuyModal(false)}
                                    className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={simulatePurchase}
                                    className="flex-1 px-4 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-lg font-semibold text-white"
                                >
                                    Simulate Purchase
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CreditBankingDashboard;
