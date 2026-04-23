import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

describe('ML Edge function contracts', () => {
  const functions = [
    'ml-forecast',
    'groundsource-miner',
    'tier-simulator',
    'rate-watchdog',
    'grid-risk',
    'model-monitor',
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
});
