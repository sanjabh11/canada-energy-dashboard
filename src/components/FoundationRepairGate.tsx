import React from 'react';
import { AlertTriangle, FlaskConical, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { canAccessPhase4Experience } from '../lib/foundation';

interface FoundationRepairGateProps {
  surfaceName: string;
  children: React.ReactNode;
  summary: string;
  dataTestId?: string;
}

export function FoundationRepairGate({
  surfaceName,
  children,
  summary,
  dataTestId,
}: FoundationRepairGateProps) {
  const accessEnabled = canAccessPhase4Experience(import.meta.env);

  const banner = (
    <div
      className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4"
      data-testid={dataTestId}
    >
      <div className="flex items-start gap-3">
        {accessEnabled ? (
          <FlaskConical className="mt-0.5 h-5 w-5 text-amber-400" />
        ) : (
          <ShieldAlert className="mt-0.5 h-5 w-5 text-amber-400" />
        )}
        <div className="space-y-2">
          <p className="text-sm font-semibold text-amber-100">
            Foundation repair mode: {surfaceName}
          </p>
          <p className="text-sm text-amber-50/90">{summary}</p>
          <p className="text-xs text-amber-100/80">
            Phase 4 remains gated until freshness labeling, provenance, release checks, and live-data integrity are verified.
          </p>
        </div>
      </div>
    </div>
  );

  if (accessEnabled) {
    return (
      <>
        {banner}
        {children}
      </>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-slate-950/60 p-8">
      {banner}
      <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-6">
        <div className="mb-4 flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-400" />
          <div>
            <h2 className="text-lg font-semibold text-white">Experimental surface temporarily gated</h2>
            <p className="mt-2 text-sm text-slate-300">
              This workflow is implemented in the codebase, but it is intentionally unavailable to standard users until Phase 0 foundation repair is complete.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link
            to="/status"
            className="rounded-lg border border-slate-600 px-4 py-2 text-slate-100 transition-colors hover:bg-slate-800"
          >
            Review system status
          </Link>
          <Link
            to="/dashboard"
            className="rounded-lg bg-amber-500 px-4 py-2 font-medium text-slate-950 transition-colors hover:bg-amber-400"
          >
            Return to verified dashboards
          </Link>
        </div>
      </div>
    </div>
  );
}
