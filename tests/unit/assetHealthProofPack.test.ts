import { describe, expect, it } from 'vitest';
import { generateSampleAssets, scoreFleet } from '../../src/lib/assetHealthScoring';
import {
  buildAssetCostSensitivityChecklistMarkdown,
  buildAssetExecutiveSummaryDescriptor,
  buildAssetProofBundle,
  buildPrioritizedReplacementCsv,
  rankAssetsForAction,
} from '../../src/lib/assetHealthProofPack';

describe('assetHealthProofPack', () => {
  it('ranks assets deterministically and includes the priority reason in the CSV export', () => {
    const { results } = scoreFleet(generateSampleAssets());
    const ranked = rankAssetsForAction(results);
    const csv = buildPrioritizedReplacementCsv(results);

    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked[0].priority_reason.length).toBeGreaterThan(20);
    expect(csv).toContain('priority_reason');
    expect(csv).toContain(ranked[0].asset_name);
    expect(csv).toContain(ranked[0].location);
  });

  it('builds an executive summary proof pack from the current fleet results', () => {
    const { results, summary } = scoreFleet(generateSampleAssets());
    const bundle = buildAssetProofBundle(true);
    const descriptor = buildAssetExecutiveSummaryDescriptor(summary, results, true);

    expect(bundle.artifacts.map((artifact) => artifact.label)).toEqual([
      'Executive summary export',
      'Scored fleet CSV',
      'Prioritized replacement list',
      'Cost sensitivity checklist',
    ]);
    expect(descriptor.sections[1].heading).toBe('Priority assets');
    expect(descriptor.sections[3].heading).toBe('Cost and sensitivity checks');
    expect(buildAssetCostSensitivityChecklistMarkdown()).toContain('replacement costs');
    expect(descriptor.sections[1].body[0]).toContain('(');
    expect(descriptor.nextStep).toContain('paid pilot');
  });
});
