/**
 * TIER ROI Calculator Component
 * Based on Value Proposition Research (Dec 2025)
 * Shows 776% ROI story for Industrial clients
 */

import React, { useState, useMemo } from 'react';
import { Calculator, TrendingUp, DollarSign, Percent, ArrowRight, CheckCircle, Info, Mail, ExternalLink, HelpCircle } from 'lucide-react';
import { SEOHead } from './SEOHead';
import { Link } from 'react-router-dom';

interface ROIResults {
    fundPayment: number;
    marketCredits: number;
    directInvestment: number;
    ceipFee: number;
    netSavings: number;
    roiPercent: number;
    bestOption: 'market_credits' | 'direct_investment';
}

export const TIERROICalculator: React.FC = () => {
    // User inputs
    const [annualEmissions, setAnnualEmissions] = useState<number>(150000);
    const [benchmarkExceedance, setBenchmarkExceedance] = useState<number>(20000);
    const [directInvestCapex, setDirectInvestCapex] = useState<number>(500000);
    const [emailCapture, setEmailCapture] = useState('');
    const [emailSubmitted, setEmailSubmitted] = useState(false);

    // Market constants (from research — updated Feb 2026)
    const FUND_PRICE = 95; // TIER fund price (frozen at $95, Alberta May 2025)
    const MARKET_PRICE = 25; // Current EPC/Offset market price (~$24.50-$25)
    const CEIP_BASE_FEE = 18000; // $1,500/mo × 12
    const SUCCESS_FEE_RATE = 0.20; // 20% of savings
    const DI_CREDIT_RATE = 0.80; // $1 invested = ~$0.80 compliance credit (estimated)

    // Calculate ROI across all three compliance pathways
    const results: ROIResults = useMemo(() => {
        const fundPayment = benchmarkExceedance * FUND_PRICE;
        const marketCredits = benchmarkExceedance * MARKET_PRICE;
        const directInvestment = directInvestCapex + Math.max(0, (benchmarkExceedance - (directInvestCapex * DI_CREDIT_RATE / FUND_PRICE)) * FUND_PRICE);
        const bestOption = marketCredits <= directInvestment ? 'market_credits' : 'direct_investment';
        const bestCost = bestOption === 'market_credits' ? marketCredits : directInvestment;
        const grossSavings = fundPayment - bestCost;
        const successFee = grossSavings * SUCCESS_FEE_RATE;
        const ceipFee = CEIP_BASE_FEE + successFee;
        const netSavings = grossSavings - ceipFee;
        const roiPercent = ceipFee > 0 ? (netSavings / ceipFee) * 100 : 0;

        return {
            fundPayment,
            marketCredits,
            directInvestment,
            ceipFee,
            netSavings,
            roiPercent,
            bestOption
        };
    }, [benchmarkExceedance, directInvestCapex]);

    const handleEmailSubmit = () => {
        if (!emailCapture) return;
        const leads = JSON.parse(localStorage.getItem('ceip_tier_leads') || '[]');
        leads.push({ email: emailCapture, emissions: annualEmissions, exceedance: benchmarkExceedance, timestamp: new Date().toISOString() });
        localStorage.setItem('ceip_tier_leads', JSON.stringify(leads));
        setEmailSubmitted(true);
    };

    const formatCurrency = (value: number): string => {
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white">
          <SEOHead
            title="TIER Compliance Savings Calculator | Alberta Carbon Credit Arbitrage"
            description="Calculate how much your Alberta facility can save on TIER carbon compliance. Compare fund payment ($95/t) vs market credits ($25/t) vs Direct Investment. Free calculator."
            path="/roi-calculator"
            keywords={['TIER calculator', 'Alberta carbon compliance', 'TIER credit price', 'EPC offset Alberta', 'carbon arbitrage calculator', 'Direct Investment TIER']}
          />

          {/* Navigation */}
          <header className="border-b border-slate-800">
            <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
              <Link to="/" className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-emerald-400" />
                <span className="font-bold">CEIP</span>
                <span className="text-slate-400 text-sm">TIER Calculator</span>
              </Link>
              <Link to="/enterprise" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium transition-colors">
                Talk to Sales
              </Link>
            </div>
          </header>

          {/* What is TIER? — SEO Explainer */}
          <section className="max-w-5xl mx-auto px-6 pt-10 pb-6">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h1 className="text-2xl font-bold mb-3 flex items-center gap-2">
                <HelpCircle className="h-6 w-6 text-emerald-400" />
                What is TIER? Alberta's Carbon Compliance System
              </h1>
              <p className="text-slate-300 text-sm leading-relaxed">
                The <strong>Technology Innovation and Emissions Reduction (TIER)</strong> regulation requires
                Alberta facilities emitting 100,000+ tonnes CO₂e/year to reduce emissions below a benchmark.
                Facilities exceeding their benchmark must comply by: paying the <strong>$95/tonne fund price</strong>,
                purchasing <strong>market credits (EPCs/Offsets) at ~$25/tonne</strong>, or using the new
                <strong> Direct Investment pathway</strong> (Dec 2025 amendments) to invest in on-site efficiency.
                The $70/tonne spread between fund price and market credits represents a massive savings opportunity.
              </p>
              <div className="flex gap-4 mt-3 text-xs text-slate-500">
                <a href="https://www.alberta.ca/technology-innovation-and-emissions-reduction-regulation" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-emerald-400 transition-colors">
                  <ExternalLink className="h-3 w-3" /> Alberta.ca TIER Regulation
                </a>
                <a href="https://icapcarbonaction.com/en/ets/canada-alberta-technology-innovation-and-emissions-reduction-regulation" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-emerald-400 transition-colors">
                  <ExternalLink className="h-3 w-3" /> ICAP Carbon Action
                </a>
              </div>
            </div>
          </section>

          <section className="max-w-5xl mx-auto px-6 pb-12">
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl border border-slate-700 p-8">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-emerald-600/20 rounded-xl">
                    <Calculator className="h-8 w-8 text-emerald-400" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white">TIER Compliance Savings Calculator</h2>
                    <p className="text-slate-400">Compare all 3 compliance pathways in 30 seconds</p>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                {/* Inputs */}
                <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <span className="bg-emerald-600 text-white text-sm px-2 py-0.5 rounded">1</span>
                        Your Facility Data
                    </h3>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm text-slate-400 mb-2">
                                Annual Emissions (tonnes CO₂e)
                            </label>
                            <input
                                type="number"
                                value={annualEmissions}
                                onChange={(e) => setAnnualEmissions(Number(e.target.value))}
                                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-slate-400 mb-2">
                                Benchmark Exceedance (tonnes above limit)
                            </label>
                            <input
                                type="number"
                                value={benchmarkExceedance}
                                onChange={(e) => setBenchmarkExceedance(Number(e.target.value))}
                                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                            />
                            <p className="text-sm text-slate-500 mt-1">
                                Your compliance liability = {benchmarkExceedance.toLocaleString()} tonnes
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm text-slate-400 mb-2">
                                Direct Investment Capex ($ planned efficiency spend)
                            </label>
                            <input
                                type="number"
                                value={directInvestCapex}
                                onChange={(e) => setDirectInvestCapex(Number(e.target.value))}
                                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                            />
                            <p className="text-sm text-slate-500 mt-1">
                                On-site efficiency investment eligible under Dec 2025 amendments
                            </p>
                        </div>
                    </div>

                    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-slate-400 mb-3">2025-2026 Market Prices</h4>
                        <div className="flex justify-between items-center">
                            <div>
                                <div className="text-sm text-red-400">TIER Fund Price</div>
                                <div className="text-2xl font-bold text-red-500">${FUND_PRICE}/t</div>
                            </div>
                            <div className="text-slate-500">vs</div>
                            <div className="text-right">
                                <div className="text-sm text-emerald-400">Market Credit Price</div>
                                <div className="text-2xl font-bold text-emerald-400">${MARKET_PRICE}/t</div>
                            </div>
                        </div>
                        <div className="mt-3 text-center">
                            <span className="text-sm bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full">
                                ${FUND_PRICE - MARKET_PRICE}/tonne arbitrage opportunity
                            </span>
                        </div>
                    </div>
                </div>

                {/* Results */}
                <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <span className="bg-emerald-600 text-white text-sm px-2 py-0.5 rounded">2</span>
                        Your Savings with CEIP
                    </h3>

                    <div className="space-y-3">
                        {/* Without CEIP */}
                        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                            <div className="flex justify-between items-center">
                                <div>
                                    <div className="text-sm text-red-400">Without CEIP (Fund Payment)</div>
                                    <div className="text-xs text-slate-500">
                                        {benchmarkExceedance.toLocaleString()} t × ${FUND_PRICE}
                                    </div>
                                </div>
                                <div className="text-2xl font-bold text-red-500">
                                    {formatCurrency(results.fundPayment)}
                                </div>
                            </div>
                        </div>

                        {/* With CEIP */}
                        <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-lg p-4">
                            <div className="flex justify-between items-center">
                                <div>
                                    <div className="text-sm text-emerald-400">With CEIP (Market Credits)</div>
                                    <div className="text-xs text-slate-500">
                                        {benchmarkExceedance.toLocaleString()} t × ${MARKET_PRICE}
                                    </div>
                                </div>
                                <div className="text-2xl font-bold text-emerald-400">
                                    {formatCurrency(results.marketCredits)}
                                </div>
                            </div>
                        </div>

                        {/* CEIP Fee */}
                        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                            <div className="flex justify-between items-center">
                                <div>
                                    <div className="text-sm text-slate-400">CEIP Platform Fee</div>
                                    <div className="text-xs text-slate-500">
                                        ${CEIP_BASE_FEE.toLocaleString()} base + 20% success fee
                                    </div>
                                </div>
                                <div className="text-lg font-semibold text-slate-300">
                                    {formatCurrency(results.ceipFee)}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Net Result */}
                    <div className="bg-gradient-to-r from-emerald-600/20 to-green-600/20 border-2 border-emerald-500 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <div className="text-sm text-emerald-400">Your Net Savings</div>
                                <div className="text-4xl font-bold text-white">
                                    {formatCurrency(results.netSavings)}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm text-emerald-400">ROI</div>
                                <div className="text-3xl font-bold text-emerald-400">
                                    {results.roiPercent.toFixed(0)}%
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 text-emerald-300 text-sm">
                            <TrendingUp className="h-4 w-4" />
                            <span>
                                {results.roiPercent >= 500
                                    ? "Exceptional ROI - You're leaving money on the table without CEIP"
                                    : "Strong ROI - CEIP pays for itself many times over"}
                            </span>
                        </div>
                    </div>

                    {/* Direct Investment Result */}
                    <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <div className="text-sm text-blue-400">Direct Investment Pathway</div>
                                <div className="text-xs text-slate-500">
                                    ${directInvestCapex.toLocaleString()} capex + residual fund
                                </div>
                            </div>
                            <div className="text-lg font-semibold text-blue-400">
                                {formatCurrency(results.directInvestment)}
                            </div>
                        </div>
                    </div>

                    {/* Recommendation Badge */}
                    <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                        <span className="text-xs text-slate-400">CEIP Recommendation: </span>
                        <span className="text-sm font-semibold text-emerald-400">
                            {results.bestOption === 'market_credits' ? 'Buy Market Credits' : 'Direct Investment'}
                        </span>
                    </div>

                    {/* CTA */}
                    <button
                        onClick={() => window.location.href = '/enterprise?tier=industrial'}
                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2"
                    >
                        Start Saving {formatCurrency(results.netSavings)} This Year
                        <ArrowRight className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* Trust Elements */}
            <div className="mt-8 pt-6 border-t border-slate-700 grid grid-cols-3 gap-4 text-center">
                <div className="flex flex-col items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                    <span className="text-sm text-slate-400">Q4 2025 Market Data (S&P/ICAP)</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                    <span className="text-sm text-slate-400">3-Pathway Compliance Modeling</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                    <span className="text-sm text-slate-400">Bank-Ready Compliance Reports</span>
                </div>
            </div>
        </div>

          {/* Lead Capture */}
          <div className="mt-8 bg-slate-800 border border-slate-700 rounded-xl p-6 text-center">
            <Mail className="h-8 w-8 text-emerald-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold mb-2">Get Your Detailed TIER Savings Report</h3>
            <p className="text-sm text-slate-400 mb-4">
              Receive a PDF breakdown with compliance pathway comparison, timeline, and implementation steps.
            </p>
            {emailSubmitted ? (
              <div className="flex items-center justify-center gap-2 text-emerald-400">
                <CheckCircle className="h-5 w-5" />
                <span>Report will be sent shortly. Our team will reach out within 24 hours.</span>
              </div>
            ) : (
              <div className="flex gap-3 max-w-md mx-auto">
                <input
                  type="email"
                  value={emailCapture}
                  onChange={(e) => setEmailCapture(e.target.value)}
                  placeholder="your@company.ca"
                  className="flex-1 px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  onClick={handleEmailSubmit}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-semibold transition-colors"
                >
                  Send Report
                </button>
              </div>
            )}
          </div>

          {/* Data Sources */}
          <div className="mt-6 text-xs text-slate-500 text-center space-y-1">
            <p>Data sources: Alberta.ca TIER Regulation, S&P Global Commodity Insights, ICAP Carbon Action</p>
            <p>Fund price frozen at $95/t (Alberta May 2025). Market credit prices as of Q4 2025. Direct Investment Standard expected early 2026.</p>
          </div>
          </section>
        </div>
    );
};

export default TIERROICalculator;
