/**
 * EmployersPage Component
 * 
 * Landing page for employers with LMIA-friendly profiles and capability PDFs.
 * Addresses Gap #8: Employer Conversion Pathways (MEDIUM Priority)
 * 
 * Usage:
 * <Route path="/employers" element={<EmployersPage />} />
 */

import React from 'react';
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
  GraduationCap,
  Globe,
  Zap,
  Mail
} from 'lucide-react';
import { useTranslation } from '../lib/i18n';
import { HelpButton } from './HelpButton';
import { SEOHead, SEO_CONFIGS } from './SEOHead';

// Capability profiles that employers can download
const CAPABILITY_PROFILES = [
  {
    id: 'energy-analyst',
    title: 'Energy Data Analyst',
    description: 'Professionals skilled in real-time grid analytics, demand forecasting, and energy market analysis.',
    skills: ['IESO/AESO data analysis', 'Power BI / Tableau', 'Python data science', 'Energy market modeling'],
    noc: '21211 - Data scientists',
    salary: '$75,000 - $110,000',
    demand: 'High'
  },
  {
    id: 'decarbonization-specialist',
    title: 'Decarbonization Specialist',
    description: 'Experts in carbon reduction strategies, ESG compliance, and sustainability reporting.',
    skills: ['GHG Protocol', 'TCFD reporting', 'Carbon pricing analysis', 'Net-zero pathway modeling'],
    noc: '21110 - Environmental auditors',
    salary: '$85,000 - $130,000',
    demand: 'Very High'
  },
  {
    id: 'indigenous-liaison',
    title: 'Indigenous Energy Liaison',
    description: 'Specialists in Indigenous consultation, FPIC processes, and community partnership development.',
    skills: ['UNDRIP compliance', 'Consultation protocols', 'Community engagement', 'Benefit-sharing agreements'],
    noc: '41401 - Policy researchers',
    salary: '$70,000 - $100,000',
    demand: 'High'
  },
  {
    id: 'grid-integration',
    title: 'Grid Integration Engineer',
    description: 'Engineers focused on renewable integration, storage optimization, and grid stability.',
    skills: ['Power systems analysis', 'Battery storage', 'Interconnection queue', 'SCADA systems'],
    noc: '21310 - Electrical engineers',
    salary: '$90,000 - $140,000',
    demand: 'Very High'
  }
];

const PARTNERSHIP_BENEFITS = [
  {
    icon: Users,
    title: 'Pre-Qualified Talent Pool',
    description: 'Access candidates who have completed CEIP certification tracks with verified competencies.'
  },
  {
    icon: Award,
    title: 'Digital Credentials',
    description: 'Verify candidate skills through blockchain-backed certificates and achievement badges.'
  },
  {
    icon: FileText,
    title: 'LMIA-Ready Documentation',
    description: 'Standardized capability profiles aligned with NOC codes for streamlined work permit applications.'
  },
  {
    icon: Globe,
    title: 'Cross-Border Hiring',
    description: 'Connect with international talent familiar with Canadian energy regulations and markets.'
  }
];

export function EmployersPage() {
  const { t } = useTranslation();

  const handleDownloadProfile = (profileId: string) => {
    // In production, this would generate a PDF
    alert(`Downloading ${profileId} capability profile PDF...`);
  };

  const handleContactSales = () => {
    window.location.href = 'mailto:employers@canada-energy.ca?subject=Employer Partnership Inquiry';
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <SEOHead {...SEO_CONFIGS.employers} />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-slate-900 via-blue-900/20 to-slate-900 py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <span className="text-blue-400 font-medium">{t.employers.badgeLabel}</span>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <h1 className="text-4xl md:text-5xl font-bold text-white">
              {t.employers.heroTitle}
            </h1>
            <HelpButton id="page.employers.overview" />
          </div>
          <p className="text-xl text-slate-300 max-w-3xl mb-8">
            {t.employers.heroSubtitle}
          </p>

          <div className="flex flex-wrap gap-4">
            <button
              onClick={handleContactSales}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <Mail className="h-5 w-5" />
              {t.employers.ctaContactSales}
            </button>
            <Link
              to="/certificates"
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
            >
              <GraduationCap className="h-5 w-5" />
              {t.employers.ctaViewTracks}
            </Link>
          </div>
        </div>
      </section>

      {/* Benefits Grid */}
      <section className="py-16 px-6 border-b border-slate-800">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center gap-3 mb-8">
            <h2 className="text-2xl font-bold text-white">
              {t.employers.sectionWhyPartner}
            </h2>
            <HelpButton id="page.employers.partnership" />
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PARTNERSHIP_BENEFITS.map((benefit, i) => {
              const Icon = benefit.icon;
              return (
                <div
                  key={i}
                  className="p-6 bg-slate-800 border border-slate-700 rounded-xl"
                >
                  <div className="p-3 bg-blue-600/20 rounded-lg w-fit mb-4">
                    <Icon className="h-6 w-6 text-blue-400" />
                  </div>
                  <h3 className="font-semibold text-white mb-2">{benefit.title}</h3>
                  <p className="text-sm text-slate-400">{benefit.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Capability Profiles */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-white">
                  {t.employers.sectionCapabilityProfiles}
                </h2>
                <HelpButton id="page.employers.profiles" />
              </div>
              <p className="text-slate-400">
                {t.employers.sectionCapabilitySubtitle}
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {CAPABILITY_PROFILES.map((profile) => (
              <div
                key={profile.id}
                className="p-6 bg-slate-800 border border-slate-700 rounded-xl hover:border-slate-600 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">
                      {profile.title}
                    </h3>
                    <p className="text-sm text-slate-400">{profile.description}</p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded ${
                      profile.demand === 'Very High'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-amber-500/20 text-amber-400'
                    }`}
                  >
                    {profile.demand} Demand
                  </span>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Briefcase className="h-4 w-4 text-slate-500" />
                    <span className="text-slate-400">NOC:</span>
                    <span className="text-slate-200">{profile.noc}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Zap className="h-4 w-4 text-slate-500" />
                    <span className="text-slate-400">Salary Range:</span>
                    <span className="text-emerald-400">{profile.salary}</span>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-xs text-slate-500 mb-2">Key Skills:</p>
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.map((skill, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => handleDownloadProfile(profile.id)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg text-blue-400 text-sm font-medium transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Download Profile PDF
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-6 bg-gradient-to-br from-blue-900/30 to-slate-900">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            {t.employers.sectionReadyTitle}
          </h2>
          <p className="text-slate-300 mb-8">
            {t.employers.sectionReadySubtitle}
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={handleContactSales}
              className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Schedule a Demo
              <ArrowRight className="h-5 w-5" />
            </button>
            <Link
              to="/api-docs"
              className="inline-flex items-center gap-2 px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
            >
              <FileText className="h-5 w-5" />
              {t.employers.ctaApiIntegration}
            </Link>
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
            {t.employers.linkBackToDashboard}
          </Link>
          <Link
            to="/incubators"
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            {t.employers.linkForIncubators}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default EmployersPage;
