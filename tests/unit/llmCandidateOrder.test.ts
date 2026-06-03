import { afterEach, describe, expect, it, vi } from 'vitest';
import { orderCandidates } from '../../src/lib/llm/utils';

describe('LLM endpoint candidate ordering', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses only the deployed primary function unless lite is explicitly enabled', () => {
    vi.stubEnv('VITE_LLM_PREFER_LITE', 'true');

    expect(orderCandidates('llm/transition-kpis', 'llm-lite/transition-kpis')).toEqual([
      'llm/transition-kpis',
    ]);
  });

  it('can prefer lite only after the lite function is explicitly enabled', () => {
    vi.stubEnv('VITE_LLM_LITE_ENABLED', 'true');
    vi.stubEnv('VITE_LLM_PREFER_LITE', 'true');

    expect(orderCandidates('llm/transition-kpis', 'llm-lite/transition-kpis')).toEqual([
      'llm-lite/transition-kpis',
      'llm/transition-kpis',
    ]);
  });
});
