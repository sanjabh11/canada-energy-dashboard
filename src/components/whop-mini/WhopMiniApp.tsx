/**
 * Whop Mini-App Entry Point
 * 
 * This is an isolated, self-contained mini-app for Whop marketplace.
 * 
 * KEY DESIGN PRINCIPLES:
 * 1. ZERO external API calls on initial load
 * 2. ZERO ProtectedRoute wrappers (uses Whop JWT instead)
 * 3. All data is bundled statically
 * 4. Skeleton loading states for any async operations
 * 5. FCP target: <1.5s, Bundle target: <2MB
 * 
 * Routes:
 * /whop-mini/           → Home (hub for all experiences)
 * /whop-mini/watchdog   → Rate Watchdog Calculator  
 * /whop-mini/quiz       → Energy Quiz Game
 * /whop-mini/trader     → Energy Trader Simulation
 * /whop-mini/certs      → Certificate Previews
 * /whop-mini/dashboard  → Dashboard Demo
 */

import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  Zap, Calculator, BookOpen, TrendingUp, Award, LayoutDashboard,
  ChevronRight, Loader
} from 'lucide-react';

// Import sub-components (lazy load for performance)
const WatchdogCalculator = React.lazy(() => import('./WatchdogCalculator'));
const EnergyQuiz = React.lazy(() => import('./EnergyQuiz'));
const EnergyTrader = React.lazy(() => import('./EnergyTrader'));
const CertificatePreview = React.lazy(() => import('./CertificatePreview'));
const DashboardDemo = React.lazy(() => import('./DashboardDemo'));

// Types
interface WhopMiniUser {
  id: string;
  email?: string;
  tier: 'free' | 'basic' | 'pro';
  isWhopUser: boolean;
}

/**
 * Parse Whop JWT token from URL (silent auth)
 */
function useWhopAuth(): { user: WhopMiniUser | null; loading: boolean } {
  const [user, setUser] = useState<WhopMiniUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const parseToken = async () => {
      try {
        // Check URL params for Whop token
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('whop_user_token') || 
                      urlParams.get('token') ||
                      urlParams.get('whop_token');

        if (token) {
          // In production, verify with Whop API
          // For now, decode JWT payload (base64)
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            setUser({
              id: payload.sub || payload.user_id || `whop_${Date.now()}`,
              email: payload.email,
              tier: payload.tier || 'free',
              isWhopUser: true
            });
          } catch {
            // Invalid token, continue as guest
            setUser({
              id: `guest_${Date.now()}`,
              tier: 'free',
              isWhopUser: false
            });
          }
        } else {
          // No token - guest mode
          setUser({
            id: `guest_${Date.now()}`,
            tier: 'free',
            isWhopUser: false
          });
        }
      } finally {
        setLoading(false);
      }
    };

    parseToken();
  }, []);

  return { user, loading };
}

/**
 * Skeleton loading component
 */
function SkeletonLoader({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-center">
        <Loader className="w-12 h-12 text-cyan-500 animate-spin mx-auto mb-4" />
        <p className="text-slate-400">{message}</p>
      </div>
    </div>
  );
}

/**
 * Feature card for home page
 */
function FeatureCard({ 
  icon: Icon, 
  title, 
  description, 
  href, 
  tag,
  tagColor = 'cyan'
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  href: string;
  tag?: string;
  tagColor?: 'cyan' | 'green' | 'purple' | 'amber';
}) {
  const colorClasses = {
    cyan: 'bg-cyan-500/20 text-cyan-300',
    green: 'bg-green-500/20 text-green-300',
    purple: 'bg-purple-500/20 text-purple-300',
    amber: 'bg-amber-500/20 text-amber-300'
  };

  return (
    <Link 
      to={href}
      className="group block bg-slate-800/50 border border-slate-700 rounded-xl p-6 
                 hover:border-cyan-500/50 hover:bg-slate-800 transition-all duration-300"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 bg-cyan-500/10 rounded-lg flex items-center justify-center
                        group-hover:bg-cyan-500/20 transition-colors">
          <Icon className="w-6 h-6 text-cyan-400" />
        </div>
        {tag && (
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colorClasses[tagColor]}`}>
            {tag}
          </span>
        )}
      </div>
      <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-cyan-300 transition-colors">
        {title}
      </h3>
      <p className="text-slate-400 text-sm mb-4">{description}</p>
      <div className="flex items-center text-cyan-400 text-sm font-medium">
        Start Now
        <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
      </div>
    </Link>
  );
}

/**
 * Home page - Hub for all experiences
 */
function WhopMiniHome({ user }: { user: WhopMiniUser | null }) {
  return (
    <div className="min-h-screen bg-slate-900">
      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700">
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/30 
                          rounded-full px-4 py-2 mb-6">
            <Zap className="w-4 h-4 text-cyan-400" />
            <span className="text-cyan-300 text-sm font-medium">Canada Energy Academy</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Save Money. <span className="text-cyan-400">Master Energy.</span>
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Stop overpaying on electricity. Learn the grid. Advance your career.
          </p>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-white mb-8">Choose Your Experience</h2>
        
        <div className="grid md:grid-cols-2 gap-6">
          <FeatureCard
            icon={Calculator}
            title="Rate Watchdog"
            description="Are you overpaying for electricity? Compare your rate to Alberta's RoLR benchmark and find savings."
            href="/whop-mini/watchdog"
            tag="FREE"
            tagColor="green"
          />
          
          <FeatureCard
            icon={BookOpen}
            title="Energy Quiz"
            description="Test your knowledge of Canadian energy systems. 70+ questions across 6 modules."
            href="/whop-mini/quiz"
            tag="FREE"
            tagColor="green"
          />
          
          <FeatureCard
            icon={TrendingUp}
            title="Energy Trader"
            description="Simulate high-stakes grid decisions. Can you profit from the chaos of Alberta's electricity market?"
            href="/whop-mini/trader"
            tag="NEW"
            tagColor="purple"
          />
          
          <FeatureCard
            icon={Award}
            title="Certificate Tracks"
            description="Earn credentials in Grid Operations, TIER Compliance, and Municipal Energy Management."
            href="/whop-mini/certs"
            tag="PRO"
            tagColor="amber"
          />
          
          <FeatureCard
            icon={LayoutDashboard}
            title="Dashboard Demo"
            description="See how municipalities and EPCs monitor Alberta's grid in real-time."
            href="/whop-mini/dashboard"
            tag="PREVIEW"
            tagColor="cyan"
          />
        </div>

        {/* ROI Message */}
        <div className="mt-12 bg-gradient-to-r from-green-500/10 to-cyan-500/10 border border-green-500/30 
                        rounded-xl p-6 text-center">
          <p className="text-2xl font-bold text-white mb-2">
            Average User Saves <span className="text-green-400">$540/year</span>
          </p>
          <p className="text-slate-400">
            Switch from RoLR to competitive rates using our Rate Watchdog tool
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-800 py-6">
        <div className="max-w-4xl mx-auto px-4 text-center text-slate-500 text-sm">
          Canada Energy Intelligence Platform • Powered by Whop
        </div>
      </div>
    </div>
  );
}

/**
 * Main Whop Mini-App Router
 */
export default function WhopMiniApp() {
  const { user, loading } = useWhopAuth();
  const location = useLocation();

  // Detect if we're in an iframe (Whop context)
  const isInIframe = window.self !== window.top;

  if (loading) {
    return <SkeletonLoader message="Connecting to Canada Energy Academy..." />;
  }

  return (
    <div className={`whop-mini-app ${isInIframe ? 'in-iframe' : ''}`}>
      {/* Iframe-specific styles */}
      {isInIframe && (
        <style>{`
          body { 
            margin: 0; 
            padding: 0; 
            overflow-x: hidden;
          }
          /* Hide any external navigation */
          .whop-mini-app.in-iframe header.nav-header,
          .whop-mini-app.in-iframe header.site-header {
            display: none !important;
          }
        `}</style>
      )}

      <React.Suspense fallback={<SkeletonLoader />}>
        <Routes>
          <Route path="/" element={<WhopMiniHome user={user} />} />
          <Route path="/watchdog" element={<WatchdogCalculator user={user} />} />
          <Route path="/quiz" element={<EnergyQuiz user={user} />} />
          <Route path="/trader" element={<EnergyTrader user={user} />} />
          <Route path="/certs" element={<CertificatePreview user={user} />} />
          <Route path="/dashboard" element={<DashboardDemo user={user} />} />
        </Routes>
      </React.Suspense>
    </div>
  );
}
