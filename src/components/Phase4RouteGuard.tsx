/**
 * B16 – Phase 4 Route Gate Guard
 *
 * Wraps routes that should only be accessible when the Phase 4 experiments
 * feature flag is enabled (`VITE_ENABLE_PHASE4_EXPERIMENTS=true`).
 *
 * Behaviour:
 *   - Flag ON  → renders children normally
 *   - Flag OFF → shows a branded "coming soon" gate page with a return link
 *
 * Usage in React Router:
 *   <Route path="/scenario-workbench" element={
 *     <Phase4RouteGuard>
 *       <ScenarioWorkbenchPage />
 *     </Phase4RouteGuard>
 *   } />
 *
 * Claim boundary compliance:
 *   This guard does NOT expose any live commercial data when the flag is OFF.
 *   CER 2026 Technical Annex C §3.2 — stale/gated data must not enter the
 *   commercial claim surface.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { FlaskConical, Lock, ArrowLeft, ExternalLink } from 'lucide-react';
import { isPhase4SurfaceEnabled } from '../lib/featureFlags';

// ── Gate page ─────────────────────────────────────────────────────────────────

interface GatePageProps {
  featureName?: string;
  description?: string;
  docsLink?: string;
}

function Phase4GatePage({
  featureName = 'Phase 4 Experiments',
  description = 'This feature is part of the Phase 4 experiment surface and is not yet available in your environment.',
  docsLink,
}: GatePageProps) {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center bg-slate-900 px-4"
      role="main"
      aria-labelledby="gate-heading"
    >
      {/* Icon */}
      <div className="mb-6 flex items-center justify-center">
        <div className="relative">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-800 ring-1 ring-slate-700">
            <FlaskConical className="h-9 w-9 text-indigo-400" aria-hidden />
          </div>
          <span
            className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-700 ring-2 ring-slate-900"
            aria-hidden
          >
            <Lock className="h-3.5 w-3.5 text-slate-400" />
          </span>
        </div>
      </div>

      {/* Text */}
      <h1
        id="gate-heading"
        className="mb-3 text-center text-xl font-bold text-white md:text-2xl"
      >
        {featureName}
      </h1>
      <p className="mb-2 max-w-md text-center text-sm text-slate-400">
        {description}
      </p>
      <p className="mb-8 max-w-md text-center text-xs text-slate-500">
        To enable this feature, set{' '}
        <code className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-indigo-300">
          VITE_ENABLE_PHASE4_EXPERIMENTS=true
        </code>{' '}
        in your environment and redeploy.
      </p>

      {/* Actions */}
      <div className="flex flex-col items-center gap-3 sm:flex-row">
        <Link
          to="/"
          className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-200 transition-colors hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to Dashboard
        </Link>

        {docsLink && (
          <a
            href={docsLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg border border-indigo-700/50 bg-indigo-950/40 px-4 py-2.5 text-sm text-indigo-300 transition-colors hover:bg-indigo-900/40 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <ExternalLink className="h-4 w-4" aria-hidden />
            Learn more
          </a>
        )}
      </div>

      {/* Compliance footer */}
      <p className="mt-12 max-w-sm text-center text-[10px] text-slate-600">
        Gate enforced per CER 2026 Technical Annex C §3.2 claim boundary policy.
        Data must not enter commercial claim surface when flag is disabled.
      </p>
    </div>
  );
}

// ── Guard component ───────────────────────────────────────────────────────────

export interface Phase4RouteGuardProps {
  children: React.ReactNode;
  /** Display name shown in the gate page heading */
  featureName?: string;
  /** Description paragraph on the gate page */
  description?: string;
  /** Optional docs or info link for the gate page */
  docsLink?: string;
}

/**
 * Renders `children` when Phase 4 experiments are enabled.
 * Falls back to `Phase4GatePage` otherwise.
 *
 * This check is purely client-side (Vite env flag); server-side enforcement
 * should be added via Netlify edge rules or Supabase RLS when needed.
 */
export function Phase4RouteGuard({
  children,
  featureName,
  description,
  docsLink,
}: Phase4RouteGuardProps) {
  if (!isPhase4SurfaceEnabled()) {
    return (
      <Phase4GatePage
        featureName={featureName}
        description={description}
        docsLink={docsLink}
      />
    );
  }

  return <>{children}</>;
}

export default Phase4RouteGuard;
