/**
 * Data Manifest Endpoint - Central Configuration and Status
 *
 * Provides real-time status, configuration, and self-documentation for all
 * streaming data sources in the Energy Data Integration Platform.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

type FeatureFlagValue = 'true' | 'false' | string | undefined;

interface FeatureFlags {
  ENABLE_REAL_DATA_STREAMING: FeatureFlagValue;
  IESO_STREAMING_ENABLED: FeatureFlagValue;
  AESO_STREAMING_ENABLED: FeatureFlagValue;
  WEATHER_STREAMING_ENABLED: FeatureFlagValue;
  HISTORICAL_DATA_ENABLED: FeatureFlagValue;
}

function toBoolean(value: boolean | FeatureFlagValue | undefined): boolean {
  if (typeof value === 'boolean') return value;
  return value === 'true';
}

interface DataSourceConfig {
  id: string;
  title: string;
  description: string;
  category: string;
  provider: string;
  region: string;
  streamEndpoint?: string;
  healthEndpoint?: string;
  historicalEndpoint?: string;
  enabled?: boolean | FeatureFlagValue;
  live?: boolean | FeatureFlagValue;
  [key: string]: unknown;
}

type DataSourcesManifest = Record<string, DataSourceConfig>;

type DataSourceHealthStatus = 'healthy' | 'unavailable' | 'error' | 'skipped';

interface DataSourceHealth {
  status: DataSourceHealthStatus;
  lastCheck: string;
  [key: string]: unknown;
}

interface MonitoringState {
  systemUptime: number;
  totalRequests: number;
  activeStreams: number;
  lastHealthCheck: string;
  version: string;
}

interface ManifestSystem {
  version: string;
  uptime: number;
  lastHealthCheck: string;
  featureFlags: FeatureFlags;
  isProduction: boolean;
}

interface ManifestMetadata {
  totalDataSources: number;
  enabledDataSources: number;
  liveDataSources: number;
  generationTimestamp: string;
  requestId: string;
}

interface ManifestDataset extends DataSourceConfig {
  status: 'available' | 'disabled';
  enabled: boolean;
  health?: DataSourceHealth;
  configuration?: unknown;
  usage?: unknown;
}

interface ManifestResponse {
  system: ManifestSystem;
  datasets: Record<string, ManifestDataset>;
  metadata: ManifestMetadata;
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
  'Cache-Control': 'private, max-age=30' // Cache for 30 seconds
};

// Feature flag configuration - controls rollout of features
const FEATURE_FLAGS: FeatureFlags = {
  ENABLE_REAL_DATA_STREAMING: Deno.env.get('ENABLE_REAL_DATA_STREAMING') || 'false',
  IESO_STREAMING_ENABLED: Deno.env.get('IESO_STREAMING_ENABLED') || 'true',
  AESO_STREAMING_ENABLED: Deno.env.get('AESO_STREAMING_ENABLED') || 'false',
  WEATHER_STREAMING_ENABLED: Deno.env.get('WEATHER_STREAMING_ENABLED') || 'false',
  HISTORICAL_DATA_ENABLED: Deno.env.get('HISTORICAL_DATA_ENABLED') || 'false'
};

// Central data source registry
const DATA_SOURCES_MANIFEST: DataSourcesManifest = {
  'ontario-demand': {
    id: 'ontario-demand',
    title: 'Ontario Electricity Demand & Prices',
    description: 'Real-time electricity demand and weighted average pricing from IESO market data',
    category: 'electrical',
    provider: 'IESO',
    region: 'Ontario, Canada',
    dataType: ['demand_mw', 'price_cents_kwh', 'timestamp'],
    streamEndpoint: '/functions/v1/stream-ontario-demand',
    healthEndpoint: '/functions/v1/stream-ontario-demand?health=true',
    historicalEndpoint: '/functions/v1/historical-demand',
    enabled: FEATURE_FLAGS.IESO_STREAMING_ENABLED === 'true',
    live: true,
    refreshIntervalMs: 60000, // 60 seconds
    lastSuccessfulFetch: null,
    errorCount: 0,
    provenancedows: {
      sourceUrl: 'https://www.ieso.ca/Data-Centre/Market-Reports',
      license: 'IESO Public Data License',
      terms: 'Data available for educational and research purposes',
      rateLimit: '1 request per minute',
      updateFrequency: '5-minute intervals',
      contact: 'data@ieso.ca'
    },
    schema: {
      timestamp: { type: 'ISO8601', required: true, description: 'Data observation timestamp' },
      demand_mw: { type: 'float', required: true, description: 'Ontario electricity demand in megawatts' },
      price_cents_kwh: { type: 'float', required: true, description: 'Weighted average electricity price in cents/KWh' },
      region: { type: 'string', required: true, enum: ['Ontario'], description: 'Geographic region identifier' },
      source: { type: 'string', required: true, enum: ['IESO'], description: 'Data source identifier' }
    },
    sampleData: [{
      timestamp: '2025-01-15T14:30:00Z',
      demand_mw: 15680.50,
      price_cents_kwh: 8.75,
      region: 'Ontario',
      source: 'IESO'
    }]
  },

  'alberta-market': {
    id: 'alberta-market',
    title: 'Alberta Energy Market Data',
    description: 'Real-time energy market data including pool prices and generation mix from AESO',
    category: 'electrical',
    provider: 'AESO',
    region: 'Alberta, Canada',
    streamEndpoint: '/functions/v1/stream-alberta-market',
    enabled: FEATURE_FLAGS.AESO_STREAMING_ENABLED === 'true',
    live: true,
    refreshIntervalMs: 30000,
    lastSuccessfulFetch: null,
    errorCount: 0,
    provenance: {
      sourceUrl: 'https://www.aeso.ca/market/market-reports-and-publications/market-data',
      license: 'AESO Open Data',
      rateLimit: '2 requests per minute',
      updateFrequency: '5-minute intervals'
    }
  },

  'weather-ontario': {
    id: 'weather-ontario',
    title: 'Ontario Weather Station Data',
    description: 'Environment Canada weather observations including temperature and precipitation',
    category: 'meteorological',
    provider: 'ECCC',
    region: 'Ontario, Canada',
    streamEndpoint: '/functions/v1/stream-weather',
    enabled: FEATURE_FLAGS.WEATHER_STREAMING_ENABLED === 'true',
    live: true,
    refreshIntervalMs: 300000, // 5 minutes for weather
    lastSuccessfulFetch: null,
    errorCount: 0,
    provenance: {
      sourceUrl: 'https://api.weather.gc.ca',
      license: 'ECCC Open Data',
      rateLimit: '100 requests per hour',
      updateFrequency: 'hourly'
    },
    schema: {
      stationName: 'string',
      temperature_celsius: 'float',
      humidity_percent: 'float',
      windSpeed_kmh: 'float',
      precipitation_mm: 'float'
    }
  },

  'historical-demand': {
    id: 'historical-demand',
    title: 'Historical Electricity Demand Data',
    description: 'Paginated historical electricity demand datasets from Kaggle repositories',
    category: 'historical',
    provider: 'Kaggle',
    region: 'Ontario/Alberta, Canada',
    streaming: true,
    enabled: FEATURE_FLAGS.HISTORICAL_DATA_ENABLED === 'true',
    live: false,
    pageSizeDefault: 100,
    maxPageSize: 500,
    provenancedows: {
      sourceUrl: 'https://kaggle.com/datasets/jacobsharples/provincial-electricity-demand-canada',
      license: 'CC BY-SA 4.0',
      terms: 'Educational use permitted',
      updateFrequency: 'Once per month',
      sizeEstimate: '100MB+ compressed'
    }
  }
};

// Global monitoring state
const MONITORING_STATE: MonitoringState = {
  systemUptime: Date.now(),
  totalRequests: 0,
  activeStreams: 0,
  lastHealthCheck: new Date().toISOString(),
  version: '1.0.0-beta'
};

/**
 * Fetch real-time health status for each data source
 */
async function getDataSourceHealth(): Promise<Record<string, DataSourceHealth>> {
  const healthStatus: Record<string, DataSourceHealth> = {};
  const sources = Object.keys(DATA_SOURCES_MANIFEST);

  for (const sourceId of sources) {
    const source = DATA_SOURCES_MANIFEST[sourceId];
    const endpoint = source.healthEndpoint || source.streamEndpoint;

    if (!endpoint) {
      healthStatus[sourceId] = {
        status: 'skipped',
        lastCheck: new Date().toISOString(),
      };
      continue;
    }

    try {
      const healthResponse = await fetch(endpoint, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (healthResponse.ok) {
        const health = await healthResponse.json();
        healthStatus[sourceId] = {
          status: 'healthy',
          ...health,
          lastCheck: new Date().toISOString()
        };
      } else {
        healthStatus[sourceId] = {
          status: 'unavailable',
          httpStatus: healthResponse.status,
          error: healthResponse.statusText,
          lastCheck: new Date().toISOString()
        };
      }
    } catch (error) {
      healthStatus[sourceId] = {
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
        lastCheck: new Date().toISOString()
      };
    }
  }

  return healthStatus;
}

/**
 * Main manifest endpoint handler
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: corsHeaders }
    );
  }

  try {
    const url = new URL(req.url);
    const includeHealth = url.searchParams.get('health') === 'true';
    const format = url.searchParams.get('format') || 'full';

    MONITORING_STATE.totalRequests++;

    // Build manifest response
    const datasets: Record<string, ManifestDataset> = {};

    const manifest: ManifestResponse = {
      system: {
        version: MONITORING_STATE.version,
        uptime: Date.now() - MONITORING_STATE.systemUptime,
        lastHealthCheck: MONITORING_STATE.lastHealthCheck,
        featureFlags: FEATURE_FLAGS,
        isProduction: Deno.env.get('ENVIRONMENT') === 'production'
      },
      datasets,
      metadata: {
        totalDataSources: 0,
        enabledDataSources: 0,
        liveDataSources: 0,
        generationTimestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    };

    // Process each data source
    Object.entries(DATA_SOURCES_MANIFEST).forEach(([sourceId, sourceConfig]) => {
      const isSourceEnabled =
        toBoolean(sourceConfig.enabled) &&
        toBoolean(FEATURE_FLAGS.ENABLE_REAL_DATA_STREAMING);

      const datasetEntry: ManifestDataset = {
        ...sourceConfig,
        enabled: isSourceEnabled,
        status: isSourceEnabled ? 'available' : 'disabled'
      };

      if (format === 'full') {
        datasetEntry.configuration = getConfigurationForSource(sourceId);
        datasetEntry.usage = getUsageInstructionsForSource(sourceId);
      }

      datasets[sourceId] = datasetEntry;
    });

    // Calculate metadata
    Object.values(datasets).forEach(dataset => {
      manifest.metadata.totalDataSources += 1;
      if (dataset.enabled) manifest.metadata.enabledDataSources += 1;
      if (toBoolean(dataset.live)) manifest.metadata.liveDataSources += 1;
    });

    // Include health status if requested
    if (includeHealth) {
      const healthData = await getDataSourceHealth();
      Object.keys(datasets).forEach(sourceId => {
        const datasetHealth = healthData[sourceId];
        if (datasetHealth) {
          datasets[sourceId].health = datasetHealth;
        }
      });
      MONITORING_STATE.lastHealthCheck = new Date().toISOString();
    }

    return new Response(JSON.stringify(manifest, null, format === 'full' ? 2 : 0), {
      headers: corsHeaders,
      status: 200
    });

  } catch (error) {
    console.error('Manifest generation error:', error);

    return new Response(JSON.stringify({
      error: 'Failed to generate manifest',
      message: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
});

/**
 * Get detailed configuration for a data source
 */
function getConfigurationForSource(sourceId: string): any {
  const baseConfig = DATA_SOURCES_MANIFEST[sourceId];
  if (!baseConfig) return null;

  switch (sourceId) {
    case 'ontario-demand':
      return {
        clientConnection: {
          eventSourceUrl: baseConfig.streamEndpoint,
          options: {
            withCredentials: false,
            autoReconnect: true,
            reconnectDelay: 3000
          }
        },
        dataValidation: {
          requiredFields: ['timestamp', 'demand_mw', 'price_cents_kwh'],
          numericFields: ['demand_mw', 'price_cents_kwh'],
          timeField: 'timestamp'
        },
        fallbackStrategy: {
          enabled: true,
          mockDataSource: 'enhanced_mocked_demand.js',
          ciriFallbackProvider: 'mock_api'
        },
        caching: {
          enabled: true,
          maxCacheSize: 100,
          cacheExpiryMs: 300000 // 5 minutes
        }
      };

    case 'weather-ontario':
      return {
        defaultStations: ['TORONTO_INTERNATIONAL_A', 'OTTAWA_INTERNATIONAL_A'],
        dataTypes: ['TEMPERATURE', 'PRECIPITATION', 'WIND', 'HUMIDITY'],
        thresholds: {
          highAlert: { temperature_celsius: 35, windSpeed_kmh: 100 },
          lowAlert: { temperature_celsius: -30, windSpeed_kmh: 0 }
        }
      };

    default:
      return {
        clientConnection: { standardConfig: true },
        dataValidation: { requiredFields: [] },
        caching: { enabled: false }
      };
  }
}

/**
 * Get usage instructions and examples for a data source
 */
function getUsageInstructionsForSource(sourceId: string): any {
  const baseConfig = DATA_SOURCES_MANIFEST[sourceId];
  if (!baseConfig) return null;

  const baseInstructions = {
    endpoint: baseConfig.streamEndpoint,
    method: 'GET',
    contentType: 'text/event-stream',
    documentationUrl: `/docs/datasources/${sourceId}`
  };

  switch (sourceId) {
    case 'ontario-demand':
      return {
        ...baseInstructions,
        clientExample: `
// React Hook for Live IESO Data
const { data, connectionStatus, isUsingRealData } = useStreamingData('ontario-demand');

// Use in component
data.map(item => ({
  timestamp: item.timestamp,
  demand: item.values.demand_mw,
  price: item.values.price_cents_kwh
}));
        `,
        apiExample: `
// Direct API usage
const eventSource = new EventSource('/functions/v1/stream-ontario-demand');
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(data.rows); // Contains IESO market data
};
        `,
        queryParameters: {
          since: 'ISO8601 timestamp for retrieving data since specific time',
          format: 'full|compact - level of detail in response'
        },
        typicalUsage: [
          'Investment analysis for energy sector',
          'Demand forecasting models',
          'Price correlation studies',
          'Peak load analysis'
        ]
      };

    case 'historical-demand':
      return {
        ...baseInstructions,
        endpoint: baseConfig.historicalEndpoint,
        method: 'GET',
        contentType: 'application/json',
        queryParameters: {
          page_size: 'Number of records (max 500)',
          cursor: 'Line offset for pagination',
          province: 'Province filter (ON, AB, BC, etc.)',
          date_range: 'Date range filter YYYY-MM-DD:YYYY-MM-DD'
        },
        pagination: {
          defaultPageSize: 100,
          maxPageSize: 500,
          cursorType: 'line_number',
          hasMoreField: 'next_cursor',
          totalField: 'total_count'
        },
        clientExample: `
// Historical data pagination
const loadHistoricalData = async (cursor) => {
  const response = await fetch('/functions/v1/historical-demand?page_size=100&cursor=' + cursor + '&province=ON');
  const result = await response.json();
  return result;
};
        `
      };

    default:
      return baseInstructions;
  }
}

// Export for testing and external usage
export { DATA_SOURCES_MANIFEST, MONITORING_STATE };