import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, ProtectedRoute } from './auth';
import { GraduationCap, Clock, Award, TrendingUp, CheckCircle, Lock, Loader, ArrowRight } from 'lucide-react';
import { getUserTrackProgress, TrackProgress } from '../lib/certificateService';

function CertificatesPageContent() {
  const { user, edubizUser } = useAuth();
  const navigate = useNavigate();
  const [trackProgress, setTrackProgress] = useState<TrackProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadProgress();
    }
  }, [user]);

  async function loadProgress() {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    const { progress, error: progressError } = await getUserTrackProgress(user.id);

    if (progressError) {
      setError('Failed to load certificate tracks. Please try again.');
      console.error(progressError);
    } else {
      setTrackProgress(progress);
    }

    setLoading(false);
  }

  // Track icons mapping
  const trackIcons: Record<string, string> = {
    'residential-energy': '🏠',
    'grid-operations': '⚡',
    'policy-regulatory': '📋'
  };

  // Tier access check
  const canAccessTrack = (requiredTier: string): boolean => {
    const tierHierarchy = { free: 0, edubiz: 1, pro: 2 };
    const userTierLevel = tierHierarchy[edubizUser?.tier || 'free'];
    const requiredTierLevel = tierHierarchy[requiredTier as keyof typeof tierHierarchy] || 0;
    return userTierLevel >= requiredTierLevel;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-12 w-12 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading certificate tracks...</p>
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
            onClick={loadProgress}
            className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Calculate overall stats
  const totalModules = trackProgress.reduce((sum, tp) => sum + tp.totalCount, 0);
  const completedModules = trackProgress.reduce((sum, tp) => sum + tp.completedCount, 0);
  const certificatesEarned = trackProgress.filter(tp => tp.certificate).length;
  const overallProgress = totalModules > 0 ? (completedModules / totalModules) * 100 : 0;

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-900 to-purple-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="bg-purple-700 p-3 rounded-xl">
                <GraduationCap className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Certificate Tracks</h1>
                <p className="text-blue-100 text-sm mt-1">Master Canadian energy systems and earn professional certificates</p>
              </div>
            </div>
            <a
              href="/"
              className="text-blue-100 hover:text-white transition-colors text-sm font-medium"
            >
              ← Back to Dashboard
            </a>
          </div>

          {/* Overall progress */}
          <div className="bg-blue-800/30 rounded-xl p-6 border border-blue-700">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <div className="text-4xl font-bold text-white mb-1">
                  {Math.round(overallProgress)}%
                </div>
                <div className="text-sm text-blue-200">Overall Progress</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-white mb-1">
                  {completedModules} / {totalModules}
                </div>
                <div className="text-sm text-blue-200">Modules Completed</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-white mb-1">
                  {certificatesEarned} / {trackProgress.length}
                </div>
                <div className="text-sm text-blue-200">Certificates Earned</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-white mb-1">
                  {edubizUser?.tier === 'free' ? 'Free' : edubizUser?.tier === 'edubiz' ? 'Edubiz' : 'Pro'}
                </div>
                <div className="text-sm text-blue-200">Your Tier</div>
              </div>
            </div>

            {overallProgress > 0 && (
              <div className="mt-4">
                <div className="relative w-full h-3 bg-blue-900 rounded-full overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-700"
                    style={{ width: `${overallProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Certificate tracks grid */}
        <div className="space-y-6">
          {trackProgress.map(tp => {
            const hasAccess = canAccessTrack(tp.track.required_tier);
            const icon = trackIcons[tp.track.slug] || '📚';

            return (
              <div
                key={tp.track.id}
                className={`
                  bg-slate-800 rounded-xl border-2 overflow-hidden transition-all
                  ${hasAccess
                    ? 'border-slate-700 hover:border-cyan-600 hover:shadow-2xl'
                    : 'border-slate-700 opacity-75'
                  }
                `}
              >
                <div className="p-8">
                  <div className="flex items-start justify-between mb-6">
                    {/* Track info */}
                    <div className="flex items-start gap-6 flex-1">
                      {/* Icon */}
                      <div className="text-6xl">{icon}</div>

                      {/* Details */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h2 className="text-2xl font-bold text-white">{tp.track.name}</h2>
                          {tp.certificate && (
                            <div className="flex items-center gap-2 bg-green-600 px-3 py-1 rounded-full">
                              <Award className="h-4 w-4" />
                              <span className="text-xs font-semibold">Certificate Earned</span>
                            </div>
                          )}
                          {!hasAccess && (
                            <div className="flex items-center gap-2 bg-orange-600 px-3 py-1 rounded-full">
                              <Lock className="h-4 w-4" />
                              <span className="text-xs font-semibold uppercase">{tp.track.required_tier} Tier Required</span>
                            </div>
                          )}
                        </div>

                        <p className="text-slate-300 mb-4">{tp.track.description}</p>

                        {/* Stats */}
                        <div className="flex items-center gap-6 text-sm text-slate-400">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>{tp.track.duration_hours}h total</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <GraduationCap className="h-4 w-4" />
                            <span>{tp.modules.length} modules</span>
                          </div>
                          {tp.track.price_cad > 0 && (
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-cyan-400">${tp.track.price_cad.toFixed(0)} CAD</span>
                            </div>
                          )}
                        </div>

                        {/* Progress */}
                        {hasAccess && tp.completedCount > 0 && (
                          <div className="mt-4">
                            <div className="flex items-center justify-between text-sm text-slate-400 mb-2">
                              <span>Your Progress</span>
                              <span>{tp.completedCount} / {tp.totalCount} modules ({Math.round(tp.overallProgress)}%)</span>
                            </div>
                            <div className="relative w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                              <div
                                className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                                style={{ width: `${tp.overallProgress}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action button */}
                    <div>
                      {hasAccess ? (
                        <button
                          onClick={() => navigate(`/certificates/${tp.track.slug}`)}
                          className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
                        >
                          {tp.completedCount > 0 ? 'Continue' : 'Start'}
                          <ArrowRight className="h-5 w-5" />
                        </button>
                      ) : (
                        <a
                          href="/pricing"
                          className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
                        >
                          <Lock className="h-5 w-5" />
                          Upgrade
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Module preview (first 3 modules) */}
                  {hasAccess && tp.modules.length > 0 && (
                    <div className="border-t border-slate-700 pt-4 mt-4">
                      <h3 className="text-sm font-semibold text-slate-400 mb-3">Module Preview:</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {tp.modules.slice(0, 3).map(module => {
                          const moduleProgress = tp.userProgress.find(p => p.module_id === module.id);
                          const isCompleted = moduleProgress?.status === 'completed';

                          return (
                            <div
                              key={module.id}
                              className="bg-slate-900 rounded-lg p-3 border border-slate-700"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <span className="px-2 py-1 bg-slate-800 text-cyan-400 text-xs font-semibold rounded uppercase">
                                  {module.content_type}
                                </span>
                                {isCompleted && (
                                  <CheckCircle className="h-4 w-4 text-green-400" />
                                )}
                              </div>
                              <h4 className="text-sm font-medium text-white mb-1">{module.title}</h4>
                              <p className="text-xs text-slate-500">{module.duration_minutes} min</p>
                            </div>
                          );
                        })}
                      </div>
                      {tp.modules.length > 3 && (
                        <p className="text-xs text-slate-500 mt-2">
                          +{tp.modules.length - 3} more modules
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Upgrade CTA for free users */}
        {edubizUser?.tier === 'free' && (
          <div className="mt-12 bg-gradient-to-br from-cyan-900/30 to-purple-900/30 rounded-xl border border-cyan-700 p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">
              Unlock All Certificate Tracks
            </h2>
            <p className="text-slate-300 mb-6 max-w-2xl mx-auto">
              Upgrade to Edubiz for unlimited AI queries, all certificate tracks, live webinars, and more. Start your 7-day free trial today.
            </p>
            <a
              href="/pricing"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold rounded-lg transition-all text-lg"
            >
              View Pricing Plans
              <ArrowRight className="h-6 w-6" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export function CertificatesPage() {
  return (
    <ProtectedRoute requiredTier="free">
      <CertificatesPageContent />
    </ProtectedRoute>
  );
}
