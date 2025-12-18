/**
 * Email Capture Modal - Dual Capture Pattern
 * 
 * WHOP PORTABILITY PATTERN (whop_criterias.md Section 7):
 * "DO implement Dual Capture for emails. On your landing page, capture 
 * the user's email address before redirecting them to Whop for payment/login.
 * This ensures you own a marketing list (CSV) that Whop cannot hold hostage."
 * 
 * This modal:
 * 1. Captures email before redirecting to Whop/Stripe checkout
 * 2. Stores emails locally (localStorage) and optionally to Supabase
 * 3. Passes email to checkout for pre-filling
 */

import React, { useState } from 'react';
import { X, Mail, ArrowRight, Lock, CheckCircle } from 'lucide-react';
import { createCheckout, CheckoutOptions, BillingPlan } from '../../lib/billingAdapter';

interface EmailCaptureModalProps {
    plan: BillingPlan;
    isOpen: boolean;
    onClose: () => void;
    userId?: string;
}

export function EmailCaptureModal({ plan, isOpen, onClose, userId }: EmailCaptureModalProps) {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [captured, setCaptured] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email || !email.includes('@')) {
            setError('Please enter a valid email address');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Store email locally (owned data!)
            saveEmailLocally(email);

            // Optionally save to Supabase (if configured)
            await saveEmailToDatabase(email, plan.id);

            setCaptured(true);

            // Small delay to show success state
            await new Promise(resolve => setTimeout(resolve, 500));

            // Create checkout with pre-filled email
            const checkoutOptions: CheckoutOptions = {
                planId: plan.id,
                email,
                userId: userId || generateAnonymousId(),
                successUrl: `${window.location.origin}/billing/success`,
                cancelUrl: window.location.href,
                metadata: {
                    source: 'email_capture_modal',
                    captured_at: new Date().toISOString()
                }
            };

            const session = await createCheckout(checkoutOptions);

            // Redirect to checkout
            window.location.href = session.url;

        } catch (err) {
            setError('Something went wrong. Please try again.');
            setLoading(false);
            setCaptured(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
                >
                    <X className="h-5 w-5" />
                </button>

                {/* Header */}
                <div className="text-center mb-6">
                    <div className="w-12 h-12 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Mail className="h-6 w-6 text-cyan-400" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">
                        Get Started with {plan.name}
                    </h2>
                    <p className="text-slate-400 text-sm">
                        Enter your email to continue to secure checkout
                    </p>
                </div>

                {/* Plan Summary */}
                <div className="bg-slate-900/50 rounded-lg p-4 mb-6 border border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-white font-medium">{plan.name}</span>
                        <span className="text-cyan-400 font-bold">
                            ${plan.price}/{plan.interval === 'month' ? 'mo' : 'yr'}
                        </span>
                    </div>
                    <ul className="space-y-1">
                        {plan.features.slice(0, 3).map((feature, i) => (
                            <li key={i} className="text-slate-400 text-xs flex items-center gap-2">
                                <CheckCircle className="h-3 w-3 text-emerald-400" />
                                {feature.replace(/_/g, ' ')}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="email" className="sr-only">Email address</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                            disabled={loading}
                            required
                        />
                    </div>

                    {error && (
                        <p className="text-red-400 text-sm">{error}</p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            captured ? (
                                <>
                                    <CheckCircle className="h-5 w-5" />
                                    Redirecting...
                                </>
                            ) : (
                                <span className="animate-pulse">Processing...</span>
                            )
                        ) : (
                            <>
                                Continue to Checkout
                                <ArrowRight className="h-5 w-5" />
                            </>
                        )}
                    </button>
                </form>

                {/* Trust badges */}
                <div className="mt-6 flex items-center justify-center gap-4 text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                        <Lock className="h-3 w-3" />
                        Secure checkout
                    </div>
                    <span>•</span>
                    <div>Cancel anytime</div>
                    <span>•</span>
                    <div>No spam</div>
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// EMAIL STORAGE UTILITIES
// ============================================================================

const EMAIL_STORAGE_KEY = 'ceip_captured_emails';

/**
 * Save email to localStorage (owned data!)
 */
function saveEmailLocally(email: string): void {
    const stored = localStorage.getItem(EMAIL_STORAGE_KEY);
    let emails: Array<{ email: string; timestamp: string }> = [];

    try {
        emails = stored ? JSON.parse(stored) : [];
    } catch {
        emails = [];
    }

    // Avoid duplicates
    if (!emails.find(e => e.email === email)) {
        emails.push({
            email,
            timestamp: new Date().toISOString()
        });
        localStorage.setItem(EMAIL_STORAGE_KEY, JSON.stringify(emails));
    }
}

/**
 * Save email to Supabase (if configured)
 */
async function saveEmailToDatabase(email: string, planId: string): Promise<void> {
    // Check if Supabase is configured
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
        console.log('[EmailCapture] Supabase not configured, skipping DB save');
        return;
    }

    try {
        const response = await fetch('/api/leads/capture', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, planId, source: 'checkout_modal' })
        });

        if (!response.ok) {
            console.warn('[EmailCapture] Failed to save to database:', response.status);
        }
    } catch (err) {
        console.warn('[EmailCapture] Database save error:', err);
        // Don't throw - local storage is the fallback
    }
}

/**
 * Generate anonymous user ID for tracking
 */
function generateAnonymousId(): string {
    let id = localStorage.getItem('ceip_anon_id');
    if (!id) {
        id = `anon_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        localStorage.setItem('ceip_anon_id', id);
    }
    return id;
}

/**
 * Get all captured emails (for export)
 */
export function getCapturedEmails(): Array<{ email: string; timestamp: string }> {
    const stored = localStorage.getItem(EMAIL_STORAGE_KEY);
    try {
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

/**
 * Export emails as CSV
 */
export function exportEmailsAsCsv(): string {
    const emails = getCapturedEmails();
    const header = 'email,captured_at\n';
    const rows = emails.map(e => `${e.email},${e.timestamp}`).join('\n');
    return header + rows;
}

export default EmailCaptureModal;
