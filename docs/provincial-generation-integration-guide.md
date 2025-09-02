# Provincial Generation Streaming Integration Guide

This guide explains how to integrate the new provincial generation streaming functionality into the existing CEIP dashboard application.

## Overview

The streaming implementation provides:
- **Live data from Kaggle** via Supabase edge functions
- **Cursor-based pagination** for efficient data loading
- **IndexedDB caching** for offline/fast access
- **Fallback to static data** when streaming is unavailable
- **Feature flag control** for safe deployment

## Files Created

### 1. Supabase Edge Functions
- `supabase/functions/manifest/index.ts` - Dataset manifest endpoint
- `supabase/functions/stream/index.ts` - Data streaming endpoint

### 2. Client Libraries
- `src/lib/provincialGenerationStreamer.ts` - Core streaming client
- `src/components/ProvincialGenerationDataManager.tsx` - React component

### 3. Fallback Data
- `public/data/provincial_generation_sample.json` - 2000 sample records

## API Endpoints

### Manifest Endpoint
```
GET https://jxdihzqoaxtydolmltdr.supabase.co/functions/v1/manifest/kaggle/provincial_generation
```

Returns dataset schema, sample data, and metadata.

### Stream Endpoint
```
GET https://jxdihzqoaxtydolmltdr.supabase.co/functions/v1/stream/kaggle/provincial_generation?limit=1000&cursor=<cursor>
```

Returns paginated data with `X-Next-Cursor` header for next page.

## Integration Steps

### Step 1: Feature Flag Configuration

In your app configuration, add:

```typescript
// config.ts or environment variables
export const FEATURE_FLAGS = {
  USE_STREAMING_DATASETS: false  // Set to true when ready
};
```

### Step 2: Install the Streaming Client

Copy `src/lib/provincialGenerationStreamer.ts` to your project. Update the configuration constants if needed:

```typescript
const USE_STREAMING_DATASETS = FEATURE_FLAGS.USE_STREAMING_DATASETS;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
```

### Step 3: Update Existing Data Loading

Find your existing provincial data loading logic and update it:

```typescript
// Before (existing code)
async function loadProvincialData() {
  const response = await fetch('/api/provincial-data');
  return response.json();
}

// After (with streaming integration)
import { provincialGenerationRepo } from '../lib/provincialGenerationStreamer';

async function loadProvincialData() {
  try {
    // This will automatically use streaming if enabled, fallback otherwise
    return await provincialGenerationRepo.getData();
  } catch (error) {
    console.error('Failed to load provincial data:', error);
    // Your existing error handling
    throw error;
  }
}
```

### Step 4: Add Management UI (Optional)

Add the data manager component to your dashboard:

```tsx
import ProvincialGenerationDataManager from '../components/ProvincialGenerationDataManager';

function AdminPanel() {
  const handleDataLoaded = (data) => {
    console.log(`Loaded ${data.length} records`);
    // Update your app's data state
  };

  return (
    <div>
      <h2>Data Management</h2>
      <ProvincialGenerationDataManager 
        onDataLoaded={handleDataLoaded}
        className="mb-6"
      />
    </div>
  );
}
```

### Step 5: Update Chart Components

Update your chart components to handle the new data format:

```typescript
// Example chart data transformation
function transformForChart(records: ProvincialGenerationRecord[]) {
  return records.map(record => ({
    date: record.date,
    province: record.province,
    value: record.megawatt_hours,
    type: record.generation_type,
    // Add any other transformations needed for your charts
  }));
}
```

## Testing

### Manual Testing

1. **Test Manifest Endpoint:**
```bash
curl -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  "https://jxdihzqoaxtydolmltdr.supabase.co/functions/v1/manifest/kaggle/provincial_generation"
```

2. **Test Stream Endpoint:**
```bash
curl -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  "https://jxdihzqoaxtydolmltdr.supabase.co/functions/v1/stream/kaggle/provincial_generation?limit=5"
```

3. **Test in Browser Console:**
```javascript
// Test streaming functionality
await demoStreamingData();

// Test repository
const data = await provincialGenerationRepo.loadData({ maxRows: 100 });
console.log('Loaded:', data.length, 'records');
```

### Automated Testing

Add these test cases to your test suite:

```typescript
describe('Provincial Generation Streaming', () => {
  test('should load data from fallback when streaming disabled', async () => {
    const data = await provincialGenerationRepo.loadData();
    expect(data.length).toBeGreaterThan(0);
    expect(data[0].source).toBe('fallback');
  });

  test('should load data from stream when forced', async () => {
    const data = await provincialGenerationRepo.loadData({ forceStream: true });
    expect(data.length).toBeGreaterThan(0);
    // May be 'kaggle' if streaming works, 'fallback' if it falls back
  });

  test('should handle streaming errors gracefully', async () => {
    // Test with invalid credentials or network issues
    // Should fall back to static data
  });
});
```

## Production Deployment

### Phase 1: Staging Testing
1. Deploy to staging environment
2. Enable `USE_STREAMING_DATASETS = true` in staging only
3. Test data loading and chart rendering
4. Monitor for performance issues

### Phase 2: Production Preparation
1. Verify fallback data is up-to-date
2. Set up monitoring for edge function performance
3. Test rollback scenarios

### Phase 3: Production Rollout
1. Deploy code with `USE_STREAMING_DATASETS = false`
2. Gradually enable for subset of users
3. Monitor performance and error rates
4. Full rollout when stable

## Monitoring

Monitor these metrics:

- **Edge Function Performance**: Response times and error rates
- **Data Freshness**: Last successful data load timestamp
- **Fallback Usage**: How often fallback is triggered
- **IndexedDB Usage**: Storage size and performance

## Error Handling

The implementation handles these error scenarios:

1. **Network Issues**: Falls back to cached IndexedDB data
2. **API Errors**: Falls back to static JSON file
3. **Invalid Data**: Logs errors and continues with partial data
4. **Storage Limits**: Manages IndexedDB storage limits

## Data Schema

The streamed data follows this schema:

```typescript
interface ProvincialGenerationRecord {
  date: string;           // YYYY-MM format
  province: string;       // Full province name
  producer: string;       // Producer type
  generation_type: string; // Generation technology
  megawatt_hours: number; // Energy amount
  source: 'kaggle' | 'fallback'; // Data source
  version: string;        // Dataset version
  ingested_at: Date;      // When data was loaded
}
```

## Performance Considerations

- **Batch Size**: Default 1000 records per request (configurable)
- **Max Records**: Limit total records loaded (default 5000)
- **Caching**: 60-second cache on edge functions
- **IndexedDB**: Client-side storage for fast access
- **Progressive Loading**: UI updates as data streams in

## Security

- Uses Supabase Row Level Security (RLS)
- API keys stored in environment variables only
- CORS properly configured for your domain
- No sensitive data in logs

## Next Steps

1. **Additional Datasets**: Extend to other Kaggle/HF datasets
2. **Real-time Updates**: Add WebSocket for live updates
3. **Data Validation**: Add client-side data quality checks
4. **Advanced Caching**: Implement cache invalidation strategies
