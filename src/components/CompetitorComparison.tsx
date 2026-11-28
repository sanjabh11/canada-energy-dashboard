import React from 'react';
import { ArrowRight, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SEOHead } from './SEOHead';

/**
 * Keep the public comparison route available without publishing unsourced
 * competitor rankings, prices, or capability gaps.
 */
export const CompetitorComparison: React.FC = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
    <SEOHead
      title="Energy Product Comparison Research | CEIP"
      description="CEIP is reviewing primary-source evidence before publishing comparative capability or price claims."
      path="/compare"
      keywords={['energy product research', 'Alberta TIER workflow research']}
    />
    <main className="max-w-4xl mx-auto px-6 py-20">
      <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-4 py-2 text-sm text-amber-300">
        <Shield className="h-4 w-4" />
        Comparative research in progress
      </div>
      <h1 className="mt-6 text-4xl font-bold">Capability and price comparisons are under review</h1>
      <p className="mt-5 text-lg leading-8 text-slate-300">
        We are not publishing competitor rankings, pricing comparisons, or claims that another
        product lacks a capability without dated primary-source evidence for comparable scope.
      </p>

      <section
        className="mt-10 rounded-2xl border border-slate-700 bg-slate-800/60 p-6"
        aria-labelledby="evidence-status"
      >
        <h2 id="evidence-status" className="text-xl font-semibold">
          Current evidence status
        </h2>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-slate-400">Primary sources reviewed</dt>
            <dd className="mt-1">One official Orennia product page, reviewed 2026-10-05</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-400">TIER-specific competitor capability</dt>
            <dd className="mt-1">Unknown; no capability-gap claim is made</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-400">Competitor pricing and buyer outcomes</dt>
            <dd className="mt-1">Unknown; no comparison is published</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-400">CEIP buyer validation</dt>
            <dd className="mt-1">
              Not completed; TIER remains a desk-research-only pilot hypothesis
            </dd>
          </div>
        </dl>
        <p className="mt-5 text-sm text-slate-400">
          Source:{' '}
          <a
            className="text-cyan-300 underline"
            href="https://orennia.com/how-we-help"
            target="_blank"
            rel="noreferrer"
          >
            Orennia — How We Help
          </a>
          . That source does not establish whether Orennia provides a facility-specific Alberta TIER
          scenario memo.
        </p>
      </section>

      <Link
        to="/roi-calculator"
        className="mt-8 inline-flex items-center gap-2 text-cyan-300 hover:text-cyan-200"
      >
        Review the current TIER scenario hypothesis <ArrowRight className="h-4 w-4" />
      </Link>
    </main>
  </div>
);

export default CompetitorComparison;
