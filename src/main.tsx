import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css';
import './styles/accessibility.css';
import { debug } from '@/lib/debug';
import { validateFeatureFlags, getDeploymentStats } from './lib/featureFlags'
import { initSentry } from './instrumentation/sentry';
import * as Sentry from '@sentry/react';

const PWA_ENABLED = import.meta.env.VITE_ENABLE_PWA === 'true';

// Initialize Sentry before anything else so it captures all errors
const sentryEnabled = initSentry();
if (sentryEnabled) {
  debug.log('[Sentry] Initialized successfully');
}

// Global error handlers — catch unhandled async errors outside React tree
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    console.error('[Global] Unhandled promise rejection:', event.reason);
    if (sentryEnabled) {
      Sentry.captureException(event.reason);
    }
    event.preventDefault();
  });
  window.addEventListener('error', (event) => {
    console.error('[Global] Uncaught error:', event.error ?? event.message);
    if (sentryEnabled && event.error) {
      Sentry.captureException(event.error);
    }
  });
}

// Initialize global database for caching (optional)
if (typeof window !== 'undefined') {
  // Simple IndexedDB wrapper for caching - can be extended
  (window as any).ceipDb = {
    provincial_generation: {
      clear: () => Promise.resolve(),
      bulkPut: (data: any[]) => Promise.resolve(),
      bulkAdd: (data: any[]) => Promise.resolve(),
      toArray: () => Promise.resolve([])
    },
    ontario_demand: {
      clear: () => Promise.resolve(),
      bulkPut: (data: any[]) => Promise.resolve(),
      bulkAdd: (data: any[]) => Promise.resolve(),
      toArray: () => Promise.resolve([])
    },
    ontario_prices: {
      clear: () => Promise.resolve(),
      bulkPut: (data: any[]) => Promise.resolve(),
      bulkAdd: (data: any[]) => Promise.resolve(),
      toArray: () => Promise.resolve([])
    },
    hf_electricity_demand: {
      clear: () => Promise.resolve(),
      bulkPut: (data: any[]) => Promise.resolve(),
      bulkAdd: (data: any[]) => Promise.resolve(),
      toArray: () => Promise.resolve([])
    }
  };

  const setupScrollAnimations = () => {
    if (!('IntersectionObserver' in window)) {
      return;
    }

    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
        }
      });
    }, observerOptions);

    const animateElements = document.querySelectorAll('.scroll-animate');
    animateElements.forEach((el) => observer.observe(el));
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupScrollAnimations, { once: true });
  } else {
    setupScrollAnimations();
  }

  // MVP demo freeze: disable the PWA layer unless it is explicitly re-enabled.
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      if (!PWA_ENABLED) {
        navigator.serviceWorker.getRegistrations()
          .then(async (registrations) => {
            await Promise.all(registrations.map((registration) => registration.unregister()));

            if ('caches' in window) {
              const keys = await window.caches.keys();
              await Promise.all(
                keys
                  .filter((key) => key.startsWith('ceip-'))
                  .map((key) => window.caches.delete(key))
              );
            }

            debug.log('[App] PWA disabled for MVP demo build; cleared CEIP service workers and caches.');
          })
          .catch((error) => {
            debug.error('[App] Failed to clear service workers for MVP demo build:', error);
          });
        return;
      }

      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          debug.log('[App] Service Worker registered:', registration.scope);
        })
        .catch((error) => {
          debug.error('[App] Service Worker registration failed:', error);
        });
    });
  }

  // Validate feature flags on initialization
  const validation = validateFeatureFlags();
  const stats = getDeploymentStats();
  
  if (import.meta.env.DEV) {
    // In development mode, log detailed information
    if (!validation.valid) {
      debug.error('⚠️ Feature flag validation failed:', validation.errors);
    } else {
      debug.log('✅ Feature flags validated successfully');
    }
    debug.log('📊 Deployment stats:', stats);
    debug.log(`🚀 Phase 1 Launch: ${stats.enabled}/${stats.total} features enabled`);
    debug.log(`   - Production Ready: ${stats.productionReady}`);
    debug.log(`   - Acceptable: ${stats.acceptable}`);
    debug.log(`   - Partial: ${stats.partial}`);
    debug.log(`   - Deferred: ${stats.deferred}`);
  } else {
    // In production, only log summary
    debug.log(`🚀 Canada Energy Intelligence Platform - Phase 1 Launch`);
    debug.log(`📊 ${stats.enabled} features available`);
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
