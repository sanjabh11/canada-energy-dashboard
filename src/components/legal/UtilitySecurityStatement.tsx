import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Database, FileText, Lock, Mail, Shield, ShieldCheck } from 'lucide-react';

export function UtilitySecurityStatement() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-300">
      <header className="bg-slate-800 border-b border-slate-700 py-4 px-6">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link
            to="/utility-demand-forecast"
            className="text-slate-400 hover:text-white transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="h-5 w-5" />
            Back
          </Link>
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-cyan-400" />
            <h1 className="text-xl font-bold text-white">Utility Security & Data-Handling Statement</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="prose prose-invert prose-slate max-w-none">
          <p className="text-slate-400 mb-8">
            <strong>Last Updated:</strong> April 2026
          </p>

          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="h-5 w-5 text-cyan-400" />
              <h2 className="text-xl font-semibold text-white m-0">1. Purpose</h2>
            </div>
            <p>
              This statement describes the current operational practices used by Canada Energy Intelligence Platform
              ("CEIP") for utility-authorized forecasting workflows. It is intended to support utility onboarding,
              privacy review, and technical due diligence. It is not a claim of formal third-party certification or a
              legal opinion.
            </p>
          </section>

          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <Database className="h-5 w-5 text-cyan-400" />
              <h2 className="text-xl font-semibold text-white m-0">2. Data in Scope</h2>
            </div>
            <p>
              For Ontario Green Button and related utility-forecasting workflows, CEIP defaults to requesting
              <strong> Usage Information only</strong> unless a utility review explicitly requires broader categories.
              The application uses authorized interval history, connector metadata, and provenance data to support
              utility planning, benchmarking, and export workflows.
            </p>
            <p className="mt-4">
              CEIP does <strong>not</strong> position utility-authorized customer data as a general-purpose training
              dataset and does not use it for advertising or unrelated secondary use.
            </p>
          </section>

          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <Lock className="h-5 w-5 text-cyan-400" />
              <h2 className="text-xl font-semibold text-white m-0">3. Token Custody & Access Controls</h2>
            </div>
            <ul className="space-y-2 mt-4">
              <li>Deployed connector secrets are managed through Supabase Edge secret custody rather than browser storage.</li>
              <li>Connector tokens are encrypted at rest and are not presented back to the customer-facing route.</li>
              <li>Connector audit metadata is retained to prove authorization, synchronization, revocation, and token-purge behavior.</li>
              <li>Local browser demos use clearly marked starter or mocked flows and do not imply live utility approval.</li>
            </ul>
          </section>

          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="h-5 w-5 text-cyan-400" />
              <h2 className="text-xl font-semibold text-white m-0">4. Encryption, Retention & Purge</h2>
            </div>
            <ul className="space-y-2 mt-4">
              <li>Transport uses HTTPS / TLS for customer-facing and connector-backed workflows.</li>
              <li>Normalized interval history, payload fingerprints, and audit records are retained only to support the approved planning workflow and provenance requirements.</li>
              <li>Stored token material is purged when revocation is confirmed.</li>
              <li>Retention is intentionally limited; CEIP avoids keeping broader customer records than are necessary for the utility forecasting use case.</li>
            </ul>
          </section>

          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <ShieldCheck className="h-5 w-5 text-cyan-400" />
              <h2 className="text-xl font-semibold text-white m-0">5. Revocation & Live-State Truthfulness</h2>
            </div>
            <p>
              CEIP is designed to stop presenting a utility connector as live as soon as disconnect or revocation is
              initiated. For portal-managed utilities, the application guides the user to the utility-owned
              manage-connections surface and finalizes the connector as <strong>revoked</strong> only after
              confirmation or an equivalent follow-up entitlement failure.
            </p>
            <p className="mt-4">
              This behavior is part of the utility connector runtime validation pack and is a required proof point for
              Ontario onboarding reviews.
            </p>
          </section>

          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="h-5 w-5 text-cyan-400" />
              <h2 className="text-xl font-semibold text-white m-0">6. Review Boundaries</h2>
            </div>
            <p>
              CEIP does not claim Ontario-wide certification, formal Green Button Alliance sandbox certification,
              formal SOC 2 certification, or NERC compliance through this statement alone. Utility-specific onboarding,
              legal review, and production credentials remain separate external approval gates.
            </p>
          </section>

          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <Mail className="h-5 w-5 text-cyan-400" />
              <h2 className="text-xl font-semibold text-white m-0">7. Utility Review Contact</h2>
            </div>
            <p>
              For utility security, privacy, or connector review questions:
            </p>
            <p className="mt-4">
              <strong>Security:</strong>{' '}
              <a href="mailto:security@ceip.energy" className="text-cyan-400 hover:underline">
                security@ceip.energy
              </a>
            </p>
            <p className="mt-2">
              <strong>Privacy:</strong>{' '}
              <a href="mailto:privacy@ceip.energy" className="text-cyan-400 hover:underline">
                privacy@ceip.energy
              </a>
            </p>
            <p className="mt-2">
              <strong>Legal:</strong>{' '}
              <a href="mailto:legal@ceip.energy" className="text-cyan-400 hover:underline">
                legal@ceip.energy
              </a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800 flex gap-6">
          <Link to="/privacy" className="text-cyan-400 hover:underline">Privacy Policy</Link>
          <Link to="/terms" className="text-cyan-400 hover:underline">Terms of Service</Link>
          <Link to="/utility-demand-forecast" className="text-cyan-400 hover:underline">Utility Forecasting Lane</Link>
        </div>
      </main>
    </div>
  );
}

export default UtilitySecurityStatement;
