import { describe, expect, it } from 'vitest';
import {
  buildForecastAnalysisPrompt,
  buildRegulatorySummaryPrompt,
  buildEsgNarrativePrompt,
  buildTierCompliancePrompt,
  buildGridOptimizationPrompt,
  buildIndigenousEnergyPrompt,
} from '../../src/lib/promptTemplates';

describe('promptTemplates', () => {
  it('exposes the six expected domain templates', () => {
    const templates = [
      buildForecastAnalysisPrompt('demo context', 'forecast input'),
      buildRegulatorySummaryPrompt('demo context', 'regulatory input'),
      buildEsgNarrativePrompt('demo context', 'esg input'),
      buildTierCompliancePrompt('demo context', 'tier input'),
      buildGridOptimizationPrompt('demo context', 'grid input'),
      buildIndigenousEnergyPrompt('demo context', 'indigenous input'),
    ];

    expect(templates).toHaveLength(6);
    expect(templates[0]).toContain('forecast');
    expect(templates[1]).toContain('regulatory');
    expect(templates[2]).toContain('ESG');
    expect(templates[3]).toContain('TIER');
    expect(templates[4]).toContain('grid');
    expect(templates[5]).toContain('Indigenous');
  });

  it('shares the core honesty guardrails across every prompt', () => {
    const templates = [
      buildForecastAnalysisPrompt('context', 'input'),
      buildRegulatorySummaryPrompt('context', 'input'),
      buildEsgNarrativePrompt('context', 'input'),
      buildTierCompliancePrompt('context', 'input'),
      buildGridOptimizationPrompt('context', 'input'),
      buildIndigenousEnergyPrompt('context', 'input'),
    ];

    for (const template of templates) {
      expect(template).toContain('Use explicit provenance.');
      expect(template).toContain('Prefer honest fallback language.');
      expect(template).toContain('Do not imply live data without confirmation.');
    }
  });
});
