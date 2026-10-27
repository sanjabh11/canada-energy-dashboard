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
  Info,
  Briefcase,
} from 'lucide-react';
import { SEOHead } from './SEOHead';
import { PrivacyCollectionNotice } from './PrivacyCollectionNotice';
import { isLeadIntakeEnabled, persistLeadIntake } from '../lib/leadIntake';
import { trackEvent } from '../lib/analytics';
import { validateEmail, validateNonNegInt } from '../lib/formValidation';

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
    desc: 'Model on-site emissions-reduction investment scenarios',
    note: 'Credit eligibility and the current Standard status are unverified',
  },
];

export const TIERComplianceLandingPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [contactName, setContactName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [consultantFirm, setConsultantFirm] = useState('');
  const [consultantEmail, setConsultantEmail] = useState('');
  const [consultantClientCount, setConsultantClientCount] = useState('');
  const [consultantCurrentTool, setConsultantCurrentTool] = useState('');
  const [consultantSubmitted, setConsultantSubmitted] = useState(false);
  const [consultantError, setConsultantError] = useState('');

  useEffect(() => {
    trackEvent('tier_landing_view', { source_route: '/tier-compliance' });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLeadIntakeEnabled()) {
      setSubmitError(
        'Pilot requests are disabled until the privacy collection notice is approved.',
      );
      return;
    }
    if (!validateEmail(email)) {
      setSubmitError('Enter a valid work email.');
      return;
    }
    if (!contactName.trim()) {
      setSubmitError('Enter your name.');
      return;
    }
    setSubmitError('');
    trackEvent('tier_lead_submit', { segment: 'Industrial', source_route: '/tier-compliance' });
    const result = await persistLeadIntake({
      company_name: company,
      contact_name: contactName,
      email,
      source_route: '/tier-compliance',
      channel: 'direct',
      segment: 'Industrial',
      campaign_id: 'tier-compliance-landing',
    });
    if (!result.ok) {
      setSubmitError('We could not save your request. Please try again in a moment.');
      return;
    }
    setSubmitted(true);
  };

  const handleConsultantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLeadIntakeEnabled()) {
      setConsultantError(
        'Pilot requests are disabled until the privacy collection notice is approved.',
      );
      return;
    }
    if (!validateEmail(consultantEmail)) {
      setConsultantError('Enter a valid work email.');
      return;
    }
    if (consultantClientCount && !validateNonNegInt(consultantClientCount)) {
      setConsultantError('Client count must be a non-negative number.');
      return;
    }
    setConsultantError('');
    trackEvent('tier_consultant_lead_submit', {
      segment: 'Consultant',
      source_route: '/tier-compliance',
    });
    const result = await persistLeadIntake({
      company_name: consultantFirm,
      contact_name: 'TIER Consultant',
      email: consultantEmail,
      source_route: '/tier-compliance',
      channel: 'direct',
      segment: 'Consultant',
      campaign_id: 'tier-consultant-cta-2026w21',
      metadata: {
        client_count: consultantClientCount || undefined,
        current_tool: consultantCurrentTool || undefined,
        target_plan: 'professional',
      },
    });
    if (!result.ok) {
      setConsultantError('We could not save your request. Please try again in a moment.');
      return;
    }
    setConsultantSubmitted(true);
  };

  return (
    <div
      className="min-h-screen bg-slate-950 text-white"
      style={{ fontFamily: '"Space Grotesk", "Avenir Next", "Segoe UI", sans-serif' }}
    >
      <SEOHead
        title="Alberta TIER Compliance — Scenario Planning | CEIP"
        description="Compare fund payment, market-credit, and direct-investment scenarios using source-dated assumptions. Outputs are draft planning aids for review; buyer outcomes are not validated."
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
          {/* TIER Compliance Deadline Banner */}
          {!bannerDismissed && (
            <div className="mb-6 rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Info className="h-5 w-5 text-amber-400 flex-shrink-0" />
                <p className="text-sm text-amber-200">
                  TIER verified annual compliance reports due June 30 of the following year — start
                  your 3-pathway memo now.
                </p>
              </div>
              <button
                onClick={() => setBannerDismissed(true)}
                className="text-amber-400 hover:text-amber-300 text-sm"
                aria-label="Dismiss deadline banner"
              >
                ✕
              </button>
            </div>
          )}
          <div className="text-sm uppercase tracking-[0.28em] text-cyan-200/80 mb-3">
            CEIP — Alberta TIER Compliance
          </div>
          <h1 className="text-4xl font-bold mb-4">3-Pathway TIER Scenario Planning</h1>
          <p className="text-lg text-slate-300 mb-8 max-w-2xl">
            Compare fund payment, market-credit, and direct-investment scenarios with source-dated
            assumptions. The memo is a draft planning aid for human review, not a board-approved or
            regulator-approved conclusion.
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
                <h3 className="font-semibold mb-2 text-cyan-200">Draft Scenario Export</h3>
                <p className="text-sm text-slate-300">
                  Export a draft PDF memo with scenario assumptions, pathway comparison, and
                  provenance notes for human review.
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-6">
                <h3 className="font-semibold mb-2 text-cyan-200">Scenario Workflow</h3>
                <p className="text-sm text-slate-300">
                  Enter your facility emissions, benchmark exceedance, and DI capex. Get a pathway
                  comparison and on-page memo export.
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
                  <CheckCircle className="h-6 w-6" /> Thank you — we'll be in touch regarding your
                  request.
                </div>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  noValidate
                  className="flex flex-col gap-4 sm:flex-row sm:flex-wrap"
                >
                  {isLeadIntakeEnabled() ? (
                    <>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        aria-label="Work email"
                        placeholder="Work email"
                        className="rounded-lg border border-white/20 bg-slate-900 px-4 py-3 text-white placeholder-slate-400 focus:border-cyan-400 focus:outline-none"
                      />
                      <input
                        type="text"
                        required
                        value={contactName}
                        aria-label="Your name"
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="Your name"
                        className="rounded-lg border border-white/20 bg-slate-900 px-4 py-3 text-white placeholder-slate-400 focus:border-cyan-400 focus:outline-none"
                      />
                      <input
                        type="text"
                        required
                        aria-label="Company or facility"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder="Company / facility"
                        className="rounded-lg border border-white/20 bg-slate-900 px-4 py-3 text-white placeholder-slate-400 focus:border-cyan-400 focus:outline-none"
                      />
                      <PrivacyCollectionNotice className="w-full sm:basis-full" />
                      <button
                        type="submit"
                        className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-6 py-3 font-semibold text-slate-950 hover:bg-cyan-400"
                      >
                        <Mail className="h-5 w-5" /> Request Demo
                      </button>
                      {submitError && (
                        <p className="sm:col-span-2 text-sm text-rose-400">{submitError}</p>
                      )}
                    </>
                  ) : (
                    <PrivacyCollectionNotice className="w-full" />
                  )}
                </form>
              )}
            </div>
          </section>

          {/* Consultant CTA */}
          <section className="mb-16">
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-8">
              <div className="flex items-center gap-3 mb-4">
                <Briefcase className="h-6 w-6 text-emerald-300" />
                <h2 className="text-2xl font-bold">Are You a TIER Compliance Consultant?</h2>
              </div>
              <p className="text-slate-300 mb-6">
                CEIP Professional is listed at USD $149/mo as an unvalidated planning price. Prepare
                source-dated draft scenarios for consultant review; buyer outcomes and time savings
                have not been validated.
              </p>
              {consultantSubmitted ? (
                <div className="flex items-center gap-3 text-emerald-200">
                  <CheckCircle className="h-6 w-6" /> Thank you — we'll be in touch regarding your
                  consultant onboarding.
                </div>
              ) : (
                <form
                  onSubmit={handleConsultantSubmit}
                  noValidate
                  className="grid gap-4 sm:grid-cols-2"
                >
                  {isLeadIntakeEnabled() ? (
                    <>
                      <input
                        type="text"
                        aria-label="Consulting firm name"
                        required
                        value={consultantFirm}
                        onChange={(e) => setConsultantFirm(e.target.value)}
                        placeholder="Consulting firm name"
                        className="rounded-lg border border-white/20 bg-slate-900 px-4 py-3 text-white placeholder-slate-400 focus:border-emerald-400 focus:outline-none"
                      />
                      <input
                        aria-label="Work email"
                        type="email"
                        required
                        value={consultantEmail}
                        onChange={(e) => setConsultantEmail(e.target.value)}
                        placeholder="Work email"
                        className="rounded-lg border border-white/20 bg-slate-900 px-4 py-3 text-white placeholder-slate-400 focus:border-emerald-400 focus:outline-none"
                      />
                      <input
                        type="number"
                        min="0"
                        value={consultantClientCount}
                        onChange={(e) => setConsultantClientCount(e.target.value)}
                        aria-label="Number of TIER clients"
                        placeholder="Number of TIER clients"
                        className="rounded-lg border border-white/20 bg-slate-900 px-4 py-3 text-white placeholder-slate-400 focus:border-emerald-400 focus:outline-none"
                      />
                      <input
                        type="text"
                        value={consultantCurrentTool}
                        onChange={(e) => setConsultantCurrentTool(e.target.value)}
                        aria-label="Current tool, for example Excel"
                        placeholder="Current tool (e.g. Excel)"
                        className="rounded-lg border border-white/20 bg-slate-900 px-4 py-3 text-white placeholder-slate-400 focus:border-emerald-400 focus:outline-none"
                      />
                      <PrivacyCollectionNotice className="sm:col-span-2" />
                      <button
                        type="submit"
                        className="sm:col-span-2 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-6 py-3 font-semibold text-slate-950 hover:bg-emerald-400"
                      >
                        <Mail className="h-5 w-5" /> Get Consultant Access
                      </button>
                      {consultantError && (
                        <p className="sm:col-span-2 text-sm text-rose-400">{consultantError}</p>
                      )}
                    </>
                  ) : (
                    <PrivacyCollectionNotice className="sm:col-span-2" />
                  )}
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
