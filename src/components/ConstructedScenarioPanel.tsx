import React from 'react';
import { Download, FileBadge2, FolderInput, FlaskConical } from 'lucide-react';
import { downloadBlob } from '../lib/proofPack';

export interface ConstructedScenarioDownload {
  id: string;
  label: string;
  filename: string;
  mimeType: string;
  content: string;
  description?: string;
}

export interface ConstructedScenarioBundle {
  id: string;
  title: string;
  buyerType: string;
  jurisdiction: string;
  summary: string;
  realisticBasis: string;
  expectedArtifact: string;
  disclosure: string;
  downloads: ConstructedScenarioDownload[];
  loadLabel?: string;
}

interface ConstructedScenarioPanelProps {
  scenario: ConstructedScenarioBundle;
  onLoad?: () => void;
  className?: string;
  testId?: string;
}

export function ConstructedScenarioPanel({
  scenario,
  onLoad,
  className = '',
  testId,
}: ConstructedScenarioPanelProps) {
  function downloadScenarioFile(file: ConstructedScenarioDownload) {
    downloadBlob(new Blob([file.content], { type: file.mimeType }), file.filename);
  }

  return (
    <section
      className={`rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-5 ${className}`}
      data-testid={testId}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
            <FlaskConical className="h-4 w-4" />
            Constructed commercial scenario
          </div>
          <h3 className="mt-2 text-lg font-semibold text-white">{scenario.title}</h3>
          <p className="mt-2 text-sm text-slate-300">{scenario.summary}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
          <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Buyer and jurisdiction</div>
          <div className="mt-2 text-sm text-white">{scenario.buyerType}</div>
          <div className="mt-1 text-xs text-slate-400">{scenario.jurisdiction}</div>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
          <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Expected export</div>
          <div className="mt-2 text-sm text-white">{scenario.expectedArtifact}</div>
          <div className="mt-1 text-xs text-slate-400">Use this to show the buyer what the pilot output looks like.</div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-700 bg-slate-900/60 p-4">
        <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Why this is realistic</div>
        <div className="mt-2 text-sm text-slate-200">{scenario.realisticBasis}</div>
      </div>

      <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-900/20 p-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">
          <FileBadge2 className="h-4 w-4" />
          Disclosure
        </div>
        <div className="mt-2 text-sm text-amber-100">{scenario.disclosure}</div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        {onLoad ? (
          <button
            onClick={onLoad}
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 transition-colors hover:bg-cyan-400"
          >
            <FolderInput className="h-4 w-4" />
            {scenario.loadLabel ?? 'Load scenario'}
          </button>
        ) : null}
        {scenario.downloads.map((file) => (
          <button
            key={file.id}
            onClick={() => downloadScenarioFile(file)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-100 transition-colors hover:border-cyan-500/50"
          >
            <Download className="h-4 w-4" />
            {file.label}
          </button>
        ))}
      </div>
    </section>
  );
}

export default ConstructedScenarioPanel;
