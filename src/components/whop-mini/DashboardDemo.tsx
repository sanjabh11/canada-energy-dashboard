/**
 * Dashboard Demo
 * 
 * Bloomberg-style dark mode dashboard with static mock data.
 * Shows pool price ticker, grid stress gauge, generation mix.
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    LayoutDashboard, ArrowLeft, Activity, Zap, Wind, Sun,
    Flame, Droplets, AlertTriangle, ChevronRight, TrendingUp
} from 'lucide-react';

interface WhopMiniUser {
    id: string;
    tier: 'free' | 'basic' | 'pro';
    isWhopUser: boolean;
}

// Static mock data (simulates real-time)
const MOCK_DATA = {
    poolPrice: 87.50,
    poolPriceChange: 12.3,
    demand: 10850,
    supply: 11200,
    gridStatus: 'normal' as 'normal' | 'watch' | 'alert' | 'emergency',
    generationMix: [
        { source: 'Natural Gas', value: 48, icon: Flame, color: 'text-orange-400' },
        { source: 'Wind', value: 22, icon: Wind, color: 'text-cyan-400' },
        { source: 'Hydro', value: 12, icon: Droplets, color: 'text-blue-400' },
        { source: 'Solar', value: 8, icon: Sun, color: 'text-yellow-400' },
        { source: 'Coal', value: 6, icon: Activity, color: 'text-slate-400' },
        { source: 'Other', value: 4, icon: Zap, color: 'text-purple-400' },
    ]
};

const GRID_STATUS_CONFIG = {
    normal: { label: 'Normal', color: 'bg-green-500', textColor: 'text-green-400' },
    watch: { label: 'Grid Watch', color: 'bg-yellow-500', textColor: 'text-yellow-400' },
    alert: { label: 'Grid Alert', color: 'bg-orange-500', textColor: 'text-orange-400' },
    emergency: { label: 'Emergency', color: 'bg-red-500', textColor: 'text-red-400' },
};

// Simulated price ticker animation
function usePriceTicker(basePrice: number) {
    const [price, setPrice] = useState(basePrice);

    useEffect(() => {
        const interval = setInterval(() => {
            // Small random fluctuation ±2%
            const change = (Math.random() - 0.5) * basePrice * 0.04;
            setPrice(prev => Math.max(0, prev + change));
        }, 3000);
        return () => clearInterval(interval);
    }, [basePrice]);

    return price;
}

export default function DashboardDemo({ user }: { user: WhopMiniUser | null }) {
    const livePrice = usePriceTicker(MOCK_DATA.poolPrice);
    const statusConfig = GRID_STATUS_CONFIG[MOCK_DATA.gridStatus];
    const reserveMargin = ((MOCK_DATA.supply - MOCK_DATA.demand) / MOCK_DATA.demand) * 100;

    return (
        <div className="min-h-screen bg-slate-950">
            {/* Header */}
            <div className="bg-slate-900 border-b border-slate-800">
                <div className="max-w-6xl mx-auto px-4 py-4">
                    <Link to="/whop-mini" className="inline-flex items-center text-slate-400 hover:text-white mb-4">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Academy
                    </Link>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                                <LayoutDashboard className="w-5 h-5 text-cyan-400" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white">Alberta Grid Dashboard</h1>
                                <p className="text-slate-400 text-sm">Demo Mode • Data is simulated</p>
                            </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full ${statusConfig.color} text-white text-sm font-semibold`}>
                            {statusConfig.label}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Dashboard */}
            <div className="max-w-6xl mx-auto px-4 py-6">
                {/* Top Row - Key Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {/* Pool Price */}
                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                        <div className="text-slate-400 text-sm mb-1">Pool Price</div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-white font-mono">
                                ${livePrice.toFixed(2)}
                            </span>
                            <span className={`text-sm font-semibold ${MOCK_DATA.poolPriceChange >= 0 ? 'text-green-400' : 'text-red-400'
                                }`}>
                                {MOCK_DATA.poolPriceChange >= 0 ? '+' : ''}{MOCK_DATA.poolPriceChange.toFixed(1)}%
                            </span>
                        </div>
                        <div className="text-slate-500 text-xs mt-1">$/MWh</div>
                    </div>

                    {/* Demand */}
                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                        <div className="text-slate-400 text-sm mb-1">System Demand</div>
                        <div className="text-3xl font-bold text-white font-mono">
                            {MOCK_DATA.demand.toLocaleString()}
                        </div>
                        <div className="text-slate-500 text-xs mt-1">MW</div>
                    </div>

                    {/* Supply */}
                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                        <div className="text-slate-400 text-sm mb-1">Available Supply</div>
                        <div className="text-3xl font-bold text-white font-mono">
                            {MOCK_DATA.supply.toLocaleString()}
                        </div>
                        <div className="text-slate-500 text-xs mt-1">MW</div>
                    </div>

                    {/* Reserve Margin */}
                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                        <div className="text-slate-400 text-sm mb-1">Reserve Margin</div>
                        <div className={`text-3xl font-bold font-mono ${reserveMargin > 10 ? 'text-green-400' :
                                reserveMargin > 5 ? 'text-yellow-400' : 'text-red-400'
                            }`}>
                            {reserveMargin.toFixed(1)}%
                        </div>
                        <div className="text-slate-500 text-xs mt-1">Supply buffer</div>
                    </div>
                </div>

                {/* Middle Row */}
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                    {/* Grid Stress Gauge */}
                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Grid Stress Level</h3>
                        <div className="relative h-4 bg-slate-800 rounded-full overflow-hidden mb-4">
                            <div
                                className={`absolute left-0 top-0 h-full transition-all duration-500 ${reserveMargin > 15 ? 'bg-green-500' :
                                        reserveMargin > 10 ? 'bg-cyan-500' :
                                            reserveMargin > 5 ? 'bg-yellow-500' :
                                                'bg-red-500'
                                    }`}
                                style={{ width: `${Math.min(100, Math.max(0, 100 - (reserveMargin * 3)))}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-xs text-slate-500">
                            <span>Low</span>
                            <span>Moderate</span>
                            <span>High</span>
                            <span>Critical</span>
                        </div>
                    </div>

                    {/* Generation Mix */}
                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Generation Mix</h3>
                        <div className="space-y-3">
                            {MOCK_DATA.generationMix.map((source) => (
                                <div key={source.source} className="flex items-center gap-3">
                                    <source.icon className={`w-5 h-5 ${source.color}`} />
                                    <div className="flex-1">
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-slate-300">{source.source}</span>
                                            <span className="text-white font-semibold">{source.value}%</span>
                                        </div>
                                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${source.color.replace('text-', 'bg-')}`}
                                                style={{ width: `${source.value}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Price History (Simplified) */}
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white">24-Hour Price Trend</h3>
                        <span className="text-slate-400 text-sm">Demo data</span>
                    </div>
                    {/* Simple ASCII-style chart */}
                    <div className="h-32 flex items-end gap-1">
                        {[45, 52, 38, 65, 72, 58, 48, 95, 120, 85, 62, 55, 48, 52, 65, 75, 88, 95, 82, 68, 55, 62, 78, 87].map((value, i) => (
                            <div
                                key={i}
                                className={`flex-1 rounded-t transition-all ${i === 23 ? 'bg-cyan-500' : 'bg-slate-700 hover:bg-slate-600'
                                    }`}
                                style={{ height: `${(value / 120) * 100}%` }}
                                title={`$${value}/MWh`}
                            />
                        ))}
                    </div>
                    <div className="flex justify-between text-xs text-slate-500 mt-2">
                        <span>12 AM</span>
                        <span>6 AM</span>
                        <span>12 PM</span>
                        <span>6 PM</span>
                        <span>Now</span>
                    </div>
                </div>

                {/* Demo Mode Notice + CTA */}
                <div className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 
                        rounded-xl p-6">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                            <TrendingUp className="w-6 h-6 text-cyan-400" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-white mb-2">
                                Connect to Live AESO Data
                            </h3>
                            <p className="text-slate-400 mb-4">
                                Upgrade to Pro for real-time pool prices, grid alerts, and historical analysis.
                                Get notified when prices spike above your threshold.
                            </p>
                            <div className="flex flex-wrap gap-4">
                                <a
                                    href="https://whop.com/canada-energy/?plan=pro"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center bg-cyan-500 text-white font-semibold px-6 py-3 
                             rounded-lg hover:bg-cyan-600 transition-colors"
                                >
                                    Unlock Live Data
                                    <ChevronRight className="w-4 h-4 ml-2" />
                                </a>
                                <div className="flex items-center gap-2 text-slate-400">
                                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                                    <span className="text-sm">$99/month for Pro access</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
