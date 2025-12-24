/**
 * Enterprise Contact Page - Bypasses Whop for B2B Sales
 * 
 * WHY THIS IS IMPORTANT (whop_criterias.md Section 7):
 * "Don't use Whop for B2B Enterprise sales. The checkout experience 
 * (often featuring gaming/crypto aesthetics) can alienate conservative 
 * corporate buyers."
 * 
 * This page provides:
 * 1. Professional B2B-focused design (no gaming aesthetics)
 * 2. Contact form for custom quotes
 * 3. Enterprise features list
 * 4. Option for manual invoicing via Stripe (future)
 * 
 * Route: /enterprise
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Building2,
    Users,
    Shield,
    FileText,
    Phone,
    Mail,
    CheckCircle,
    ArrowRight,
    Zap,
    BarChart3,
    Lock,
    HeadphonesIcon
} from 'lucide-react';

interface EnterpriseFormData {
    companyName: string;
    contactName: string;
    email: string;
    phone: string;
    teamSize: string;
    message: string;
}

export function EnterprisePage() {
    const [formData, setFormData] = useState<EnterpriseFormData>({
        companyName: '',
        contactName: '',
        email: '',
        phone: '',
        teamSize: 'small',
        message: ''
    });
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // In production, send to backend API
        // For now, simulate submission
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Store lead locally (Dual Capture pattern)
        const leads = JSON.parse(localStorage.getItem('ceip_enterprise_leads') || '[]');
        leads.push({
            ...formData,
            timestamp: new Date().toISOString(),
            source: 'enterprise_page'
        });
        localStorage.setItem('ceip_enterprise_leads', JSON.stringify(leads));

        setLoading(false);
        setSubmitted(true);
    };

    const enterpriseFeatures = [
        {
            icon: <Users className="h-6 w-6" />,
            title: 'Multi-User Accounts',
            description: 'Unlimited team members with role-based access control'
        },
        {
            icon: <BarChart3 className="h-6 w-6" />,
            title: 'Custom Dashboards',
            description: 'Tailored analytics for your specific energy portfolio'
        },
        {
            icon: <Zap className="h-6 w-6" />,
            title: 'API Access',
            description: 'Full API access with dedicated rate limits and SLA'
        },
        {
            icon: <Shield className="h-6 w-6" />,
            title: 'Regulatory Compliance',
            description: 'ESG reporting, emissions tracking, and audit trails'
        },
        {
            icon: <FileText className="h-6 w-6" />,
            title: 'Custom Invoicing',
            description: 'NET-30/NET-60 payment terms, PO acceptance, wire transfers'
        },
        {
            icon: <HeadphonesIcon className="h-6 w-6" />,
            title: 'Priority Support',
            description: 'Dedicated account manager, <4hr response time, on-site training'
        }
    ];

    return (
        <div className="min-h-screen bg-slate-900 text-white">
            {/* Header */}
            <header className="bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500 rounded-lg">
                            <Building2 className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <span className="font-bold text-lg">CEIP Enterprise</span>
                            <span className="text-slate-400 text-sm ml-2">Canada Energy Intelligence Platform</span>
                        </div>
                    </Link>
                    <nav className="flex items-center gap-4">
                        <Link to="/pricing" className="text-slate-300 hover:text-white transition-colors">
                            See Pricing
                        </Link>
                        <Link to="/contact" className="text-slate-300 hover:text-white transition-colors">
                            Contact
                        </Link>
                    </nav>
                </div>
            </header>

            {/* Hero */}
            <section className="bg-gradient-to-b from-slate-800 to-slate-900 py-20">
                <div className="max-w-7xl mx-auto px-6 text-center">
                    <div className="inline-flex items-center gap-2 bg-amber-500/20 text-amber-300 px-4 py-2 rounded-full text-sm mb-6">
                        <Lock className="h-4 w-4" />
                        SOC 2 Compliant
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold mb-6">
                        Energy Intelligence<br />
                        <span className="text-amber-400">for the Enterprise</span>
                    </h1>
                    <p className="text-xl text-slate-300 max-w-3xl mx-auto mb-8">
                        Custom solutions for utilities, energy companies, and corporate sustainability teams.
                        Full API access, dedicated support, and enterprise-grade security.
                    </p>
                    <div className="flex items-center justify-center gap-4">
                        <a href="#contact-form" className="px-8 py-4 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-lg transition-colors flex items-center gap-2">
                            Contact Sales
                            <ArrowRight className="h-5 w-5" />
                        </a>
                        <Link to="/api-docs" className="px-8 py-4 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors">
                            View API Docs
                        </Link>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-20 border-b border-slate-800">
                <div className="max-w-7xl mx-auto px-6">
                    <h2 className="text-3xl font-bold text-center mb-4">Enterprise Features</h2>
                    <p className="text-slate-400 text-center mb-12 max-w-2xl mx-auto">
                        Everything in CEIP Advanced, plus enterprise-grade capabilities
                    </p>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {enterpriseFeatures.map((feature, index) => (
                            <div key={index} className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                                <div className="w-12 h-12 bg-amber-500/20 rounded-lg flex items-center justify-center text-amber-400 mb-4">
                                    {feature.icon}
                                </div>
                                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                                <p className="text-slate-400 text-sm">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing Info */}
            <section className="py-20 bg-slate-800/30">
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <h2 className="text-3xl font-bold mb-6">Flexible Enterprise Pricing</h2>
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8">
                        <p className="text-5xl font-bold text-amber-400 mb-2">
                            Starting at $99<span className="text-xl text-slate-400">/month</span>
                        </p>
                        <p className="text-slate-300 mb-6">
                            Volume discounts available for teams of 10+
                        </p>
                        <ul className="text-left max-w-md mx-auto space-y-3 mb-8">
                            {[
                                'Annual contracts with NET-30 invoicing',
                                'Volume discounts: 15% off 5+ seats, 25% off 10+ seats',
                                'Custom data integrations at no extra cost',
                                'On-premise deployment options available'
                            ].map((item, i) => (
                                <li key={i} className="flex items-start gap-3">
                                    <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                                    <span className="text-slate-300">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </section>

            {/* Grant Stacking Pathway - Research Validated */}
            <section className="py-20 border-b border-slate-800">
                <div className="max-w-4xl mx-auto px-6">
                    <h2 className="text-3xl font-bold text-center mb-4">Municipal Funding Pathway</h2>
                    <p className="text-slate-400 text-center mb-8">
                        Validate with us, then unlock non-dilutive funding for deployment
                    </p>

                    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8">
                        <div className="grid grid-cols-4 gap-4 mb-8">
                            {[
                                { step: '1', program: 'Pilot', amount: '$15k-$49k', desc: 'CEIP License' },
                                { step: '2', program: 'DTP', amount: '$50k', desc: 'Validate & Scale' },
                                { step: '3', program: 'Voucher', amount: '$100k', desc: 'Deployment' },
                                { step: '4', program: 'ERA', amount: '$250k+', desc: 'Full Rollout' }
                            ].map((stage, i) => (
                                <div key={i} className="text-center relative">
                                    <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center text-amber-400 font-bold text-xl mx-auto mb-3">
                                        {stage.step}
                                    </div>
                                    <div className="text-sm font-medium text-white">{stage.program}</div>
                                    <div className="text-lg font-bold text-amber-400">{stage.amount}</div>
                                    <div className="text-xs text-slate-500">{stage.desc}</div>
                                    {i < 3 && (
                                        <ArrowRight className="absolute right-0 top-5 -mr-2 h-4 w-4 text-slate-600 hidden md:block" />
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-lg p-4">
                            <p className="text-sm text-slate-300">
                                <strong className="text-emerald-400">Procurement Tip:</strong> CEIP licenses under $75,000
                                are below the NWPTA threshold, allowing municipalities to use sole-source procurement
                                instead of lengthy RFP processes.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Contact Form */}
            <section id="contact-form" className="py-20">
                <div className="max-w-2xl mx-auto px-6">
                    <h2 className="text-3xl font-bold text-center mb-4">Contact Our Sales Team</h2>
                    <p className="text-slate-400 text-center mb-8">
                        Get a custom quote tailored to your organization's needs
                    </p>

                    {submitted ? (
                        <div className="bg-green-900/30 border border-green-700 rounded-xl p-8 text-center">
                            <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
                            <h3 className="text-2xl font-bold text-white mb-2">Thank You!</h3>
                            <p className="text-slate-300 mb-4">
                                We've received your inquiry and will be in touch within 24 hours.
                            </p>
                            <Link to="/" className="text-amber-400 hover:text-amber-300">
                                Return to Home
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="bg-slate-800/50 border border-slate-700 rounded-xl p-8">
                            <div className="grid md:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <label className="block text-sm text-slate-400 mb-2">Company Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.companyName}
                                        onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-amber-500 focus:outline-none"
                                        placeholder="Acme Energy Corp"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-2">Your Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.contactName}
                                        onChange={e => setFormData({ ...formData, contactName: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-amber-500 focus:outline-none"
                                        placeholder="Jane Smith"
                                    />
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <label className="block text-sm text-slate-400 mb-2">Email *</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                                        <input
                                            type="email"
                                            required
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-amber-500 focus:outline-none"
                                            placeholder="jane@company.com"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-2">Phone</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                                        <input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                            className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-amber-500 focus:outline-none"
                                            placeholder="+1 (403) 555-0123"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm text-slate-400 mb-2">Team Size *</label>
                                <select
                                    required
                                    value={formData.teamSize}
                                    onChange={e => setFormData({ ...formData, teamSize: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-amber-500 focus:outline-none"
                                >
                                    <option value="small">1-10 users</option>
                                    <option value="medium">11-50 users</option>
                                    <option value="large">51-200 users</option>
                                    <option value="enterprise">200+ users</option>
                                </select>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm text-slate-400 mb-2">Tell us about your needs</label>
                                <textarea
                                    rows={4}
                                    value={formData.message}
                                    onChange={e => setFormData({ ...formData, message: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-amber-500 focus:outline-none resize-none"
                                    placeholder="We're looking for a platform to track emissions across our 15 facilities..."
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/50 text-slate-900 font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                {loading ? 'Sending...' : 'Request a Quote'}
                                {!loading && <ArrowRight className="h-5 w-5" />}
                            </button>
                        </form>
                    )}
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-slate-800 py-8">
                <div className="max-w-7xl mx-auto px-6 text-center text-slate-500 text-sm">
                    <p>&copy; {new Date().getFullYear()} Canada Energy Intelligence Platform</p>
                    <p className="mt-2">
                        <Link to="/privacy" className="hover:text-white">Privacy</Link>
                        {' • '}
                        <Link to="/terms" className="hover:text-white">Terms</Link>
                        {' • '}
                        <Link to="/contact" className="hover:text-white">Contact</Link>
                    </p>
                </div>
            </footer>
        </div>
    );
}

export default EnterprisePage;
