/**
 * Municipal Landing Page - Climate Plan Implementation Tool
 *
 * Research Finding: Municipalities need tools to IMPLEMENT climate plans,
 * not create them (Stantec/Tetra Tech already do that).
 *
 * Positioning: desk-research municipal planning hypothesis; buyer validation pending.
 *
 * Pricing Strategy: illustrative planning hypotheses; procurement treatment is entity-specific and unverified.
 * Reference: MonetizationResearch_Overall.md §8.1
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  CheckCircle,
  BarChart3,
  FileText,
  Leaf,
  TrendingDown,
  Shield,
  Calendar,
  ArrowRight,
  Flame,
  Zap,
  Users,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Mail,
  ClipboardCheck,
  Target,
  Send,
} from 'lucide-react';
import { SEOHead } from './SEOHead';
import { isLeadIntakeEnabled, persistLeadIntake } from '../lib/leadIntake';
import { PrivacyCollectionNotice } from './PrivacyCollectionNotice';

const MUNICIPAL_BENEFITS = [
  {
    icon: <BarChart3 className="h-6 w-6" />,
    title: 'Climate planning scenarios',
    description:
      'Review draft inputs and source labels; data coverage and reporting suitability have not been validated.',
  },
  {
    icon: <FileText className="h-6 w-6" />,
    title: 'Draft reporting examples',
    description:
      'Examples require comparison with the current program guide; no funder alignment or acceptance is claimed.',
  },
  {
    icon: <Flame className="h-6 w-6" />,
    title: 'Methane calculation research',
    description:
      'Protocol version, applicability, verification, and credit eligibility require regulator and buyer review.',
  },
  {
    icon: <TrendingDown className="h-6 w-6" />,
    title: 'TIER pathway scenarios',
    description: 'Direct Investment credit treatment and buyer eligibility remain undetermined.',
  },
  {
    icon: <Zap className="h-6 w-6" />,
    title: 'Facility data review',
    description:
      'Benchmark coverage, source freshness, and facility fit must be checked for each use case.',
  },
  {
    icon: <Shield className="h-6 w-6" />,
    title: 'Evidence review',
    description:
      'Draft outputs need independent review before any operational, funding, or compliance use.',
  },
];

const PROCUREMENT_TIERS = [
  {
    name: 'Starter',
    price: 'CAD $15,000',
    period: '/year',
    threshold: 'Planning quote only',
    description: 'Illustrative planning band; population and scope fit are unvalidated.',
    features: [
      'Pilot scope to be defined',
      'Data coverage to be reviewed',
      'Reporting fit to be verified',
      'Support terms not defined',
    ],
    cta: 'Request Quote',
  },
  {
    name: 'Professional',
    price: 'CAD $29,000',
    period: '/year',
    threshold: 'Planning quote only',
    description: 'Illustrative planning band; population and scope fit are unvalidated.',
    features: [
      'Pilot scope to be defined',
      'Protocol and calculation status to be reviewed',
      'Direct Investment status remains unverified',
      'Review cadence not defined',
      'Support terms not defined',
    ],
    cta: 'Request Demo',
    badge: 'Planning hypothesis',
  },
  {
    name: 'Enterprise',
    price: 'CAD $49,000',
    period: '/year',
    threshold: 'Planning quote only',
    description: 'Illustrative planning band; population and scope fit are unvalidated.',
    features: [
      'Pilot scope to be defined',
      'Available workflows to be reviewed',
      'Integrations not verified or offered',
      'Account support terms not defined',
      'Training terms not defined',
    ],
    cta: 'Contact Sales',
  },
];

const ALBERTA_MUNICIPAL_STATS = [
  {
    stat: 'Not run',
    label: 'Buyer discovery',
    detail: 'No municipal buyer experiment has been completed',
  },
  {
    stat: 'Verify',
    label: 'TIER Fund rate',
    detail: 'Check the official rate and effective period before using a scenario',
  },
  {
    stat: 'Unmeasured',
    label: 'Reporting time change',
    detail: 'No buyer pilot has measured a time-saving outcome',
  },
  {
    stat: 'Varies',
    label: 'Procurement review',
    detail: 'Requirements depend on the entity and purchase; CEIP eligibility is unverified',
  },
];

const FAQ_ITEMS = [
  {
    q: 'Do we need to issue an RFP to purchase CEIP?',
    a: 'Procurement thresholds, competition requirements, and delegated authorities depend on the purchasing entity and scope. CEIP has not determined procurement eligibility. Confirm the applicable process with your procurement or legal team.',
  },
  {
    q: 'Is CEIP available through Canoe Procurement?',
    a: 'Not today. Canoe Procurement alignment is being evaluated as a future channel, but it should not be treated as an active purchasing path until CEIP is formally listed.',
  },
  {
    q: 'Where is our data stored? Is the service PIPEDA compliant?',
    a: 'Hosting regions, retention, deletion, and legal applicability have not been verified for a live deployment. Do not submit personal, confidential, or facility-level information while collection is disabled and owner review is pending. No PIPEDA or OCAP® compliance certification is claimed.',
  },
  {
    q: 'Can CEIP help with FCM Green Municipal Fund applications?',
    a: 'Funder alignment has not been verified. Any draft output must be checked against the current application guide by the applicant and funder before use; CEIP does not claim acceptance or eligibility.',
  },
  {
    q: 'What support does MCCAC provide for municipalities using CEIP?',
    a: 'Consult MCCAC directly for its current programs. CEIP has not verified an integration, endorsement, or required analytics layer.',
  },
  {
    q: 'How long does implementation take?',
    a: 'Implementation time has not been measured. Scope, data access, security review, support, and delivery timing would need to be agreed before any pilot.',
  },
];

export const MunicipalLandingPage: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [auditEmail, setAuditEmail] = useState('');
  const [auditSubmitted, setAuditSubmitted] = useState(false);
  const [auditError, setAuditError] = useState('');

  const handleAuditSubmit = async () => {
    if (!isLeadIntakeEnabled()) {
      setAuditError('Requests are disabled until the privacy collection notice is approved.');
      return;
    }
    if (!auditEmail || !auditEmail.includes('@')) {
      setAuditError('Enter a valid municipal work email to request a planning discussion.');
      return;
    }

    setAuditError('');

    const persistResult = await persistLeadIntake({
      company_name: 'Municipal Planning Discussion',
      contact_name: 'Municipal Lead',
      email: auditEmail,
      source_route: '/municipal',
      channel: 'direct',
      segment: 'municipal',
      campaign_id: 'municipal-planning-inquiry',
      metadata: {
        lead_type: 'municipal_planning_inquiry',
      },
    });

    if (!persistResult.ok) {
      setAuditError('We could not submit your discussion request. Please try again shortly.');
      return;
    }

    setAuditEmail('');
    setAuditSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <SEOHead
        title="Municipal Climate Tools | Alberta Energy Compliance for Municipalities"
        description="CEIP is a desk-research planning hypothesis for municipal climate and TIER reporting workflows. Prices and procurement eligibility are unvalidated."
        path="/municipal"
        keywords={[
          'municipal climate tools Alberta',
          'TIER compliance municipality',
          'GHG reporting municipal',
          'MCCAC energy tools',
          'FCM Green Municipal Fund',
        ]}
      />
      {/* Header */}
      <header className="border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600 rounded-lg">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg">CEIP</span>
              <span className="text-slate-400 text-sm ml-2">for Municipalities</span>
            </div>
          </Link>
          <nav className="flex items-center gap-4">
            <Link to="/pricing" className="text-slate-300 hover:text-white transition-colors">
              Pricing
            </Link>
            <Link
              to="/enterprise"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium transition-colors"
            >
              Request Demo
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 bg-gradient-to-b from-emerald-900/20 to-slate-900">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-300 px-4 py-2 rounded-full text-sm mb-6">
            <Leaf className="h-4 w-4" />
            Municipal planning hypothesis
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Explore municipal planning scenarios.
            <br />
            <span className="text-emerald-400">Buyer validation is pending.</span>
          </h1>

          <p className="text-xl text-slate-300 max-w-3xl mx-auto mb-8">
            CEIP is a desk-research hypothesis for municipal climate and TIER planning. Reporting
            coverage, compliance applicability, and buyer outcomes have not been validated.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link
              to="/enterprise"
              className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors flex items-center gap-2"
            >
              Request a Demo
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              to="/landfill-methane"
              className="px-8 py-4 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors"
            >
              Try Methane Calculator
            </Link>
          </div>

          {/* Trust Badges */}
          <div className="flex justify-center gap-8 mt-12 text-slate-400 text-sm">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-500" />
              <span>Desk-research planning hypothesis</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span>Regulatory fit requires review</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-500" />
              <span>No OCAP® compliance claim</span>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Statement */}
      <section className="py-16 border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold mb-6">The Implementation Gap</h2>
          <p className="text-lg text-slate-300">
            Consulting firms (Stantec, Tetra Tech) create excellent Climate Action Plans. But
            tracking progress? That's often a{' '}
            <strong className="text-amber-400">spreadsheet nightmare</strong>. CEIP bridges the gap
            between planning and accountability.
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 border-b border-slate-800">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-4">How It Works</h2>
          <p className="text-slate-400 text-center mb-12">
            Workflow, data access, and timing require buyer validation.
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                icon: <ClipboardCheck className="h-8 w-8" />,
                title: 'Define a use case',
                desc: 'Confirm data sources, permissions, privacy terms, and the workflow that a buyer wants to evaluate.',
              },
              {
                step: '2',
                icon: <Target className="h-8 w-8" />,
                title: 'Review a draft scenario',
                desc: 'Inspect illustrative outputs and source status. Coverage, calculations, and fit require independent validation.',
              },
              {
                step: '3',
                icon: <Send className="h-8 w-8" />,
                title: 'Check requirements',
                desc: 'Compare any draft with current regulator, council, funder, and procurement requirements before use.',
              },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 mx-auto mb-4">
                  {item.icon}
                </div>
                <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-600 text-white text-sm font-bold mb-3">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-slate-400 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Alberta Municipal Stats (replaces fictional case studies) */}
      <section className="py-16 border-b border-slate-800 bg-slate-800/20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-center mb-8">Municipal validation status</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {ALBERTA_MUNICIPAL_STATS.map((item, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl font-bold text-emerald-400">{item.stat}</div>
                <div className="text-sm font-medium text-white mt-1">{item.label}</div>
                <div className="text-xs text-slate-500 mt-2">{item.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-4">Municipal workflow topics</h2>
          <p className="text-slate-400 text-center mb-12 max-w-2xl mx-auto">
            Product and reporting fit have not been validated with municipal buyers.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {MUNICIPAL_BENEFITS.map((benefit, index) => (
              <div key={index} className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center text-emerald-400 mb-4">
                  {benefit.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2">{benefit.title}</h3>
                <p className="text-slate-400 text-sm">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-slate-800/30">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-4">Illustrative Planning Prices</h2>
          <p className="text-slate-400 text-center mb-4 max-w-2xl mx-auto">
            These figures are unvalidated planning hypotheses, not an offer or procurement
            determination.
          </p>
          <p className="text-emerald-400 text-center mb-12 text-sm">
            Confirm the applicable purchasing process with your procurement authority.
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {PROCUREMENT_TIERS.map((tier, index) => (
              <div
                key={index}
                className={`rounded-2xl p-6 ${
                  tier.badge
                    ? 'bg-gradient-to-b from-emerald-900/50 to-slate-800 border-2 border-emerald-500'
                    : 'bg-slate-800/50 border border-slate-700'
                }`}
              >
                {tier.badge && (
                  <div className="text-center mb-4">
                    <span className="bg-emerald-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                      {tier.badge}
                    </span>
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold mb-2">{tier.name}</h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-3xl font-bold text-white">{tier.price}</span>
                    <span className="text-slate-400">{tier.period}</span>
                  </div>
                  <p className="text-xs text-emerald-400 mt-1">{tier.threshold}</p>
                  <p className="text-sm text-slate-400 mt-2">{tier.description}</p>
                </div>

                <ul className="space-y-3 mb-6">
                  {tier.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                      <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  to="/enterprise"
                  className={`block w-full py-3 rounded-lg font-semibold text-center transition-colors ${
                    tier.badge
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-slate-700 hover:bg-slate-600 text-white'
                  }`}
                >
                  {tier.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Program references; no integration, partnership, or funding claim */}
      <section className="py-20 border-t border-slate-800">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-6">Funding and procurement references</h2>
          <p className="text-slate-300 mb-8">
            Program fit, report acceptance, partnerships, and integrations have not been verified.
            Confirm requirements directly with the responsible organizations.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            {[
              { name: 'FCM GMF', desc: 'Applicant must verify current requirements' },
              { name: 'AICEI', desc: 'Program fit and eligibility unverified' },
              { name: 'ERA', desc: 'Program fit and eligibility unverified' },
              { name: 'MCCAC', desc: 'No CEIP integration or endorsement claimed' },
              { name: 'Alberta Climate Leaders', desc: 'No CEIP partnership claimed' },
              { name: 'Procurement', desc: 'Entity-specific review required' },
            ].map((fund, i) => (
              <div key={i} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                <div className="font-bold text-emerald-400">{fund.name}</div>
                <div className="text-xs text-slate-500">{fund.desc}</div>
              </div>
            ))}
          </div>

          <p className="text-sm text-slate-500">
            Program information is available from{' '}
            <a
              href="https://mccac.ca"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:underline"
            >
              MCCAC
            </a>{' '}
            and{' '}
            <a
              href="https://albertaclimateleaders.ca"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:underline"
            >
              Alberta Climate Leaders
            </a>{' '}
            . CEIP has not verified an endorsement, partnership, or integration with these
            organizations.
          </p>
        </div>
      </section>

      {/* Owner-gated municipal planning discussion */}
      <section className="py-16 bg-gradient-to-r from-emerald-900/20 to-teal-900/20 border-y border-emerald-500/20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <Mail className="h-10 w-10 text-emerald-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-3">Request a Municipal Planning Discussion</h2>
          <p className="text-slate-300 mb-6">
            Discuss whether a draft climate or TIER planning scenario could support your team. No
            audit, report, or savings outcome is promised.
          </p>
          {isLeadIntakeEnabled() ? (
            <>
              <PrivacyCollectionNotice className="mb-4 text-left" />
              {auditSubmitted ? (
                <div className="flex items-center justify-center gap-2 text-emerald-400">
                  <CheckCircle className="h-5 w-5" />
                  <span>
                    Request saved. The team may follow up after owner review using the contact
                    details you provided.
                  </span>
                </div>
              ) : (
                <div className="flex gap-3 max-w-lg mx-auto">
                  <input
                    type="email"
                    value={auditEmail}
                    onChange={(e) => setAuditEmail(e.target.value)}
                    placeholder="sustainability@yourmunicipality.ca"
                    aria-label="Municipal work email"
                    className="flex-1 px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    onClick={handleAuditSubmit}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-semibold transition-colors whitespace-nowrap"
                  >
                    Request Discussion
                  </button>
                </div>
              )}
            </>
          ) : (
            <PrivacyCollectionNotice className="text-left" />
          )}
          {auditError && <p className="mt-3 text-sm text-rose-400">{auditError}</p>}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 border-b border-slate-800">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-4">Frequently Asked Questions</h2>
          <p className="text-slate-400 text-center mb-10">
            Common questions from municipal procurement and sustainability teams
          </p>

          <div className="space-y-3">
            {FAQ_ITEMS.map((faq, i) => (
              <div
                key={i}
                className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-700/30 transition-colors"
                >
                  <span className="font-medium pr-4">{faq.q}</span>
                  {openFaq === i ? (
                    <ChevronUp className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-slate-400 flex-shrink-0" />
                  )}
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-4 text-sm text-slate-300 leading-relaxed">{faq.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-r from-emerald-900/30 to-teal-900/30 border-t border-emerald-500/30">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-6">Discuss a municipal pilot hypothesis</h2>
          <p className="text-slate-300 mb-4">
            Discuss fit, evidence needs, and the validations that a pilot would require.
          </p>
          <p className="text-emerald-400 text-sm mb-8">
            Pricing, scope, and procurement route require buyer and procurement review.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              to="/enterprise"
              className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors"
            >
              Request a Planning Discussion
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              to="/roi-calculator"
              className="inline-flex items-center gap-2 px-8 py-4 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors"
            >
              Review a TIER scenario
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8">
        <div className="max-w-7xl mx-auto px-6 text-center text-slate-500 text-sm">
          <p>© {new Date().getFullYear()} Canada Energy Intelligence Platform</p>
          <p className="mt-2">
            <Link to="/privacy" className="hover:text-white">
              Privacy
            </Link>
            {' • '}
            <Link to="/terms" className="hover:text-white">
              Terms
            </Link>
            {' • '}
            <Link to="/enterprise" className="hover:text-white">
              Enterprise
            </Link>
            {' • '}
            <Link to="/status" className="hover:text-white">
              System Status
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default MunicipalLandingPage;
