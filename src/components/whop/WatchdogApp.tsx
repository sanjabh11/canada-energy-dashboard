/**
 * WatchdogApp - Whop Entry Point for Alberta Rate Watchdog
 * 
 * This is the "Wedge Product" per whop_skill.md strategy.
 * Lightweight wrapper that renders RROAlertSystem without heavy dashboard dependencies.
 * Includes persistent "Unlock CEIP Advanced" CTA for upsell.
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Zap, TrendingUp, Lock, ArrowRight, X } from 'lucide-react';
import { ErrorBoundary } from '../ErrorBoundary';
import { RROAlertSystem } from '../RROAlertSystem';
import { ThemeToggle } from '../ui/ThemeToggle';

export function WatchdogApp() {
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    // Detect if in iframe (Whop context)
    const [isInIframe, setIsInIframe] = useState(false);
    useEffect(() => {
        setIsInIframe(window.self !== window.top);
    }, []);

    return (
        <ErrorBoundary>
            <div className="min-h-screen bg-slate-900 text-white font-sans selection:bg-cyan-500/30">
                {/* Hide main header in iframe context */}
                {isInIframe && (
                    <style>{`
                        header.nav-header,
                        header.site-header {
                            display: none !important;
                        }
                    `}</style>
                )}

                {/* Minimal Header */}
                <header className="bg-slate-900 border-b border-slate-800 px-6 py-4">
                    <div className="max-w-6xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg">
                                <Zap className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h1 className="font-bold text-lg leading-tight">Alberta Rate Watchdog</h1>
                                <p className="text-xs text-slate-400">Powered by CEIP — Canada's Energy Intelligence Engine</p>
                            </div>
                        </div>

                        {/* Theme Toggle + Upgrade CTA */}
                        <div className="flex items-center gap-3">
                            <ThemeToggle compact />
                            <button
                                onClick={() => setShowUpgradeModal(true)}
                                className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-sm font-medium rounded-lg transition-all flex items-center gap-2"
                            >
                                <TrendingUp className="h-4 w-4" />
                                Unlock CEIP Advanced
                            </button>
                        </div>
                    </div>
                </header>

                {/* Main Content - RRO Alert System */}
                <main className="max-w-6xl mx-auto">
                    <RROAlertSystem />
                </main>

                {/* Persistent Upgrade Banner (if not dismissed) */}
                {!dismissed && (
                    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-cyan-900/95 to-blue-900/95 border-t border-cyan-700 p-4 backdrop-blur-sm z-50">
                        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <Lock className="h-5 w-5 text-cyan-400" />
                                <div>
                                    <p className="text-white font-medium">Want more? Unlock 35+ professional dashboards</p>
                                    <p className="text-cyan-200 text-sm">Hydrogen Hub • Critical Minerals • ESG Finance • Grid Analytics & more</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setShowUpgradeModal(true)}
                                    className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                                >
                                    Upgrade to CEIP Advanced
                                    <ArrowRight className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => setDismissed(true)}
                                    className="p-2 text-slate-400 hover:text-white transition-colors"
                                    aria-label="Dismiss"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Upgrade Modal */}
                {showUpgradeModal && (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                        <div className="bg-slate-800 rounded-2xl border border-slate-700 max-w-lg w-full overflow-hidden">
                            <div className="p-6 border-b border-slate-700">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl font-bold text-white">Unlock CEIP Advanced</h2>
                                    <button
                                        onClick={() => setShowUpgradeModal(false)}
                                        className="p-1 text-slate-400 hover:text-white"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                            <div className="p-6 space-y-4">
                                <p className="text-slate-300">
                                    Get full access to Canada's most comprehensive energy intelligence platform.
                                </p>

                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-sm text-slate-300">
                                        <span className="text-cyan-400">✓</span>
                                        35+ professional dashboards
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-slate-300">
                                        <span className="text-cyan-400">✓</span>
                                        Real-time IESO + AESO grid mix
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-slate-300">
                                        <span className="text-cyan-400">✓</span>
                                        Hydrogen, CCUS, ESG analytics
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-slate-300">
                                        <span className="text-cyan-400">✓</span>
                                        Data export (CSV, JSON, PDF)
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-slate-300">
                                        <span className="text-cyan-400">✓</span>
                                        API access for developers
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-700">
                                    <div className="flex items-baseline gap-2 mb-4">
                                        <span className="text-3xl font-bold text-white">$29</span>
                                        <span className="text-slate-400">/month</span>
                                    </div>

                                    <a
                                        href="https://whop.com/canada-energy-academy/?d2c=true&plan=pro"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
                                    >
                                        Upgrade Now
                                        <ArrowRight className="h-4 w-4" />
                                    </a>

                                    <p className="text-center text-xs text-slate-500 mt-3">
                                        Secure checkout via Whop. Cancel anytime.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Simple Footer */}
                <footer className="border-t border-slate-800 py-8 text-center text-slate-500 text-sm mt-8">
                    <p>&copy; {new Date().getFullYear()} Canada Energy Intelligence Platform.</p>
                    <p className="mt-1">
                        <Link to="/hire-me" className="text-cyan-500 hover:text-cyan-400">Hire the developer</Link>
                        {' • '}
                        <Link to="/about" className="text-cyan-500 hover:text-cyan-400">About CEIP</Link>
                    </p>
                </footer>
            </div>
        </ErrorBoundary>
    );
}

export default WatchdogApp;
