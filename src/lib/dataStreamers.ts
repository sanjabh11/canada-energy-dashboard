/**
 * Comprehensive Data Streamers for Energy Dashboard
 * 
 * This module handles streaming data from all 4 energy datasets:
 * - Provincial Generation (Kaggle)
 * - Ontario Demand (Kaggle)
 * - Ontario Prices (Kaggle)
 * - HF Electricity Demand (Hugging Face)
 */

import { getEdgeBaseUrl, getEdgeHeaders } from './config';
import { fetchEdgeJson, fetchEdgeWithParams } from './edge';
import { clientStreamSimulator } from './clientStreamSimulator';

// Types
export interface StreamingOptions {
  limit?: number;
  maxRows?: number;
  onProgress?: (progress: { loaded: number; total: number; percentage: number }) => void;
  onError?: (error: Error) => void;
  signal?: AbortSignal;
}

export interface ConnectionStatus {
  dataset: string;
  status: 'connected' | 'connecting' | 'error' | 'fallback';
  lastUpdate: Date | null;
  error?: string;
  recordCount: number;
  source: 'stream' | 'fallback';
}

// Dataset Types
export interface ProvincialGenerationRecord {
  id?: string | number;
  date: string;
  province?: string;
  province_code?: string;
  producer?: string;
  generation_type?: string | null;
  megawatt_hours?: number;
  generation_gwh?: number;
  source?: string;
  version?: string;
  ingested_at?: Date;
}

export interface OntarioDemandRecord {
  id?: number;
  datetime: string;
  hour_ending: number;
  total_demand_mw: number;
  hourly_demand_gwh: number;
  date: string;
  source: 'kaggle' | 'fallback';
  version: string;
  ingested_at: Date;
}

export interface OntarioPricesRecord {
  id?: number;
  datetime: string;
  node_name: string;
  lmp_price: number;
  energy_price: number;
  congestion_price: number;
  loss_price: number;
  zone: string;
  market_date: string;
  interval_ending: string;
  source: 'kaggle' | 'fallback';
  version: string;
  ingested_at: Date;
}

export interface HFElectricityDemandRecord {
  datetime: string;
  electricity_demand: number;
  temperature: number;
  humidity: number;
  wind_speed: number;
  solar_irradiance: number;
  household_id: string;
  location: string;
  day_of_week: number;
  hour: number;
  source: string;
  version: string;
}

export interface EmissionsRecord {
  id?: number;
  date: string;
  region: string;
  sector: string;
  emissions_tons_co2: number;
  source: 'kaggle' | 'fallback';
  version: string;
  ingested_at: Date;
}

export interface MarketRecord {
  id?: number;
  date: string;
  node: string;
  price: number;
  source: 'kaggle' | 'fallback';
  version: string;
  ingested_at: Date;
}

export interface CommunityRecord {
  id?: number;
  date: string;
  region: string;
  plan: string;
  source: 'kaggle' | 'fallback';
  version: string;
  ingested_at: Date;
}

/**
 * Base Data Streamer Class
 */
export abstract class BaseDataStreamer {
  protected baseUrl: string;
  protected headers: Record<string, string>;
  
  constructor() {
    this.baseUrl = getEdgeBaseUrl();
    this.headers = getEdgeHeaders();
  }

  protected async fetchWithErrorHandling(url: string, signal?: AbortSignal) {
    const response = await fetch(url, {
      headers: this.headers,
      signal
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`);
    }

    return response;
  }
}

const getBaseDataUrl = () => {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '/');
  return `${base}data/`;
};

async function loadSampleJson<T>(fileName: string): Promise<T> {
  const url = `${getBaseDataUrl()}${fileName}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load fallback data from ${url}: ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as T;
}

/**
 * Provincial Generation Data Streamer
 */
export class ProvincialGenerationStreamer extends BaseDataStreamer {
  async getManifest() {
    return {
      dataset: 'provincial_generation',
      version: '1.0',
      fields: ['date','province','producer','generation_type','megawatt_hours','source','version'],
      page_size_default: 100,
      max_page_size: 1000,
      notes: 'Provincial generation manifest placeholder',
    };
  }

  async *streamData(options: StreamingOptions = {}): AsyncGenerator<any[], void, unknown> {
    const { limit = 1000, maxRows = Infinity, onProgress, onError, signal } = options;
    
    let cursor: string | null = null;
    let totalLoaded = 0;
    let totalEstimate = 0;

    try {
      while (totalLoaded < maxRows) {
        if (signal?.aborted) {
          const e: any = new Error('Aborted');
          e.name = 'AbortError';
          throw e;
        }

        const params: Record<string, string> = {
          limit: Math.min(limit, maxRows - totalLoaded).toString()
        };
        if (cursor) params['cursor'] = cursor;

        const response = await fetchEdgeWithParams([
          'stream-provincial-generation',
          'stream/kaggle/provincial_generation'
        ], params, { signal });
        const data = await response.json();
        const nextCursor = response.headers.get('x-next-cursor');

        if (!totalEstimate && data.metadata?.totalEstimate) {
          totalEstimate = Math.min(data.metadata.totalEstimate, maxRows);
        }

        totalLoaded += data.rows?.length || 0;
        onProgress?.({
          loaded: totalLoaded,
          total: totalEstimate || maxRows,
          percentage: totalEstimate ? (totalLoaded / totalEstimate) * 100 : 0
        });

        yield data.rows || [];

        if (!data.metadata?.hasMore || !nextCursor || !data.rows?.length) break;
        cursor = nextCursor;
      }
    } catch (error) {
      onError?.(error as Error);
      throw error;
    }
  }

  async loadFallbackData(): Promise<ProvincialGenerationRecord[]> {
    const raw = await loadSampleJson<Array<Omit<ProvincialGenerationRecord, 'source' | 'version' | 'ingested_at'>>>(
      'provincial_generation_sample.json'
    );
    const now = new Date();
    return raw.map((record, index) => ({
      ...record,
      id: record.id ?? `provincial_generation_fallback_${index}`,
      source: 'fallback',
      version: '1.0-fallback',
      ingested_at: now
    }));
  }
}

/**
 * Ontario Demand Data Streamer
 */
export class OntarioDemandStreamer extends BaseDataStreamer {
  async getManifest() {
    const { json } = await fetchEdgeJson([
      'manifest-ontario-demand',
      'manifest/kaggle/ontario_demand'
    ]);
    return json;
  }

  async *streamData(options: StreamingOptions = {}): AsyncGenerator<any[], void, unknown> {
    const { limit = 1000, maxRows = Infinity, onProgress, onError, signal } = options;
    
    let cursor: string | null = null;
    let totalLoaded = 0;
    let totalEstimate = 0;

    try {
      while (totalLoaded < maxRows) {
        if (signal?.aborted) {
          const e: any = new Error('Aborted');
          e.name = 'AbortError';
          throw e;
        }

        const params: Record<string, string> = {
          limit: Math.min(limit, maxRows - totalLoaded).toString()
        };
        if (cursor) params['cursor'] = cursor;

        const response = await fetchEdgeWithParams([
          'stream-ontario-demand',
          'stream/kaggle/ontario_demand'
        ], params, { signal });
        const data = await response.json();
        const nextCursor = response.headers.get('x-next-cursor');

        if (!totalEstimate && data.metadata?.totalEstimate) {
          totalEstimate = Math.min(data.metadata.totalEstimate, maxRows);
        }

        totalLoaded += data.rows?.length || 0;
        onProgress?.({
          loaded: totalLoaded,
          total: totalEstimate || maxRows,
          percentage: totalEstimate ? (totalLoaded / totalEstimate) * 100 : 0
        });

        yield data.rows || [];

        if (!data.metadata?.hasMore || !nextCursor || !data.rows?.length) break;
        cursor = nextCursor;
      }
    } catch (error) {
      onError?.(error as Error);
      throw error;
    }
  }

  async loadFallbackData(): Promise<OntarioDemandRecord[]> {
    const raw = await loadSampleJson<Array<Omit<OntarioDemandRecord, 'source' | 'version' | 'ingested_at'>>>(
      'ontario_demand_sample.json'
    );
    return raw.map((record, index) => ({
      ...record,
      id: record.id ?? index,
      source: 'fallback',
      version: '1.0-fallback',
      ingested_at: new Date(record.datetime)
    }));
  }
}

/**
 * Ontario Prices Data Streamer
 */
export class OntarioPricesStreamer extends BaseDataStreamer {
  async getManifest() {
    const { json } = await fetchEdgeJson([
      'manifest-ontario-prices',
      'manifest/kaggle/ontario_prices'
    ]);
    return json;
  }

  async *streamData(options: StreamingOptions = {}): AsyncGenerator<any[], void, unknown> {
    const { limit = 1000, maxRows = Infinity, onProgress, onError, signal } = options;
    
    let cursor: string | null = null;
    let totalLoaded = 0;
    let totalEstimate = 0;

    try {
      while (totalLoaded < maxRows) {
        if (signal?.aborted) {
          const e: any = new Error('Aborted');
          e.name = 'AbortError';
          throw e;
        }

        const params: Record<string, string> = {
          limit: Math.min(limit, maxRows - totalLoaded).toString()
        };
        if (cursor) params['cursor'] = cursor;

        const response = await fetchEdgeWithParams([
          'stream-ontario-prices',
          'stream/kaggle/ontario_prices'
        ], params, { signal });
        const data = await response.json();
        const nextCursor = response.headers.get('x-next-cursor');

        if (!totalEstimate && data.metadata?.totalEstimate) {
          totalEstimate = Math.min(data.metadata.totalEstimate, maxRows);
        }

        totalLoaded += data.rows?.length || 0;
        onProgress?.({
          loaded: totalLoaded,
          total: totalEstimate || maxRows,
          percentage: totalEstimate ? (totalLoaded / totalEstimate) * 100 : 0
        });

        yield data.rows || [];

        if (!data.metadata?.hasMore || !nextCursor || !data.rows?.length) break;
        cursor = nextCursor;
      }
    } catch (error) {
      onError?.(error as Error);
      throw error;
    }
  }

  async loadFallbackData(): Promise<OntarioPricesRecord[]> {
    const raw = await loadSampleJson<Array<Omit<OntarioPricesRecord, 'source' | 'version' | 'ingested_at'>>>(
      'ontario_prices_sample.json'
    );
    return raw.map((record, index) => ({
      ...record,
      id: record.id ?? index,
      source: 'fallback',
      version: '1.0-fallback',
      ingested_at: new Date(record.datetime)
    }));
  }
}

/**
 * HF Electricity Demand Data Streamer
 */
export class HFElectricityDemandStreamer extends BaseDataStreamer {
  async getManifest() {
    return {
      dataset: 'hf_electricity_demand',
      version: '1.0',
      fields: ['datetime','electricity_demand','temperature','humidity','wind_speed','solar_irradiance','household_id','location','day_of_week','hour','source','version'],
      page_size_default: 100,
      max_page_size: 1000,
      notes: 'HF electricity demand manifest placeholder',
    };
  }

  async *streamData(options: StreamingOptions = {}): AsyncGenerator<any[], void, unknown> {
    const { limit = 1000, maxRows = Infinity, onProgress, onError, signal } = options;
    
    let cursor: string | null = null;
    let totalLoaded = 0;
    let totalEstimate = 0;

    try {
      while (totalLoaded < maxRows) {
        if (signal?.aborted) {
          const e: any = new Error('Aborted');
          e.name = 'AbortError';
          throw e;
        }

        const params: Record<string, string> = {
          limit: Math.min(limit, maxRows - totalLoaded).toString()
        };
        if (cursor) params['cursor'] = cursor;

        const response = await fetchEdgeWithParams([
          'stream-hf-electricity-demand',
          'stream/hf/electricity_demand',
          'stream/huggingface/electricity_demand'
        ], params, { signal });
        const data = await response.json();
        const nextCursor = response.headers.get('x-next-cursor');

        if (!totalEstimate && data.metadata?.totalEstimate) {
          totalEstimate = Math.min(data.metadata.totalEstimate, maxRows);
        }

        totalLoaded += data.rows?.length || 0;
        onProgress?.({
          loaded: totalLoaded,
          total: totalEstimate || maxRows,
          percentage: totalEstimate ? (totalLoaded / totalEstimate) * 100 : 0
        });

        yield data.rows || [];

        if (!data.metadata?.hasMore || !nextCursor || !data.rows?.length) break;
        cursor = nextCursor;
      }
    } catch (error) {
      onError?.(error as Error);
      throw error;
    }
  }

  async loadFallbackData(): Promise<HFElectricityDemandRecord[]> {
    const raw = await loadSampleJson<Array<HFElectricityDemandRecord & { datetime: string }>>(
      'hf_electricity_demand_sample.json'
    );
    return raw.map((record) => ({
      ...record,
      source: 'fallback',
      version: '1.0-fallback'
    }));
  }
}

/**
 * Emissions Data Streamer
 */
export class EmissionsStreamer extends BaseDataStreamer {
  async getManifest() {
    const { json } = await fetchEdgeJson([
      'manifest-emissions',
      'manifest/kaggle/emissions'
    ]);
    return json;
  }

  async *streamData(options: StreamingOptions = {}): AsyncGenerator<any[], void, unknown> {
    const { limit = 1000, maxRows = Infinity, onProgress, onError, signal } = options;
    
    let cursor: string | null = null;
    let totalLoaded = 0;
    let totalEstimate = 0;

    try {
      while (totalLoaded < maxRows) {
        if (signal?.aborted) {
          const e: any = new Error('Aborted');
          e.name = 'AbortError';
          throw e;
        }

        const params: Record<string, string> = {
          limit: Math.min(limit, maxRows - totalLoaded).toString()
        };
        if (cursor) params['cursor'] = cursor;

        const response = await fetchEdgeWithParams([
          'stream-emissions',
          'stream/kaggle/emissions'
        ], params, { signal });
        const data = await response.json();
        const nextCursor = response.headers.get('x-next-cursor');

        if (!totalEstimate && data.metadata?.totalEstimate) {
          totalEstimate = Math.min(data.metadata.totalEstimate, maxRows);
        }

        totalLoaded += data.rows?.length || 0;
        onProgress?.({
          loaded: totalLoaded,
          total: totalEstimate || maxRows,
          percentage: totalEstimate ? (totalLoaded / totalEstimate) * 100 : 0
        });

        yield data.rows || [];

        if (!data.metadata?.hasMore || !nextCursor || !data.rows?.length) break;
        cursor = nextCursor;
      }
    } catch (error) {
      onError?.(error as Error);
      throw error;
    }
  }

  async loadFallbackData(): Promise<EmissionsRecord[]> {
    // Fallback disabled: no mock/sample data permitted
    throw new Error('Fallback disabled: emissions requires real streaming backend');
  }
}

/**
 * Market Data Streamer
 */
export class MarketStreamer extends BaseDataStreamer {
  async getManifest() {
    const { json } = await fetchEdgeJson([
      'manifest-market',
      'manifest/kaggle/market'
    ]);
    return json;
  }

  async *streamData(options: StreamingOptions = {}): AsyncGenerator<any[], void, unknown> {
    const { limit = 1000, maxRows = Infinity, onProgress, onError, signal } = options;
    
    let cursor: string | null = null;
    let totalLoaded = 0;
    let totalEstimate = 0;

    try {
      while (totalLoaded < maxRows) {
        if (signal?.aborted) {
          const e: any = new Error('Aborted');
          e.name = 'AbortError';
          throw e;
        }

        const params: Record<string, string> = {
          limit: Math.min(limit, maxRows - totalLoaded).toString()
        };
        if (cursor) params['cursor'] = cursor;

        const response = await fetchEdgeWithParams([
          'stream-market',
          'stream/kaggle/market'
        ], params, { signal });
        const data = await response.json();
        const nextCursor = response.headers.get('x-next-cursor');

        if (!totalEstimate && data.metadata?.totalEstimate) {
          totalEstimate = Math.min(data.metadata.totalEstimate, maxRows);
        }

        totalLoaded += data.rows?.length || 0;
        onProgress?.({
          loaded: totalLoaded,
          total: totalEstimate || maxRows,
          percentage: totalEstimate ? (totalLoaded / totalEstimate) * 100 : 0
        });

        yield data.rows || [];

        if (!data.metadata?.hasMore || !nextCursor || !data.rows?.length) break;
        cursor = nextCursor;
      }
    } catch (error) {
      onError?.(error as Error);
      throw error;
    }
  }

  async loadFallbackData(): Promise<MarketRecord[]> {
    throw new Error('Fallback disabled: market requires real streaming backend');
  }
}

/**
 * Community Data Streamer
 */
export class CommunityStreamer extends BaseDataStreamer {
  async getManifest() {
    const { json } = await fetchEdgeJson([
      'manifest-community',
      'manifest/kaggle/community'
    ]);
    return json;
  }

  async *streamData(options: StreamingOptions = {}): AsyncGenerator<any[], void, unknown> {
    const { limit = 1000, maxRows = Infinity, onProgress, onError, signal } = options;
    
    let cursor: string | null = null;
    let totalLoaded = 0;
    let totalEstimate = 0;

    try {
      while (totalLoaded < maxRows) {
        if (signal?.aborted) {
          const e: any = new Error('Aborted');
          e.name = 'AbortError';
          throw e;
        }

        const params: Record<string, string> = {
          limit: Math.min(limit, maxRows - totalLoaded).toString()
        };
        if (cursor) params['cursor'] = cursor;

        const response = await fetchEdgeWithParams([
          'stream-community',
          'stream/kaggle/community'
        ], params, { signal });
        const data = await response.json();
        const nextCursor = response.headers.get('x-next-cursor');

        if (!totalEstimate && data.metadata?.totalEstimate) {
          totalEstimate = Math.min(data.metadata.totalEstimate, maxRows);
        }

        totalLoaded += data.rows?.length || 0;
        onProgress?.({
          loaded: totalLoaded,
          total: totalEstimate || maxRows,
          percentage: totalEstimate ? (totalLoaded / totalEstimate) * 100 : 0
        });

        yield data.rows || [];

        if (!data.metadata?.hasMore || !nextCursor || !data.rows?.length) break;
        cursor = nextCursor;
      }
    } catch (error) {
      onError?.(error as Error);
      throw error;
    }
  }

  async loadFallbackData(): Promise<CommunityRecord[]> {
    throw new Error('Fallback disabled: community requires real streaming backend');
  }
}

// Export instances
export const provincialGenerationStreamer = new ProvincialGenerationStreamer();
export const ontarioDemandStreamer = new OntarioDemandStreamer();
export const ontarioPricesStreamer = new OntarioPricesStreamer();
export const hfElectricityDemandStreamer = new HFElectricityDemandStreamer();
export const emissionsStreamer = new EmissionsStreamer();
export const marketStreamer = new MarketStreamer();
export const communityStreamer = new CommunityStreamer();
