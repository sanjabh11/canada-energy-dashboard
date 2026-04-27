/**
 * Privacy Policy Page
 * Required for Whop App Store compliance (Criterion 14)
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Mail, Database, Eye, Lock } from 'lucide-react';
import { getPublicAppUrl } from '@/lib/config';

export function PrivacyPolicy() {
    const publicAppUrl = getPublicAppUrl() || 'https://<set-VITE_PUBLIC_APP_URL>';
    const publicAppHostLabel = publicAppUrl.replace(/^https?:\/\//, '');

    return (
        <div className="min-h-screen bg-slate-900 text-slate-300">
            {/* Header */}
            <header className="bg-slate-800 border-b border-slate-700 py-4 px-6">
                <div className="max-w-4xl mx-auto flex items-center gap-4">
                    <Link
                        to="/"
                        className="text-slate-400 hover:text-white transition-colors flex items-center gap-2"
                    >
                        <ArrowLeft className="h-5 w-5" />
                        Back
                    </Link>
                    <div className="flex items-center gap-3">
                        <Shield className="h-6 w-6 text-cyan-400" />
                        <h1 className="text-xl font-bold text-white">Privacy Policy</h1>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-4xl mx-auto px-6 py-12">
                <div className="prose prose-invert prose-slate max-w-none">
                    <p className="text-slate-400 mb-8">
                        <strong>Last Updated:</strong> April 2026
                    </p>

                    <section className="mb-10">
                        <div className="flex items-center gap-3 mb-4">
                            <Database className="h-5 w-5 text-cyan-400" />
                            <h2 className="text-xl font-semibold text-white m-0">1. Information We Collect</h2>
                        </div>
                        <p>
                            Canada Energy Intelligence Platform ("CEIP", "we", "us") collects minimal data
                            necessary to provide our services:
                        </p>
                        <ul className="space-y-2 mt-4">
                            <li><strong>Account Information:</strong> Email address (when provided for upgrades or newsletters)</li>
                            <li><strong>Usage Data:</strong> Quiz progress, settings preferences (stored locally in your browser)</li>
                            <li><strong>Utility-Authorized Energy Data:</strong> Customer-authorized Green Button or utility batch interval history, connector metadata, and planning provenance used for utility demand forecasting workflows</li>
                            <li><strong>Connector Security Records:</strong> Token-expiry metadata, revocation events, payload fingerprints, and audit logs required to prove authorization and disconnection behavior</li>
                            <li><strong>Payment Information:</strong> Processed securely by Whop.com or Stripe. We never see or store your credit card details.</li>
                        </ul>
                    </section>

                    <section className="mb-10">
                        <div className="flex items-center gap-3 mb-4">
                            <Eye className="h-5 w-5 text-cyan-400" />
                            <h2 className="text-xl font-semibold text-white m-0">2. How We Use Your Information</h2>
                        </div>
                        <ul className="space-y-2">
                            <li>To provide and improve our energy intelligence services</li>
                            <li>To track your quiz progress and issue certificates</li>
                            <li>To ingest, normalize, and analyze utility-authorized energy data for planning, benchmarking, and export workflows</li>
                            <li>To honor authorization, revocation, retention, and audit obligations associated with Green Button and utility connector access</li>
                            <li>To send service-related communications (if you opt in)</li>
                            <li>To comply with legal obligations</li>
                        </ul>
                        <p className="mt-4">
                            We do <strong>not</strong> use utility-authorized customer data for unrelated model training, advertising, or onward sharing outside the customer-approved workflow.
                        </p>
                    </section>

                    <section className="mb-10">
                        <div className="flex items-center gap-3 mb-4">
                            <Lock className="h-5 w-5 text-cyan-400" />
                            <h2 className="text-xl font-semibold text-white m-0">3. Data Storage & Security</h2>
                        </div>
                        <p>
                            Your quiz progress and preferences are stored locally in your browser (localStorage).
                            This data never leaves your device unless you explicitly export it.
                        </p>
                        <p className="mt-4">
                            For users with accounts, data is stored securely on servers located in North America,
                            protected by industry-standard encryption (TLS 1.3, AES-256).
                        </p>
                        <p className="mt-4">
                            Connector tokens are encrypted at rest. When a customer or utility revokes access, CEIP stops presenting the connector as live and purges stored token material once revocation is confirmed.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-xl font-semibold text-white">4. Third-Party Services</h2>
                        <p>We integrate with the following services:</p>
                        <table className="w-full mt-4 text-sm">
                            <thead>
                                <tr className="border-b border-slate-700">
                                    <th className="text-left py-2 text-slate-400">Service</th>
                                    <th className="text-left py-2 text-slate-400">Purpose</th>
                                    <th className="text-left py-2 text-slate-400">Privacy Policy</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b border-slate-800">
                                    <td className="py-2">Whop.com</td>
                                    <td className="py-2">Payments & Authentication</td>
                                    <td className="py-2">
                                        <a href="https://whop.com/privacy" className="text-cyan-400 hover:underline" target="_blank" rel="noopener noreferrer">
                                            whop.com/privacy
                                        </a>
                                    </td>
                                </tr>
                                <tr className="border-b border-slate-800">
                                    <td className="py-2">Supabase</td>
                                    <td className="py-2">Secure data storage, edge functions, and connector audit custody</td>
                                    <td className="py-2">
                                        <a href="https://supabase.com/privacy" className="text-cyan-400 hover:underline" target="_blank" rel="noopener noreferrer">
                                            supabase.com/privacy
                                        </a>
                                    </td>
                                </tr>
                                <tr className="border-b border-slate-800">
                                    <td className="py-2">AESO</td>
                                    <td className="py-2">Alberta Electricity Data</td>
                                    <td className="py-2">
                                        <a href="https://www.aeso.ca/privacy" className="text-cyan-400 hover:underline" target="_blank" rel="noopener noreferrer">
                                            aeso.ca/privacy
                                        </a>
                                    </td>
                                </tr>
                                <tr className="border-b border-slate-800">
                                    <td className="py-2">Ontario / Alberta Utilities</td>
                                    <td className="py-2">Customer-authorized Green Button and utility data-sharing workflows</td>
                                    <td className="py-2">Utility-specific Green Button and privacy terms apply</td>
                                </tr>
                                <tr className="border-b border-slate-800">
                                    <td className="py-2">Netlify</td>
                                    <td className="py-2">Hosting</td>
                                    <td className="py-2">
                                        <a href="https://www.netlify.com/privacy" className="text-cyan-400 hover:underline" target="_blank" rel="noopener noreferrer">
                                            netlify.com/privacy
                                        </a>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-xl font-semibold text-white">5. Your Rights</h2>
                        <p>You have the right to:</p>
                        <ul className="space-y-2 mt-4">
                            <li>Access your personal data</li>
                            <li>Request correction of inaccurate data</li>
                            <li>Request deletion of your data ("right to be forgotten")</li>
                            <li>Export your data in a portable format</li>
                            <li>Revoke a utility data-sharing authorization and request purge of retained connector tokens</li>
                            <li>Opt out of marketing communications</li>
                        </ul>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-xl font-semibold text-white">6. Cookies & Tracking</h2>
                        <p>
                            We use only essential cookies for functionality (theme preference, session state).
                            We do not use tracking cookies or share data with advertisers.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-xl font-semibold text-white">7. Children's Privacy</h2>
                        <p>
                            CEIP is not intended for users under 13 years of age. We do not knowingly
                            collect information from children.
                        </p>
                    </section>

                    <section className="mb-10">
                        <div className="flex items-center gap-3 mb-4">
                            <Mail className="h-5 w-5 text-cyan-400" />
                            <h2 className="text-xl font-semibold text-white m-0">8. Contact Us</h2>
                        </div>
                        <p>
                            For privacy-related inquiries or to exercise your rights:
                        </p>
                        <p className="mt-4">
                            <strong>Email:</strong>{' '}
                            <a href="mailto:privacy@ceip.energy" className="text-cyan-400 hover:underline">
                                privacy@ceip.energy
                            </a>
                        </p>
                        <p className="mt-2">
                            <strong>Website:</strong>{' '}
                            <a href={publicAppUrl} className="text-cyan-400 hover:underline">
                                {publicAppHostLabel}
                            </a>
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-xl font-semibold text-white">9. Changes to This Policy</h2>
                        <p>
                            We may update this Privacy Policy periodically. Changes will be posted on this
                            page with an updated "Last Updated" date. Continued use of CEIP after changes
                            constitutes acceptance of the revised policy.
                        </p>
                    </section>
                </div>

                {/* Footer links */}
                <div className="mt-12 pt-8 border-t border-slate-800 flex gap-6 flex-wrap">
                    <Link to="/terms" className="text-cyan-400 hover:underline">Terms of Service</Link>
                    <Link to="/utility-security" className="text-cyan-400 hover:underline">Utility Security Statement</Link>
                    <Link to="/" className="text-cyan-400 hover:underline">Home</Link>
                </div>
            </main>
        </div>
    );
}

export default PrivacyPolicy;
