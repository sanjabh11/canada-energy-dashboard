export type Activation = 'relu' | 'linear' | 'sigmoid';

export interface MlpLayer {
  weights: number[][];
  bias: number[];
  activation: Activation;
}

export interface SimulatorConfig {
  name: string;
  version: string;
  scenario_count: number;
  topology?: string;
}

export interface ModelManifest {
  model_key: string;
  model_version: string;
  training_data_profile: 'simulator-calibrated';
  training_artifact_sha: string;
  simulator_config: SimulatorConfig;
  trained_at: string;
  seed: number;
  metrics: Record<string, number>;
  warnings?: string[];
}

export interface MlpWeights {
  manifest: ModelManifest;
  feature_means: number[];
  feature_stds: number[];
  layers: MlpLayer[];
  target_mean?: number;
  target_std?: number;
}

export const DISPATCH_INPUT_WIDTH = 7;

export interface GnnWeights {
  manifest: ModelManifest;
  node_projection: MlpLayer;
  edge_weights: number[];
  iterations: number;
  class_thresholds: Record<string, number>;
}

export const PV_NODE_FEATURE_WIDTH = 5;

export const PV_CLASS_LABELS = [
  'healthy_cluster',
  'inverter_trip',
  'soiling_cluster',
  'hot_spot_derating',
  'localized_short_circuit',
] as const;

const PV_CLASS_THRESHOLD_ORDER = [
  'inverter_trip',
  'soiling_cluster',
  'hot_spot_derating',
  'localized_short_circuit',
] as const;

export interface GnnNode {
  id: string;
  features: number[];
}

export interface GnnEdge {
  from: string;
  to: string;
  weight?: number;
}

export interface GnnResult {
  faultClass: string;
  confidenceScore: number;
  nodeScores: Record<string, number>;
  topSuspects: Array<{ nodeId: string; riskScore: number; reason: string }>;
  topEdges: Array<{ from: string; to: string; riskScore: number }>;
  classProbabilities: Record<string, number>;
}

function clamp(value: number, min = 0, max = 1): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function round(value: number, decimals = 6): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function bucketPvRiskScore(score: number): number {
  return Math.round(clamp(score) * 1000);
}

function comparePvSuspects(
  left: { nodeId: string; riskScore: number },
  right: { nodeId: string; riskScore: number },
): number {
  const bucketDelta = bucketPvRiskScore(right.riskScore) - bucketPvRiskScore(left.riskScore);
  if (bucketDelta !== 0) return bucketDelta;
  return left.nodeId.localeCompare(right.nodeId);
}

function comparePvEdges(
  left: { from: string; to: string; riskScore: number },
  right: { from: string; to: string; riskScore: number },
): number {
  const bucketDelta = bucketPvRiskScore(right.riskScore) - bucketPvRiskScore(left.riskScore);
  if (bucketDelta !== 0) return bucketDelta;
  const fromDelta = left.from.localeCompare(right.from);
  if (fromDelta !== 0) return fromDelta;
  return left.to.localeCompare(right.to);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function hasProductionScale(manifest: Pick<ModelManifest, 'simulator_config'>): boolean {
  return Number(manifest.simulator_config?.scenario_count ?? 0) >= 5000;
}

function hasCompatibleMlpArchitecture(
  weights: Pick<MlpWeights, 'feature_means' | 'feature_stds' | 'layers'>,
): boolean {
  if (
    weights.feature_means.length === 0 ||
    weights.feature_means.length !== weights.feature_stds.length
  )
    return false;

  let inputWidth = weights.feature_means.length;
  for (const layer of weights.layers) {
    if (layer.weights.length !== layer.bias.length || layer.weights.length === 0) return false;
    if (!layer.weights.every((row) => row.length === inputWidth)) return false;
    inputWidth = layer.bias.length;
  }

  return true;
}

function hasHealthyDispatchMetrics(manifest: Pick<ModelManifest, 'metrics'>): boolean {
  const metrics = manifest.metrics ?? {};
  const mape = metrics.mape;
  const physicsViolationRate = metrics.physics_violation_rate;
  if (typeof mape === 'number' && mape > 0.05) return false;
  if (typeof physicsViolationRate === 'number' && physicsViolationRate > 0.1) return false;
  return true;
}

function hasHealthyPvMetrics(manifest: Pick<ModelManifest, 'metrics'>): boolean {
  const metrics = manifest.metrics ?? {};
  const f1 = metrics.f1;
  const top3 = metrics.top3_localization_accuracy;
  const validationLoss = metrics.validation_loss;
  if (!isFiniteNumber(f1) || !isFiniteNumber(top3) || !isFiniteNumber(validationLoss)) return false;
  // F1=0.32 is the current heuristic baseline; production artifacts must exceed this.
  // Until STGNN GraphSAGE/GATv2 upgrade (Phase 1.10), PV fault results are advisory only.
  if (f1 < 0.32) return false;
  if (top3 < 0.52) return false;
  if (validationLoss > 0.09) return false;
  return true;
}

function hasOrderedPvThresholds(thresholds: Record<string, number>): boolean {
  const required = ['healthy_cluster', ...PV_CLASS_THRESHOLD_ORDER];
  if (!required.every((key) => Object.prototype.hasOwnProperty.call(thresholds, key))) return false;
  const orderedValues = PV_CLASS_THRESHOLD_ORDER.map((key) => thresholds[key]);
  if (!orderedValues.every(isFiniteNumber)) return false;
  for (let index = 1; index < orderedValues.length; index++) {
    if (orderedValues[index] <= orderedValues[index - 1]) return false;
  }
  return true;
}

export function isPlaceholderVersion(value: string | undefined | null): boolean {
  return String(value ?? '').startsWith('placeholder-');
}

function isDenseLayer(value: unknown): value is MlpLayer {
  if (!value || typeof value !== 'object') return false;
  const layer = value as MlpLayer;
  return (
    Array.isArray(layer.weights) &&
    Array.isArray(layer.bias) &&
    layer.weights.every((row) => Array.isArray(row) && row.every(isFiniteNumber)) &&
    layer.bias.every(isFiniteNumber) &&
    layer.weights.length === layer.bias.length &&
    (layer.activation === 'relu' || layer.activation === 'linear' || layer.activation === 'sigmoid')
  );
}

export function validateMlpWeights(value: unknown): value is MlpWeights {
  if (!value || typeof value !== 'object') return false;
  const weights = value as MlpWeights;
  return (
    Boolean(weights.manifest) &&
    Array.isArray(weights.feature_means) &&
    Array.isArray(weights.feature_stds) &&
    Array.isArray(weights.layers) &&
    weights.layers.length > 0 &&
    weights.feature_means.length === weights.feature_stds.length &&
    weights.feature_means.every(isFiniteNumber) &&
    weights.feature_stds.every((entry) => isFiniteNumber(entry) && Math.abs(entry) > 0) &&
    weights.layers.every(isDenseLayer) &&
    hasCompatibleMlpArchitecture(weights)
  );
}

export function validateGnnWeights(value: unknown): value is GnnWeights {
  if (!value || typeof value !== 'object') return false;
  const weights = value as GnnWeights;
  return (
    Boolean(weights.manifest) &&
    isDenseLayer(weights.node_projection) &&
    Array.isArray(weights.edge_weights) &&
    weights.edge_weights.length > 0 &&
    weights.edge_weights.every(isFiniteNumber) &&
    Number.isInteger(weights.iterations) &&
    weights.iterations > 0 &&
    typeof weights.class_thresholds === 'object' &&
    weights.class_thresholds !== null &&
    Object.values(weights.class_thresholds).every(isFiniteNumber)
  );
}

export function isProductionArtifact(
  manifest: Pick<
    ModelManifest,
    'training_data_profile' | 'training_artifact_sha' | 'simulator_config' | 'warnings' | 'metrics'
  >,
): boolean {
  return (
    manifest.training_data_profile === 'simulator-calibrated' &&
    !isPlaceholderVersion(manifest.training_artifact_sha) &&
    !isPlaceholderVersion(manifest.simulator_config?.version) &&
    hasProductionScale(manifest) &&
    hasHealthyDispatchMetrics(manifest) &&
    !(manifest.warnings ?? []).some((warning) =>
      String(warning).toLowerCase().includes('placeholder'),
    )
  );
}

export function isDispatchProductionArtifact(weights: MlpWeights): boolean {
  return (
    validateMlpWeights(weights) &&
    weights.feature_means.length === DISPATCH_INPUT_WIDTH &&
    isProductionArtifact(weights.manifest)
  );
}

export function isPvFaultProductionArtifact(weights: GnnWeights): boolean {
  return (
    validateGnnWeights(weights) &&
    weights.node_projection.weights[0]?.length === PV_NODE_FEATURE_WIDTH &&
    isProductionArtifact(weights.manifest) &&
    hasHealthyPvMetrics(weights.manifest) &&
    hasOrderedPvThresholds(weights.class_thresholds)
  );
}

function activate(value: number, activation: Activation): number {
  if (activation === 'relu') return Math.max(0, value);
  if (activation === 'sigmoid') return 1 / (1 + Math.exp(-value));
  return value;
}

function denseForward(weights: MlpLayer, input: number[], decimals = 1): number[] {
  return weights.weights.map((row, rowIndex) => {
    const initial = Math.fround(weights.bias[rowIndex] ?? 0);
    const sum = row.reduce(
      (acc, weight, columnIndex) =>
        Math.fround(acc + Math.fround(Math.fround(weight) * Math.fround(input[columnIndex] ?? 0))),
      initial,
    );
    return round(Math.fround(activate(sum, weights.activation)), decimals);
  });
}

export interface PvFaultNodeInput {
  expectedOutputMw: number;
  observedOutputMw: number;
  voltageV: number;
  inverterTempC: number;
  irradiance?: number;
  offline?: boolean;
}

export function buildPvFaultNodeFeatureVector(node: PvFaultNodeInput): number[] {
  const expected = Math.max(0.001, node.expectedOutputMw);
  const observed = Math.max(0, node.observedOutputMw);
  const outputDeltaRatio = clamp(Math.abs(expected - observed) / expected);
  const voltagePenalty = clamp(Math.abs(node.voltageV - 600) / 600);
  const thermalPenalty = clamp(Math.max(0, (node.inverterTempC - 45) / 55));
  const irradiance =
    typeof node.irradiance === 'number' && Number.isFinite(node.irradiance)
      ? Math.max(0, node.irradiance)
      : expected * 1000;
  const irradianceDeficit = clamp(1 - Math.min(1, irradiance / 1000));
  const offlinePenalty = node.offline ? 1 : 0;

  return [
    round(outputDeltaRatio, 6),
    round(voltagePenalty, 6),
    round(thermalPenalty, 6),
    round(irradianceDeficit, 6),
    round(offlinePenalty, 6),
  ];
}

export function forwardMlp(weights: MlpWeights, features: number[]): number {
  if (!validateMlpWeights(weights)) {
    throw new Error('Invalid MLP weight artifact.');
  }
  if (features.length !== weights.feature_means.length) {
    throw new Error(
      `Expected ${weights.feature_means.length} dispatch features, received ${features.length}.`,
    );
  }

  let vector = features.map((value, index) => {
    const mean = weights.feature_means[index] ?? 0;
    const std = Math.abs(weights.feature_stds[index] ?? 1) || 1;
    return Math.fround((value - mean) / std);
  });

  for (const layer of weights.layers) {
    vector = denseForward(layer, vector);
  }

  const scaled = vector[0] ?? 0;
  const targetStd = Math.abs(weights.target_std ?? 0) || 1;
  const targetMean = weights.target_mean ?? 0;
  return round(scaled * targetStd + targetMean, 1);
}

export function forwardGnn(weights: GnnWeights, nodes: GnnNode[], edges: GnnEdge[]): GnnResult {
  const nodeStates = new Map<string, number>();
  for (const node of nodes) {
    const projected = denseForward(weights.node_projection, node.features, 4);
    const baseScore = projected.length
      ? projected.reduce((sum, value) => sum + value, 0) / projected.length
      : 0;
    nodeStates.set(node.id, clamp(baseScore));
  }

  const adjacency = new Map<string, Array<{ id: string; weight: number }>>();
  for (const edge of edges) {
    const weight = edge.weight ?? weights.edge_weights[0] ?? 1;
    if (!adjacency.has(edge.from)) adjacency.set(edge.from, []);
    if (!adjacency.has(edge.to)) adjacency.set(edge.to, []);
    adjacency.get(edge.from)!.push({ id: edge.to, weight });
    adjacency.get(edge.to)!.push({ id: edge.from, weight });
  }

  for (let iteration = 0; iteration < weights.iterations; iteration++) {
    const blend = weights.edge_weights[iteration % Math.max(1, weights.edge_weights.length)] ?? 1;
    const nextStates = new Map<string, number>();
    for (const node of nodes) {
      const neighbors = adjacency.get(node.id) ?? [];
      const neighborScore =
        neighbors.length === 0
          ? 0
          : neighbors.reduce(
              (sum, neighbor) => sum + (nodeStates.get(neighbor.id) ?? 0) * neighbor.weight,
              0,
            ) / neighbors.reduce((sum, neighbor) => sum + neighbor.weight, 0);
      const current = nodeStates.get(node.id) ?? 0;
      nextStates.set(node.id, clamp(current * (1 - blend * 0.25) + neighborScore * blend * 0.25));
    }
    for (const [id, score] of nextStates.entries()) {
      nodeStates.set(id, score);
    }
  }

  const nodeScores = Object.fromEntries(
    [...nodeStates.entries()].map(([id, score]) => [id, round(score)]),
  );
  const topSuspects = [...nodeStates.entries()]
    .map(([nodeId, score]) => ({
      nodeId,
      riskScore: round(score),
      reason:
        score >= (weights.class_thresholds.localized_short_circuit ?? 0.75)
          ? 'localized_short_circuit'
          : score >= (weights.class_thresholds.hot_spot_derating ?? 0.55)
            ? 'hot_spot_derating'
            : score >= (weights.class_thresholds.soiling_cluster ?? 0.4)
              ? 'soiling_cluster'
              : score >= (weights.class_thresholds.inverter_trip ?? 0.25)
                ? 'inverter_trip'
                : 'background_signal',
    }))
    .sort(comparePvSuspects)
    .slice(0, 5);

  const topEdges = edges
    .map((edge) => {
      const left = nodeStates.get(edge.from) ?? 0;
      const right = nodeStates.get(edge.to) ?? 0;
      return {
        from: edge.from,
        to: edge.to,
        riskScore: round(((left + right) / 2) * (edge.weight ?? weights.edge_weights[0] ?? 1)),
      };
    })
    .sort(comparePvEdges)
    .slice(0, 5);

  const topScore = topSuspects[0]?.riskScore ?? 0;
  const roundedTopScore = round(topScore, 2);
  const faultClass =
    roundedTopScore >= (weights.class_thresholds.localized_short_circuit ?? 0.75)
      ? 'localized_short_circuit'
      : roundedTopScore >= (weights.class_thresholds.hot_spot_derating ?? 0.55)
        ? 'hot_spot_derating'
        : roundedTopScore >= (weights.class_thresholds.soiling_cluster ?? 0.4)
          ? 'soiling_cluster'
          : roundedTopScore >= (weights.class_thresholds.inverter_trip ?? 0.25)
            ? 'inverter_trip'
            : 'healthy_cluster';

  const classProbabilities = Object.fromEntries(
    Object.entries(weights.class_thresholds).map(([label, threshold]) => [
      label,
      round(clamp(topScore / Math.max(0.001, threshold)), 6),
    ]),
  );

  return {
    faultClass,
    confidenceScore: round(clamp(topScore)),
    nodeScores,
    topSuspects,
    topEdges,
    classProbabilities,
  };
}

// ============================================================================
// STGNN GraphSAGE PV Fault Detection
// ============================================================================

export type PvFaultClass =
  | 'healthy'
  | 'soiling'
  | 'degradation'
  | 'string_failure'
  | 'inverter_fault'
  | 'arc_fault'
  | 'ground_fault'
  | 'mismatch';

export interface PvGraphNode {
  id: string;
  panelId: string;
  stringId: string;
  inverterId: string;
  features: number[];
  featureNames: string[];
}

export interface PvGraphEdge {
  source: string;
  target: string;
  edgeType: 'string_adjacency' | 'inverter_shared' | 'spatial_nearest';
  weight: number;
}

export interface PvGraphData {
  nodes: PvGraphNode[];
  edges: PvGraphEdge[];
  timestamp: string;
  siteId: string;
}

export interface GraphSageLayer {
  inputDim: number;
  hiddenDim: number;
  weights: number[][];
  bias: number[];
  activation: Activation;
  aggregator: 'mean' | 'max' | 'lstm';
}

export interface StgnnWeights {
  manifest: ModelManifest;
  sageLayers: GraphSageLayer[];
  classifierWeights: number[][];
  classifierBias: number[];
  featureMeans: number[];
  featureStds: number[];
  faultClasses: PvFaultClass[];
  nodeFeatureNames: string[];
  edgeFeatureNames: string[];
  trainingConfig: {
    nEpochs: number;
    learningRate: number;
    dropout: number;
    hiddenDims: number[];
    aggregator: 'mean' | 'max' | 'lstm';
    nHops: number;
  };
}

export interface StgnnFaultResult {
  modelVersion: string;
  siteId: string;
  timestamp: string;
  predictedClass: PvFaultClass;
  confidenceScore: number;
  classProbabilities: Record<string, number>;
  nodeEmbeddings: Array<{ nodeId: string; embedding: number[] }>;
  topSuspectNodes: Array<{ nodeId: string; panelId: string; score: number; faultType: string }>;
  affectedStrings: string[];
  affectedInverters: string[];
  severityLevel: 'none' | 'low' | 'moderate' | 'high' | 'critical';
  recommendedActions: string[];
  methodology: string;
}

function applyGraphSageLayer(
  layer: GraphSageLayer,
  nodeFeatures: Map<string, number[]>,
  edges: PvGraphEdge[],
): Map<string, number[]> {
  const newFeatures = new Map<string, number[]>();
  const neighbors = new Map<string, string[]>();

  for (const edge of edges) {
    if (!neighbors.has(edge.source)) neighbors.set(edge.source, []);
    if (!neighbors.has(edge.target)) neighbors.set(edge.target, []);
    neighbors.get(edge.source)!.push(edge.target);
    neighbors.get(edge.target)!.push(edge.source);
  }

  for (const [nodeId, features] of nodeFeatures) {
    const nbrs = neighbors.get(nodeId) ?? [];
    const neighborFeatures = nbrs
      .map((n) => nodeFeatures.get(n))
      .filter((f): f is number[] => f !== undefined);

    let aggregated: number[];
    if (layer.aggregator === 'max') {
      aggregated = new Array(layer.inputDim).fill(-Infinity);
      for (const nf of neighborFeatures) {
        for (let i = 0; i < layer.inputDim; i++) {
          aggregated[i] = Math.max(aggregated[i], nf[i] ?? 0);
        }
      }
      if (neighborFeatures.length === 0) aggregated = new Array(layer.inputDim).fill(0);
    } else {
      // mean aggregator
      aggregated = new Array(layer.inputDim).fill(0);
      for (const nf of neighborFeatures) {
        for (let i = 0; i < layer.inputDim; i++) {
          aggregated[i] += nf[i] ?? 0;
        }
      }
      const n = Math.max(1, neighborFeatures.length);
      aggregated = aggregated.map((v) => v / n);
    }

    // Concatenate self features with aggregated neighbor features
    const combined = [...features, ...aggregated];
    const output = new Array(layer.hiddenDim).fill(0);
    for (let i = 0; i < layer.hiddenDim; i++) {
      let sum = layer.bias[i];
      for (let j = 0; j < combined.length && j < layer.weights[i].length; j++) {
        sum += layer.weights[i][j] * combined[j];
      }
      output[i] =
        layer.activation === 'relu'
          ? Math.max(0, sum)
          : layer.activation === 'sigmoid'
            ? 1 / (1 + Math.exp(-sum))
            : sum;
    }

    // L2 normalize
    const norm = Math.sqrt(output.reduce((s, v) => s + v * v, 0)) || 1;
    newFeatures.set(
      nodeId,
      output.map((v) => v / norm),
    );
  }

  return newFeatures;
}

function classifyFault(
  embeddings: Map<string, number[]>,
  weights: number[][],
  bias: number[],
  classes: PvFaultClass[],
): { class: PvFaultClass; probabilities: Record<string, number>; scores: Map<string, number> } {
  // Mean pool all node embeddings
  const allEmbeddings = [...embeddings.values()];
  if (allEmbeddings.length === 0) {
    return { class: 'healthy', probabilities: { healthy: 1 }, scores: new Map() };
  }

  const dim = allEmbeddings[0].length;
  const pooled = new Array(dim).fill(0);
  for (const emb of allEmbeddings) {
    for (let i = 0; i < dim; i++) pooled[i] += emb[i];
  }
  const meanPooled = pooled.map((v) => v / allEmbeddings.length);

  // Classify
  const scores = new Map<string, number>();
  const logits: number[] = [];
  for (let c = 0; c < classes.length; c++) {
    let logit = bias[c];
    for (let i = 0; i < meanPooled.length && i < weights[c].length; i++) {
      logit += weights[c][i] * meanPooled[i];
    }
    logits.push(logit);
  }

  // Softmax
  const maxLogit = Math.max(...logits);
  const expLogits = logits.map((l) => Math.exp(l - maxLogit));
  const sumExp = expLogits.reduce((s, v) => s + v, 0) || 1;

  const probabilities: Record<string, number> = {};
  for (let c = 0; c < classes.length; c++) {
    const prob = expLogits[c] / sumExp;
    probabilities[classes[c]] = round(prob, 6);
    scores.set(classes[c], prob);
  }

  // Find best class
  let bestClass: PvFaultClass = 'healthy';
  let bestScore = -1;
  for (const [cls, score] of scores) {
    if (score > bestScore) {
      bestScore = score;
      bestClass = cls as PvFaultClass;
    }
  }

  return { class: bestClass, probabilities, scores };
}

export function detectPvFaultsStgnn(graph: PvGraphData, weights: StgnnWeights): StgnnFaultResult {
  // Normalize node features
  const normalizedFeatures = new Map<string, number[]>();
  for (const node of graph.nodes) {
    const normalized = node.features.map((f, i) => {
      const mean = weights.featureMeans[i] ?? 0;
      const std = weights.featureStds[i] ?? 1;
      return (f - mean) / Math.max(std, 0.001);
    });
    normalizedFeatures.set(node.id, normalized);
  }

  // Apply GraphSAGE layers
  let currentFeatures = normalizedFeatures;
  for (const layer of weights.sageLayers) {
    currentFeatures = applyGraphSageLayer(layer, currentFeatures, graph.edges);
  }

  // Classify
  const {
    class: predictedClass,
    probabilities,
    scores,
  } = classifyFault(
    currentFeatures,
    weights.classifierWeights,
    weights.classifierBias,
    weights.faultClasses,
  );

  // Identify top suspect nodes
  const nodeScores = new Map<string, number>();
  for (const [nodeId, embedding] of currentFeatures) {
    let maxScore = 0;
    for (let c = 0; c < weights.classifierWeights.length; c++) {
      let logit = weights.classifierBias[c];
      for (let i = 0; i < embedding.length && i < weights.classifierWeights[c].length; i++) {
        logit += weights.classifierWeights[c][i] * embedding[i];
      }
      maxScore = Math.max(maxScore, 1 / (1 + Math.exp(-logit)));
    }
    nodeScores.set(nodeId, round(maxScore, 6));
  }

  const topSuspects = [...nodeScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([nodeId, score]) => {
      const node = graph.nodes.find((n) => n.id === nodeId);
      return {
        nodeId,
        panelId: node?.panelId ?? 'unknown',
        score,
        faultType: predictedClass,
      };
    });

  // Affected strings and inverters
  const affectedStrings = [
    ...new Set(
      topSuspects
        .map((s) => {
          return graph.nodes.find((n) => n.id === s.nodeId)?.stringId;
        })
        .filter((s): s is string => s !== undefined),
    ),
  ];

  const affectedInverters = [
    ...new Set(
      topSuspects
        .map((s) => {
          return graph.nodes.find((n) => n.id === s.nodeId)?.inverterId;
        })
        .filter((s): s is string => s !== undefined),
    ),
  ];

  // Severity
  const confidence = probabilities[predictedClass] ?? 0;
  const severityLevel: StgnnFaultResult['severityLevel'] =
    predictedClass === 'healthy'
      ? 'none'
      : confidence > 0.85
        ? 'critical'
        : confidence > 0.7
          ? 'high'
          : confidence > 0.5
            ? 'moderate'
            : 'low';

  // Recommended actions
  const recommendedActions: string[] = [];
  switch (predictedClass) {
    case 'soiling':
      recommendedActions.push(
        'Schedule panel cleaning within 7 days',
        'Verify soiling loss with IV curve tracing',
      );
      break;
    case 'degradation':
      recommendedActions.push(
        'Schedule IV curve measurement',
        'Compare against baseline degradation rate',
      );
      break;
    case 'string_failure':
      recommendedActions.push(
        `Inspect strings: ${affectedStrings.join(', ')}`,
        'Check string fuses and combiner box',
      );
      break;
    case 'inverter_fault':
      recommendedActions.push(
        `Inspect inverters: ${affectedInverters.join(', ')}`,
        'Check inverter error logs and firmware',
      );
      break;
    case 'arc_fault':
      recommendedActions.push(
        'IMMEDIATE: Isolate affected strings',
        'Dispatch technician for arc fault investigation',
      );
      break;
    case 'ground_fault':
      recommendedActions.push(
        'IMMEDIATE: Check ground fault detection',
        'Verify insulation resistance of affected strings',
      );
      break;
    case 'mismatch':
      recommendedActions.push('Check for new shading sources', 'Verify panel-to-panel matching');
      break;
    default:
      recommendedActions.push('No action required — system healthy');
  }

  return {
    modelVersion: weights.manifest.model_version,
    siteId: graph.siteId,
    timestamp: graph.timestamp,
    predictedClass,
    confidenceScore: round(confidence, 6),
    classProbabilities: probabilities,
    nodeEmbeddings: [...currentFeatures.entries()].map(([nodeId, embedding]) => ({
      nodeId,
      embedding,
    })),
    topSuspectNodes: topSuspects,
    affectedStrings,
    affectedInverters,
    severityLevel,
    recommendedActions,
    methodology:
      'Spatio-Temporal Graph Neural Network with GraphSAGE aggregation. Multi-hop message passing over panel-string-inverter graph topology.',
  };
}
