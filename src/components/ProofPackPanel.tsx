import React from 'react';
import {
  Download,
  FileCode2,
  FileJson2,
  FileSpreadsheet,
  FileText,
  FileType2,
  ShieldCheck,
} from 'lucide-react';
import type { ProofArtifactDefinition } from '../lib/proofPack';

interface ProofPackAction extends ProofArtifactDefinition {
  onDownload: () => void | Promise<void>;
}

interface ProofPackPanelProps {
  title: string;
  summary: string;
  artifacts: ProofPackAction[];
  className?: string;
}

function iconForFormat(format: ProofArtifactDefinition['format']) {
  switch (format) {
    case 'csv':
      return FileSpreadsheet;
    case 'json':
      return FileJson2;
    case 'md':
      return FileCode2;
    case 'pdf':
      return FileType2;
    default:
      return FileText;
  }
}

export function ProofPackPanel({
  title,
  summary,
  artifacts,
  className = '',
}: ProofPackPanelProps) {
  return (
    <section className={`rounded-2xl border border-slate-700 bg-slate-800/70 p-5 ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
            <ShieldCheck className="h-4 w-4" />
            Proof Pack
          </div>
          <h2 className="mt-2 text-lg font-semibold text-white">{title}</h2>
          <p className="mt-1 text-sm text-slate-400">{summary}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {artifacts.map((artifact) => {
          const Icon = iconForFormat(artifact.format);
          return (
            <div
              key={artifact.id}
              className="rounded-xl border border-slate-700 bg-slate-900/60 p-4"
              data-testid={`proof-artifact-${artifact.id}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-cyan-300" />
                    <div className="font-medium text-white">{artifact.label}</div>
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] uppercase tracking-wide text-slate-300">
                      {artifact.format}
                    </span>
                  </div>
                  {artifact.description ? (
                    <p className="mt-2 text-sm text-slate-400">{artifact.description}</p>
                  ) : null}
                </div>
                <button
                  onClick={() => void artifact.onDownload()}
                  className="rounded-lg bg-cyan-500/15 px-3 py-2 text-sm font-medium text-cyan-200 transition-colors hover:bg-cyan-500/25"
                  data-testid={`proof-download-${artifact.id}`}
                >
                  <span className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Download
                  </span>
                </button>
              </div>

              <div className="mt-3 space-y-2 text-xs text-slate-400">
                <div>Audience: {artifact.audience}</div>
                <div>Source: {artifact.sourceSummary}</div>
                <div>Manifest: {artifact.sourceManifestId}</div>
                <div>
                  Status: {artifact.claimLabel} • {artifact.verificationStatus.replace(/_/g, ' ')} • {artifact.freshnessState} • {artifact.commercialProofState === 'constructed_commercial_scenario' ? 'constructed scenario' : artifact.isFallback ? 'fallback/sample-backed' : 'non-fallback'}
                </div>
                <div>Do not claim: {artifact.doNotClaim.join('; ')}</div>
                <div>{artifact.boundedClaimsDisclaimer}</div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default ProofPackPanel;
