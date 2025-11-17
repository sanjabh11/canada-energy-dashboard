import React, { useEffect, useState } from 'react';
import { X, Award, TrendingUp } from 'lucide-react';
import { Badge, getBadgeTierConfig } from '../../lib/gamificationService';

interface BadgeEarnedModalProps {
  isOpen: boolean;
  badge: Badge | null;
  onClose: () => void;
}

export function BadgeEarnedModal({ isOpen, badge, onClose }: BadgeEarnedModalProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      // Auto-close after 8 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 8000);
      return () => clearTimeout(timer);
    } else {
      setIsAnimating(false);
    }
  }, [isOpen, onClose]);

  if (!isOpen || !badge) return null;

  const tierConfig = getBadgeTierConfig(badge.tier);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop with animation */}
      <div
        className={`absolute inset-0 bg-black transition-opacity duration-500 ${
          isAnimating ? 'opacity-70' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Confetti effect (CSS animation) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="confetti"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
              backgroundColor: [
                '#3b82f6', // blue
                '#8b5cf6', // purple
                '#ec4899', // pink
                '#10b981', // green
                '#f59e0b', // amber
                '#06b6d4', // cyan
              ][Math.floor(Math.random() * 6)]
            }}
          />
        ))}
      </div>

      {/* Modal Content */}
      <div
        className={`
          relative bg-slate-900 rounded-2xl border-2 shadow-2xl max-w-lg w-full overflow-hidden
          transform transition-all duration-700
          ${isAnimating ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}
          ${tierConfig.borderColor}
        `}
      >
        {/* Gradient background */}
        <div className={`absolute inset-0 bg-gradient-to-br ${tierConfig.gradientFrom} ${tierConfig.gradientTo} opacity-20`} />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 text-slate-400 hover:text-white transition-colors"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="relative p-8 text-center">
          {/* Trophy icon with pulse animation */}
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full animate-pulse-slow">
              <Award className="h-10 w-10 text-white" />
            </div>
          </div>

          {/* Congratulations text */}
          <h2 className="text-3xl font-bold text-white mb-2 animate-fade-in-up">
            Congratulations! 🎉
          </h2>
          <p className="text-slate-300 mb-8">You've earned a new badge!</p>

          {/* Badge display */}
          <div
            className={`
              inline-flex flex-col items-center p-6 rounded-2xl border-2 mb-6
              ${tierConfig.bgColor} ${tierConfig.borderColor}
              animate-bounce-in
            `}
          >
            {/* Badge icon */}
            <div className="text-7xl mb-4">
              {badge.icon || tierConfig.icon}
            </div>

            {/* Badge name */}
            <h3 className={`text-2xl font-bold mb-2 ${tierConfig.color}`}>
              {badge.name}
            </h3>

            {/* Badge tier */}
            <span
              className={`
                text-xs font-semibold px-3 py-1 rounded-full uppercase mb-3
                ${tierConfig.color}
              `}
            >
              {badge.tier} Tier
            </span>

            {/* Badge description */}
            <p className="text-slate-700 text-sm max-w-xs">
              {badge.description}
            </p>
          </div>

          {/* Points earned */}
          <div className="flex items-center justify-center space-x-2 mb-6">
            <TrendingUp className="h-5 w-5 text-green-400" />
            <span className="text-lg font-semibold text-green-400">
              +{badge.points} points earned
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg transition-colors"
            >
              Continue
            </button>
            <a
              href="/badges"
              className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg transition-colors"
            >
              View All Badges
            </a>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(-100vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }

        .confetti {
          position: absolute;
          width: 10px;
          height: 10px;
          animation: confetti-fall linear infinite;
        }

        @keyframes pulse-slow {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }

        .animate-pulse-slow {
          animation: pulse-slow 2s ease-in-out infinite;
        }

        @keyframes fade-in-up {
          0% {
            opacity: 0;
            transform: translateY(20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out;
        }

        @keyframes bounce-in {
          0% {
            opacity: 0;
            transform: scale(0.3);
          }
          50% {
            transform: scale(1.05);
          }
          70% {
            transform: scale(0.9);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-bounce-in {
          animation: bounce-in 0.8s ease-out 0.3s both;
        }
      `}</style>
    </div>
  );
}
