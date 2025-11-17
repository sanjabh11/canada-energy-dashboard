import React from 'react';

export type MetricCardStatus = 'success' | 'warning' | 'danger' | 'info';

interface MetricCardProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  status?: MetricCardStatus;
  statusLabel?: string;
  labelPosition?: 'above' | 'below';
  align?: 'center' | 'left';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  icon,
  status,
  statusLabel,
  labelPosition = 'below',
  align = 'center'
}) => {
  const badgeClass = status ? `badge badge-${status}` : undefined;

  return (
    <div className="card card-metric">
      {status && (
        <div className="card-header">
          <div className="flex items-center justify-between">
            <span className="text-tertiary text-xs uppercase tracking-wide">
              {label}
            </span>
            <span className={badgeClass}>
              {statusLabel ?? status.toUpperCase()}
            </span>
          </div>
        </div>
      )}
      <div className={`card-body ${align === 'center' ? 'text-center' : 'text-left'}`}>
        {icon && (
          <div className="mb-3 flex justify-center">
            {icon}
          </div>
        )}
        {!status && labelPosition === 'above' && (
          <span className="metric-label">{label}</span>
        )}
        <span className="metric-value block">{value}</span>
        {!status && labelPosition === 'below' && (
          <span className="metric-label">{label}</span>
        )}
      </div>
    </div>
  );
};

interface MetricGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
}

export const MetricGrid: React.FC<MetricGridProps> = ({ children, columns = 3 }) => {
  let gridClasses = 'grid gap-md';

  if (columns === 1) {
    gridClasses = 'grid grid-cols-1 gap-md';
  } else if (columns === 2) {
    gridClasses = 'grid grid-cols-1 md:grid-cols-2 gap-md';
  } else if (columns === 4) {
    gridClasses = 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-md';
  } else {
    // default to 3 columns
    gridClasses = 'grid grid-cols-1 md:grid-cols-3 gap-md';
  }

  return <div className={gridClasses}>{children}</div>;
};
