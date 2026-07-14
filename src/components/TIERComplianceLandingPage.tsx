import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Calculator,
  FileText,
  Shield,
  TrendingUp,
  Mail,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';
import { SEOHead } from './SEOHead';
import { persistLeadIntake } from '../lib/leadIntake';
import { trackEvent } from '../lib/analytics';

const PATHWAYS = [
  {
    name: 'Fund Payment',
    icon: <FileText className="h-6 w-6" />,
    desc: 'Pay the TIER fund price per tonne of exceedance',
    note: 'Simplest but most expensive option',
  },
  {
    name: 'Market Credits',
    icon: <TrendingUp className="h-6 w-6" />,
    desc: 'Purchase Alberta emission performance credits or offsets',
    note: 'Requires credit market access and provenance tracking',
  },
  {
    name: 'Direct Investment',
    icon: <Calculator className="h-6 w-6" />,
    desc: 'Invest in on-site emissions reduction for DI credits',
    note: 'Highest upfront cost, best long-term value',
  },
];

export const TIERComplianceLandingPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    trackEvent('tier_landing_view', { source_route: '/tier-compliance' });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    trackEvent('tier_lead_submit', { segment: 'Industrial', source_route: '/tier-compliance' });
    await persistLeadIntake({
      company_name: company,
      contact_name: '',
      email,
      source_route: '/tier-compliance',
      channel: 'direct',
      segment: 'Industrial',
      campaign_id: 'tier-compliance-landing',
    });
    setSubmitted(true);
  };

  return (
    <div
      className="min-h-screen bg-slate-950 text-white"
      style={{ fontFamily: '"Space Grotesk", "Avenir Next", "Segoe UI", sans-serif' }}
    >
      <SEOHead
        title="Alberta TIER Compliance — 3-Pathway CFO Memo | CEIP"
        description="Compare fund payment, market credits, and direct investment pathways for Alberta TIER compliance. Produce a board-ready CFO memo with source-dated provenance in 10 minutes."
        path="/tier-compliance"
        keywords={[
          'Alberta TIER compliance',
          'TIER CFO memo',
          'TIER pathway comparison',
          'emissions compliance tool',
          'Alberta carbon compliance',
        ]}
      />

      <main id="main-content" className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.16),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.22),_transparent_32%),linear-gradient(135deg,_#020617,_#0f172a_50%,_#052e2b)]" />

        <div className="relative mx-auto max-w-5xl px-6 py-16">
          <div className="text-sm uppercase tracking-[0.28em] text-cyan-200/80 mb-3">
            CEIP — Alberta TIER Compliance
          </div>
          <h1 className="text-4xl font-bold mb-4">3-Pathway TIER Compliance CFO Memo</h1>
          <p className="text-lg text-slate-300 mb-8 max-w-2xl">
            Compare fund payment, market credits, and direct investment pathways. Produce a
            board-ready memo with source-dated provenance — not a spreadsheet printout.
          </p>

          <div className="flex flex-wrap gap-4 mb-12">
            <Link
              to="/roi-calculator"
              onClick={() => trackEvent('tier_cta_click', { destination: '/roi-calculator' })}
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-6 py-3 font-semibold text-slate-950 hover:bg-cyan-400"
            >
              <Calculator className="h-5 w-5" /> Open TIER ROI Calculator
            </Link>
            <a
              href="#pathways"
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-6 py-3 font-semibold text-white hover:bg-white/10"
            >
              Compare Pathways <ArrowRight className="h-5 w-5" />
            </a>
          </div>

          <section id="pathways" className="mb-16">
            <h2 className="text-2xl font-bold mb-6">Three Compliance Pathways, One Memo</h2>
            <div className="grid gap-6 md:grid-cols-3">
              {PATHWAYS.map((p) => (
                <div key={p.name} className="rounded-xl border border-white/10 bg-white/5 p-6">
                  <div className="mb-3 text-cyan-300">{p.icon}</div>
                  <h3 className="text-lg font-semibold mb-2">{p.name}</h3>
                  <p className="text-sm text-slate-300 mb-3">{p.desc}</p>
                  <p className="text-xs text-slate-400">{p.note}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-6">Why Not Just Use Excel?</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-white/5 p-6">
                <h3 className="font-semibold mb-2 text-cyan-200">Source-Dated Provenance</h3>
                <p className="text-sm text-slate-300">
                  Every number in the memo traces back to the Alberta TIER fund price, market credit
                  price, and your facility inputs — with timestamps and source citations.
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-6">
                <h3 className="font-semibold mb-2 text-cyan-200">Board-Ready Export</h3>
                <p className="text-sm text-slate-300">
                  Export a formatted PDF memo with scenario assumptions, pathway comparison, and a
                  provenance appendix — ready for finance and compliance review.
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-6">
                <h3 className="font-semibold mb-2 text-cyan-200">10-Minute Workflow</h3>
                <p className="text-sm text-slate-300">
                  Enter your facility emissions, benchmark exceedance, and DI capex. Get pathway
                  comparison and memo export in minutes, not hours.
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-6">
                <h3 className="font-semibold mb-2 text-cyan-200">Bounded Scenario Planning</h3>
                <p className="text-sm text-slate-300">
                  This is a scenario planning and pilot qualification tool. It does not provide
                  trading, tax, legal, or guaranteed-savings advice.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-16">
            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-8">
              <h2 className="text-2xl font-bold mb-4">Get a TIER Compliance Demo</h2>
              <p className="text-slate-300 mb-6">
                Enter your email and company to receive a personalized TIER pathway walkthrough.
              </p>
              {submitted ? (
                <div className="flex items-center gap-3 text-cyan-200">
                  <CheckCircle className="h-6 w-6" /> Thank you — we'll reach out within 2 business
                  days.
                </div>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  className="flex flex-col gap-4 sm:flex-row sm:flex-wrap"
                >
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Work email"
                    className="rounded-lg border border-white/20 bg-slate-900 px-4 py-3 text-white placeholder-slate-400 focus:border-cyan-400 focus:outline-none"
                  />
                  <input
                    type="text"
                    required
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Company / facility"
                    className="rounded-lg border border-white/20 bg-slate-900 px-4 py-3 text-white placeholder-slate-400 focus:border-cyan-400 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-6 py-3 font-semibold text-slate-950 hover:bg-cyan-400"
                  >
                    <Mail className="h-5 w-5" /> Request Demo
                  </button>
                </form>
              )}
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4">Related Resources</h2>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/roi-calculator"
                onClick={() => trackEvent('tier_cta_click', { destination: '/roi-calculator' })}
                className="inline-flex items-center gap-2 text-cyan-300 hover:text-cyan-200"
              >
                <Calculator className="h-4 w-4" /> TIER ROI Calculator
              </Link>
              <Link
                to="/credit-banking"
                onClick={() => trackEvent('tier_cta_click', { destination: '/credit-banking' })}
                className="inline-flex items-center gap-2 text-cyan-300 hover:text-cyan-200"
              >
                <Shield className="h-4 w-4" /> Credit Banking Audit
              </Link>
              <Link
                to="/pricing"
                className="inline-flex items-center gap-2 text-cyan-300 hover:text-cyan-200"
              >
                <ExternalLink className="h-4 w-4" /> Pricing
              </Link>
            </div>
          </section>

          <footer className="border-t border-white/10 pt-6 text-xs text-slate-400">
            <p>
              CEIP is a bounded scenario planning and pilot qualification tool. It does not provide
              trading, tax, legal, or guaranteed-savings advice. TIER pricing is sourced from the
              Alberta TIER Implementation Agreement and updated periodically.
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
};

export default TIERComplianceLandingPage;
