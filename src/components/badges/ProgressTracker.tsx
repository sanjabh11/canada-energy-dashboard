import React from 'react';
import { TrendingUp, Award, Target, Zap } from 'lucide-react';
import { BadgeProgress, getBadgeTierConfig } from '../../lib/gamificationService';

interface ProgressTrackerProps {
  badgeProgress: BadgeProgress[];
  showDetailed?: boolean;
}

export function ProgressTracker({ badgeProgress, showDetailed = false }: ProgressTrackerProps) {
  // Calculate overall stats
  const totalBadges = badgeProgress.length;
  const earnedBadges = badgeProgress.filter(bp => bp.earned).length;
  const inProgressBadges = badgeProgress.filter(bp => !bp.earned && bp.progress.percentage > 0).length;
  const totalPoints = badgeProgress
    .filter(bp => bp.earned)
    .reduce((sum, bp) => sum + bp.badge.points, 0);
  const maxPoints = badgeProgress.reduce((sum, bp) => sum + bp.badge.points, 0);
  const overallProgress = totalBadges > 0 ? (earnedBadges / totalBadges) * 100 : 0;

  // Calculate tier breakdown
  const tierStats = {
    bronze: {
      total: badgeProgress.filter(bp => bp.badge.tier === 'bronze').length,
      earned: badgeProgress.filter(bp => bp.badge.tier === 'bronze' && bp.earned).length
    },
    silver: {
      total: badgeProgress.filter(bp => bp.badge.tier === 'silver').length,
      earned: badgeProgress.filter(bp => bp.badge.tier === 'silver' && bp.earned).length
    },
    gold: {
      total: badgeProgress.filter(bp => bp.badge.tier === 'gold').length,
      earned: badgeProgress.filter(bp => bp.badge.tier === 'gold' && bp.earned).length
    },
    platinum: {
      total: badgeProgress.filter(bp => bp.badge.tier === 'platinum').length,
      earned: badgeProgress.filter(bp => bp.badge.tier === 'platinum' && bp.earned).length
    }
  };

  // Get next badges to earn (closest to completion)
  const nextBadges = badgeProgress
    .filter(bp => !bp.earned)
    .sort((a, b) => b.progress.percentage - a.progress.percentage)
    .slice(0, 3);

  if (!showDetailed) {
    // Compact view
    return (
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Award className="h-6 w-6 text-cyan-400 mr-3" />
            <h3 className="text-lg font-semibold text-white">Badge Progress</h3>
          </div>
          <span className="text-2xl font-bold text-cyan-400">
            {earnedBadges} / {totalBadges}
          </span>
        </div>

        <div className="relative w-full h-3 bg-slate-900 rounded-full overflow-hidden mb-4">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
            style={{ width: `${overallProgress}%` }}
          />
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-xl font-bold text-purple-400">{totalPoints}</div>
            <div className="text-xs text-slate-400">Points</div>
          </div>
          <div>
            <div className="text-xl font-bold text-green-400">{inProgressBadges}</div>
            <div className="text-xs text-slate-400">In Progress</div>
          </div>
          <div>
            <div className="text-xl font-bold text-cyan-400">{Math.round(overallProgress)}%</div>
            <div className="text-xs text-slate-400">Complete</div>
          </div>
        </div>
      </div>
    );
  }

  // Detailed view
  return (
    <div className="space-y-6">
      {/* Overall Progress Card */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 shadow-xl p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="bg-cyan-600 p-3 rounded-xl mr-4">
              <TrendingUp className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Overall Progress</h2>
              <p className="text-slate-400 text-sm">Track your learning journey</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold text-cyan-400">{Math.round(overallProgress)}%</div>
            <div className="text-sm text-slate-400">Complete</div>
          </div>
        </div>

        <div className="relative w-full h-4 bg-slate-900 rounded-full overflow-hidden mb-6">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 transition-all duration-700"
            style={{ width: `${overallProgress}%` }}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-cyan-400 mb-1">{earnedBadges}</div>
            <div className="text-xs text-slate-400">Badges Earned</div>
          </div>
          <div className="bg-slate-900 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-400 mb-1">{totalPoints}</div>
            <div className="text-xs text-slate-400">Total Points</div>
          </div>
          <div className="bg-slate-900 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-400 mb-1">{inProgressBadges}</div>
            <div className="text-xs text-slate-400">In Progress</div>
          </div>
          <div className="bg-slate-900 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-orange-400 mb-1">{totalBadges - earnedBadges}</div>
            <div className="text-xs text-slate-400">Remaining</div>
          </div>
        </div>
      </div>

      {/* Tier Breakdown */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <div className="flex items-center mb-6">
          <Target className="h-6 w-6 text-cyan-400 mr-3" />
          <h3 className="text-xl font-semibold text-white">Badges by Tier</h3>
        </div>

        <div className="space-y-4">
          {Object.entries(tierStats).map(([tier, stats]) => {
            const tierConfig = getBadgeTierConfig(tier as any);
            const tierProgress = stats.total > 0 ? (stats.earned / stats.total) * 100 : 0;

            return (
              <div key={tier}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <span className="text-2xl mr-2">{tierConfig.icon}</span>
                    <span className={`font-semibold capitalize ${tierConfig.color}`}>
                      {tier}
                    </span>
                  </div>
                  <span className="text-sm text-slate-400">
                    {stats.earned} / {stats.total}
                  </span>
                </div>
                <div className="relative w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                  <div
                    className={`absolute inset-y-0 left-0 bg-gradient-to-r ${tierConfig.gradientFrom} ${tierConfig.gradientTo} transition-all duration-500`}
                    style={{ width: `${tierProgress}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Next Badges to Earn */}
      {nextBadges.length > 0 && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <div className="flex items-center mb-6">
            <Zap className="h-6 w-6 text-cyan-400 mr-3" />
            <h3 className="text-xl font-semibold text-white">Next Badges to Earn</h3>
          </div>

          <div className="space-y-4">
            {nextBadges.map(bp => {
              const tierConfig = getBadgeTierConfig(bp.badge.tier);

              return (
                <div key={bp.badge.id} className="bg-slate-900 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <span className="text-3xl mr-3">{bp.badge.icon || tierConfig.icon}</span>
                      <div>
                        <h4 className="font-semibold text-white">{bp.badge.name}</h4>
                        <p className="text-xs text-slate-400">{bp.badge.description}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-semibold ${tierConfig.color}`}>
                      {Math.round(bp.progress.percentage)}%
                    </span>
                  </div>
                  <div className="relative w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`absolute inset-y-0 left-0 bg-gradient-to-r ${tierConfig.gradientFrom} ${tierConfig.gradientTo} transition-all duration-500`}
                      style={{ width: `${bp.progress.percentage}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-slate-500">
                      {bp.progress.current} / {bp.progress.total} completed
                    </span>
                    <span className="text-xs text-purple-400">+{bp.badge.points} pts</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
