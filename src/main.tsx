import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css';
import './styles/accessibility.css';
import { debug } from '@/lib/debug';
import { validateFeatureFlags, getDeploymentStats } from './lib/featureFlags'

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

  // Register service worker in production builds only (PWA support)
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
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
