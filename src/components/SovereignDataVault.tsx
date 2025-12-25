/**
 * Sovereign Data Vault (L1)
 * Based on Value Proposition Research Dec 2025
 * 
 * Purpose: OCAP® compliant data architecture for Indigenous communities
 * - Technical enforcement of "Possession" principle
 * - Nation-controlled encryption keys
 * - Data residency controls
 * 
 * NOTE: This is the UI/management layer. Full implementation requires:
 * - Docker containerization for on-premise deployment
 * - Key management integration (e.g., AWS KMS, HashiCorp Vault)
 * - Data replication controls
 */

import React, { useState } from 'react';
import {
    Shield,
    Lock,
    Database,
    Key,
    Globe,
    Server,
    CheckCircle,
    AlertTriangle,
    Download,
    Upload,
    Settings,
    Eye,
    EyeOff
} from 'lucide-react';

interface DataVaultConfig {
    vaultName: string;
    nationName: string;
    dataResidency: 'canada' | 'nation-controlled' | 'hybrid';
    encryptionEnabled: boolean;
    keyHolder: 'nation' | 'ceip' | 'split';
    accessLog: boolean;
    exportFormat: 'json' | 'csv' | 'both';
}

interface DataAsset {
    id: string;
    name: string;
    type: 'energy' | 'housing' | 'infrastructure' | 'grants';
    recordCount: number;
    lastUpdated: string;
    encrypted: boolean;
}

const SAMPLE_ASSETS: DataAsset[] = [
    { id: '1', name: 'Housing Energy Consumption', type: 'housing', recordCount: 245, lastUpdated: '2025-12-24', encrypted: true },
    { id: '2', name: 'Community Infrastructure', type: 'infrastructure', recordCount: 12, lastUpdated: '2025-12-20', encrypted: true },
    { id: '3', name: 'Greener Homes Grant Applications', type: 'grants', recordCount: 89, lastUpdated: '2025-12-23', encrypted: true },
    { id: '4', name: 'Solar Installation Data', type: 'energy', recordCount: 34, lastUpdated: '2025-12-22', encrypted: true },
];

export const SovereignDataVault: React.FC = () => {
    const [config, setConfig] = useState<DataVaultConfig>({
        vaultName: 'Nation Energy Vault',
        nationName: '',
        dataResidency: 'nation-controlled',
        encryptionEnabled: true,
        keyHolder: 'nation',
        accessLog: true,
        exportFormat: 'both'
    });

    const [showKeys, setShowKeys] = useState(false);
    const [assets] = useState<DataAsset[]>(SAMPLE_ASSETS);

    const ocapCompliance = {
        ownership: config.keyHolder === 'nation',
        control: config.accessLog,
        access: true, // Always true in our model
        possession: config.dataResidency === 'nation-controlled'
    };

    const ocapScore = Object.values(ocapCompliance).filter(Boolean).length;

    const handleExport = () => {
        const exportData = {
            vaultConfig: config,
            assets: assets,
            ocapCompliance: ocapCompliance,
            exportedAt: new Date().toISOString(),
            exportedBy: 'CEIP Sovereign Vault',
            dataOwner: config.nationName || 'Nation (Not Specified)'
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sovereign-vault-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-purple-600/20 rounded-2xl">
                            <Shield className="h-10 w-10 text-purple-400" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-white">Sovereign Data Vault</h1>
                            <p className="text-slate-400 text-lg">
                                OCAP® Compliant Data Architecture for Indigenous Communities
                            </p>
                        </div>
                    </div>
                    <div className={`px-4 py-2 rounded-full font-semibold ${ocapScore === 4
                            ? 'bg-emerald-600/20 text-emerald-400'
                            : 'bg-amber-600/20 text-amber-400'
                        }`}>
                        OCAP® Score: {ocapScore}/4
                    </div>
                </div>

                {/* OCAP Compliance Status */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 mb-8">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Shield className="h-5 w-5 text-purple-400" />
                        OCAP® Principles Compliance
                    </h2>
                    <div className="grid md:grid-cols-4 gap-4">
                        <div className={`p-4 rounded-xl border ${ocapCompliance.ownership
                                ? 'bg-emerald-900/20 border-emerald-500/30'
                                : 'bg-amber-900/20 border-amber-500/30'
                            }`}>
                            <div className="flex items-center gap-2 mb-2">
                                {ocapCompliance.ownership ? (
                                    <CheckCircle className="h-5 w-5 text-emerald-400" />
                                ) : (
                                    <AlertTriangle className="h-5 w-5 text-amber-400" />
                                )}
                                <span className="font-semibold text-white">Ownership</span>
                            </div>
                            <p className="text-sm text-slate-400">
                                {ocapCompliance.ownership
                                    ? 'Nation holds encryption keys'
                                    : 'Keys shared with CEIP'}
                            </p>
                        </div>

                        <div className={`p-4 rounded-xl border ${ocapCompliance.control
                                ? 'bg-emerald-900/20 border-emerald-500/30'
                                : 'bg-amber-900/20 border-amber-500/30'
                            }`}>
                            <div className="flex items-center gap-2 mb-2">
                                {ocapCompliance.control ? (
                                    <CheckCircle className="h-5 w-5 text-emerald-400" />
                                ) : (
                                    <AlertTriangle className="h-5 w-5 text-amber-400" />
                                )}
                                <span className="font-semibold text-white">Control</span>
                            </div>
                            <p className="text-sm text-slate-400">
                                {ocapCompliance.control
                                    ? 'Full access logging enabled'
                                    : 'Enable access logging'}
                            </p>
                        </div>

                        <div className="p-4 rounded-xl border bg-emerald-900/20 border-emerald-500/30">
                            <div className="flex items-center gap-2 mb-2">
                                <CheckCircle className="h-5 w-5 text-emerald-400" />
                                <span className="font-semibold text-white">Access</span>
                            </div>
                            <p className="text-sm text-slate-400">
                                Nation grants all access permissions
                            </p>
                        </div>

                        <div className={`p-4 rounded-xl border ${ocapCompliance.possession
                                ? 'bg-emerald-900/20 border-emerald-500/30'
                                : 'bg-amber-900/20 border-amber-500/30'
                            }`}>
                            <div className="flex items-center gap-2 mb-2">
                                {ocapCompliance.possession ? (
                                    <CheckCircle className="h-5 w-5 text-emerald-400" />
                                ) : (
                                    <AlertTriangle className="h-5 w-5 text-amber-400" />
                                )}
                                <span className="font-semibold text-white">Possession</span>
                            </div>
                            <p className="text-sm text-slate-400">
                                {ocapCompliance.possession
                                    ? 'Data on Nation-controlled servers'
                                    : 'Data on shared infrastructure'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Configuration */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <Settings className="h-5 w-5 text-slate-400" />
                                Vault Configuration
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm text-slate-400 mb-2">Nation Name</label>
                                    <input
                                        type="text"
                                        value={config.nationName}
                                        onChange={(e) => setConfig({ ...config, nationName: e.target.value })}
                                        placeholder="e.g., Siksika Nation"
                                        className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-slate-400 mb-2">Data Residency</label>
                                    <select
                                        value={config.dataResidency}
                                        onChange={(e) => setConfig({ ...config, dataResidency: e.target.value as DataVaultConfig['dataResidency'] })}
                                        className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white"
                                    >
                                        <option value="nation-controlled">Nation-Controlled Server</option>
                                        <option value="canada">Canadian Cloud (Supabase)</option>
                                        <option value="hybrid">Hybrid (Encrypted in Cloud)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm text-slate-400 mb-2">Encryption Key Holder</label>
                                    <select
                                        value={config.keyHolder}
                                        onChange={(e) => setConfig({ ...config, keyHolder: e.target.value as DataVaultConfig['keyHolder'] })}
                                        className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white"
                                    >
                                        <option value="nation">Nation Only (Recommended)</option>
                                        <option value="split">Split Key (Nation + CEIP)</option>
                                        <option value="ceip">CEIP Managed</option>
                                    </select>
                                </div>

                                <div className="flex items-center justify-between">
                                    <label className="text-sm text-slate-400">Access Logging</label>
                                    <button
                                        onClick={() => setConfig({ ...config, accessLog: !config.accessLog })}
                                        className={`w-12 h-6 rounded-full transition-colors ${config.accessLog ? 'bg-emerald-600' : 'bg-slate-600'
                                            }`}
                                    >
                                        <div className={`w-5 h-5 rounded-full bg-white transition-transform ${config.accessLog ? 'translate-x-6' : 'translate-x-0.5'
                                            }`} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Key Display */}
                        <div className="bg-purple-900/20 border border-purple-500/30 rounded-2xl p-6">
                            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <Key className="h-5 w-5 text-purple-400" />
                                Encryption Keys
                            </h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Public Key</label>
                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 px-3 py-2 bg-slate-900 rounded text-xs text-slate-300 font-mono truncate">
                                            {showKeys ? 'pk_sovereign_a8f3...9d2e' : '••••••••••••••••'}
                                        </code>
                                        <button
                                            onClick={() => setShowKeys(!showKeys)}
                                            className="p-2 text-slate-400 hover:text-white"
                                        >
                                            {showKeys ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>
                                <p className="text-xs text-purple-400">
                                    Private key held by: {config.keyHolder === 'nation' ? 'Nation' : config.keyHolder === 'split' ? 'Split custody' : 'CEIP'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Data Assets */}
                    <div className="lg:col-span-2">
                        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
                            <div className="p-6 border-b border-slate-700 flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                    <Database className="h-5 w-5 text-slate-400" />
                                    Protected Data Assets
                                </h3>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleExport}
                                        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium text-white flex items-center gap-2"
                                    >
                                        <Download className="h-4 w-4" />
                                        Export All
                                    </button>
                                </div>
                            </div>

                            <div className="divide-y divide-slate-700">
                                {assets.map(asset => (
                                    <div key={asset.id} className="p-4 flex items-center justify-between hover:bg-slate-700/30">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-2 rounded-lg ${asset.type === 'housing' ? 'bg-blue-600/20' :
                                                    asset.type === 'grants' ? 'bg-emerald-600/20' :
                                                        asset.type === 'infrastructure' ? 'bg-amber-600/20' :
                                                            'bg-purple-600/20'
                                                }`}>
                                                {asset.encrypted && <Lock className="h-5 w-5 text-emerald-400" />}
                                            </div>
                                            <div>
                                                <h4 className="text-white font-medium">{asset.name}</h4>
                                                <div className="flex items-center gap-3 text-sm text-slate-400">
                                                    <span className="capitalize">{asset.type}</span>
                                                    <span>•</span>
                                                    <span>{asset.recordCount} records</span>
                                                    <span>•</span>
                                                    <span>Updated {asset.lastUpdated}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {asset.encrypted && (
                                                <span className="text-xs bg-emerald-600/20 text-emerald-400 px-2 py-1 rounded">
                                                    AES-256
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Deployment Info */}
                        <div className="mt-6 bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <Server className="h-5 w-5 text-slate-400" />
                                Deployment Options
                            </h3>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="p-4 bg-slate-700/30 rounded-xl border border-slate-600">
                                    <h4 className="font-medium text-white mb-2">Cloud Hosted (Current)</h4>
                                    <p className="text-sm text-slate-400">
                                        Data encrypted with Nation-held keys, stored in Canadian Supabase region.
                                        Fast setup, managed by CEIP.
                                    </p>
                                </div>
                                <div className="p-4 bg-purple-900/20 rounded-xl border border-purple-500/30">
                                    <h4 className="font-medium text-white mb-2 flex items-center gap-2">
                                        <Globe className="h-4 w-4 text-purple-400" />
                                        On-Premise (Coming Soon)
                                    </h4>
                                    <p className="text-sm text-slate-400">
                                        Docker container deployed to Nation-controlled servers.
                                        Full OCAP® Possession compliance.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* FNIGC Reference */}
                <div className="mt-8 text-center text-sm text-slate-500">
                    <p>
                        Built in accordance with the{' '}
                        <a
                            href="https://fnigc.ca/ocap-training/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-400 hover:underline"
                        >
                            First Nations Principles of OCAP®
                        </a>
                        {' '}— First Nations Information Governance Centre (FNIGC)
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SovereignDataVault;
