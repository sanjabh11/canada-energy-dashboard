/**
 * Enhanced Error Boundary Component
 * 
 * Catches React errors and provides user-friendly fallback UI.
 * Phase 2: Testing & Hardening - Error Resilience
 */

import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

const serializeError = (error: any) => {
  if (error instanceof Error) {
    return error.message + '\n' + error.stack;
  }
  return JSON.stringify(error, null, 2);
};

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
  errorInfo: any;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error details
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // In production, send to error tracking service (e.g., Sentry)
    if (import.meta.env.PROD) {
      // TODO: Send to error tracking
      // Example: Sentry.captureException(error, { contexts: { react: errorInfo } });
    }
    
    this.setState({ errorInfo });
  }

  handleReload = () => {
    // Clear error state and reload
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  handleGoHome = () => {
    // Clear error and navigate home
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default professional error UI
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg border border-slate-200 p-8">
            {/* Error Icon */}
            <div className="flex justify-center mb-6">
              <div className="bg-red-50 p-4 rounded-full">
                <AlertTriangle className="h-12 w-12 text-red-600" />
              </div>
            </div>

            {/* Error Message */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                Something Went Wrong
              </h1>
              <p className="text-slate-600">
                We encountered an unexpected error. Your work has been preserved,
                and you can try reloading the page.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
              <button
                onClick={this.handleReload}
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Reload Page
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-3 rounded-lg font-medium transition-colors"
              >
                <Home className="h-4 w-4" />
                Go to Home
              </button>
            </div>

            {/* Error Details (Collapsible) */}
            {import.meta.env.DEV && this.state.error && (
              <details className="mt-6">
                <summary className="cursor-pointer text-sm font-medium text-slate-700 hover:text-slate-900">
                  Show Error Details (Development Mode)
                </summary>
                <div className="mt-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <pre className="text-xs text-slate-800 overflow-auto max-h-64">
                    {serializeError(this.state.error)}
                  </pre>
                  {this.state.errorInfo && (
                    <pre className="text-xs text-slate-600 mt-3 overflow-auto max-h-32">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}

            {/* Support Info */}
            <div className="mt-6 pt-6 border-t border-slate-200 text-center">
              <p className="text-sm text-slate-500">
                If this problem persists, please contact support with the error details above.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}