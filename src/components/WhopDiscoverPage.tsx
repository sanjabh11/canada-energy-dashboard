/**
 * WhopDiscoverPage - Discovery/Promotional Page for Whop Marketplace
 * 
 * This page is shown when users discover the app in Whop marketplace.
 * Path: /whop/discover
 * 
 * Features:
 * - App overview and features
 * - Pricing tiers
 * - Testimonials
 * - CTA to start using the app
 */

import React from 'react';
import {
    Zap, BookOpen, Award, Users, BarChart3,
    Check, ArrowRight, Star, Quote
} from 'lucide-react';

export function WhopDiscoverPage() {
    const features = [
        {
            icon: <BarChart3 className="w-6 h-6" />,
            title: 'Real-Time Energy Analytics',
            description: 'Track Canadian energy production across all provinces with live data visualization'
        },
        {
            icon: <BookOpen className="w-6 h-6" />,
            title: 'Certificate Programs',
            description: '15+ modules across 3 professional certificate tracks in energy systems'
        },
        {
            icon: <Zap className="w-6 h-6" />,
            title: 'AI-Powered Learning',
            description: 'Get personalized insights and answers from our energy-focused AI tutor'
        },
        {
            icon: <Users className="w-6 h-6" />,
            title: 'Cohort Management',
            description: 'Run educational cohorts for your community with progress tracking'
        },
        {
            icon: <Award className="w-6 h-6" />,
            title: 'Gamified Progress',
            description: 'Earn badges and certificates as you complete learning modules'
        }
    ];

    const tiers = [
        {
            name: 'Basic',
            price: '$29',
            period: '/month',
            features: ['Full dashboard access', 'Certificate tracks', 'AI chat (25/day)', 'Data citations'],
            popular: false
        },
        {
            name: 'Pro',
            price: '$99',
            period: '/month',
            features: ['Everything in Basic', 'Unlimited AI', 'Cohort management', 'Creator dashboard', 'Priority support'],
            popular: true
        },
        {
            name: 'Team',
            price: '$299',
            period: '/month',
            features: ['Everything in Pro', 'Bulk seats (25)', 'API access', 'White-label', 'Dedicated support'],
            popular: false
        }
    ];

    const testimonials = [
        {
            quote: "Perfect for training our new energy analysts. The certificates add real value.",
            author: "Sarah M.",
            role: "Training Coordinator, Alberta Utility"
        },
        {
            quote: "The AI tutor understands Canadian energy policy better than most consultants.",
            author: "Mike R.",
            role: "Policy Analyst, Ottawa"
        }
    ];

    return (
        <div className="min-h-screen bg-slate-900">
            {/* Hero Section */}
            <section className="bg-gradient-to-br from-slate-900 via-cyan-900/20 to-slate-900 py-20 px-6">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 bg-cyan-500/10 text-cyan-400 px-4 py-2 rounded-full text-sm font-medium mb-6">
                        <Zap className="w-4 h-4" />
                        Energy Tools for Creators & Prosumers
                    </div>
                    <h1 className="text-5xl font-bold text-white mb-6">
                        Canada Energy Academy
                    </h1>
                    <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
                        The complete platform for teaching Canadian energy systems.
                        Real data. Professional certificates. AI-powered learning.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <a
                            href="/whop/experience/"
                            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold rounded-xl hover:from-cyan-600 hover:to-blue-600 transition-all"
                        >
                            Start Learning Free
                            <ArrowRight className="w-5 h-5" />
                        </a>
                        <a
                            href="#pricing"
                            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-slate-800 text-white font-bold rounded-xl border border-slate-700 hover:bg-slate-700 transition-all"
                        >
                            View Pricing
                        </a>
                    </div>

                    {/* Free Tools Showcase */}
                    <div className="mt-12 pt-8 border-t border-slate-700/50">
                        <p className="text-sm text-slate-400 mb-4">Try our free tools now — no signup required:</p>
                        <div className="flex flex-wrap justify-center gap-4">
                            <a
                                href="/whop/watchdog"
                                className="group flex items-center gap-3 bg-slate-800/80 hover:bg-slate-700 border border-amber-500/30 hover:border-amber-500 rounded-xl px-5 py-3 transition-all"
                            >
                                <div className="p-2 bg-amber-500/20 rounded-lg group-hover:bg-amber-500/30 transition-colors">
                                    <Zap className="w-5 h-5 text-amber-400" />
                                </div>
                                <div className="text-left">
                                    <div className="text-white font-semibold">Alberta Rate Watchdog</div>
                                    <div className="text-xs text-slate-400">Predict your power bill</div>
                                </div>
                            </a>
                            <a
                                href="/whop/quiz"
                                className="group flex items-center gap-3 bg-slate-800/80 hover:bg-slate-700 border border-cyan-500/30 hover:border-cyan-500 rounded-xl px-5 py-3 transition-all"
                            >
                                <div className="p-2 bg-cyan-500/20 rounded-lg group-hover:bg-cyan-500/30 transition-colors">
                                    <BookOpen className="w-5 h-5 text-cyan-400" />
                                </div>
                                <div className="text-left">
                                    <div className="text-white font-semibold">Energy Quiz Pro</div>
                                    <div className="text-xs text-slate-400">Test your knowledge</div>
                                </div>
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-20 px-6">
                <div className="max-w-6xl mx-auto">
                    <h2 className="text-3xl font-bold text-white text-center mb-12">
                        Everything You Need for Energy Education
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {features.map((feature, index) => (
                            <div key={index} className="bg-slate-800 rounded-xl border border-slate-700 p-6 hover:border-cyan-500/50 transition-colors">
                                <div className="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center text-cyan-400 mb-4">
                                    {feature.icon}
                                </div>
                                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                                <p className="text-slate-400 text-sm">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="py-20 px-6 bg-slate-800/50">
                <div className="max-w-6xl mx-auto">
                    <h2 className="text-3xl font-bold text-white text-center mb-4">
                        Simple, Transparent Pricing
                    </h2>
                    <p className="text-slate-400 text-center mb-12">
                        Choose the plan that fits your community
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {tiers.map((tier, index) => (
                            <div
                                key={index}
                                className={`rounded-2xl border p-8 ${tier.popular
                                    ? 'bg-gradient-to-b from-cyan-900/20 to-slate-800 border-cyan-500 scale-105'
                                    : 'bg-slate-800 border-slate-700'
                                    }`}
                            >
                                {tier.popular && (
                                    <div className="flex items-center gap-1 text-cyan-400 text-sm font-medium mb-4">
                                        <Star className="w-4 h-4 fill-current" />
                                        Most Popular
                                    </div>
                                )}
                                <h3 className="text-2xl font-bold text-white mb-2">{tier.name}</h3>
                                <div className="mb-6">
                                    <span className="text-4xl font-bold text-white">{tier.price}</span>
                                    <span className="text-slate-400">{tier.period}</span>
                                </div>
                                <ul className="space-y-3 mb-8">
                                    {tier.features.map((feature, fIndex) => (
                                        <li key={fIndex} className="flex items-center gap-2 text-slate-300 text-sm">
                                            <Check className="w-4 h-4 text-cyan-400" />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                                <a
                                    href={`https://whop.com/canada-energy-academy/?d2c=true&plan=${tier.name.toLowerCase()}`}
                                    className={`block w-full py-3 rounded-lg font-semibold text-center transition-all ${tier.popular
                                        ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-600 hover:to-blue-600'
                                        : 'bg-slate-700 text-white hover:bg-slate-600'
                                        }`}
                                >
                                    Get Started
                                </a>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Testimonials */}
            <section className="py-20 px-6">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-3xl font-bold text-white text-center mb-12">
                        Trusted by Energy Professionals
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {testimonials.map((testimonial, index) => (
                            <div key={index} className="bg-slate-800 rounded-xl border border-slate-700 p-6">
                                <Quote className="w-8 h-8 text-cyan-500/30 mb-4" />
                                <p className="text-slate-300 italic mb-4">{testimonial.quote}</p>
                                <div>
                                    <p className="text-white font-medium">{testimonial.author}</p>
                                    <p className="text-slate-400 text-sm">{testimonial.role}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="py-20 px-6">
                <div className="max-w-3xl mx-auto text-center bg-gradient-to-r from-cyan-900/30 to-purple-900/30 rounded-2xl border border-cyan-500/30 p-12">
                    <h2 className="text-3xl font-bold text-white mb-4">
                        Ready to Educate Your Community?
                    </h2>
                    <p className="text-slate-300 mb-8">
                        Start with our free tier and upgrade as your community grows
                    </p>
                    <a
                        href="/whop/experience/"
                        className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold rounded-xl hover:from-cyan-600 hover:to-blue-600 transition-all"
                    >
                        Launch Your Energy Academy
                        <ArrowRight className="w-5 h-5" />
                    </a>
                </div>
            </section>
        </div>
    );
}

export default WhopDiscoverPage;
