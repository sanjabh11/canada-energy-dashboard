/**
 * UpgradeModal - Tier Upgrade Information
 *
 * Legacy tier gate upsell modal.
 *
 * This now routes users into the canonical CEIP pricing / enterprise paths
 * instead of the older Whop/Stripe-specific checkout flow.
 */

import React, { useState } from 'react';
import { X, Check, Sparkles, Zap, Crown } from 'lucide-react';
import { useAuth } from './AuthProvider';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetTier?: 'edubiz' | 'pro';
}

const tierFeatures = {
  free: {
    name: 'Free',
    price: '$0',
    period: 'forever',
    icon: Sparkles,
    color: 'slate',
    features: [
      'View all 26 dashboards',
      '24 help topics with 3-level explanations',
      'Guided tours (5 roles)',
      'AI chat (10 queries/day)',
      'Basic badges',
    ],
  },
  edubiz: {
    name: 'Edubiz',
    price: '$99',
    period: '/month',
    icon: Zap,
    color: 'cyan',
    features: [
      'Everything in Free',
      'Unlimited AI chat',
      '3 certificate tracks (15 modules)',
      'Downloadable PDF certificates',
      'Monthly AB webinars (live + recordings)',
      'All gamification badges',
      'Export reports & datasets',
      'Email support (48h response)',
    ],
  },
  pro: {
    name: 'EnergyPilot Pro',
    price: '$1,500',
    period: '/month',
    icon: Crown,
    color: 'purple',
    features: [
      'Everything in Edubiz',
      'Green Button OAuth integration',
      'AI recommendations (operational)',
      'Multi-facility management',
      'Compliance tracking (CER + provincial)',
      'White-label options',
      'Priority support (4h response)',
      'Dedicated account manager',
    ],
  },
};

export function UpgradeModal({ isOpen, onClose, targetTier = 'edubiz' }: UpgradeModalProps) {
  const { user, isWhopUser } = useAuth();
  const [loading, setLoading] = useState(false);

  const tier = tierFeatures[targetTier];
  const Icon = tier.icon;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 p-8">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-${tier.color}-500/10 mb-4`}>
            <Icon className={`w-8 h-8 text-${tier.color}-400`} />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">
            Upgrade to {tier.name}
          </h2>
          <div className="flex items-center justify-center gap-2">
            <span className="text-5xl font-bold text-white">{tier.price}</span>
            <span className="text-slate-400">{tier.period}</span>
          </div>
          {targetTier === 'edubiz' && (
            <p className="text-sm text-slate-400 mt-2">
              7-day free trial • Cancel anytime
            </p>
          )}
        </div>

        {/* Features */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-white mb-4">What's included:</h3>
          <ul className="space-y-3">
            {tier.features.map((feature, index) => (
              <li key={index} className="flex items-start gap-3">
                <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-slate-300">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <div className="space-y-3">
          <button
            type="button"
            disabled={loading}
            onClick={async () => {
              if (isWhopUser) {
                window.location.href = '/whop/discover';
                return;
              }

              setLoading(true);
              const destination = !user
                ? '/pricing'
                : targetTier === 'pro'
                  ? '/enterprise?tier=consulting'
                  : '/pricing';
              window.location.href = destination;
            }}
            className={`w-full py-4 bg-gradient-to-r from-${tier.color}-500 to-${tier.color}-600 text-white font-semibold rounded-lg hover:from-${tier.color}-600 hover:to-${tier.color}-700 focus:outline-none focus:ring-2 focus:ring-${tier.color}-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loading
              ? 'Redirecting…'
              : targetTier === 'edubiz'
                ? 'View Plans'
                : 'Talk to Sales'}
          </button>

          <button
            onClick={onClose}
            className="w-full py-3 text-slate-400 hover:text-white transition-colors"
          >
            Maybe later
          </button>
        </div>

        {/* Comparison link */}
        <div className="mt-6 pt-6 border-t border-slate-700 text-center">
          <a
            href="/pricing"
            className="text-cyan-400 hover:text-cyan-300 text-sm font-medium"
          >
            Compare all tiers →
          </a>
        </div>
      </div>
    </div>
  );
}
