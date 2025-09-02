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
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
