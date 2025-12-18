/**
 * Terms of Service Page
 * Required for Whop App Store compliance (Criterion 15)
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, AlertTriangle, CreditCard, Scale } from 'lucide-react';

export function TermsOfService() {
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
                        <FileText className="h-6 w-6 text-cyan-400" />
                        <h1 className="text-xl font-bold text-white">Terms of Service</h1>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-4xl mx-auto px-6 py-12">
                <div className="prose prose-invert prose-slate max-w-none">
                    <p className="text-slate-400 mb-8">
                        <strong>Effective Date:</strong> December 2024
                    </p>

                    <section className="mb-10">
                        <h2 className="text-xl font-semibold text-white">1. Acceptance of Terms</h2>
                        <p>
                            By accessing or using the Canada Energy Intelligence Platform ("CEIP"), including
                            Alberta Rate Watchdog and Energy Quiz Pro, you agree to be bound by these Terms
                            of Service. If you do not agree, please do not use our services.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-xl font-semibold text-white">2. Description of Services</h2>
                        <p>CEIP provides:</p>
                        <ul className="space-y-2 mt-4">
                            <li><strong>Alberta Rate Watchdog:</strong> Real-time electricity price monitoring and forecasts using AESO data</li>
                            <li><strong>Energy Quiz Pro:</strong> Educational quizzes about Canadian energy systems</li>
                            <li><strong>CEIP Advanced:</strong> Premium dashboards and analytics (paid tier)</li>
                        </ul>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-xl font-semibold text-white">3. User Accounts</h2>
                        <p>
                            Some features require authentication through Whop.com. You are responsible for
                            maintaining the security of your account credentials. You must be at least 13
                            years old to use CEIP.
                        </p>
                    </section>

                    <section className="mb-10">
                        <div className="flex items-center gap-3 mb-4">
                            <CreditCard className="h-5 w-5 text-cyan-400" />
                            <h2 className="text-xl font-semibold text-white m-0">4. Payments & Subscriptions</h2>
                        </div>
                        <h3 className="text-lg font-medium text-white mt-6">Pricing</h3>
                        <ul className="space-y-2 mt-2">
                            <li>Alberta Rate Watchdog: Free</li>
                            <li>Energy Quiz Pro (Free Tier): 3 modules</li>
                            <li>Energy Quiz Pro (Pro Tier): $29/month - All 6 modules</li>
                            <li>CEIP Advanced: $29–$99/month depending on plan</li>
                        </ul>

                        <h3 className="text-lg font-medium text-white mt-6">Billing</h3>
                        <p>
                            Payments are processed by Whop.com or Stripe. Subscriptions automatically renew
                            unless cancelled before the next billing date.
                        </p>

                        <h3 className="text-lg font-medium text-white mt-6">Refund Policy</h3>
                        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 mt-2">
                            <p className="font-medium text-white">30-Day Money-Back Guarantee</p>
                            <p className="mt-2 text-sm">
                                If you're not satisfied with your paid subscription, contact us within 30 days
                                of purchase for a full refund. After 30 days, refunds are provided at our discretion.
                            </p>
                        </div>

                        <h3 className="text-lg font-medium text-white mt-6">Cancellation</h3>
                        <p>
                            You may cancel your subscription at any time. Access continues until the end of
                            the current billing period. No partial refunds for unused time.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-xl font-semibold text-white">5. Acceptable Use</h2>
                        <p>You agree NOT to:</p>
                        <ul className="space-y-2 mt-4">
                            <li>Use CEIP for any unlawful purpose</li>
                            <li>Attempt to access other users' data</li>
                            <li>Resell or redistribute CEIP content commercially</li>
                            <li>Interfere with service operations or security</li>
                            <li>Scrape or harvest data for commercial purposes</li>
                        </ul>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-xl font-semibold text-white">6. Intellectual Property</h2>
                        <p>
                            All content, including but not limited to text, graphics, logos, and software,
                            is the property of CEIP or its licensors. You may not reproduce, modify, or
                            distribute CEIP content without explicit permission.
                        </p>
                        <p className="mt-4">
                            Quiz completion certificates are for personal professional development and do not
                            represent official government or regulatory certifications.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-xl font-semibold text-white">7. Data Accuracy</h2>
                        <div className="bg-amber-900/30 border border-amber-700 rounded-lg p-4 mt-4">
                            <div className="flex items-center gap-2 mb-2">
                                <AlertTriangle className="h-5 w-5 text-amber-400" />
                                <p className="font-medium text-amber-200">Important Notice</p>
                            </div>
                            <p className="text-sm text-amber-100">
                                CEIP provides energy data for informational purposes only. While we strive
                                for accuracy, we make no guarantees about data completeness or timeliness.
                                Do not make financial decisions based solely on CEIP data. Always verify
                                information with official sources (AESO, IESO, utilities).
                            </p>
                        </div>
                    </section>

                    <section className="mb-10">
                        <div className="flex items-center gap-3 mb-4">
                            <Scale className="h-5 w-5 text-cyan-400" />
                            <h2 className="text-xl font-semibold text-white m-0">8. Limitation of Liability</h2>
                        </div>
                        <p>
                            CEIP is provided "as is" without warranties of any kind. To the maximum extent
                            permitted by law, CEIP and its affiliates shall not be liable for any indirect,
                            incidental, special, or consequential damages arising from your use of the service.
                        </p>
                        <p className="mt-4">
                            Our total liability shall not exceed the amount you paid for CEIP services in
                            the twelve (12) months preceding the claim.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-xl font-semibold text-white">9. Service Availability</h2>
                        <p>
                            We strive for 99.9% uptime but do not guarantee uninterrupted access. We may
                            modify, suspend, or discontinue features at any time with reasonable notice.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-xl font-semibold text-white">10. Termination</h2>
                        <p>
                            We may terminate or suspend your access immediately, without prior notice, for
                            any breach of these Terms. Upon termination, your right to use CEIP ceases immediately.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-xl font-semibold text-white">11. Governing Law</h2>
                        <p>
                            These Terms are governed by the laws of the Province of Alberta, Canada. Any
                            disputes shall be resolved in the courts of Alberta.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-xl font-semibold text-white">12. Changes to Terms</h2>
                        <p>
                            We may update these Terms at any time. Material changes will be communicated
                            via email or in-app notification. Continued use after changes constitutes acceptance.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-xl font-semibold text-white">13. Contact</h2>
                        <p>
                            For questions about these Terms:
                        </p>
                        <p className="mt-4">
                            <strong>Email:</strong>{' '}
                            <a href="mailto:legal@ceip.energy" className="text-cyan-400 hover:underline">
                                legal@ceip.energy
                            </a>
                        </p>
                    </section>
                </div>

                {/* Footer links */}
                <div className="mt-12 pt-8 border-t border-slate-800 flex gap-6">
                    <Link to="/privacy" className="text-cyan-400 hover:underline">Privacy Policy</Link>
                    <Link to="/" className="text-cyan-400 hover:underline">Home</Link>
                </div>
            </main>
        </div>
    );
}

export default TermsOfService;
