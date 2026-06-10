/**
 * B15 – Data Freshness Dashboard Page
 *
 * Full-page wrapper for the DataFreshnessDashboard component.
 * Includes SEO head, branded header, and embeds the dashboard widget.
 *
 * Route: /data-freshness   /connector-status
 */
import React from 'react';
import { SEOHead } from './SEOHead';
import { DataFreshnessDashboard, DEMO_LAST_RUN_MAP } from './DataFreshnessDashboard';
import { Activity, ShieldCheck } from 'lucide-react';

const DataFreshnessDashboardPage: React.FC = () => {
  /**
   * In production, `lastRunMap` should be fetched from the Supabase Edge Function
   * or the `connector_meta_cache` view. For demo/dev, we use DEMO_LAST_RUN_MAP.
   *
   * Example production pattern (when Supabase is available):
   *   const { data } = useQuery(['connectorStatus'], () => supabase
   *     .from('connector_freshness')
   *     .select('connector_id,last_successful_run')
   *   );
   *   const lastRunMap = Object.fromEntries(
   *     (data ?? []).map(r => [r.connector_id, r.last_successful_run])
   *   );
   */
  const lastRunMap = DEMO_LAST_RUN_MAP;

  return (
    <div className="min-h-screen bg-slate-900">
      <SEOHead
        title="Data Freshness | Canada Energy Futures Dashboard"
        description="Live SLA status for all official Canadian energy data connectors: StatCan, CER, ECCC NPRI, AESO, and IESO. Tracks data freshness, last successful run, and SLA compliance."
        path="/data-freshness"
        keywords={[
          'data freshness',
          'connector status',
          'StatCan',
          'CER Energy Futures',
          'ECCC NPRI',
          'AESO',
          'IESO',
          'SLA compliance',
          'data provenance',
        ]}
      />

      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 via-indigo-950 to-slate-800 py-10 px-6">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-white/10 p-3">
              <Activity className="h-8 w-8 text-indigo-300" aria-hidden />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white md:text-3xl">
                Data Freshness
              </h1>
              <p className="mt-1 text-sm text-indigo-200 md:text-base">
                Live SLA status for all official Canadian energy data connectors
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs text-indigo-200">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
              Open Government Licence – Canada
            </span>
            <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs text-emerald-300">
              CER 2026 Technical Annex C §3.2
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 py-8 md:px-6">
        <DataFreshnessDashboard
          lastRunMap={lastRunMap}
          heading="Connector SLA Status"
          compact={false}
        />

        {/* Compliance note */}
        <div className="mt-8 rounded-xl border border-slate-700/50 bg-slate-800/40 p-5 space-y-2">
          <h2 className="text-sm font-semibold text-slate-200">About SLA Monitoring</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Each connector has a configured refresh cadence (e.g., 24h for daily feeds, 8,760h for annual releases).
            The SLA threshold is set at <strong className="text-slate-300">cadence × 1.5</strong> to allow a 50% grace period
            before data is marked stale. Stale data must not be used for live commercial claims per
            CER 2026 Technical Annex C §3.2.
          </p>
          <p className="text-xs text-slate-400 leading-relaxed">
            <strong className="text-slate-300">Sources:</strong>{' '}
            Statistics Canada (WDS), CER Energy Futures 2026, ECCC NPRI, AESO Market Data, IESO Generator Output.
            All data licensed under the Open Government Licence – Canada (OGL-Canada).
          </p>
        </div>
      </div>
    </div>
  );
};

export default DataFreshnessDashboardPage;
