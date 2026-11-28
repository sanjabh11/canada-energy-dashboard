/**
 * Whop Mini-App Entry Point
 *
 * This is an isolated, self-contained mini-app for existing Whop members.
 * Existing-customer surface only: no acquisition, checkout, or promotional copy.
 *
 * KEY DESIGN PRINCIPLES:
 * 1. ZERO external API calls on initial load
 * 2. ZERO ProtectedRoute wrappers (server-verified Whop session instead)
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
  Zap,
  Calculator,
  BookOpen,
  TrendingUp,
  Award,
  LayoutDashboard,
  ChevronRight,
  Loader,
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

function guestUser(): WhopMiniUser {
  return { id: `guest_${Date.now()}`, tier: 'free', isWhopUser: false };
}

const WHOP_TOKEN_PARAMS = ['whop_user_token', 'token', 'whop_token'] as const;

/**
 * Extract the Whop user token passed on initial iframe load.
 *
 * The token is a CREDENTIAL ONLY: it is sent exactly once to the
 * server-side whop-verify-access edge function as `Authorization: Bearer`.
 * It is never decoded locally (a client-decoded JWT proves nothing about
 * identity or tier) and never echoed, logged, or persisted.
 */
export function extractWhopUserToken(search: string): string | null {
  const params = new URLSearchParams(search);
  for (const key of WHOP_TOKEN_PARAMS) {
    const value = params.get(key);
    if (value && value.trim()) return value.trim();
  }
  return null;
}

/**
 * Remove credential params from the address bar once captured, so the
 * token is not retained in history or leaked via document referrer.
 */
function scrubTokenFromUrl(): void {
  try {
    const params = new URLSearchParams(window.location.search);
    let touched = false;
    for (const key of WHOP_TOKEN_PARAMS) {
      if (params.has(key)) {
        params.delete(key);
        touched = true;
      }
    }
    if (!touched) return;
    const query = params.toString();
    window.history.replaceState({}, '', window.location.pathname + (query ? `?${query}` : ''));
  } catch {
    // Cosmetic only — never let URL hygiene break auth resolution.
  }
}

/**
 * Map whop-verify-access tiers (free | starter | pro | enterprise) onto the
 * mini-app tier vocabulary (free | basic | pro). Unknown values → free.
 */
export function mapWhopMiniTier(tier: unknown): WhopMiniUser['tier'] {
  switch (tier) {
    case 'pro':
    case 'enterprise':
      return 'pro';
    case 'starter':
    case 'basic':
      return 'basic';
    default:
      return 'free';
  }
}

/**
 * Verify a Whop token against the whop-verify-access edge function and
 * return the SERVER-verified member profile. Fails closed to a guest
 * profile on ANY failure: missing edge-base config, network error, non-2xx
 * response, or a body without a verified user id.
 */
export async function verifyWhopMiniAccess(
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<WhopMiniUser> {
  const edgeBase = (import.meta.env.VITE_SUPABASE_EDGE_BASE || '').replace(/\/+$/, '');
  if (!edgeBase) return guestUser();

  const experienceId = (import.meta.env.VITE_WHOP_EXPERIENCE_ID || '').trim();

  try {
    const res = await fetchImpl(`${edgeBase}/whop-verify-access`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // The token travels only as a bearer credential; the function also
        // accepts Whop's iframe-injected x-whop-user-token header.
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(experienceId ? { experienceId } : {}),
    });
    if (!res.ok) return guestUser();

    const data = await res.json();
    const id = typeof data?.user?.id === 'string' ? data.user.id.trim() : '';
    if (!id) return guestUser();

    return {
      id,
      email: typeof data?.user?.email === 'string' ? data.user.email : undefined,
      // Entitlement comes exclusively from the server response.
      tier: data?.hasAccess === true ? mapWhopMiniTier(data?.tier) : 'free',
      isWhopUser: true,
    };
  } catch {
    return guestUser();
  }
}

/**
 * Resolve the Whop iframe session. The URL param supplies only the
 * credential; identity and tier come solely from server verification.
 * Any failure resolves to a free-tier guest.
 */
export function useWhopAuth(): { user: WhopMiniUser | null; loading: boolean } {
  const [user, setUser] = useState<WhopMiniUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const resolveSession = async () => {
      try {
        const token = extractWhopUserToken(window.location.search);
        if (!token) {
          if (!cancelled) setUser(guestUser());
          return;
        }
        scrubTokenFromUrl();
        const verified = await verifyWhopMiniAccess(token);
        if (!cancelled) setUser(verified);
      } catch {
        if (!cancelled) setUser(guestUser());
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void resolveSession();
    return () => {
      cancelled = true;
    };
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
  tagColor = 'cyan',
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
    amber: 'bg-amber-500/20 text-amber-300',
  };

  return (
    <Link
      to={href}
      className="group block bg-slate-800/50 border border-slate-700 rounded-xl p-6 
                 hover:border-cyan-500/50 hover:bg-slate-800 transition-all duration-300"
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-12 h-12 bg-cyan-500/10 rounded-lg flex items-center justify-center
                        group-hover:bg-cyan-500/20 transition-colors"
        >
          <Icon className="w-6 h-6 text-cyan-400" />
        </div>
        {tag && (
          <span
            className={`px-2 py-1 rounded-full text-xs font-semibold ${colorClasses[tagColor]}`}
          >
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
          <div
            className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/30 
                          rounded-full px-4 py-2 mb-6"
          >
            <Zap className="w-4 h-4 text-cyan-400" />
            <span className="text-cyan-300 text-sm font-medium">Canada Energy Academy</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Member Tools. <span className="text-cyan-400">Learn Energy.</span>
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Compare your electricity rate to public benchmarks, test your knowledge, and explore the
            grid.
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
            description="Compare your electricity rate to Alberta's RoLR benchmark and see an illustrative savings estimate."
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
            description="Practice grid decision-making with simulated, scenario-based Alberta market exercises and demo analytics."
            href="/whop-mini/trader"
            tag="NEW"
            tagColor="purple"
          />

          <FeatureCard
            icon={Award}
            title="Certificate Tracks"
            description="Preview learning tracks in Grid Operations, TIER Compliance, and Municipal Energy Management (no accredited credential awarded)."
            href="/whop-mini/certs"
            tag="PRO"
            tagColor="amber"
          />

          <FeatureCard
            icon={LayoutDashboard}
            title="Dashboard Demo"
            description="See how municipalities and EPCs review Alberta grid conditions with a clearly labeled demo dashboard."
            href="/whop-mini/dashboard"
            tag="PREVIEW"
            tagColor="cyan"
          />
        </div>

        {/* Member note — estimates are illustrative, not measured outcomes */}
        <div
          className="mt-12 bg-gradient-to-r from-green-500/10 to-cyan-500/10 border border-green-500/30 
                        rounded-xl p-6 text-center"
        >
          <p className="text-2xl font-bold text-white mb-2">Estimate Your Rate Position</p>
          <p className="text-slate-400">
            The Rate Watchdog compares your rate against public benchmarks. All figures are
            illustrative calculations, not measured savings.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-800 py-6">
        <div className="max-w-4xl mx-auto px-4 text-center text-slate-500 text-sm">
          Canada Energy Intelligence Platform • Member tools
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
