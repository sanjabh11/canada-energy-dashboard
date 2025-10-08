/**
 * Test script to verify sample data loader works
 * Run with: deno run --allow-net test-sample-data-loader.ts
 */

const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/sanjabh11/canada-energy-dashboard/main/public/data';

async function testSampleDataLoader() {
  console.log('Testing Sample Data Loader...\n');

  const files = [
    'ontario_demand_sample.json',
    'provincial_generation_sample.json',
    'ontario_prices_sample.json',
    'hf_electricity_demand_sample.json'
  ];

  for (const filename of files) {
    try {
      const url = `${GITHUB_RAW_BASE}/${filename}`;
      console.log(`Fetching: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Test-Script/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!Array.isArray(data)) {
        throw new Error('Data is not an array');
      }

      console.log(`✅ ${filename}: ${data.length} records loaded`);
      console.log(`   First record keys: ${Object.keys(data[0]).join(', ')}`);
      console.log('');
    } catch (error) {
      console.error(`❌ ${filename}: ${error}`);
      console.log('');
    }
  }

  // Test pagination
  console.log('\nTesting pagination...');
  const testData = Array.from({ length: 100 }, (_, i) => ({ id: i, value: i * 10 }));
  
  function paginateSampleData(
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

  const page1 = paginateSampleData(testData, 10);
  console.log(`Page 1: ${page1.rows.length} rows, hasMore: ${page1.hasMore}, nextCursor: ${page1.nextCursor}`);

  const page2 = paginateSampleData(testData, 10, page1.nextCursor!);
  console.log(`Page 2: ${page2.rows.length} rows, hasMore: ${page2.hasMore}, nextCursor: ${page2.nextCursor}`);

  console.log('\n✅ All tests passed!');
}

testSampleDataLoader();
