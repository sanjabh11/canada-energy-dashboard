import React from 'react';
import { ArrowLeft, CreditCard, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

/** Existing-member account access retained at the legacy Whop route. */
export function WhopDiscoverPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <section className="mx-auto max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-8 shadow-xl">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-cyan-300">
          Existing members
        </p>
        <h1 className="mb-4 text-3xl font-bold">Manage an existing Whop membership</h1>
        <p className="mb-8 text-slate-300">
          This page is retained for current Whop customers to manage their membership. New Whop
          memberships are not offered here.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <a
            href="https://whop.com/hub/settings/memberships"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-500 px-5 py-3 font-semibold text-slate-950 hover:bg-cyan-400"
          >
            <CreditCard aria-hidden="true" className="h-5 w-5" />
            Open membership settings
            <ExternalLink aria-hidden="true" className="h-4 w-4" />
          </a>
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-600 px-5 py-3 font-semibold text-slate-200 hover:bg-slate-800"
          >
            <ArrowLeft aria-hidden="true" className="h-5 w-5" />
            Return to CEIP
          </Link>
        </div>
      </section>
    </main>
  );
}

export default WhopDiscoverPage;
