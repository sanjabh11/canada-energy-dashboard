import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

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
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
