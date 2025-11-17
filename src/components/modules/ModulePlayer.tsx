import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle, Clock, Award, Loader } from 'lucide-react';
import { useAuth } from '../auth';
import { getModuleById, getNextModule, getPreviousModule, Module } from '../../lib/moduleContent';
import {
  getModuleProgress,
  updateModuleProgress,
  completeModule,
  ModuleProgress
} from '../../lib/certificateService';
import { ReadingContent } from './ReadingContent';
import { VideoContent } from './VideoContent';
import { QuizContent } from './QuizContent';
import { InteractiveContent } from './InteractiveContent';
import { BadgeEarnedModal } from '../badges/BadgeEarnedModal';
import { Badge } from '../../lib/gamificationService';

export function ModulePlayer() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [module, setModule] = useState<Module | null>(null);
  const [progress, setProgress] = useState<ModuleProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [earnedBadge, setEarnedBadge] = useState<Badge | null>(null);
  const [showBadgeModal, setShowBadgeModal] = useState(false);

  const nextModule = module ? getNextModule(module.id) : null;
  const previousModule = module ? getPreviousModule(module.id) : null;

  useEffect(() => {
    if (moduleId) {
      loadModule();
    }
  }, [moduleId]);

  async function loadModule() {
    if (!moduleId || !user?.id) return;

    setLoading(true);

    // Load module content
    const moduleData = getModuleById(moduleId);
    if (!moduleData) {
      navigate('/certificates');
      return;
    }

    setModule(moduleData);

    // Load or create progress
    const { progress: progressData, error } = await getModuleProgress(user.id, moduleId);
    if (error) {
      console.error('Error loading progress:', error);
    }

    setProgress(progressData);

    // Update last_accessed timestamp
    if (progressData && progressData.status !== 'completed') {
      await updateModuleProgress(user.id, moduleId, {
        status: 'in_progress',
        last_accessed: new Date().toISOString()
      });
    }

    setLoading(false);
  }

  async function handleComplete(quizScore?: number) {
    if (!user?.id || !moduleId || completing) return;

    setCompleting(true);

    const { success, badgeAwarded, error } = await completeModule(
      user.id,
      moduleId,
      quizScore
    );

    if (error) {
      console.error('Error completing module:', error);
      alert('Failed to complete module. Please try again.');
      setCompleting(false);
      return;
    }

    if (success) {
      // Update local progress state
      setProgress(prev => prev ? { ...prev, status: 'completed', quiz_score: quizScore } : null);

      // Show badge modal if awarded
      if (badgeAwarded) {
        setEarnedBadge(badgeAwarded);
        setShowBadgeModal(true);
      } else {
        // Navigate to next module or track overview
        if (nextModule) {
          setTimeout(() => navigate(`/modules/${nextModule.id}`), 1500);
        } else {
          setTimeout(() => navigate(`/certificates/${module?.track_slug}`), 1500);
        }
      }
    }

    setCompleting(false);
  }

  const handleBadgeModalClose = () => {
    setShowBadgeModal(false);
    setEarnedBadge(null);

    // Navigate to next module or track overview
    if (nextModule) {
      navigate(`/modules/${nextModule.id}`);
    } else {
      navigate(`/certificates/${module?.track_slug}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-12 w-12 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading module...</p>
        </div>
      </div>
    );
  }

  if (!module || !progress) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-4">Module not found</p>
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

  const isCompleted = progress.status === 'completed';

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Module header */}
      <header className="bg-gradient-to-r from-blue-900 to-purple-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate(`/certificates/${module.track_slug}`)}
              className="flex items-center gap-2 text-blue-100 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm font-medium">Back to Track</span>
            </button>

            <div className="flex items-center gap-4">
              {isCompleted && (
                <div className="flex items-center gap-2 bg-green-600 px-4 py-2 rounded-lg">
                  <CheckCircle className="h-5 w-5" />
                  <span className="text-sm font-semibold">Completed</span>
                </div>
              )}

              <div className="flex items-center gap-2 text-blue-100">
                <Clock className="h-4 w-4" />
                <span className="text-sm">{module.duration_minutes} min</span>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 bg-blue-700 rounded-full text-xs font-semibold uppercase">
                Module {module.sequence_number}
              </span>
              <span className="px-3 py-1 bg-purple-700 rounded-full text-xs font-semibold uppercase">
                {module.content_type}
              </span>
            </div>
            <h1 className="text-2xl font-bold mb-2">{module.title}</h1>
            <p className="text-blue-100">{module.description}</p>
          </div>

          {/* Learning objectives */}
          {module.learning_objectives.length > 0 && (
            <div className="mt-4 pt-4 border-t border-blue-700">
              <div className="flex items-center gap-2 mb-2">
                <Award className="h-4 w-4 text-cyan-300" />
                <h3 className="text-sm font-semibold text-cyan-300">Learning Objectives</h3>
              </div>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {module.learning_objectives.map((objective, index) => (
                  <li key={index} className="text-sm text-blue-100 flex items-start gap-2">
                    <span className="text-cyan-400 mt-0.5">•</span>
                    <span>{objective}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </header>

      {/* Module content */}
      <div className="flex-1 flex flex-col">
        {module.content_type === 'reading' && (
          <ReadingContent
            content={module.content_data as any}
            onComplete={() => handleComplete()}
            isCompleted={isCompleted}
          />
        )}

        {module.content_type === 'video' && (
          <VideoContent
            content={module.content_data as any}
            onComplete={() => handleComplete()}
            isCompleted={isCompleted}
          />
        )}

        {module.content_type === 'quiz' && (
          <QuizContent
            content={module.content_data as any}
            onComplete={(score) => handleComplete(score)}
            isCompleted={isCompleted}
            previousScore={progress.quiz_score}
          />
        )}

        {module.content_type === 'interactive' && (
          <InteractiveContent
            content={module.content_data as any}
            onComplete={() => handleComplete()}
            isCompleted={isCompleted}
          />
        )}
      </div>

      {/* Navigation footer */}
      <footer className="bg-slate-800 border-t border-slate-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={() => previousModule && navigate(`/modules/${previousModule.id}`)}
            disabled={!previousModule}
            className="flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Previous
          </button>

          <div className="text-center">
            <p className="text-sm text-slate-400">
              {isCompleted ? 'Module completed!' : 'Complete module to continue'}
            </p>
          </div>

          <button
            onClick={() => {
              if (isCompleted && nextModule) {
                navigate(`/modules/${nextModule.id}`);
              } else if (isCompleted) {
                navigate(`/certificates/${module.track_slug}`);
              }
            }}
            disabled={!isCompleted}
            className="flex items-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
          >
            {nextModule ? 'Next' : 'Finish Track'}
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </footer>

      {/* Badge earned modal */}
      <BadgeEarnedModal
        isOpen={showBadgeModal}
        badge={earnedBadge}
        onClose={handleBadgeModalClose}
      />

      {/* Completing overlay */}
      {completing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-8 text-center">
            <Loader className="h-12 w-12 text-cyan-400 animate-spin mx-auto mb-4" />
            <p className="text-white font-semibold">Completing module...</p>
          </div>
        </div>
      )}
    </div>
  );
}
