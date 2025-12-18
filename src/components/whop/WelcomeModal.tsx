/**
 * Welcome Modal - First-Run Experience
 * 
 * WHOP SUCCESS CRITERIA (Criterion 19):
 * "Welcome message/modal, quick start guide (3 steps max)"
 * 
 * Shows on first visit, dismissed via localStorage flag.
 */

import React, { useState, useEffect } from 'react';
import { X, Zap, TrendingUp, GraduationCap, ArrowRight, Sparkles } from 'lucide-react';

interface WelcomeModalProps {
    appName: 'watchdog' | 'quiz';
    onClose?: () => void;
}

const STORAGE_KEY_PREFIX = 'ceip_welcome_seen_';

export function WelcomeModal({ appName, onClose }: WelcomeModalProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);

    const storageKey = `${STORAGE_KEY_PREFIX}${appName}`;

    useEffect(() => {
        // Check if user has already seen the welcome
        const hasSeen = localStorage.getItem(storageKey);
        if (!hasSeen) {
            setIsVisible(true);
        }
    }, [storageKey]);

    const handleDismiss = () => {
        localStorage.setItem(storageKey, 'true');
        setIsVisible(false);
        onClose?.();
    };

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleDismiss();
        }
    };

    if (!isVisible) return null;

    // App-specific content
    const content = appName === 'watchdog' ? watchdogContent : quizContent;
    const steps = content.steps;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="bg-gradient-to-r from-cyan-600 to-blue-600 p-6 text-center relative">
                    <button
                        onClick={handleDismiss}
                        className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
                        aria-label="Close"
                    >
                        <X className="h-5 w-5" />
                    </button>

                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        {content.icon}
                    </div>

                    <h2 className="text-2xl font-bold text-white">{content.title}</h2>
                    <p className="text-cyan-100 text-sm mt-2">{content.subtitle}</p>
                </div>

                {/* Steps */}
                <div className="p-6">
                    {/* Progress dots */}
                    <div className="flex justify-center gap-2 mb-6">
                        {steps.map((_, index) => (
                            <div
                                key={index}
                                className={`w-2 h-2 rounded-full transition-all ${index === currentStep
                                        ? 'bg-cyan-400 w-6'
                                        : index < currentStep
                                            ? 'bg-cyan-600'
                                            : 'bg-slate-600'
                                    }`}
                            />
                        ))}
                    </div>

                    {/* Current step content */}
                    <div className="text-center mb-6 min-h-[120px]">
                        <div className="w-12 h-12 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            {steps[currentStep].icon}
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">
                            {steps[currentStep].title}
                        </h3>
                        <p className="text-slate-400 text-sm">
                            {steps[currentStep].description}
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={handleDismiss}
                            className="flex-1 py-3 text-slate-400 hover:text-white transition-colors text-sm"
                        >
                            Skip
                        </button>
                        <button
                            onClick={handleNext}
                            className="flex-1 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2"
                        >
                            {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
                            <ArrowRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-900/50 border-t border-slate-700 text-center">
                    <p className="text-xs text-slate-500">
                        <Sparkles className="h-3 w-3 inline mr-1" />
                        Powered by CEIP — Canada's Energy Intelligence Engine
                    </p>
                </div>
            </div>
        </div>
    );
}

// Watchdog-specific content
const watchdogContent = {
    icon: <Zap className="h-8 w-8 text-white" />,
    title: 'Welcome to Rate Watchdog',
    subtitle: 'Alberta electricity price intelligence',
    steps: [
        {
            icon: <Zap className="h-6 w-6 text-cyan-400" />,
            title: 'Real-Time Prices',
            description: 'See current Alberta pool prices updated every 5 minutes from AESO data.'
        },
        {
            icon: <TrendingUp className="h-6 w-6 text-cyan-400" />,
            title: '12-Hour Forecast',
            description: 'AI-powered predictions help you plan when to use high-energy appliances.'
        },
        {
            icon: <Sparkles className="h-6 w-6 text-cyan-400" />,
            title: 'Want More?',
            description: 'Unlock 35+ professional dashboards with CEIP Advanced for deeper insights.'
        }
    ]
};

// Quiz-specific content
const quizContent = {
    icon: <GraduationCap className="h-8 w-8 text-white" />,
    title: 'Welcome to Energy Quiz Pro',
    subtitle: 'Master Canadian energy systems',
    steps: [
        {
            icon: <GraduationCap className="h-6 w-6 text-cyan-400" />,
            title: '72+ Questions',
            description: '6 comprehensive modules covering everything from grid basics to carbon markets.'
        },
        {
            icon: <TrendingUp className="h-6 w-6 text-cyan-400" />,
            title: 'Track Progress',
            description: 'Your scores are saved locally. See which topics need more attention.'
        },
        {
            icon: <Sparkles className="h-6 w-6 text-cyan-400" />,
            title: '7-Day Free Trial',
            description: 'Try all 6 modules free. Just add ?trial=true to the URL to activate.'
        }
    ]
};

// Helper to reset welcome state (for testing)
export function resetWelcome(appName: 'watchdog' | 'quiz') {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${appName}`);
}

export default WelcomeModal;
