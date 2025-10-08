/**
 * Sample Data Loader for Edge Functions
 * 
 * Provides fallback sample data when live data sources are unavailable.
 * This ensures edge functions always return meaningful data for development and demo purposes.
 */

const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/sanjabh11/canada-energy-dashboard/main/public/data';

interface SampleDataCache {
  data: any[];
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

const cache = new Map<string, SampleDataCache>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch sample data from GitHub raw content
 */
async function fetchSampleData(filename: string): Promise<any[]> {
  const cached = cache.get(filename);
  if (cached && (Date.now() - cached.timestamp) < cached.ttl) {
    console.log(`Using cached sample data for ${filename}`);
    return cached.data;
  }

  try {
    const url = `${GITHUB_RAW_BASE}/${filename}`;
    console.log(`Fetching sample data from: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Supabase-Edge-Function/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch sample data: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!Array.isArray(data)) {
      throw new Error(`Sample data is not an array: ${filename}`);
    }

    // Cache the data
    cache.set(filename, {
      data,
      timestamp: Date.now(),
      ttl: CACHE_TTL
    });

    console.log(`Loaded ${data.length} sample records from ${filename}`);
    return data;
  } catch (error) {
    console.error(`Error loading sample data for ${filename}:`, error);
    throw error;
  }
}

/**
 * Get Ontario Demand sample data
 */
export async function getOntarioDemandSample(limit?: number): Promise<any[]> {
  const data = await fetchSampleData('ontario_demand_sample.json');
  return limit ? data.slice(0, limit) : data;
}

/**
 * Get Provincial Generation sample data
 */
export async function getProvincialGenerationSample(limit?: number): Promise<any[]> {
  const data = await fetchSampleData('provincial_generation_sample.json');
  return limit ? data.slice(0, limit) : data;
}

/**
 * Get Ontario Prices sample data
 */
export async function getOntarioPricesSample(limit?: number): Promise<any[]> {
  const data = await fetchSampleData('ontario_prices_sample.json');
  return limit ? data.slice(0, limit) : data;
}

/**
 * Get HF Electricity Demand sample data
 */
export async function getHFElectricityDemandSample(limit?: number): Promise<any[]> {
  const data = await fetchSampleData('hf_electricity_demand_sample.json');
  return limit ? data.slice(0, limit) : data;
}

/**
 * Paginate sample data with cursor support
 */
export function paginateSampleData(
  data: any[],
  limit: number,
  cursor?: string
): { rows: any[]; nextCursor: string | null; hasMore: boolean } {
  const offset = cursor ? parseInt(cursor, 10) : 0;
  const rows = data.slice(offset, offset + limit);
  const hasMore = offset + limit < data.length;
  const nextCursor = hasMore ? String(offset + limit) : null;

  return { rows, nextCursor, hasMore };
}
