/**
 * Energy Trader Simulation
 * 
 * Professional gamification - simulate high-stakes grid trading decisions.
 * Based on real crisis scenarios (Jan 2024 Alberta grid emergency).
 */

import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
    TrendingUp, ArrowLeft, AlertTriangle, DollarSign,
    ChevronRight, RefreshCw
} from 'lucide-react';

interface WhopMiniUser {
    id: string;
    tier: 'free' | 'basic' | 'pro';
    isWhopUser: boolean;
}

interface Scenario {
    id: string;
    title: string;
    context: string;
    situation: string;
    options: {
        text: string;
        result: number; // Profit/loss in $
        explanation: string;
    }[];
}

// Real scenarios based on Alberta grid events
const SCENARIOS: Scenario[] = [
    {
        id: 'cold-snap-2024',
        title: 'January 2024 Cold Snap',
        context: 'Temperature: -35°C. Grid demand is surging. Wind generation has dropped to 5% of capacity.',
        situation: 'Pool price is currently $450/MWh. Weather forecasts show the cold continuing for 48 hours. Gas peakers are coming online but some units have failed to start.',
        options: [
            {
                text: 'Buy forward contracts at $500/MWh immediately',
                result: 2500,
                explanation: 'Smart move! Pool prices hit $999/MWh cap later that day. Your locked-in rate saved you $499/MWh × 5 MWh = $2,495.'
            },
            {
                text: 'Wait for spot market - prices might drop',
                result: -4995,
                explanation: 'Risky bet that didn\'t pay off. Pool prices hit the $999 cap within hours. You paid $549/MWh more than the forward contract option.'
            },
            {
                text: 'Reduce load by 50% and ride it out',
                result: 1200,
                explanation: 'Conservative approach. You avoided peak prices but also lost 50% of your production. Net savings from avoided energy costs: $1,200.'
            }
        ]
    },
    {
        id: 'wind-surge-summer',
        title: 'Summer Wind Surge',
        context: 'It\'s 2 AM on a mild August night. Wind generation is at 95% capacity across Alberta.',
        situation: 'Pool price has dropped to $0/MWh and is going negative. Your industrial facility typically runs 24/7.',
        options: [
            {
                text: 'Increase production to maximum - free electricity!',
                result: 3000,
                explanation: 'Excellent timing! You ran at 150% capacity during negative pricing hours, essentially getting paid to consume. Profit: $3,000.'
            },
            {
                text: 'Maintain normal operations',
                result: 500,
                explanation: 'You saved on your normal electricity costs but missed the opportunity to profit from negative prices.'
            },
            {
                text: 'Reduce operations (night shift off)',
                result: -1500,
                explanation: 'Wrong direction! You reduced consumption during the cheapest hours. Opportunity cost: $1,500.'
            }
        ]
    },
    {
        id: 'grid-alert-afternoon',
        title: 'Grid Alert: Peak Demand',
        context: 'It\'s 5 PM on a hot summer day. Air conditioning load is at maximum across the province.',
        situation: 'AESO has just issued a Grid Alert. Pool price is $750/MWh and climbing. Your facility has 2 MW of interruptible load.',
        options: [
            {
                text: 'Curtail interruptible load immediately',
                result: 1500,
                explanation: 'Quick response! You avoided $750/MWh × 2 MW for 1 hour = $1,500 in energy costs. AESO may also provide demand response payments.'
            },
            {
                text: 'Wait 30 minutes to see if prices stabilize',
                result: -500,
                explanation: 'Prices hit $999 within 15 minutes. Your delayed response cost you an extra $500 before you could react.'
            },
            {
                text: 'Ignore the alert - production is priority',
                result: -2000,
                explanation: 'Expensive decision. You paid peak prices for the entire alert period. Total extra cost: $2,000.'
            }
        ]
    },
    {
        id: 'tier-compliance',
        title: 'TIER Compliance Decision',
        context: 'It\'s Q4 and you need to settle your TIER compliance obligation. Your facility emitted 50,000 tonnes above benchmark.',
        situation: 'Current TIER credit price: $80/tonne. Carbon offset price: $65/tonne. You can also invest $3M in on-site emissions reduction (Direct Investment Credit).',
        options: [
            {
                text: 'Buy TIER credits at $80/tonne',
                result: -4000000,
                explanation: 'Standard approach. Total cost: 50,000 × $80 = $4,000,000. Straightforward but expensive.'
            },
            {
                text: 'Purchase carbon offsets at $65/tonne',
                result: -3250000,
                explanation: 'Good savings! Total cost: 50,000 × $65 = $3,250,000. You saved $750,000 vs TIER credits.'
            },
            {
                text: 'Invest $3M in Direct Investment Credits',
                result: -2500000,
                explanation: 'Best long-term option! The $3M investment generates credits for multiple years AND reduces future emissions. Effective cost: $2,500,000 over 5 years.'
            }
        ]
    }
];

export default function EnergyTrader({ user }: { user: WhopMiniUser | null }) {
    const [currentScenarioIndex, setCurrentScenarioIndex] = useState(0);
    const [virtualCapital, setVirtualCapital] = useState(100000); // $100k starting capital
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [showResult, setShowResult] = useState(false);
    const [completedScenarios, setCompletedScenarios] = useState<string[]>([]);
    const [gameComplete, setGameComplete] = useState(false);

    const currentScenario = SCENARIOS[currentScenarioIndex];
    const selectedChoice = selectedOption !== null ? currentScenario.options[selectedOption] : null;

    const handleSelectOption = (index: number) => {
        if (showResult) return;

        setSelectedOption(index);
        setShowResult(true);

        const result = currentScenario.options[index].result;
        setVirtualCapital(prev => prev + result);
        setCompletedScenarios(prev => [...prev, currentScenario.id]);
    };

    const handleNext = () => {
        if (currentScenarioIndex < SCENARIOS.length - 1) {
            setCurrentScenarioIndex(currentScenarioIndex + 1);
            setSelectedOption(null);
            setShowResult(false);
        } else {
            setGameComplete(true);
        }
    };

    const handleRestart = () => {
        setCurrentScenarioIndex(0);
        setVirtualCapital(100000);
        setSelectedOption(null);
        setShowResult(false);
        setCompletedScenarios([]);
        setGameComplete(false);
    };

    const profitLoss = virtualCapital - 100000;
    const profitLossPercent = ((virtualCapital - 100000) / 100000 * 100).toFixed(1);

    if (gameComplete) {
        const isProfitable = profitLoss > 0;
        return (
            <div className="min-h-screen bg-slate-900">
                <div className="max-w-2xl mx-auto px-4 py-8">
                    <div className="text-center mb-8">
                        <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-4 ${isProfitable ? 'bg-green-500/20' : 'bg-red-500/20'
                            }`}>
                            <DollarSign className={`w-12 h-12 ${isProfitable ? 'text-green-400' : 'text-red-400'}`} />
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-2">
                            Trading Session Complete
                        </h1>
                    </div>

                    {/* Final Results */}
                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
                        <div className="text-center">
                            <div className="text-slate-400 mb-2">Final Portfolio Value</div>
                            <div className="text-4xl font-bold text-white mb-4">
                                ${virtualCapital.toLocaleString()}
                            </div>
                            <div className={`text-2xl font-semibold ${isProfitable ? 'text-green-400' : 'text-red-400'}`}>
                                {isProfitable ? '+' : ''}{profitLossPercent}% ({isProfitable ? '+' : ''}${profitLoss.toLocaleString()})
                            </div>
                        </div>
                    </div>

                    {/* Performance Summary */}
                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
                        <h3 className="text-lg font-semibold text-white mb-4">What This Means</h3>
                        <p className="text-slate-300">
                            {isProfitable
                                ? 'You demonstrated strong understanding of Alberta\'s energy market dynamics. Your decisions protected against price spikes and captured value from market opportunities.'
                                : 'Energy trading is challenging! The scenarios you faced are real situations that catch many operators off-guard. Consider studying grid dynamics and demand response strategies.'
                            }
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="space-y-4">
                        <button
                            onClick={handleRestart}
                            className="w-full flex items-center justify-center gap-2 bg-cyan-500 text-white 
                         font-semibold py-4 rounded-lg hover:bg-cyan-600 transition-colors"
                        >
                            <RefreshCw className="w-5 h-5" />
                            Trade Again
                        </button>

                        <div className="bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-purple-500/30 
                            rounded-xl p-6 text-center">
                            <h3 className="text-lg font-semibold text-white mb-2">
                                Master Energy Markets
                            </h3>
                            <p className="text-slate-400 mb-4">
                                Upgrade to access advanced scenarios, real-time market data, and TIER compliance simulations.
                            </p>
                            <a
                                href="https://whop.com/canada-energy/?plan=pro"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center bg-purple-500 text-white font-semibold px-6 py-3 
                           rounded-lg hover:bg-purple-600 transition-colors"
                            >
                                Unlock Pro Trading
                                <ChevronRight className="w-4 h-4 ml-2" />
                            </a>
                        </div>

                        <Link
                            to="/whop-mini"
                            className="block w-full text-center border border-slate-600 text-slate-300 font-medium 
                         py-3 rounded-lg hover:bg-slate-800 transition-colors"
                        >
                            Back to Academy
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900">
            {/* Header */}
            <div className="bg-slate-800 border-b border-slate-700">
                <div className="max-w-2xl mx-auto px-4 py-4">
                    <Link to="/whop-mini" className="inline-flex items-center text-slate-400 hover:text-white mb-4">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Academy
                    </Link>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                                <TrendingUp className="w-5 h-5 text-purple-400" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white">Energy Trader</h1>
                                <p className="text-slate-400 text-sm">Scenario {currentScenarioIndex + 1} of {SCENARIOS.length}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-slate-400 text-sm">Virtual Capital</div>
                            <div className={`text-lg font-bold ${virtualCapital >= 100000 ? 'text-green-400' : 'text-red-400'}`}>
                                ${virtualCapital.toLocaleString()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Scenario */}
            <div className="max-w-2xl mx-auto px-4 py-8">
                {/* Scenario Title */}
                <div className="bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-purple-500/30 
                        rounded-xl p-6 mb-6">
                    <h2 className="text-2xl font-bold text-white mb-3">{currentScenario.title}</h2>
                    <p className="text-slate-300 mb-4">{currentScenario.context}</p>
                    <div className="flex items-start gap-2 bg-slate-800/50 rounded-lg p-4">
                        <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                        <p className="text-white">{currentScenario.situation}</p>
                    </div>
                </div>

                {/* Options */}
                <h3 className="text-lg font-semibold text-white mb-4">What do you do?</h3>
                <div className="space-y-3 mb-6">
                    {currentScenario.options.map((option, index) => {
                        const isSelected = selectedOption === index;
                        let bgClass = 'bg-slate-800/50 border-slate-700 hover:border-purple-500';

                        if (showResult && isSelected) {
                            bgClass = option.result > 0
                                ? 'bg-green-500/10 border-green-500'
                                : 'bg-red-500/10 border-red-500';
                        }

                        return (
                            <button
                                key={index}
                                onClick={() => handleSelectOption(index)}
                                disabled={showResult}
                                className={`w-full text-left p-4 rounded-lg border transition-all ${bgClass} 
                           disabled:cursor-not-allowed`}
                            >
                                <span className="text-white">{option.text}</span>
                                {showResult && isSelected && (
                                    <div className={`mt-2 font-semibold ${option.result > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {option.result > 0 ? '+' : ''}${option.result.toLocaleString()}
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Result Explanation */}
                {showResult && selectedChoice && (
                    <div className={`rounded-lg p-4 mb-6 ${selectedChoice.result > 0
                            ? 'bg-green-500/10 border border-green-500/30'
                            : 'bg-red-500/10 border border-red-500/30'
                        }`}>
                        <p className={`font-medium mb-2 ${selectedChoice.result > 0 ? 'text-green-300' : 'text-red-300'}`}>
                            {selectedChoice.result > 0 ? '📈 Profitable Decision' : '📉 Loss Incurred'}
                        </p>
                        <p className="text-slate-300">{selectedChoice.explanation}</p>
                    </div>
                )}

                {/* Next Button */}
                {showResult && (
                    <button
                        onClick={handleNext}
                        className="w-full bg-purple-500 text-white font-semibold py-4 rounded-lg 
                       hover:bg-purple-600 transition-colors"
                    >
                        {currentScenarioIndex < SCENARIOS.length - 1 ? 'Next Scenario' : 'See Final Results'}
                    </button>
                )}
            </div>
        </div>
    );
}
