import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const scriptPath = path.resolve(here, '../../scripts/shell/test_migration.sh');

describe('migration helper secret boundary', () => {
  it('requires an injected password and never pipes a literal to the CLI', () => {
    const source = readFileSync(scriptPath, 'utf8');

    expect(source).toContain('SUPABASE_DB_PASSWORD');
    expect(source).toContain('supabase db push --password-stdin');
    expect(source).toMatch(/set -euo pipefail/);
    expect(source).not.toMatch(/(?:echo|printf)\s+['\"][^$]*['\"]\s*\|\s*supabase\s+db\s+push/i);
  });

  it('fails closed before invoking the CLI when no password is supplied', () => {
    const result = spawnSync('bash', [scriptPath], {
      env: { PATH: process.env.PATH ?? '', HOME: '/tmp' },
      encoding: 'utf8',
    });

    expect(result.status).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('no migration was attempted');
  });
});
