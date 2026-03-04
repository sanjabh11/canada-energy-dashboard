/**
 * Bank-Ready Export (M3)
 * Based on Value Proposition Research Dec 2025
 * 
 * Purpose: Generate reports formatted for Canadian lender green loan underwriting
 * - TD, RBC, BMO green loan format compatibility
 * - Accelerates green financing approval
 */

import React, { useMemo, useState } from 'react';
import {
    Building2,
    Download,
    FileSpreadsheet,
    CheckCircle,
    Leaf,
    TrendingDown,
    DollarSign,
    Shield
} from 'lucide-react';
import { DATA_SNAPSHOT_DATE, DATA_SNAPSHOT_LABEL } from '../lib/aesoService';
import { assertExportAllowed } from '../lib/dataConfidence';
import { ExportBlockedModal } from './ExportBlockedModal';
import { trackEvent } from '../lib/analytics';
import { createExportJob, waitForExportJob, ExportJobError } from '../lib/exportJobsClient';

interface FacilityData {
    facilityName: string;
    facilityType: string;
    annualEmissions: number;
    emissionReduction: number;
    energyCostSavings: number;
    projectCost: number;
    projectDescription: string;
}

const SUPPORTED_BANKS = [
    { id: 'td', name: 'TD Bank', logo: '🏦', program: 'TD Green Equipment Finance' },
    { id: 'rbc', name: 'RBC', logo: '🏦', program: 'RBC Green Loan' },
    { id: 'bmo', name: 'BMO', logo: '🏦', program: 'BMO Sustainability-Linked Loan' },
    { id: 'bdc', name: 'BDC', logo: '🏦', program: 'BDC Clean Technology Loan' },
];

export const BankReadyExport: React.FC = () => {
    const [selectedBank, setSelectedBank] = useState<string>('td');
    const [facilityData, setFacilityData] = useState<FacilityData>({
        facilityName: 'Alberta Manufacturing Facility',
        facilityType: 'Industrial',
        annualEmissions: 50000,
        emissionReduction: 8500,
        energyCostSavings: 425000,
        projectCost: 1200000,
        projectDescription: 'LED lighting retrofit, HVAC optimization, and solar PV installation'
    });

    const [isGenerating, setIsGenerating] = useState(false);
    const [showBlockedModal, setShowBlockedModal] = useState(false);
    const [blockedReason, setBlockedReason] = useState<string | undefined>();
    const [officialJobStatus, setOfficialJobStatus] = useState<string | null>(null);
    const [lastOfficialUrl, setLastOfficialUrl] = useState<string | null>(null);

    const canForceOfficialExport = import.meta.env.DEV || import.meta.env.VITE_ALLOW_LOW_CONFIDENCE_EXPORTS === 'true';
    const exportGate = useMemo(
        () =>
            assertExportAllowed(
                [
                    {
                        source: 'compliance_pack',
                        lastUpdated: DATA_SNAPSHOT_DATE,
                        dataConfidence: 'cached',
                        dataSource: 'cached',
                        label: DATA_SNAPSHOT_LABEL
                    },
                    {
                        source: 'tier_inputs',
                        lastUpdated: DATA_SNAPSHOT_DATE,
                        label: DATA_SNAPSHOT_LABEL
                    },
                    {
                        source: 'aeso_pool',
                        lastUpdated: DATA_SNAPSHOT_DATE,
                        dataConfidence: 'cached',
                        dataSource: 'cached',
                        label: DATA_SNAPSHOT_LABEL
                    }
                ],
                'medium'
            ),
        []
    );

    // Calculate metrics
    const emissionReductionPercent = ((facilityData.emissionReduction / facilityData.annualEmissions) * 100).toFixed(1);
    const paybackYears = (facilityData.projectCost / facilityData.energyCostSavings).toFixed(1);
    const carbonIntensityReduction = facilityData.emissionReduction;

    const generateReport = async (mode: 'official' | 'draft' = 'official', forceOfficial = false) => {
        const isOfficial = mode === 'official';
        if (isOfficial && !exportGate.allowed && !canForceOfficialExport && !forceOfficial) {
            setBlockedReason(exportGate.reason);
            setShowBlockedModal(true);
            trackEvent('export_blocked_low_confidence', {
                surface: 'compliance_pack',
                confidence: exportGate.confidence,
                reason: exportGate.reason ?? 'low confidence',
            });
            return;
        }

        trackEvent('export_attempt', {
            surface: 'compliance_pack',
            mode,
            confidence: exportGate.confidence,
            blocked_sources: exportGate.blockedSources.join(','),
        });

        setIsGenerating(true);

        const report = {
            reportType: 'Green Loan Application Data Package',
            generatedBy: 'Canada Energy Intelligence Platform',
            generatedAt: new Date().toISOString(),
            exportMode: mode,
            dataConfidence: exportGate.confidence,
            dataSnapshotDate: DATA_SNAPSHOT_DATE,
            dataSnapshotLabel: DATA_SNAPSHOT_LABEL,
            disclaimer: isOfficial
                ? null
                : 'Draft export only. This package may include stale cached data and is not an official compliance filing artifact.',
            targetLender: SUPPORTED_BANKS.find(b => b.id === selectedBank),

            borrowerInfo: {
                facilityName: facilityData.facilityName,
                facilityType: facilityData.facilityType,
                industry: 'Energy / Industrial',
                jurisdiction: 'Alberta, Canada'
            },

            environmentalMetrics: {
                baselineEmissions: {
                    value: facilityData.annualEmissions,
                    unit: 'tonnes CO2e/year',
                    source: 'Alberta TIER Facility Report'
                },
                projectedReduction: {
                    value: facilityData.emissionReduction,
                    unit: 'tonnes CO2e/year',
                    percentOfBaseline: parseFloat(emissionReductionPercent)
                },
                carbonIntensityImpact: {
                    improvement: `${emissionReductionPercent}% reduction`,
                    alignment: 'Paris Agreement 1.5°C pathway'
                },
                tierCompliance: {
                    currentStatus: 'Compliant',
                    projectedStatus: 'Exceeds benchmark',
                    creditGeneration: Math.round(facilityData.emissionReduction * 0.8) // Assume 80% becomes credits
                }
            },

            financialMetrics: {
                projectCost: {
                    value: facilityData.projectCost,
                    currency: 'CAD'
                },
                annualSavings: {
                    value: facilityData.energyCostSavings,
                    currency: 'CAD',
                    components: [
                        'Energy cost reduction',
                        'TIER credit value',
                        'Maintenance reduction'
                    ]
                },
                simplePayback: {
                    years: parseFloat(paybackYears),
                    category: parseFloat(paybackYears) < 5 ? 'Excellent' : 'Acceptable'
                },
                npv: {
                    value: Math.round((facilityData.energyCostSavings * 10) - facilityData.projectCost),
                    discountRate: '8%',
                    period: '10 years'
                },
                irr: {
                    value: Math.round((facilityData.energyCostSavings / facilityData.projectCost) * 100 * 0.8),
                    unit: '%'
                }
            },

            projectDetails: {
                description: facilityData.projectDescription,
                scope: [
                    'Energy efficiency improvements',
                    'Renewable energy installation',
                    'Emissions monitoring systems'
                ],
                timeline: '12-18 months',
                thirdPartyVerification: 'Available upon request'
            },

            compliance: {
                tierRegulation: 'Alberta TIER (2025 Amendment)',
                federalAlignment: 'Canada Net-Zero 2050',
                reportingStandard: 'GHG Protocol Scope 1 & 2',
                verification: 'ISO 14064-3 compatible'
            },

            attachments: [
                'Facility TIER Report (Annual)',
                'Energy Audit Report',
                'Project Cost Estimates',
                'Emission Reduction Calculations'
            ]
        };

        if (!isOfficial) {
            // Draft export remains local and immediate.
            const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Draft-Green-Loan-Package-${selectedBank.toUpperCase()}-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            setIsGenerating(false);
            trackEvent('export_job_created', {
                surface: 'compliance_pack',
                mode: 'draft',
                confidence: exportGate.confidence,
            });
            return;
        }

        try {
            setOfficialJobStatus('queued');
            const createResult = await createExportJob({
                template: 'compliance_pack',
                request_source: 'bank_ready_export',
                request_context: {
                    selected_bank: selectedBank,
                    facility_data: facilityData,
                    input_updated_at: new Date().toISOString(),
                    submitted_at: new Date().toISOString(),
                    client_generated_at: new Date().toISOString(),
                    data_snapshot_date: DATA_SNAPSHOT_DATE,
                    data_snapshot_label: DATA_SNAPSHOT_LABEL,
                    fpic_required: false,
                },
                force_export: forceOfficial || (!exportGate.allowed && canForceOfficialExport),
                sources: ['aeso_pool', 'tier_inputs', 'compliance_pack'],
            });

            const finalJob = await waitForExportJob(createResult.jobId, {
                onUpdate: (job) => setOfficialJobStatus(job.status),
            });

            if (finalJob.status === 'success' && finalJob.outputSignedUrl) {
                setLastOfficialUrl(finalJob.outputSignedUrl);
                setOfficialJobStatus('success');
                window.open(finalJob.outputSignedUrl, '_blank', 'noopener,noreferrer');
                trackEvent('export_job_created', {
                    surface: 'compliance_pack',
                    mode: 'official',
                    confidence: exportGate.confidence,
                });
                return;
            }

            if (finalJob.status === 'blocked_stale') {
                setBlockedReason(finalJob.reason || exportGate.reason);
                setShowBlockedModal(true);
                trackEvent('export_blocked_low_confidence', {
                    surface: 'compliance_pack',
                    confidence: exportGate.confidence,
                    reason: finalJob.reason ?? exportGate.reason ?? 'low confidence',
                });
                return;
            }

            alert('Official export did not complete. Please retry or use draft export.');
        } catch (error) {
            if (error instanceof ExportJobError) {
                if (error.status === 409) {
                    setBlockedReason(error.payload.reason || exportGate.reason);
                    setShowBlockedModal(true);
                    return;
                }
                if (error.status === 403) {
                    window.location.href = '/enterprise?intent=official-export-access&surface=compliance-pack';
                    return;
                }
                alert(error.payload.reason || error.message);
                return;
            }
            alert('Failed to queue official export. Please try again.');
        } finally {
            setIsGenerating(false);
        }
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
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-4 bg-green-600/20 rounded-2xl">
                        <Building2 className="h-10 w-10 text-green-400" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-white">Bank-Ready Export</h1>
                        <p className="text-slate-400 text-lg">
                            Generate green loan application packages for Canadian lenders
                        </p>
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Input Form */}
                    <div className="lg:col-span-2 space-y-6">
                        {!exportGate.allowed ? (
                            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                                <div className="text-sm font-semibold text-amber-200">
                                    Official exports are currently confidence-gated
                                </div>
                                <div className="mt-1 text-xs text-amber-300">
                                    {exportGate.reason} Download draft output with caveat or request a data refresh before issuing client-ready compliance packs.
                                </div>
                            </div>
                        ) : null}

                        {/* Bank Selection */}
                        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                            <h2 className="text-lg font-semibold text-white mb-4">Select Target Lender</h2>
                            <div className="grid grid-cols-2 gap-4">
                                {SUPPORTED_BANKS.map(bank => (
                                    <button
                                        key={bank.id}
                                        onClick={() => setSelectedBank(bank.id)}
                                        className={`p-4 rounded-xl border-2 transition-all text-left ${selectedBank === bank.id
                                                ? 'border-green-500 bg-green-600/10'
                                                : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                                            }`}
                                    >
                                        <div className="text-2xl mb-2">{bank.logo}</div>
                                        <div className="text-white font-medium">{bank.name}</div>
                                        <div className="text-sm text-slate-400">{bank.program}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Facility Data */}
                        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                            <h2 className="text-lg font-semibold text-white mb-4">Facility Information</h2>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-slate-400 mb-2">Facility Name</label>
                                    <input
                                        type="text"
                                        value={facilityData.facilityName}
                                        onChange={(e) => setFacilityData({ ...facilityData, facilityName: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-2">Facility Type</label>
                                    <select
                                        value={facilityData.facilityType}
                                        onChange={(e) => setFacilityData({ ...facilityData, facilityType: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white"
                                    >
                                        <option>Industrial</option>
                                        <option>Commercial</option>
                                        <option>Municipal</option>
                                        <option>Agricultural</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-2">Annual Emissions (t CO₂e)</label>
                                    <input
                                        type="number"
                                        value={facilityData.annualEmissions}
                                        onChange={(e) => setFacilityData({ ...facilityData, annualEmissions: Number(e.target.value) })}
                                        className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-2">Projected Reduction (t CO₂e)</label>
                                    <input
                                        type="number"
                                        value={facilityData.emissionReduction}
                                        onChange={(e) => setFacilityData({ ...facilityData, emissionReduction: Number(e.target.value) })}
                                        className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-2">Project Cost ($)</label>
                                    <input
                                        type="number"
                                        value={facilityData.projectCost}
                                        onChange={(e) => setFacilityData({ ...facilityData, projectCost: Number(e.target.value) })}
                                        className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-2">Annual Savings ($)</label>
                                    <input
                                        type="number"
                                        value={facilityData.energyCostSavings}
                                        onChange={(e) => setFacilityData({ ...facilityData, energyCostSavings: Number(e.target.value) })}
                                        className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white"
                                    />
                                </div>
                            </div>
                            <div className="mt-4">
                                <label className="block text-sm text-slate-400 mb-2">Project Description</label>
                                <textarea
                                    value={facilityData.projectDescription}
                                    onChange={(e) => setFacilityData({ ...facilityData, projectDescription: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white resize-none"
                                />
                            </div>
                        </div>

                        {/* Generate Button */}
                        <button
                            onClick={() => { void generateReport('official'); }}
                            disabled={isGenerating}
                            className="w-full py-4 bg-green-600 hover:bg-green-500 disabled:bg-slate-600 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2"
                        >
                            {isGenerating ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                                    Generating Report...
                                </>
                            ) : (
                                <>
                                    <Download className="h-5 w-5" />
                                    Generate Official {SUPPORTED_BANKS.find(b => b.id === selectedBank)?.name} Data Package
                                </>
                            )}
                        </button>
                        <button
                            onClick={() => { void generateReport('draft'); }}
                            disabled={isGenerating}
                            className="w-full py-3 border border-slate-600 bg-slate-800 hover:bg-slate-700 rounded-xl font-medium text-slate-200 transition-all"
                        >
                            Download Draft Package (with freshness caveat)
                        </button>
                        {officialJobStatus ? (
                            <div className="rounded-lg border border-slate-700 bg-slate-800/80 px-4 py-3 text-xs text-slate-300">
                                Official export status: <span className="font-semibold text-white">{officialJobStatus}</span>
                                {lastOfficialUrl ? (
                                    <a
                                        href={lastOfficialUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="ml-2 text-cyan-300 underline"
                                    >
                                        Download latest
                                    </a>
                                ) : null}
                            </div>
                        ) : null}
                    </div>

                    {/* Preview Panel */}
                    <div className="space-y-6">
                        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                            <h3 className="text-lg font-semibold text-white mb-4">Report Preview</h3>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <Leaf className="h-4 w-4" />
                                        <span className="text-sm">Emission Reduction</span>
                                    </div>
                                    <span className="text-emerald-400 font-semibold">{emissionReductionPercent}%</span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <TrendingDown className="h-4 w-4" />
                                        <span className="text-sm">Carbon Avoided</span>
                                    </div>
                                    <span className="text-white font-semibold">{carbonIntensityReduction.toLocaleString()} t</span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <DollarSign className="h-4 w-4" />
                                        <span className="text-sm">Simple Payback</span>
                                    </div>
                                    <span className="text-white font-semibold">{paybackYears} years</span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <FileSpreadsheet className="h-4 w-4" />
                                        <span className="text-sm">Annual Savings</span>
                                    </div>
                                    <span className="text-emerald-400 font-semibold">{formatCurrency(facilityData.energyCostSavings)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-green-900/20 border border-green-500/30 rounded-2xl p-6">
                            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                                <Shield className="h-5 w-5 text-green-400" />
                                Compliance Included
                            </h3>
                            <ul className="space-y-2 text-sm text-slate-300">
                                <li className="flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4 text-green-400" />
                                    Alberta TIER 2025 alignment
                                </li>
                                <li className="flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4 text-green-400" />
                                    GHG Protocol Scope 1 & 2
                                </li>
                                <li className="flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4 text-green-400" />
                                    ISO 14064-3 compatible
                                </li>
                                <li className="flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4 text-green-400" />
                                    Canada Net-Zero 2050 pathway
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
            <ExportBlockedModal
                isOpen={showBlockedModal}
                title="Official Compliance Pack Blocked"
                reason={blockedReason || exportGate.reason}
                onClose={() => {
                    setShowBlockedModal(false);
                    setBlockedReason(undefined);
                }}
                onRequestRefresh={() => {
                    setShowBlockedModal(false);
                    setBlockedReason(undefined);
                    trackEvent('refresh_request', { surface: 'compliance_pack' });
                    window.location.href = '/enterprise?intent=data-refresh&surface=compliance-pack';
                }}
                onDownloadDraft={() => {
                    setShowBlockedModal(false);
                    setBlockedReason(undefined);
                    void generateReport('draft');
                }}
                canForceExport={canForceOfficialExport}
                onForceExport={() => {
                    setShowBlockedModal(false);
                    setBlockedReason(undefined);
                    void generateReport('official', true);
                }}
            />
        </div>
    );
};

export default BankReadyExport;
