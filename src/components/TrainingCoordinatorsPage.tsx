/**
 * TrainingCoordinatorsPage - Landing Page for Training Program Coordinators
 * 
 * Target Audiences (from monetization research):
 * - Indigenous Skills & Employment Training (ISET) programs
 * - Community colleges with energy programs
 * - SME associations (CFIB, CME)
 * - Provincial utility rebate programs (Enbridge, FortisBC)
 * 
 * Goal: Convert training coordinators to cohort purchases ($3,000-5,000/cohort)
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  BookOpen,
  Award,
  BarChart3,
  CheckCircle,
  ArrowRight,
  Building2,
  Leaf,
  DollarSign,
  Calendar,
  MessageSquare,
  Download,
  Play,
  Star,
  Clock,
  Shield,
  Zap,
  GraduationCap,
  Target,
  TrendingUp
} from 'lucide-react';
import { SEOHead } from './SEOHead';

// Cohort pricing tiers
const COHORT_PACKAGES = [
  {
    id: 'starter',
    name: 'Starter Cohort',
    learners: 10,
    price: 1500,
    perLearner: 150,
    features: [
      'All 3 certificate tracks (15 modules)',
      'AI tutor access for all learners',
      'Progress tracking dashboard',
      'Completion certificates',
      'Email support'
    ],
    recommended: false
  },
  {
    id: 'standard',
    name: 'Standard Cohort',
    learners: 25,
    price: 3000,
    perLearner: 120,
    features: [
      'Everything in Starter',
      'Dedicated cohort admin panel',
      'Bulk enrollment via CSV',
      'Custom cohort branding',
      'Monthly progress reports',
      'Priority support'
    ],
    recommended: true
  },
  {
    id: 'enterprise',
    name: 'Enterprise Cohort',
    learners: 50,
    price: 5000,
    perLearner: 100,
    features: [
      'Everything in Standard',
      'Custom curriculum selection',
      'Instructor-of-record option',
      'CPD credit documentation',
      'On-demand reporting',
      'Dedicated success manager',
      'White-label certificates'
    ],
    recommended: false
  }
];

// Target audience segments
const AUDIENCE_SEGMENTS = [
  {
    id: 'iset',
    name: 'Indigenous Training Programs',
    icon: '🏔️',
    description: 'ISET holders preparing communities for energy transition careers',
    painPoint: 'Need culturally relevant, Canada-specific energy curriculum',
    solution: 'Indigenous energy sovereignty modules + TEK integration',
    fundingSource: 'Federal ISET funding, AICEI grants'
  },
  {
    id: 'colleges',
    name: 'Community Colleges',
    icon: '🎓',
    description: 'Energy technology programs seeking digital curriculum supplements',
    painPoint: 'Textbooks are outdated, students need hands-on data experience',
    solution: 'Real-time dashboards + AI tutoring + certificates',
    fundingSource: 'Tuition fees, provincial education grants'
  },
  {
    id: 'sme',
    name: 'SME Associations',
    icon: '🏭',
    description: 'Manufacturing and food processing members seeking energy literacy',
    painPoint: 'Members need training to access utility rebates',
    solution: 'Self-paced modules that prove competency for incentives',
    fundingSource: 'Member dues, utility partnership programs'
  },
  {
    id: 'utilities',
    name: 'Utility Rebate Programs',
    icon: '⚡',
    description: 'Enbridge, FortisBC requiring training completion for incentives',
    painPoint: 'Need verified training completion for rebate eligibility',
    solution: 'Verifiable certificates with completion codes',
    fundingSource: 'Utility DSM budgets'
  }
];

// Success metrics
const SUCCESS_METRICS = [
  { label: 'Average Completion Rate', value: '87%', icon: Target },
  { label: 'Learner Satisfaction', value: '4.8/5', icon: Star },
  { label: 'Time to Certificate', value: '6-8 weeks', icon: Clock },
  { label: 'Cost Savings vs. CIET', value: '96%', icon: DollarSign }
];

// Curriculum overview
const CERTIFICATE_TRACKS = [
  {
    name: 'Energy Fundamentals',
    modules: 5,
    duration: '10-15 hours',
    topics: ['Grid basics', 'Generation types', 'Demand management', 'Carbon pricing', 'Market structure']
  },
  {
    name: 'Clean Energy Transition',
    modules: 5,
    duration: '12-18 hours',
    topics: ['Solar/wind integration', 'Storage technologies', 'EV infrastructure', 'Hydrogen economy', 'Policy landscape']
  },
  {
    name: 'Industrial Decarbonization',
    modules: 5,
    duration: '15-20 hours',
    topics: ['OBPS compliance', 'Methane reduction', 'CCUS technology', 'ESG reporting', 'Net-zero pathways']
  }
];

export function TrainingCoordinatorsPage() {
  const [selectedAudience, setSelectedAudience] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    organization: '',
    role: '',
    learnersEstimate: '',
    message: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In production, this would send to a CRM or email service
    alert(`Thank you ${formData.name}! We'll contact you within 24 hours to discuss cohort options for ${formData.organization}.`);
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <SEOHead
        title="Training Coordinators | Cohort Energy Education Programs"
        description="Affordable, AI-powered energy training for Indigenous programs, colleges, and SME associations. $120/learner vs $2,500 for traditional CEM certification."
        path="/training-coordinators"
        keywords={['energy training', 'ISET energy program', 'college energy curriculum', 'workforce energy literacy', 'cohort learning']}
      />

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-cyan-600 via-blue-600 to-indigo-700 py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <span className="px-3 py-1 bg-white/20 rounded-full text-sm text-white">
              For Training Coordinators
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Energy Training Your Learners Can Actually Afford
          </h1>
          <p className="text-xl text-cyan-100 mb-8 max-w-3xl">
            CIET charges $2,500+ for CEM certification. We deliver Canada-specific energy education 
            with AI tutoring and real-time dashboards for <strong>$120/learner</strong>.
          </p>
          <div className="flex flex-wrap gap-4">
            <a
              href="#pricing"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-cyan-50 transition-colors"
            >
              View Cohort Pricing
              <ArrowRight className="h-5 w-5" />
            </a>
            <Link
              to="/certificates"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 text-white rounded-lg font-semibold hover:bg-white/20 transition-colors border border-white/30"
            >
              <Play className="h-5 w-5" />
              Preview Curriculum
            </Link>
          </div>
        </div>
      </div>

      {/* Success Metrics Bar */}
      <div className="bg-slate-800 border-b border-slate-700 py-6 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {SUCCESS_METRICS.map((metric) => (
              <div key={metric.label} className="text-center">
                <metric.icon className="h-6 w-6 text-cyan-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">{metric.value}</div>
                <div className="text-sm text-slate-400">{metric.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Who This Is For */}
      <div className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-4">
            Built for Training Program Coordinators
          </h2>
          <p className="text-slate-400 text-center mb-12 max-w-2xl mx-auto">
            Whether you're training Indigenous youth, college students, or SME employees, 
            our platform adapts to your learners' needs.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            {AUDIENCE_SEGMENTS.map((segment) => (
              <button
                key={segment.id}
                onClick={() => setSelectedAudience(selectedAudience === segment.id ? null : segment.id)}
                className={`p-6 rounded-xl border text-left transition-all ${
                  selectedAudience === segment.id
                    ? 'bg-cyan-500/10 border-cyan-500/50'
                    : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                }`}
              >
                <div className="flex items-start gap-4">
                  <span className="text-3xl">{segment.icon}</span>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-1">{segment.name}</h3>
                    <p className="text-sm text-slate-400 mb-3">{segment.description}</p>
                    
                    {selectedAudience === segment.id && (
                      <div className="space-y-3 mt-4 pt-4 border-t border-slate-700">
                        <div>
                          <span className="text-xs text-slate-500 uppercase">Pain Point</span>
                          <p className="text-sm text-amber-400">{segment.painPoint}</p>
                        </div>
                        <div>
                          <span className="text-xs text-slate-500 uppercase">Our Solution</span>
                          <p className="text-sm text-emerald-400">{segment.solution}</p>
                        </div>
                        <div>
                          <span className="text-xs text-slate-500 uppercase">Funding Source</span>
                          <p className="text-sm text-cyan-400">{segment.fundingSource}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Curriculum Overview */}
      <div className="py-16 px-6 bg-slate-800/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-4">
            3 Certificate Tracks, 15 Modules
          </h2>
          <p className="text-slate-400 text-center mb-12 max-w-2xl mx-auto">
            Canada-specific curriculum covering grid operations, clean energy transition, 
            and industrial decarbonization. Each module includes AI tutoring and hands-on dashboards.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {CERTIFICATE_TRACKS.map((track) => (
              <div key={track.name} className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <GraduationCap className="h-6 w-6 text-cyan-400" />
                  <h3 className="text-lg font-semibold text-white">{track.name}</h3>
                </div>
                <div className="flex items-center gap-4 mb-4 text-sm text-slate-400">
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-4 w-4" />
                    {track.modules} modules
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {track.duration}
                  </span>
                </div>
                <ul className="space-y-2">
                  {track.topics.map((topic) => (
                    <li key={topic} className="flex items-center gap-2 text-sm text-slate-300">
                      <CheckCircle className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                      {topic}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link
              to="/certificates"
              className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300"
            >
              Explore full curriculum
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div id="pricing" className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-4">
            Cohort Pricing
          </h2>
          <p className="text-slate-400 text-center mb-12 max-w-2xl mx-auto">
            Volume discounts that make quality energy education accessible. 
            All packages include full curriculum access, AI tutoring, and completion certificates.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {COHORT_PACKAGES.map((pkg) => (
              <div
                key={pkg.id}
                className={`relative rounded-xl border p-6 ${
                  pkg.recommended
                    ? 'bg-gradient-to-b from-cyan-500/10 to-slate-800 border-cyan-500/50'
                    : 'bg-slate-800 border-slate-700'
                }`}
              >
                {pkg.recommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 bg-cyan-500 text-white text-xs font-semibold rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}

                <h3 className="text-xl font-bold text-white mb-1">{pkg.name}</h3>
                <p className="text-sm text-slate-400 mb-4">Up to {pkg.learners} learners</p>

                <div className="mb-6">
                  <span className="text-4xl font-bold text-white">${pkg.price.toLocaleString()}</span>
                  <span className="text-slate-400 ml-2">CAD</span>
                  <div className="text-sm text-cyan-400 mt-1">
                    ${pkg.perLearner}/learner
                  </div>
                </div>

                <ul className="space-y-3 mb-6">
                  {pkg.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-slate-300">
                      <CheckCircle className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <a
                  href="#contact"
                  className={`block w-full py-3 rounded-lg font-semibold text-center transition-colors ${
                    pkg.recommended
                      ? 'bg-cyan-500 hover:bg-cyan-600 text-white'
                      : 'bg-slate-700 hover:bg-slate-600 text-white'
                  }`}
                >
                  Get Started
                </a>
              </div>
            ))}
          </div>

          <div className="mt-8 p-4 bg-slate-800 border border-slate-700 rounded-lg text-center">
            <p className="text-slate-400">
              <strong className="text-white">Custom needs?</strong> We offer flexible pricing for larger cohorts, 
              multi-year agreements, and specialized curriculum requirements.{' '}
              <a href="#contact" className="text-cyan-400 hover:underline">Contact us</a>
            </p>
          </div>
        </div>
      </div>

      {/* Why Us vs CIET */}
      <div className="py-16 px-6 bg-slate-800/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Why Training Coordinators Choose Us Over Traditional CEM
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span className="text-2xl">🏛️</span> Traditional CEM (CIET)
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-2 text-slate-400">
                  <span className="text-red-400">✗</span>
                  $2,500+ per learner
                </li>
                <li className="flex items-start gap-2 text-slate-400">
                  <span className="text-red-400">✗</span>
                  5-day in-person commitment
                </li>
                <li className="flex items-start gap-2 text-slate-400">
                  <span className="text-red-400">✗</span>
                  Generic North American content
                </li>
                <li className="flex items-start gap-2 text-slate-400">
                  <span className="text-red-400">✗</span>
                  No AI tutoring support
                </li>
                <li className="flex items-start gap-2 text-slate-400">
                  <span className="text-red-400">✗</span>
                  Static textbook materials
                </li>
              </ul>
            </div>

            <div className="bg-gradient-to-b from-cyan-500/10 to-slate-800 border border-cyan-500/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Zap className="h-6 w-6 text-cyan-400" />
                Canada Energy Academy
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-2 text-slate-300">
                  <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                  $100-150 per learner (cohort pricing)
                </li>
                <li className="flex items-start gap-2 text-slate-300">
                  <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                  Self-paced, 6-8 weeks typical
                </li>
                <li className="flex items-start gap-2 text-slate-300">
                  <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                  Canada-specific: AESO, IESO, provincial policies
                </li>
                <li className="flex items-start gap-2 text-slate-300">
                  <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                  AI tutor available 24/7
                </li>
                <li className="flex items-start gap-2 text-slate-300">
                  <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                  Real-time dashboards with live data
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Form */}
      <div id="contact" className="py-16 px-6">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-4">
            Start Your Cohort
          </h2>
          <p className="text-slate-400 text-center mb-8">
            Tell us about your training program. We'll respond within 24 hours with a customized proposal.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Your Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  placeholder="Jane Smith"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  placeholder="jane@organization.ca"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Organization *</label>
                <input
                  type="text"
                  required
                  value={formData.organization}
                  onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  placeholder="ISET Program / College / Association"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Your Role</label>
                <input
                  type="text"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  placeholder="Training Coordinator"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Estimated Number of Learners</label>
              <select
                value={formData.learnersEstimate}
                onChange={(e) => setFormData({ ...formData, learnersEstimate: e.target.value })}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              >
                <option value="">Select range...</option>
                <option value="1-10">1-10 learners</option>
                <option value="11-25">11-25 learners</option>
                <option value="26-50">26-50 learners</option>
                <option value="51-100">51-100 learners</option>
                <option value="100+">100+ learners</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Tell Us About Your Program</label>
              <textarea
                rows={4}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                placeholder="What are your training goals? Any specific topics or timeline requirements?"
              />
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
            >
              Request Cohort Proposal
              <ArrowRight className="h-5 w-5" />
            </button>
          </form>

          <p className="text-xs text-slate-500 text-center mt-4">
            We respect your privacy. No spam, ever.
          </p>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="py-8 px-6 border-t border-slate-800">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <Link to="/" className="text-slate-400 hover:text-white transition-colors">
            ← Back to Dashboard
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/certificates" className="text-cyan-400 hover:text-cyan-300">
              Preview Curriculum
            </Link>
            <Link to="/pricing" className="text-cyan-400 hover:text-cyan-300">
              Individual Pricing
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TrainingCoordinatorsPage;
