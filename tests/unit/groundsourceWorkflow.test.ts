import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const workflowPath = join(root, '.github/workflows/cron-groundsource-miner.yml');

describe('groundsource miner workflow', () => {
  it('exists with a daily cron and service-role cron trigger', () => {
    expect(existsSync(workflowPath)).toBe(true);
    const source = readFileSync(workflowPath, 'utf8');

    expect(source).toContain("cron: '15 4 * * *'");
    expect(source).toContain('workflow_dispatch');
    expect(source).toContain('groundsource-miner/ingest');
    expect(source).toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(source).toContain('x-supabase-cron: true');
    expect(source).toContain('utility_public');
    expect(source).toContain('policy_public');
  });
});
