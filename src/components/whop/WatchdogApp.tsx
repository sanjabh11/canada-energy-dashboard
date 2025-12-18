/**
 * WatchdogApp - Whop Entry Point for Alberta Rate Watchdog
 * 
 * This is the "Wedge Product" per whop_skill.md strategy.
 * Lightweight wrapper that renders RROAlertSystem without heavy dashboard dependencies.
 * Includes persistent "Unlock CEIP Advanced" CTA for upsell.
 * 
 * PORTABILITY: Uses EmailCaptureModal for dual email capture before Whop checkout.
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Zap, TrendingUp, Lock, ArrowRight, X, Calculator, Sparkles } from 'lucide-react';
import { ErrorBoundary } from '../ErrorBoundary';
import { RROAlertSystem } from '../RROAlertSystem';
import { ThemeToggle } from '../ui/ThemeToggle';
import { EmailCaptureModal } from '../billing/EmailCaptureModal';
import { getBillingAdapter } from '../../lib/billingAdapter';
import { WelcomeModal } from './WelcomeModal';

export function WatchdogApp() {
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    // Get the Pro plan from billing adapter
    const billingAdapter = getBillingAdapter();
    const proPlan = billingAdapter.getPlan('whop_pro') || {
        id: 'whop_pro',
        name: 'CEIP Pro',
        tier: 'pro' as const,
        price: 29,
        currency: 'USD',
        interval: 'month' as const,
        features: ['35+ dashboards', 'Real-time IESO + AESO', 'Hydrogen, CCUS, ESG', 'Data export', 'API access']
    };

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

                {/* Hero CTA - "Predict My Power Bill" (whop_skill.md Day 3) */}
                <section className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border-b border-cyan-800">
                    <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-cyan-500/20 rounded-xl">
                                <Calculator className="h-8 w-8 text-cyan-400" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Predict My Power Bill</h2>
                                <p className="text-cyan-200 text-sm">See how today's prices affect your monthly electricity costs</p>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                // Scroll to the forecast section
                                document.querySelector('.rro-forecast')?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-medium rounded-lg transition-all flex items-center gap-2 whitespace-nowrap"
                        >
                            <Sparkles className="h-5 w-5" />
                            Calculate Now
                        </button>
                    </div>
                </section>

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

                {/* Email Capture Modal - Dual Capture Pattern */}
                <EmailCaptureModal
                    plan={proPlan}
                    isOpen={showUpgradeModal}
                    onClose={() => setShowUpgradeModal(false)}
                />

                {/* Welcome Modal - First Run Experience */}
                <WelcomeModal appName="watchdog" />

                {/* Simple Footer */}
                <footer className="border-t border-slate-800 py-8 text-center text-slate-500 text-sm mt-8 pb-24">
                    <p>&copy; {new Date().getFullYear()} Canada Energy Intelligence Platform.</p>
                    <p className="mt-1">
                        <Link to="/privacy" className="text-cyan-500 hover:text-cyan-400">Privacy</Link>
                        {' • '}
                        <Link to="/terms" className="text-cyan-500 hover:text-cyan-400">Terms</Link>
                        {' • '}
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
