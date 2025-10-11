/**
 * Debug Utility
 * 
 * Conditional logging that only outputs in development mode or when explicitly enabled.
 * Prevents debug logs from appearing in production builds.
 * 
 * Usage:
 * import { debug } from '@/lib/debug';
 * debug.log('Message', data);  // Only logs in dev
 * debug.error('Error', err);   // Always logs errors
 */

const isDev = import.meta.env.DEV;
const isDebugEnabled = import.meta.env.VITE_DEBUG_LOGS === 'true';

export const debug = {
  /**
   * Log general information (dev only)
   */
  log: (...args: any[]) => {
    if (isDev || isDebugEnabled) {
      console.log(...args);
    }
  },

  /**
   * Log warnings (dev only)
   */
  warn: (...args: any[]) => {
    if (isDev || isDebugEnabled) {
      console.warn(...args);
    }
  },

  /**
   * Log errors (always logged, even in production)
   */
  error: (...args: any[]) => {
    console.error(...args);
  },

  /**
   * Log info messages (dev only)
   */
  info: (...args: any[]) => {
    if (isDev || isDebugEnabled) {
      console.info(...args);
    }
  },

  /**
   * Group logs together (dev only)
   */
  group: (label: string, fn: () => void) => {
    if (isDev || isDebugEnabled) {
      console.group(label);
      fn();
      console.groupEnd();
    }
  },

  /**
   * Table output (dev only)
   */
  table: (data: any) => {
    if (isDev || isDebugEnabled) {
      console.table(data);
    }
  },

  /**
   * Performance timing (dev only)
   */
  time: (label: string) => {
    if (isDev || isDebugEnabled) {
      console.time(label);
    }
  },

  timeEnd: (label: string) => {
    if (isDev || isDebugEnabled) {
      console.timeEnd(label);
    }
  }
};

/**
 * Performance monitoring utility
 */
export const perf = {
  /**
   * Measure function execution time
   */
  measure: <T>(label: string, fn: () => T): T => {
    if (isDev || isDebugEnabled) {
      const start = performance.now();
      const result = fn();
      const end = performance.now();
      console.log(`⏱️ ${label}: ${(end - start).toFixed(2)}ms`);
      return result;
    }
    return fn();
  },

  /**
   * Measure async function execution time
   */
  measureAsync: async <T>(label: string, fn: () => Promise<T>): Promise<T> => {
    if (isDev || isDebugEnabled) {
      const start = performance.now();
      const result = await fn();
      const end = performance.now();
      console.log(`⏱️ ${label}: ${(end - start).toFixed(2)}ms`);
      return result;
    }
    return fn();
  }
};

/**
 * Component render tracking (dev only)
 */
export const renderTracker = {
  track: (componentName: string) => {
    if (isDev || isDebugEnabled) {
      const count = (window as any).__renderCounts || {};
      count[componentName] = (count[componentName] || 0) + 1;
      (window as any).__renderCounts = count;
      
      // Log if excessive renders detected
      if (count[componentName] > 10) {
        console.warn(`⚠️ ${componentName} has rendered ${count[componentName]} times`);
      }
    }
  },

  reset: () => {
    if (isDev || isDebugEnabled) {
      (window as any).__renderCounts = {};
      console.log('🔄 Render counts reset');
    }
  },

  report: () => {
    if (isDev || isDebugEnabled) {
      const counts = (window as any).__renderCounts || {};
      console.table(counts);
    }
  }
};
