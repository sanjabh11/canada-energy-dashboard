import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, ProtectedRoute } from './auth';
import {
  GraduationCap,
  Clock,
  Award,
  CheckCircle,
  Lock,
  Loader,
  ArrowLeft,
  Play,
  FileText,
  HelpCircle,
  Calculator
} from 'lucide-react';
import { getTrackProgress, TrackProgress } from '../lib/certificateService';

function CertificateTrackPageContent() {
  const { trackSlug } = useParams<{ trackSlug: string }>();
  const navigate = useNavigate();
  const { user, edubizUser } = useAuth();

  const [trackProgress, setTrackProgress] = useState<TrackProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id && trackSlug) {
      loadTrack();
    }
  }, [user, trackSlug]);

  async function loadTrack() {
    if (!user?.id || !trackSlug) return;

    setLoading(true);
    setError(null);

    const { progress, error: progressError } = await getTrackProgress(user.id, trackSlug);

    if (progressError || !progress) {
      setError('Track not found or failed to load. Please try again.');
      console.error(progressError);
    } else {
      setTrackProgress(progress);
    }

    setLoading(false);
  }

  // Content type icons
  const contentTypeIcons: Record<string, React.ReactNode> = {
    reading: <FileText className="h-5 w-5" />,
    video: <Play className="h-5 w-5" />,
    quiz: <HelpCircle className="h-5 w-5" />,
    interactive: <Calculator className="h-5 w-5" />
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-12 w-12 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading certificate track...</p>
        </div>
      </div>
    );
  }

  if (error || !trackProgress) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-white mb-4">Track Not Found</h2>
          <p className="text-slate-400 mb-6">{error}</p>
          <button
            onClick={() => navigate('/certificates')}
            className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg transition-colors"
          >
            Back to Certificates
          </button>
        </div>
      </div>
    );
  }

  const { track, modules, userProgress, completedCount, totalCount, overallProgress, certificate } = trackProgress;

  // Find next incomplete module
  const nextModule = modules.find(m => {
    const progress = userProgress.find(p => p.module_id === m.id);
    return !progress || progress.status !== 'completed';
  });

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-900 to-purple-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <button
            onClick={() => navigate('/certificates')}
            className="flex items-center gap-2 text-blue-100 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">Back to All Tracks</span>
          </button>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h1 className="text-3xl font-bold">{track.name}</h1>
                {certificate && (
                  <div className="flex items-center gap-2 bg-green-600 px-4 py-2 rounded-full">
                    <Award className="h-5 w-5" />
                    <span className="text-sm font-semibold">Certificate Earned!</span>
                  </div>
                )}
              </div>

              <p className="text-blue-100 text-lg mb-6 max-w-3xl">{track.description}</p>

              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2 bg-blue-800/50 px-4 py-2 rounded-lg">
                  <Clock className="h-4 w-4" />
                  <span>{track.duration_hours} hours total</span>
                </div>
                <div className="flex items-center gap-2 bg-blue-800/50 px-4 py-2 rounded-lg">
                  <GraduationCap className="h-4 w-4" />
                  <span>{totalCount} modules</span>
                </div>
                {track.price_cad > 0 && (
                  <div className="flex items-center gap-2 bg-blue-800/50 px-4 py-2 rounded-lg">
                    <span className="font-semibold">${track.price_cad.toFixed(0)} CAD</span>
                  </div>
                )}
              </div>
            </div>

            {/* Certificate preview or start button */}
            <div className="flex-shrink-0 ml-8">
              {certificate ? (
                <div className="bg-slate-800 border-2 border-green-600 rounded-xl p-6 text-center">
                  <Award className="h-16 w-16 text-green-400 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-white mb-2">Certificate Earned</h3>
                  <p className="text-sm text-slate-400 mb-4">
                    Issued: {new Date(certificate.issued_at).toLocaleDateString('en-CA')}
                  </p>
                  <button
                    className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    Download PDF
                  </button>
                  <p className="text-xs text-slate-500 mt-2">
                    Code: {certificate.verification_code}
                  </p>
                </div>
              ) : nextModule ? (
                <button
                  onClick={() => navigate(`/modules/${nextModule.id}`)}
                  className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold rounded-lg transition-all text-lg flex items-center gap-2"
                >
                  {completedCount > 0 ? 'Continue Learning' : 'Start Track'}
                  <Play className="h-6 w-6" />
                </button>
              ) : null}
            </div>
          </div>

          {/* Progress bar */}
          {completedCount > 0 && !certificate && (
            <div className="mt-6 bg-blue-800/30 rounded-xl p-6 border border-blue-700">
              <div className="flex items-center justify-between text-sm mb-3">
                <span className="text-blue-100 font-medium">Track Progress</span>
                <span className="text-white font-bold">
                  {completedCount} / {totalCount} modules ({Math.round(overallProgress)}%)
                </span>
              </div>
              <div className="relative w-full h-3 bg-blue-900 rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 transition-all duration-700"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Modules list */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">Course Modules</h2>
          <p className="text-slate-400">Complete all modules to earn your certificate</p>
        </div>

        <div className="space-y-4">
          {modules.map((module, index) => {
            const moduleProgress = userProgress.find(p => p.module_id === module.id);
            const isCompleted = moduleProgress?.status === 'completed';
            const isInProgress = moduleProgress?.status === 'in_progress';
            const isLocked = index > 0 && !userProgress.find(p => p.module_id === modules[index - 1].id)?.completed_at;

            return (
              <div
                key={module.id}
                className={`
                  bg-slate-800 rounded-xl border-2 transition-all
                  ${isCompleted
                    ? 'border-green-600'
                    : isInProgress
                    ? 'border-cyan-600'
                    : isLocked
                    ? 'border-slate-700 opacity-50'
                    : 'border-slate-700 hover:border-cyan-600 hover:shadow-lg'
                  }
                `}
              >
                <div className="p-6">
                  <div className="flex items-start gap-6">
                    {/* Module number */}
                    <div
                      className={`
                        flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg
                        ${isCompleted
                          ? 'bg-green-600 text-white'
                          : isInProgress
                          ? 'bg-cyan-600 text-white'
                          : isLocked
                          ? 'bg-slate-700 text-slate-500'
                          : 'bg-slate-700 text-slate-300'
                        }
                      `}
                    >
                      {isCompleted ? <CheckCircle className="h-6 w-6" /> : isLocked ? <Lock className="h-6 w-6" /> : module.sequence_number}
                    </div>

                    {/* Module content */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-semibold text-white">{module.title}</h3>
                            <span
                              className={`
                                px-3 py-1 rounded-full text-xs font-semibold uppercase flex items-center gap-1
                                ${module.content_type === 'reading' ? 'bg-blue-900 text-blue-300' :
                                  module.content_type === 'video' ? 'bg-purple-900 text-purple-300' :
                                  module.content_type === 'quiz' ? 'bg-orange-900 text-orange-300' :
                                  'bg-cyan-900 text-cyan-300'
                                }
                              `}
                            >
                              {contentTypeIcons[module.content_type]}
                              {module.content_type}
                            </span>
                            {isCompleted && moduleProgress?.quiz_score && (
                              <span className="px-3 py-1 bg-green-900 text-green-300 rounded-full text-xs font-semibold">
                                Score: {moduleProgress.quiz_score}%
                              </span>
                            )}
                          </div>
                          <p className="text-slate-400">{module.description}</p>
                        </div>

                        <div className="flex items-center gap-4 ml-6">
                          <div className="text-right">
                            <div className="flex items-center gap-2 text-slate-400">
                              <Clock className="h-4 w-4" />
                              <span className="text-sm">{module.duration_minutes} min</span>
                            </div>
                            {moduleProgress?.time_spent_minutes && moduleProgress.time_spent_minutes > 0 && (
                              <div className="text-xs text-slate-500 mt-1">
                                Time spent: {moduleProgress.time_spent_minutes} min
                              </div>
                            )}
                          </div>

                          {!isLocked && (
                            <button
                              onClick={() => navigate(`/modules/${module.id}`)}
                              className={`
                                px-6 py-3 font-semibold rounded-lg transition-colors flex items-center gap-2
                                ${isCompleted
                                  ? 'bg-slate-700 hover:bg-slate-600 text-white'
                                  : 'bg-cyan-600 hover:bg-cyan-700 text-white'
                                }
                              `}
                            >
                              {isCompleted ? 'Review' : isInProgress ? 'Continue' : 'Start'}
                              <Play className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Learning objectives */}
                      {module.learning_objectives.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-700">
                          <details className="group">
                            <summary className="cursor-pointer text-sm font-semibold text-slate-400 hover:text-cyan-400 transition-colors list-none flex items-center gap-2">
                              <span>Learning Objectives</span>
                              <span className="text-xs text-slate-600 group-open:hidden">({module.learning_objectives.length})</span>
                            </summary>
                            <ul className="mt-3 space-y-2">
                              {module.learning_objectives.map((objective, idx) => (
                                <li key={idx} className="text-sm text-slate-400 flex items-start gap-2">
                                  <span className="text-cyan-400 mt-1">•</span>
                                  <span>{objective}</span>
                                </li>
                              ))}
                            </ul>
                          </details>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Certificate preview */}
        {!certificate && completedCount === totalCount && (
          <div className="mt-12 bg-gradient-to-br from-green-900/30 to-emerald-900/30 rounded-xl border-2 border-green-600 p-8 text-center">
            <Award className="h-20 w-20 text-green-400 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-white mb-4">
              Congratulations! 🎉
            </h2>
            <p className="text-slate-300 text-lg mb-6 max-w-2xl mx-auto">
              You've completed all modules in this track. Your certificate will be issued shortly.
            </p>
            <button
              onClick={loadTrack}
              className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors text-lg"
            >
              Check Certificate Status
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function CertificateTrackPage() {
  return (
    <ProtectedRoute requiredTier="free">
      <CertificateTrackPageContent />
    </ProtectedRoute>
  );
}
