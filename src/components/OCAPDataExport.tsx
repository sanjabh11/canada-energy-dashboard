/**
 * OCAP Data Export - Indigenous Data Sovereignty Compliance
 * 
 * Research Finding: Standard SaaS "we own your data" terms are non-starters for AICEI partnerships.
 * OCAP® = Ownership, Control, Access, Possession
 * 
 * This component ensures:
 * - Community owns their data collectively
 * - Full data export in non-proprietary formats
 * - Clear data deletion capability
 * - Visible sovereignty badge
 * 
 * Reference: MonetizationResearch_Overall.md §7 - "Indigenous Data Sovereignty"
 */

import React, { useState } from 'react';
import {
    Download,
    Shield,
    Trash2,
    Check,
    AlertTriangle,
    FileJson,
    FileSpreadsheet,
    Lock,
    Users,
    ExternalLink
} from 'lucide-react';

interface OCAPDataExportProps {
    communityName?: string;
    dataPoints?: number;
    lastUpdated?: Date;
    onExportJSON?: () => void;
    onExportCSV?: () => void;
    onDeleteData?: () => void;
}

export const OCAPDataExport: React.FC<OCAPDataExportProps> = ({
    communityName = 'Your Community',
    dataPoints = 0,
    lastUpdated = new Date(),
    onExportJSON,
    onExportCSV,
    onDeleteData
}) => {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [exportStatus, setExportStatus] = useState<'idle' | 'exporting' | 'done'>('idle');

    const handleExport = (format: 'json' | 'csv') => {
        setExportStatus('exporting');

        // Simulate export - in production this would call the actual export function
        setTimeout(() => {
            if (format === 'json') {
                onExportJSON?.();
            } else {
                onExportCSV?.();
            }
            setExportStatus('done');
            setTimeout(() => setExportStatus('idle'), 2000);
        }, 1000);
    };

    const handleDeleteConfirm = () => {
        onDeleteData?.();
        setShowDeleteConfirm(false);
    };

    return (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
            {/* OCAP Badge Header */}
            <div className="bg-gradient-to-r from-emerald-900/50 to-teal-900/50 border-b border-emerald-500/30 p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/20 rounded-lg">
                            <Shield className="h-6 w-6 text-emerald-400" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-bold text-white">OCAP® Compliant</h3>
                                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded">
                                    Data Sovereignty
                                </span>
                            </div>
                            <p className="text-sm text-slate-400">
                                {communityName} retains full ownership of this data
                            </p>
                        </div>
                    </div>
                    <a
                        href="https://fnigc.ca/ocap-training/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
                    >
                        About OCAP® <ExternalLink className="h-3 w-3" />
                    </a>
                </div>
            </div>

            {/* Main Content */}
            <div className="p-6">
                {/* OCAP Principles Display */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {[
                        { letter: 'O', word: 'Ownership', desc: 'Community owns data collectively' },
                        { letter: 'C', word: 'Control', desc: 'You control collection & use' },
                        { letter: 'A', word: 'Access', desc: 'Full access to your data' },
                        { letter: 'P', word: 'Possession', desc: 'Physical control ensured' }
                    ].map((principle) => (
                        <div
                            key={principle.letter}
                            className="bg-slate-900/50 rounded-lg p-3 text-center"
                        >
                            <div className="text-2xl font-bold text-emerald-400 mb-1">
                                {principle.letter}
                            </div>
                            <div className="text-sm text-white font-medium">{principle.word}</div>
                            <div className="text-xs text-slate-500">{principle.desc}</div>
                        </div>
                    ))}
                </div>

                {/* Data Summary */}
                <div className="bg-slate-900/50 rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-slate-400" />
                            <span className="text-sm text-slate-400">Community Data Summary</span>
                        </div>
                        <span className="text-xs text-slate-500">
                            Last updated: {lastUpdated.toLocaleDateString()}
                        </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                            <div className="text-2xl font-bold text-white">{dataPoints.toLocaleString()}</div>
                            <div className="text-xs text-slate-500">Data Points</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-emerald-400">
                                <Lock className="h-6 w-6 mx-auto" />
                            </div>
                            <div className="text-xs text-slate-500">Encrypted</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-cyan-400">🇨🇦</div>
                            <div className="text-xs text-slate-500">Canada Hosted</div>
                        </div>
                    </div>
                </div>

                {/* Export Options */}
                <div className="mb-6">
                    <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                        <Download className="h-4 w-4" />
                        Export Your Data
                    </h4>
                    <p className="text-xs text-slate-400 mb-3">
                        Download all community data in open, non-proprietary formats.
                        Your data, your format, no lock-in.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => handleExport('json')}
                            disabled={exportStatus === 'exporting'}
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 text-white rounded-lg transition-colors"
                        >
                            <FileJson className="h-5 w-5 text-amber-400" />
                            <span>Export JSON</span>
                        </button>
                        <button
                            onClick={() => handleExport('csv')}
                            disabled={exportStatus === 'exporting'}
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 text-white rounded-lg transition-colors"
                        >
                            <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
                            <span>Export CSV</span>
                        </button>
                    </div>
                    {exportStatus === 'exporting' && (
                        <p className="text-sm text-amber-400 mt-2 text-center">Preparing export...</p>
                    )}
                    {exportStatus === 'done' && (
                        <p className="text-sm text-emerald-400 mt-2 text-center flex items-center justify-center gap-1">
                            <Check className="h-4 w-4" /> Export ready for download
                        </p>
                    )}
                </div>

                {/* Data Deletion */}
                <div className="border-t border-slate-700 pt-6">
                    <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                        <Trash2 className="h-4 w-4 text-red-400" />
                        Delete All Data
                    </h4>
                    <p className="text-xs text-slate-400 mb-3">
                        Permanently remove all community data from the platform.
                        This action cannot be undone.
                    </p>

                    {!showDeleteConfirm ? (
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-red-900/20 hover:bg-red-900/40 border border-red-500/30 text-red-400 rounded-lg text-sm transition-colors"
                        >
                            <Trash2 className="h-4 w-4" />
                            Request Data Deletion
                        </button>
                    ) : (
                        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                            <div className="flex items-start gap-3 mb-4">
                                <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
                                <div>
                                    <div className="font-medium text-red-400">Confirm Permanent Deletion</div>
                                    <p className="text-sm text-slate-400">
                                        This will permanently delete all data for {communityName}.
                                        Export your data first if you need a backup.
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleDeleteConfirm}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm transition-colors"
                                >
                                    Yes, Delete Everything
                                </button>
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer - Legal Promise */}
            <div className="bg-slate-900/50 border-t border-slate-700 p-4">
                <p className="text-xs text-slate-500 text-center">
                    <strong className="text-emerald-400">Our Promise:</strong> CEIP does not claim ownership of your data.
                    Your data is never pooled for AI training or sold to third parties.
                    Compliant with FNIGC OCAP® principles.
                </p>
            </div>
        </div>
    );
};

export default OCAPDataExport;
