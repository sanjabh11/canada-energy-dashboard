import React, { useEffect, useState } from 'react';
import { useAuth, ProtectedRoute } from './auth';
import { BadgeGrid, ProgressTracker } from './badges';
import { getBadgeProgress, BadgeProgress, Badge } from '../lib/gamificationService';
import { Award, ArrowLeft, Loader } from 'lucide-react';

function BadgesPageContent() {
  const { user } = useAuth();
  const [badgeProgress, setBadgeProgress] = useState<BadgeProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<BadgeProgress | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadBadgeProgress();
    }
  }, [user]);

  async function loadBadgeProgress() {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    const { progress, error: progressError } = await getBadgeProgress(user.id);

    if (progressError) {
      setError('Failed to load badge progress. Please try again.');
      console.error(progressError);
    } else {
      setBadgeProgress(progress);
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-12 w-12 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading your badges...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-white mb-4">Oops!</h2>
          <p className="text-slate-400 mb-6">{error}</p>
          <button
            onClick={loadBadgeProgress}
            className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-900 to-purple-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="bg-purple-700 p-3 rounded-xl mr-4">
                <Award className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">My Badges</h1>
                <p className="text-blue-100 text-sm mt-1">Track your learning achievements</p>
              </div>
            </div>
            <a
              href="/"
              className="flex items-center text-blue-100 hover:text-white transition-colors text-sm font-medium"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </a>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            {/* Progress Tracker */}
            <ProgressTracker badgeProgress={badgeProgress} showDetailed={true} />
          </div>

          <div>
            {/* Quick Tips Card */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <span className="text-2xl mr-2">💡</span>
                How to Earn Badges
              </h3>
              <ul className="space-y-3 text-sm text-slate-300">
                <li className="flex items-start">
                  <span className="text-cyan-400 mr-2">•</span>
                  <span>Complete the dashboard tour to earn your first badge</span>
                </li>
                <li className="flex items-start">
                  <span className="text-cyan-400 mr-2">•</span>
                  <span>Finish certificate modules to unlock higher tiers</span>
                </li>
                <li className="flex items-start">
                  <span className="text-cyan-400 mr-2">•</span>
                  <span>Attend live webinars for exclusive badges</span>
                </li>
                <li className="flex items-start">
                  <span className="text-cyan-400 mr-2">•</span>
                  <span>Maintain login streaks for consistency badges</span>
                </li>
              </ul>
            </div>

            {/* Leaderboard Teaser (Week 2+) */}
            <div className="bg-gradient-to-br from-purple-900 to-slate-800 rounded-xl border border-purple-700 p-6 mt-6">
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                <span className="text-2xl mr-2">🏆</span>
                Leaderboard
              </h3>
              <p className="text-purple-200 text-sm mb-4">
                Coming soon! Compete with other learners and see where you rank.
              </p>
              <div className="text-center py-4 bg-slate-900 rounded-lg border border-slate-700">
                <div className="text-3xl font-bold text-purple-400">Week 2+</div>
                <div className="text-xs text-slate-500 mt-1">Feature in development</div>
              </div>
            </div>
          </div>
        </div>

        {/* Badge Grid */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <BadgeGrid
            badgeProgress={badgeProgress}
            onBadgeClick={(bp) => setSelectedBadge(bp)}
          />
        </div>

        {/* Badge Detail Modal (Simple version, not the earned celebration) */}
        {selectedBadge && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
            onClick={() => setSelectedBadge(null)}
          >
            <div
              className="bg-slate-800 rounded-xl border border-slate-700 p-8 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="text-7xl mb-4">
                  {selectedBadge.badge.icon || '🏆'}
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  {selectedBadge.badge.name}
                </h2>
                <span className="inline-block px-3 py-1 bg-slate-900 text-cyan-400 text-xs font-semibold rounded-full uppercase mb-4">
                  {selectedBadge.badge.tier}
                </span>
                <p className="text-slate-300 mb-6">
                  {selectedBadge.badge.description}
                </p>

                {selectedBadge.earned ? (
                  <div className="bg-green-950 border border-green-700 rounded-lg p-4 mb-4">
                    <div className="text-green-400 font-semibold mb-1">✓ Earned</div>
                    <div className="text-sm text-green-300">
                      {selectedBadge.earnedAt &&
                        new Date(selectedBadge.earnedAt).toLocaleDateString('en-CA', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 mb-4">
                    <div className="text-slate-400 font-semibold mb-2">Progress</div>
                    <div className="relative w-full h-3 bg-slate-800 rounded-full overflow-hidden mb-2">
                      <div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                        style={{ width: `${selectedBadge.progress.percentage}%` }}
                      />
                    </div>
                    <div className="text-sm text-slate-400">
                      {selectedBadge.progress.current} / {selectedBadge.progress.total} completed
                    </div>
                  </div>
                )}

                <div className="text-sm text-purple-400 mb-6">
                  +{selectedBadge.badge.points} points
                </div>

                <button
                  onClick={() => setSelectedBadge(null)}
                  className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function BadgesPage() {
  return (
    <ProtectedRoute requiredTier="free">
      <BadgesPageContent />
    </ProtectedRoute>
  );
}
