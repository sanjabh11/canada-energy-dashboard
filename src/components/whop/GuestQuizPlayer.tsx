/**
 * GuestQuizPlayer - Auth-Free Quiz Wrapper
 * 
 * Wraps the existing QuizContent component but mocks the completion logic
 * so it works 100% client-side for Whop reviewers (no Supabase auth required).
 * 
 * Now uses comprehensive quiz data from quizData.ts (10+ questions per module).
 */

import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Trophy, Star, Award } from 'lucide-react';
import { getQuizModule } from '../../lib/quizData';
import { QuizContent } from '../modules/QuizContent';

export function GuestQuizPlayer() {
    const { moduleId } = useParams<{ moduleId: string }>();
    const navigate = useNavigate();
    const [completed, setCompleted] = useState(false);
    const [finalScore, setFinalScore] = useState<number>(0);

    const module = getQuizModule(moduleId || 'module-1');

    if (!module) {
        return (
            <div className="max-w-2xl mx-auto text-center py-12">
                <div className="bg-slate-800 p-8 rounded-xl border border-slate-700">
                    <h2 className="text-2xl font-bold text-white mb-4">Module Not Found</h2>
                    <p className="text-slate-400 mb-8">The requested quiz module does not exist.</p>
                    <Link
                        to="/whop/quiz"
                        className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors inline-block"
                    >
                        Back to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    // Transform our quiz data to the format expected by QuizContent
    const transformedQuestions = module.questions.map(q => ({
        id: q.id,
        question: q.text,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation
    }));

    const handleComplete = (score: number) => {
        // Save to localStorage so Dashboard updates
        if (moduleId) {
            localStorage.setItem(`quiz_complete_${moduleId}`, 'true');
            localStorage.setItem(`quiz_score_${moduleId}`, score.toString());
        }
        setFinalScore(score);
        setCompleted(true);
    };

    if (completed) {
        const passed = finalScore >= module.passingScore;

        return (
            <div className="max-w-2xl mx-auto text-center py-12">
                <div className="bg-slate-800 p-8 rounded-xl border border-slate-700">
                    <div className={`w-20 h-20 ${passed ? 'bg-emerald-500/20' : 'bg-amber-500/20'} rounded-full flex items-center justify-center mx-auto mb-6`}>
                        {passed ? (
                            <Trophy className="h-10 w-10 text-emerald-400" />
                        ) : (
                            <Award className="h-10 w-10 text-amber-400" />
                        )}
                    </div>

                    <h2 className="text-2xl font-bold text-white mb-2">
                        {passed ? 'Quiz Completed!' : 'Keep Learning!'}
                    </h2>

                    <p className="text-slate-400 mb-4">
                        {passed
                            ? `Congratulations! You've mastered ${module.title}.`
                            : `You scored ${finalScore}%. You need ${module.passingScore}% to pass.`
                        }
                    </p>

                    <div className="flex items-center justify-center gap-1 mb-8">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                                key={star}
                                className={`h-6 w-6 ${finalScore >= star * 20
                                        ? 'text-amber-400 fill-amber-400'
                                        : 'text-slate-600'
                                    }`}
                            />
                        ))}
                        <span className="ml-2 text-lg font-bold text-white">{finalScore}%</span>
                    </div>

                    <div className="text-sm text-slate-500 mb-6">
                        <p>{module.questions.length} questions • Passing score: {module.passingScore}%</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <button
                            onClick={() => navigate('/whop/quiz')}
                            className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors"
                        >
                            Back to Dashboard
                        </button>
                        {!passed && (
                            <button
                                onClick={() => {
                                    setCompleted(false);
                                    setFinalScore(0);
                                }}
                                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                            >
                                Try Again
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto">
            <Link to="/whop/quiz" className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
                <ArrowLeft className="h-4 w-4" />
                Back to List
            </Link>

            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-slate-700">
                    <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${module.difficulty === 'Beginner' ? 'bg-emerald-500/20 text-emerald-300' :
                                module.difficulty === 'Intermediate' ? 'bg-blue-500/20 text-blue-300' :
                                    'bg-purple-500/20 text-purple-300'
                            }`}>
                            {module.difficulty}
                        </span>
                        <span className="text-xs text-slate-500">• {module.category}</span>
                    </div>
                    <h2 className="text-xl font-bold text-white">{module.title}</h2>
                    <p className="text-sm text-slate-400 mt-1">{module.description}</p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                        <span>{module.questions.length} questions</span>
                        <span>•</span>
                        <span>Passing: {module.passingScore}%</span>
                        <span>•</span>
                        <span>~{module.duration}</span>
                    </div>
                </div>

                <QuizContent
                    content={{
                        questions: transformedQuestions,
                        passingScore: module.passingScore
                    }}
                    onComplete={handleComplete}
                    isCompleted={false}
                    previousScore={undefined}
                />
            </div>
        </div>
    );
}

export default GuestQuizPlayer;
