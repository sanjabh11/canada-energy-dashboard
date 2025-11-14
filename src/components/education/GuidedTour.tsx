/**
 * GuidedTour Component
 *
 * Interactive, step-by-step guided tours for onboarding and education
 * Role-based learning paths for students, teachers, researchers, and general public
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Home,
  Microscope,
  BookOpen,
  CheckCircle,
  Award
} from 'lucide-react';
import { cn } from '../../lib/utils';

export type TourRole = 'student' | 'teacher' | 'homeowner' | 'researcher' | 'general';

export interface TourStep {
  id: string;
  title: string;
  content: string;
  target?: string; // CSS selector for element to highlight
  placement?: 'top' | 'right' | 'bottom' | 'left' | 'center';
  action?: {
    label: string;
    onClick: () => void;
  };
  image?: string; // Optional visual aid
  tip?: string; // Quick tip or fun fact
}

export interface TourDefinition {
  id: string;
  role: TourRole;
  title: string;
  description: string;
  duration: string; // e.g., "10 minutes"
  steps: TourStep[];
  badge?: {
    name: string;
    icon: string;
  };
}

export interface GuidedTourProps {
  tour: TourDefinition;
  onComplete: () => void;
  onSkip: () => void;
  className?: string;
}

const ROLE_CONFIG = {
  student: {
    label: 'Student',
    icon: GraduationCap,
    color: 'from-blue-500 to-indigo-500',
    bgColor: 'bg-blue-50'
  },
  teacher: {
    label: 'Teacher',
    icon: BookOpen,
    color: 'from-green-500 to-emerald-500',
    bgColor: 'bg-green-50'
  },
  homeowner: {
    label: 'Homeowner',
    icon: Home,
    color: 'from-amber-500 to-orange-500',
    bgColor: 'bg-amber-50'
  },
  researcher: {
    label: 'Researcher',
    icon: Microscope,
    color: 'from-purple-500 to-pink-500',
    bgColor: 'bg-purple-50'
  },
  general: {
    label: 'General',
    icon: BookOpen,
    color: 'from-slate-500 to-gray-500',
    bgColor: 'bg-slate-50'
  }
};

export const GuidedTour: React.FC<GuidedTourProps> = ({
  tour,
  onComplete,
  onSkip,
  className
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightedElement, setHighlightedElement] = useState<HTMLElement | null>(null);

  const roleConfig = ROLE_CONFIG[tour.role];
  const RoleIcon = roleConfig.icon;
  const step = tour.steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === tour.steps.length - 1;

  // Highlight target element
  useEffect(() => {
    if (step.target) {
      const element = document.querySelector(step.target) as HTMLElement;
      if (element) {
        setHighlightedElement(element);
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.style.position = 'relative';
        element.style.zIndex = '9999';
        element.style.outline = '3px solid #3b82f6';
        element.style.outlineOffset = '4px';
        element.style.borderRadius = '8px';
      }
    }

    return () => {
      if (highlightedElement) {
        highlightedElement.style.position = '';
        highlightedElement.style.zIndex = '';
        highlightedElement.style.outline = '';
        highlightedElement.style.outlineOffset = '';
      }
    };
  }, [step, highlightedElement]);

  const handleNext = useCallback(() => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  }, [isLastStep, onComplete]);

  const handlePrevious = useCallback(() => {
    if (!isFirstStep) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [isFirstStep]);

  const handleSkip = useCallback(() => {
    onSkip();
  }, [onSkip]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrevious();
      } else if (e.key === 'Escape') {
        handleSkip();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleNext, handlePrevious, handleSkip]);

  return (
    <>
      {/* Backdrop Overlay */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998] animate-in fade-in duration-300"
        onClick={handleSkip}
      />

      {/* Tour Card */}
      <div
        className={cn(
          'fixed z-[9999]',
          step.placement === 'center' && 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
          step.placement === 'top' && 'top-4 left-1/2 -translate-x-1/2',
          step.placement === 'bottom' && 'bottom-4 left-1/2 -translate-x-1/2',
          step.placement === 'left' && 'left-4 top-1/2 -translate-y-1/2',
          step.placement === 'right' && 'right-4 top-1/2 -translate-y-1/2',
          !step.placement && 'bottom-4 right-4',
          'w-full max-w-md md:max-w-lg',
          'animate-in slide-in-from-bottom duration-300',
          className
        )}
      >
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className={cn('bg-gradient-to-r p-5 text-white', roleConfig.color)}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
                  <RoleIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{tour.title}</h3>
                  <p className="text-sm text-white/80">
                    {roleConfig.label} Tour • {tour.duration}
                  </p>
                </div>
              </div>
              <button
                onClick={handleSkip}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                aria-label="Skip tour"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-white/20 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-white h-full transition-all duration-300 rounded-full"
                  style={{
                    width: `${((currentStep + 1) / tour.steps.length) * 100}%`
                  }}
                />
              </div>
              <span className="text-sm font-medium text-white/90">
                {currentStep + 1}/{tour.steps.length}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Step Title */}
            <h4 className="text-xl font-bold text-slate-900">{step.title}</h4>

            {/* Step Content */}
            <p className="text-slate-700 leading-relaxed">{step.content}</p>

            {/* Image (if provided) */}
            {step.image && (
              <div className="rounded-lg overflow-hidden border-2 border-slate-200">
                <img
                  src={step.image}
                  alt={step.title}
                  className="w-full h-auto"
                />
              </div>
            )}

            {/* Tip (if provided) */}
            {step.tip && (
              <div className="rounded-lg bg-amber-50 border-2 border-amber-200 p-4">
                <div className="flex items-start gap-2">
                  <span className="text-lg">💡</span>
                  <div>
                    <p className="text-sm font-semibold text-amber-900 mb-1">
                      Pro Tip
                    </p>
                    <p className="text-sm text-amber-800">{step.tip}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Button (if provided) */}
            {step.action && (
              <button
                onClick={step.action.onClick}
                className={cn(
                  'w-full py-3 px-4 rounded-lg font-semibold',
                  'bg-gradient-to-r text-white',
                  'transition-all duration-200 hover:shadow-lg hover:scale-[1.02]',
                  roleConfig.color
                )}
              >
                {step.action.label}
              </button>
            )}
          </div>

          {/* Footer Navigation */}
          <div className="border-t-2 border-slate-200 p-4 bg-slate-50">
            <div className="flex items-center justify-between">
              <button
                onClick={handlePrevious}
                disabled={isFirstStep}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg font-medium',
                  'transition-colors',
                  isFirstStep
                    ? 'text-slate-400 cursor-not-allowed'
                    : 'text-slate-700 hover:bg-slate-200'
                )}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>

              <button
                onClick={handleSkip}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Skip Tour
              </button>

              <button
                onClick={handleNext}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg font-medium',
                  'text-white transition-all duration-200',
                  'hover:shadow-lg hover:scale-105',
                  'bg-gradient-to-r',
                  roleConfig.color
                )}
              >
                {isLastStep ? (
                  <>
                    Complete
                    <CheckCircle className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>

            {/* Keyboard Hints */}
            <div className="mt-3 text-center text-xs text-slate-500">
              Use arrow keys ← → or Enter to navigate • ESC to skip
            </div>
          </div>
        </div>
      </div>

      {/* Badge Preview (Last Step) */}
      {isLastStep && tour.badge && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[10000] animate-in zoom-in duration-500">
          <div className="bg-white rounded-2xl shadow-2xl p-6 text-center border-4 border-amber-400">
            <div className="mb-3">
              <Award className="h-16 w-16 text-amber-500 mx-auto fill-current" />
            </div>
            <h4 className="font-bold text-lg text-slate-900 mb-1">
              You'll Earn:
            </h4>
            <p className="text-sm font-semibold text-amber-600">
              {tour.badge.name} Badge
            </p>
          </div>
        </div>
      )}
    </>
  );
};

// Tour Definitions for different roles
export const TOUR_DEFINITIONS: TourDefinition[] = [
  {
    id: 'student-intro',
    role: 'student',
    title: 'Welcome Student!',
    description: 'Learn about Canada\'s energy in 10 minutes',
    duration: '10 minutes',
    steps: [
      {
        id: 'welcome',
        title: '👋 Welcome!',
        content:
          'Let\'s explore where Canada\'s energy comes from! This tour will teach you the basics of our energy system in a fun, easy way.',
        placement: 'center',
        tip: 'You can skip this tour anytime by pressing ESC'
      },
      {
        id: 'energy-mix',
        title: '🌈 The Energy Mix',
        content:
          'This chart shows where our electricity comes from. See the different colors? Each one is a different energy source - like wind, solar, or natural gas!',
        target: '[data-tour="energy-mix"]',
        placement: 'right',
        tip: 'Click on each section to learn more about that energy source'
      },
      {
        id: 'renewables',
        title: '♻️ Renewable Energy',
        content:
          'Green and blue sections are "renewable" - they never run out! Wind, solar, and water power are renewable. They\'re also super clean!',
        target: '[data-tour="renewables"]',
        placement: 'bottom',
        tip: 'Renewable energy is getting cheaper every year!'
      },
      {
        id: 'provinces',
        title: '🗺️ Compare Provinces',
        content:
          'Different provinces use different energy sources. Quebec uses lots of hydro (water power), while Alberta uses more natural gas.',
        target: '[data-tour="provinces"]',
        placement: 'right',
        action: {
          label: 'Explore Provinces →',
          onClick: () => console.log('Navigate to provinces')
        }
      },
      {
        id: 'complete',
        title: '🎉 You Did It!',
        content:
          'Great job! You now know the basics of Canada\'s energy system. Keep exploring to learn more!',
        placement: 'center'
      }
    ],
    badge: {
      name: 'Energy Explorer',
      icon: '🔋'
    }
  },

  {
    id: 'homeowner-intro',
    role: 'homeowner',
    title: 'Homeowner Guide',
    description: 'Understand your energy and save money',
    duration: '10 minutes',
    steps: [
      {
        id: 'welcome',
        title: '💡 Save on Your Energy Bill',
        content:
          'Welcome! This tour will show you how to understand your energy usage and save money on your electricity bill.',
        placement: 'center'
      },
      {
        id: 'real-time-prices',
        title: '💰 Real-Time Pricing',
        content:
          'See these numbers? They show the current electricity price. When it\'s low (green), that\'s the best time to use power-hungry appliances!',
        target: '[data-tour="pricing"]',
        placement: 'right',
        tip: 'Run your dishwasher and do laundry during off-peak hours to save!'
      },
      {
        id: 'peak-times',
        title: '⏰ Peak Hours',
        content:
          'Energy costs more during "peak hours" (usually 5-9 PM) when everyone is home. Try to avoid using major appliances during this time.',
        target: '[data-tour="peak-demand"]',
        placement: 'bottom'
      },
      {
        id: 'calculator',
        title: '📊 Your Carbon Footprint',
        content:
          'Use this calculator to estimate your home\'s energy usage and carbon footprint. See how you compare to the average Canadian home!',
        target: '[data-tour="calculator"]',
        placement: 'right',
        action: {
          label: 'Try Calculator →',
          onClick: () => console.log('Open calculator')
        }
      },
      {
        id: 'tips',
        title: '💡 Saving Tips',
        content:
          'Based on your province and usage, here are personalized tips to reduce your energy costs and environmental impact.',
        placement: 'center'
      }
    ],
    badge: {
      name: 'Energy Saver',
      icon: '🏠'
    }
  }

  // Add more tour definitions for teacher, researcher, etc.
];

export default GuidedTour;
