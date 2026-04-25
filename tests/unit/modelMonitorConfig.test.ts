import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('model-monitor deployment config', () => {
  it('declares the edge function in supabase/config.toml', () => {
    const config = readFileSync(join(root, 'supabase/config.toml'), 'utf8');
    expect(config).toContain('[functions.model-monitor]');
    expect(config).toContain('./functions/model-monitor/index.ts');
    expect(config).toContain('./functions/model-monitor/deno.json');
  });

  it('ships a deno import map for the model-monitor function', () => {
    expect(existsSync(join(root, 'supabase/functions/model-monitor/deno.json'))).toBe(true);
  });
});
