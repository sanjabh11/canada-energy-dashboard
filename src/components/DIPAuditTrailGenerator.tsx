/**
 * DIP Audit Trail Generator (M2)
 * Based on Value Proposition Research Dec 2025
 * 
 * Purpose: Automate Direct Investment Pathway compliance documentation
 * - Tags CapEx spend as "eligible investment projects"
 * - Generates TIER-compliant audit trail PDFs
 * - First-mover advantage: No competitor offers this
 */

import React, { useState } from 'react';
import {
    FileText,
    Plus,
    Trash2,
    Download,
    CheckCircle,
    AlertCircle,
    DollarSign,
    Calendar,
    Building2,
    Leaf,
    ArrowRight
} from 'lucide-react';

interface DirectInvestment {
    id: string;
    projectName: string;
    category: 'efficiency' | 'renewable' | 'capture' | 'electrification' | 'other';
    capexAmount: number;
    startDate: string;
    completionDate: string;
    expectedEmissionReduction: number; // tonnes CO2e
    description: string;
    isEligible: boolean;
}

const INVESTMENT_CATEGORIES = [
    { id: 'efficiency', label: 'Energy Efficiency', icon: Leaf, eligible: true },
    { id: 'renewable', label: 'Renewable Energy', icon: Leaf, eligible: true },
    { id: 'capture', label: 'Carbon Capture', icon: Leaf, eligible: true },
    { id: 'electrification', label: 'Electrification', icon: Leaf, eligible: true },
    { id: 'other', label: 'Other (Review Required)', icon: AlertCircle, eligible: false },
];

// TIER eligibility rules per Dec 2025 amendments
const checkEligibility = (investment: Partial<DirectInvestment>): { eligible: boolean; reason: string } => {
    if (!investment.category) return { eligible: false, reason: 'Category required' };
    if (!investment.capexAmount || investment.capexAmount < 10000) {
        return { eligible: false, reason: 'Minimum CapEx of $10,000 required' };
    }
    if (!investment.expectedEmissionReduction || investment.expectedEmissionReduction < 1) {
        return { eligible: false, reason: 'Must demonstrate emission reduction' };
    }
    if (investment.category === 'other') {
        return { eligible: false, reason: 'Category requires manual review by Alberta Environment' };
    }
    return { eligible: true, reason: 'Appears eligible under TIER 2025 Direct Investment provisions' };
};

export const DIPAuditTrailGenerator: React.FC = () => {
    const [investments, setInvestments] = useState<DirectInvestment[]>([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newInvestment, setNewInvestment] = useState<Partial<DirectInvestment>>({
        category: 'efficiency',
        startDate: new Date().toISOString().split('T')[0],
    });

    const addInvestment = () => {
        if (!newInvestment.projectName || !newInvestment.capexAmount) return;

        const eligibility = checkEligibility(newInvestment);
        const investment: DirectInvestment = {
            id: `dip-${Date.now()}`,
            projectName: newInvestment.projectName || '',
            category: newInvestment.category as DirectInvestment['category'] || 'other',
            capexAmount: newInvestment.capexAmount || 0,
            startDate: newInvestment.startDate || '',
            completionDate: newInvestment.completionDate || '',
            expectedEmissionReduction: newInvestment.expectedEmissionReduction || 0,
            description: newInvestment.description || '',
            isEligible: eligibility.eligible,
        };

        setInvestments([...investments, investment]);
        setNewInvestment({ category: 'efficiency', startDate: new Date().toISOString().split('T')[0] });
        setShowAddForm(false);
    };

    const removeInvestment = (id: string) => {
        setInvestments(investments.filter(i => i.id !== id));
    };

    const totalCapex = investments.reduce((sum, i) => sum + i.capexAmount, 0);
    const totalEmissionReduction = investments.reduce((sum, i) => sum + i.expectedEmissionReduction, 0);
    const eligibleInvestments = investments.filter(i => i.isEligible);
    const eligibleCapex = eligibleInvestments.reduce((sum, i) => sum + i.capexAmount, 0);

    // TIER credit value calculation
    const TIER_FUND_PRICE = 95; // $/tonne
    const potentialCreditValue = totalEmissionReduction * TIER_FUND_PRICE;

    const generateAuditTrail = () => {
        // In production, this would generate a PDF
        const auditData = {
            generatedAt: new Date().toISOString(),
            facilityId: 'FACILITY-001', // Would come from user profile
            reportingYear: 2025,
            totalInvestments: investments.length,
            eligibleInvestments: eligibleInvestments.length,
            totalCapex,
            eligibleCapex,
            totalEmissionReduction,
            potentialCreditValue,
            investments: investments.map(i => ({
                ...i,
                eligibilityStatus: i.isEligible ? 'ELIGIBLE' : 'REQUIRES_REVIEW',
                tierReference: 'TIER 2025 Amendment Section 4.2 - Direct Investment Pathway'
            }))
        };

        // Convert to JSON and download (PDF generation would be server-side)
        const blob = new Blob([JSON.stringify(auditData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `DIP-Audit-Trail-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const formatCurrency = (value: number): string => {
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD',
            minimumFractionDigits: 0
        }).format(value);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-blue-600/20 rounded-2xl">
                            <FileText className="h-10 w-10 text-blue-400" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-white">Direct Investment Pathway</h1>
                            <p className="text-slate-400 text-lg">
                                TIER 2025 Compliance Audit Trail Generator
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold text-white transition-all flex items-center gap-2"
                    >
                        <Plus className="h-5 w-5" />
                        Add Investment
                    </button>
                </div>

                {/* Summary Cards */}
                <div className="grid md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-2">
                            <Building2 className="h-5 w-5 text-slate-400" />
                            <span className="text-sm text-slate-400">Total Investments</span>
                        </div>
                        <div className="text-3xl font-bold text-white">{investments.length}</div>
                    </div>

                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-2">
                            <DollarSign className="h-5 w-5 text-slate-400" />
                            <span className="text-sm text-slate-400">Total CapEx</span>
                        </div>
                        <div className="text-3xl font-bold text-white">{formatCurrency(totalCapex)}</div>
                    </div>

                    <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-2">
                            <Leaf className="h-5 w-5 text-emerald-400" />
                            <span className="text-sm text-emerald-400">Emission Reduction</span>
                        </div>
                        <div className="text-3xl font-bold text-emerald-400">
                            {totalEmissionReduction.toLocaleString()} t
                        </div>
                    </div>

                    <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-2">
                            <DollarSign className="h-5 w-5 text-blue-400" />
                            <span className="text-sm text-blue-400">TIER Credit Value</span>
                        </div>
                        <div className="text-3xl font-bold text-blue-400">
                            {formatCurrency(potentialCreditValue)}
                        </div>
                        <div className="text-xs text-blue-400/70 mt-1">@ $95/tonne fund price</div>
                    </div>
                </div>

                {/* Add Investment Form Modal */}
                {showAddForm && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
                            <h2 className="text-xl font-bold text-white mb-6">Add Direct Investment</h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm text-slate-400 mb-2">Project Name *</label>
                                    <input
                                        type="text"
                                        value={newInvestment.projectName || ''}
                                        onChange={(e) => setNewInvestment({ ...newInvestment, projectName: e.target.value })}
                                        placeholder="e.g., LED Lighting Retrofit Phase 2"
                                        className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-slate-400 mb-2">Investment Category *</label>
                                    <select
                                        value={newInvestment.category}
                                        onChange={(e) => setNewInvestment({ ...newInvestment, category: e.target.value as DirectInvestment['category'] })}
                                        className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white"
                                    >
                                        {INVESTMENT_CATEGORIES.map(cat => (
                                            <option key={cat.id} value={cat.id}>
                                                {cat.label} {cat.eligible ? '✓' : '⚠'}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-slate-400 mb-2">CapEx Amount ($) *</label>
                                        <input
                                            type="number"
                                            value={newInvestment.capexAmount || ''}
                                            onChange={(e) => setNewInvestment({ ...newInvestment, capexAmount: Number(e.target.value) })}
                                            placeholder="250000"
                                            className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-slate-400 mb-2">Emission Reduction (t CO₂e) *</label>
                                        <input
                                            type="number"
                                            value={newInvestment.expectedEmissionReduction || ''}
                                            onChange={(e) => setNewInvestment({ ...newInvestment, expectedEmissionReduction: Number(e.target.value) })}
                                            placeholder="500"
                                            className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-slate-400 mb-2">Start Date</label>
                                        <input
                                            type="date"
                                            value={newInvestment.startDate || ''}
                                            onChange={(e) => setNewInvestment({ ...newInvestment, startDate: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-slate-400 mb-2">Completion Date</label>
                                        <input
                                            type="date"
                                            value={newInvestment.completionDate || ''}
                                            onChange={(e) => setNewInvestment({ ...newInvestment, completionDate: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm text-slate-400 mb-2">Project Description</label>
                                    <textarea
                                        value={newInvestment.description || ''}
                                        onChange={(e) => setNewInvestment({ ...newInvestment, description: e.target.value })}
                                        placeholder="Describe the project and expected outcomes..."
                                        rows={3}
                                        className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white resize-none"
                                    />
                                </div>

                                {/* Eligibility Preview */}
                                {newInvestment.capexAmount && (
                                    <div className={`p-4 rounded-lg ${checkEligibility(newInvestment).eligible
                                            ? 'bg-emerald-900/20 border border-emerald-500/30'
                                            : 'bg-amber-900/20 border border-amber-500/30'
                                        }`}>
                                        <div className="flex items-center gap-2">
                                            {checkEligibility(newInvestment).eligible ? (
                                                <CheckCircle className="h-5 w-5 text-emerald-400" />
                                            ) : (
                                                <AlertCircle className="h-5 w-5 text-amber-400" />
                                            )}
                                            <span className={checkEligibility(newInvestment).eligible ? 'text-emerald-400' : 'text-amber-400'}>
                                                {checkEligibility(newInvestment).reason}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-4 mt-6">
                                <button
                                    onClick={() => setShowAddForm(false)}
                                    className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={addInvestment}
                                    disabled={!newInvestment.projectName || !newInvestment.capexAmount}
                                    className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed rounded-lg font-semibold text-white"
                                >
                                    Add Investment
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Investments List */}
                {investments.length > 0 ? (
                    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden mb-8">
                        <div className="p-6 border-b border-slate-700 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-white">Investment Portfolio</h2>
                            <button
                                onClick={generateAuditTrail}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-medium text-white flex items-center gap-2"
                            >
                                <Download className="h-4 w-4" />
                                Generate Audit Trail
                            </button>
                        </div>
                        <div className="divide-y divide-slate-700">
                            {investments.map((investment) => (
                                <div key={investment.id} className="p-6 flex items-center justify-between hover:bg-slate-700/30">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-lg ${investment.isEligible ? 'bg-emerald-600/20' : 'bg-amber-600/20'
                                            }`}>
                                            {investment.isEligible ? (
                                                <CheckCircle className="h-6 w-6 text-emerald-400" />
                                            ) : (
                                                <AlertCircle className="h-6 w-6 text-amber-400" />
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="text-white font-medium">{investment.projectName}</h3>
                                            <div className="flex items-center gap-4 text-sm text-slate-400">
                                                <span className="capitalize">{investment.category.replace('_', ' ')}</span>
                                                <span>•</span>
                                                <span>{formatCurrency(investment.capexAmount)}</span>
                                                <span>•</span>
                                                <span>{investment.expectedEmissionReduction} t CO₂e</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => removeInvestment(investment.id)}
                                        className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                                    >
                                        <Trash2 className="h-5 w-5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-12 text-center mb-8">
                        <Building2 className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-white mb-2">No Investments Added</h3>
                        <p className="text-slate-400 mb-6">
                            Add your Direct Investment projects to generate a TIER-compliant audit trail.
                        </p>
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold text-white inline-flex items-center gap-2"
                        >
                            <Plus className="h-5 w-5" />
                            Add First Investment
                        </button>
                    </div>
                )}

                {/* TIER Compliance Info */}
                <div className="bg-blue-900/20 border border-blue-500/30 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-400" />
                        About Direct Investment Pathway (Dec 2025 Amendment)
                    </h3>
                    <div className="grid md:grid-cols-2 gap-6 text-sm text-slate-300">
                        <div>
                            <h4 className="font-medium text-white mb-2">What Qualifies?</h4>
                            <ul className="space-y-1">
                                <li>• Energy efficiency upgrades (lighting, HVAC, insulation)</li>
                                <li>• Renewable energy installations (solar, wind, geothermal)</li>
                                <li>• Carbon capture and storage equipment</li>
                                <li>• Electrification projects (replacing fossil fuel equipment)</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-medium text-white mb-2">Documentation Required</h4>
                            <ul className="space-y-1">
                                <li>• Project description and expected emission reduction</li>
                                <li>• CapEx invoices and proof of payment</li>
                                <li>• Timeline (start and completion dates)</li>
                                <li>• Third-party verification (for projects &gt;$1M)</li>
                            </ul>
                        </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-4">
                        Reference: TIER 2025 Amendment Section 4.2 - Dentons Legal Analysis (Dec 11, 2025)
                    </p>
                </div>
            </div>
        </div>
    );
};

export default DIPAuditTrailGenerator;
