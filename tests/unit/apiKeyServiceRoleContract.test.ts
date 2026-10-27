import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const functionSources = [
  'supabase/functions/api-v2-industrial-decarb/index.ts',
  'supabase/functions/api-v2-esg-finance/index.ts',
].map((file) => readFileSync(path.resolve(process.cwd(), file), 'utf8'));

describe('API-key Edge Functions service-role contract', () => {
  it('does not fall back to a public anon key for database access', () => {
    for (const source of functionSources) {
      expect(source).toContain('EDGE_SUPABASE_SERVICE_ROLE_KEY');
      expect(source).toContain('SUPABASE_SERVICE_ROLE_KEY');
      expect(source).not.toContain('EDGE_SUPABASE_ANON_KEY');
      expect(source).not.toContain('SUPABASE_ANON_KEY');
    }
  });
});
