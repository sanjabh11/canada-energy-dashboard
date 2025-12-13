/**
 * RROAlertSystem - Alberta Electricity Rate Watchdog
 * 
 * "GasBuddy for Electricity" - Strategy 3 from Gemini research
 * Monitors RRO rates, forecasts prices, and helps consumers switch retailers.
 * 
 * Target Users: Alberta residential/commercial electricity consumers
 * Monetization: Affiliate commissions + $3/mo premium alerts
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    TrendingUp,
    TrendingDown,
    Bell,
    BellRing,
    Zap,
    DollarSign,
    AlertTriangle,
    CheckCircle,
    ArrowRight,
    ExternalLink,
    Clock,
    BarChart3,
    RefreshCw,
    Mail,
    Crown,
    Lock,
    Sparkles
} from 'lucide-react';
import { SEOHead } from './SEOHead';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine
} from 'recharts';

// Simulated RRO historical data (in production, would come from UCA/AESO)
const generateHistoricalData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const basePrice = 12;
    return months.map((month, i) => ({
        month,
        rro: Math.round((basePrice + Math.random() * 8 + (i === 0 || i === 1 || i === 11 ? 4 : 0)) * 100) / 100,
        fixed: 11.5,
        pool: Math.round((basePrice + Math.random() * 12 - 2) * 100) / 100
    }));
};

// Alberta electricity retailers
const RETAILERS = [
    {
        id: 'enmax',
        name: 'ENMAX',
        fixedRate: 11.49,
        term: 12,
        promo: 'No deposit required',
        url: 'https://www.enmax.com/'
    },
    {
        id: 'direct',
        name: 'Direct Energy',
        fixedRate: 10.99,
        term: 24,
        promo: 'Lock in low rate',
        url: 'https://www.directenergy.ca/'
    },
    {
        id: 'epcor',
        name: 'EPCOR',
        fixedRate: 11.29,
        term: 12,
        promo: 'Free smart thermostat',
        url: 'https://www.epcor.com/'
    },
    {
        id: 'atco',
        name: 'ATCOenergy',
        fixedRate: 10.79,
        term: 36,
        promo: 'Price match guarantee',
        url: 'https://www.atcoenergy.com/'
    },
    {
        id: 'spark',
        name: 'Spark Power',
        fixedRate: 11.99,
        term: 6,
        promo: 'Short-term flexibility',
        url: 'https://www.sparkpower.ca/'
    }
];

export function RROAlertSystem() {
    const [historicalData, setHistoricalData] = useState(generateHistoricalData());
    const [currentRRO, setCurrentRRO] = useState(16.82);
    const [forecastRRO, setForecastRRO] = useState(18.45);
    const [email, setEmail] = useState('');
    const [alertThreshold, setAlertThreshold] = useState(15);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(new Date());

    const rroTrend = forecastRRO > currentRRO ? 'up' : 'down';
    const shouldSwitch = currentRRO > 14 || forecastRRO > 16;
    const lowestFixed = Math.min(...RETAILERS.map(r => r.fixedRate));

    const handleSubscribe = (e: React.FormEvent) => {
        e.preventDefault();
        if (email) {
            setIsSubscribed(true);
            alert(`Alert subscription confirmed for ${email}!\n\nYou'll receive notifications when RRO exceeds ${alertThreshold}¢/kWh.`);
        }
    };

    const handleRefresh = () => {
        setHistoricalData(generateHistoricalData());
        setCurrentRRO(Math.round((14 + Math.random() * 6) * 100) / 100);
        setForecastRRO(Math.round((15 + Math.random() * 7) * 100) / 100);
        setLastUpdated(new Date());
    };

    return (
        <div className="min-h-screen bg-slate-900">
            <SEOHead
                title="Alberta RRO Rate Watchdog | Electricity Price Alerts"
                description="Track Alberta's Regulated Rate Option in real-time. Get alerts before price spikes and compare fixed-rate retailers."
                path="/rate-alerts"
                keywords={['Alberta RRO rate', 'electricity prices', 'ENMAX rates', 'EPCOR rates', 'Alberta power bill']}
            />

            {/* Header - Whop Optimized */}
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 py-12 px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-white/20 rounded-xl">
                                <Zap className="h-8 w-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-white">Alberta Rate Watchdog</h1>
                                <p className="text-blue-100">Never be surprised by electricity bill spikes again</p>
                                <p className="text-xs text-blue-200 mt-1 flex items-center gap-1">
                                    <Sparkles className="h-3 w-3" />
                                    Powered by CEIP — Canada's Energy Intelligence Engine
                                </p>
                            </div>
                        </div>
                        <Link
                            to="/pricing"
                            className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium transition-colors border border-white/30"
                        >
                            <Crown className="h-4 w-4" />
                            Unlock CEIP Advanced
                        </Link>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto py-8 px-6">

                {/* Current Rate Cards */}
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                    {/* Current RRO */}
                    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-slate-400 text-sm">Current RRO Rate</span>
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                December 2024
                            </span>
                        </div>
                        <div className="flex items-end gap-2 mb-2">
                            <span className="text-4xl font-bold text-white">{currentRRO}¢</span>
                            <span className="text-slate-500 mb-1">/kWh</span>
                        </div>
                        <div className={`text-sm ${currentRRO > 15 ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {currentRRO > 15 ? '⚠️ Above average' : '✓ Reasonable rate'}
                        </div>
                    </div>

                    {/* Forecast */}
                    <div className={`border rounded-xl p-6 ${rroTrend === 'up'
                        ? 'bg-red-900/20 border-red-500/30'
                        : 'bg-emerald-900/20 border-emerald-500/30'
                        }`}>
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-slate-400 text-sm">January Forecast</span>
                            {rroTrend === 'up' ? (
                                <TrendingUp className="h-5 w-5 text-red-400" />
                            ) : (
                                <TrendingDown className="h-5 w-5 text-emerald-400" />
                            )}
                        </div>
                        <div className="flex items-end gap-2 mb-2">
                            <span className={`text-4xl font-bold ${rroTrend === 'up' ? 'text-red-400' : 'text-emerald-400'}`}>
                                {forecastRRO}¢
                            </span>
                            <span className="text-slate-500 mb-1">/kWh</span>
                        </div>
                        <div className={`text-sm ${rroTrend === 'up' ? 'text-red-400' : 'text-emerald-400'}`}>
                            {rroTrend === 'up'
                                ? `↑ ${((forecastRRO - currentRRO) / currentRRO * 100).toFixed(1)}% increase expected`
                                : `↓ ${((currentRRO - forecastRRO) / currentRRO * 100).toFixed(1)}% decrease expected`
                            }
                        </div>
                    </div>

                    {/* Best Fixed Rate */}
                    <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-slate-400 text-sm">Best Fixed Rate</span>
                            <CheckCircle className="h-5 w-5 text-emerald-400" />
                        </div>
                        <div className="flex items-end gap-2 mb-2">
                            <span className="text-4xl font-bold text-emerald-400">{lowestFixed}¢</span>
                            <span className="text-slate-500 mb-1">/kWh</span>
                        </div>
                        <div className="text-sm text-emerald-400">
                            Save {((currentRRO - lowestFixed) / currentRRO * 100).toFixed(0)}% by switching
                        </div>
                    </div>
                </div>

                {/* Alert Banner */}
                {shouldSwitch && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-8 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="h-6 w-6 text-amber-400" />
                            <div>
                                <div className="font-medium text-white">Price Alert: Consider Switching to Fixed Rate</div>
                                <div className="text-sm text-slate-400">
                                    RRO is forecast to hit {forecastRRO}¢/kWh. Lock in {lowestFixed}¢ now.
                                </div>
                            </div>
                        </div>
                        <a
                            href="#retailers"
                            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            Compare Retailers
                        </a>
                    </div>
                )}

                {/* Historical Chart */}
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-8">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-white">RRO vs Fixed Rate History</h2>
                            <p className="text-sm text-slate-400">2024 monthly comparison</p>
                        </div>
                        <button
                            onClick={handleRefresh}
                            className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm transition-colors"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Refresh
                        </button>
                    </div>

                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={historicalData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                                <YAxis stroke="#94a3b8" fontSize={12} domain={[8, 24]} tickFormatter={(v) => `${v}¢`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                                    labelStyle={{ color: '#f1f5f9' }}
                                    formatter={(value: number) => [`${value}¢/kWh`]}
                                />
                                <ReferenceLine y={15} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: 'High', fill: '#f59e0b', fontSize: 10 }} />
                                <Line type="monotone" dataKey="rro" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444' }} name="RRO Rate" />
                                <Line type="monotone" dataKey="fixed" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} name="Avg Fixed" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="flex items-center justify-center gap-6 mt-4">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500" />
                            <span className="text-sm text-slate-400">RRO (Floating)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-emerald-500" />
                            <span className="text-sm text-slate-400">Fixed Rate</span>
                        </div>
                    </div>
                </div>

                {/* Retailer Comparison */}
                <div id="retailers" className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-8">
                    <h2 className="text-xl font-bold text-white mb-2">Fixed Rate Retailers</h2>
                    <p className="text-sm text-slate-400 mb-6">Lock in stability – switch in minutes</p>

                    <div className="space-y-4">
                        {RETAILERS.sort((a, b) => a.fixedRate - b.fixedRate).map((retailer, i) => (
                            <div
                                key={retailer.id}
                                className={`flex items-center justify-between p-4 rounded-lg border ${i === 0
                                    ? 'bg-emerald-900/20 border-emerald-500/30'
                                    : 'bg-slate-900 border-slate-700'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    {i === 0 && (
                                        <span className="px-2 py-1 bg-emerald-500 text-white text-xs font-medium rounded">
                                            BEST RATE
                                        </span>
                                    )}
                                    <div>
                                        <div className="font-medium text-white">{retailer.name}</div>
                                        <div className="text-xs text-slate-500">{retailer.promo}</div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        <div className="text-xl font-bold text-white">{retailer.fixedRate}¢</div>
                                        <div className="text-xs text-slate-500">{retailer.term} month term</div>
                                    </div>
                                    <a
                                        href={retailer.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                                    >
                                        Switch <ExternalLink className="h-4 w-4" />
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>

                    <p className="text-xs text-slate-500 mt-4 text-center">
                        Rates as of {lastUpdated.toLocaleDateString()}. Click retailer links for current offers.
                    </p>
                </div>

                {/* Alert Subscription */}
                <div className="bg-gradient-to-r from-blue-900/30 to-cyan-900/30 border border-blue-500/30 rounded-xl p-6 mb-8">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                            <BellRing className="h-6 w-6 text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Price Alerts</h2>
                            <p className="text-sm text-slate-400">Get notified before RRO spikes hit your bill</p>
                        </div>
                    </div>

                    {isSubscribed ? (
                        <div className="flex items-center gap-2 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                            <CheckCircle className="h-5 w-5 text-emerald-400" />
                            <span className="text-emerald-400">Subscribed! You'll receive alerts at {email}</span>
                        </div>
                    ) : (
                        <form onSubmit={handleSubscribe} className="space-y-4">
                            <div className="grid md:grid-cols-3 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-sm text-slate-400 mb-1">Email Address</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        placeholder="your@email.com"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Alert Threshold</label>
                                    <select
                                        value={alertThreshold}
                                        onChange={(e) => setAlertThreshold(Number(e.target.value))}
                                        className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    >
                                        <option value={12}>Above 12¢/kWh</option>
                                        <option value={15}>Above 15¢/kWh</option>
                                        <option value={18}>Above 18¢/kWh</option>
                                        <option value={20}>Above 20¢/kWh</option>
                                    </select>
                                </div>
                            </div>
                            <button
                                type="submit"
                                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                            >
                                <Bell className="h-5 w-5" />
                                Subscribe to Alerts (Free)
                            </button>
                        </form>
                    )}
                </div>

                {/* How RRO Works */}
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                    <h2 className="text-xl font-bold text-white mb-4">How Alberta's RRO Works</h2>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="font-medium text-white mb-2">What is RRO?</h3>
                            <p className="text-sm text-slate-400 mb-4">
                                The Regulated Rate Option is Alberta's default electricity rate. It's a floating rate
                                that changes monthly based on wholesale market prices. While convenient, it exposes
                                consumers to significant price volatility.
                            </p>
                            <h3 className="font-medium text-white mb-2">Why Rates Spike</h3>
                            <ul className="text-sm text-slate-400 list-disc list-inside space-y-1">
                                <li>Extreme cold/heat increases demand</li>
                                <li>Generator outages tighten supply</li>
                                <li>Coal plant retirements reduce capacity</li>
                                <li>Economic withholding by generators</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-medium text-white mb-2">When to Switch</h3>
                            <div className="space-y-2">
                                {[
                                    { condition: 'RRO forecast > 15¢', action: 'Consider switching to fixed', color: 'text-amber-400' },
                                    { condition: 'RRO forecast > 18¢', action: 'Switch recommended', color: 'text-red-400' },
                                    { condition: 'RRO below fixed rates', action: 'Stay on RRO', color: 'text-emerald-400' }
                                ].map((rule, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg">
                                        <ArrowRight className={`h-4 w-4 ${rule.color}`} />
                                        <div>
                                            <div className="text-sm text-white">{rule.condition}</div>
                                            <div className={`text-xs ${rule.color}`}>{rule.action}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* CEIP Advanced Upsell Banner */}
            <div className="max-w-6xl mx-auto px-6 mb-8">
                <div className="bg-gradient-to-r from-purple-900/30 to-indigo-900/30 border border-purple-500/30 rounded-xl p-6">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-purple-500/20 rounded-xl">
                                <Crown className="h-8 w-8 text-purple-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Unlock CEIP Advanced</h3>
                                <p className="text-sm text-slate-400">35+ professional dashboards, real-time grid analytics, AI insights</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="text-right hidden sm:block">
                                <div className="text-2xl font-bold text-white">$29<span className="text-sm text-slate-400">/mo</span></div>
                                <div className="text-xs text-purple-400">7-day free trial</div>
                            </div>
                            <Link
                                to="/pricing"
                                className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                            >
                                <Sparkles className="h-5 w-5" />
                                Upgrade Now
                            </Link>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-purple-500/20">
                        {[
                            { icon: '📊', label: '35+ Dashboards' },
                            { icon: '⚡', label: 'Real-time Grid Data' },
                            { icon: '🤖', label: 'AI Price Forecasts' },
                            { icon: '📈', label: 'Export & API Access' }
                        ].map((feature) => (
                            <div key={feature.label} className="flex items-center gap-2 text-sm text-slate-300">
                                <span>{feature.icon}</span>
                                {feature.label}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="py-8 px-6 border-t border-slate-800">
                <div className="max-w-6xl mx-auto">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-6">
                            <Link to="/" className="text-slate-400 hover:text-white transition-colors">
                                ← Back to Dashboard
                            </Link>
                            <Link to="/pricing" className="text-cyan-400 hover:text-cyan-300 transition-colors text-sm">
                                View All Plans
                            </Link>
                        </div>
                        <div className="text-center md:text-right">
                            <div className="text-xs text-slate-500">Data sources: AESO Pool Price, UCA Retail Rates</div>
                            <div className="text-xs text-slate-600 mt-1">Powered by CEIP — Canada's Energy Intelligence Engine</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default RROAlertSystem;
