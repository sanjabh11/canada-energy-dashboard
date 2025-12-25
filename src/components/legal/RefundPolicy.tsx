/**
 * Refund Policy Page
 * Required for Paddle verification and regulatory compliance
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, RefreshCcw, CreditCard, Clock, Mail, CheckCircle } from 'lucide-react';

export const RefundPolicy: React.FC = () => {
    return (
        <div className="min-h-screen bg-slate-900 text-white">
            {/* Header */}
            <header className="bg-slate-800 border-b border-slate-700">
                <div className="max-w-4xl mx-auto px-6 py-4">
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Dashboard
                    </Link>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-4xl mx-auto px-6 py-12">
                <div className="flex items-center gap-3 mb-8">
                    <RefreshCcw className="h-8 w-8 text-emerald-400" />
                    <h1 className="text-3xl font-bold">Refund Policy</h1>
                </div>

                <p className="text-slate-400 mb-8">
                    Last updated: December 25, 2025
                </p>

                <div className="prose prose-invert max-w-none">
                    {/* Overview */}
                    <section className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
                        <h2 className="text-xl font-semibold text-emerald-400 mb-4 flex items-center gap-2">
                            <CheckCircle className="h-5 w-5" />
                            Our Commitment
                        </h2>
                        <p className="text-slate-300">
                            We want you to be completely satisfied with your purchase of the Canada Energy Intelligence Platform.
                            If you're not happy with your subscription, we offer a straightforward refund process.
                        </p>
                    </section>

                    {/* 30-Day Money-Back Guarantee */}
                    <section className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
                        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                            <Clock className="h-5 w-5 text-emerald-400" />
                            30-Day Money-Back Guarantee
                        </h2>
                        <div className="space-y-4 text-slate-300">
                            <p>
                                <strong className="text-white">For all new subscriptions:</strong> You may request a full refund
                                within 30 days of your initial purchase, no questions asked.
                            </p>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li>Applies to Starter, Pro, Business, and Enterprise tiers</li>
                                <li>Refund processed within 5-10 business days</li>
                                <li>Credited back to original payment method</li>
                            </ul>
                        </div>
                    </section>

                    {/* Subscription Cancellations */}
                    <section className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
                        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-emerald-400" />
                            Subscription Cancellations
                        </h2>
                        <div className="space-y-4 text-slate-300">
                            <p>
                                <strong className="text-white">After the 30-day period:</strong>
                            </p>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li>You may cancel your subscription at any time</li>
                                <li>Access continues until the end of your current billing period</li>
                                <li>No partial refunds for unused time within a billing cycle</li>
                                <li>No automatic renewals after cancellation</li>
                            </ul>
                        </div>
                    </section>

                    {/* Enterprise Contracts */}
                    <section className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
                        <h2 className="text-xl font-semibold text-white mb-4">Enterprise & Municipal Contracts</h2>
                        <div className="space-y-4 text-slate-300">
                            <p>
                                For Enterprise and Municipal customers with annual contracts:
                            </p>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li>30-day pilot period with full refund option</li>
                                <li>Pro-rated refunds available for annual contracts cancelled after pilot period</li>
                                <li>Early termination terms specified in your service agreement</li>
                            </ul>
                        </div>
                    </section>

                    {/* How to Request */}
                    <section className="bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-6 mb-6">
                        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                            <Mail className="h-5 w-5 text-emerald-400" />
                            How to Request a Refund
                        </h2>
                        <div className="space-y-4 text-slate-300">
                            <p>To request a refund, please contact us:</p>
                            <ul className="list-none space-y-2">
                                <li><strong>Email:</strong> support@canada-energy.app</li>
                                <li><strong>Subject:</strong> Refund Request - [Your Account Email]</li>
                            </ul>
                            <p className="mt-4">
                                Please include your account email and reason for the refund (optional).
                                We typically respond within 24-48 hours.
                            </p>
                        </div>
                    </section>

                    {/* Exceptions */}
                    <section className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
                        <h2 className="text-xl font-semibold text-white mb-4">Exceptions</h2>
                        <div className="space-y-4 text-slate-300">
                            <p>Refunds may not be available in the following cases:</p>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li>Violation of our Terms of Service</li>
                                <li>Fraudulent activity detected on the account</li>
                                <li>Bulk license purchases (custom terms apply)</li>
                            </ul>
                        </div>
                    </section>

                    {/* Contact */}
                    <section className="text-center py-8">
                        <p className="text-slate-400 mb-4">Questions about our refund policy?</p>
                        <Link
                            to="/contact"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-medium transition-colors"
                        >
                            <Mail className="h-4 w-4" />
                            Contact Support
                        </Link>
                    </section>
                </div>

                {/* Footer Links */}
                <div className="border-t border-slate-800 pt-8 mt-8 flex gap-6 text-sm text-slate-400">
                    <Link to="/privacy" className="hover:text-white">Privacy Policy</Link>
                    <Link to="/terms" className="hover:text-white">Terms of Service</Link>
                    <Link to="/pricing" className="hover:text-white">Pricing</Link>
                </div>
            </main>
        </div>
    );
};

export default RefundPolicy;
