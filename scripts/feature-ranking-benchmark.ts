import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { buildFeatureRankingBenchmarkDataset, runTsFeatureRankingBenchmark } from '../src/lib/featureRankingBenchmark.ts';
import type { DemandRecord } from '../src/lib/demandForecaster.ts';

function getArg(flag: string, fallback?: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function writeJson(filePath: string, value: unknown) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(value, null, 2));
}

const datasetOut = resolve(getArg('--dataset-out', 'artifacts/feature-ranking-benchmark/dataset.json')!);
const tsOut = resolve(getArg('--ts-out', 'artifacts/feature-ranking-benchmark/ts-result.json')!);
const seed = Number(getArg('--seed', '42'));
const samplePath = resolve(getArg('--sample', 'public/data/ontario_demand_sample.json')!);

const records = JSON.parse(readFileSync(samplePath, 'utf8')) as DemandRecord[];
const dataset = buildFeatureRankingBenchmarkDataset(records);
const minFeatures = 4;
const maxIterations = 10;
const learningRate = 0.02;
const regularization = 0.01;
const epochs = 140;
const datasetFingerprint = createHash('sha256')
  .update(JSON.stringify({ rows: dataset.rows, targetKey: dataset.targetKey, seed }))
  .digest('hex');
const tsResult = runTsFeatureRankingBenchmark(dataset);

writeJson(datasetOut, {
  ...dataset,
  minFeatures,
  maxIterations,
  learningRate,
  regularization,
  epochs,
  datasetFingerprint,
});
writeJson(tsOut, {
  version: 'ts-feature-ranking-benchmark-v1',
  seed,
  datasetFingerprint,
  modelVersion: tsResult.modelVersion,
  sampleCount: dataset.sampleCount,
  targetThreshold: dataset.targetThreshold,
  retainedFeatures: tsResult.retainedFeatures,
  droppedFeatures: tsResult.droppedFeatures,
  rankings: tsResult.rankings,
  trainingSummary: tsResult.trainingSummary,
});

console.log(`Feature ranking dataset written to ${datasetOut}`);
console.log(`TypeScript benchmark summary written to ${tsOut}`);
