/**
 * SkeletonLoader Component
 * 
 * Reusable skeleton loading states for dashboard components.
 * Addresses Gap #6: Performance UX (HIGH Priority)
 * 
 * Usage:
 * <SkeletonLoader type="card" />
 * <SkeletonLoader type="chart" height={300} />
 * <SkeletonLoader type="table" rows={5} />
 */

import React from 'react';

interface SkeletonProps {
  /** Width - can be number (px) or string (e.g., '100%') */
  width?: number | string;
  /** Height - can be number (px) or string */
  height?: number | string;
  /** Border radius */
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  /** Additional CSS classes */
  className?: string;
}

/**
 * Base Skeleton - animated placeholder block
 */
export function Skeleton({
  width = '100%',
  height = 16,
  rounded = 'md',
  className = ''
}: SkeletonProps) {
  const roundedClasses = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full'
  };

  return (
    <div
      className={`animate-pulse bg-slate-700/50 ${roundedClasses[rounded]} ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height
      }}
    />
  );
}

/**
 * SkeletonText - for text content placeholders
 */
export function SkeletonText({
  lines = 3,
  className = ''
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={12}
          width={i === lines - 1 ? '75%' : '100%'}
          rounded="sm"
        />
      ))}
    </div>
  );
}

/**
 * SkeletonCard - for card/metric placeholders
 */
export function SkeletonCard({
  className = ''
}: {
  className?: string;
}) {
  return (
    <div
      className={`p-6 bg-slate-800 border border-slate-700 rounded-lg ${className}`}
    >
      <div className="space-y-4">
        <Skeleton width="60%" height={16} />
        <Skeleton width="40%" height={32} />
        <SkeletonText lines={2} />
      </div>
    </div>
  );
}

/**
 * SkeletonChart - for chart placeholders
 */
export function SkeletonChart({
  height = 300,
  className = ''
}: {
  height?: number;
  className?: string;
}) {
  return (
    <div
      className={`p-4 bg-slate-800 border border-slate-700 rounded-lg ${className}`}
    >
      {/* Chart title skeleton */}
      <Skeleton width="40%" height={20} className="mb-4" />
      
      {/* Chart area skeleton with bars */}
      <div
        className="flex items-end justify-around gap-2"
        style={{ height: height - 60 }}
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton
            key={i}
            width={24}
            height={`${30 + Math.random() * 60}%`}
            rounded="sm"
          />
        ))}
      </div>
      
      {/* X-axis labels skeleton */}
      <div className="flex justify-around mt-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} width={30} height={10} rounded="sm" />
        ))}
      </div>
    </div>
  );
}

/**
 * SkeletonTable - for table placeholders
 */
export function SkeletonTable({
  rows = 5,
  columns = 4,
  className = ''
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div
      className={`bg-slate-800 border border-slate-700 rounded-lg overflow-hidden ${className}`}
    >
      {/* Header row */}
      <div className="flex gap-4 p-4 border-b border-slate-700 bg-slate-900/50">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} width={`${100 / columns}%`} height={14} />
        ))}
      </div>
      
      {/* Data rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="flex gap-4 p-4 border-b border-slate-700/50 last:border-0"
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              width={`${100 / columns}%`}
              height={12}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * SkeletonMetricGrid - for dashboard metric cards
 */
export function SkeletonMetricGrid({
  count = 4,
  className = ''
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

/**
 * SkeletonDashboard - full dashboard skeleton
 */
export function SkeletonDashboard({
  className = ''
}: {
  className?: string;
}) {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton width={300} height={28} className="mb-2" />
          <Skeleton width={200} height={16} />
        </div>
        <Skeleton width={120} height={36} rounded="lg" />
      </div>
      
      {/* Metrics grid */}
      <SkeletonMetricGrid count={4} />
      
      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonChart height={300} />
        <SkeletonChart height={300} />
      </div>
      
      {/* Table */}
      <SkeletonTable rows={5} columns={5} />
    </div>
  );
}

/**
 * SkeletonLoader - unified component with type prop
 */
export type SkeletonType = 'text' | 'card' | 'chart' | 'table' | 'metrics' | 'dashboard';

interface SkeletonLoaderProps {
  type: SkeletonType;
  lines?: number;
  rows?: number;
  columns?: number;
  count?: number;
  height?: number;
  className?: string;
}

export function SkeletonLoader({
  type,
  lines = 3,
  rows = 5,
  columns = 4,
  count = 4,
  height = 300,
  className = ''
}: SkeletonLoaderProps) {
  switch (type) {
    case 'text':
      return <SkeletonText lines={lines} className={className} />;
    case 'card':
      return <SkeletonCard className={className} />;
    case 'chart':
      return <SkeletonChart height={height} className={className} />;
    case 'table':
      return <SkeletonTable rows={rows} columns={columns} className={className} />;
    case 'metrics':
      return <SkeletonMetricGrid count={count} className={className} />;
    case 'dashboard':
      return <SkeletonDashboard className={className} />;
    default:
      return <Skeleton className={className} />;
  }
}

export default SkeletonLoader;
