import React from 'react';

interface CardTableProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const CardTable: React.FC<CardTableProps> = ({
  title,
  subtitle,
  headerRight,
  children,
  className,
}) => {
  const outerClasses = ['card', 'card-table', className].filter(Boolean).join(' ');
  const hasHeader = title || subtitle || headerRight;

  return (
    <div className={outerClasses}>
      <div className="p-6">
        {hasHeader && (
          <div className="flex items-start justify-between mb-4">
            <div>
              {title && (
                <h3 className="text-lg font-semibold text-primary">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="mt-1 text-sm text-secondary">
                  {subtitle}
                </p>
              )}
            </div>
            {headerRight}
          </div>
        )}
        <div className="overflow-x-auto">
          {children}
        </div>
      </div>
    </div>
  );
};
