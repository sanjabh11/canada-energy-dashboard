import {
  generateSampleAssets,
  parseAssetCSV,
  resultsToCSV,
  scoreAssetHealth,
  scoreFleet,
  type AssetRecord,
} from '../../src/lib/assetHealthScoring';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-03-24T00:00:00.000Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('assetHealthScoring', () => {
  it('scores a healthy asset as good with a low-risk inspection cadence', () => {
    const asset: AssetRecord = {
      asset_id: 'TX-HEALTHY',
      asset_name: 'Healthy Transformer',
      asset_type: 'transformer_distribution',
      install_date: '2024-01-01',
      rated_capacity_kva: 500,
      current_load_kva: 150,
      environment: 'indoor',
      last_maintenance_date: '2026-01-15',
      maintenance_count_5yr: 3,
      emergency_maintenance_count_5yr: 0,
      location: 'Test Station',
      criticality: 'standard',
      notes: '',
    };

    const result = scoreAssetHealth(asset);

    expect(result.condition).toBe('good');
    expect(result.risk_priority).toBe('low');
    expect(result.next_inspection_months).toBe(12);
  });

  it('reports CSV validation errors for missing required columns', () => {
    const { assets, errors } = parseAssetCSV('asset_name,install_date\nTest Asset,2020-01-01');

    expect(assets).toHaveLength(0);
    expect(errors).toContain('Missing required column: asset_id');
    expect(errors).toContain('Missing required column: asset_type');
  });

  it('summarizes a fleet and exports CSV output', () => {
    const { results, summary } = scoreFleet(generateSampleAssets().slice(0, 3));
    const csv = resultsToCSV(results);

    expect(results).toHaveLength(3);
    expect(summary.total_assets).toBe(3);
    expect(csv).toContain('# Asset Health Index Report');
    expect(csv).toContain('asset_id,asset_name,asset_type');
  });
});
