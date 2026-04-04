import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, LineChart, FileText, Zap, Shield, ArrowRight } from 'lucide-react';
import { SEOHead } from './SEOHead';

export const StakeholderOverview: React.FC = () => {
    return (
        <div className="min-h-screen bg-slate-900 text-white">
            <SEOHead 
                title="Platform Overview | Canada Energy Intelligence"
                description="Executive overview of the Canada Energy Intelligence Platform. Proof of value for consultants, industrials, and utilities."
                path="/platform-overview"
            />
            
            <div className="max-w-6xl mx-auto px-6 py-16">
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-blue-500">
                        Canadian Energy Intelligence
                    </h1>
                    <p className="text-xl text-slate-300 max-w-3xl mx-auto">
                        A unified data and compliance trust layer. We provide consultant-ready data packs, industrial TIER optimization, and regulatory filing automation.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 mb-16">
                    {/* Consultant Data Pack */}
                    <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8 hover:border-emerald-500 transition-colors">
                        <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-6">
                            <LineChart className="h-6 w-6 text-emerald-400" />
                        </div>
                        <h2 className="text-2xl font-bold mb-4">For Energy Consultants</h2>
                        <p className="text-slate-400 mb-6">
                            Accelerate your analysis with structured APIs for Canadian grid data, forecast benchmarking, and compliance tracking.
                        </p>
                        <ul className="space-y-3 mb-8">
                            <li className="flex items-center text-sm text-slate-300">
                                <Zap className="h-4 w-4 mr-2 text-emerald-400" />
                                AESO pool prices & generation mix
                            </li>
                            <li className="flex items-center text-sm text-slate-300">
                                <Zap className="h-4 w-4 mr-2 text-emerald-400" />
                                Forecast benchmarking layer
                            </li>
                            <li className="flex items-center text-sm text-slate-300">
                                <Zap className="h-4 w-4 mr-2 text-emerald-400" />
                                Commercial API access
                            </li>
                        </ul>
                        <div className="flex flex-col gap-3">
                            <Link to="/api-docs" className="flex items-center justify-between p-3 bg-slate-900 rounded-lg text-emerald-400 hover:bg-emerald-900/20 transition-colors">
                                <span className="font-medium">View API Docs</span>
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                            <Link to="/forecast-benchmarking" className="flex items-center justify-between p-3 bg-slate-900 rounded-lg text-emerald-400 hover:bg-emerald-900/20 transition-colors">
                                <span className="font-medium">Explore Forecast Benchmarking</span>
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                    </div>

                    {/* Industrial TIER Pack */}
                    <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8 hover:border-blue-500 transition-colors">
                        <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-6">
                            <Building2 className="h-6 w-6 text-blue-400" />
                        </div>
                        <h2 className="text-2xl font-bold mb-4">For Industrial Facilities</h2>
                        <p className="text-slate-400 mb-6">
                            Optimize your TIER compliance strategy with arbitrage calculators and shadow billing tools.
                        </p>
                        <ul className="space-y-3 mb-8">
                            <li className="flex items-center text-sm text-slate-300">
                                <Shield className="h-4 w-4 mr-2 text-blue-400" />
                                TIER ROI & Savings Calculator
                            </li>
                            <li className="flex items-center text-sm text-slate-300">
                                <Shield className="h-4 w-4 mr-2 text-blue-400" />
                                Shadow billing analysis
                            </li>
                            <li className="flex items-center text-sm text-slate-300">
                                <Shield className="h-4 w-4 mr-2 text-blue-400" />
                                Facility benchmarking
                            </li>
                        </ul>
                        <div className="flex flex-col gap-3">
                            <Link to="/roi-calculator" className="flex items-center justify-between p-3 bg-slate-900 rounded-lg text-blue-400 hover:bg-blue-900/20 transition-colors">
                                <span className="font-medium">Open ROI Calculator</span>
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Regulatory & Utility Trust Assets */}
                <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                            <FileText className="h-6 w-6 text-purple-400" />
                        </div>
                        <h2 className="text-2xl font-bold">Regulatory & Asset Trust Layer</h2>
                    </div>
                    <p className="text-slate-400 mb-8 max-w-2xl">
                        Built for utilities, REAs, and the consultants who advise them. Export audit-ready CSVs and index asset health.
                    </p>
                    <div className="grid md:grid-cols-2 gap-6">
                        <Link to="/regulatory-filing" className="group p-4 bg-slate-900 rounded-xl border border-slate-700 hover:border-purple-500 transition-all">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="font-medium text-white group-hover:text-purple-400 transition-colors">Regulatory Filing Exports</h3>
                                <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-purple-400" />
                            </div>
                            <p className="text-sm text-slate-400">AUC Rule 005 and OEB Chapter 5 DSP templates.</p>
                        </Link>
                        <Link to="/asset-health" className="group p-4 bg-slate-900 rounded-xl border border-slate-700 hover:border-purple-500 transition-all">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="font-medium text-white group-hover:text-purple-400 transition-colors">Asset Health Index</h3>
                                <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-purple-400" />
                            </div>
                            <p className="text-sm text-slate-400">CBRM-lite utility asset scoring for REAs and LDCs.</p>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StakeholderOverview;
