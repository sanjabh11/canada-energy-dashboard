/**
 * AuthModal - Whop-Compliant Authentication Modal
 *
 * CRITICAL FOR WHOP APPROVAL:
 * - NO custom email/password login forms
 * - Uses Whop OAuth or continues as guest
 * - Supports standalone mode for non-Whop deployments
 * 
 * Features:
 * - Whop login redirect
 * - Guest access option
 * - Tier preview
 * - Development simulation mode
 */

import React, { useState } from 'react';
import { X, LogIn, User, Zap, Crown, Users, ExternalLink } from 'lucide-react';
import {
  getWhopConfigStatus,
  getWhopLoginUrl,
  isStandaloneMode,
  isWhopLiveMode,
  whopClient,
  type WhopTier,
  WHOP_ACCESS_MATRIX
} from '../../lib/whop';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [loading, setLoading] = useState(false);
  const [showTierPicker, setShowTierPicker] = useState(false);
  const config = getWhopConfigStatus();

  if (!isOpen) return null;

  const handleWhopLogin = () => {
    const url = getWhopLoginUrl();
    if (url && url !== '#') {
      window.location.href = url;
    } else {
      // Fallback for unconfigured Whop
      alert('Whop integration is not configured. Please set VITE_WHOP_CLIENT_ID.');
    }
  };

  const handleGuestAccess = async () => {
    setLoading(true);
    try {
      whopClient.loginAsGuest();
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Guest login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulatedLogin = async (tier: WhopTier) => {
    setLoading(true);
    try {
      await whopClient.simulateLogin(tier);
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Simulated login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const tierOptions: { tier: WhopTier; label: string; icon: React.ReactNode; description: string }[] = [
    { tier: 'free', label: 'Free', icon: <User className="w-5 h-5" />, description: 'Public dashboards only' },
    { tier: 'basic', label: 'Basic ($29/mo)', icon: <Zap className="w-5 h-5" />, description: 'Full data + Certificates' },
    { tier: 'pro', label: 'Pro ($99/mo)', icon: <Crown className="w-5 h-5" />, description: 'AI Copilot + Cohorts' },
    { tier: 'team', label: 'Team ($299/mo)', icon: <Users className="w-5 h-5" />, description: 'Full platform + API' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 p-6">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Header */}
        <div className="mb-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Canada Energy Academy
          </h2>
          <p className="text-slate-400 text-sm">
            AI-powered energy education for your community
          </p>
        </div>

        {/* Tier Picker (for simulation mode) */}
        {showTierPicker && !isWhopLiveMode() ? (
          <div className="space-y-3 mb-6">
            <p className="text-sm text-slate-400 text-center mb-4">
              Select a tier to simulate (Development Mode)
            </p>
            {tierOptions.map(({ tier, label, icon, description }) => (
              <button
                key={tier}
                onClick={() => handleSimulatedLogin(tier)}
                disabled={loading}
                className={`w-full p-4 rounded-xl border transition-all flex items-center gap-4 ${tier === 'pro'
                    ? 'border-cyan-500 bg-cyan-500/10 hover:bg-cyan-500/20'
                    : 'border-slate-700 bg-slate-800 hover:bg-slate-700'
                  } disabled:opacity-50`}
              >
                <div className={`p-2 rounded-lg ${tier === 'pro' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-700 text-slate-300'
                  }`}>
                  {icon}
                </div>
                <div className="text-left flex-1">
                  <div className="font-medium text-white">{label}</div>
                  <div className="text-sm text-slate-400">{description}</div>
                </div>
              </button>
            ))}
            <button
              onClick={() => setShowTierPicker(false)}
              className="w-full py-2 text-slate-400 hover:text-white text-sm transition-colors"
            >
              ← Back
            </button>
          </div>
        ) : (
          <>
            {/* Mode indicator */}
            <div className="mb-6 p-3 rounded-lg bg-slate-800 border border-slate-700">
              <div className="flex items-center gap-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${config.mode === 'live' ? 'bg-green-500' :
                    config.mode === 'simulated' ? 'bg-yellow-500' : 'bg-blue-500'
                  }`} />
                <span className="text-slate-400">{config.message}</span>
              </div>
            </div>

            {/* Main Actions */}
            <div className="space-y-4">
              {/* Whop Login - Primary action when configured */}
              {!isStandaloneMode() && (
                <button
                  onClick={handleWhopLogin}
                  disabled={loading || !config.hasClientId}
                  className="w-full py-4 px-6 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-xl hover:from-cyan-600 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3"
                >
                  <LogIn className="w-5 h-5" />
                  Continue with Whop
                  <ExternalLink className="w-4 h-4 opacity-70" />
                </button>
              )}

              {/* Guest Access - Always available */}
              <button
                onClick={handleGuestAccess}
                disabled={loading}
                className="w-full py-4 px-6 bg-slate-800 text-white font-medium rounded-xl border border-slate-700 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3"
              >
                <User className="w-5 h-5" />
                {isStandaloneMode() ? 'Continue as Guest' : 'Browse as Guest (Free Tier)'}
              </button>

              {/* Simulation Mode Picker - Only in non-live mode */}
              {!isWhopLiveMode() && (
                <button
                  onClick={() => setShowTierPicker(true)}
                  className="w-full py-3 text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors"
                >
                  🔧 Developer: Test Different Tiers
                </button>
              )}
            </div>

            {/* Feature Preview */}
            <div className="mt-6 pt-6 border-t border-slate-700">
              <h3 className="text-sm font-medium text-slate-300 mb-3">What you get:</h3>
              <ul className="space-y-2 text-sm text-slate-400">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Access to public energy dashboards
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Real-time grid data visualization
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-cyan-500">⬆</span>
                  <span className="text-slate-500">Upgrade for certificates & AI tutoring</span>
                </li>
              </ul>
            </div>

            {/* Footer */}
            <p className="mt-6 text-xs text-slate-500 text-center">
              By continuing, you agree to our Terms of Service and Privacy Policy
            </p>
          </>
        )}
      </div>
    </div>
  );
}
