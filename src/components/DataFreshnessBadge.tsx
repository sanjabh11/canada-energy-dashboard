import React from 'react';
import { Clock, Wifi, WifiOff } from 'lucide-react';

interface DataFreshnessBadgeProps {
  snapshotDate: string;
  snapshotLabel: string;
  isLive?: boolean;
  compact?: boolean;
  className?: string;
}

export const DataFreshnessBadge: React.FC<DataFreshnessBadgeProps> = ({
  snapshotDate,
  snapshotLabel,
  isLive = false,
  compact = false,
  className = ''
}) => {
  const daysSinceSnapshot = Math.floor(
    (Date.now() - new Date(snapshotDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  const isStale = daysSinceSnapshot > 90;
  const isModerate = daysSinceSnapshot > 30 && daysSinceSnapshot <= 90;

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
          isLive
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            : isStale
            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            : 'bg-slate-700 text-slate-400 border border-slate-600'
        } ${className}`}
      >
        {isLive ? (
          <>
            <Wifi className="h-3 w-3" />
            Live
          </>
        ) : (
          <>
            <Clock className="h-3 w-3" />
            {snapshotLabel}
          </>
        )}
      </span>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg ${
        isLive
          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          : isStale
          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
          : isModerate
          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
          : 'bg-slate-800 text-slate-400 border border-slate-700'
      } ${className}`}
    >
      {isLive ? (
        <>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span>Live Data</span>
        </>
      ) : (
        <>
          <WifiOff className="h-3 w-3" />
          <span>Data as of {snapshotLabel}</span>
          {isStale && <span className="text-amber-500 font-medium">• Refresh needed</span>}
        </>
      )}
    </div>
  );
};
