/**
 * TIER Scenario Toggle - Carbon Price Modeling Widget
 * 
 * Research Finding: TIER credit price crashed from $95 (headline) to $18-$20 (market)
 * This creates a "dual pricing" reality that must be modeled for accurate compliance forecasting.
 * 
 * Reference: MonetizationResearch_Overall.md §2.1 - "The Pricing Anomaly"
 */

import React, { useState } from 'react';
import { TrendingDown, AlertTriangle, Info, DollarSign, ArrowRight } from 'lucide-react';

interface TIERScenario {
    id: string;
    label: string;
    price: number;
    year: number;
    description: string;
    color: string;
}

const TIER_SCENARIOS: TIERScenario[] = [
    {
        id: 'alberta_fund',
        label: 'TIER Fund Price',
        price: 95,
        year: 2025,
        description: 'Frozen by Alberta government. Pay-to-government compliance option.',
        color: 'text-amber-400'
    },
    {
        id: 'market_reality',
        label: 'Secondary Market',
        price: 20,
        year: 2025,
        description: 'Actual credit trading price. Collapsed due to oversupply.',
        color: 'text-red-400'
    },
    {
        id: 'federal_2026',
        label: 'Federal Backstop',
        price: 110,
        year: 2026,
        description: 'If Alberta system deemed non-equivalent, federal price applies.',
        color: 'text-purple-400'
    },
    {
        id: 'federal_2030',
        label: 'Federal 2030 Target',
        price: 170,
        year: 2030,
        description: 'Legislated federal trajectory if provincial equivalency fails.',
        color: 'text-cyan-400'
    }
];

interface TIERScenarioToggleProps {
    onScenarioChange?: (scenario: TIERScenario) => void;
    emissionsTonnes?: number; // If provided, shows cost calculation
    className?: string;
}

export const TIERScenarioToggle: React.FC<TIERScenarioToggleProps> = ({
    onScenarioChange,
    emissionsTonnes = 0,
    className = ''
}) => {
    const [selectedScenario, setSelectedScenario] = useState(TIER_SCENARIOS[0]);
    const [showExplainer, setShowExplainer] = useState(false);

    const handleScenarioChange = (scenario: TIERScenario) => {
        setSelectedScenario(scenario);
        onScenarioChange?.(scenario);
    };

    const complianceCost = emissionsTonnes * selectedScenario.price;

    return (
        <div className={`bg-slate-800/50 border border-slate-700 rounded-xl p-6 ${className}`}>
            {/* Header with Explainer */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-emerald-400" />
                    <h3 className="text-lg font-bold text-white">TIER Carbon Price Scenario</h3>
                </div>
                <button
                    onClick={() => setShowExplainer(!showExplainer)}
                    className="text-slate-400 hover:text-white transition-colors"
                >
                    <Info className="h-5 w-5" />
                </button>
            </div>

            {/* Explainer Box */}
            {showExplainer && (
                <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4 mb-4 text-sm">
                    <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                        <div className="text-slate-300">
                            <strong className="text-amber-400">Pricing Disconnect:</strong> Alberta froze TIER at $95/tonne
                            but secondary market credits trade at ~$20 due to oversupply. Federal law requires $170 by 2030.
                            Use this toggle to model different compliance scenarios.
                        </div>
                    </div>
                </div>
            )}

            {/* Scenario Buttons */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
                {TIER_SCENARIOS.map((scenario) => (
                    <button
                        key={scenario.id}
                        onClick={() => handleScenarioChange(scenario)}
                        className={`p-3 rounded-lg border-2 transition-all text-left ${selectedScenario.id === scenario.id
                                ? 'border-emerald-500 bg-emerald-500/10'
                                : 'border-slate-700 bg-slate-900/30 hover:border-slate-600'
                            }`}
                    >
                        <div className={`text-xl font-bold ${scenario.color}`}>
                            ${scenario.price}
                        </div>
                        <div className="text-xs text-slate-400">{scenario.label}</div>
                        <div className="text-xs text-slate-500">{scenario.year}</div>
                    </button>
                ))}
            </div>

            {/* Selected Scenario Description */}
            <div className="bg-slate-900/50 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                    <div className={`w-3 h-3 rounded-full ${selectedScenario.id === 'market_reality' ? 'bg-red-500' :
                            selectedScenario.id === 'alberta_fund' ? 'bg-amber-500' :
                                selectedScenario.id === 'federal_2026' ? 'bg-purple-500' : 'bg-cyan-500'
                        }`} />
                    <span className="font-medium text-white">{selectedScenario.label}</span>
                </div>
                <p className="text-sm text-slate-400">{selectedScenario.description}</p>
            </div>

            {/* Cost Calculation (if emissions provided) */}
            {emissionsTonnes > 0 && (
                <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-slate-400 text-sm">Compliance Cost at {selectedScenario.label}</div>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-slate-500">{emissionsTonnes.toLocaleString()} tonnes</span>
                                <span className="text-slate-600">×</span>
                                <span className={selectedScenario.color}>${selectedScenario.price}</span>
                                <ArrowRight className="h-4 w-4 text-slate-600" />
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-bold text-emerald-400">
                                ${complianceCost.toLocaleString()}
                            </div>
                            <div className="text-xs text-slate-500">annual liability</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Market Reality Warning */}
            {selectedScenario.id === 'market_reality' && (
                <div className="mt-4 flex items-start gap-2 text-sm text-red-400">
                    <TrendingDown className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>
                        <strong>Note:</strong> Low market prices make trading less attractive.
                        Consider the Direct Investment Pathway for better returns.
                    </span>
                </div>
            )}
        </div>
    );
};

export default TIERScenarioToggle;
