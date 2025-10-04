import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
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

  // Validate feature flags on initialization
  const validation = validateFeatureFlags();
  const stats = getDeploymentStats();
  
  if (import.meta.env.DEV) {
    // In development mode, log detailed information
    if (!validation.valid) {
      console.error('⚠️ Feature flag validation failed:', validation.errors);
    } else {
      console.log('✅ Feature flags validated successfully');
    }
    console.log('📊 Deployment stats:', stats);
    console.log(`🚀 Phase 1 Launch: ${stats.enabled}/${stats.total} features enabled`);
    console.log(`   - Production Ready: ${stats.productionReady}`);
    console.log(`   - Acceptable: ${stats.acceptable}`);
    console.log(`   - Partial: ${stats.partial}`);
    console.log(`   - Deferred: ${stats.deferred}`);
  } else {
    // In production, only log summary
    console.log(`🚀 Canada Energy Intelligence Platform - Phase 1 Launch`);
    console.log(`📊 ${stats.enabled} features available`);
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
