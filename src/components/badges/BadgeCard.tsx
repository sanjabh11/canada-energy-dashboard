import React from 'react';
import { Lock, CheckCircle } from 'lucide-react';
import { Badge, getBadgeTierConfig } from '../../lib/gamificationService';

interface BadgeCardProps {
  badge: Badge;
  earned: boolean;
  earnedAt?: string;
  progress?: {
    current: number;
    total: number;
    percentage: number;
  };
  onClick?: () => void;
}

export function BadgeCard({ badge, earned, earnedAt, progress, onClick }: BadgeCardProps) {
  const tierConfig = getBadgeTierConfig(badge.tier);
  const progressPercent = progress?.percentage || 0;

  return (
    <div
      onClick={onClick}
      className={`
        relative group cursor-pointer
        bg-slate-800 rounded-xl border-2 transition-all duration-300
        hover:shadow-2xl hover:-translate-y-2
        ${earned
          ? `${tierConfig.borderColor} shadow-lg`
          : 'border-slate-700 opacity-75 hover:opacity-100'
        }
      `}
    >
      {/* Gradient overlay for earned badges */}
      {earned && (
        <div className={`absolute inset-0 bg-gradient-to-br ${tierConfig.gradientFrom} ${tierConfig.gradientTo} opacity-10 rounded-xl`} />
      )}

      <div className="relative p-6">
        {/* Badge Icon/Emoji */}
        <div className="flex items-center justify-center mb-4">
          <div
            className={`
              w-24 h-24 rounded-full flex items-center justify-center text-5xl
              transition-all duration-300 group-hover:scale-110
              ${earned
                ? `${tierConfig.bgColor} border-2 ${tierConfig.borderColor}`
                : 'bg-slate-900 border-2 border-slate-700'
              }
            `}
          >
            {earned ? (
              <span>{badge.icon || tierConfig.icon}</span>
            ) : (
              <Lock className="h-10 w-10 text-slate-600" />
            )}
          </div>
        </div>

        {/* Badge Name */}
        <h3 className={`text-xl font-bold text-center mb-2 ${earned ? 'text-white' : 'text-slate-400'}`}>
          {badge.name}
        </h3>

        {/* Badge Tier */}
        <div className="flex items-center justify-center mb-3">
          <span
            className={`
              text-xs font-semibold px-3 py-1 rounded-full uppercase
              ${earned
                ? `${tierConfig.bgColor} ${tierConfig.color}`
                : 'bg-slate-900 text-slate-500'
              }
            `}
          >
            {badge.tier}
          </span>
        </div>

        {/* Badge Description */}
        <p className={`text-sm text-center mb-4 ${earned ? 'text-slate-300' : 'text-slate-500'}`}>
          {badge.description}
        </p>

        {/* Progress Bar (for unearned badges) */}
        {!earned && progress && progress.total > 1 && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>Progress</span>
              <span>{progress.current} / {progress.total}</span>
            </div>
            <div className="relative w-full h-2 bg-slate-900 rounded-full overflow-hidden">
              <div
                className={`absolute inset-y-0 left-0 bg-gradient-to-r ${tierConfig.gradientFrom} ${tierConfig.gradientTo} transition-all duration-500`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Earned Badge Footer */}
        {earned && earnedAt && (
          <div className="flex items-center justify-center pt-3 border-t border-slate-700">
            <CheckCircle className="h-4 w-4 text-green-400 mr-2" />
            <span className="text-xs text-slate-400">
              Earned {new Date(earnedAt).toLocaleDateString('en-CA', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </span>
          </div>
        )}

        {/* Locked Badge Footer */}
        {!earned && (
          <div className="flex items-center justify-center pt-3 border-t border-slate-700">
            <Lock className="h-4 w-4 text-slate-600 mr-2" />
            <span className="text-xs text-slate-500">
              {progressPercent === 0 ? 'Not started' : `${Math.round(progressPercent)}% complete`}
            </span>
          </div>
        )}

        {/* Points Badge */}
        <div className="absolute top-4 right-4">
          <div
            className={`
              px-2 py-1 rounded-full text-xs font-bold
              ${earned
                ? `${tierConfig.bgColor} ${tierConfig.color}`
                : 'bg-slate-900 text-slate-600'
              }
            `}
          >
            {badge.points} pts
          </div>
        </div>
      </div>
    </div>
  );
}
