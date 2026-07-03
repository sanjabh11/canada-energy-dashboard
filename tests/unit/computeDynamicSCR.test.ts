import { describe, expect, it } from 'vitest';
import { computeDynamicSCR } from '../../src/lib/weakGridFixtures';

describe('computeDynamicSCR', () => {
  it('classifies a strong node correctly (SCR >= 5)', () => {
    const result = computeDynamicSCR(
      { nodes: [{ id: 'test', shortCircuitKa: 5.0 }], edges: [] },
      138,
      100,
    );

    expect(result).toHaveLength(1);
    expect(result[0].scr).toBeCloseTo(11.96, 1);
    expect(result[0].strengthClass).toBe('strong');
    expect(result[0].isWeak).toBe(false);
  });

  it('classifies a weak node correctly (SCR < 3)', () => {
    const result = computeDynamicSCR(
      { nodes: [{ id: 'weak1', shortCircuitKa: 1.0 }], edges: [] },
      138,
      100,
    );

    expect(result[0].scr).toBeCloseTo(2.39, 1);
    expect(result[0].isWeak).toBe(true);
    expect(result[0].strengthClass).toBe('weak');
  });

  it('classifies a marginal node correctly (3 <= SCR < 5)', () => {
    const result = computeDynamicSCR(
      { nodes: [{ id: 'marg1', shortCircuitKa: 2.0 }], edges: [] },
      138,
      100,
    );

    expect(result[0].scr).toBeCloseTo(4.78, 1);
    expect(result[0].strengthClass).toBe('marginal');
    expect(result[0].isWeak).toBe(false);
  });

  it('returns error results for baseMva=0', () => {
    const result = computeDynamicSCR(
      { nodes: [{ id: 'x', shortCircuitKa: 5 }], edges: [] },
      138,
      0,
    );

    expect(result[0].strengthClass).toBe('weak');
    expect(result[0].advisoryLabel).toContain('ERROR');
  });

  it('returns empty array for empty topology', () => {
    const result = computeDynamicSCR({ nodes: [], edges: [] }, 138, 100);

    expect(result).toHaveLength(0);
  });

  it('detects edge loading stress above 85% capacity', () => {
    const result = computeDynamicSCR(
      {
        nodes: [
          { id: 'n1', shortCircuitKa: 5.0 },
          { id: 'n2', shortCircuitKa: 5.0 },
        ],
        edges: [
          { fromNodeId: 'n1', toNodeId: 'n2', limitMw: 100, currentMw: 90 },
        ],
      },
      138,
      100,
    );

    const n1 = result.find((r) => r.nodeId === 'n1');
    expect(n1?.contributingFactors.some((f) => f.includes('90% capacity'))).toBe(true);
  });

  it('does not flag edges below 85% loading', () => {
    const result = computeDynamicSCR(
      {
        nodes: [{ id: 'n1', shortCircuitKa: 5.0 }],
        edges: [{ fromNodeId: 'n1', toNodeId: 'n2', limitMw: 100, currentMw: 50 }],
      },
      138,
      100,
    );

    expect(result[0].contributingFactors.some((f) => f.includes('capacity'))).toBe(false);
  });

  it('includes method string with voltage and base MVA', () => {
    const result = computeDynamicSCR(
      { nodes: [{ id: 'test', shortCircuitKa: 5.0 }], edges: [] },
      230,
      200,
    );

    expect(result[0].method).toContain('230');
    expect(result[0].method).toContain('200');
  });
});
