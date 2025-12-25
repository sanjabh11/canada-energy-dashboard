/**
 * Open API Documentation Portal
 * Using Redoc for beautiful OpenAPI documentation
 * For Gartner Digital Markets integration requirement
 */

import React, { useState } from 'react';
import { RedocStandalone } from 'redoc';
import { Link } from 'react-router-dom';
import {
    Code,
    Key,
    Book,
    ArrowLeft,
    CheckCircle,
    Zap,
    Shield,
    Globe
} from 'lucide-react';

export const OpenAPIDocsPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'docs' | 'quickstart'>('quickstart');

    return (
        <div className="min-h-screen bg-slate-900">
            {/* Header */}
            <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link
                                to="/"
                                className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Back
                            </Link>
                            <div className="h-6 w-px bg-slate-700" />
                            <h1 className="text-2xl font-bold text-white">CEIP API Documentation</h1>
                            <span className="px-2 py-1 bg-emerald-600/20 text-emerald-400 text-xs font-medium rounded">
                                v1.0.0
                            </span>
                        </div>
                        <Link
                            to="/pricing"
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-medium text-white transition-all"
                        >
                            Get API Key
                        </Link>
                    </div>
                </div>
            </header>

            {/* Tabs */}
            <div className="bg-slate-800 border-b border-slate-700">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex gap-8">
                        <button
                            onClick={() => setActiveTab('quickstart')}
                            className={`px-4 py-3 font-medium transition-colors border-b-2 ${activeTab === 'quickstart'
                                    ? 'text-emerald-400 border-emerald-400'
                                    : 'text-slate-400 border-transparent hover:text-white'
                                }`}
                        >
                            Quick Start
                        </button>
                        <button
                            onClick={() => setActiveTab('docs')}
                            className={`px-4 py-3 font-medium transition-colors border-b-2 ${activeTab === 'docs'
                                    ? 'text-emerald-400 border-emerald-400'
                                    : 'text-slate-400 border-transparent hover:text-white'
                                }`}
                        >
                            API Reference
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            {activeTab === 'quickstart' ? (
                <div className="max-w-4xl mx-auto px-6 py-12">
                    {/* Quick Start Guide */}
                    <div className="prose prose-invert max-w-none">
                        <h2 className="text-3xl font-bold text-white mb-4">Get Started in 5 Minutes</h2>
                        <p className="text-xl text-slate-400 mb-8">
                            RESTful API for Canadian energy compliance, grid monitoring, and OCAP® data sovereignty.
                        </p>

                        <div className="grid md:grid-cols-3 gap-6 mb-12 not-prose">
                            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                                <div className="p-3 bg-emerald-600/20 rounded-xl inline-block mb-4">
                                    <Zap className="h-6 w-6 text-emerald-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-white mb-2">Real-time Data</h3>
                                <p className="text-sm text-slate-400">
                                    AESO pool prices, TIER credit pricing, grid generation mix updated every 5 minutes.
                                </p>
                            </div>

                            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                                <div className="p-3 bg-blue-600/20 rounded-xl inline-block mb-4">
                                    <Shield className="h-6 w-6 text-blue-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-white mb-2">OCAP® Compliant</h3>
                                <p className="text-sm text-slate-400">
                                    The only API built for Indigenous data sovereignty with audit trails.
                                </p>
                            </div>

                            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                                <div className="p-3 bg-purple-600/20 rounded-xl inline-block mb-4">
                                    <Globe className="h-6 w-6 text-purple-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-white mb-2">Canadian-First</h3>
                                <p className="text-sm text-slate-400">
                                    CAD pricing, Canadian regulations (TIER, RoLR), Alberta grid data.
                                </p>
                            </div>
                        </div>

                        {/* Step 1: Get API Key */}
                        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 mb-8">
                            <div className="flex items-center gap-3 mb-6">
                                <span className="flex items-center justify-center w-8 h-8 bg-emerald-600 text-white font-bold rounded-full">
                                    1
                                </span>
                                <h3 className="text-2xl font-bold text-white">Get Your API Key</h3>
                            </div>

                            <p className="text-slate-300 mb-4">
                                Subscribe to our Professional tier ($149/mo) to receive 1,000 API calls per day.
                            </p>

                            <div className="bg-slate-900 border border-slate-600 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-slate-400">Your API Key</span>
                                    <Key className="h-4 w-4 text-emerald-400" />
                                </div>
                                <code className="text-emerald-400 font-mono text-sm">
                                    sk_professional_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
                                </code>
                            </div>

                            <Link
                                to="/pricing"
                                className="inline-flex items-center gap-2 mt-4 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-semibold text-white transition-all"
                            >
                                Subscribe to Get API Key
                            </Link>
                        </div>

                        {/* Step 2: Make First Request */}
                        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 mb-8">
                            <div className="flex items-center gap-3 mb-6">
                                <span className="flex items-center justify-center w-8 h-8 bg-emerald-600 text-white font-bold rounded-full">
                                    2
                                </span>
                                <h3 className="text-2xl font-bold text-white">Make Your First Request</h3>
                            </div>

                            <p className="text-slate-300 mb-4">
                                Get the current Alberta pool price:
                            </p>

                            <div className="bg-slate-900 rounded-lg overflow-hidden">
                                <div className="bg-slate-700 px-4 py-2 flex items-center justify-between">
                                    <span className="text-xs text-slate-300 font-medium">cURL</span>
                                    <Code className="h-4 w-4 text-slate-400" />
                                </div>
                                <pre className="p-4 text-sm text-emerald-400 font-mono overflow-x-auto">
                                    {`curl -H "X-API-Key: YOUR_API_KEY" \\
  https://qnymbecjgeaoxsfphrti.functions.supabase.co/api/v1/grid/alberta/pool-price`}
                                </pre>
                            </div>

                            <div className="mt-4 bg-slate-900 rounded-lg overflow-hidden">
                                <div className="bg-slate-700 px-4 py-2 flex items-center justify-between">
                                    <span className="text-xs text-slate-300 font-medium">Response (200 OK)</span>
                                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                                </div>
                                <pre className="p-4 text-sm text-slate-300 font-mono overflow-x-auto">
                                    {`{
  "timestamp": "2025-12-25T18:00:00Z",
  "price": 85.50,
  "unit": "CAD_per_MWh",
  "forecast": [
    { "hour": 19, "price": 92.00 },
    { "hour": 20, "price": 88.50 }
  ]
}`}
                                </pre>
                            </div>
                        </div>

                        {/* Step 3: Explore Endpoints */}
                        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 mb-8">
                            <div className="flex items-center gap-3 mb-6">
                                <span className="flex items-center justify-center w-8 h-8 bg-emerald-600 text-white font-bold rounded-full">
                                    3
                                </span>
                                <h3 className="text-2xl font-bold text-white">Explore Available Endpoints</h3>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="bg-slate-700/30 rounded-lg p-4">
                                    <h4 className="text-white font-medium mb-2">TIER Compliance</h4>
                                    <ul className="text-sm text-slate-400 space-y-1">
                                        <li>• GET /tier/emissions</li>
                                        <li>• GET /tier/credits</li>
                                    </ul>
                                </div>

                                <div className="bg-slate-700/30 rounded-lg p-4">
                                    <h4 className="text-white font-medium mb-2">Grid Data</h4>
                                    <ul className="text-sm text-slate-400 space-y-1">
                                        <li>• GET /grid/alberta/pool-price</li>
                                        <li>• GET /grid/alberta/generation-mix</li>
                                    </ul>
                                </div>

                                <div className="bg-slate-700/30 rounded-lg p-4">
                                    <h4 className="text-white font-medium mb-2">Billing & Savings</h4>
                                    <ul className="text-sm text-slate-400 space-y-1">
                                        <li>• GET /billing/shadow</li>
                                    </ul>
                                </div>

                                <div className="bg-slate-700/30 rounded-lg p-4">
                                    <h4 className="text-white font-medium mb-2">Reports</h4>
                                    <ul className="text-sm text-slate-400 space-y-1">
                                        <li>• POST /export/green-loan</li>
                                        <li>• POST /ocap/export</li>
                                    </ul>
                                </div>
                            </div>

                            <button
                                onClick={() => setActiveTab('docs')}
                                className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium text-white transition-all"
                            >
                                <Book className="h-5 w-5" />
                                View Full API Reference
                            </button>
                        </div>

                        {/* Rate Limits */}
                        <div className="bg-amber-900/20 border border-amber-500/30 rounded-2xl p-8">
                            <h3 className="text-xl font-bold text-white mb-4">Rate Limits</h3>
                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <div className="text-sm text-slate-400 mb-1">Professional Tier</div>
                                    <div className="text-2xl font-bold text-white">1,000 calls/day</div>
                                    <div className="text-sm text-slate-400 mt-1">$149/month</div>
                                </div>
                                <div>
                                    <div className="text-sm text-slate-400 mb-1">Enterprise Tier</div>
                                    <div className="text-2xl font-bold text-white">Custom (10k-100k/day)</div>
                                    <div className="text-sm text-slate-400 mt-1">Contact sales</div>
                                </div>
                            </div>
                            <p className="text-sm text-amber-400 mt-4">
                                Exceeding your rate limit returns HTTP 429. Upgrade your tier for higher limits.
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                // API Reference (Redoc)
                <div>
                    <RedocStandalone
                        specUrl="/api/openapi.yaml"
                        options={{
                            theme: {
                                colors: {
                                    primary: {
                                        main: '#10b981'
                                    }
                                },
                                typography: {
                                    fontSize: '15px',
                                    fontFamily: 'Inter, system-ui, sans-serif',
                                    code: {
                                        fontFamily: 'JetBrains Mono, monospace'
                                    }
                                },
                                sidebar: {
                                    backgroundColor: '#1e293b',
                                    textColor: '#cbd5e1'
                                },
                                rightPanel: {
                                    backgroundColor: '#0f172a'
                                }
                            },
                            hideDownloadButton: false,
                            expandResponses: '200,201',
                            jsonSampleExpandLevel: 2
                        }}
                    />
                </div>
            )}
        </div>
    );
};

export default OpenAPIDocsPage;
