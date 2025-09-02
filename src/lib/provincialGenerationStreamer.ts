/**
 * Provincial Generation Streaming Client
 * 
 * This module handles streaming data from the Kaggle provincial generation dataset
 * through the Supabase edge functions and populates IndexedDB for client-side caching.
 */

// Feature flag - set to false in production until validated
const USE_STREAMING_DATASETS = false;

// Configuration
const SUPABASE_URL = 'https://jxdihzqoaxtydolmltdr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4ZGloenFvYXh0eWRvbG1sdGRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5MjQ2MDUsImV4cCI6MjA3MTUwMDYwNX0.RS92p3Y7qJ-38PLFR1L4Y9Rl9R4dmFYYCVxhBcJBW8Q';

// Types
interface ManifestResponse {
  dataset: string;
  version: string;
  schema: {
    fields: Array<{
      name: string;
      type: string;
      description: string;
    }>;
  };
  sampleRows: Array<Record<string, any>>;
  estimatedRows: number;
  recommendedLimit: number;
  metadata: {
    description: string;
    source: string;
    lastUpdated: string;
    coverage: {
      dateRange: string;
      provinces: string[];
      generationTypes: string[];
    };
  };
}

interface StreamResponse {
  rows: Array<{
    date: string;
    province: string;
    producer: string;
    generation_type: string;
    megawatt_hours: number;
  }>;
  metadata: {
    offset: number;
    limit: number;
    returned: number;
    hasMore: boolean;
    totalEstimate: number;
  };
}

interface StreamingOptions {
  limit?: number;
  maxRows?: number;
  onProgress?: (progress: { loaded: number; total: number; percentage: number }) => void;
  onError?: (error: Error) => void;
  signal?: AbortSignal;
}

/**
 * Provincial Generation Data Streamer
 */
export class ProvincialGenerationStreamer {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor() {
    this.baseUrl = `${SUPABASE_URL}/functions/v1`;
    this.headers = {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Fetch dataset manifest (schema and sample data)
   */
  async getManifest(): Promise<ManifestResponse> {
    const response = await fetch(`${this.baseUrl}/manifest/kaggle/provincial_generation`, {
      headers: this.headers
    });

    if (!response.ok) {
      throw new Error(`Manifest request failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Stream data from the dataset with cursor-based pagination
   */
  async *streamData(options: StreamingOptions = {}): AsyncGenerator<StreamResponse['rows'], void, unknown> {
    const { 
      limit = 1000, 
      maxRows = Infinity,
      onProgress,
      onError,
      signal 
    } = options;

    let cursor: string | null = null;
    let totalLoaded = 0;
    let totalEstimate = 0;

    try {
      while (totalLoaded < maxRows) {
        if (signal?.aborted) {
          throw new Error('Stream aborted');
        }

        const remainingRows = maxRows - totalLoaded;
        const requestLimit = Math.min(limit, remainingRows);
        
        const url = new URL(`${this.baseUrl}/stream/kaggle/provincial_generation`);
        url.searchParams.set('limit', requestLimit.toString());
        if (cursor) {
          url.searchParams.set('cursor', cursor);
        }

        const response = await fetch(url.toString(), {
          headers: this.headers,
          signal
        });

        if (!response.ok) {
          const error = new Error(`Stream request failed: ${response.status} ${response.statusText}`);
          onError?.(error);
          throw error;
        }

        const data: StreamResponse = await response.json();
        const nextCursor = response.headers.get('x-next-cursor');

        // Update progress tracking
        if (!totalEstimate && data.metadata.totalEstimate) {
          totalEstimate = Math.min(data.metadata.totalEstimate, maxRows);
        }

        totalLoaded += data.rows.length;
        
        onProgress?.({
          loaded: totalLoaded,
          total: totalEstimate || maxRows,
          percentage: totalEstimate ? (totalLoaded / totalEstimate) * 100 : 0
        });

        yield data.rows;

        // Check if we should continue
        if (!data.metadata.hasMore || !nextCursor || data.rows.length === 0) {
          break;
        }

        cursor = nextCursor;
      }
    } catch (error) {
      onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Load all data and return as a single array
   */
  async loadAllData(options: StreamingOptions = {}): Promise<StreamResponse['rows']> {
    const allRows: StreamResponse['rows'] = [];
    
    for await (const batch of this.streamData(options)) {
      allRows.push(...batch);
    }

    return allRows;
  }
}

/**
 * IndexedDB integration using Dexie pattern
 * This assumes Dexie is available in the app (as mentioned in the context)
 */
export interface ProvincialGenerationRecord {
  id?: number;
  date: string;
  province: string;
  producer: string;
  generation_type: string;
  megawatt_hours: number;
  source: 'kaggle' | 'fallback';
  version: string;
  ingested_at: Date;
}

/**
 * Provincial Generation Data Repository
 * 
 * Integrates streaming data with IndexedDB storage and fallback handling
 */
export class ProvincialGenerationRepository {
  private streamer: ProvincialGenerationStreamer;
  
  constructor() {
    this.streamer = new ProvincialGenerationStreamer();
  }

  /**
   * Load data with streaming if enabled, fallback otherwise
   */
  async loadData(options: {
    forceStream?: boolean;
    maxRows?: number;
    onProgress?: StreamingOptions['onProgress'];
  } = {}): Promise<ProvincialGenerationRecord[]> {
    const { forceStream = false, maxRows = 5000, onProgress } = options;
    const useStreaming = USE_STREAMING_DATASETS || forceStream;

    try {
      if (useStreaming) {
        console.log('Loading provincial generation data via streaming...');
        return await this.loadFromStream({ maxRows, onProgress });
      } else {
        console.log('Loading provincial generation data from fallback...');
        return await this.loadFromFallback();
      }
    } catch (error) {
      console.error('Failed to load streaming data, falling back to static data:', error);
      return await this.loadFromFallback();
    }
  }

  /**
   * Load data from streaming API and store in IndexedDB
   */
  private async loadFromStream(options: {
    maxRows?: number;
    onProgress?: StreamingOptions['onProgress'];
  }): Promise<ProvincialGenerationRecord[]> {
    const { maxRows = 5000, onProgress } = options;
    
    // Get manifest first
    const manifest = await this.streamer.getManifest();
    console.log('Manifest loaded:', manifest.metadata);

    const records: ProvincialGenerationRecord[] = [];
    const batchSize = 1000;

    for await (const batch of this.streamer.streamData({ 
      limit: batchSize, 
      maxRows,
      onProgress 
    })) {
      // Transform to repository format
      const transformedBatch = batch.map(row => ({
        date: row.date,
        province: row.province,
        producer: row.producer,
        generation_type: row.generation_type,
        megawatt_hours: row.megawatt_hours,
        source: 'kaggle' as const,
        version: manifest.version,
        ingested_at: new Date()
      }));

      records.push(...transformedBatch);

      // Store in IndexedDB (assuming ceipDb is available)
      if (typeof window !== 'undefined' && (window as any).ceipDb) {
        try {
          await (window as any).ceipDb.provincial_generation.bulkPut(transformedBatch);
          console.log(`Stored ${transformedBatch.length} records in IndexedDB`);
        } catch (dbError) {
          console.warn('Failed to store in IndexedDB:', dbError);
        }
      }
    }

    console.log(`Successfully loaded ${records.length} provincial generation records from streaming`);
    return records;
  }

  /**
   * Load data from static fallback file
   */
  private async loadFromFallback(): Promise<ProvincialGenerationRecord[]> {
    try {
      const response = await fetch('/data/provincial_generation_sample.json');
      if (!response.ok) {
        throw new Error(`Fallback file not found: ${response.status}`);
      }

      const fallbackData = await response.json();
      
      const records: ProvincialGenerationRecord[] = fallbackData.map((row: any) => ({
        date: row.date,
        province: row.province,
        producer: row.producer,
        generation_type: row.generation_type,
        megawatt_hours: row.megawatt_hours,
        source: 'fallback' as const,
        version: '1.0-fallback',
        ingested_at: new Date()
      }));

      // Store in IndexedDB if available
      if (typeof window !== 'undefined' && (window as any).ceipDb) {
        try {
          await (window as any).ceipDb.provincial_generation.clear();
          await (window as any).ceipDb.provincial_generation.bulkAdd(records);
          console.log('Fallback data stored in IndexedDB');
        } catch (dbError) {
          console.warn('Failed to store fallback data in IndexedDB:', dbError);
        }
      }

      console.log(`Loaded ${records.length} records from fallback data`);
      return records;
    } catch (error) {
      console.error('Failed to load fallback data:', error);
      throw error;
    }
  }

  /**
   * Get data from IndexedDB if available, otherwise load fresh
   */
  async getData(): Promise<ProvincialGenerationRecord[]> {
    // Try IndexedDB first if available
    if (typeof window !== 'undefined' && (window as any).ceipDb) {
      try {
        const records = await (window as any).ceipDb.provincial_generation.toArray();
        if (records && records.length > 0) {
          console.log(`Retrieved ${records.length} records from IndexedDB`);
          return records;
        }
      } catch (dbError) {
        console.warn('Failed to retrieve from IndexedDB:', dbError);
      }
    }

    // Load fresh data
    return await this.loadData();
  }

  /**
   * Clear cached data and reload
   */
  async refresh(options: { forceStream?: boolean; maxRows?: number } = {}): Promise<ProvincialGenerationRecord[]> {
    // Clear IndexedDB cache if available
    if (typeof window !== 'undefined' && (window as any).ceipDb) {
      try {
        await (window as any).ceipDb.provincial_generation.clear();
        console.log('IndexedDB cache cleared');
      } catch (dbError) {
        console.warn('Failed to clear IndexedDB cache:', dbError);
      }
    }

    return await this.loadData(options);
  }
}

// Example usage functions for integration
export const provincialGenerationRepo = new ProvincialGenerationRepository();

/**
 * Demo function to show streaming in action
 */
export async function demoStreamingData() {
  console.log('=== Provincial Generation Streaming Demo ===');
  
  const streamer = new ProvincialGenerationStreamer();
  
  try {
    // Get manifest
    const manifest = await streamer.getManifest();
    console.log('Dataset:', manifest.dataset);
    console.log('Estimated rows:', manifest.estimatedRows);
    console.log('Sample data:', manifest.sampleRows.slice(0, 2));
    
    // Stream first 100 rows
    console.log('\nStreaming first 100 rows...');
    let totalRows = 0;
    
    for await (const batch of streamer.streamData({ 
      limit: 25, 
      maxRows: 100,
      onProgress: ({ loaded, percentage }) => {
        console.log(`Progress: ${loaded} rows (${percentage.toFixed(1)}%)`);
      }
    })) {
      totalRows += batch.length;
      console.log(`Batch received: ${batch.length} rows`);
      console.log('Sample row:', batch[0]);
    }
    
    console.log(`\nTotal rows received: ${totalRows}`);
    
  } catch (error) {
    console.error('Demo failed:', error);
  }
}

// Export for immediate testing
if (typeof window !== 'undefined') {
  (window as any).ProvincialGenerationStreamer = ProvincialGenerationStreamer;
  (window as any).provincialGenerationRepo = provincialGenerationRepo;
  (window as any).demoStreamingData = demoStreamingData;
}
