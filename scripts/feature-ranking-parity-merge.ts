import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import {
  buildFeatureRankingParityArtifact,
  FEATURE_RANKING_OVERLAP_FLOOR,
  type FeatureRankingBenchmarkDataset,
  type FeatureRankingReferenceSummary,
} from '../src/lib/featureRankingBenchmark.ts';
import type { SvmRfeResult } from '../src/lib/advancedForecasting.ts';

function getArg(flag: string, fallback?: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const datasetPath = resolve(getArg('--dataset', 'artifacts/feature-ranking-benchmark/dataset.json')!);
const tsPath = resolve(getArg('--ts', 'artifacts/feature-ranking-benchmark/ts-result.json')!);
const referencePath = resolve(getArg('--reference', 'artifacts/feature-ranking-benchmark/parity-reference-result.json')!);
const outPath = resolve(getArg('--out', 'artifacts/feature-ranking-benchmark/parity-artifact.json')!);
const overlapFloor = Number(getArg('--overlap-floor', String(FEATURE_RANKING_OVERLAP_FLOOR)));

const datasetRaw = JSON.parse(readFileSync(datasetPath, 'utf8')) as FeatureRankingBenchmarkDataset & { datasetFingerprint: string };
const tsRaw = JSON.parse(readFileSync(tsPath, 'utf8')) as {
  modelVersion: string;
  retainedFeatures: string[];
  droppedFeatures: Array<{ feature: string; score: number; reason: string }>;
  rankings: SvmRfeResult['rankings'];
  trainingSummary: SvmRfeResult['trainingSummary'];
};
const referenceRaw = JSON.parse(readFileSync(referencePath, 'utf8')) as FeatureRankingReferenceSummary;

const artifact = buildFeatureRankingParityArtifact({
  dataset: datasetRaw,
  datasetFingerprint: datasetRaw.datasetFingerprint,
  overlapFloor,
  tsResult: {
    modelVersion: tsRaw.modelVersion,
    retainedFeatures: tsRaw.retainedFeatures,
    droppedFeatures: tsRaw.droppedFeatures,
    rankings: tsRaw.rankings,
    trainingSummary: tsRaw.trainingSummary,
  },
  reference: referenceRaw,
});

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(artifact, null, 2));

if (!artifact.parityPassed) {
  console.error(
    `Feature ranking parity failed: overlap ${artifact.overlapRatio.toFixed(3)} < floor ${artifact.overlapFloor.toFixed(3)}`,
  );
  process.exit(1);
}

console.log(`Feature ranking parity passed with overlap ${artifact.overlapRatio.toFixed(3)}.`);
