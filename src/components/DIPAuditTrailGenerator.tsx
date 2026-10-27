/**
 * Draft Direct Investment evidence tracker. Records buyer-supplied project
 * information for later review; it does not assess eligibility or credit value.
 */

import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  Download,
  AlertCircle,
  DollarSign,
  Calendar,
  Building2,
  Leaf,
  ArrowRight,
} from 'lucide-react';
import { getPricingDataQualityWarning, getTIERPricing } from '../lib/tierPricing';

interface DirectInvestment {
  id: string;
  projectName: string;
  category: 'efficiency' | 'renewable' | 'capture' | 'electrification' | 'other';
  capexAmount: number;
  startDate: string;
  completionDate: string;
  expectedEmissionReduction: number; // tonnes CO2e
  description: string;
  eligibilityStatus: 'undetermined';
}

const INVESTMENT_CATEGORIES = [
  { id: 'efficiency', label: 'Energy efficiency (unverified category)', icon: Leaf },
  { id: 'renewable', label: 'Renewable energy (unverified category)', icon: Leaf },
  { id: 'capture', label: 'Carbon capture (unverified category)', icon: Leaf },
  { id: 'electrification', label: 'Electrification (unverified category)', icon: Leaf },
  { id: 'other', label: 'Other (review required)', icon: AlertCircle },
];

const getEvidenceReviewMessage = (investment: Partial<DirectInvestment>): string => {
  if (!investment.category) return 'Add a project category for later review.';
  if (!investment.capexAmount || investment.capexAmount <= 0)
    return 'Add buyer-reported capital cost for later review.';
  if (!investment.expectedEmissionReduction || investment.expectedEmissionReduction <= 0)
    return 'Add a buyer-reported reduction estimate for later review.';
  return 'Eligibility and credit treatment remain undetermined pending the current Alberta Standard and facility-specific review.';
};

export const DIPAuditTrailGenerator: React.FC = () => {
  const tierPricing = getTIERPricing();
  const pricingWarning = getPricingDataQualityWarning(tierPricing);
  const [investments, setInvestments] = useState<DirectInvestment[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newInvestment, setNewInvestment] = useState<Partial<DirectInvestment>>({
    category: 'efficiency',
    startDate: new Date().toISOString().split('T')[0],
  });

  const addInvestment = () => {
    if (!newInvestment.projectName || !newInvestment.capexAmount) return;

    const investment: DirectInvestment = {
      id: `dip-${Date.now()}`,
      projectName: newInvestment.projectName || '',
      category: (newInvestment.category as DirectInvestment['category']) || 'other',
      capexAmount: newInvestment.capexAmount || 0,
      startDate: newInvestment.startDate || '',
      completionDate: newInvestment.completionDate || '',
      expectedEmissionReduction: newInvestment.expectedEmissionReduction || 0,
      description: newInvestment.description || '',
      eligibilityStatus: 'undetermined',
    };

    setInvestments([...investments, investment]);
    setNewInvestment({ category: 'efficiency', startDate: new Date().toISOString().split('T')[0] });
    setShowAddForm(false);
  };

  const removeInvestment = (id: string) => {
    setInvestments(investments.filter((i) => i.id !== id));
  };

  const totalCapex = investments.reduce((sum, i) => sum + i.capexAmount, 0);
  const totalEmissionReduction = investments.reduce(
    (sum, i) => sum + i.expectedEmissionReduction,
    0,
  );
  const potentialCreditValueCad: null = null;

  const generateAuditTrail = () => {
    // In production, this would generate a PDF
    const auditData = {
      generatedAt: new Date().toISOString(),
      facilityId: null as string | null,
      reportingYear: null as number | null,
      totalInvestments: investments.length,
      buyerReportedCapexCad: totalCapex,
      eligibilityStatus: 'UNDETERMINED_REQUIRES_OWNER_AND_REGULATORY_REVIEW',
      eligibleCapexCad: null as number | null,
      buyerReportedExpectedEmissionReductionTonnes: totalEmissionReduction,
      potentialCreditValueCad,
      currentStandardStatus: 'not_verified; verify against current official Alberta TIER materials',
      investments: investments.map((i) => ({
        ...i,
        eligibilityStatus: 'UNDETERMINED_REQUIRES_OWNER_AND_REGULATORY_REVIEW',
        tierReference:
          'https://www.alberta.ca/technology-innovation-and-emissions-reduction-regulation',
      })),
    };

    // Convert to JSON and download (PDF generation would be server-side)
    const blob = new Blob([JSON.stringify(auditData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `direct-investment-draft-review-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
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
                Draft project evidence for later owner and regulatory review
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold text-white transition-all flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Add Project Record
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
              <span className="text-sm text-slate-400">Buyer-reported CapEx</span>
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
              <span className="text-sm text-blue-400">TIER eligibility / value</span>
            </div>
            <div className="text-3xl font-bold text-blue-400">Undetermined</div>
            <div className="text-xs text-blue-400/70 mt-1">
              Current standard and buyer-specific treatment require verification
            </div>
          </div>
        </div>

        {pricingWarning && (
          <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
            {pricingWarning}
          </div>
        )}

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
                    onChange={(e) =>
                      setNewInvestment({ ...newInvestment, projectName: e.target.value })
                    }
                    placeholder="e.g., LED Lighting Retrofit Phase 2"
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">Investment Category *</label>
                  <select
                    value={newInvestment.category}
                    onChange={(e) =>
                      setNewInvestment({
                        ...newInvestment,
                        category: e.target.value as DirectInvestment['category'],
                      })
                    }
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white"
                  >
                    {INVESTMENT_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">
                      Buyer-reported CapEx (CAD) *
                    </label>
                    <input
                      type="number"
                      value={newInvestment.capexAmount || ''}
                      onChange={(e) =>
                        setNewInvestment({ ...newInvestment, capexAmount: Number(e.target.value) })
                      }
                      placeholder="250000"
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">
                      Buyer-estimated emissions reduction (t CO₂e) *
                    </label>
                    <input
                      type="number"
                      value={newInvestment.expectedEmissionReduction || ''}
                      onChange={(e) =>
                        setNewInvestment({
                          ...newInvestment,
                          expectedEmissionReduction: Number(e.target.value),
                        })
                      }
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
                      onChange={(e) =>
                        setNewInvestment({ ...newInvestment, startDate: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Completion Date</label>
                    <input
                      type="date"
                      value={newInvestment.completionDate || ''}
                      onChange={(e) =>
                        setNewInvestment({ ...newInvestment, completionDate: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">Project Description</label>
                  <textarea
                    value={newInvestment.description || ''}
                    onChange={(e) =>
                      setNewInvestment({ ...newInvestment, description: e.target.value })
                    }
                    placeholder="Describe the project and expected outcomes..."
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white resize-none"
                  />
                </div>

                {/* Evidence completeness preview; not an eligibility decision. */}
                {newInvestment.capexAmount && (
                  <div className="p-4 rounded-lg bg-amber-900/20 border border-amber-500/30">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-amber-400" />
                      <span className="text-amber-400">
                        {getEvidenceReviewMessage(newInvestment)}
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
                  Add Project Record
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Investments List */}
        {investments.length > 0 ? (
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden mb-8">
            <div className="p-6 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Project records</h2>
              <button
                onClick={generateAuditTrail}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-medium text-white flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export Draft Review JSON
              </button>
            </div>
            <div className="divide-y divide-slate-700">
              {investments.map((investment) => (
                <div
                  key={investment.id}
                  className="p-6 flex items-center justify-between hover:bg-slate-700/30"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-amber-600/20">
                      <AlertCircle className="h-6 w-6 text-amber-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-medium">{investment.projectName}</h3>
                      <div className="flex items-center gap-4 text-sm text-slate-400">
                        <span className="capitalize">
                          {investment.category.replace('_', ' ')} · eligibility undetermined
                        </span>
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
              Add buyer-reported project details for later owner and regulator review. This tool
              does not determine eligibility.
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold text-white inline-flex items-center gap-2"
            >
              <Plus className="h-5 w-5" />
              Add First Project Record
            </button>
          </div>
        )}

        {/* TIER Compliance Info */}
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-400" />
            Direct Investment status
          </h3>
          <div className="grid md:grid-cols-2 gap-6 text-sm text-slate-300">
            <div>
              <h4 className="font-medium text-white mb-2">Eligibility</h4>
              <p>
                The applicable Direct Investment Standard and facility-specific eligibility have not
                been verified here. Project categories and estimates do not establish eligible
                investments or issued credits.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-white mb-2">Documentation Required</h4>
              <ul className="space-y-1">
                <li>• Project description and clearly labeled buyer estimates</li>
                <li>• Buyer-reported capital costs and source records</li>
                <li>• Project timeline and facility context</li>
                <li>• Current official standard and owner/regulator review</li>
              </ul>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-4">
            Source check:{' '}
            <a
              className="underline"
              href="https://www.alberta.ca/technology-innovation-and-emissions-reduction-regulation"
              target="_blank"
              rel="noreferrer"
            >
              Alberta TIER page
            </a>
            . Confirm the current Standard with Alberta before making eligibility or credit-value
            claims.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DIPAuditTrailGenerator;
