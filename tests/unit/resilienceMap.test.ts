import { describe, expect, it } from 'vitest';
import { buildResilienceFusionSummary, buildCascadeRiskSummary } from '../../src/lib/resilienceFusion';

describe('ResilienceMap fusion summary', () => {
  it('builds the exact labels used in the summary card', () => {
    const summary = buildResilienceFusionSummary({
      limitingFactorLabel: 'Flooding',
      fusionMethod: 'chebyshev_ipa_v2',
    });

    expect(summary.limitingFactorText).toBe('Limiting factor: Flooding');
    expect(summary.fusionText).toBe('non-compensatory fusion: chebyshev_ipa_v2');
  });

  it('builds a scored cascade risk block with threshold guidance', () => {
    const summary = buildCascadeRiskSummary({
      overallScore: 82,
      riskLevel: 'critical',
      limitingFactorLabel: 'Transmission Congestion',
      fusionMethod: 'chebyshev_ipa_v2',
    }, 3);

    expect(summary.cascadeRiskScore).toBeGreaterThan(0.5);
    expect(summary.alertCondition).toBe('immediate_review');
    expect(summary.thresholdExceeded).toBe(true);
    expect(summary.limitingFactorText).toContain('Transmission Congestion');
  });
});
