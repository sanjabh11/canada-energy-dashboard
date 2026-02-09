/**
 * Route-level error fallback for React Router errorElement.
 * Provides a user-friendly error UI when a route fails to load or render.
 */

import React from 'react';
import { useRouteError, isRouteErrorResponse } from 'react-router-dom';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export const RouteErrorFallback: React.FC = () => {
  const error = useRouteError();

  let title = 'Something Went Wrong';
  let message = 'An unexpected error occurred while loading this page.';

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      title = 'Page Not Found';
      message = 'The page you are looking for does not exist or has been moved.';
    } else {
      title = `Error ${error.status}`;
      message = error.statusText || message;
    }
  }

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center p-4">
      <div className="max-w-md w-full card p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="bg-red-900/20 p-4 rounded-full">
            <AlertTriangle className="h-12 w-12 text-red-500" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-primary mb-2">{title}</h1>
        <p className="text-secondary mb-6">{message}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => window.location.reload()}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
          <a
            href="/"
            className="flex items-center justify-center gap-2 bg-secondary hover:bg-[var(--bg-secondary-hover)] text-primary px-6 py-3 rounded-lg font-medium transition-colors"
          >
            <Home className="h-4 w-4" />
            Home
          </a>
        </div>
        {import.meta.env.DEV && error instanceof Error && (
          <details className="mt-6 text-left">
            <summary className="cursor-pointer text-sm font-medium text-secondary">
              Error Details
            </summary>
            <pre className="mt-2 p-3 bg-secondary rounded text-xs overflow-auto max-h-40">
              {error.message}
              {error.stack && '\n' + error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
};

export default RouteErrorFallback;
