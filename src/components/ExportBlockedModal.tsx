import React from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';

interface ExportBlockedModalProps {
  isOpen: boolean;
  title: string;
  reason?: string;
  onClose: () => void;
  onRequestRefresh?: () => void;
  onDownloadDraft?: () => void;
  canForceExport?: boolean;
  onForceExport?: () => void;
}

export const ExportBlockedModal: React.FC<ExportBlockedModalProps> = ({
  isOpen,
  title,
  reason,
  onClose,
  onRequestRefresh,
  onDownloadDraft,
  canForceExport = false,
  onForceExport,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
      <div className="w-full max-w-xl rounded-2xl border border-amber-500/40 bg-slate-900 shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-700 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-400" />
            <div>
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <p className="mt-1 text-sm text-slate-300">
                We can’t issue an official export right now because one or more source datasets are low confidence.
              </p>
            </div>
          </div>
          <button
            aria-label="Close"
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {reason ? (
            <div className="rounded-lg border border-slate-700 bg-slate-800/70 p-3 text-sm text-slate-200">
              {reason}
            </div>
          ) : null}

          <div className="grid gap-2 sm:grid-cols-2">
            {onRequestRefresh ? (
              <button
                onClick={onRequestRefresh}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-cyan-500/50 bg-cyan-500/10 px-4 py-2.5 text-sm font-medium text-cyan-200 transition-colors hover:bg-cyan-500/20"
              >
                <RefreshCw className="h-4 w-4" />
                Request Data Refresh
              </button>
            ) : null}

            {onDownloadDraft ? (
              <button
                onClick={onDownloadDraft}
                className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-700"
              >
                Download Draft (With Caveat)
              </button>
            ) : null}

            {canForceExport && onForceExport ? (
              <button
                onClick={onForceExport}
                className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-2.5 text-sm font-medium text-amber-200 transition-colors hover:bg-amber-500/20 sm:col-span-2"
              >
                Force Official Export (Admin Only)
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
