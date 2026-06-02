import { describe, expect, it } from 'vitest';
import {
  getPilotEvidenceCoverageSummary,
  pilotConfidenceRules,
  pilotEvidenceRequirements,
  pilotIntakeRoutePlans,
  pilotNinetyFiveGateCommand,
  pilotNinetyFiveGates,
  pilotOutcomeMetrics,
  pilotStopConditions,
} from '../../src/lib/pilotEvidence';

describe('pilotEvidence', () => {
  it('defines buyer evidence gates for the top confidence gaps', () => {
    const summary = getPilotEvidenceCoverageSummary();

    expect(summary.requirementCount).toBeGreaterThanOrEqual(10);
    expect(summary.confidenceRuleCount).toBeGreaterThanOrEqual(5);
    expect(summary.ninetyFiveGateCount).toBeGreaterThanOrEqual(5);
    expect(summary.intakeRoutePlanCount).toBeGreaterThanOrEqual(5);
    expect(summary.outcomeMetricCount).toBeGreaterThanOrEqual(4);
    expect(summary.stopConditionCount).toBeGreaterThanOrEqual(5);
    expect(pilotEvidenceRequirements.map((item) => item.id)).toEqual(expect.arrayContaining([
      'buyer-load-history',
      'ga-ici-5cp-load-window',
      'byo-csv-privacy-proof',
      'tier-facility-assumptions',
      'tier-credit-ledger',
      'invoice-comparison-sample',
      'security-questionnaire',
      'consultant-api-data-pack',
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

  it('publishes route-aware intake plans for the minimum 95% buyer-evidence lanes', () => {
    expect(pilotIntakeRoutePlans.map((plan) => plan.route)).toEqual(expect.arrayContaining([
      '/utility-demand-forecast',
      '/roi-calculator',
      '/credit-banking',
      '/shadow-billing',
      '/utility-security',
    ]));

    for (const plan of pilotIntakeRoutePlans) {
      expect(plan.proofPackId, plan.route).toMatch(/^[a-z0-9_]+$/);
      expect(plan.outreachCommand, plan.route).toContain('append:outreach-response-log-row');
      expect(plan.outreachCommand, plan.route).toContain(`--route ${plan.route}`);
      expect(plan.outreachCommand, plan.route).toContain('--pilot-evidence-register-action create_intake_packet');
      expect(plan.intakePacketCommand, plan.route).toContain('create:outreach-intake-packets');
      expect(plan.registerUpdateCommand, plan.route).toContain('update:pilot-evidence-register-row');
      expect(plan.registerUpdateCommand, plan.route).toContain('--confidence-delta 0.3');
      expect(plan.doNotClaim, plan.route).toMatch(/Do not claim/i);
      expect(plan.claimBoundary, plan.route).toMatch(/Buyer-supplied/i);
    }
  });

  it('prevents constructed samples from increasing market confidence', () => {
    expect(pilotConfidenceRules[0].evidenceState).toMatch(/constructed sample/i);
    expect(pilotConfidenceRules[0].confidenceMovement).toMatch(/Do not increase market confidence/i);
    expect(pilotStopConditions.join(' ')).toMatch(/production utility onboarding/i);
  });

  it('defines pilot outcome metrics that tie confidence movement to buyer-review evidence', () => {
    expect(pilotOutcomeMetrics.map((item) => item.id)).toEqual(expect.arrayContaining([
      'time-to-artifact',
      'buyer-data-coverage',
      'benchmark-lift-or-diagnostic',
      'reviewer-acceptance',
    ]));

    for (const metric of pilotOutcomeMetrics) {
      expect(metric.requiredEvidence, metric.id).toBeTruthy();
      expect(metric.howToMeasure, metric.id).toMatch(/record|count|divide|track/i);
      expect(metric.confidenceUse, metric.id).toMatch(/confidence|proof|pilot|forecasting/i);
      expect(metric.route, metric.id).toMatch(/^\//);
    }
  });

  it('publishes a buyer-evidence gate before any 95% confidence claim', () => {
    expect(pilotNinetyFiveGateCommand).toContain('--require-95');
    expect(pilotNinetyFiveGateCommand).toContain('--evidence-root');
    expect(pilotNinetyFiveGates.map((item) => item.id)).toEqual(expect.arrayContaining([
      'utility-forecast-benchmark',
      'tier-or-credit',
      'billing-or-security',
      'three-proof-packs',
      'coverage-and-delta',
      'fast-pilot-artifact',
      'redacted-artifact-hashes',
      'commercial-commitment',
    ]));

    for (const gate of pilotNinetyFiveGates) {
      expect(gate.label, gate.id).toBeTruthy();
      expect(gate.evidence, gate.id).toMatch(/buyer|accepted|proof_pack|confidence|coverage|MAE|TIER|billing|security/i);
    }
  });
});
