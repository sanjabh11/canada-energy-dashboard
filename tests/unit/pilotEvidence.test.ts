import { describe, expect, it } from 'vitest';
import {
  getPilotEvidenceCoverageSummary,
  pilotConfidenceRules,
  pilotEvidenceRequirements,
  pilotStopConditions,
} from '../../src/lib/pilotEvidence';

describe('pilotEvidence', () => {
  it('defines buyer evidence gates for the top confidence gaps', () => {
    const summary = getPilotEvidenceCoverageSummary();

    expect(summary.requirementCount).toBeGreaterThanOrEqual(9);
    expect(summary.confidenceRuleCount).toBeGreaterThanOrEqual(5);
    expect(summary.stopConditionCount).toBeGreaterThanOrEqual(5);
    expect(pilotEvidenceRequirements.map((item) => item.id)).toEqual(expect.arrayContaining([
      'buyer-load-history',
      'tier-facility-assumptions',
      'tier-credit-ledger',
      'invoice-comparison-sample',
      'security-questionnaire',
    ]));
  });

  it('keeps every evidence item tied to a route, artifact, blocked claim, and acceptance checks', () => {
    for (const item of pilotEvidenceRequirements) {
      expect(item.route, item.id).toMatch(/^\//);
      expect(item.artifact, item.id).toBeTruthy();
      expect(item.blockedClaim, item.id).toBeTruthy();
      expect(item.acceptance.length, item.id).toBeGreaterThanOrEqual(3);
    }
  });

  it('prevents constructed samples from increasing market confidence', () => {
    expect(pilotConfidenceRules[0].evidenceState).toMatch(/constructed sample/i);
    expect(pilotConfidenceRules[0].confidenceMovement).toMatch(/Do not increase market confidence/i);
    expect(pilotStopConditions.join(' ')).toMatch(/production utility onboarding/i);
  });
});
