/**
 * Energy Data Manager
 * 
 * Central data management system that coordinates all dataset streamers,
 * handles caching, and provides unified data access.
 */

import {
  provincialGenerationStreamer,
  ontarioDemandStreamer,
  ontarioPricesStreamer,
  hfElectricityDemandStreamer,
  type ProvincialGenerationRecord,
  type OntarioDemandRecord,
  type OntarioPricesRecord,
  type HFElectricityDemandRecord,
  type StreamingOptions,
  type ConnectionStatus
} from './dataStreamers';
import { getFeatureFlagUseStreaming, canUseStreaming, isStreamingConfigured } from './config';
import { cache } from './cache';

// Re-export types for convenience
export type { ConnectionStatus, StreamingOptions };
export type { ProvincialGenerationRecord, OntarioDemandRecord, OntarioPricesRecord, HFElectricityDemandRecord };

export type DatasetType = 'provincial_generation' | 'ontario_demand' | 'ontario_prices' | 'hf_electricity_demand';

export interface DatasetInfo {
  key: DatasetType;
  name: string;
  description: string;
  color: string;
  icon: string;
  estimatedRows: number;
  source: 'kaggle' | 'huggingface';
}

export const DATASETS: DatasetInfo[] = [
  {
    key: 'provincial_generation',
    name: 'Provincial Generation',
    description: 'Canadian provincial electricity generation by source',
    color: '#0ea5e9', // Electric blue
    icon: 'Zap',
    estimatedRows: 50000,
    source: 'kaggle'
  },
  {
    key: 'ontario_demand',
    name: 'Ontario Demand',
    description: 'Ontario hourly electricity demand data',
    color: '#10b981', // Green
    icon: 'TrendingUp',
    estimatedRows: 175000,
    source: 'kaggle'
  },
  {
    key: 'ontario_prices',
    name: 'Ontario Prices',
    description: 'Ontario LMP pricing data with 5-min intervals',
    color: '#f59e0b', // Orange
    icon: 'DollarSign',
    estimatedRows: 2500000,
    source: 'kaggle'
  },
  {
    key: 'hf_electricity_demand',
    name: 'HF Electricity Demand',
    description: 'European smart meter data with weather',
    color: '#ef4444', // Red
    icon: 'Home',
    estimatedRows: 8760000,
    source: 'huggingface'
  }
];

export interface DataLoadOptions {
  forceStream?: boolean;
  maxRows?: number;
  onProgress?: (progress: { loaded: number; total: number; percentage: number }) => void;
  onStatusChange?: (status: ConnectionStatus) => void;
  signal?: AbortSignal;
}

export class EnergyDataManager {
  private connectionStatuses: Map<DatasetType, ConnectionStatus> = new Map();
  private dataCache: Map<DatasetType, any[]> = new Map();
  private statusListeners: Map<DatasetType, Set<(status: ConnectionStatus) => void>> = new Map();

  constructor() {
    // Initialize connection statuses
    DATASETS.forEach(dataset => {
      this.connectionStatuses.set(dataset.key, {
        dataset: dataset.name,
        status: 'connecting',
        lastUpdate: null,
        recordCount: 0,
        source: 'stream'
      });
      this.statusListeners.set(dataset.key, new Set());
    });
  }

  private updateStatus(datasetKey: DatasetType, updates: Partial<ConnectionStatus>) {
    const current = this.connectionStatuses.get(datasetKey)!;
    const newStatus = { ...current, ...updates };
    this.connectionStatuses.set(datasetKey, newStatus);
    
    // Notify listeners
    const listeners = this.statusListeners.get(datasetKey);
    listeners?.forEach(listener => listener(newStatus));
  }

  public subscribeToStatus(datasetKey: DatasetType, callback: (status: ConnectionStatus) => void) {
    const listeners = this.statusListeners.get(datasetKey)!;
    listeners.add(callback);
    
    // Immediately call with current status
    const current = this.connectionStatuses.get(datasetKey)!;
    callback(current);
    
    // Return unsubscribe function
    return () => {
      listeners.delete(callback);
    };
  }

  public getConnectionStatus(datasetKey: DatasetType): ConnectionStatus {
    return this.connectionStatuses.get(datasetKey)!;
  }

  public getAllConnectionStatuses(): ConnectionStatus[] {
    return Array.from(this.connectionStatuses.values());
  }

  public async initializeConnection(datasetKey: DatasetType): Promise<boolean> {
    try {
      this.updateStatus(datasetKey, { status: 'connecting', error: undefined });
      
      // If streaming isn't enabled or not configured, surface error (no mock fallback allowed)
      if (!canUseStreaming()) {
        this.updateStatus(datasetKey, {
          status: 'error',
          source: 'stream',
          error: 'Streaming not configured (no fallback allowed)'
        });
        return false;
      }

      // Attempt to connect to the stream by getting the manifest
      const streamer = this.getStreamer(datasetKey);
      await streamer.getManifest();

      this.updateStatus(datasetKey, {
        status: 'connected',
        source: 'stream',
        lastUpdate: new Date()
      });
      
      return true;
    } catch (error) {
      console.error(`Failed to initialize connection for ${datasetKey}:`, error);
      
      this.updateStatus(datasetKey, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Connection failed'
      });
      
      return false;
    }
  }

  public async loadData(
    datasetKey: DatasetType,
    options: DataLoadOptions = {}
  ): Promise<any[]> {
    const { forceStream = false, maxRows = 5000, onProgress, onStatusChange, signal } = options;
    
    this.updateStatus(datasetKey, { status: 'connecting', error: undefined });
    onStatusChange?.(this.getConnectionStatus(datasetKey));

    // Soft pre-hydrate from persistent cache (does not change status/source)
    try {
      if (!this.dataCache.get(datasetKey)) {
        const persisted = await cache.getItem(datasetKey);
        if (persisted && persisted.length > 0) {
          this.dataCache.set(datasetKey, persisted);
        }
      }
    } catch { /* ignore cache errors */ }

    try {
      let data: any[];
      const wantStreaming = forceStream || getFeatureFlagUseStreaming();
      const useStreaming = wantStreaming && isStreamingConfigured();

      if (!useStreaming) {
        const err = new Error('Streaming disabled or not configured (no fallback allowed)');
        this.updateStatus(datasetKey, {
          status: 'error',
          source: 'stream',
          recordCount: 0,
          lastUpdate: new Date(),
          error: err.message
        });
        throw err;
      }

      data = await this.loadFromStream(datasetKey, { maxRows, onProgress, signal });
      this.updateStatus(datasetKey, {
        status: 'connected',
        source: 'stream',
        recordCount: data.length,
        lastUpdate: new Date()
      });

      this.dataCache.set(datasetKey, data);
      // Persist to IndexedDB cache (best effort)
      try { await cache.setItem(datasetKey, data); } catch { /* ignore cache errors */ }
      onStatusChange?.(this.getConnectionStatus(datasetKey));
      return data;
    } catch (error: any) {
      // If the request was aborted, do not fallback; bubble up and let caller handle.
      if (error?.name === 'AbortError') {
        throw error;
      }
      console.error(`Failed to load streaming data for ${datasetKey}:`, error);
      // Surface error; do not attempt sample fallback
      this.updateStatus(datasetKey, {
        status: 'error',
        source: 'stream',
        recordCount: 0,
        lastUpdate: new Date(),
        error: error instanceof Error ? error.message : 'Stream failed'
      });
      onStatusChange?.(this.getConnectionStatus(datasetKey));
      throw error;
    }
  }

  private async loadFromStream(
    datasetKey: DatasetType,
    options: { maxRows: number; onProgress?: StreamingOptions['onProgress']; signal?: AbortSignal }
  ): Promise<any[]> {
    const streamer = this.getStreamer(datasetKey);
    const allRows: any[] = [];

    for await (const batch of streamer.streamData({
      limit: 1000,
      maxRows: options.maxRows,
      onProgress: options.onProgress,
      signal: options.signal
    })) {
      allRows.push(...batch.map(row => ({
        ...row,
        source: DATASETS.find(d => d.key === datasetKey)?.source || 'kaggle',
        version: '1.0-stream',
        ingested_at: new Date()
      })));
    }

    return allRows;
  }

  private async loadFromFallback(datasetKey: DatasetType): Promise<any[]> {
    const streamer = this.getStreamer(datasetKey);
    return await streamer.loadFallbackData();
  }

  private getStreamer(datasetKey: DatasetType) {
    switch (datasetKey) {
      case 'provincial_generation':
        return provincialGenerationStreamer;
      case 'ontario_demand':
        return ontarioDemandStreamer;
      case 'ontario_prices':
        return ontarioPricesStreamer;
      case 'hf_electricity_demand':
        return hfElectricityDemandStreamer;
      default:
        throw new Error(`Unknown dataset: ${datasetKey}`);
    }
  }

  public getCachedData(datasetKey: DatasetType): any[] | undefined {
    return this.dataCache.get(datasetKey);
  }

  public clearCache(datasetKey?: DatasetType) {
    if (datasetKey) {
      this.dataCache.delete(datasetKey);
    } else {
      this.dataCache.clear();
    }
  }

  public async refreshData(
    datasetKey: DatasetType,
    options: DataLoadOptions = {}
  ): Promise<any[]> {
    this.clearCache(datasetKey);
    return await this.loadData(datasetKey, { ...options });
  }

  public exportData(datasetKey: DatasetType, format: 'json' | 'csv' = 'json'): string {
    const data = this.getCachedData(datasetKey);
    if (!data || data.length === 0) {
      throw new Error(`No data available for ${datasetKey}`);
    }

    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    } else if (format === 'csv') {
      const headers = Object.keys(data[0]);
      const csvRows = [headers.join(',')];
      
      data.forEach(row => {
        const values = headers.map(header => {
          const value = row[header];
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value}"`;
          }
          return value;
        });
        csvRows.push(values.join(','));
      });
      
      return csvRows.join('\n');
    }

    throw new Error(`Unsupported format: ${format}`);
  }

  public async initializeAllDatasets(options: Omit<DataLoadOptions, 'forceStream'> = {}) {
    const initPromises = DATASETS.map(async (dataset) => {
      try {
        await this.loadData(dataset.key, { ...options, maxRows: 100 }); // Load small sample for all
      } catch (error) {
        console.warn(`Failed to initialize ${dataset.key}:`, error);
        // Continue initialization even if some datasets fail
      }
    });

    await Promise.allSettled(initPromises);
    console.log('Dataset initialization completed');
  }

  public downloadData(datasetKey: DatasetType, format: 'json' | 'csv' = 'json') {
    const data = this.exportData(datasetKey, format);
    const blob = new Blob([data], { type: format === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${datasetKey}_${new Date().toISOString().split('T')[0]}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// Export singleton instance
export const energyDataManager = new EnergyDataManager();
