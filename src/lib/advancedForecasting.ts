export type NumericRecord = Record<string, number>;
export type LabeledRecord = Record<string, number | string | boolean | null | undefined>;

const DEFAULT_MINORITY_TARGET_RATIO = 1;

function clamp(value: number, min = 0, max = 1): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function round(value: number, decimals = 2): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function mean(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function variance(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  return mean(values.map((value) => (value - avg) ** 2));
}

function stdDev(values: number[]): number {
  return Math.sqrt(variance(values));
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function argMin(values: number[]): number {
  let index = 0;
  for (let i = 1; i < values.length; i++) {
    if (values[i] < values[index]) index = i;
  }
  return index;
}

function argMax(values: number[]): number {
  let index = 0;
  for (let i = 1; i < values.length; i++) {
    if (values[i] > values[index]) index = i;
  }
  return index;
}

function dot(left: number[], right: number[]): number {
  return left.reduce((sum, value, index) => sum + value * (right[index] ?? 0), 0);
}

function euclideanDistance(left: number[], right: number[]): number {
  return Math.sqrt(left.reduce((sum, value, index) => sum + (value - (right[index] ?? 0)) ** 2, 0));
}

function sampleWithReplacement<T>(items: T[], count: number): T[] {
  if (items.length === 0 || count <= 0) return [];
  const sampled: T[] = [];
  for (let i = 0; i < count; i++) {
    sampled.push(items[Math.floor(Math.random() * items.length)]);
  }
  return sampled;
}

function majorityLabel(values: number[]): number {
  const counts = new Map<number, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  let best = values[0] ?? 0;
  let bestCount = -1;
  for (const [value, count] of counts.entries()) {
    if (count > bestCount || (count === bestCount && value < best)) {
      best = value;
      bestCount = count;
    }
  }
  return best;
}

function gini(values: number[]): number {
  if (!values.length) return 0;
  const counts = new Map<number, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  const total = values.length;
  let impurity = 1;
  for (const count of counts.values()) {
    const p = count / total;
    impurity -= p * p;
  }
  return impurity;
}

function pearson(left: number[], right: number[]): number {
  if (left.length !== right.length || left.length < 2) return 0;
  const leftMean = mean(left);
  const rightMean = mean(right);
  const numerator = left.reduce((sum, value, index) => sum + (value - leftMean) * (right[index] - rightMean), 0);
  const denominator = Math.sqrt(
    left.reduce((sum, value) => sum + (value - leftMean) ** 2, 0)
    * right.reduce((sum, value) => sum + (value - rightMean) ** 2, 0),
  );
  return denominator === 0 ? 0 : numerator / denominator;
}

function standardizeRows(rows: NumericRecord[], features: string[]) {
  const stats = Object.fromEntries(
    features.map((feature) => {
      const values = rows.map((row) => Number(row[feature] ?? 0));
      const avg = mean(values);
      const sd = stdDev(values) || 1;
      return [feature, { mean: avg, std: sd }];
    }),
  ) as Record<string, { mean: number; std: number }>;

  const matrix = rows.map((row) => features.map((feature) => {
    const value = Number(row[feature] ?? 0);
    return (value - stats[feature].mean) / stats[feature].std;
  }));

  return { matrix, stats };
}

function trainLinearMarginModel(
  rows: NumericRecord[],
  labels: number[],
  features: string[],
  options: { learningRate?: number; epochs?: number; regularization?: number } = {},
) {
  const learningRate = options.learningRate ?? 0.02;
  const epochs = options.epochs ?? 120;
  const regularization = options.regularization ?? 0.01;
  const { matrix, stats } = standardizeRows(rows, features);
  const weights = new Array(features.length).fill(0);
  let bias = 0;

  for (let epoch = 0; epoch < epochs; epoch++) {
    const order = rows.map((_, index) => index);
    for (const rowIndex of order) {
      const x = matrix[rowIndex];
      const y = labels[rowIndex];
      const margin = y * (dot(weights, x) + bias);

      for (let i = 0; i < weights.length; i++) {
        weights[i] -= learningRate * regularization * weights[i];
      }

      if (margin < 1) {
        for (let i = 0; i < weights.length; i++) {
          weights[i] += learningRate * y * x[i];
        }
        bias += learningRate * y;
      }
    }
  }

  const margins = matrix.map((x, index) => labels[index] * (dot(weights, x) + bias));

  return {
    weights,
    bias,
    stats,
    margin: mean(margins),
  };
}

function scoreLinearMarginModel(
  model: ReturnType<typeof trainLinearMarginModel>,
  row: NumericRecord,
  features: string[],
) {
  const vector = features.map((feature) => {
    const stats = model.stats[feature] ?? { mean: 0, std: 1 };
    return (Number(row[feature] ?? 0) - stats.mean) / (stats.std || 1);
  });
  return dot(model.weights, vector) + model.bias;
}

function toNumericRows(rows: Array<Record<string, number>>) {
  return rows.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, Number(value)])) as NumericRecord);
}

// -----------------------------------------------------------------------------
// SVM-RFE
// -----------------------------------------------------------------------------

export interface SvmRfeRanking {
  feature: string;
  score: number;
  correlationToTarget: number;
  retained: boolean;
  dropReason: string | null;
  weight: number;
}

export interface SvmRfeResult {
  modelVersion: string;
  retainedFeatures: string[];
  droppedFeatures: Array<{ feature: string; reason: string; score: number }>;
  rankings: SvmRfeRanking[];
  trainingSummary: {
    samples: number;
    positiveRate: number;
    targetThreshold: number;
    margin: number;
  };
}

export function rankFeaturesSvmRfeV2(
  rows: Array<Record<string, number>>,
  targetKey: string,
  options: {
    minFeatures?: number;
    maxIterations?: number;
    learningRate?: number;
    regularization?: number;
    positiveThreshold?: number;
  } = {},
): SvmRfeResult {
  const numericRows = toNumericRows(rows).filter((row) => Object.values(row).every(Number.isFinite));
  const featureNames = Object.keys(numericRows[0] ?? {}).filter((key) => key !== targetKey);
  const minFeatures = Math.max(1, options.minFeatures ?? 3);
  const maxIterations = Math.max(1, options.maxIterations ?? featureNames.length);

  if (numericRows.length === 0 || featureNames.length === 0) {
    return {
      modelVersion: 'svm-rfe-v2',
      retainedFeatures: [],
      droppedFeatures: [],
      rankings: [],
      trainingSummary: { samples: 0, positiveRate: 0, targetThreshold: 0, margin: 0 },
    };
  }

  const targetValues = numericRows.map((row) => Number(row[targetKey] ?? 0));
  const targetThreshold = options.positiveThreshold ?? median(targetValues);
  const labels = targetValues.map((value) => (value >= targetThreshold ? 1 : -1));
  const positiveRate = labels.filter((value) => value === 1).length / labels.length;

  let remaining = [...featureNames];
  const eliminationLog: Array<{ feature: string; score: number; reason: string }> = [];
  let finalModel = trainLinearMarginModel(
    numericRows,
    labels,
    remaining,
    { learningRate: options.learningRate, epochs: 140, regularization: options.regularization },
  );

  let iteration = 0;
  while (remaining.length > minFeatures && iteration < maxIterations) {
    const featureScores = remaining.map((feature, index) => ({
      feature,
      score: Math.abs(finalModel.weights[index]) * (finalModel.stats[feature].std || 1),
    }));
    featureScores.sort((left, right) => left.score - right.score || left.feature.localeCompare(right.feature));
    const weakest = featureScores[0];
    if (!weakest) break;

    eliminationLog.push({
      feature: weakest.feature,
      score: round(weakest.score, 6),
      reason: weakest.score <= 0.015 ? 'low_signal' : 'recursive_elimination',
    });
    remaining = remaining.filter((feature) => feature !== weakest.feature);
    iteration += 1;

    if (remaining.length <= minFeatures) break;
    finalModel = trainLinearMarginModel(
      numericRows,
      labels,
      remaining,
      { learningRate: options.learningRate, epochs: 140, regularization: options.regularization },
    );
  }

  const retainedWeights = new Map<string, number>();
  remaining.forEach((feature, index) => {
    retainedWeights.set(feature, finalModel.weights[index] ?? 0);
  });

  const rankings = featureNames.map((feature) => {
    const retained = remaining.includes(feature);
    const elimination = eliminationLog.find((entry) => entry.feature === feature);
    const weight = retained ? (retainedWeights.get(feature) ?? 0) : 0;
    const score = retained
      ? Math.abs(weight) * (finalModel.stats[feature].std || 1)
      : elimination?.score ?? 0;
    const values = numericRows.map((row) => Number(row[feature] ?? 0));
    const correlation = Math.abs(pearson(values, targetValues));

    return {
      feature,
      score: round(score, 6),
      correlationToTarget: round(correlation, 6),
      retained,
      dropReason: retained ? null : elimination?.reason ?? 'recursive_elimination',
      weight: round(weight, 6),
    };
  }).sort((left, right) => right.score - left.score || right.correlationToTarget - left.correlationToTarget || left.feature.localeCompare(right.feature));

  return {
    modelVersion: 'svm-rfe-v2',
    retainedFeatures: rankings.filter((ranking) => ranking.retained).map((ranking) => ranking.feature),
    droppedFeatures: eliminationLog,
    rankings,
    trainingSummary: {
      samples: numericRows.length,
      positiveRate: round(positiveRate, 4),
      targetThreshold,
      margin: round(finalModel.margin, 4),
    },
  };
}

// -----------------------------------------------------------------------------
// KMeans-SMOTE
// -----------------------------------------------------------------------------

export interface KMeansSmoteResult {
  modelVersion: string;
  minorityLabel: string | number;
  clusterCount: number;
  syntheticRows: Array<Record<string, number | string | boolean>>;
  resampledRows: Array<Record<string, number | string | boolean>>;
  classBalanceBefore: Record<string, number>;
  classBalanceAfter: Record<string, number>;
  syntheticLineage: Array<{ clusterIndex: number; syntheticCount: number; sourceCount: number }>;
}

function kMeans(points: number[][], k: number, iterations = 12) {
  if (points.length === 0) {
    return { centroids: [] as number[][], assignments: [] as number[] };
  }

  const centroids: number[][] = [points[0].slice()];
  while (centroids.length < k) {
    let bestPoint = points[0];
    let bestDistance = -1;
    for (const point of points) {
      const distance = Math.min(...centroids.map((centroid) => euclideanDistance(point, centroid)));
      if (distance > bestDistance) {
        bestDistance = distance;
        bestPoint = point;
      }
    }
    centroids.push(bestPoint.slice());
  }

  let assignments = new Array(points.length).fill(0);
  for (let iteration = 0; iteration < iterations; iteration++) {
    assignments = points.map((point) => argMin(centroids.map((centroid) => euclideanDistance(point, centroid))));

    for (let centroidIndex = 0; centroidIndex < centroids.length; centroidIndex++) {
      const clusterPoints = points.filter((_, pointIndex) => assignments[pointIndex] === centroidIndex);
      if (clusterPoints.length === 0) continue;
      const dimensions = clusterPoints[0].length;
      const nextCentroid = new Array(dimensions).fill(0);
      for (const point of clusterPoints) {
        for (let dimension = 0; dimension < dimensions; dimension++) {
          nextCentroid[dimension] += point[dimension];
        }
      }
      for (let dimension = 0; dimension < dimensions; dimension++) {
        nextCentroid[dimension] /= clusterPoints.length;
      }
      centroids[centroidIndex] = nextCentroid;
    }
  }

  return { centroids, assignments };
}

export function generateKMeansSmote(
  rows: Array<Record<string, number | string | boolean>>,
  labelKey: string,
  options: { minorityLabel?: string | number; clusterCount?: number; targetMinorityCount?: number } = {},
): KMeansSmoteResult {
  if (rows.length === 0) {
    return {
      modelVersion: 'kmeanssmote-v1',
      minorityLabel: options.minorityLabel ?? 1,
      clusterCount: 0,
      syntheticRows: [],
      resampledRows: [],
      classBalanceBefore: {},
      classBalanceAfter: {},
      syntheticLineage: [],
    };
  }

  const featureNames = Object.keys(rows[0] ?? {}).filter((key) => key !== labelKey);
  const labelCounts = new Map<string, number>();
  for (const row of rows) {
    const label = String(row[labelKey] ?? '');
    labelCounts.set(label, (labelCounts.get(label) ?? 0) + 1);
  }

  const minorityLabel = options.minorityLabel ?? Array.from(labelCounts.entries()).sort((left, right) => left[1] - right[1])[0]?.[0] ?? 1;
  const minorityRows = rows.filter((row) => row[labelKey] === minorityLabel);
  const majorityRows = rows.filter((row) => row[labelKey] !== minorityLabel);
  const minorityVectors = minorityRows.map((row) => featureNames.map((feature) => Number(row[feature] ?? 0)));
  const majorityCount = majorityRows.length;
  const targetMinorityCount = options.targetMinorityCount ?? Math.max(majorityCount * DEFAULT_MINORITY_TARGET_RATIO, minorityRows.length);
  const syntheticNeeded = Math.max(0, Math.round(targetMinorityCount - minorityRows.length));
  const clusterCount = Math.max(1, Math.min(options.clusterCount ?? Math.round(Math.sqrt(Math.max(1, minorityRows.length))), minorityRows.length || 1));

  if (syntheticNeeded === 0 || minorityRows.length < 2) {
    return {
      modelVersion: 'kmeanssmote-v1',
      minorityLabel,
      clusterCount,
      syntheticRows: [],
      resampledRows: [...rows],
      classBalanceBefore: Object.fromEntries(labelCounts.entries()),
      classBalanceAfter: Object.fromEntries(labelCounts.entries()),
      syntheticLineage: clusterCount > 0
        ? Array.from({ length: clusterCount }, (_, clusterIndex) => ({
          clusterIndex,
          syntheticCount: 0,
          sourceCount: minorityRows.filter((_, rowIndex) => rowIndex % clusterCount === clusterIndex).length,
        }))
        : [],
    };
  }

  const { centroids, assignments } = kMeans(minorityVectors, clusterCount);
  const clusterBuckets = centroids.map((_, index) => minorityRows.filter((_, rowIndex) => assignments[rowIndex] === index));
  const clusterWeights = clusterBuckets.map((clusterRows) => {
    if (clusterRows.length === 0) return 0;
    const vectors = clusterRows.map((row) => featureNames.map((feature) => Number(row[feature] ?? 0)));
    const averageSpread = mean(vectors.map((vector) => mean(vectors.map((other) => euclideanDistance(vector, other)))));
    return 1 / (1 + averageSpread);
  });
  const totalWeight = clusterWeights.reduce((sum, value) => sum + value, 0) || 1;
  const clusterQuotas = clusterWeights.map((weight, index) => {
    const sizeFactor = clusterBuckets[index].length / Math.max(1, minorityRows.length);
    return Math.max(0, Math.round(syntheticNeeded * ((weight / totalWeight) + sizeFactor) / 2));
  });

  const syntheticRows: Array<Record<string, number | string | boolean>> = [];
  const syntheticLineage = clusterBuckets.map((clusterRows, clusterIndex) => ({
    clusterIndex,
    syntheticCount: 0,
    sourceCount: clusterRows.length,
  }));
  for (let clusterIndex = 0; clusterIndex < clusterBuckets.length; clusterIndex++) {
    const clusterRows = clusterBuckets[clusterIndex];
    if (clusterRows.length === 0) continue;
    const quota = clusterQuotas[clusterIndex];
    for (let iteration = 0; iteration < quota; iteration++) {
      const base = clusterRows[(clusterIndex + iteration) % clusterRows.length];
      const baseVector = featureNames.map((feature) => Number(base[feature] ?? 0));
      const nearestNeighbor = clusterRows
        .filter((candidate) => candidate !== base)
        .map((candidate) => ({
          row: candidate,
          distance: euclideanDistance(baseVector, featureNames.map((feature) => Number(candidate[feature] ?? 0))),
        }))
        .sort((left, right) => left.distance - right.distance)[0]?.row ?? base;
      const neighborVector = featureNames.map((feature) => Number(nearestNeighbor[feature] ?? 0));
      const alpha = (iteration + 1) / (quota + 1);
      const syntheticRow: Record<string, number | string | boolean> = { [labelKey]: minorityLabel, synthetic: true, cluster_index: clusterIndex };
      featureNames.forEach((feature, featureIndex) => {
        syntheticRow[feature] = round(baseVector[featureIndex] + alpha * (neighborVector[featureIndex] - baseVector[featureIndex]), 6);
      });
      syntheticRows.push(syntheticRow);
      syntheticLineage[clusterIndex].syntheticCount += 1;
    }
  }

  const resampledRows = [...rows, ...syntheticRows] as Array<Record<string, number | string | boolean>>;
  const classBalanceAfter: Record<string, number> = {};
  for (const row of resampledRows) {
    const label = String(row[labelKey] ?? '');
    classBalanceAfter[label] = (classBalanceAfter[label] ?? 0) + 1;
  }

  return {
    modelVersion: 'kmeanssmote-v1',
    minorityLabel,
    clusterCount,
    syntheticRows,
    resampledRows,
    classBalanceBefore: Object.fromEntries(labelCounts.entries()),
    classBalanceAfter,
    syntheticLineage,
  };
}

export interface RareEventBacktestResult {
  modelVersion: string;
  minorityLabel: string | number;
  featureNames: string[];
  syntheticLineage: Array<{ clusterIndex: number; syntheticCount: number; sourceCount: number }>;
  before: {
    accuracy: number;
    precision: number;
    recall: number;
    f1: number;
  };
  after: {
    accuracy: number;
    precision: number;
    recall: number;
    f1: number;
  };
  recallUplift: number;
  precisionUplift: number;
  sourceProfile: 'synthetic' | 'mixed' | 'real';
  warnings: string[];
  methodology: string;
}

export function backtestRareEventResampling(
  rows: Array<Record<string, number | string | boolean>>,
  labelKey: string,
  options: { minorityLabel?: string | number; clusterCount?: number; targetMinorityCount?: number } = {},
): RareEventBacktestResult {
  const cleanedRows = rows.filter((row) => Object.values(row).every((value) => Number.isFinite(Number(value)) || typeof value === 'string' || typeof value === 'boolean'));
  const numericRows = cleanedRows.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, Number(value)])) as NumericRecord);
  const featureNames = Object.keys(numericRows[0] ?? {}).filter((key) => key !== labelKey);
  const smote = generateKMeansSmote(cleanedRows, labelKey, options);
  const labelValue = smote.minorityLabel;
  const labels = numericRows.map((row) => (String(row[labelKey]) === String(labelValue) ? 1 : -1));
  const resampledNumericRows = smote.resampledRows.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, Number(value)])) as NumericRecord);
  const resampledLabels = resampledNumericRows.map((row) => (String(row[labelKey]) === String(labelValue) ? 1 : -1));

  const evaluate = (trainedRows: NumericRecord[], trainedLabels: number[]) => {
    const model = trainLinearMarginModel(trainedRows, trainedLabels, featureNames, { learningRate: 0.02, epochs: 100, regularization: 0.01 });
    let truePositive = 0;
    let falsePositive = 0;
    let falseNegative = 0;
    let trueNegative = 0;
    for (let index = 0; index < numericRows.length; index++) {
      const score = scoreLinearMarginModel(model, numericRows[index], featureNames);
      const predicted = score >= 0 ? 1 : -1;
      const actual = labels[index];
      if (predicted === 1 && actual === 1) truePositive += 1;
      else if (predicted === 1 && actual === -1) falsePositive += 1;
      else if (predicted === -1 && actual === 1) falseNegative += 1;
      else trueNegative += 1;
    }
    const precision = truePositive / Math.max(1, truePositive + falsePositive);
    const recall = truePositive / Math.max(1, truePositive + falseNegative);
    const accuracy = (truePositive + trueNegative) / Math.max(1, numericRows.length);
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
    return { precision, recall, accuracy, f1 };
  };

  const before = evaluate(numericRows, labels);
  const after = evaluate(resampledNumericRows, resampledLabels);
  const warnings = [
    smote.syntheticRows.length > 0 ? 'Synthetic minority rows are training-only and must not surface in operational UI.' : null,
    after.recall < before.recall ? 'SMOTE did not improve minority recall in this slice; inspect cluster balance and feature quality.' : null,
  ].filter((warning): warning is string => Boolean(warning));

  return {
    modelVersion: 'kmeanssmote-backtest-v1',
    minorityLabel: labelValue,
    featureNames,
    syntheticLineage: smote.syntheticLineage,
    before: {
      accuracy: round(before.accuracy, 4),
      precision: round(before.precision, 4),
      recall: round(before.recall, 4),
      f1: round(before.f1, 4),
    },
    after: {
      accuracy: round(after.accuracy, 4),
      precision: round(after.precision, 4),
      recall: round(after.recall, 4),
      f1: round(after.f1, 4),
    },
    recallUplift: round(after.recall - before.recall, 4),
    precisionUplift: round(after.precision - before.precision, 4),
    sourceProfile: smote.syntheticRows.length > 0 ? 'mixed' : 'real',
    warnings,
    methodology: 'KMeans-SMOTE training-only resampling with deterministic backtest evaluation on the original class-imbalanced slice.',
  };
}

// -----------------------------------------------------------------------------
// Random forest price spike model
// -----------------------------------------------------------------------------

export interface PriceSpikeForestResult {
  modelVersion: string;
  province: string;
  spikeThresholdCadPerMwh: number;
  riskScore: number;
  probabilities: number[];
  voteShare: number;
  reasons: string[];
  featureImportance: Record<string, number>;
  methodology: string;
}

type SpikeTrainingRow = {
  poolPriceCadPerMwh: number;
  demandMw: number;
  reserveMarginPercent: number;
  windGenerationMw: number;
  temperatureC: number;
  spike: number;
};

function buildSyntheticSpikeCorpus(): SpikeTrainingRow[] {
  const archetypes: Array<Omit<SpikeTrainingRow, 'spike'>> = [
    { poolPriceCadPerMwh: 120, demandMw: 8000, reserveMarginPercent: 18, windGenerationMw: 950, temperatureC: 2 },
    { poolPriceCadPerMwh: 240, demandMw: 9800, reserveMarginPercent: 12, windGenerationMw: 700, temperatureC: 18 },
    { poolPriceCadPerMwh: 390, demandMw: 10800, reserveMarginPercent: 8, windGenerationMw: 450, temperatureC: -12 },
    { poolPriceCadPerMwh: 710, demandMw: 11200, reserveMarginPercent: 4, windGenerationMw: 220, temperatureC: -26 },
    { poolPriceCadPerMwh: 860, demandMw: 11800, reserveMarginPercent: 3, windGenerationMw: 120, temperatureC: 34 },
    { poolPriceCadPerMwh: 980, demandMw: 12100, reserveMarginPercent: 1, windGenerationMw: 60, temperatureC: 36 },
  ];

  const corpus: SpikeTrainingRow[] = [];
  for (const archetype of archetypes) {
    for (let i = 0; i < 10; i++) {
      const jitter = (scale: number) => (Math.random() - 0.5) * scale;
      const row = {
        poolPriceCadPerMwh: round(archetype.poolPriceCadPerMwh + jitter(80), 4),
        demandMw: round(archetype.demandMw + jitter(600), 4),
        reserveMarginPercent: round(archetype.reserveMarginPercent + jitter(4), 4),
        windGenerationMw: round(Math.max(0, archetype.windGenerationMw + jitter(240)), 4),
        temperatureC: round(archetype.temperatureC + jitter(8), 4),
      };
      const spike =
        row.poolPriceCadPerMwh >= 700 ||
        row.reserveMarginPercent <= 5 ||
        (row.demandMw >= 11000 && row.windGenerationMw <= 250) ||
        row.temperatureC <= -25 ||
        row.temperatureC >= 30
          ? 1
          : 0;
      corpus.push({ ...row, spike });
    }
  }

  return corpus;
}

function trainDecisionStump(rows: SpikeTrainingRow[], featureNames: Array<keyof SpikeTrainingRow>) {
  const labels = rows.map((row) => row.spike);
  const baseImpurity = gini(labels);
  let best = {
    feature: featureNames[0],
    threshold: rows[0]?.[featureNames[0]] ?? 0,
    gain: -Infinity,
    leftLabel: majorityLabel(labels),
    rightLabel: majorityLabel(labels),
  };

  for (const feature of featureNames) {
    const values = [...new Set(rows.map((row) => Number(row[feature])))]
      .sort((left, right) => left - right);
    if (values.length < 2) continue;

    for (let i = 0; i < values.length - 1; i++) {
      const threshold = (values[i] + values[i + 1]) / 2;
      const leftRows = rows.filter((row) => Number(row[feature]) <= threshold);
      const rightRows = rows.filter((row) => Number(row[feature]) > threshold);
      if (leftRows.length === 0 || rightRows.length === 0) continue;

      const weightedImpurity =
        (leftRows.length / rows.length) * gini(leftRows.map((row) => row.spike))
        + (rightRows.length / rows.length) * gini(rightRows.map((row) => row.spike));
      const gain = baseImpurity - weightedImpurity;

      if (gain > best.gain) {
        best = {
          feature,
          threshold,
          gain,
          leftLabel: majorityLabel(leftRows.map((row) => row.spike)),
          rightLabel: majorityLabel(rightRows.map((row) => row.spike)),
        };
      }
    }
  }

  return best;
}

export function forecastPriceSpikeRiskForest(input: {
  province: string;
  poolPriceCadPerMwh: number;
  demandMw: number;
  reserveMarginPercent: number;
  windGenerationMw: number;
  temperatureC: number;
  trainingRows?: SpikeTrainingRow[];
  treeCount?: number;
}): PriceSpikeForestResult {
  const trainingRows = input.trainingRows?.length ? input.trainingRows : buildSyntheticSpikeCorpus();
  const treeCount = Math.max(9, input.treeCount ?? 27);
  const featureNames: Array<keyof SpikeTrainingRow> = [
    'poolPriceCadPerMwh',
    'demandMw',
    'reserveMarginPercent',
    'windGenerationMw',
    'temperatureC',
  ];

  const trees = Array.from({ length: treeCount }, () => {
    const bootstrap = sampleWithReplacement(trainingRows, trainingRows.length);
    const candidateFeatures = [...featureNames].sort(() => Math.random() - 0.5).slice(0, Math.max(2, Math.round(Math.sqrt(featureNames.length))));
    return trainDecisionStump(bootstrap, candidateFeatures);
  });

  const inputVector: SpikeTrainingRow = {
    province: undefined as never,
    poolPriceCadPerMwh: input.poolPriceCadPerMwh,
    demandMw: input.demandMw,
    reserveMarginPercent: input.reserveMarginPercent,
    windGenerationMw: input.windGenerationMw,
    temperatureC: input.temperatureC,
    spike: 0,
  } as SpikeTrainingRow;

  const votes = trees.map((tree) => {
    const value = Number(inputVector[tree.feature]);
    return value <= tree.threshold ? tree.leftLabel : tree.rightLabel;
  });
  const spikeVotes = votes.filter((vote) => vote === 1).length;
  const probability = spikeVotes / trees.length;

  const featureImportance = featureNames.reduce((acc, feature) => {
    acc[String(feature)] = round(
      trees.filter((tree) => tree.feature === feature).reduce((sum, tree) => sum + Math.max(0, tree.gain), 0) / trees.length,
      6,
    );
    return acc;
  }, {} as Record<string, number>);

  const reasons = Object.entries(featureImportance)
    .sort((left, right) => right[1] - left[1])
    .filter(([, value]) => value > 0)
    .slice(0, 3)
    .map(([feature]) => {
      switch (feature) {
        case 'poolPriceCadPerMwh':
          return input.poolPriceCadPerMwh >= 700 ? 'current_pool_price_elevated' : 'pool_price_pressure';
        case 'reserveMarginPercent':
          return input.reserveMarginPercent <= 5 ? 'reserve_margin_tight' : 'reserve_margin_soft';
        case 'demandMw':
          return input.demandMw >= 11000 ? 'demand_near_peak' : 'demand_moderate';
        case 'windGenerationMw':
          return input.windGenerationMw <= 250 ? 'low_wind_generation' : 'healthy_wind_generation';
        case 'temperatureC':
          return input.temperatureC <= -25 || input.temperatureC >= 30 ? 'extreme_temperature' : 'temperature_normal';
        default:
          return feature;
      }
    });

  return {
    modelVersion: 'random-forest-price-spike-v1',
    province: input.province,
    spikeThresholdCadPerMwh: 1000,
    riskScore: round(clamp(probability), 4),
    probabilities: votes.map((vote) => vote === 1 ? 1 : 0),
    voteShare: round(probability, 4),
    reasons,
    featureImportance,
    methodology: 'Bagged decision-tree ensemble calibrated on canonical Alberta market scenarios.',
  };
}

// -----------------------------------------------------------------------------
// Security constrained dispatch / SCED
// -----------------------------------------------------------------------------

export interface ScedDispatchResult {
  modelVersion: string;
  region: string;
  systemStatus: 'stable' | 'stressed' | 'critical';
  riskScore: number;
  bindingConstraint: string;
  reserveShortfallMw: number;
  overloadedEdges: Array<{ fromNodeId: string; toNodeId: string; limitMw: number; currentMw: number }>;
  offlineCapacityMw: number;
  recommendationResults: Array<{
    id: string;
    accepted: boolean;
    violations: string[];
  }>;
  feasibleRecommendation: string | null;
  methodology: string;
}

export function evaluateSecurityConstrainedDispatch(input: {
  region: string;
  reserveMarginPercent: number;
  frequencyHz: number;
  loadMw?: number;
  availableGenerationMw?: number;
  minimumReserveMarginPercent?: number;
  recommendations: Array<{ id: string; action: string; magnitudeMw: number; maxCapacityMw: number; rampLimitMwPerHour: number }>;
  topology: {
    nodes: Array<{ id: string; status: string; capacityMw: number }>;
    edges: Array<{ fromNodeId: string; toNodeId: string; limitMw: number; currentMw: number }>;
  };
}): ScedDispatchResult {
  const minimumReserveMarginPercent = input.minimumReserveMarginPercent ?? 5;
  const availableGenerationMw = Math.max(0, input.availableGenerationMw ?? 0);
  const reserveShortfallMw = Math.max(0, ((minimumReserveMarginPercent - input.reserveMarginPercent) / 100) * Math.max(1, input.loadMw ?? availableGenerationMw));
  const overloadedEdges = input.topology.edges.filter((edge) => edge.limitMw > 0 && Math.abs(edge.currentMw) / edge.limitMw >= 0.9);
  const offlineCapacityMw = input.topology.nodes
    .filter((node) => node.status !== 'online')
    .reduce((sum, node) => sum + Math.max(0, node.capacityMw), 0);

  const recommendationResults = input.recommendations.map((recommendation) => {
    const violations: string[] = [];
    if (recommendation.magnitudeMw > recommendation.maxCapacityMw) violations.push('capacity_limit_exceeded');
    if (recommendation.magnitudeMw > recommendation.rampLimitMwPerHour) violations.push('ramp_limit_exceeded');
    if (input.reserveMarginPercent < minimumReserveMarginPercent && recommendation.action !== 'hold') violations.push('reserve_margin_critical');
    if (overloadedEdges.length > 0 && recommendation.action === 'increase_transfer') violations.push('transmission_limit_exceeded');
    return {
      id: recommendation.id,
      accepted: violations.length === 0,
      violations,
    };
  });

  const bindingScores = [
    { key: 'reserve_margin', score: clamp(reserveShortfallMw / Math.max(1, input.loadMw ?? 1)) },
    { key: 'frequency', score: clamp(Math.abs(input.frequencyHz - 60) / 0.5) },
    { key: 'transmission', score: clamp(overloadedEdges.length / Math.max(1, input.topology.edges.length || 1)) },
    { key: 'offline_capacity', score: clamp(offlineCapacityMw / Math.max(1, availableGenerationMw || offlineCapacityMw || 1)) },
    { key: 'dispatch_violation', score: clamp(recommendationResults.some((item) => !item.accepted) ? 1 : 0) },
  ];

  const bindingConstraint = bindingScores[argMax(bindingScores.map((entry) => entry.score))]?.key ?? 'reserve_margin';
  const riskScore = clamp(
    bindingScores.reduce((sum, entry) => sum + entry.score, 0) / bindingScores.length
    + (recommendationResults.some((item) => !item.accepted) ? 0.15 : 0),
  );
  const feasibleRecommendation = recommendationResults.find((item) => item.accepted)?.id ?? null;

  return {
    modelVersion: 'sced-v1',
    region: input.region,
    systemStatus: riskScore >= 0.7 ? 'critical' : riskScore >= 0.45 ? 'stressed' : 'stable',
    riskScore: round(riskScore, 4),
    bindingConstraint,
    reserveShortfallMw: round(reserveShortfallMw, 4),
    overloadedEdges,
    offlineCapacityMw: round(offlineCapacityMw, 4),
    recommendationResults,
    feasibleRecommendation,
    methodology: 'Security-constrained dispatch screening with binding-constraint detection and infeasible-action rejection.',
  };
}

// -----------------------------------------------------------------------------
// Physics informed dispatch surrogate
// -----------------------------------------------------------------------------

export interface PhysicsDispatchResult {
  modelVersion: string;
  predictedDispatchMw: number;
  physicsLoss: number;
  dataLoss: number;
  constraintViolations: string[];
  confidenceScore: number;
  featureContributions: Record<string, number>;
  methodology: string;
}

export function evaluatePhysicsInformedDispatch(input: {
  loadMw: number;
  temperatureC: number;
  windGenerationMw: number;
  solarGenerationMw: number;
  reserveMarginPercent: number;
  rampLimitMwPerHour: number;
  availableGenerationMw?: number;
  previousDispatchMw?: number;
  hourOfDay?: number;
}): PhysicsDispatchResult {
  const hour = input.hourOfDay ?? new Date().getHours();
  const hourSin = Math.sin((hour / 24) * Math.PI * 2);
  const hourCos = Math.cos((hour / 24) * Math.PI * 2);

  const baselineLoad = input.loadMw
    + (20 - input.temperatureC) * 38
    - input.windGenerationMw * 0.09
    - input.solarGenerationMw * 0.13
    + (10 - input.reserveMarginPercent) * 14
    + hourSin * 90
    + hourCos * 40;

  const availableGenerationMw = input.availableGenerationMw ?? input.loadMw * 1.15;
  const reserveHeadroomMw = Math.max(0, availableGenerationMw * (input.reserveMarginPercent / 100));
  const feasibleUpperBound = Math.max(0, availableGenerationMw - reserveHeadroomMw);
  const predictedDispatchMw = Math.max(0, Math.min(feasibleUpperBound, baselineLoad));

  const rampViolation = input.previousDispatchMw != null
    ? Math.max(0, Math.abs(predictedDispatchMw - input.previousDispatchMw) - input.rampLimitMwPerHour)
    : 0;
  const capacityViolation = Math.max(0, predictedDispatchMw - feasibleUpperBound);
  const reserveViolation = Math.max(0, input.loadMw - feasibleUpperBound);

  const physicsLoss = round((capacityViolation ** 2 + reserveViolation ** 2 + rampViolation ** 2) / Math.max(1, feasibleUpperBound), 6);
  const dataLoss = round(((predictedDispatchMw - input.loadMw) ** 2) / Math.max(1, input.loadMw), 6);
  const constraintViolations = [
    capacityViolation > 0 ? 'capacity_limit' : null,
    reserveViolation > 0 ? 'reserve_margin' : null,
    rampViolation > 0 ? 'ramp_limit' : null,
  ].filter((value): value is string => Boolean(value));

  const confidenceScore = clamp(1 - Math.min(1, physicsLoss + dataLoss / Math.max(1, input.loadMw)));

  return {
    modelVersion: 'pinn-surrogate-v1',
    predictedDispatchMw: round(predictedDispatchMw, 4),
    physicsLoss,
    dataLoss,
    constraintViolations,
    confidenceScore: round(confidenceScore, 4),
    featureContributions: {
      load: round(input.loadMw, 4),
      temperature: round((20 - input.temperatureC) * 38, 4),
      wind: round(-input.windGenerationMw * 0.09, 4),
      solar: round(-input.solarGenerationMw * 0.13, 4),
      reserve: round((10 - input.reserveMarginPercent) * 14, 4),
      hourSin: round(hourSin * 90, 4),
      hourCos: round(hourCos * 40, 4),
    },
    methodology: 'Physics-informed dispatch surrogate with power-balance, reserve, and ramp penalties.',
  };
}

// -----------------------------------------------------------------------------
// PV fault localization via graph message passing
// -----------------------------------------------------------------------------

export interface PvFaultResult {
  modelVersion: string;
  topSuspects: Array<{ nodeId: string; riskScore: number; reason: string }>;
  topEdges: Array<{ fromNodeId: string; toNodeId: string; riskScore: number }>;
  faultClass: string;
  confidenceScore: number;
  methodology: string;
}

export function analyzePvFaultGraph(input: {
  nodes: Array<{
    id: string;
    expectedOutputMw: number;
    observedOutputMw: number;
    voltageV: number;
    inverterTempC: number;
    irradiance?: number;
    offline?: boolean;
  }>;
  edges: Array<{ fromNodeId: string; toNodeId: string; weight?: number }>;
  iterations?: number;
}): PvFaultResult {
  const iterations = Math.max(1, input.iterations ?? 4);
  const nodeMap = new Map<string, number>();
  const localEvidence = new Map<string, number>();

  for (const node of input.nodes) {
    const outputDelta = Math.abs(node.expectedOutputMw - node.observedOutputMw) / Math.max(1, node.expectedOutputMw);
    const voltagePenalty = Math.max(0, Math.abs(node.voltageV - 600) / 600);
    const thermalPenalty = Math.max(0, (node.inverterTempC - 45) / 55);
    const irradiancePenalty = node.irradiance != null && node.irradiance > 0
      ? Math.max(0, (node.expectedOutputMw - node.observedOutputMw) / Math.max(1, node.expectedOutputMw))
      : 0;
    const offlinePenalty = node.offline ? 1 : 0;
    const evidence = clamp(outputDelta * 0.45 + voltagePenalty * 0.2 + thermalPenalty * 0.2 + irradiancePenalty * 0.1 + offlinePenalty * 0.6);
    nodeMap.set(node.id, evidence);
    localEvidence.set(node.id, evidence);
  }

  const adjacency = new Map<string, Array<{ neighborId: string; weight: number }>>();
  for (const edge of input.edges) {
    const weight = edge.weight ?? 1;
    if (!adjacency.has(edge.fromNodeId)) adjacency.set(edge.fromNodeId, []);
    if (!adjacency.has(edge.toNodeId)) adjacency.set(edge.toNodeId, []);
    adjacency.get(edge.fromNodeId)!.push({ neighborId: edge.toNodeId, weight });
    adjacency.get(edge.toNodeId)!.push({ neighborId: edge.fromNodeId, weight });
  }

  for (let iteration = 0; iteration < iterations; iteration++) {
    const nextScores = new Map<string, number>();
    for (const node of input.nodes) {
      const neighbors = adjacency.get(node.id) ?? [];
      const neighborSignal = neighbors.length === 0
        ? 0
        : neighbors.reduce((sum, entry) => sum + (nodeMap.get(entry.neighborId) ?? 0) * entry.weight, 0) / neighbors.reduce((sum, entry) => sum + entry.weight, 0);
      const current = nodeMap.get(node.id) ?? 0;
      nextScores.set(node.id, clamp(current * 0.7 + neighborSignal * 0.3));
    }
    for (const [id, score] of nextScores.entries()) nodeMap.set(id, score);
  }

  const topSuspects = [...nodeMap.entries()]
    .map(([nodeId, riskScore]) => ({
      nodeId,
      riskScore: round(riskScore, 4),
      reason:
        (localEvidence.get(nodeId) ?? 0) >= 0.8 ? 'strong_local_anomaly'
        : (localEvidence.get(nodeId) ?? 0) >= 0.5 ? 'graph_propagated_anomaly'
        : 'background_signal',
    }))
    .sort((left, right) => right.riskScore - left.riskScore)
    .slice(0, 5);

  const topEdges = input.edges
    .map((edge) => {
      const left = nodeMap.get(edge.fromNodeId) ?? 0;
      const right = nodeMap.get(edge.toNodeId) ?? 0;
      return {
        fromNodeId: edge.fromNodeId,
        toNodeId: edge.toNodeId,
        riskScore: round(((left + right) / 2) * (edge.weight ?? 1), 4),
      };
    })
    .sort((left, right) => right.riskScore - left.riskScore)
    .slice(0, 5);

  const confidenceScore = clamp(topSuspects[0]?.riskScore ?? 0);
  const faultClass = topSuspects[0]?.riskScore >= 0.75
    ? 'localized_pv_fault'
    : topSuspects[0]?.riskScore >= 0.45
      ? 'regional_derating'
      : 'healthy_cluster';

  return {
    modelVersion: 'pv-gnn-v1',
    topSuspects,
    topEdges,
    faultClass,
    confidenceScore: round(confidenceScore, 4),
    methodology: 'Graph message-passing localization over inverter, voltage, and output deviations.',
  };
}

// -----------------------------------------------------------------------------
// BYOP multi-agent simulation
// -----------------------------------------------------------------------------

export interface ByopMultiAgentResult {
  modelVersion: string;
  peakImportMw: number;
  gridReductionMw: number;
  aggregateLoadSeries: Array<{ hour: number; facilityLoadMw: number; netImportMw: number; storageSocPct: number }>;
  agentSummary: {
    facility: { baselineLoadMw: number; flexibilityPct: number };
    storage: { capacityMwh: number; powerMw: number };
    onsiteGeneration: { ratedMw: number };
    utility: { importCapMw: number; priceSignalCadPerMwh: number };
  };
  policySensitivity: number;
  methodology: string;
}

export function simulateByopMultiAgent(input: {
  baseLoadMw: number;
  flexibilityPct: number;
  onSiteGenerationMw: number;
  storageCapacityMwh: number;
  storagePowerMw: number;
  utilityImportCapMw: number;
  priceSignalCadPerMwh: number;
  hours?: number;
}): ByopMultiAgentResult {
  const hours = Math.max(1, input.hours ?? 24);
  const storageCapacityMwh = Math.max(0.01, input.storageCapacityMwh);
  let storageSocMwh = storageCapacityMwh * 0.45;
  const aggregateLoadSeries: Array<{ hour: number; facilityLoadMw: number; netImportMw: number; storageSocPct: number }> = [];
  let peakImportMw = 0;
  let gridReductionMw = 0;

  for (let hour = 0; hour < hours; hour++) {
    const dailyCurve = 1 + 0.12 * Math.sin((hour / 24) * Math.PI * 2 - Math.PI / 3);
    const priceSensitiveShift = clamp(input.flexibilityPct / 100) * (input.priceSignalCadPerMwh / 250);
    const facilityLoadMw = Math.max(0, input.baseLoadMw * dailyCurve * (1 - priceSensitiveShift * (hour >= 16 && hour <= 21 ? 0.18 : 0.05)));
    const onsiteGenerationMw = Math.max(0, input.onSiteGenerationMw * Math.max(0.25, 0.75 + 0.25 * Math.sin((hour / 24) * Math.PI * 2 - Math.PI / 2)));
    const dispatchWindow = input.priceSignalCadPerMwh >= 120 && (hour >= 16 && hour <= 21) ? 1 : input.priceSignalCadPerMwh <= 60 && (hour >= 0 && hour <= 6) ? -1 : 0;
    const storageDispatchMw = Math.max(
      -input.storagePowerMw,
      Math.min(
        input.storagePowerMw,
        dispatchWindow === 1
          ? Math.min(input.storagePowerMw, storageSocMwh)
          : dispatchWindow === -1
            ? -Math.min(input.storagePowerMw, storageCapacityMwh - storageSocMwh)
            : 0,
      ),
    );
    storageSocMwh = Math.max(0, Math.min(storageCapacityMwh, storageSocMwh - storageDispatchMw));
    const netImportMw = Math.max(0, facilityLoadMw - onsiteGenerationMw - storageDispatchMw);
    const cappedImportMw = Math.min(netImportMw, input.utilityImportCapMw);
    const curtailedMw = Math.max(0, netImportMw - cappedImportMw);

    peakImportMw = Math.max(peakImportMw, cappedImportMw);
    gridReductionMw = Math.max(gridReductionMw, facilityLoadMw - cappedImportMw);

    aggregateLoadSeries.push({
      hour,
      facilityLoadMw: round(facilityLoadMw, 4),
      netImportMw: round(cappedImportMw, 4),
      storageSocPct: round((storageSocMwh / storageCapacityMwh) * 100, 4),
    });

    if (curtailedMw > 0) {
      peakImportMw = Math.max(peakImportMw, cappedImportMw);
    }
  }

  const policySensitivity = clamp(
    (input.flexibilityPct / 100) * 0.4
    + Math.min(1, input.storageCapacityMwh / Math.max(1, input.baseLoadMw * 4)) * 0.3
    + Math.min(1, input.onSiteGenerationMw / Math.max(1, input.baseLoadMw)) * 0.3,
  );

  return {
    modelVersion: 'byop-mas-v1',
    peakImportMw: round(peakImportMw, 4),
    gridReductionMw: round(gridReductionMw, 4),
    aggregateLoadSeries,
    agentSummary: {
      facility: { baselineLoadMw: round(input.baseLoadMw, 4), flexibilityPct: round(input.flexibilityPct, 2) },
      storage: { capacityMwh: round(storageCapacityMwh, 4), powerMw: round(input.storagePowerMw, 4) },
      onsiteGeneration: { ratedMw: round(input.onSiteGenerationMw, 4) },
      utility: { importCapMw: round(input.utilityImportCapMw, 4), priceSignalCadPerMwh: round(input.priceSignalCadPerMwh, 4) },
    },
    policySensitivity: round(policySensitivity, 4),
    methodology: 'Multi-agent BYOP simulation with facility, storage, onsite generation, and utility policy interactions.',
  };
}

// -----------------------------------------------------------------------------
// Gas basis spread forecasting
// -----------------------------------------------------------------------------

export interface GasBasisForecastResult {
  modelVersion: string;
  predictedSpreadCadPerGj: number;
  wideningRisk: number;
  selectedFeatures: string[];
  featureWeights: Record<string, number>;
  drivers: string[];
  backtest: {
    sampleCount: number;
    maeCadPerGj: number;
    rmseCadPerGj: number;
    directionalAccuracy: number;
    residualBiasCadPerGj: number;
    sourceProfile: 'synthetic' | 'mixed' | 'real';
  };
  sourceProfile: 'synthetic' | 'mixed' | 'real';
  methodology: string;
}

type GasBasisTrainingRow = {
  aecoCadPerGj: number;
  henryHubCadPerGj: number;
  pipelineCurtailmentPct: number;
  storageDeficitPct: number;
  temperatureC: number;
  basisLag1: number;
  basisLag7: number;
  spreadCadPerGj: number;
};

function buildSyntheticGasBasisCorpus(): GasBasisTrainingRow[] {
  const rows: GasBasisTrainingRow[] = [];
  const archetypes = [
    { aecoCadPerGj: 1.85, henryHubCadPerGj: 3.25, pipelineCurtailmentPct: 1, storageDeficitPct: 2, temperatureC: 2, basisLag1: 1.35, basisLag7: 1.25, spreadCadPerGj: 1.35 },
    { aecoCadPerGj: 2.05, henryHubCadPerGj: 3.35, pipelineCurtailmentPct: 4, storageDeficitPct: 8, temperatureC: -10, basisLag1: 1.3, basisLag7: 1.28, spreadCadPerGj: 1.45 },
    { aecoCadPerGj: 1.55, henryHubCadPerGj: 3.05, pipelineCurtailmentPct: 9, storageDeficitPct: 14, temperatureC: -24, basisLag1: 1.6, basisLag7: 1.75, spreadCadPerGj: 1.85 },
    { aecoCadPerGj: 1.25, henryHubCadPerGj: 2.95, pipelineCurtailmentPct: 12, storageDeficitPct: 18, temperatureC: -31, basisLag1: 1.7, basisLag7: 1.9, spreadCadPerGj: 2.05 },
  ];

  for (const archetype of archetypes) {
    for (let i = 0; i < 12; i++) {
      const jitter = (scale: number) => (Math.random() - 0.5) * scale;
      const row = {
        aecoCadPerGj: round(archetype.aecoCadPerGj + jitter(0.3), 4),
        henryHubCadPerGj: round(archetype.henryHubCadPerGj + jitter(0.2), 4),
        pipelineCurtailmentPct: round(Math.max(0, archetype.pipelineCurtailmentPct + jitter(3)), 4),
        storageDeficitPct: round(Math.max(0, archetype.storageDeficitPct + jitter(4)), 4),
        temperatureC: round(archetype.temperatureC + jitter(6), 4),
        basisLag1: round(archetype.basisLag1 + jitter(0.15), 4),
        basisLag7: round(archetype.basisLag7 + jitter(0.15), 4),
      };
      const spreadCadPerGj = round(
        (row.henryHubCadPerGj - row.aecoCadPerGj)
        + (row.pipelineCurtailmentPct * 0.015)
        + (row.storageDeficitPct * 0.02)
        + (Math.max(0, -row.temperatureC) * 0.004)
        + (row.basisLag1 * 0.22)
        + (row.basisLag7 * 0.11),
        4,
      );
      rows.push({ ...row, spreadCadPerGj });
    }
  }

  return rows;
}

export function forecastGasBasisSpread(input: {
  aecoCadPerGj: number;
  henryHubCadPerGj: number;
  pipelineCurtailmentPct: number;
  storageDeficitPct: number;
  temperatureC: number;
  basisLag1: number;
  basisLag7: number;
  trainingRows?: GasBasisTrainingRow[];
  backtestRows?: GasBasisTrainingRow[];
  sourceProfile?: 'synthetic' | 'mixed' | 'real';
}): GasBasisForecastResult {
  const trainingRows = input.trainingRows?.length ? input.trainingRows : buildSyntheticGasBasisCorpus();
  const backtestRows = input.backtestRows?.length
    ? input.backtestRows
    : trainingRows.slice(-Math.max(4, Math.min(12, Math.floor(trainingRows.length / 3))));
  const sourceProfile = input.sourceProfile ?? (input.trainingRows?.length ? 'mixed' : 'synthetic');
  const featureNames: Array<keyof GasBasisTrainingRow> = [
    'aecoCadPerGj',
    'henryHubCadPerGj',
    'pipelineCurtailmentPct',
    'storageDeficitPct',
    'temperatureC',
    'basisLag1',
    'basisLag7',
  ];

  const target = trainingRows.map((row) => row.spreadCadPerGj);
  const targetMean = mean(target);
  const centeredTarget = target.map((value) => value - targetMean);

  const weights = featureNames.map((feature) => {
    const values = trainingRows.map((row) => Number(row[feature]));
    const featureMean = mean(values);
    const centeredValues = values.map((value) => value - featureMean);
    const numerator = centeredValues.reduce((sum, value, index) => sum + value * centeredTarget[index], 0);
    const denominator = centeredValues.reduce((sum, value) => sum + value ** 2, 0) || 1;
    return numerator / denominator;
  });

  const featureWeights = featureNames.reduce((acc, feature, index) => {
    acc[feature] = round(Math.abs(weights[index]), 6);
    return acc;
  }, {} as Record<string, number>);

  const selectedFeatures = Object.entries(featureWeights)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 4)
    .map(([feature]) => feature);

  const inputVector = featureNames.map((feature) => Number(input[feature]));
  const predictedSpread = round(targetMean + dot(weights, inputVector), 4);
  const wideningRisk = clamp(
    (input.pipelineCurtailmentPct / 15) * 0.35
    + (input.storageDeficitPct / 20) * 0.25
    + (Math.max(0, -input.temperatureC) / 35) * 0.15
    + (predictedSpread / 3.5) * 0.25,
  );

  const drivers = selectedFeatures.map((feature) => {
    switch (feature) {
      case 'pipelineCurtailmentPct':
        return 'pipeline_curtailment_pressure';
      case 'storageDeficitPct':
        return 'storage_deficit_pressure';
      case 'temperatureC':
        return 'weather_driven_basis_expansion';
      case 'basisLag1':
      case 'basisLag7':
        return 'persistent_basis_momentum';
      case 'aecoCadPerGj':
        return 'aeco_price_floor';
      case 'henryHubCadPerGj':
        return 'henry_hub_reference';
      default:
        return feature;
    }
  });

  const backtestPredictions = backtestRows.map((row) => {
    const vector = featureNames.map((feature) => Number(row[feature]));
    const predicted = round(targetMean + dot(weights, vector), 4);
    return {
      observed: Number(row.spreadCadPerGj),
      predicted,
      residual: round(predicted - Number(row.spreadCadPerGj), 4),
    };
  });
  const backtestResiduals = backtestPredictions.map((point) => point.residual);
  const directionalAccuracy = backtestPredictions.length
    ? backtestPredictions.filter((point) => Math.sign(point.predicted - targetMean) === Math.sign(point.observed - targetMean)).length / backtestPredictions.length
    : 0;

  return {
    modelVersion: 'aeco-henry-basis-v1',
    predictedSpreadCadPerGj: predictedSpread,
    wideningRisk: round(wideningRisk, 4),
    selectedFeatures,
    featureWeights,
    drivers,
    backtest: {
      sampleCount: backtestPredictions.length,
      maeCadPerGj: round(mean(backtestResiduals.map((value) => Math.abs(value))), 4),
      rmseCadPerGj: round(Math.sqrt(mean(backtestResiduals.map((value) => value ** 2))), 4),
      directionalAccuracy: round(directionalAccuracy, 4),
      residualBiasCadPerGj: round(mean(backtestResiduals), 4),
      sourceProfile,
    },
    sourceProfile,
    methodology: 'Linear basis spread forecast with feature selection over AECO, Henry Hub, curtailment, storage, and weather drivers.',
  };
}

// -----------------------------------------------------------------------------
// Policy overlay risk
// -----------------------------------------------------------------------------

export interface PolicyOverlayResult {
  modelVersion: string;
  strandedAssetRiskScore: number;
  dominantDriver: string;
  policyDrivers: Array<{ driver: string; score: number; label: string }>;
  horizonYears: number;
  methodology: string;
}

export function calculatePolicyOverlayRisk(input: {
  assetLifeYears: number;
  emissionsIntensity: number;
  carbonPriceCadPerTonne: number;
  policyDeadlineYear: number;
  currentYear?: number;
  ccusOptionalityScore?: number;
  electrificationReadinessScore?: number;
}): PolicyOverlayResult {
  const currentYear = input.currentYear ?? new Date().getFullYear();
  const horizonYears = Math.max(1, input.assetLifeYears);
  const yearsToDeadline = Math.max(0, input.policyDeadlineYear - currentYear);
  const carbonExposure = clamp(input.emissionsIntensity / 1_000);
  const deadlinePressure = clamp(1 - Math.min(1, yearsToDeadline / Math.max(1, horizonYears)));
  const carbonPressure = clamp((input.carbonPriceCadPerTonne / 150) * carbonExposure);
  const ccusPressure = clamp(1 - clamp(input.ccusOptionalityScore ?? 0.5));
  const electrificationPressure = clamp(1 - clamp(input.electrificationReadinessScore ?? 0.5));

  const drivers = [
    { driver: 'policy_deadline', score: deadlinePressure, label: 'Policy Deadline Proximity' },
    { driver: 'carbon_exposure', score: carbonPressure, label: 'Carbon Price Exposure' },
    { driver: 'ccus_optionalities', score: ccusPressure * 0.75, label: 'CCUS Optionality Gap' },
    { driver: 'electrification_readiness', score: electrificationPressure * 0.65, label: 'Electrification Readiness Gap' },
  ].sort((left, right) => right.score - left.score);

  return {
    modelVersion: 'policy-overlay-v1',
    strandedAssetRiskScore: round(clamp(drivers.reduce((sum, entry) => sum + entry.score, 0) / drivers.length), 4),
    dominantDriver: drivers[0]?.driver ?? 'policy_deadline',
    policyDrivers: drivers,
    horizonYears,
    methodology: 'Policy overlay scoring combining deadline pressure, carbon exposure, CCUS optionality, and electrification readiness.',
  };
}
