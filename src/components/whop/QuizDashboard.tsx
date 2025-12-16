/**
 * QuizDashboard - Static Quiz List for Whop
 * 
 * Lists available energy quizzes without needing a database connection.
 * Progress is verified via localStorage for instant feedback.
 * Supports trial access via ?trial=true URL parameter.
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Award, Clock, ArrowRight, BookOpen, CheckCircle, Lock, Trophy, Gift, Sparkles } from 'lucide-react';
import { QUIZ_MODULES, getTotalQuestionCount } from '../../lib/quizData';
import { initializeTrialFromUrl, hasActiveTrial, getTrialDaysRemaining } from '../../lib/trialAccess';

export function QuizDashboard() {
    // Local state for progress (avoids Supabase 401s)
    const [progress, setProgress] = useState<Record<string, boolean>>({});
    const [isTrial, setIsTrial] = useState(false);
    const [trialDays, setTrialDays] = useState(0);
    const [trialJustActivated, setTrialJustActivated] = useState(false);

    useEffect(() => {
        // Check for trial activation
        const justActivated = initializeTrialFromUrl();
        setTrialJustActivated(justActivated);
        setIsTrial(hasActiveTrial());
        setTrialDays(getTrialDaysRemaining());

        // Load progress from localStorage
        const loaded: Record<string, boolean> = {};
        QUIZ_MODULES.forEach(m => {
            if (localStorage.getItem(`quiz_complete_${m.id}`)) {
                loaded[m.id] = true;
            }
        });
        setProgress(loaded);
    }, []);

    const completedCount = Object.keys(progress).length;
    const totalQuestions = getTotalQuestionCount();

    // Determine if a module should be unlocked
    const isModuleUnlocked = (module: typeof QUIZ_MODULES[0]) => {
        return !module.locked || isTrial;
    };

    return (
        <div className="space-y-8">
            {/* Trial Banner */}
            {trialJustActivated && (
                <div className="bg-gradient-to-r from-emerald-600 to-cyan-600 p-4 rounded-xl text-white flex items-center gap-3 animate-pulse">
                    <Sparkles className="h-6 w-6" />
                    <div>
                        <p className="font-bold">Trial Activated! 🎉</p>
                        <p className="text-sm text-emerald-100">You have {trialDays}-day free access to all premium quizzes.</p>
                    </div>
                </div>
            )}

            {isTrial && !trialJustActivated && (
                <div className="bg-gradient-to-r from-purple-600/50 to-cyan-600/50 p-3 rounded-xl text-white flex items-center gap-3 border border-purple-500/50">
                    <Gift className="h-5 w-5 text-purple-300" />
                    <p className="text-sm">
                        <span className="font-bold">Trial Mode</span> – {trialDays} days remaining. All quizzes unlocked!
                    </p>
                </div>
            )}

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                    <div className="text-slate-400 text-xs uppercase font-bold mb-1">Available Quizzes</div>
                    <div className="text-2xl font-bold text-white">{QUIZ_MODULES.length}</div>
                </div>
                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                    <div className="text-slate-400 text-xs uppercase font-bold mb-1">Completed</div>
                    <div className="text-2xl font-bold text-cyan-400">{completedCount}</div>
                </div>
                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                    <div className="text-slate-400 text-xs uppercase font-bold mb-1">Total Questions</div>
                    <div className="text-2xl font-bold text-amber-400">{totalQuestions}</div>
                </div>
                <div className="bg-gradient-to-br from-cyan-600 to-blue-600 p-4 rounded-xl text-white shadow-lg">
                    <div className="text-blue-100 text-xs uppercase font-bold mb-1">My Rank</div>
                    <div className="text-2xl font-bold">
                        {completedCount === 0 ? 'Novice' : completedCount < 3 ? 'Apprentice' : completedCount < 5 ? 'Grid Expert' : 'Energy Master'}
                    </div>
                </div>
            </div>

            {/* Quiz Grid */}
            <div>
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-cyan-400" />
                    Available Modules
                    {isTrial && (
                        <span className="px-2 py-0.5 bg-purple-500/30 text-purple-300 text-xs rounded-full ml-2">
                            All Unlocked
                        </span>
                    )}
                </h2>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {QUIZ_MODULES.map((module) => {
                        const unlocked = isModuleUnlocked(module);

                        return (
                            <div
                                key={module.id}
                                className={`group relative p-6 rounded-xl border transition-all ${!unlocked
                                    ? 'bg-slate-900 border-slate-800 opacity-75'
                                    : 'bg-slate-800 border-slate-700 hover:border-cyan-500 hover:shadow-cyan-900/20 hover:shadow-lg'
                                    }`}
                            >
                                {/* Trial Badge */}
                                {module.locked && isTrial && (
                                    <div className="absolute top-2 right-2 px-2 py-0.5 bg-purple-500/30 text-purple-300 text-xs rounded-full flex items-center gap-1">
                                        <Gift className="h-3 w-3" />
                                        Trial
                                    </div>
                                )}

                                <div className="flex justify-between items-start mb-4">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${module.difficulty === 'Beginner' ? 'bg-emerald-500/20 text-emerald-300' :
                                            module.difficulty === 'Intermediate' ? 'bg-blue-500/20 text-blue-300' :
                                                'bg-purple-500/20 text-purple-300'
                                        }`}>
                                        {module.difficulty}
                                    </span>
                                    {progress[module.id] && (
                                        <span className="flex items-center gap-1 text-emerald-400 text-xs font-bold">
                                            <CheckCircle className="h-4 w-4" />
                                            DONE
                                        </span>
                                    )}
                                </div>

                                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors">
                                    {module.title}
                                </h3>
                                <p className="text-sm text-slate-400 mb-4 h-10 line-clamp-2">
                                    {module.description}
                                </p>

                                <div className="flex items-center gap-4 text-xs text-slate-500 mb-6">
                                    <div className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {module.duration}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Award className="h-3 w-3" />
                                        {module.questions.length} Questions
                                    </div>
                                </div>

                                {!unlocked ? (
                                    <button disabled className="w-full py-2 bg-slate-800 border border-slate-700 text-slate-500 rounded-lg flex items-center justify-center gap-2 cursor-not-allowed">
                                        <Lock className="h-4 w-4" />
                                        Premium Only
                                    </button>
                                ) : (
                                    <Link
                                        to={`/whop/quiz/modules/${module.id}`}
                                        className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg flex items-center justify-center gap-2 transition-colors font-medium"
                                    >
                                        {progress[module.id] ? 'Review Quiz' : 'Start Quiz'}
                                        <ArrowRight className="h-4 w-4" />
                                    </Link>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Trial CTA if not in trial */}
            {!isTrial && (
                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 text-center">
                    <Trophy className="h-8 w-8 text-amber-400 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-white mb-2">Unlock All Quizzes</h3>
                    <p className="text-slate-400 text-sm mb-4">
                        Get access to {QUIZ_MODULES.filter(m => m.locked).length} premium modules with {totalQuestions}+ questions.
                    </p>
                    <a
                        href="?trial=true"
                        className="inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-lg font-medium hover:from-purple-500 hover:to-cyan-500 transition-colors"
                    >
                        <Gift className="h-4 w-4" />
                        Start 7-Day Free Trial
                    </a>
                </div>
            )}
        </div>
    );
}

export default QuizDashboard;
