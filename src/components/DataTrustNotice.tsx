import React from 'react';
import { AlertTriangle, DatabaseZap, FlaskConical } from 'lucide-react';

interface DataTrustNoticeProps {
  mode: 'fallback' | 'mock';
  title?: string;
  message: string;
  className?: string;
}

const config = {
  fallback: {
    icon: DatabaseZap,
    container: 'border-amber-200 bg-amber-50 text-amber-900',
    iconClass: 'text-amber-700',
    label: 'Fallback data in use',
  },
  mock: {
    icon: FlaskConical,
    container: 'border-blue-200 bg-blue-50 text-blue-900',
    iconClass: 'text-blue-700',
    label: 'Illustrative data in use',
  },
} as const;

export const DataTrustNotice: React.FC<DataTrustNoticeProps> = ({
  mode,
  title,
  message,
  className = '',
}) => {
  const Icon = config[mode].icon;

  return (
    <div 
      role="alert" 
      aria-live="polite" 
      aria-atomic="true"
      className={`rounded-xl border px-4 py-3 ${config[mode].container} ${className}`}
    >
      <div className="flex items-start gap-3">
        <Icon aria-hidden="true" className={`mt-0.5 h-5 w-5 flex-shrink-0 ${config[mode].iconClass}`} />
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span>{title || config[mode].label}</span>
            <AlertTriangle aria-hidden="true" className="h-3.5 w-3.5 opacity-70" />
          </div>
          <p className="mt-1 text-sm opacity-90">{message}</p>
        </div>
      </div>
    </div>
  );
};

export default DataTrustNotice;
