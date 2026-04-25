import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Database,
  Download,
  Key,
  Lock,
  Settings,
  Shield,
  Upload,
} from 'lucide-react';
import {
  appendSovereignVaultAuditEntry,
  getSovereignVaultAuditEntries,
  getSovereignVaultConsent,
  setSovereignVaultConsent,
  type SovereignVaultAuditEntry,
} from '../lib/sovereignVaultAudit';
import {
  decryptSovereignVaultPayload,
  encryptSovereignVaultPayload,
  type SovereignVaultEncryptedEnvelope,
} from '../lib/sovereignVaultCrypto';

interface DataVaultConfig {
  vaultName: string;
  nationName: string;
  dataResidency: 'local-device' | 'community-network' | 'hybrid-export';
  accessLog: boolean;
  exportFormat: 'json';
}

interface DataAsset {
  id: string;
  name: string;
  type: 'energy' | 'housing' | 'infrastructure' | 'grants';
  recordCount: number;
  lastUpdated: string;
  encrypted: boolean;
}

interface VaultSnapshot {
  version: 'edge-vault-v1';
  exportedAt: string;
  dataOwner: string;
  vaultConfig: DataVaultConfig;
  assets: DataAsset[];
  ocapReadiness: {
    ownership: boolean;
    control: boolean;
    access: boolean;
    possession: boolean;
  };
  limitations: string[];
}

const SAMPLE_ASSETS: DataAsset[] = [
  { id: '1', name: 'Housing Energy Consumption', type: 'housing', recordCount: 245, lastUpdated: '2025-12-24', encrypted: true },
  { id: '2', name: 'Community Infrastructure', type: 'infrastructure', recordCount: 12, lastUpdated: '2025-12-20', encrypted: true },
  { id: '3', name: 'Greener Homes Grant Applications', type: 'grants', recordCount: 89, lastUpdated: '2025-12-23', encrypted: true },
  { id: '4', name: 'Solar Installation Data', type: 'energy', recordCount: 34, lastUpdated: '2025-12-22', encrypted: true },
];

export const SovereignDataVault: React.FC = () => {
  const [config, setConfig] = useState<DataVaultConfig>({
    vaultName: 'Nation Edge Vault',
    nationName: '',
    dataResidency: 'local-device',
    accessLog: true,
    exportFormat: 'json',
  });
  const [assets, setAssets] = useState<DataAsset[]>(SAMPLE_ASSETS);
  const [exportPassphrase, setExportPassphrase] = useState('');
  const [importPassphrase, setImportPassphrase] = useState('');
  const [consentAccepted, setConsentAcceptedState] = useState(false);
  const [auditEntries, setAuditEntries] = useState<SovereignVaultAuditEntry[]>([]);
  const [latestEnvelope, setLatestEnvelope] = useState<SovereignVaultEncryptedEnvelope | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingImportText, setPendingImportText] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<string | null>(null);

  useEffect(() => {
    setConsentAcceptedState(getSovereignVaultConsent());
    setAuditEntries(getSovereignVaultAuditEntries());
  }, []);

  const ocapReadiness = useMemo(() => ({
    ownership: consentAccepted,
    control: config.accessLog,
    access: consentAccepted,
    possession: config.dataResidency !== 'hybrid-export',
  }), [config.accessLog, config.dataResidency, consentAccepted]);

  const ocapScore = Object.values(ocapReadiness).filter(Boolean).length;
  const limitations = [
    'Keys are derived locally from a user passphrase. There is no nation-held KMS or shared hardware custody in v1.',
    'Encrypted files stay in the browser/device workflow only. There is no on-prem runtime or residency enforcement in this release.',
    'Audit history is local-first browser storage. Multi-device sync and append-only server attestation remain out of scope.',
  ];

  function refreshAuditEntries() {
    setAuditEntries(getSovereignVaultAuditEntries());
  }

  function setConsentAccepted(nextValue: boolean) {
    setSovereignVaultConsent(nextValue);
    setConsentAcceptedState(nextValue);
    appendSovereignVaultAuditEntry(nextValue ? 'consent_granted' : 'consent_revoked', {
      vaultName: config.vaultName,
      nationName: config.nationName || null,
    });
    refreshAuditEntries();
  }

  function saveConfiguration() {
    appendSovereignVaultAuditEntry('config_changed', {
      vaultName: config.vaultName,
      nationName: config.nationName || null,
      dataResidency: config.dataResidency,
      accessLog: config.accessLog,
    });
    refreshAuditEntries();
    setStatusMessage('Local edge-vault settings saved to the browser audit log.');
    setErrorMessage(null);
  }

  async function handleExport() {
    if (!consentAccepted) {
      setErrorMessage('Acknowledge the local-custody terms before exporting.');
      setStatusMessage(null);
      return;
    }
    if (!config.nationName.trim()) {
      setErrorMessage('Enter the Nation or community name before exporting.');
      setStatusMessage(null);
      return;
    }
    if (!exportPassphrase.trim()) {
      setErrorMessage('Enter an export passphrase before creating the encrypted vault snapshot.');
      setStatusMessage(null);
      return;
    }

    appendSovereignVaultAuditEntry('export_started', {
      assetCount: assets.length,
      nationName: config.nationName,
    });
    refreshAuditEntries();

    try {
      const exportedAt = new Date().toISOString();
      const payload: VaultSnapshot = {
        version: 'edge-vault-v1',
        exportedAt,
        dataOwner: config.nationName,
        vaultConfig: config,
        assets,
        ocapReadiness,
        limitations,
      };

      const envelope = await encryptSovereignVaultPayload(payload, exportPassphrase, config.nationName, exportedAt);
      setLatestEnvelope(envelope);

      const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `edge-vault-v1-${config.nationName.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'community'}-${exportedAt.split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);

      appendSovereignVaultAuditEntry('export_completed', {
        fingerprint: envelope.fingerprint,
        assetCount: assets.length,
        exportedAt,
      });
      refreshAuditEntries();
      setStatusMessage(`Encrypted snapshot exported. Fingerprint ${envelope.fingerprint}.`);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Encrypted export failed.');
      setStatusMessage(null);
    }
  }

  async function handleImport() {
    if (!consentAccepted) {
      setErrorMessage('Acknowledge the local-custody terms before importing.');
      setStatusMessage(null);
      return;
    }
    if (!pendingImportText) {
      setErrorMessage('Choose an encrypted vault file before importing.');
      setStatusMessage(null);
      return;
    }

    try {
      const snapshot = await decryptSovereignVaultPayload<VaultSnapshot>(JSON.parse(pendingImportText), importPassphrase);
      if (!snapshot?.vaultConfig || !Array.isArray(snapshot.assets)) {
        throw new Error('Malformed vault snapshot payload.');
      }

      setConfig(snapshot.vaultConfig);
      setAssets(snapshot.assets);
      setImportSummary(`Imported ${snapshot.assets.length} assets for ${snapshot.dataOwner} from ${new Date(snapshot.exportedAt).toLocaleString()}.`);
      appendSovereignVaultAuditEntry('import_succeeded', {
        assetCount: snapshot.assets.length,
        dataOwner: snapshot.dataOwner,
        exportedAt: snapshot.exportedAt,
      });
      refreshAuditEntries();
      setStatusMessage('Encrypted vault snapshot imported locally.');
      setErrorMessage(null);
    } catch (error) {
      appendSovereignVaultAuditEntry('import_failed', {
        reason: error instanceof Error ? error.message : 'unknown_error',
      });
      refreshAuditEntries();
      setErrorMessage(error instanceof Error ? error.message : 'Encrypted import failed.');
      setStatusMessage(null);
    }
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      setPendingImportText(text);
      setStatusMessage(`Loaded encrypted snapshot ${file.name}.`);
      setErrorMessage(null);
    } catch {
      setPendingImportText(null);
      setErrorMessage('Unable to read the selected vault file.');
      setStatusMessage(null);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4">
              <Shield className="h-10 w-10 text-cyan-300" />
            </div>
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold text-white">Edge Vault V1</h1>
                <span className="rounded-full border border-amber-500/30 bg-amber-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-200">
                  Honest cap 3.2 / 5
                </span>
              </div>
              <p className="max-w-3xl text-base text-slate-300">
                Local-only encrypted export and import for OCAP-ready workflows. This release does not claim on-prem deployment,
                nation-held production keys, cloud residency enforcement, or multi-device sovereignty controls.
              </p>
            </div>
          </div>

          <div
            data-testid="vault-ocap-score"
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              ocapScore >= 3 ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'
            }`}
          >
            OCAP-ready score: {ocapScore}/4
          </div>
        </div>

        <div className="mb-8 grid gap-4 lg:grid-cols-4" data-testid="vault-readiness-grid">
          {([
            ['Ownership', ocapReadiness.ownership, 'Granted after explicit local consent.'],
            ['Control', ocapReadiness.control, 'Local audit logging and encrypted export controls are active.'],
            ['Access', ocapReadiness.access, 'Import and export are blocked until terms are acknowledged.'],
            ['Possession', ocapReadiness.possession, 'Files can stay device-local; hybrid export is treated as a weaker posture.'],
          ] as const).map(([label, enabled, copy]) => (
            <div
              key={label}
              className={`rounded-2xl border p-4 ${
                enabled ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-amber-500/30 bg-amber-500/10'
              }`}
            >
              <div className="mb-2 flex items-center gap-2">
                {enabled ? <CheckCircle className="h-5 w-5 text-emerald-300" /> : <AlertTriangle className="h-5 w-5 text-amber-300" />}
                <span className="font-semibold text-white">{label}</span>
              </div>
              <p className="text-sm text-slate-300">{copy}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-1">
            <section className="rounded-2xl border border-slate-700 bg-slate-900/60 p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
                <Settings className="h-5 w-5 text-slate-300" />
                Local vault settings
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm text-slate-400">Vault name</label>
                  <input
                    aria-label="Vault name"
                    type="text"
                    value={config.vaultName}
                    onChange={(event) => setConfig({ ...config, vaultName: event.target.value })}
                    className="w-full rounded-lg border border-slate-600 bg-slate-950 px-4 py-3 text-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-400">Nation or community name</label>
                  <input
                    aria-label="Nation or community name"
                    type="text"
                    value={config.nationName}
                    onChange={(event) => setConfig({ ...config, nationName: event.target.value })}
                    placeholder="e.g. Siksika Nation"
                    className="w-full rounded-lg border border-slate-600 bg-slate-950 px-4 py-3 text-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-400">Residency posture</label>
                  <select
                    aria-label="Residency posture"
                    value={config.dataResidency}
                    onChange={(event) => setConfig({ ...config, dataResidency: event.target.value as DataVaultConfig['dataResidency'] })}
                    className="w-full rounded-lg border border-slate-600 bg-slate-950 px-4 py-3 text-white"
                  >
                    <option value="local-device">Local device only</option>
                    <option value="community-network">Community network / air-gapped share</option>
                    <option value="hybrid-export">Hybrid export handling</option>
                  </select>
                </div>

                <label className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3">
                  <span className="text-sm text-slate-300">Local audit log</span>
                  <input
                    type="checkbox"
                    checked={config.accessLog}
                    onChange={(event) => setConfig({ ...config, accessLog: event.target.checked })}
                    className="h-4 w-4"
                  />
                </label>

                <button
                  type="button"
                  onClick={saveConfiguration}
                  className="w-full rounded-lg bg-slate-200 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-white"
                >
                  Save local settings
                </button>
              </div>
            </section>

            <section className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-6" data-testid="vault-consent-gate">
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
                <Key className="h-5 w-5 text-cyan-200" />
                Consent and local custody gate
              </h2>
              <p className="mb-4 text-sm text-slate-200">
                Exports and imports are disabled until an operator accepts that passphrases stay local to the device and that v1
                does not provide nation-held KMS, server attestation, or residency enforcement.
              </p>

              <label className="flex items-start gap-3 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={consentAccepted}
                  onChange={(event) => setConsentAccepted(event.target.checked)}
                  className="mt-1 h-4 w-4"
                />
                <span>I understand this is a local-only encrypted vault workflow and will manage passphrase custody outside the application.</span>
              </label>
            </section>

            <section className="rounded-2xl border border-slate-700 bg-slate-900/60 p-6" data-testid="vault-fingerprint">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
                <Lock className="h-5 w-5 text-emerald-300" />
                Latest export fingerprint
              </h2>
              <code className="block rounded-lg bg-slate-950 px-4 py-3 text-sm text-emerald-200">
                {latestEnvelope?.fingerprint ?? 'No encrypted export created in this browser session yet.'}
              </code>
              <div className="mt-3 space-y-1 text-xs text-slate-400">
                <p>Algorithm: {latestEnvelope?.algorithm ?? 'AES-GCM'}</p>
                <p>KDF: {latestEnvelope?.kdf?.name ?? 'PBKDF2'} / {latestEnvelope?.kdf?.hash ?? 'SHA-256'} / {latestEnvelope?.kdf?.iterations ?? 210000} iterations</p>
              </div>
            </section>
          </div>

          <div className="space-y-6 lg:col-span-2">
            <section className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/60">
              <div className="flex flex-col gap-4 border-b border-slate-700 p-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
                    <Database className="h-5 w-5 text-slate-300" />
                    Encrypted export surface
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Snapshot contents are serialized locally, encrypted in the browser, and downloaded as an AES-GCM envelope.
                  </p>
                </div>
                <div className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-slate-300">
                  {assets.length} protected asset groups
                </div>
              </div>

              <div className="divide-y divide-slate-700">
                {assets.map((asset) => (
                  <div key={asset.id} className="flex items-center justify-between gap-4 p-4 hover:bg-slate-800/40">
                    <div className="flex items-center gap-4">
                      <div className="rounded-lg bg-emerald-500/10 p-2">
                        <Lock className="h-5 w-5 text-emerald-300" />
                      </div>
                      <div>
                        <h3 className="font-medium text-white">{asset.name}</h3>
                        <p className="text-sm text-slate-400">
                          {asset.recordCount} records · {asset.type} · updated {asset.lastUpdated}
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-200">
                      encrypted on export
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid gap-6 rounded-2xl border border-slate-700 bg-slate-900/60 p-6 lg:grid-cols-2">
              <div className="space-y-4">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
                  <Download className="h-5 w-5 text-cyan-200" />
                  Export encrypted snapshot
                </h2>
                <div>
                  <label className="mb-2 block text-sm text-slate-400">Export passphrase</label>
                  <input
                    aria-label="Export passphrase"
                    type="password"
                    value={exportPassphrase}
                    onChange={(event) => setExportPassphrase(event.target.value)}
                    placeholder="Stored outside the application"
                    className="w-full rounded-lg border border-slate-600 bg-slate-950 px-4 py-3 text-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={!consentAccepted || !config.nationName.trim() || !exportPassphrase.trim()}
                  className="w-full rounded-lg bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                >
                  Export encrypted snapshot
                </button>
              </div>

              <div className="space-y-4">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
                  <Upload className="h-5 w-5 text-purple-200" />
                  Import encrypted snapshot
                </h2>
                <div>
                  <label className="mb-2 block text-sm text-slate-400">Encrypted vault file</label>
                  <input
                    data-testid="vault-import-file"
                    aria-label="Encrypted vault file"
                    type="file"
                    accept="application/json"
                    onChange={handleFileChange}
                    className="block w-full rounded-lg border border-slate-600 bg-slate-950 px-4 py-3 text-sm text-slate-300"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-slate-400">Import passphrase</label>
                  <input
                    aria-label="Import passphrase"
                    type="password"
                    value={importPassphrase}
                    onChange={(event) => setImportPassphrase(event.target.value)}
                    className="w-full rounded-lg border border-slate-600 bg-slate-950 px-4 py-3 text-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={!consentAccepted || !pendingImportText || !importPassphrase.trim()}
                  className="w-full rounded-lg bg-purple-500 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                >
                  Import encrypted snapshot
                </button>
              </div>
            </section>

            {(statusMessage || errorMessage || importSummary) && (
              <section className="rounded-2xl border border-slate-700 bg-slate-900/60 p-6" data-testid="vault-status-panel">
                {statusMessage && <p className="mb-2 text-sm text-emerald-300">{statusMessage}</p>}
                {importSummary && <p className="mb-2 text-sm text-cyan-200">{importSummary}</p>}
                {errorMessage && <p className="text-sm text-rose-300">{errorMessage}</p>}
              </section>
            )}

            <section className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-6">
                <h2 className="mb-4 text-lg font-semibold text-white">What v1 does</h2>
                <ul className="space-y-3 text-sm text-slate-300">
                  <li>Local PBKDF2 key derivation with AES-GCM encrypted exports.</li>
                  <li>Consent-gated export and import flow.</li>
                  <li>Local audit trail for consent, config, export, and import events.</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6">
                <h2 className="mb-4 text-lg font-semibold text-white">What remains out of scope</h2>
                <ul className="space-y-3 text-sm text-slate-200">
                  {limitations.map((limitation) => (
                    <li key={limitation}>{limitation}</li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-700 bg-slate-900/60 p-6" data-testid="vault-audit-log">
              <h2 className="mb-4 text-lg font-semibold text-white">Local audit log</h2>
              <div className="space-y-3">
                {auditEntries.length === 0 ? (
                  <p className="text-sm text-slate-400">No local vault actions recorded yet.</p>
                ) : (
                  auditEntries.map((entry) => (
                    <div key={entry.id} className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium capitalize text-white">{entry.action.replace(/_/g, ' ')}</span>
                        <span className="text-xs text-slate-400">{new Date(entry.createdAt).toLocaleString()}</span>
                      </div>
                      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-slate-400">
                        {JSON.stringify(entry.metadata, null, 2)}
                      </pre>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-slate-500">
          <p>
            OCAP® is a registered trademark of the First Nations Information Governance Centre. This page is an
            OCAP-ready local workflow, not a certified sovereignty infrastructure deployment.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SovereignDataVault;
