import React, { useState } from 'react';
import { BadgeCard } from './BadgeCard';
import { BadgeProgress } from '../../lib/gamificationService';

interface BadgeGridProps {
  badgeProgress: BadgeProgress[];
  onBadgeClick?: (badgeProgress: BadgeProgress) => void;
}

export function BadgeGrid({ badgeProgress, onBadgeClick }: BadgeGridProps) {
  const [filter, setFilter] = useState<'all' | 'earned' | 'in_progress' | 'locked'>('all');

  // Filter badges
  const filteredBadges = badgeProgress.filter(bp => {
    switch (filter) {
      case 'earned':
        return bp.earned;
      case 'in_progress':
        return !bp.earned && bp.progress.percentage > 0;
      case 'locked':
        return !bp.earned && bp.progress.percentage === 0;
      default:
        return true;
    }
  });

  // Calculate stats
  const earnedCount = badgeProgress.filter(bp => bp.earned).length;
  const totalCount = badgeProgress.length;
  const totalPoints = badgeProgress
    .filter(bp => bp.earned)
    .reduce((sum, bp) => sum + bp.badge.points, 0);

  return (
    <div>
      {/* Stats Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 text-center">
          <div className="text-4xl font-bold text-cyan-400 mb-2">
            {earnedCount} / {totalCount}
          </div>
          <div className="text-sm text-slate-400">Badges Earned</div>
        </div>

        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 text-center">
          <div className="text-4xl font-bold text-purple-400 mb-2">
            {totalPoints}
          </div>
          <div className="text-sm text-slate-400">Total Points</div>
        </div>

        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 text-center">
          <div className="text-4xl font-bold text-green-400 mb-2">
            {Math.round((earnedCount / totalCount) * 100)}%
          </div>
          <div className="text-sm text-slate-400">Completion</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 mb-6 overflow-x-auto">
        <button
          onClick={() => setFilter('all')}
          className={`
            px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap
            ${filter === 'all'
              ? 'bg-cyan-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }
          `}
        >
          All ({totalCount})
        </button>
        <button
          onClick={() => setFilter('earned')}
          className={`
            px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap
            ${filter === 'earned'
              ? 'bg-cyan-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }
          `}
        >
          Earned ({earnedCount})
        </button>
        <button
          onClick={() => setFilter('in_progress')}
          className={`
            px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap
            ${filter === 'in_progress'
              ? 'bg-cyan-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }
          `}
        >
          In Progress ({badgeProgress.filter(bp => !bp.earned && bp.progress.percentage > 0).length})
        </button>
        <button
          onClick={() => setFilter('locked')}
          className={`
            px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap
            ${filter === 'locked'
              ? 'bg-cyan-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }
          `}
        >
          Locked ({badgeProgress.filter(bp => !bp.earned && bp.progress.percentage === 0).length})
        </button>
      </div>

      {/* Badge Grid */}
      {filteredBadges.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🏆</div>
          <p className="text-slate-400 mb-2">No badges to show</p>
          <p className="text-sm text-slate-500">
            {filter === 'earned' && 'Start earning badges by completing activities!'}
            {filter === 'in_progress' && 'Start working on some badges to see progress here.'}
            {filter === 'locked' && 'All badges are in progress or earned!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredBadges.map(bp => (
            <BadgeCard
              key={bp.badge.id}
              badge={bp.badge}
              earned={bp.earned}
              earnedAt={bp.earnedAt}
              progress={bp.progress}
              onClick={() => onBadgeClick?.(bp)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
