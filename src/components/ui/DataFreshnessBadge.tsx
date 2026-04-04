/**
 * DataFreshnessBadge Component
 * 
 * Displays data freshness/last updated timestamp with visual indicators.
 * Addresses Gap #6: Performance UX (HIGH Priority)
 * 
 * Usage:
 * <DataFreshnessBadge timestamp={lastUpdated} />
 * <DataFreshnessBadge timestamp={lastUpdated} staleThresholdMinutes={30} />
 */

import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, AlertTriangle, RefreshCw, Database } from 'lucide-react';
import { getFreshnessStatus, type FreshnessStatus } from '../../lib/foundation';

export interface DataFreshnessBadgeProps {
  /** Timestamp of last data update (Date object or ISO string) */
  timestamp: Date | string | null | undefined;
  /** Minutes after which data is considered stale (default: 60) */
  staleThresholdMinutes?: number;
  /** Minutes after which data is considered very stale/expired (default: 1440 = 24h) */
  expiredThresholdMinutes?: number;
  /** Show relative time (e.g., "5 min ago") vs absolute time */
  showRelative?: boolean;
  /** Callback when refresh is clicked */
  onRefresh?: () => void;
  /** Show refresh button */
  showRefreshButton?: boolean;
  /** Loading state */
  isRefreshing?: boolean;
  /** Compact mode for tight spaces */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Explicitly override the computed status */
  status?: FreshnessStatus;
  /** Optional source label for high-risk datasets */
  source?: string;
}

export function DataFreshnessBadge({
  timestamp,
  staleThresholdMinutes = 60,
  expiredThresholdMinutes = 1440, // 24 hours
  showRelative = true,
  onRefresh,
  showRefreshButton = false,
  isRefreshing = false,
  compact = false,
  className = '',
  status,
  source,
}: DataFreshnessBadgeProps) {
  const [now, setNow] = useState(new Date());

  // Update "now" every minute for relative time display
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Parse timestamp
  const lastUpdate = timestamp
    ? typeof timestamp === 'string'
      ? new Date(timestamp)
      : timestamp
    : null;

  // Calculate freshness status
  const getStatus = (): FreshnessStatus => {
    if (status) return status;
    const baseStatus = getFreshnessStatus({
      lastUpdated: lastUpdate && !isNaN(lastUpdate.getTime()) ? lastUpdate.toISOString() : null,
      staleAfterHours: staleThresholdMinutes / 60,
      now,
    });

    if (baseStatus === 'unknown' || baseStatus === 'demo') return baseStatus;

    if (!lastUpdate || isNaN(lastUpdate.getTime())) return 'unknown';
    const minutesAgo = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);
    if (minutesAgo < expiredThresholdMinutes) return baseStatus;
    return 'stale';
  };

  // Format relative time
  const formatRelativeTime = (): string => {
    if (!lastUpdate || isNaN(lastUpdate.getTime())) return 'Unknown';
    
    const diffMs = now.getTime() - lastUpdate.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // Format absolute time
  const formatAbsoluteTime = (): string => {
    if (!lastUpdate || isNaN(lastUpdate.getTime())) return 'Unknown';
    
    return lastUpdate.toLocaleString('en-CA', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const currentStatus = getStatus();
  const displayTime = showRelative ? formatRelativeTime() : formatAbsoluteTime();

  // Status configuration
  const statusConfig: Record<FreshnessStatus, {
    icon: typeof CheckCircle;
    color: string;
    bgColor: string;
    borderColor: string;
    label: string;
  }> = {
    live: {
      icon: CheckCircle,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/30',
      label: 'Live'
    },
    stale: {
      icon: AlertTriangle,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/30',
      label: 'Stale'
    },
    demo: {
      icon: Database,
      color: 'text-sky-400',
      bgColor: 'bg-sky-500/10',
      borderColor: 'border-sky-500/30',
      label: 'Demo Data'
    },
    unknown: {
      icon: Clock,
      color: 'text-slate-400',
      bgColor: 'bg-slate-500/10',
      borderColor: 'border-slate-500/30',
      label: 'Unknown'
    }
  };

  const config = statusConfig[currentStatus];
  const Icon = config.icon;

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-1 text-xs ${config.color} ${className}`}
        title={`Last updated: ${formatAbsoluteTime()}`}
      >
        <Icon className="h-3 w-3" />
        <span>{currentStatus === 'demo' ? config.label : displayTime}</span>
        {showRefreshButton && onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="ml-1 hover:text-blue-400 disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-2 px-2 py-1 rounded border ${config.bgColor} ${config.borderColor} ${className}`}
    >
      <Icon className={`h-3.5 w-3.5 ${config.color}`} />
      <div className="flex items-center gap-2 text-xs">
        <span className={`font-medium ${config.color}`}>{config.label}</span>
        <span className="text-slate-400">•</span>
        <span className="text-slate-300" title={formatAbsoluteTime()}>
          {currentStatus === 'demo' ? 'Fallback or seeded dataset' : `Updated ${displayTime}`}
        </span>
        {source ? (
          <>
            <span className="text-slate-400">•</span>
            <span className="text-slate-300">{source}</span>
          </>
        ) : null}
      </div>
      {showRefreshButton && onRefresh && (
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="ml-1 p-0.5 rounded hover:bg-slate-600/50 disabled:opacity-50 transition-colors"
          title="Refresh data"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 text-slate-400 hover:text-blue-400 ${
              isRefreshing ? 'animate-spin' : ''
            }`}
          />
        </button>
      )}
    </div>
  );
}

/**
 * DataFreshnessIndicator - Minimal dot indicator
 */
export function DataFreshnessIndicator({
  timestamp,
  staleThresholdMinutes = 60,
  className = ''
}: Pick<DataFreshnessBadgeProps, 'timestamp' | 'staleThresholdMinutes' | 'className'>) {
  const lastUpdate = timestamp
    ? typeof timestamp === 'string'
      ? new Date(timestamp)
      : timestamp
    : null;

  const getStatus = (): FreshnessStatus => {
    if (!lastUpdate || isNaN(lastUpdate.getTime())) return 'unknown';
    
    const minutesAgo = (Date.now() - lastUpdate.getTime()) / (1000 * 60);
    
    if (minutesAgo < staleThresholdMinutes) return 'live';
    return 'stale';
  };

  const status = getStatus();
  const colorMap: Record<FreshnessStatus, string> = {
    live: 'bg-emerald-400',
    stale: 'bg-amber-400',
    demo: 'bg-sky-400',
    unknown: 'bg-slate-400'
  };

  return (
    <div
      className={`h-2 w-2 rounded-full ${colorMap[status]} ${
        status === 'live' ? 'animate-pulse' : ''
      } ${className}`}
      title={
        lastUpdate
          ? `Updated: ${lastUpdate.toLocaleString('en-CA')}`
          : 'Update time unknown'
      }
    />
  );
}

export default DataFreshnessBadge;
