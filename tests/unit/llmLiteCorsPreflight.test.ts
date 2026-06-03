import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(join(process.cwd(), 'supabase/functions/llm-lite/index.ts'), 'utf8');

describe('llm-lite CORS preflight contract', () => {
  it('handles OPTIONS before request guards and normalizes direct functions-domain paths', () => {
    const optionsIndex = source.indexOf("if (req.method === 'OPTIONS')");
    const rateLimitIndex = source.indexOf("const rl = applyRateLimit(req, 'llm-lite')");

    expect(optionsIndex).toBeGreaterThan(-1);
    expect(rateLimitIndex).toBeGreaterThan(-1);
    expect(optionsIndex).toBeLessThan(rateLimitIndex);
    expect(source).toContain('.replace(/^\\/llm-lite\\b/, \'\')');
  });
});
