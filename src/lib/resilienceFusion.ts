export function buildResilienceFusionSummary(assessment: {
  limitingFactorLabel: string;
  fusionMethod: string;
}) {
  return {
    limitingFactorText: `Limiting factor: ${assessment.limitingFactorLabel}`,
    fusionText: `fusion: ${assessment.fusionMethod}`,
  };
}

export function buildCascadeRiskSummary(assessment: {
  overallScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical' | string;
  limitingFactorLabel: string;
  fusionMethod: string;
}, intelligenceEventCount = 0) {
  const baseScore = Math.max(0, Math.min(1, assessment.overallScore / 100));
  const riskLevelPressure = assessment.riskLevel === 'critical'
    ? 0.35
    : assessment.riskLevel === 'high'
      ? 0.25
      : assessment.riskLevel === 'medium'
        ? 0.12
        : 0.04;
  const intelligencePressure = Math.max(0, Math.min(0.2, intelligenceEventCount * 0.03));
  const cascadeRiskScore = Math.max(0, Math.min(1, baseScore * 0.6 + riskLevelPressure + intelligencePressure));
  const alertCondition = cascadeRiskScore >= 0.75 ? 'immediate_review' : cascadeRiskScore >= 0.55 ? 'operator_watch' : 'monitor';

  return {
    cascadeRiskScore,
    alertCondition,
    thresholdExceeded: cascadeRiskScore >= 0.55,
    limitingFactorText: `Cascade limiting factor: ${assessment.limitingFactorLabel}`,
    driverText: `Risk is amplified by ${assessment.fusionMethod} and ${intelligenceEventCount} intelligence event(s).`,
    thresholdText: 'Thresholds: monitor 55%, operator watch 75%, immediate review above 75%',
    recommendation:
      alertCondition === 'immediate_review'
        ? 'Escalate the limiting asset and dispatch a local review before compounding regional issues.'
        : alertCondition === 'operator_watch'
          ? 'Keep the limiting factor under active watch and review neighbouring asset headroom.'
          : 'Continue monitoring; no escalation threshold has been crossed.',
  };
}
