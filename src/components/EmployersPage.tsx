/**
 * EmployersPage - LMIA-Ready "Hire Me" Landing Page
 * 
 * Redesigned for Alberta employers per Gemini research recommendations.
 * Demonstrates: Technical capabilities, LMIA readiness, and local commitment.
 * 
 * @author Sanjay Bhargava
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Users,
  Award,
  Download,
  FileText,
  ArrowRight,
  CheckCircle,
  Briefcase,
  MapPin,
  Globe,
  Zap,
  Mail,
  ExternalLink,
  Play,
  Code,
  Database,
  BarChart3,
  Shield,
  Clock,
  Heart
} from 'lucide-react';
import { HelpButton } from './HelpButton';
import { SEOHead, SEO_CONFIGS } from './SEOHead';

// Case studies showcasing technical depth
const CASE_STUDIES = [
  {
    id: 'aeso-integration',
    title: 'Real-Time AESO Grid Analytics',
    description: 'Live integration with Alberta Electric System Operator APIs for demand monitoring, pool pricing, and storage dispatch tracking.',
    metrics: [
      { label: 'Data Latency', value: '<1 sec' },
      { label: 'Uptime', value: '99.9%' },
      { label: 'API Endpoints', value: '15+' }
    ],
    tech: ['React', 'Supabase Edge Functions', 'AESO REST API', 'Recharts'],
    link: '/dashboard',
    image: '📊'
  },
  {
    id: 'indigenous-sovereignty',
    title: 'Indigenous Data Sovereignty Dashboard',
    description: 'OCAP®-compliant platform for First Nations energy project tracking with FPIC workflow management and TEK integration.',
    metrics: [
      { label: 'FPIC Workflows', value: '3 stages' },
      { label: 'Territory Mapping', value: 'Live' },
      { label: 'Data Governance', value: 'OCAP®' }
    ],
    tech: ['React', 'Mapbox', 'Supabase RLS', 'UNDRIP compliance'],
    link: '/indigenous',
    image: '🏔️'
  },
  {
    id: 'compliance-automation',
    title: 'Regulatory Compliance Automation',
    description: 'Automated AUC Rule 007 compliance checking and CER reporting for micro-generation and pipeline operators.',
    metrics: [
      { label: 'Forms Automated', value: '5+' },
      { label: 'Compliance Rate', value: '100%' },
      { label: 'Time Saved', value: '40%' }
    ],
    tech: ['Python', 'PDF parsing', 'AUC Form A', 'CER standards'],
    link: '/climate-policy',
    image: '⚖️'
  }
];

// GTS-eligible NOC codes demonstrated by this platform
const NOC_ALIGNMENT = [
  { code: '21232', title: 'Software Developer/Programmer', match: 'Primary' },
  { code: '21231', title: 'Software Engineer', match: 'Primary' },
  { code: '21211', title: 'Data Scientist', match: 'Secondary' },
  { code: '21223', title: 'Database Analyst', match: 'Secondary' }
];

export function EmployersPage() {
  const [activeCase, setActiveCase] = useState(CASE_STUDIES[0]);

  const handleContactHire = () => {
    window.location.href = 'mailto:sanjabh11@gmail.com?subject=Employment Inquiry - LMIA/GTS Position&body=Hi Sanjay,%0A%0AI am interested in discussing a potential role at our organization.%0A%0ACompany:%0APosition:%0ATimeline:%0A%0ABest regards';
  };

  const handleDownloadResume = () => {
    window.open('/resume-canada.md', '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <SEOHead
        title="Hire Sanjay Bhargava | Senior Software Engineer - Alberta LMIA Ready"
        description="34 years enterprise experience, AESO integration expert. Relocating to Calgary. LMIA documentation provided."
        path="/hire-me"
        keywords={['Alberta hire software engineer', 'LMIA ready developer', 'Calgary tech jobs', 'Global Talent Stream']}
      />

      {/* Hero Section - "Hire Me" Focus */}
      <section className="bg-gradient-to-br from-slate-900 via-emerald-900/20 to-slate-900 py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Personal Value Prop */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-emerald-600 rounded-lg">
                  <MapPin className="h-6 w-6 text-white" />
                </div>
                <span className="text-emerald-400 font-medium">Relocating to Calgary, AB</span>
              </div>

              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Hire a Senior Engineer Who<br />
                <span className="text-emerald-400">Already Built Your Solution</span>
              </h1>

              <p className="text-xl text-slate-300 mb-6">
                34 years architecting enterprise platforms. Expert in AESO integration,
                Indigenous data sovereignty, and Alberta energy markets.
                <strong className="text-white"> Family in Calgary. Ready to relocate.</strong>
              </p>

              <div className="flex flex-wrap gap-4 mb-8">
                <button
                  onClick={handleContactHire}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
                >
                  <Mail className="h-5 w-5" />
                  Contact Me Directly
                </button>
                <button
                  onClick={handleDownloadResume}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                >
                  <Download className="h-5 w-5" />
                  Download Resume
                </button>
              </div>

              {/* LMIA Value Prop */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                <div className="flex items-center gap-2 text-emerald-400 mb-2">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-semibold">LMIA-Ready: I Simplify Your Hiring</span>
                </div>
                <p className="text-sm text-slate-400">
                  I provide HR-ready job descriptions, NOC alignment documents, and Global Talent Stream
                  supporting materials. Typical processing: 4-6 weeks from offer.
                </p>
              </div>
            </div>

            {/* Right: Live Dashboard Preview */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              <div className="bg-slate-700 px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-slate-300 font-medium">Live Dashboard Demo</span>
                <Link
                  to="/"
                  className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                >
                  Open Full Dashboard <ExternalLink className="h-4 w-4" />
                </Link>
              </div>
              <div className="p-4">
                <div className="aspect-video bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-6xl mb-4">📊</div>
                    <p className="text-slate-400 text-sm mb-4">Canada Energy Intelligence Platform</p>
                    <Link
                      to="/"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      <Play className="h-4 w-4" />
                      Launch Live Demo
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* NOC Alignment Section */}
      <section className="py-12 px-6 bg-slate-800/30 border-y border-slate-800">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Briefcase className="h-6 w-6 text-emerald-400" />
            <h2 className="text-xl font-bold text-white">Global Talent Stream Eligible (Category B)</h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {NOC_ALIGNMENT.map((noc) => (
              <div
                key={noc.code}
                className={`p-4 rounded-lg border ${noc.match === 'Primary'
                  ? 'bg-emerald-600/10 border-emerald-500/30'
                  : 'bg-slate-800 border-slate-700'
                  }`}
              >
                <div className="text-lg font-mono text-white mb-1">NOC {noc.code}</div>
                <div className="text-sm text-slate-300">{noc.title}</div>
                <div className={`text-xs mt-2 ${noc.match === 'Primary' ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {noc.match} Match
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Case Studies Section */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <h2 className="text-2xl font-bold text-white">Technical Case Studies</h2>
            <HelpButton id="page.employers.casestudies" />
          </div>
          <p className="text-slate-400 mb-8">
            Proof of capability: These features are live on this platform. Click to explore.
          </p>

          <div className="grid lg:grid-cols-3 gap-6">
            {CASE_STUDIES.map((study) => (
              <div
                key={study.id}
                className={`p-6 rounded-xl border transition-all cursor-pointer ${activeCase?.id === study.id
                  ? 'bg-emerald-600/10 border-emerald-500/50'
                  : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                  }`}
                onClick={() => setActiveCase(study)}
              >
                <div className="text-4xl mb-4">{study.image}</div>
                <h3 className="text-lg font-semibold text-white mb-2">{study.title}</h3>
                <p className="text-sm text-slate-400 mb-4">{study.description}</p>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  {study.metrics.map((metric, i) => (
                    <div key={i} className="text-center">
                      <div className="text-lg font-semibold text-emerald-400">{metric.value}</div>
                      <div className="text-xs text-slate-500">{metric.label}</div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-1 mb-4">
                  {study.tech.map((tech, i) => (
                    <span key={i} className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300">
                      {tech}
                    </span>
                  ))}
                </div>

                <Link
                  to={study.link}
                  className="inline-flex items-center gap-1 text-sm text-emerald-400 hover:text-emerald-300"
                >
                  View Live Feature <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Hire Experience Section */}
      <section className="py-16 px-6 bg-slate-800/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-8">
            Why Hire 34 Years of Experience?
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Shield,
                title: 'No Experimentation on Your Systems',
                desc: 'Proven track record managing $60M programs. Your mission-critical systems are safe.'
              },
              {
                icon: Clock,
                title: 'Perfect for 12-24 Month Mandates',
                desc: 'Seeking 3-5 year horizon, not 10+ year ladder climbing. Get senior expertise without long-term HR commitment.'
              },
              {
                icon: BarChart3,
                title: '$21M Cost Savings Delivered',
                desc: '35% cost reduction through RPA/AI automation at Wipro. Directly applicable to energy sector optimization.'
              },
              {
                icon: Users,
                title: 'No Learning Curve on Stakeholders',
                desc: '34 years engaging C-suite, board members, regulators. Mature professional who understands compliance-first culture.'
              },
              {
                icon: Heart,
                title: 'Family in Calgary = Retention',
                desc: 'Blood relative in Alberta. This is a permanent relocation, not a stepping stone to Toronto.'
              },
              {
                icon: Code,
                title: 'Already Built Your Solution',
                desc: "This dashboard proves I understand AESO, grid operations, Indigenous sovereignty. Not theoretical expertise."
              }
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="p-6 bg-slate-800 border border-slate-700 rounded-xl">
                  <div className="p-3 bg-emerald-600/20 rounded-lg w-fit mb-4">
                    <Icon className="h-6 w-6 text-emerald-400" />
                  </div>
                  <h3 className="font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-400">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-6 bg-gradient-to-br from-emerald-900/30 to-slate-900">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Simplify Your Hiring?
          </h2>
          <p className="text-slate-300 mb-8">
            I provide all LMIA documentation. You just need to extend the offer.
            Typical timeline: 4-6 weeks from offer to work permit.
          </p>

          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <button
              onClick={handleContactHire}
              className="inline-flex items-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
            >
              <Mail className="h-5 w-5" />
              Email Me: sanjabh11@gmail.com
            </button>
            <button
              onClick={handleDownloadResume}
              className="inline-flex items-center gap-2 px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
            >
              <Download className="h-5 w-5" />
              Download Full Resume
            </button>
          </div>

          <div className="text-sm text-slate-500">
            Portfolio: <a href="https://igniteitserve.com/" className="text-emerald-400 hover:underline" target="_blank" rel="noopener noreferrer">igniteitserve.com</a>
            {' • '}
            LinkedIn: <a href="https://linkedin.com/in/bhargavasanjay" className="text-emerald-400 hover:underline" target="_blank" rel="noopener noreferrer">bhargavasanjay</a>
          </div>
        </div>
      </section>

      {/* Footer Navigation */}
      <div className="py-8 px-6 border-t border-slate-800">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link
            to="/"
            className="text-slate-400 hover:text-white transition-colors"
          >
            ← Back to Dashboard
          </Link>
          <Link
            to="/incubators"
            className="text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            For Accelerators & Incubators →
          </Link>
        </div>
      </div>
    </div>
  );
}

export default EmployersPage;
