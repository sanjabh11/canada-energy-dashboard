import React from 'react';
import {
  DataFreshnessBadge as UnifiedDataFreshnessBadge,
  type DataFreshnessBadgeProps as UnifiedDataFreshnessBadgeProps,
} from './ui/DataFreshnessBadge';
import { buildDataProvenance } from '../lib/foundation';

interface DataFreshnessBadgeProps {
  snapshotDate: string;
  snapshotLabel: string;
  isLive?: boolean;
  isFallback?: boolean;
  compact?: boolean;
  className?: string;
  source?: string;
}

export const DataFreshnessBadge: React.FC<DataFreshnessBadgeProps> = ({
  snapshotDate,
  snapshotLabel,
  isLive = false,
  isFallback = false,
  compact = false,
  className = '',
  source,
}) => {
  const meta = buildDataProvenance({
    source: source || snapshotLabel,
    lastUpdated: snapshotDate,
    isFallback,
    staleAfterHours: 24 * 30,
  });

  const status: UnifiedDataFreshnessBadgeProps['status'] = isLive ? 'live' : meta.freshnessStatus;

  return (
    <UnifiedDataFreshnessBadge
      timestamp={snapshotDate}
      compact={compact}
      className={className}
      status={status}
      source={source}
      staleThresholdMinutes={30 * 24 * 60}
      showRelative={false}
    />
  );
};
