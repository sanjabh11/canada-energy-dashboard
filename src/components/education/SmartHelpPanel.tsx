/**
 * SmartHelpPanel Component
 *
 * Contextual help system with 3-level explanations
 * (Beginner, Intermediate, Expert).
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  GraduationCap,
  BookOpen,
  Microscope,
  Lightbulb,
  Video,
  Image as ImageIcon,
  MessageCircle,
  ChevronRight,
  Star,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { cn } from '../../lib/utils';

export type ExplanationLevel = 'beginner' | 'intermediate' | 'expert';

export interface HelpContent {
  id: string;
  title: string;
  category?: string;
  explanations: {
    beginner: string;
    intermediate: string;
    expert: string;
  };
  visualAids?: {
    type: 'image' | 'video' | 'diagram';
    url: string;
    caption: string;
    thumbnail?: string;
  }[];
  realWorldExample?: string;
  funFact?: string;
  relatedConcepts?: {
    id: string;
    title: string;
  }[];
  keyTakeaways?: string[];
}

export interface SmartHelpPanelProps {
  content: HelpContent;
  defaultLevel?: ExplanationLevel;
  onClose: () => void;
  onLevelChange?: (level: ExplanationLevel) => void;
  onAskQuestion?: (question: string) => void;
  className?: string;
}

const LEVEL_CONFIG = {
  beginner: {
    label: 'Beginner',
    icon: GraduationCap,
    color: 'from-green-500 to-emerald-500',
    bgColor: 'bg-green-50',
    textColor: 'text-green-900',
    borderColor: 'border-green-200',
    description: 'Simple explanations for everyone (Ages 10+)'
  },
  intermediate: {
    label: 'Intermediate',
    icon: BookOpen,
    color: 'from-blue-500 to-indigo-500',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-900',
    borderColor: 'border-blue-200',
    description: 'For students and interested citizens'
  },
  expert: {
    label: 'Expert',
    icon: Microscope,
    color: 'from-purple-500 to-pink-500',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-900',
    borderColor: 'border-purple-200',
    description: 'Technical details for researchers'
  }
};

export const SmartHelpPanel: React.FC<SmartHelpPanelProps> = ({
  content,
  defaultLevel = 'beginner',
  onClose,
  onLevelChange,
  onAskQuestion,
  className
}) => {
  const [level, setLevel] = useState<ExplanationLevel>(defaultLevel);
  const [showMedia, setShowMedia] = useState<number | null>(null);
  const [question, setQuestion] = useState('');

  const levelConfig = LEVEL_CONFIG[level];
  const LevelIcon = levelConfig.icon;

  const handleLevelChange = (newLevel: ExplanationLevel) => {
    setLevel(newLevel);
    onLevelChange?.(newLevel);
  };

  const handleAskQuestion = () => {
    if (question.trim() && onAskQuestion) {
      onAskQuestion(question);
      setQuestion('');
    }
  };

  return (
    <div className={cn(
      'fixed inset-y-0 right-0 w-full md:w-[500px] lg:w-[600px]',
      'bg-white shadow-2xl z-50',
      'flex flex-col',
      'animate-in slide-in-from-right duration-300',
      className
    )}>
      {/* Header */}
      <div className={cn(
        'bg-gradient-to-r p-6 text-white',
        levelConfig.color
      )}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
              <LevelIcon className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{content.title}</h2>
              {content.category && (
                <p className="text-sm text-white/80">{content.category}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            aria-label="Close help panel"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Level Selector */}
        <div className="flex gap-2 flex-wrap">
          {(Object.keys(LEVEL_CONFIG) as ExplanationLevel[]).map((lvl) => {
            const config = LEVEL_CONFIG[lvl];
            const Icon = config.icon;
            const isActive = level === lvl;

            return (
              <button
                key={lvl}
                onClick={() => handleLevelChange(lvl)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm',
                  'transition-all duration-200',
                  isActive
                    ? 'bg-white text-slate-900 shadow-lg scale-105'
                    : 'bg-white/20 text-white hover:bg-white/30'
                )}
                title={config.description}
              >
                <Icon className="h-4 w-4" />
                {config.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Main Explanation */}
        <div className={cn(
          'rounded-xl border-2 p-5',
          levelConfig.bgColor,
          levelConfig.borderColor
        )}>
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className={cn('h-5 w-5', levelConfig.textColor)} />
            <h3 className={cn('font-bold text-lg', levelConfig.textColor)}>
              {levelConfig.label} Explanation
            </h3>
          </div>
          <p className="text-slate-700 leading-relaxed whitespace-pre-line">
            {content.explanations[level]}
          </p>
        </div>

        {/* Real World Example */}
        {content.realWorldExample && (
          <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Star className="h-5 w-5 text-amber-600 fill-current" />
              <h3 className="font-bold text-lg text-amber-900">
                Real-World Example
              </h3>
            </div>
            <p className="text-slate-700 leading-relaxed">
              {content.realWorldExample}
            </p>
          </div>
        )}

        {/* Fun Fact */}
        {content.funFact && (
          <div className="rounded-xl border-2 border-pink-200 bg-pink-50 p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-5 w-5 text-pink-600" />
              <h3 className="font-bold text-lg text-pink-900">
                Fun Fact!
              </h3>
            </div>
            <p className="text-slate-700 leading-relaxed">
              {content.funFact}
            </p>
          </div>
        )}

        {/* Key Takeaways */}
        {content.keyTakeaways && content.keyTakeaways.length > 0 && (
          <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-5">
            <h3 className="font-bold text-lg text-blue-900 mb-3">
              Key Takeaways
            </h3>
            <ul className="space-y-2">
              {content.keyTakeaways.map((takeaway, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <ChevronRight className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">{takeaway}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Visual Aids */}
        {content.visualAids && content.visualAids.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-slate-600" />
              Visual Learning
            </h3>
            {content.visualAids.map((media, idx) => (
              <div key={idx} className="rounded-xl border-2 border-slate-200 overflow-hidden bg-white">
                {media.type === 'video' && (
                  <div className="relative aspect-video bg-slate-900">
                    {showMedia === idx ? (
                      <iframe
                        src={media.url}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title={media.caption}
                      />
                    ) : (
                      <button
                        onClick={() => setShowMedia(idx)}
                        className="absolute inset-0 flex items-center justify-center bg-slate-900/80 hover:bg-slate-900/60 transition-colors"
                      >
                        <div className="text-center">
                          <Video className="h-12 w-12 text-white mx-auto mb-2" />
                          <p className="text-white font-medium">Click to watch video</p>
                        </div>
                      </button>
                    )}
                  </div>
                )}
                {media.type === 'image' && (
                  <img
                    src={media.url}
                    alt={media.caption}
                    className="w-full h-auto"
                  />
                )}
                <div className="p-3 bg-slate-50">
                  <p className="text-sm text-slate-600">{media.caption}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Related Concepts */}
        {content.relatedConcepts && content.relatedConcepts.length > 0 && (
          <div>
            <h3 className="font-bold text-lg text-slate-900 mb-3">
              Learn More About
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {content.relatedConcepts.map((concept) => (
                <button
                  key={concept.id}
                  className="flex items-center justify-between p-3 rounded-lg border-2 border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
                >
                  <span className="font-medium text-slate-900">{concept.title}</span>
                  <ChevronRight className="h-5 w-5 text-slate-400" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Ask a Question */}
        {onAskQuestion && (
          <div className="rounded-xl border-2 border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center gap-2 mb-3">
              <MessageCircle className="h-5 w-5 text-slate-600" />
              <h3 className="font-bold text-lg text-slate-900">
                Still have questions?
              </h3>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAskQuestion()}
                placeholder="Ask anything about this topic..."
                className="flex-1 px-4 py-2 rounded-lg border-2 border-slate-300 focus:border-blue-500 focus:outline-none"
              />
              <button
                onClick={handleAskQuestion}
                disabled={!question.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-medium rounded-lg transition-colors"
              >
                Ask
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              💡 Powered by AI - Get instant answers to your questions
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t-2 border-slate-200 p-4 bg-slate-50">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-slate-600">
            <AlertCircle className="h-4 w-4" />
            <span>Was this helpful?</span>
          </div>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium transition-colors">
              👍 Yes
            </button>
            <button className="px-3 py-1.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium transition-colors">
              👎 No
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartHelpPanel;
