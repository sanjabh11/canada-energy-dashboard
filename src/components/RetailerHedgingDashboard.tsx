/**
 * Retailer Hedging Dashboard - B2B Utility Risk Management
 * 
 * Research Finding: RoLR fixed at 12¢ for 2 years (2025-2026).
 * Risk has shifted from consumer to retailer. Utilities need hedging tools.
 * 
 * Target Customers: ENMAX, EPCOR, Direct Energy, smaller retailers
 * 
 * Value Prop: "Protect your margins against the fixed retail cap"
 * Reference: MonetizationResearch_Overall.md §3.2
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowLeft,
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    Shield,
    DollarSign,
    Zap,
    BarChart3,
    Activity,
    Calendar,
    Info,
    Target,
    ArrowUpRight,
    ArrowDownRight
} from 'lucide-react';

// Simulated wholesale price data
const generateWholesaleData = () => {
    const now = new Date();
    const data = [];
    for (let i = 23; i >= 0; i--) {
        const hour = new Date(now.getTime() - i * 3600000);
        // Simulate price volatility - wholesale can spike above RoLR
        const basePrice = 8 + Math.random() * 6; // 8-14¢ range
        const spike = Math.random() > 0.9 ? Math.random() * 10 : 0; // Occasional spikes
        data.push({
            hour: hour.getHours(),
            price: basePrice + spike,
            volume: 400 + Math.random() * 200
        });
    }
    return data;
};

const ROLR_FIXED_RATE = 12.06; // ENMAX service area rate

interface HedgingPosition {
    id: string;
    type: 'forward' | 'swap' | 'option';
    mwh: number;
    strikePrice: number;
    expiryDate: string;
    status: 'active' | 'expiring' | 'expired';
}

export const RetailerHedgingDashboard: React.FC = () => {
    const [wholesaleData, setWholesaleData] = useState(generateWholesaleData());
    const [forecastPeriod, setForecastPeriod] = useState<'24h' | '7d' | '30d'>('24h');

    // Calculate key metrics
    const currentWholesale = wholesaleData[wholesaleData.length - 1]?.price || 0;
    const avgWholesale = wholesaleData.reduce((sum, d) => sum + d.price, 0) / wholesaleData.length;
    const maxWholesale = Math.max(...wholesaleData.map(d => d.price));
    const marginSpread = ROLR_FIXED_RATE - avgWholesale;
    const riskExposure = wholesaleData.filter(d => d.price > ROLR_FIXED_RATE).length;

    // Sample hedging positions
    const [positions] = useState<HedgingPosition[]>([
        { id: '1', type: 'forward', mwh: 10000, strikePrice: 9.50, expiryDate: '2025-03-31', status: 'active' },
        { id: '2', type: 'swap', mwh: 5000, strikePrice: 10.25, expiryDate: '2025-06-30', status: 'active' },
        { id: '3', type: 'option', mwh: 8000, strikePrice: 11.00, expiryDate: '2025-01-31', status: 'expiring' }
    ]);

    // Auto-refresh data
    useEffect(() => {
        const interval = setInterval(() => {
            setWholesaleData(generateWholesaleData());
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen bg-slate-900 text-white">
            {/* Header */}
            <header className="bg-slate-800/50 border-b border-slate-700">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link to="/" className="text-slate-400 hover:text-white transition-colors">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-600 rounded-lg">
                                <Shield className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h1 className="font-bold text-lg">Retailer Hedging Dashboard</h1>
                                <p className="text-slate-400 text-sm">RoLR Margin Protection • B2B Utility Tools</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded text-sm">
                            Enterprise Only
                        </span>
                        <Link
                            to="/enterprise"
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium transition-colors"
                        >
                            Contact Sales
                        </Link>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* RoLR Context Banner */}
                <div className="bg-purple-900/20 border border-purple-500/30 rounded-xl p-4 mb-8">
                    <div className="flex items-start gap-3">
                        <Info className="h-5 w-5 text-purple-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                            <strong className="text-purple-400">RoLR Fixed Rate in Effect:</strong>{' '}
                            <span className="text-slate-300">
                                Retail rate locked at <strong>12.06¢/kWh</strong> until Dec 31, 2026.
                                Wholesale volatility risk has shifted to retailers. Hedge your procurement to protect margins.
                            </span>
                        </div>
                    </div>
                </div>

                {/* Key Metrics */}
                <div className="grid md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                            <Target className="h-4 w-4" />
                            RoLR Fixed Rate
                        </div>
                        <div className="text-3xl font-bold text-purple-400">
                            {ROLR_FIXED_RATE.toFixed(2)}¢
                        </div>
                        <div className="text-xs text-slate-500">Locked until Dec 2026</div>
                    </div>

                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                            <Activity className="h-4 w-4" />
                            Current Wholesale
                        </div>
                        <div className={`text-3xl font-bold flex items-center gap-2 ${currentWholesale > ROLR_FIXED_RATE ? 'text-red-400' : 'text-emerald-400'
                            }`}>
                            {currentWholesale.toFixed(2)}¢
                            {currentWholesale > ROLR_FIXED_RATE ? (
                                <ArrowUpRight className="h-5 w-5" />
                            ) : (
                                <ArrowDownRight className="h-5 w-5" />
                            )}
                        </div>
                        <div className="text-xs text-slate-500">AESO Pool Price</div>
                    </div>

                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                            <DollarSign className="h-4 w-4" />
                            Current Margin
                        </div>
                        <div className={`text-3xl font-bold ${marginSpread > 0 ? 'text-emerald-400' : 'text-red-400'
                            }`}>
                            {marginSpread > 0 ? '+' : ''}{marginSpread.toFixed(2)}¢
                        </div>
                        <div className="text-xs text-slate-500">RoLR - Avg Wholesale</div>
                    </div>

                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                            <AlertTriangle className="h-4 w-4" />
                            Risk Exposure
                        </div>
                        <div className={`text-3xl font-bold ${riskExposure > 4 ? 'text-red-400' : riskExposure > 2 ? 'text-amber-400' : 'text-emerald-400'
                            }`}>
                            {riskExposure} hrs
                        </div>
                        <div className="text-xs text-slate-500">Above RoLR (24h)</div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Wholesale Price Chart */}
                    <div className="lg:col-span-2 bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <BarChart3 className="h-5 w-5 text-purple-400" />
                                <h2 className="font-bold text-lg">Wholesale vs RoLR</h2>
                            </div>
                            <div className="flex gap-2">
                                {(['24h', '7d', '30d'] as const).map((period) => (
                                    <button
                                        key={period}
                                        onClick={() => setForecastPeriod(period)}
                                        className={`px-3 py-1 rounded text-sm ${forecastPeriod === period
                                                ? 'bg-purple-500 text-white'
                                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                            }`}
                                    >
                                        {period}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Simplified Chart Visualization */}
                        <div className="relative h-64">
                            {/* RoLR Line */}
                            <div
                                className="absolute left-0 right-0 border-t-2 border-dashed border-purple-500"
                                style={{ top: `${100 - (ROLR_FIXED_RATE / 25) * 100}%` }}
                            >
                                <span className="absolute -top-5 right-0 text-xs text-purple-400 bg-slate-800 px-1">
                                    RoLR: {ROLR_FIXED_RATE}¢
                                </span>
                            </div>

                            {/* Price Bars */}
                            <div className="flex items-end h-full gap-1">
                                {wholesaleData.map((d, i) => {
                                    const height = (d.price / 25) * 100;
                                    const isAboveRoLR = d.price > ROLR_FIXED_RATE;
                                    return (
                                        <div
                                            key={i}
                                            className={`flex-1 rounded-t transition-all ${isAboveRoLR ? 'bg-red-500' : 'bg-emerald-500'
                                                }`}
                                            style={{ height: `${Math.min(height, 100)}%` }}
                                            title={`Hour ${d.hour}: ${d.price.toFixed(2)}¢/kWh`}
                                        />
                                    );
                                })}
                            </div>

                            {/* X-axis labels */}
                            <div className="flex justify-between mt-2 text-xs text-slate-500">
                                <span>-24h</span>
                                <span>-12h</span>
                                <span>Now</span>
                            </div>
                        </div>

                        <div className="mt-4 flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded bg-emerald-500" />
                                <span className="text-slate-400">Below RoLR (margin positive)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded bg-red-500" />
                                <span className="text-slate-400">Above RoLR (margin compression)</span>
                            </div>
                        </div>
                    </div>

                    {/* Hedging Positions */}
                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <Shield className="h-5 w-5 text-purple-400" />
                            <h2 className="font-bold text-lg">Active Hedges</h2>
                        </div>

                        <div className="space-y-3">
                            {positions.map((pos) => (
                                <div
                                    key={pos.id}
                                    className={`p-3 rounded-lg border ${pos.status === 'expiring'
                                            ? 'bg-amber-900/20 border-amber-500/30'
                                            : 'bg-slate-900/50 border-slate-700'
                                        }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium capitalize">{pos.type}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded ${pos.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
                                                pos.status === 'expiring' ? 'bg-amber-500/20 text-amber-400' :
                                                    'bg-slate-700 text-slate-400'
                                            }`}>
                                            {pos.status}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div>
                                            <div className="text-slate-500">Volume</div>
                                            <div className="font-medium">{pos.mwh.toLocaleString()} MWh</div>
                                        </div>
                                        <div>
                                            <div className="text-slate-500">Strike</div>
                                            <div className="font-medium">{pos.strikePrice}¢/kWh</div>
                                        </div>
                                    </div>
                                    <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                                        <Calendar className="h-3 w-3" />
                                        Expires: {pos.expiryDate}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button className="w-full mt-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium transition-colors">
                            Add Hedge Position
                        </button>
                    </div>
                </div>

                {/* Recommendations */}
                <div className="mt-8 bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                    <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-purple-400" />
                        AI Hedging Recommendations
                    </h2>

                    <div className="grid md:grid-cols-3 gap-4">
                        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                            <div className="text-sm text-emerald-400 mb-2">Low Risk</div>
                            <div className="font-medium mb-1">Increase Forward Coverage</div>
                            <p className="text-sm text-slate-400">
                                Current avg wholesale (${avgWholesale.toFixed(2)}¢) is below RoLR.
                                Lock in forward contracts at current rates.
                            </p>
                        </div>

                        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                            <div className="text-sm text-amber-400 mb-2">Medium Risk</div>
                            <div className="font-medium mb-1">Expiring Position Alert</div>
                            <p className="text-sm text-slate-400">
                                Option position (8,000 MWh) expires Jan 31.
                                Consider rolling forward to maintain coverage.
                            </p>
                        </div>

                        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                            <div className="text-sm text-cyan-400 mb-2">Opportunity</div>
                            <div className="font-medium mb-1">Peak Hour Hedging</div>
                            <p className="text-sm text-slate-400">
                                {riskExposure} hours above RoLR today. Consider targeted
                                peak-hour swaps for Q1 2025.
                            </p>
                        </div>
                    </div>
                </div>
            </main>

            {/* CTA Footer */}
            <div className="border-t border-slate-800 bg-slate-800/30 py-8 mt-12">
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <h3 className="text-xl font-bold mb-3">Ready to Protect Your RoLR Margins?</h3>
                    <p className="text-slate-400 mb-6">
                        CEIP Retailer Hedging is available for Enterprise customers.
                        Get load forecasting, hedging analytics, and risk management.
                    </p>
                    <Link
                        to="/enterprise"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-medium transition-colors"
                    >
                        Contact Enterprise Sales
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default RetailerHedgingDashboard;
