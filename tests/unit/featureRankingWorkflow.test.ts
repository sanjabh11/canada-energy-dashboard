import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const workflowPath = join(root, '.github/workflows/feature-ranking-parity.yml');

describe('feature ranking parity workflow', () => {
  it('exists and runs both the TypeScript and sklearn benchmark steps', () => {
    expect(existsSync(workflowPath)).toBe(true);
    const source = readFileSync(workflowPath, 'utf8');

    expect(source).toContain('workflow_dispatch');
    expect(source).toContain('scripts/feature-ranking-benchmark.ts');
    expect(source).toContain('scripts/feature-ranking-reference.py');
    expect(source).toContain('scripts/feature-ranking-baseline.py');
    expect(source).toContain('parity-reference-result.json');
    expect(source).toContain('baseline-reference-result.json');
    expect(source).toContain('scripts/feature-ranking-parity-merge.ts');
    expect(source).toContain('overlap-floor 0.75');
    expect(source).toContain('upload-artifact');
  });
});
