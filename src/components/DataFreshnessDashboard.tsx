/**
 * B15 – Data Freshness Dashboard
 *
 * Displays real-time SLA status for all registered official-data connectors.
 * Uses the freshnessReport() function from the connector registry to compute
 * per-connector status based on lastRunAt timestamps.
 *
 * Design principles:
 *   - No API calls — reads from the client-side registry + injected lastRunMap.
 *   - Embeddable as a widget inside any dashboard page.
 *   - Full accessibility: roles, aria-labels, colour + icon redundancy.
 *   - CER 2026 Technical Annex C §3.2 compliance: SLA thresholds visible.
 */
import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  RefreshCw,
  ExternalLink,
  Clock,
  Database,
} from 'lucide-react';
import { freshnessReport, listConnectors } from '../lib/connectors/registry';
import type { ConnectorMeta } from '../lib/connectors/index';

// ── Types ────────────────────────────────────────────────────────────────────

type FreshnessStatus = 'live' | 'stale' | 'unknown' | 'demo';

interface FreshnessRow {
  id: string;
  name: string;
  status: FreshnessStatus;
  ageHours: number | null;
  isWithinSLA: boolean;
  message: string;
  meta?: ConnectorMeta;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusColor(status: FreshnessStatus, isWithinSLA: boolean): {
  border: string;
  badge: string;
  icon: string;
  text: string;
} {
  if (status === 'live' && isWithinSLA) {
    return {
      border: 'border-emerald-700/50',
      badge: 'bg-emerald-500/15 text-emerald-300',
      icon: 'text-emerald-400',
      text: 'text-emerald-300',
    };
  }
  if (status === 'stale' || (status === 'live' && !isWithinSLA)) {
    return {
      border: 'border-amber-700/50',
      badge: 'bg-amber-500/15 text-amber-300',
      icon: 'text-amber-400',
      text: 'text-amber-300',
    };
  }
  if (status === 'unknown') {
    return {
      border: 'border-slate-700/50',
      badge: 'bg-slate-700/40 text-slate-400',
      icon: 'text-slate-500',
      text: 'text-slate-400',
    };
  }
  // demo
  return {
    border: 'border-violet-700/50',
    badge: 'bg-violet-500/15 text-violet-300',
    icon: 'text-violet-400',
    text: 'text-violet-300',
  };
}

function StatusIcon({ status, isWithinSLA, className }: { status: FreshnessStatus; isWithinSLA: boolean; className?: string }) {
  const colors = statusColor(status, isWithinSLA);
  const base = `h-5 w-5 shrink-0 ${colors.icon} ${className ?? ''}`;
  if (status === 'live' && isWithinSLA) return <CheckCircle2 className={base} aria-hidden />;
  if (status === 'stale' || (status === 'live' && !isWithinSLA)) return <AlertTriangle className={base} aria-hidden />;
  if (status === 'unknown') return <HelpCircle className={base} aria-hidden />;
  return <XCircle className={base} aria-hidden />;
}

function BadgeLabel({ status, isWithinSLA }: { status: FreshnessStatus; isWithinSLA: boolean }) {
  const colors = statusColor(status, isWithinSLA);
  const label = status === 'live' && isWithinSLA ? 'Live' :
    status === 'stale' || (status === 'live' && !isWithinSLA) ? 'Stale' :
    status === 'unknown' ? 'Unknown' : 'Demo';
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${colors.badge}`}>
      {label}
    </span>
  );
}

function formatAge(ageHours: number | null): string {
  if (ageHours === null) return 'Never run';
  if (ageHours < 1) return `${Math.round(ageHours * 60)} min ago`;
  if (ageHours < 24) return `${ageHours.toFixed(1)} h ago`;
  const days = ageHours / 24;
  return `${days.toFixed(1)} d ago`;
}

function formatCadence(hours: number): string {
  if (hours < 24) return `${hours}h cadence`;
  if (hours < 168) return `${(hours / 24).toFixed(0)}d cadence`;
  if (hours < 8760) return `${(hours / 168).toFixed(0)}w cadence`;
  return `${(hours / 8760).toFixed(0)}y cadence`;
}

// ── Connector card ────────────────────────────────────────────────────────────

interface ConnectorCardProps {
  row: FreshnessRow;
}

function ConnectorCard({ row }: ConnectorCardProps) {
  const [showDetail, setShowDetail] = useState(false);
  const colors = statusColor(row.status as FreshnessStatus, row.isWithinSLA);

  return (
    <article
      className={`rounded-xl border bg-slate-800/60 p-4 transition-all hover:bg-slate-800/80 ${colors.border}`}
      aria-label={`${row.name} data freshness: ${row.status}`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <StatusIcon status={row.status as FreshnessStatus} isWithinSLA={row.isWithinSLA} />
          <h3 className="truncate text-sm font-semibold text-slate-100">{row.name}</h3>
        </div>
        <BadgeLabel status={row.status as FreshnessStatus} isWithinSLA={row.isWithinSLA} />
      </div>

      {/* Age + cadence */}
      <div className="mt-3 flex items-center gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" aria-hidden />
          {formatAge(row.ageHours)}
        </span>
        {row.meta && (
          <span className="flex items-center gap-1">
            <RefreshCw className="h-3 w-3" aria-hidden />
            {formatCadence(row.meta.refreshCadenceHours)}
          </span>
        )}
      </div>

      {/* SLA bar */}
      {row.ageHours !== null && row.meta && (
        <div className="mt-2">
          <div className="h-1.5 w-full rounded-full bg-slate-700 overflow-hidden" role="progressbar" aria-label="SLA usage" aria-valuenow={Math.min(100, (row.ageHours / (row.meta.refreshCadenceHours * 1.5)) * 100)} aria-valuemin={0} aria-valuemax={100}>
            <div
              className={`h-full rounded-full transition-all ${row.isWithinSLA ? 'bg-emerald-500' : 'bg-amber-500'}`}
              style={{ width: `${Math.min(100, (row.ageHours / (row.meta.refreshCadenceHours * 1.5)) * 100).toFixed(1)}%` }}
            />
          </div>
          <p className="mt-0.5 text-right text-[10px] text-slate-500">
            {row.isWithinSLA
              ? `Within SLA (${row.meta.refreshCadenceHours * 1.5}h limit)`
              : `Exceeds SLA (limit: ${row.meta.refreshCadenceHours * 1.5}h)`}
          </p>
        </div>
      )}

      {/* Source link + detail toggle */}
      <div className="mt-3 flex items-center justify-between">
        {row.meta && (
          <a
            href={row.meta.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-indigo-400 transition-colors"
            aria-label={`Open source: ${row.meta.publisher}`}
          >
            <ExternalLink className="h-3 w-3" aria-hidden />
            {row.meta.publisher}
          </a>
        )}
        <button
          type="button"
          onClick={() => setShowDetail((v) => !v)}
          className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
          aria-expanded={showDetail}
          aria-controls={`detail-${row.id}`}
        >
          {showDetail ? 'Less' : 'Details'}
        </button>
      </div>

      {/* Collapsible detail */}
      {showDetail && (
        <div
          id={`detail-${row.id}`}
          className="mt-3 rounded-lg border border-slate-700/50 bg-slate-900/40 p-3 space-y-1"
        >
          <p className="text-[11px] text-slate-400 leading-relaxed">{row.message}</p>
          {row.meta && (
            <>
              <p className="text-[11px] text-slate-500">
                Jurisdictions: {row.meta.jurisdictions.join(', ')}
              </p>
              <p className="text-[11px] text-slate-500">
                Metrics: {row.meta.metricFamilies.join(', ')}
              </p>
              <p className="text-[11px] text-slate-500">
                License: {row.meta.license}
              </p>
              {row.meta.caveatNotes && (
                <p className="text-[11px] text-amber-600 italic">{row.meta.caveatNotes}</p>
              )}
            </>
          )}
        </div>
      )}
    </article>
  );
}

// ── Summary bar ───────────────────────────────────────────────────────────────

interface SummaryBarProps {
  rows: FreshnessRow[];
}

function SummaryBar({ rows }: SummaryBarProps) {
  const live = rows.filter((r) => r.status === 'live' && r.isWithinSLA).length;
  const stale = rows.filter((r) => r.status === 'stale' || (r.status === 'live' && !r.isWithinSLA)).length;
  const unknown = rows.filter((r) => r.status === 'unknown').length;

  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3">
      <Database className="h-4 w-4 text-slate-400 shrink-0" aria-hidden />
      <div className="flex flex-1 items-center gap-4 text-xs">
        <span className="flex items-center gap-1.5 text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
          {live} live
        </span>
        <span className="flex items-center gap-1.5 text-amber-400">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
          {stale} stale
        </span>
        <span className="flex items-center gap-1.5 text-slate-500">
          <HelpCircle className="h-3.5 w-3.5" aria-hidden />
          {unknown} unknown
        </span>
      </div>
      <span className="shrink-0 text-[11px] text-slate-500">
        {rows.length} connectors
      </span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export interface DataFreshnessDashboardProps {
  /**
   * Map of connector id → ISO date string of the last successful run.
   * Null/missing entries are treated as "never run".
   *
   * In production, this is hydrated from the `connector_meta_cache` Postgres view.
   * In development/demo, pass the DEMO_LAST_RUN_MAP exported below.
   */
  lastRunMap?: Record<string, string | null>;
  /** Optional heading override */
  heading?: string;
  /** Compact mode: 2-col grid instead of 1-col */
  compact?: boolean;
}

/**
 * Demo last-run map for local development.
 * Simulates a mix of fresh, stale, and never-run connectors.
 */
export const DEMO_LAST_RUN_MAP: Record<string, string | null> = {
  'statcan-wds': new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),          // 2h ago – fresh
  'cer-energy-futures': new Date(Date.now() - 96 * 60 * 60 * 1000).toISOString(),  // 4d ago – stale (annual)
  'eccc-npri': new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString(),     // >1y ago – stale
  'aeso-api': new Date(Date.now() - 30 * 60 * 1000).toISOString(),                  // 30 min ago – fresh
  'ieso-generator': null,                                                             // never run
};

export function DataFreshnessDashboard({
  lastRunMap = DEMO_LAST_RUN_MAP,
  heading = 'Data Freshness',
  compact = false,
}: DataFreshnessDashboardProps) {
  // Hydrate freshnessReport() synchronously — pure function, no async
  const rows = useMemo<FreshnessRow[]>(() => {
    const metas = listConnectors().reduce<Record<string, ConnectorMeta>>((acc, m) => {
      acc[m.id] = m;
      return acc;
    }, {});

    return freshnessReport(lastRunMap).map((r) => ({
      ...r,
      status: r.status as FreshnessStatus,
      meta: metas[r.id],
    }));
  }, [lastRunMap]);

  return (
    <section aria-labelledby="freshness-heading" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 id="freshness-heading" className="flex items-center gap-2 text-sm font-semibold text-slate-200">
          <RefreshCw className="h-4 w-4 text-indigo-400" aria-hidden />
          {heading}
        </h2>
        <span className="text-[11px] text-slate-500">
          SLA = cadence × 1.5 grace
        </span>
      </div>

      <SummaryBar rows={rows} />

      <div
        className={`grid gap-3 ${compact ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}
        role="list"
        aria-label="Connector freshness cards"
      >
        {rows.map((row) => (
          <div key={row.id} role="listitem">
            <ConnectorCard row={row} />
          </div>
        ))}
      </div>

      <p className="text-[10px] text-slate-600 leading-relaxed">
        Data sourced under the Open Government Licence – Canada (OGL-Canada).
        Freshness is calculated from the last confirmed successful connector run.
        Stale data must not be used for live commercial claims (CER 2026, Technical Annex C §3.2).
      </p>
    </section>
  );
}

export default DataFreshnessDashboard;
