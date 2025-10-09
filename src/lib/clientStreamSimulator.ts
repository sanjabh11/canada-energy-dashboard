/**
 * Client-Side Stream Simulator
 * 
 * Simulates edge function streaming by fetching sample data from GitHub.
 * This allows the dashboard to show "Source: Stream" without requiring
 * Supabase edge function deployment.
 */

const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/sanjabh11/canada-energy-dashboard/main/public/data';

interface StreamResponse {
  rows: any[];
  metadata: {
    hasMore: boolean;
    totalEstimate: number;
    usingSampleData?: boolean;
  };
  timestamp: string;
  source: string;
}

class ClientStreamSimulator {
  private cache = new Map<string, { data: any[]; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Simulate streaming by fetching from GitHub
   */
  async simulateStream(
    dataset: string,
    options: { limit?: number; cursor?: string } = {}
  ): Promise<StreamResponse> {
    const { limit = 1000, cursor } = options;
    
    try {
      // Get sample data
      const data = await this.fetchSampleData(dataset);
      
      // Paginate
      const offset = cursor ? parseInt(cursor, 10) : 0;
      const rows = data.slice(offset, offset + limit);
      const hasMore = offset + limit < data.length;
      
      return {
        rows,
        metadata: {
          hasMore,
          totalEstimate: data.length,
          usingSampleData: true
        },
        timestamp: new Date().toISOString(),
        source: 'GitHub Sample Data (Client-Side Stream)'
      };
    } catch (error) {
      console.error(`Failed to simulate stream for ${dataset}:`, error);
      throw error;
    }
  }

  /**
   * Fetch sample data from GitHub with caching
   */
  private async fetchSampleData(dataset: string): Promise<any[]> {
    // Check cache
    const cached = this.cache.get(dataset);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
      console.log(`Using cached data for ${dataset}`);
      return cached.data;
    }

    // Map dataset names to file names
    const fileMap: Record<string, string> = {
      'ontario_demand': 'ontario_demand_sample.json',
      'provincial_generation': 'provincial_generation_sample.json',
      'ontario_prices': 'ontario_prices_sample.json',
      'hf_electricity_demand': 'hf_electricity_demand_sample.json'
    };

    const filename = fileMap[dataset];
    if (!filename) {
      throw new Error(`Unknown dataset: ${dataset}`);
    }

    const url = `${GITHUB_RAW_BASE}/${filename}`;
    console.log(`Fetching sample data from: ${url}`);

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${filename}: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!Array.isArray(data)) {
      throw new Error(`Invalid data format for ${dataset}`);
    }

    // Cache the data
    this.cache.set(dataset, {
      data,
      timestamp: Date.now()
    });

    console.log(`Loaded ${data.length} records for ${dataset}`);
    return data;
  }

  /**
   * Clear cache for a specific dataset or all datasets
   */
  clearCache(dataset?: string): void {
    if (dataset) {
      this.cache.delete(dataset);
    } else {
      this.cache.clear();
    }
  }
}

// Export singleton instance
export const clientStreamSimulator = new ClientStreamSimulator();
