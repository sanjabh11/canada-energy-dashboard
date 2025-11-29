/**
 * IncubatorsPage Component
 * 
 * Landing page for CTN incubators with economic benefit calculator.
 * Addresses Gap #9: Incubator/CTN Targeting (MEDIUM Priority)
 * 
 * Usage:
 * <Route path="/incubators" element={<IncubatorsPage />} />
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Rocket,
  Calculator,
  TrendingUp,
  Users,
  DollarSign,
  Award,
  ArrowRight,
  CheckCircle,
  Building,
  Globe,
  Zap,
  FileText,
  Mail
} from 'lucide-react';
import { useTranslation } from '../lib/i18n';
import { HelpButton } from './HelpButton';
import { SEOHead, SEO_CONFIGS } from './SEOHead';

// Economic benefit calculator inputs
interface CalculatorInputs {
  cohortSize: number;
  programDurationMonths: number;
  avgSalaryIncrease: number;
  jobPlacementRate: number;
  capitalInvestment: number;
}

// Calculate DIA-SOURCE style metrics
function calculateEconomicBenefit(inputs: CalculatorInputs) {
  const { cohortSize, programDurationMonths, avgSalaryIncrease, jobPlacementRate, capitalInvestment } = inputs;
  
  const placedParticipants = Math.floor(cohortSize * (jobPlacementRate / 100));
  const annualSalaryImpact = placedParticipants * avgSalaryIncrease;
  const fiveYearEconomicImpact = annualSalaryImpact * 5;
  const taxRevenue = fiveYearEconomicImpact * 0.25; // Estimated tax contribution
  const jobsCreated = placedParticipants;
  const costPerJob = capitalInvestment / Math.max(jobsCreated, 1);
  const roi = ((fiveYearEconomicImpact - capitalInvestment) / capitalInvestment) * 100;

  return {
    placedParticipants,
    annualSalaryImpact,
    fiveYearEconomicImpact,
    taxRevenue,
    jobsCreated,
    costPerJob,
    roi
  };
}

const CTN_BENEFITS = [
  {
    icon: TrendingUp,
    title: 'Measurable Economic Impact',
    description: 'Track and report on job creation, salary increases, and GDP contribution metrics.'
  },
  {
    icon: Award,
    title: 'Priority Processing Eligibility',
    description: 'Demonstrate significant economic benefit for DIA-SOURCE priority assessment.'
  },
  {
    icon: Users,
    title: 'Cohort Management Tools',
    description: 'Built-in admin panel for managing learner cohorts, tracking completion, and generating reports.'
  },
  {
    icon: Globe,
    title: 'International Recognition',
    description: 'Credentials recognized by Canadian energy sector employers and aligned with NOC codes.'
  }
];

const PROGRAM_TRACKS = [
  {
    name: 'Grid Analytics Accelerator',
    duration: '12 weeks',
    outcomes: ['IESO/AESO data certification', 'Power BI mastery', 'Capstone project'],
    placementRate: '85%'
  },
  {
    name: 'Decarbonization Bootcamp',
    duration: '16 weeks',
    outcomes: ['GHG Protocol certification', 'TCFD reporting', 'Net-zero pathway modeling'],
    placementRate: '90%'
  },
  {
    name: 'Indigenous Energy Fellowship',
    duration: '20 weeks',
    outcomes: ['FPIC/OCAP® certification', 'Consultation protocols', 'Community partnership'],
    placementRate: '80%'
  }
];

export function IncubatorsPage() {
  const { t } = useTranslation();
  
  const [calculatorInputs, setCalculatorInputs] = useState<CalculatorInputs>({
    cohortSize: 25,
    programDurationMonths: 4,
    avgSalaryIncrease: 15000,
    jobPlacementRate: 85,
    capitalInvestment: 500000
  });

  const metrics = calculateEconomicBenefit(calculatorInputs);

  // SEO Head for incubators page
  const seoConfig = SEO_CONFIGS.incubators;

  const updateInput = (field: keyof CalculatorInputs, value: number) => {
    setCalculatorInputs(prev => ({ ...prev, [field]: value }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <SEOHead {...seoConfig} />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-slate-900 via-emerald-900/20 to-slate-900 py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-600 rounded-lg">
              <Rocket className="h-6 w-6 text-white" />
            </div>
            <span className="text-emerald-400 font-medium">{t.incubators.badgeLabel}</span>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <h1 className="text-4xl md:text-5xl font-bold text-white">
              {t.incubators.heroTitle}
            </h1>
            <HelpButton id="page.incubators.overview" />
          </div>
          <p className="text-xl text-slate-300 max-w-3xl mb-8">
            {t.incubators.heroSubtitle}
          </p>

          <div className="flex flex-wrap gap-4">
            <a
              href="#calculator"
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
            >
              <Calculator className="h-5 w-5" />
              {t.incubators.ctaCalculator}
            </a>
            <Link
              to="/admin/cohorts"
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
            >
              <Users className="h-5 w-5" />
              {t.incubators.ctaCohortDemo}
            </Link>
          </div>
        </div>
      </section>

      {/* Benefits Grid */}
      <section className="py-16 px-6 border-b border-slate-800">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center gap-3 mb-8">
            <h2 className="text-2xl font-bold text-white">
              {t.incubators.sectionWhyChoose}
            </h2>
            <HelpButton id="page.incubators.benefits" />
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {CTN_BENEFITS.map((benefit, i) => {
              const Icon = benefit.icon;
              return (
                <div
                  key={i}
                  className="p-6 bg-slate-800 border border-slate-700 rounded-xl"
                >
                  <div className="p-3 bg-emerald-600/20 rounded-lg w-fit mb-4">
                    <Icon className="h-6 w-6 text-emerald-400" />
                  </div>
                  <h3 className="font-semibold text-white mb-2">{benefit.title}</h3>
                  <p className="text-sm text-slate-400">{benefit.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Economic Benefit Calculator */}
      <section id="calculator" className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600/20 rounded-full text-emerald-400 text-sm font-medium mb-4">
              <Calculator className="h-4 w-4" />
              {t.incubators.metricBadgeLabel}
            </div>
            <div className="flex items-center justify-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-white">
                {t.incubators.sectionCalculatorTitle}
              </h2>
              <HelpButton id="page.incubators.calculator" />
            </div>
            <p className="text-slate-400 max-w-2xl mx-auto">
              {t.incubators.sectionCalculatorSubtitle}
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Inputs */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-6">{t.incubators.sectionInputsTitle}</h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm text-slate-300 mb-2">
                    Cohort Size (participants)
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={calculatorInputs.cohortSize}
                    onChange={(e) => updateInput('cohortSize', parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>10</span>
                    <span className="text-emerald-400 font-medium">{calculatorInputs.cohortSize}</span>
                    <span>100</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-2">
                    Program Duration (months)
                  </label>
                  <input
                    type="range"
                    min="3"
                    max="12"
                    value={calculatorInputs.programDurationMonths}
                    onChange={(e) => updateInput('programDurationMonths', parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>3</span>
                    <span className="text-emerald-400 font-medium">{calculatorInputs.programDurationMonths} months</span>
                    <span>12</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-2">
                    Avg. Salary Increase (CAD/year)
                  </label>
                  <input
                    type="range"
                    min="5000"
                    max="50000"
                    step="1000"
                    value={calculatorInputs.avgSalaryIncrease}
                    onChange={(e) => updateInput('avgSalaryIncrease', parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>$5K</span>
                    <span className="text-emerald-400 font-medium">{formatCurrency(calculatorInputs.avgSalaryIncrease)}</span>
                    <span>$50K</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-2">
                    Job Placement Rate (%)
                  </label>
                  <input
                    type="range"
                    min="50"
                    max="100"
                    value={calculatorInputs.jobPlacementRate}
                    onChange={(e) => updateInput('jobPlacementRate', parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>50%</span>
                    <span className="text-emerald-400 font-medium">{calculatorInputs.jobPlacementRate}%</span>
                    <span>100%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-2">
                    Capital Investment (CAD)
                  </label>
                  <input
                    type="range"
                    min="100000"
                    max="2000000"
                    step="50000"
                    value={calculatorInputs.capitalInvestment}
                    onChange={(e) => updateInput('capitalInvestment', parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>$100K</span>
                    <span className="text-emerald-400 font-medium">{formatCurrency(calculatorInputs.capitalInvestment)}</span>
                    <span>$2M</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-6">{t.incubators.sectionMetricsTitle}</h3>

              <div className="space-y-4">
                <div className="p-4 bg-emerald-600/10 border border-emerald-500/30 rounded-lg">
                  <div className="text-sm text-emerald-400 mb-1">5-Year Economic Impact</div>
                  <div className="text-3xl font-bold text-white">
                    {formatCurrency(metrics.fiveYearEconomicImpact)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-700/50 rounded-lg">
                    <div className="text-xs text-slate-400 mb-1">Jobs Created</div>
                    <div className="text-xl font-semibold text-white">{metrics.jobsCreated}</div>
                  </div>
                  <div className="p-4 bg-slate-700/50 rounded-lg">
                    <div className="text-xs text-slate-400 mb-1">Placed Participants</div>
                    <div className="text-xl font-semibold text-white">{metrics.placedParticipants}</div>
                  </div>
                  <div className="p-4 bg-slate-700/50 rounded-lg">
                    <div className="text-xs text-slate-400 mb-1">Annual Salary Impact</div>
                    <div className="text-xl font-semibold text-emerald-400">
                      {formatCurrency(metrics.annualSalaryImpact)}
                    </div>
                  </div>
                  <div className="p-4 bg-slate-700/50 rounded-lg">
                    <div className="text-xs text-slate-400 mb-1">Tax Revenue (Est.)</div>
                    <div className="text-xl font-semibold text-white">
                      {formatCurrency(metrics.taxRevenue)}
                    </div>
                  </div>
                  <div className="p-4 bg-slate-700/50 rounded-lg">
                    <div className="text-xs text-slate-400 mb-1">Cost per Job</div>
                    <div className="text-xl font-semibold text-white">
                      {formatCurrency(metrics.costPerJob)}
                    </div>
                  </div>
                  <div className="p-4 bg-slate-700/50 rounded-lg">
                    <div className="text-xs text-slate-400 mb-1">5-Year ROI</div>
                    <div className={`text-xl font-semibold ${metrics.roi > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {metrics.roi.toFixed(0)}%
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-900/30 border border-blue-700 rounded-lg">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-blue-300">{t.incubators.sectionPriorityTitle}</h4>
                      <p className="text-sm text-blue-200/80 mt-1">
                        {t.incubators.sectionPriorityBody}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => alert('Generating Economic Impact Report PDF...')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
                >
                  <FileText className="h-5 w-5" />
                  Download Impact Report
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Program Tracks */}
      <section className="py-16 px-6 border-t border-slate-800">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center gap-3 mb-8">
            <h2 className="text-2xl font-bold text-white">
              {t.incubators.sectionTracksTitle}
            </h2>
            <HelpButton id="page.incubators.tracks" />
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {PROGRAM_TRACKS.map((track, i) => (
              <div
                key={i}
                className="p-6 bg-slate-800 border border-slate-700 rounded-xl"
              >
                <h3 className="text-lg font-semibold text-white mb-2">{track.name}</h3>
                <div className="flex items-center gap-4 text-sm text-slate-400 mb-4">
                  <span>{track.duration}</span>
                  <span className="text-emerald-400">{track.placementRate} placement</span>
                </div>
                <ul className="space-y-2">
                  {track.outcomes.map((outcome, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-slate-300">
                      <CheckCircle className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                      {outcome}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-6 bg-gradient-to-br from-emerald-900/30 to-slate-900">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            {t.incubators.sectionReadyTitle}
          </h2>
          <p className="text-slate-300 mb-8">
            {t.incubators.sectionReadySubtitle}
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="mailto:incubators@canada-energy.ca?subject=Incubator Partnership Inquiry"
              className="inline-flex items-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
            >
              <Mail className="h-5 w-5" />
              {t.incubators.ctaContactPartnerships}
            </a>
            <Link
              to="/api-docs"
              className="inline-flex items-center gap-2 px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
            >
              <Zap className="h-5 w-5" />
              {t.incubators.ctaApiDocs}
            </Link>
          </div>
        </div>
      </section>

      {/* Footer Navigation */}
      <div className="py-8 px-6 border-t border-slate-800">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link
            to="/employers"
            className="text-slate-400 hover:text-white transition-colors"
          >
            {t.incubators.linkForEmployers}
          </Link>
          <Link
            to="/"
            className="text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            {t.incubators.linkBackToDashboard}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default IncubatorsPage;
