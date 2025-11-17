import React from 'react';

interface FeatureCardProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  align?: 'left' | 'center';
  children?: React.ReactNode;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
  title,
  description,
  icon,
  badge,
  align = 'left',
  children
}) => {
  const bodyAlignClass = align === 'center' ? 'text-center' : 'text-left';

  return (
    <div className="card">
      {(icon || title || badge) && (
        <div className="card-header">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-sm">
              {icon && <div className="flex items-center justify-center">{icon}</div>}
              <h3 className="card-title mb-0">{title}</h3>
            </div>
            {badge && <div>{badge}</div>}
          </div>
        </div>
      )}
      <div className={`card-body ${bodyAlignClass}`}>
        {description && (
          <p className="text-secondary mb-3">{description}</p>
        )}
        {children}
      </div>
    </div>
  );
};
