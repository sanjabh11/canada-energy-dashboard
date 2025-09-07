import React from 'react';
import { CONTAINER_CLASSES } from '../lib/ui/layout';

export interface QuickActionItem {
  id: string;
  label: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  onClick: () => void;
}

interface QuickActionsRibbonProps {
  title?: string;
  items: QuickActionItem[];
  className?: string;
}

/**
 * Horizontal scrollable ribbon of quick action buttons.
 * Prevents vertical overflow by keeping actions in a single row with horizontal scroll.
 * Used for page-specific action buttons and navigation shortcuts.
 */
export const QuickActionsRibbon: React.FC<QuickActionsRibbonProps> = ({
  title,
  items,
  className = ''
}) => {
  const getVariantClasses = (variant: QuickActionItem['variant'] = 'primary') => {
    const baseClasses = 'quick-action-item flex items-center space-x-3 p-4 rounded-lg transition-colors group hover:scale-105 transform duration-200';

    switch (variant) {
      case 'primary':
        return `${baseClasses} bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200`;
      case 'secondary':
        return `${baseClasses} bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200`;
      case 'success':
        return `${baseClasses} bg-green-50 hover:bg-green-100 text-green-700 border border-green-200`;
      case 'warning':
        return `${baseClasses} bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200`;
      case 'error':
        return `${baseClasses} bg-red-50 hover:bg-red-100 text-red-700 border border-red-200`;
      default:
        return `${baseClasses} bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200`;
    }
  };

  return (
    <div className={`${CONTAINER_CLASSES.card} ${className}`}>
      {title && (
        <div className={CONTAINER_CLASSES.cardHeader}>
          <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
        </div>
      )}
      <div className={CONTAINER_CLASSES.cardBody}>
        <div className="quick-actions">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={item.onClick}
                className={getVariantClasses(item.variant)}
                title={item.label}
              >
                {Icon ? <Icon className="h-6 w-6 group-hover:scale-110 transition-transform" /> : null}
                <span className="font-medium whitespace-nowrap">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default QuickActionsRibbon;
