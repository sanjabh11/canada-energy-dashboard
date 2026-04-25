import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { buildMeta } from '../../supabase/functions/_shared/mlForecasting';

const root = process.cwd();

describe('ML Edge function contracts', () => {
  const functions = [
    'ml-forecast',
    'groundsource-miner',
    'tier-simulator',
    'rate-watchdog',
    'grid-risk',
    'model-monitor',
    'ingest-tier-market-rates',
    'ingest-retailer-rate-offers',
    'ingest-market-spike-series',
    'ingest-gas-basis-series',
  ];

  it('defines every planned Edge endpoint with CORS and rate limiting', () => {
    for (const functionName of functions) {
      const path = join(root, 'supabase/functions', functionName, 'index.ts');
      expect(existsSync(path), `${functionName} should exist`).toBe(true);
      const source = readFileSync(path, 'utf8');
      expect(source).toContain('createCorsHeaders');
      expect(source).toContain('handleCorsOptions');
      expect(source).toContain('applyRateLimit');
    }
  });

  it('uses the shared response metadata fields in ML endpoint implementations', () => {
    const shared = readFileSync(join(root, 'supabase/functions/_shared/mlForecasting.ts'), 'utf8');
    for (const field of [
      'model_version',
      'generated_at',
      'valid_at',
      'confidence_score',
      'data_sources',
      'is_fallback',
      'staleness_status',
      'methodology',
      'warnings',
      'training_data_profile',
      'evaluation_summary',
      'calibration_status',
      'claim_label',
      'training_artifact_sha',
      'simulator_config',
      'trained_at',
    ]) {
      expect(shared).toContain(field);
    }
  });

  it('does not introduce guaranteed savings claims in ML implementation files', () => {
    const files = [
      'src/lib/mlForecasting.ts',
      'src/lib/mlForecastingClient.ts',
      ...functions.map((functionName) => `supabase/functions/${functionName}/index.ts`),
    ];
    for (const file of files) {
      const source = readFileSync(join(root, file), 'utf8').toLowerCase();
      expect(source).not.toContain('guaranteed savings');
    }
  });

  it('preserves optional provenance v3 fields only when callers supply them', () => {
    const enriched = buildMeta({
      modelVersion: 'bootstrap-v3',
      validAt: '2026-04-24T00:00:00.000Z',
      confidenceScore: 0.91,
      dataSources: [{ name: 'simulator', lastUpdated: '2026-04-01' }],
      isFallback: false,
      methodology: 'bootstrap',
      trainingDataProfile: 'simulator-calibrated',
      trainingArtifactSha: 'sha-42',
      simulatorConfig: {
        name: 'pvlib',
        version: 'placeholder-0.0.0',
        scenario_count: 20000,
        topology: 'IEEE-123',
      },
      trainedAt: '2026-04-24T00:00:00.000Z',
    });

    expect(enriched.training_data_profile).toBe('simulator-calibrated');
    expect(enriched.training_artifact_sha).toBe('sha-42');
    expect(enriched.simulator_config?.topology).toBe('IEEE-123');
    expect(enriched.trained_at).toBe('2026-04-24T00:00:00.000Z');

    const minimal = buildMeta({
      modelVersion: 'bootstrap-v3',
      validAt: '2026-04-24T00:00:00.000Z',
      confidenceScore: 0.91,
      dataSources: [{ name: 'simulator', lastUpdated: '2026-04-01' }],
      isFallback: false,
      methodology: 'bootstrap',
    });

    expect('training_data_profile' in minimal).toBe(false);
    expect('training_artifact_sha' in minimal).toBe(false);
    expect('simulator_config' in minimal).toBe(false);
    expect('trained_at' in minimal).toBe(false);
  });
});
