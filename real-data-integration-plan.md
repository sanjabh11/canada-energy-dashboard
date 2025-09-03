# Real Data Integration Implementation Plan

## 🎯 Executive Summary
This plan outlines the complete implementation strategy for replacing mock data with real streaming sources from Canadian energy providers (IESO, AESO, ECCC) and historical datasets (Kaggle). The approach maintains non-disruptive rollout while establishing robust real-time data capabilities.

## 🏗️ Architecture Overview

### Core Principles
- **Streaming First**: No bulk data storage on server side
- **Failover Chain**: IndexedDB → local mock → proxy → Supabase → direct
- **Rate Limiting**: Respect provider limits (IESO: 60s, AESO: 30s, ECCC: 60s)
- **Caching**: Smart caching with If-Modified-Since headers
- **Non-Disruptive**: Feature flags for gradual rollout

### Data Sources
1. **IESO (Ontario)**: Live demand & price data via CSV feeds
2. **AESO (Alberta)**: Pool price market data
3. **ECCC GeoMet**: Weather station hourly observations
4. **Kaggle JacobSharples**: Historical electricity demand data

## 📋 Implementation Phases

### Phase 1: Infrastructure Foundation

#### 1.1 Supabase Edge Functions Architecture
Create the core streaming infrastructure in Supabase:

```typescript
// supabase/functions/_shared/streamingUtils.ts
export class StreamingUtils {
  static async createSSEConnection(req: Request, streamingFunction: () => AsyncGenerator<any>): Promise<Response> {
    const headers = {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Last-Event-ID'
    };

    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(StreamingUtils.encode('retry: 5000\n\n'));

        try {
          const generator = streamingFunction();
          for await (const data of generator) {
            controller.enqueue(StreamingUtils.encode(
              `event: delta\ndata: ${JSON.stringify(data)}\n\n`
            ));
          }
        } catch (error) {
          controller.enqueue(StreamingUtils.encode(
            `event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`
          ));
        }
      }
    });

    return new Response(stream, { headers });
  }

  static encode(data: string): Uint8Array {
    return new TextEncoder().encode(data);
  }
}
```

#### 1.2 Client-Side Data Management
Create enhanced resolver that prioritizes live data:

```typescript
// src/lib/data/realDataService.ts
export class RealDataService {
  private eventSources = new Map<string, EventSource>();
  private cache = new Map<string, any>();

  async connectToRealStream(dataset: string) {
    const endpoint = this.getStreamingEndpoint(dataset);
    if (this.eventSources.has(dataset)) {
      return this.eventSources.get(dataset);
    }

    const eventSource = new EventSource(`${import.meta.env.VITE_SUPABASE_URL}${endpoint}`);

    eventSource.onopen = () => {
      console.log(`Connected to ${dataset} stream`);
      this.updateConnectionStatus(dataset, 'connected');
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.processRealTimeData(dataset, data);
      } catch (error) {
        console.error(`Failed to parse ${dataset} data:`, error);
      }
    };

    eventSource.onerror = () => {
      console.warn(`Connection failed for ${dataset}, initiating failover...`);
      this.updateConnectionStatus(dataset, 'disconnected');
      this.fallBackToCachedData(dataset);
    };

    this.eventSources.set(dataset, eventSource);
    return eventSource;
  }
}
```

### Phase 2: IESO Live Streaming Implementation

#### 2.1 IESO Data Fetcher
IESO provides CSV data without authentication, making it ideal for streaming:

```typescript
// supabase/functions/stream-ontario-demand/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let lastTimestamp: string | null = null;
  let isPolling = true;

  async function* iesoDataGenerator() {
    while (isPolling) {
      try {
        const csvUrl = 'https://www.ieso.ca/-/media/Files/Toronto-Market-Results/Current/Hourly_Demand.csv';
        const response = await fetch(csvUrl);

        if (!response.ok) {
          throw new Error(`IESO API error: ${response.status}`);
        }

        const csvText = await response.text();
        const newData = parseIESOCSV(csvText, lastTimestamp);

        if (newData.length > 0) {
          lastTimestamp = newData[newData.length - 1].timestamp;
          yield {
            dataset: 'ontario_demand',
            rows: newData,
            source: 'IESO',
            timestamp: new Date().toISOString()
          };
        }

        // Respect IESO rate limits (poll every 60 seconds)
        await new Promise(resolve => setTimeout(resolve, 60000));

      } catch (error) {
        console.error('IESO streaming error:', error);
        yield {
          dataset: 'ontario_demand',
          error: error.message,
          source: 'IESO',
          timestamp: new Date().toISOString()
        };

        // Exponential backoff on errors
        await new Promise(resolve => setTimeout(resolve, 120000));
      }
    }
  }

  return StreamingUtils.createSSEConnection(req, iesoDataGenerator);
});

function parseIESOCSV(csvText: string, sinceTimestamp: string | null): any[] {
  const lines = csvText.split('\n');
  const headers = lines[0].split(',');

  return lines.slice(1)
    .filter(line => line.trim())
    .map(line => {
      const values = line.split(',');
      const row: any = {};

      headers.forEach((header, index) => {
        const value = values[index]?.trim();
        row[header.toLowerCase()] = isNaN.parseFloat(value) ? NaN : parseFloat(value);
      });

      return {
        timestamp: row.timestamp,
        demand_mw: row['ontario demand'] || 0,
        price_cents_kwh: row['weighted avg. price'] || 0,
        region: 'Ontario'
      };
    })
    .filter(row => {
      if (!sinceTimestamp) return true;
      return row.timestamp > sinceTimestamp;
    })
    .slice(-20); // Keep only latest 20 rows for performance
}
```

#### 2.2 Client Integration - Real-Time Updates
Update InvestmentCards to use real IESO data:

```typescript
// src/components/InvestmentCards.tsx
export const InvestmentCards: React.FC = () => {
  const { data: demandData, connectionStatus } = useRealTimeData('/functions/v1/stream-ontario-demand');
  const [investments, setInvestments] = useState<SimpleInvestment[]>([]);
  const [isUsingRealData, setIsUsingRealData] = useState(false);

  useEffect(() => {
    if (demandData.length > 0) {
      // Create dynamic investments based on current electricity demand
      const dynamicInvestments = createDynamicInvestments(demandData);
      setInvestments(dynamicInvestments);
      setIsUsingRealData(true);
    } else {
      // Fallback to enhanced mock data
      setInvestments(generateFallbackData());
      setIsUsingRealData(false);
    }
  }, [demandData]);

  const createDynamicInvestments = (demandData: any[]) => {
    const latestDemand = demandData[demandData.length - 1];
    const currentPrice = latestDemand.price_cents_kwh;
    const baseDemand = latestDemand.demand_mw;

    // Create realistic solar investment based on current demand
    return [
      {
        id: 1,
        name: `Ontario Solar Project (${baseDemand.toFixed(0)}MW base)`,
        description: 'Real-time solar investment based on current Ontario electricity demand',
        cashFlows: [
          { amount: -baseDemand * 2000 * 0.1, period: 0, description: 'Solar farm construction' },
          { amount: baseDemand * currentPrice * 8760 * 0.15, period: 1, description: 'Year 1 revenue' },
          { amount: baseDemand * currentPrice * 8760 * 0.20, period: 2, description: 'Year 2 revenue' },
          { amount: baseDemand * currentPrice * 8760 * 0.25, period: 3, description: 'Year 3 revenue' },
        ],
        discountRate: 0.08,
        realTimeData: latestDemand
      },

      {
        id: 2,
        name: 'Battery Storage For Demand Peaks',
        description: `Grid stabilization for ${baseDemand}MW Ontario demand`,
        cashFlows: [
          { amount: -baseDemand * 500, period: 0, description: 'Battery system capital' },
          { amount: baseDemand * 200 * 0.1, period: 1, description: 'Peak shaving revenue' },
          { amount: baseDemand * 220 * 0.12, period: 2, description: 'Grid services revenue' },
        ],
        discountRate: 0.10,
        realTimeData: latestDemand
      }
    ];
  };

  return (
    <div className="space-y-6">
      {/* Real Data Status Indicator */}
      <div className={`px-4 py-2 rounded-lg text-sm ${
        isUsingRealData ? 'bg-green-50 text-green-800 border border-green-200'
                       : 'bg-yellow-50 text-yellow-800 border border-yellow-200'
      }`}>
        {connectionStatus === 'connected' && (
          <span className="flex items-center">
            🔴 LIVE: Connected to Ontario IESO demand data
          </span>
        )}
        {isUsingRealData ? '📊 Using Real-Time Data' : '📝 Using Enhanced Mock Data'}
      </div>

      {/* Investment Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {investments.map((investment) => {
          const { npv, irr } = investment.analysis || {};

          return (
            <div key={investment.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-800 mb-1">
                    {investment.name}
                  </h3>
                  <p className="text-sm text-slate-600 mb-2">
                    {investment.description}
                  </p>
                  {investment.realTimeData && (
                    <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                      Demand: {investment.realTimeData.demand_mw.toLocaleString()} MW |
                      Price: {investment.realTimeData.price_cents_kwh.toFixed(2)}¢/kWh
                    </div>
                  )}
                </div>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <div className="text-xs text-slate-600 mb-1">NPV</div>
                  <div className="font-bold text-lg">
                    ${npv ? (npv / 1000000).toFixed(1) : '—'}M
                  </div>
                </div>

                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <div className="text-xs text-slate-600 mb-1">IRR</div>
                  <div className="font-bold text-lg">
                    {irr ? `${(irr * 100).toFixed(1)}%` : '—'}
                  </div>
                </div>
              </div>

              {/* Real-time updates indicator */}
              {isUsingRealData && (
                <div className="mt-4 text-xs text-green-600 flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                  Auto-updating every minute
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
```

### Phase 3: AESO & ECCC Integration

#### 3.1 AESO Pool Price Streaming
AESO provides market data for Alberta electricity:

```typescript
// supabase/functions/stream-alberta-market/index.ts
serve(async (req) => {
  async function* aesoDataGenerator() {
    while (true) {
      try {
        // AESO market data URLs
        const priceData = await fetchAESOPoolPrices();
        const supplyData = await fetchAESOGeneration();

        const combinedData = combineAESOData(priceData, supplyData);

        yield {
          dataset: 'alberta_market',
          rows: combinedData,
          source: 'AESO',
          timestamp: new Date().toISOString()
        };

        await new Promise(resolve => setTimeout(resolve, 30000)); // 30s poll interval
      } catch (error) {
        // Error handling and backoff
      }
    }
  }

  return StreamingUtils.createSSEConnection(req, aesoDataGenerator);
});
```

#### 3.2 ECCC Weather Integration
Real weather data for climate impact analysis:

```typescript
// supabase/functions/stream-weather/index.ts
serve(async (req) => {
  const stations = ['TORONTO', 'CALGARY', 'WINNIPEG'];

  async function* weatherDataGenerator() {
    while (true) {
      try {
        const weatherUpdates = [];

        for (const station of stations) {
          const stationWeather = await fetchECCCStationData(station);
          weatherUpdates.push({
            station,
            temperature: stationWeather.temperature,
            humidity: stationWeather.humidity,
            windSpeed: stationWeather.windSpeed,
            precipitation: stationWeather.precipitation,
            timestamp: new Date().toISOString()
          });
        }

        yield {
          dataset: 'weather',
          rows: weatherUpdates,
          source: 'ECCC GeoMet'
        };

        await new Promise(resolve => setTimeout(resolve, 300000)); // 5 minute weather intervals
      } catch (error) {
        // Handle weather API errors
      }
    }
  }

  return StreamingUtils.createSSEConnection(req, weatherDataGenerator);
});

async function fetchECCCStationData(stationId: string): Promise<any> {
  const apiUrl = `https://api.weather.gc.ca/collections/climate-daily/items?f=json&limit=1&station=${stationId}`;

  const response = await fetch(apiUrl);
  if (!response.ok) {
    throw new Error(`ECCC API error: ${response.status}`);
  }

  const data = await response.json();
  if (data.features.length === 0) {
    throw new Error(`No data available for station ${stationId}`);
  }

  return data.features[0].properties;
}
```

### Phase 4: Historical Data & Manifest

#### 4.1 Kaggle Historical Streaming
Paged historical data without server storage:

```typescript
// supabase/functions/historical-demand/index.ts
serve(async (req) => {
  const url = new URL(req.url);
  const pageSize = Math.min(parseInt(url.searchParams.get('limit') || '100'), 500); // Max 500 rows
  const cursor = parseInt(url.searchParams.get('cursor') || '0');
  const province = url.searchParams.get('province') || 'ON';

  try {
    // This would stream Kaggle dataset and parse on-the-fly
    const datasetUrl = this.getKaggleDatasetUrl('jacobsharples/provinces-electricity-demand');

    const response = await fetch(datasetUrl, {
      headers: {
        'Authorization': `Bearer ${Deno.env.get('KAGGLE_KEY')}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch Kaggle dataset');
    }

    // Stream parse the CSV to paginate on-demand
    const csvStream = response.body.pipeThrough(
      new TextDecoderStream('utf-8')
    ).pipeThrough(
      parseCSVStream(pageSize, cursor, province)
    );

    const pageData = await csvStream.next();

    return new Response(JSON.stringify({
      rows: pageData.value?.rows || [],
      next_cursor: pageData.value?.nextCursor,
      total_count: pageData.value?.totalCount,
      provenance: {
        source: 'kaggle/datasets/jacobsharples/provinces-electricity-demand',
        license: 'educational-use'
      }
    }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message,
      rows: [],
      next_cursor: null
    }), { status: 500 });
  }
});
```

#### 4.2 Health & Manifest Endpoints
Monitoring and self-documentation:

```typescript
// supabase/functions/manifest/index.ts - Dataset registry
serve(async (req) => {
  const manifest = {
    datasets: [
      {
        id: 'ontario_demand',
        title: 'Ontario Hourly Demand',
        description: 'Real-time electricity demand from IESO',
        live: true,
        live_endpoint: '/functions/v1/stream-ontario-demand',
        historical_endpoint: '/functions/v1/historical-demand',
        provenance: 'IESO Data Directory',
        enabled: true,
        last_updated: await getLastUpdate('ontario_demand'),
        rate_limit: '1 per minute',
        data_schema: {
          timestamp: 'ISO string',
          demand_mw: 'number',
          price_cents_kwh: 'number'
        }
      },
      // ... other datasets
    ],
    version: '1.0.0',
    last_refreshed: new Date().toISOString()
  };

  return new Response(JSON.stringify(manifest), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

## 🛠️ Implementation Roadmap

### Day 1-2: Infrastructure Setup
[ ] Set up Supabase Edge Functions structure
[ ] Configure secrets (KAGGLE_KEY)
[ ] Create shared streaming utilities
[ ] Set up CORS and authentication

### Day 3-4: IESO Live Streaming
[ ] Implement IESO streaming Edge Function
[ ] Build client connection hooks
[ ] Update InvestmentCards component
[ ] Add connection status UI
[ ] Test with mock fallback

### Day 5-6: AESO Integration
[ ] Implement AESO streaming endpoint
[ ] Add market data visualization
[ ] Update ResilienceMap with market correlation

### Day 7-8: Weather & Historical
[ ] Implement ECCC weather streaming
[ ] Create Kaggle historical streaming
[ ] Add paged historical data UI components

### Day 9-10: Testing & Optimization
[ ] Implement comprehensive error handling
[ ] Add rate limiting and caching
[ ] Create health monitoring dashboards
[ ] Performance optimization for streaming
[ ] Complete integration testing

### Day 11-12: Production Rollout
[ ] Feature flag rollout
[ ] User acceptance testing
[ ] Documentation updates
[ ] Monitoring setup

## 🎯 Success Criteria

- ✅ Real-time data flows from IESO/AESO to UI within 60 seconds
- ✅ Zero streaming failures (with graceful failover)
- ✅ Historical data loads in <2 seconds per page request
- ✅ No increase in server costs beyond 20% of mock baseline
- ✅ All components work with both live data and fallbacks
- ✅ Clear user feedback on data sources and freshness

## 🚨 Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Provider API downtime | Medium | Medium | Multiple failover layers, user notifications |
| Rate limiting blocking | Low | High | Exponential backoff, caching, rate monitoring |
| Large historical dataset crashes | Low | High | Page-based streaming, memory limits, timeouts |
| Client connection overload | Medium | Medium | Connection limits, event deduping |
| Cost overruns | Low | High | Budget monitoring, usage limits |
| Data quality issues | Medium | Low | Validation middleware, outlier detection |

## 📊 Monitoring & Alerting

Implement comprehensive monitoring:

```typescript
// Health endpoint returns per-source status
GET /api/health
{
  "ontario_demand": {
    "status": "healthy",
    "last_poll": "2025-09-02T08:00:00Z",
    "records_per_minute": 3,
    "error_rate": 0.01
  }
}
```

## 🔄 Deployment Strategy

**Feature Flag Rollout:**

1. IESO data enabled only for beta users
2. Gradual rollout: 10% → 25% → 50% → 100% users
3. Monitor error rates and usage patterns
4. Roll back capability if issues detected
5. User education on real data benefits

This implementation will transform the dashboard from mock-based to production-grade with real Canadian energy data while maintaining reliability and performance.