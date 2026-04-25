import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const workflowPath = join(root, '.github/workflows/cron-model-retrain.yml');

describe('model retrain workflow', () => {
  it('exists with workflow dispatch inputs and supported model routes', () => {
    expect(existsSync(workflowPath)).toBe(true);
    const source = readFileSync(workflowPath, 'utf8');

    expect(source).toContain('workflow_dispatch');
    expect(source).toContain('model_key:');
    expect(source).toContain('domain:');
    expect(source).toContain('province:');
    expect(source).toContain('recommendation:');
    expect(source).toContain('pinn-dispatch-v2');
    expect(source).toContain('pv-gnn-v2');
    expect(source).toContain('training.dispatch_pinn.train');
    expect(source).toContain('training.pv_fault_gnn.train');
    expect(source).toContain('scripts/record-artifact.mjs');
  });
});
