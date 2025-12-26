/**
 * Energy Quiz Game
 * 
 * Self-contained quiz with bundled questions.
 * Includes NEW 2025 questions on RoLR and TIER amendments.
 */

import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
    BookOpen, ArrowLeft, CheckCircle, XCircle,
    ChevronRight, Award, RefreshCw, Share2
} from 'lucide-react';

interface WhopMiniUser {
    id: string;
    tier: 'free' | 'basic' | 'pro';
    isWhopUser: boolean;
}

interface QuizQuestion {
    id: string;
    text: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
    topic: string;
}

// Bundled quiz questions (including NEW 2025 content)
const QUIZ_QUESTIONS: QuizQuestion[] = [
    // RoLR 2025 Questions (NEW)
    {
        id: 'rolr-1',
        text: 'What is the Rate of Last Resort (RoLR) in Alberta as of January 2025?',
        options: ['~8¢/kWh', '~10¢/kWh', '~12¢/kWh', '~15¢/kWh'],
        correctAnswer: 2,
        explanation: 'The RoLR rate is approximately 12¢/kWh, providing a stable benchmark for consumers who don\'t choose a competitive retailer.',
        topic: '2025 Rate Design'
    },
    {
        id: 'rolr-2',
        text: 'How long is the initial fixed period for the RoLR rate?',
        options: ['6 months', '1 year', '2 years', '5 years'],
        correctAnswer: 2,
        explanation: 'The RoLR rate is fixed for 2 years, then can adjust by a maximum of 10% annually.',
        topic: '2025 Rate Design'
    },
    {
        id: 'rolr-3',
        text: 'After the 2-year fixed period, what is the maximum annual adjustment for RoLR?',
        options: ['5%', '10%', '15%', 'No limit'],
        correctAnswer: 1,
        explanation: 'The RoLR can only adjust by a maximum of 10% after the initial 2-year period, providing price stability.',
        topic: '2025 Rate Design'
    },
    // TIER 2025 Questions (NEW)
    {
        id: 'tier-1',
        text: 'Under the December 2025 TIER amendments, what new option do facilities have for compliance?',
        options: ['Carbon tax exemption', 'Direct Investment Credits', 'Free offsets', 'Emission trading'],
        correctAnswer: 1,
        explanation: 'The 2025 TIER amendments introduced Direct Investment Credits, allowing facilities to invest in on-site emissions reduction technology for compliance.',
        topic: 'TIER 2025'
    },
    {
        id: 'tier-2',
        text: 'What is the small emitter threshold for TIER opt-out eligibility?',
        options: ['10,000 tonnes CO2e', '50,000 tonnes CO2e', '100,000 tonnes CO2e', '200,000 tonnes CO2e'],
        correctAnswer: 0,
        explanation: 'Facilities emitting less than 10,000 tonnes CO2e may be eligible to opt-out of TIER under certain conditions.',
        topic: 'TIER 2025'
    },
    // Grid Dynamics (Updated for 2024 events)
    {
        id: 'grid-1',
        text: 'During the January 2024 Alberta grid emergency, approximately how much load was shed via mobile alerts?',
        options: ['50 MW', '100 MW', '200 MW', '500 MW'],
        correctAnswer: 2,
        explanation: 'The AESO emergency alert prompted voluntary curtailment of ~200 MW within minutes, demonstrating the power of demand response.',
        topic: 'Grid Operations'
    },
    {
        id: 'grid-2',
        text: 'What is the maximum pool price cap in Alberta\'s electricity market?',
        options: ['$500/MWh', '$750/MWh', '$999/MWh', '$1,500/MWh'],
        correctAnswer: 2,
        explanation: 'Alberta\'s pool price is capped at $999/MWh to prevent extreme price spikes during supply emergencies.',
        topic: 'Grid Operations'
    },
    // Basic Energy Questions
    {
        id: 'basic-1',
        text: 'Who operates Alberta\'s electrical grid?',
        options: ['IESO', 'AESO', 'BC Hydro', 'ENMAX'],
        correctAnswer: 1,
        explanation: 'The Alberta Electric System Operator (AESO) operates Alberta\'s grid and manages the wholesale electricity market.',
        topic: 'Fundamentals'
    },
    {
        id: 'basic-2',
        text: 'What makes Alberta\'s electricity market unique compared to other provinces?',
        options: ['Government-controlled prices', 'Prices change in real-time (deregulated)', 'Only renewable energy', 'No imports allowed'],
        correctAnswer: 1,
        explanation: 'Alberta has a deregulated electricity market where wholesale prices change every 5 minutes based on supply and demand.',
        topic: 'Fundamentals'
    },
    {
        id: 'basic-3',
        text: 'What type of energy source provides the most electricity in Ontario?',
        options: ['Wind', 'Solar', 'Nuclear', 'Natural Gas'],
        correctAnswer: 2,
        explanation: 'Ontario uses mostly nuclear and hydro for electricity. Nuclear provides consistent, low-emission baseload power.',
        topic: 'Fundamentals'
    },
    // Renewable Questions
    {
        id: 'renew-1',
        text: 'Under 2025 Alberta regulations, renewable projects on Class 1 & 2 agricultural land must demonstrate what?',
        options: ['Zero emissions', 'Co-existence with farming', 'Underground transmission', 'Community ownership'],
        correctAnswer: 1,
        explanation: 'The "Agriculture First" policy requires renewable projects to demonstrate co-existence with agricultural use on prime farmland.',
        topic: 'Renewables'
    },
    {
        id: 'renew-2',
        text: 'Approximately what percentage of Alberta is now restricted for wind development due to buffer zones?',
        options: ['10-15%', '20-25%', '35-40%', '50-60%'],
        correctAnswer: 2,
        explanation: 'Buffer zones and "Pristine Viewscapes" policies now restrict wind development in approximately 35-40% of Alberta.',
        topic: 'Renewables'
    },
];

// Shuffle function for randomizing questions
function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

export default function EnergyQuiz({ user }: { user: WhopMiniUser | null }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [showExplanation, setShowExplanation] = useState(false);
    const [quizComplete, setQuizComplete] = useState(false);

    // Shuffle and limit questions for mini quiz
    const questions = useMemo(() => {
        return shuffleArray(QUIZ_QUESTIONS).slice(0, 10);
    }, []);

    const currentQuestion = questions[currentIndex];
    const isCorrect = selectedAnswer === currentQuestion?.correctAnswer;
    const progress = ((currentIndex + 1) / questions.length) * 100;

    const handleSelectAnswer = (index: number) => {
        if (selectedAnswer !== null) return; // Already answered

        setSelectedAnswer(index);
        setShowExplanation(true);

        if (index === currentQuestion.correctAnswer) {
            setScore(score + 1);
        }
    };

    const handleNext = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setSelectedAnswer(null);
            setShowExplanation(false);
        } else {
            setQuizComplete(true);
        }
    };

    const handleRestart = () => {
        setCurrentIndex(0);
        setScore(0);
        setSelectedAnswer(null);
        setShowExplanation(false);
        setQuizComplete(false);
    };

    const scorePercentage = Math.round((score / questions.length) * 100);
    const passed = scorePercentage >= 70;

    if (quizComplete) {
        return (
            <div className="min-h-screen bg-slate-900">
                <div className="max-w-2xl mx-auto px-4 py-8">
                    <div className="text-center mb-8">
                        <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-4 ${passed ? 'bg-green-500/20' : 'bg-amber-500/20'
                            }`}>
                            <Award className={`w-12 h-12 ${passed ? 'text-green-400' : 'text-amber-400'}`} />
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-2">
                            {passed ? 'Congratulations!' : 'Good Effort!'}
                        </h1>
                        <p className="text-slate-400">
                            You scored {score} out of {questions.length}
                        </p>
                    </div>

                    {/* Score Display */}
                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
                        <div className="text-center">
                            <div className={`text-6xl font-bold mb-2 ${passed ? 'text-green-400' : 'text-amber-400'
                                }`}>
                                {scorePercentage}%
                            </div>
                            <div className="text-slate-400">
                                {passed ? 'You passed! 🎉' : 'Try again to pass (70% required)'}
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-4">
                        <button
                            onClick={handleRestart}
                            className="w-full flex items-center justify-center gap-2 bg-cyan-500 text-white 
                         font-semibold py-4 rounded-lg hover:bg-cyan-600 transition-colors"
                        >
                            <RefreshCw className="w-5 h-5" />
                            Try Again
                        </button>

                        {passed && (
                            <div className="bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-purple-500/30 
                              rounded-xl p-6 text-center">
                                <h3 className="text-lg font-semibold text-white mb-2">
                                    Earn Your Certificate
                                </h3>
                                <p className="text-slate-400 mb-4">
                                    Upgrade to Pro to complete full certificate tracks and earn verified credentials.
                                </p>
                                <a
                                    href="https://whop.com/canada-energy/?plan=basic"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center bg-purple-500 text-white font-semibold px-6 py-3 
                             rounded-lg hover:bg-purple-600 transition-colors"
                                >
                                    Get Certified
                                    <ChevronRight className="w-4 h-4 ml-2" />
                                </a>
                            </div>
                        )}

                        <Link
                            to="/whop-mini"
                            className="block w-full text-center border border-slate-600 text-slate-300 font-medium 
                         py-3 rounded-lg hover:bg-slate-800 transition-colors"
                        >
                            Back to Academy
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900">
            {/* Header */}
            <div className="bg-slate-800 border-b border-slate-700">
                <div className="max-w-2xl mx-auto px-4 py-4">
                    <Link to="/whop-mini" className="inline-flex items-center text-slate-400 hover:text-white mb-4">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Academy
                    </Link>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                                <BookOpen className="w-5 h-5 text-cyan-400" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white">Energy Quiz</h1>
                                <p className="text-slate-400 text-sm">Question {currentIndex + 1} of {questions.length}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-cyan-400 font-semibold">{score} correct</div>
                        </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="mt-4 h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-cyan-500 transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Question */}
            <div className="max-w-2xl mx-auto px-4 py-8">
                <div className="mb-2">
                    <span className="text-cyan-400 text-sm font-medium">{currentQuestion.topic}</span>
                </div>
                <h2 className="text-xl font-semibold text-white mb-6">
                    {currentQuestion.text}
                </h2>

                {/* Options */}
                <div className="space-y-3 mb-6">
                    {currentQuestion.options.map((option, index) => {
                        const isSelected = selectedAnswer === index;
                        const isCorrectOption = index === currentQuestion.correctAnswer;

                        let bgClass = 'bg-slate-800/50 border-slate-700 hover:border-cyan-500';
                        if (showExplanation) {
                            if (isCorrectOption) {
                                bgClass = 'bg-green-500/10 border-green-500';
                            } else if (isSelected && !isCorrectOption) {
                                bgClass = 'bg-red-500/10 border-red-500';
                            }
                        } else if (isSelected) {
                            bgClass = 'bg-cyan-500/10 border-cyan-500';
                        }

                        return (
                            <button
                                key={index}
                                onClick={() => handleSelectAnswer(index)}
                                disabled={selectedAnswer !== null}
                                className={`w-full text-left p-4 rounded-lg border transition-all ${bgClass} 
                           disabled:cursor-not-allowed`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-white">{option}</span>
                                    {showExplanation && (
                                        isCorrectOption ? (
                                            <CheckCircle className="w-5 h-5 text-green-400" />
                                        ) : isSelected ? (
                                            <XCircle className="w-5 h-5 text-red-400" />
                                        ) : null
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Explanation */}
                {showExplanation && (
                    <div className={`rounded-lg p-4 mb-6 ${isCorrect ? 'bg-green-500/10 border border-green-500/30' : 'bg-amber-500/10 border border-amber-500/30'
                        }`}>
                        <p className={`font-medium mb-2 ${isCorrect ? 'text-green-300' : 'text-amber-300'}`}>
                            {isCorrect ? '✓ Correct!' : '✗ Not quite'}
                        </p>
                        <p className="text-slate-300 text-sm">{currentQuestion.explanation}</p>
                    </div>
                )}

                {/* Next Button */}
                {showExplanation && (
                    <button
                        onClick={handleNext}
                        className="w-full bg-cyan-500 text-white font-semibold py-4 rounded-lg 
                       hover:bg-cyan-600 transition-colors"
                    >
                        {currentIndex < questions.length - 1 ? 'Next Question' : 'See Results'}
                    </button>
                )}
            </div>
        </div>
    );
}
