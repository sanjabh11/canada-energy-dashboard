import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildFeatureRankingBenchmarkDataset,
  buildFeatureRankingParityArtifact,
  FEATURE_RANKING_BENCHMARK_SEED,
  FEATURE_RANKING_OVERLAP_FLOOR,
  runTsFeatureRankingBenchmark,
  type FeatureRankingReferenceSummary,
} from '../../src/lib/featureRankingBenchmark';
import type { DemandRecord } from '../../src/lib/demandForecaster';

const fixturePath = join(process.cwd(), 'public/data/ontario_demand_sample.json');
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as DemandRecord[];

describe('feature ranking benchmark helpers', () => {
  it('builds a deterministic benchmark dataset from Ontario demand history', () => {
    const first = buildFeatureRankingBenchmarkDataset(fixture.slice(0, 500));
    const second = buildFeatureRankingBenchmarkDataset(fixture.slice(0, 500));

    expect(first.seed).toBe(FEATURE_RANKING_BENCHMARK_SEED);
    expect(first.targetKey).toBe('target_demand_mw');
    expect(first.sampleCount).toBeGreaterThan(0);
    expect(first.rows).toEqual(second.rows);
    expect(first.featureNames).toContain('previous_week_same_hour_mw');
  });

  it('builds a parity artifact with fingerprint, overlap ratio, and pass/fail state', () => {
    const dataset = buildFeatureRankingBenchmarkDataset(fixture.slice(0, 500));
    const tsResult = runTsFeatureRankingBenchmark(dataset);
    const reference: FeatureRankingReferenceSummary = {
      modelVersion: 'sklearn-linear-svc-rfe-v1',
      sampleCount: dataset.sampleCount,
      targetThreshold: dataset.targetThreshold,
      retainedFeatures: tsResult.retainedFeatures.slice(0, 4),
      droppedFeatures: dataset.featureNames.filter((feature) => !tsResult.retainedFeatures.slice(0, 4).includes(feature)),
      rankings: dataset.featureNames.map((feature, index) => ({
        feature,
        rank: index + 1,
        retained: tsResult.retainedFeatures.slice(0, 4).includes(feature),
        score: Math.max(0, 1 - index * 0.05),
      })),
    };

    const artifact = buildFeatureRankingParityArtifact({
      dataset,
      datasetFingerprint: 'fingerprint-123',
      overlapFloor: FEATURE_RANKING_OVERLAP_FLOOR,
      tsResult,
      reference,
    });

    expect(artifact.datasetFingerprint).toBe('fingerprint-123');
    expect(artifact.seed).toBe(FEATURE_RANKING_BENCHMARK_SEED);
    expect(artifact.overlapRatio).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(artifact.rankingDeltas)).toBe(true);
  });
});
