/**
 * AuthButton - Sign In / User Menu Button
 *
 * Shows:
 * - "Sign In" button when not authenticated
 * - User menu with profile, tier, sign out when authenticated
 */

import React, { useState } from 'react';
import { User, LogOut, Crown, Settings, Award } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { AuthModal } from './AuthModal';

export function AuthButton() {
  const { user, edubizUser, signOut } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    setShowUserMenu(false);
  };

  // Not authenticated - show Sign In button
  if (!user) {
    return (
      <>
        <button
          onClick={() => setShowAuthModal(true)}
          className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all"
        >
          Sign In
        </button>
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => setShowAuthModal(false)}
        />
      </>
    );
  }

  // Authenticated - show user menu
  const tierColors = {
    free: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
    edubiz: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
    pro: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
  };

  const tierColor = tierColors[edubizUser?.tier || 'free'];

  return (
    <div className="relative">
      {/* User button */}
      <button
        onClick={() => setShowUserMenu(!showUserMenu)}
        className="flex items-center gap-3 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors"
      >
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-slate-400" />
          <span className="text-white font-medium hidden sm:inline">
            {edubizUser?.full_name || user.email?.split('@')[0] || 'User'}
          </span>
        </div>
        <span className={`px-2 py-1 text-xs font-semibold rounded border ${tierColor} capitalize`}>
          {edubizUser?.tier || 'free'}
        </span>
      </button>

      {/* Dropdown menu */}
      {showUserMenu && (
        <>
          {/* Backdrop to close menu when clicking outside */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowUserMenu(false)}
          />

          {/* Menu */}
          <div className="absolute right-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl z-20">
            {/* User info */}
            <div className="p-4 border-b border-slate-700">
              <p className="text-white font-medium truncate">
                {edubizUser?.full_name || 'User'}
              </p>
              <p className="text-sm text-slate-400 truncate">{user.email}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className={`px-2 py-1 text-xs font-semibold rounded border ${tierColor} capitalize`}>
                  {edubizUser?.tier || 'free'} tier
                </span>
                {edubizUser?.tier === 'free' && (
                  <a
                    href="/pricing"
                    className="text-xs text-cyan-400 hover:text-cyan-300"
                  >
                    Upgrade
                  </a>
                )}
              </div>
            </div>

            {/* Menu items */}
            <div className="p-2">
              <a
                href="/profile"
                className="flex items-center gap-3 px-3 py-2 text-slate-300 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <User className="w-4 h-4" />
                <span>My Profile</span>
              </a>

              <a
                href="/badges"
                className="flex items-center gap-3 px-3 py-2 text-slate-300 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <Award className="w-4 h-4" />
                <span>Badges & Progress</span>
              </a>

              {(edubizUser?.tier === 'edubiz' || edubizUser?.tier === 'pro') && (
                <a
                  href="/certificates"
                  className="flex items-center gap-3 px-3 py-2 text-slate-300 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <Crown className="w-4 h-4" />
                  <span>My Certificates</span>
                </a>
              )}

              <a
                href="/settings"
                className="flex items-center gap-3 px-3 py-2 text-slate-300 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </a>
            </div>

            {/* Sign out */}
            <div className="p-2 border-t border-slate-700">
              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 w-full px-3 py-2 text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
