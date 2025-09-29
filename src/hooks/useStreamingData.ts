import { useState, useEffect, useCallback } from 'react';
import { streamingService, StreamingDataPoint, StreamingConnection } from '../lib/data/streamingService';

/**
 * React Hook for real-time streaming data
 *
 * Provides easy access to streaming data with built-in fallback handling
 */
export function useStreamingData(dataset: string) {
  const [data, setData] = useState<StreamingDataPoint[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<StreamingConnection['status']>('disconnected');
  const [isUsingRealData, setIsUsingRealData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setError(null);

    // Subscribe to data updates FIRST to capture early fallback/connected events
    const unsubscribe = streamingService.onDataUpdate(dataset, (update) => {
      if (!isMounted) return;
      if (update.type === 'data') {
        setData(prev => [...prev, update.data].slice(-50)); // Keep last 50 data points
        setError(null);
      } else if (update.type === 'connected') {
        setConnectionStatus('connected');
        setIsUsingRealData(true);
        setError(null);
      } else if (update.type === 'fallback') {
        setConnectionStatus('connected');
        setIsUsingRealData(false);
        setError('Using fallback data');
      } else if (update.type === 'disconnected' || update.type === 'error') {
        setConnectionStatus('error');
        setIsUsingRealData(false);
        const errorMessage = typeof update.error === 'string'
          ? update.error
          : (update.error as { message?: string } | undefined)?.message;
        setError(errorMessage ?? 'Connection lost');
      } else if (update.type === 'connecting') {
        setConnectionStatus('connecting');
      }
    });

    // Then connect to stream
    streamingService.connectStream(dataset, `/functions/v1/stream-${dataset}`)
      .then((connection) => {
        if (isMounted) {
          // Status will be driven by listener events; set immediate snapshot only
          setConnectionStatus(connection.status);
        }
      })
      .catch((error) => {
        console.error(`Failed to connect to ${dataset} stream:`, error);
        if (isMounted) {
          setConnectionStatus('error');
          setIsUsingRealData(false);
          setError(error.message);
        }
      });

    // Cleanup
    return () => {
      isMounted = false;
      unsubscribe();
      // Note: We keep the underlying connection for other components
    };
  }, [dataset]);

  return { data, connectionStatus, isUsingRealData, error, setData };
}

/**
 * Hook for historical data pagination
 */
export function useHistoricalData(dataset: string, limit = 100, cursor?: string) {
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const loadHistoricalData = useCallback(async (newCursor?: string) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        ...(newCursor || cursor ? { cursor: newCursor || cursor || '' } : {}),
      });

      const response = await fetch(`/api/historical/${dataset}?${params}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setHistoricalData(result.rows || []);
      setNextCursor(result.next_cursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load historical data');
    } finally {
      setLoading(false);
    }
  }, [dataset, limit, cursor]);

  useEffect(() => {
    if (dataset) {
      loadHistoricalData();
    }
  }, [dataset, limit, loadHistoricalData]);

  return {
    historicalData,
    loading,
    error,
    nextCursor,
    loadHistoricalData,
    hasMore: nextCursor !== null
  };
}

/**
 * Hook for data service health monitoring
 */
export function useDataHealth() {
  const [health, setHealth] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const updateHealth = async () => {
      try {
        const response = await fetch('/api/health');
        if (response.ok) {
          const healthData = await response.json();
          setHealth(healthData);
        }
      } catch (error) {
        console.warn('Failed to fetch health data:', error);
      } finally {
        setLoading(false);
      }
    };

    updateHealth();
    const interval = setInterval(updateHealth, 30000); // Check every 30s

    return () => clearInterval(interval);
  }, []);

  return { health, loading };
}

// Utility functions for data processing
export const DataUtils = {
  /**
   * Get the latest data point from an array
   */
  getLatestDataPoint: (data: StreamingDataPoint[]): StreamingDataPoint | null => {
    if (!data.length) return null;
    return data[data.length - 1];
  },

  /**
   * Filter data points by time range
   */
  filterByTimeRange: (
    data: StreamingDataPoint[],
    startTime: string,
    endTime: string
  ): StreamingDataPoint[] => {
    return data.filter(point => {
      const pointTime = new Date(point.timestamp).getTime();
      const start = new Date(startTime).getTime();
      const end = new Date(endTime).getTime();
      return pointTime >= start && pointTime <= end;
    });
  },

  /**
   * Calculate simple statistics
   */
  calculateStats: (values: number[]): { mean: number; min: number; max: number; stdDev: number } => {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return { mean, min, max, stdDev };
  },

  /**
   * Format data for charts
   */
  formatForChart: (data: StreamingDataPoint[], valueKey: string) => {
    return data.map(point => ({
      timestamp: new Date(point.timestamp),
      value: point.values[valueKey] || 0,
      ...point.values
    }));
  }
};