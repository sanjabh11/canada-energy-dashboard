/**
 * Loading Spinner Component
 * 
 * Displays loading state with progress information.
 */

import React from 'react';
import { Loader, Zap, Database } from 'lucide-react';

interface LoadingSpinnerProps {
  progress?: {
    loaded: number;
    total: number;
    percentage: number;
  } | null;
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  progress,
  message = 'Loading...',
  size = 'md',
  showProgress = true
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  const containerClasses = {
    sm: 'p-2',
    md: 'p-4',
    lg: 'p-8'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  return (
    <div className={`flex flex-col items-center justify-center ${containerClasses[size]}`}>
      {/* Animated Icon */}
      <div className="relative mb-4">
        <div className="absolute inset-0 animate-pulse">
          <div className="bg-gradient-to-r from-blue-600 to-blue-400 rounded-full p-3">
            <Zap className={`${sizeClasses[size]} text-white`} />
          </div>
        </div>
        <div className="bg-gradient-to-r from-blue-600 to-blue-400 rounded-full p-3">
          <Zap className={`${sizeClasses[size]} text-white animate-bounce`} />
        </div>
      </div>

      {/* Message */}
      <div className={`${textSizeClasses[size]} font-semibold text-slate-700 mb-2`}>
        {message}
      </div>

      {/* Progress Information */}
      {progress && showProgress && (
        <div className="w-full max-w-md space-y-3">
          {/* Progress Bar */}
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-600 to-blue-400 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, progress.percentage))}%` }}
            />
          </div>

          {/* Progress Text */}
          <div className="flex justify-between items-center text-sm text-slate-600">
            <div className="flex items-center space-x-2">
              <Database className="h-4 w-4" />
              <span>
                {progress.loaded.toLocaleString()} / {progress.total.toLocaleString()} records
              </span>
            </div>
            <div className="font-medium">
              {progress.percentage.toFixed(1)}%
            </div>
          </div>
        </div>
      )}

      {/* Spinning Loader for Indeterminate Progress */}
      {(!progress || !showProgress) && (
        <div className="mt-2">
          <Loader className={`${sizeClasses[size]} text-blue-600 animate-spin`} />
        </div>
      )}

      {/* Loading States */}
      <div className="mt-4 text-center">
        <div className="flex items-center justify-center space-x-1">
          <div className="h-1 w-1 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="h-1 w-1 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="h-1 w-1 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <div className="text-xs text-slate-500 mt-2">
          {progress ? 'Streaming data from server' : 'Connecting to data source'}
        </div>
      </div>
    </div>
  );
};

/**
 * Mini Loading Spinner for inline use
 */
export const MiniLoadingSpinner: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`inline-flex items-center space-x-2 ${className}`}>
      <Loader className="h-3 w-3 text-blue-600 animate-spin" />
      <span className="text-xs text-slate-500">Loading...</span>
    </div>
  );
};

/**
 * Full Screen Loading Overlay
 */
export const FullScreenLoader: React.FC<LoadingSpinnerProps> = (props) => {
  return (
    <div className="fixed inset-0 bg-white bg-opacity-90 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8">
        <LoadingSpinner {...props} size="lg" />
      </div>
    </div>
  );
};
