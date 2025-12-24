/**
 * Direct Investment Pathway (DIP) Tracker
 * 
 * Research Finding: 2025 TIER amendments introduced a 4th compliance option:
 * Invest in on-site emissions reduction → Generate "Investment Credits" at 1:1 ratio
 * 
 * This creates a new software category: "Capex-to-Compliance Tracking"
 * Reference: MonetizationResearch_Overall.md §2.2 - "The Direct Investment Pathway"
 */

import React, { useState } from 'react';
import { Plus, Trash2, DollarSign, Zap, Check, AlertCircle, FileText, Calculator } from 'lucide-react';

interface Investment {
    id: string;
    date: string;
    description: string;
    amount: number;
    category: string;
    linkedEmissionsReduction: number;
    status: 'pending' | 'verified' | 'rejected';
}

const ELIGIBLE_CATEGORIES = [
    { value: 'carbon_capture', label: 'Carbon Capture Equipment', icon: '🏭' },
    { value: 'methane_control', label: 'Methane Control Systems', icon: '💨' },
    { value: 'energy_efficiency', label: 'Energy Efficiency Retrofit', icon: '⚡' },
    { value: 'renewable_gen', label: 'On-site Renewable Generation', icon: '☀️' },
    { value: 'electrification', label: 'Process Electrification', icon: '🔌' },
    { value: 'hydrogen_fuel', label: 'Hydrogen Fuel Switching', icon: '💧' }
];

interface DIPTrackerProps {
    tierCreditPrice?: number; // Current TIER fund price
    onTotalChange?: (total: number, credits: number) => void;
}

export const DIPTracker: React.FC<DIPTrackerProps> = ({
    tierCreditPrice = 95,
    onTotalChange
}) => {
    const [investments, setInvestments] = useState<Investment[]>([]);
    const [newInvestment, setNewInvestment] = useState<Partial<Investment>>({
        date: new Date().toISOString().split('T')[0],
        description: '',
        amount: 0,
        category: 'methane_control',
        linkedEmissionsReduction: 0,
        status: 'pending'
    });

    const totalInvestment = investments.reduce((sum, inv) => sum + inv.amount, 0);
    const totalCredits = investments.reduce((sum, inv) => sum + inv.linkedEmissionsReduction, 0);
    const equivalentValue = totalCredits * tierCreditPrice;

    const addInvestment = () => {
        if (!newInvestment.amount || !newInvestment.description) return;

        const investment: Investment = {
            id: Date.now().toString(),
            date: newInvestment.date || new Date().toISOString().split('T')[0],
            description: newInvestment.description || '',
            amount: newInvestment.amount || 0,
            category: newInvestment.category || 'methane_control',
            linkedEmissionsReduction: newInvestment.linkedEmissionsReduction || 0,
            status: 'pending'
        };

        const updated = [...investments, investment];
        setInvestments(updated);
        onTotalChange?.(
            updated.reduce((sum, inv) => sum + inv.amount, 0),
            updated.reduce((sum, inv) => sum + inv.linkedEmissionsReduction, 0)
        );

        // Reset form
        setNewInvestment({
            date: new Date().toISOString().split('T')[0],
            description: '',
            amount: 0,
            category: 'methane_control',
            linkedEmissionsReduction: 0,
            status: 'pending'
        });
    };

    const removeInvestment = (id: string) => {
        const updated = investments.filter(inv => inv.id !== id);
        setInvestments(updated);
        onTotalChange?.(
            updated.reduce((sum, inv) => sum + inv.amount, 0),
            updated.reduce((sum, inv) => sum + inv.linkedEmissionsReduction, 0)
        );
    };

    return (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Calculator className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white">Direct Investment Pathway Tracker</h3>
                    <p className="text-sm text-slate-400">TIER 2025 Amendment: Capex → Compliance Credits</p>
                </div>
            </div>

            {/* Info Banner */}
            <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4 mb-6 text-sm">
                <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 text-purple-400 flex-shrink-0 mt-0.5" />
                    <div className="text-slate-300">
                        <strong className="text-purple-400">How it works:</strong> Investments in eligible emissions reduction
                        equipment (made after Jan 1, 2025) generate Investment Credits at a <strong>1:1 ratio</strong>
                        ($1 invested = 1 tonne CO₂e credit). These credits can be used for TIER compliance or to
                        "reactivate" expired credits.
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid md:grid-cols-3 gap-4 mb-6">
                <div className="bg-slate-900/50 rounded-lg p-4">
                    <div className="text-slate-400 text-sm mb-1">Total Investment</div>
                    <div className="text-2xl font-bold text-white">
                        ${totalInvestment.toLocaleString()}
                    </div>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-4">
                    <div className="text-slate-400 text-sm mb-1">Investment Credits</div>
                    <div className="text-2xl font-bold text-purple-400">
                        {totalCredits.toLocaleString()} <span className="text-sm text-slate-500">tonnes</span>
                    </div>
                </div>
                <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-lg p-4">
                    <div className="text-slate-400 text-sm mb-1">Equivalent TIER Value</div>
                    <div className="text-2xl font-bold text-emerald-400">
                        ${equivalentValue.toLocaleString()}
                    </div>
                    <div className="text-xs text-slate-500">at ${tierCreditPrice}/tonne</div>
                </div>
            </div>

            {/* Add Investment Form */}
            <div className="bg-slate-900/50 rounded-lg p-4 mb-6">
                <h4 className="text-sm font-medium text-white mb-4">Add TIER-Eligible Investment</h4>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Investment Date</label>
                        <input
                            type="date"
                            value={newInvestment.date}
                            onChange={(e) => setNewInvestment({ ...newInvestment, date: e.target.value })}
                            min="2025-01-01"
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Category</label>
                        <select
                            value={newInvestment.category}
                            onChange={(e) => setNewInvestment({ ...newInvestment, category: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm"
                        >
                            {ELIGIBLE_CATEGORIES.map((cat) => (
                                <option key={cat.value} value={cat.value}>
                                    {cat.icon} {cat.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="mb-4">
                    <label className="block text-xs text-slate-400 mb-1">Description</label>
                    <input
                        type="text"
                        value={newInvestment.description}
                        onChange={(e) => setNewInvestment({ ...newInvestment, description: e.target.value })}
                        placeholder="e.g., Vertical gas collection wells - Phase 1"
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm"
                    />
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Investment Amount (CAD)</label>
                        <input
                            type="number"
                            value={newInvestment.amount || ''}
                            onChange={(e) => setNewInvestment({ ...newInvestment, amount: Number(e.target.value) })}
                            placeholder="150000"
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Linked Emissions Reduction (tonnes CO₂e)</label>
                        <input
                            type="number"
                            value={newInvestment.linkedEmissionsReduction || ''}
                            onChange={(e) => setNewInvestment({ ...newInvestment, linkedEmissionsReduction: Number(e.target.value) })}
                            placeholder="1500"
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm"
                        />
                    </div>
                </div>

                <button
                    onClick={addInvestment}
                    disabled={!newInvestment.amount || !newInvestment.description}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg text-sm transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    Add Investment
                </button>
            </div>

            {/* Investment List */}
            {investments.length > 0 && (
                <div>
                    <h4 className="text-sm font-medium text-white mb-3">Tracked Investments</h4>
                    <div className="space-y-2">
                        {investments.map((inv) => {
                            const category = ELIGIBLE_CATEGORIES.find(c => c.value === inv.category);
                            return (
                                <div
                                    key={inv.id}
                                    className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-700"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl">{category?.icon || '📋'}</span>
                                        <div>
                                            <div className="text-white text-sm font-medium">{inv.description}</div>
                                            <div className="text-xs text-slate-500">
                                                {inv.date} • {category?.label}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <div className="text-white font-medium">${inv.amount.toLocaleString()}</div>
                                            <div className="text-xs text-purple-400">{inv.linkedEmissionsReduction} tonnes</div>
                                        </div>
                                        <div className={`p-1 rounded ${inv.status === 'verified' ? 'bg-emerald-500/20' :
                                                inv.status === 'rejected' ? 'bg-red-500/20' : 'bg-amber-500/20'
                                            }`}>
                                            {inv.status === 'verified' ? (
                                                <Check className="h-4 w-4 text-emerald-400" />
                                            ) : inv.status === 'rejected' ? (
                                                <AlertCircle className="h-4 w-4 text-red-400" />
                                            ) : (
                                                <Zap className="h-4 w-4 text-amber-400" />
                                            )}
                                        </div>
                                        <button
                                            onClick={() => removeInvestment(inv.id)}
                                            className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DIPTracker;
