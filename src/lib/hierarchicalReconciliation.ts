/**
 * Hierarchical Forecast Reconciliation
 *
 * Reconciles forecasts across hierarchical levels (e.g., provincial → regional →
 * substation → feeder) to ensure consistency. Implements three methods:
 *   - Bottom-up: aggregate leaf-level forecasts
 *   - Top-down: distribute aggregate forecast using historical proportions
 *   - Optimal (MinT): trace minimization reconciliation (Hyndman et al. 2011)
 *
 * References:
 *   - Hyndman et al. (2011) "Optimal combination forecasts for hierarchical time series"
 *   - Athanasopoulos et al. (2017) "Hierarchical and grouped time series forecasting"
 *   - OEB Load Forecast Guideline: hierarchical consistency requirements
 */

export type ReconciliationMethod = 'bottom_up' | 'top_down' | 'mint';

export interface HierarchyNode {
  id: string;
  level: number;
  label: string;
  children?: string[];
  parent?: string;
}

export interface HierarchyForecast {
  nodeId: string;
  forecastValue: number;
  originalForecast: number;
  adjusted: boolean;
}

export interface ReconciliationResult {
  method: ReconciliationMethod;
  reconciled: HierarchyForecast[];
  hierarchy: HierarchyNode[];
  levels: string[];
  coherenceError: number;
  totalAdjustment: number;
  metadata: {
    nNodes: number;
    nLevels: number;
    computationTimeMs: number;
  };
}

export interface ReconciliationInput {
  hierarchy: HierarchyNode[];
  forecasts: Record<string, number>;
  method: ReconciliationMethod;
  historicalProportions?: Record<string, number>;
  residualCovariance?: number[][];
}

/**
 * Reconcile hierarchical forecasts using the specified method.
 */
export function reconcileHierarchicalForecasts(input: ReconciliationInput): ReconciliationResult {
  const startTime = Date.now();
  const { hierarchy, forecasts, method } = input;

  // Build level mapping
  const levels = [...new Set(hierarchy.map((n) => `level_${n.level}`))].sort();
  const nodesByLevel = new Map<number, HierarchyNode[]>();
  for (const node of hierarchy) {
    if (!nodesByLevel.has(node.level)) nodesByLevel.set(node.level, []);
    nodesByLevel.get(node.level)!.push(node);
  }

  let reconciled: HierarchyForecast[];

  switch (method) {
    case 'bottom_up':
      reconciled = reconcileBottomUp(hierarchy, forecasts);
      break;
    case 'top_down':
      reconciled = reconcileTopDown(hierarchy, forecasts, input.historicalProportions ?? {});
      break;
    case 'mint':
      reconciled = reconcileMinT(hierarchy, forecasts, input.residualCovariance);
      break;
  }

  // Compute coherence error (sum of absolute differences between parent and sum of children)
  const coherenceError = computeCoherenceError(hierarchy, reconciled);
  const totalAdjustment = reconciled.reduce(
    (s, r) => s + Math.abs(r.forecastValue - r.originalForecast),
    0,
  );

  return {
    method,
    reconciled,
    hierarchy,
    levels,
    coherenceError: round(coherenceError, 6),
    totalAdjustment: round(totalAdjustment, 6),
    metadata: {
      nNodes: hierarchy.length,
      nLevels: levels.length,
      computationTimeMs: Date.now() - startTime,
    },
  };
}

/**
 * Bottom-up reconciliation: leaf forecasts sum up to parent forecasts.
 */
function reconcileBottomUp(
  hierarchy: HierarchyNode[],
  forecasts: Record<string, number>,
): HierarchyForecast[] {
  const result: HierarchyForecast[] = [];
  const reconciledValues = new Map<string, number>();

  // Find leaf nodes (no children)
  const leafNodes = hierarchy.filter((n) => !n.children || n.children.length === 0);

  // Leaf nodes keep their original forecast
  for (const leaf of leafNodes) {
    const val = forecasts[leaf.id] ?? 0;
    reconciledValues.set(leaf.id, val);
    result.push({
      nodeId: leaf.id,
      forecastValue: val,
      originalForecast: val,
      adjusted: false,
    });
  }

  // Aggregate up the hierarchy
  const maxLevel = Math.max(...hierarchy.map((n) => n.level));
  for (let level = maxLevel - 1; level >= 0; level--) {
    const nodesAtLevel = hierarchy.filter((n) => n.level === level);
    for (const node of nodesAtLevel) {
      if (node.children && node.children.length > 0) {
        const childSum = node.children.reduce(
          (s, childId) => s + (reconciledValues.get(childId) ?? 0),
          0,
        );
        reconciledValues.set(node.id, childSum);
        result.push({
          nodeId: node.id,
          forecastValue: round(childSum, 6),
          originalForecast: forecasts[node.id] ?? 0,
          adjusted: true,
        });
      } else {
        // No children — it's a leaf that was already processed
        const val = reconciledValues.get(node.id) ?? forecasts[node.id] ?? 0;
        result.push({
          nodeId: node.id,
          forecastValue: val,
          originalForecast: val,
          adjusted: false,
        });
      }
    }
  }

  return result;
}

/**
 * Top-down reconciliation: aggregate forecast distributed by historical proportions.
 */
function reconcileTopDown(
  hierarchy: HierarchyNode[],
  forecasts: Record<string, number>,
  proportions: Record<string, number>,
): HierarchyForecast[] {
  const result: HierarchyForecast[] = [];
  const reconciledValues = new Map<string, number>();

  // Root node (level 0)
  const root = hierarchy.find((n) => n.level === 0);
  if (!root) return [];

  const rootForecast = forecasts[root.id] ?? 0;
  reconciledValues.set(root.id, rootForecast);
  result.push({
    nodeId: root.id,
    forecastValue: rootForecast,
    originalForecast: rootForecast,
    adjusted: false,
  });

  // Distribute down the hierarchy
  const maxLevel = Math.max(...hierarchy.map((n) => n.level));
  for (let level = 1; level <= maxLevel; level++) {
    const nodesAtLevel = hierarchy.filter((n) => n.level === level);
    for (const node of nodesAtLevel) {
      const parentVal = reconciledValues.get(node.parent ?? '') ?? 0;
      const proportion = proportions[node.id] ?? 1 / Math.max(1, nodesAtLevel.length);
      const val = parentVal * proportion;
      reconciledValues.set(node.id, val);
      result.push({
        nodeId: node.id,
        forecastValue: round(val, 6),
        originalForecast: forecasts[node.id] ?? 0,
        adjusted: true,
      });
    }
  }

  return result;
}

/**
 * Optimal reconciliation (MinT): minimizes trace of reconciliation error covariance.
 *
 * Simplified implementation using diagonal covariance approximation.
 */
function reconcileMinT(
  hierarchy: HierarchyNode[],
  forecasts: Record<string, number>,
  residualCovariance?: number[][],
): HierarchyForecast[] {
  // Build summing matrix S (n_total x n_bottom)
  const leafNodes = hierarchy.filter((n) => !n.children || n.children.length === 0);
  const nTotal = hierarchy.length;
  const nBottom = leafNodes.length;

  // S[i][j] = 1 if bottom node j is a descendant of node i (or is node i)
  const S: number[][] = Array(nTotal)
    .fill(null)
    .map(() => Array(nBottom).fill(0));
  const nodeIndex = new Map(hierarchy.map((n, i) => [n.id, i]));
  const leafIndex = new Map(leafNodes.map((n, i) => [n.id, i]));

  for (let i = 0; i < hierarchy.length; i++) {
    const node = hierarchy[i];
    if (!node.children || node.children.length === 0) {
      // Leaf node
      const li = leafIndex.get(node.id);
      if (li !== undefined) S[i][li] = 1;
    } else {
      // Find all descendant leaves
      const descendantLeaves = findDescendantLeaves(node, hierarchy);
      for (const leaf of descendantLeaves) {
        const li = leafIndex.get(leaf);
        if (li !== undefined) S[i][li] = 1;
      }
    }
  }

  // Forecast vector
  const yHat = hierarchy.map((n) => forecasts[n.id] ?? 0);

  // Diagonal covariance approximation (W = diag of residual variances)
  const W = residualCovariance
    ? residualCovariance.map((row) => row.reduce((s, v) => s + v, 0) / row.length)
    : Array(nTotal).fill(1); // Uniform weights if no covariance provided

  // MinT: yHat_reconciled = S * (S' W^-1 S)^-1 * S' * W^-1 * yHat
  // Simplified: use proportional adjustment based on residual weights

  // Compute G = (S' W^-1 S)^-1 (simplified — diagonal)
  const SWinvS = Array(nBottom)
    .fill(null)
    .map(() => Array(nBottom).fill(0));
  for (let j1 = 0; j1 < nBottom; j1++) {
    for (let j2 = 0; j2 < nBottom; j2++) {
      let sum = 0;
      for (let i = 0; i < nTotal; i++) {
        sum += S[i][j1] * (1 / Math.max(W[i], 0.001)) * S[i][j2];
      }
      SWinvS[j1][j2] = sum;
    }
  }

  // Invert SWinvS (simplified — diagonal approximation)
  const Ginv = invertMatrixDiag(SWinvS, nBottom);

  // Compute reconciled bottom-level forecasts
  const SWinvYHat = Array(nBottom).fill(0);
  for (let j = 0; j < nBottom; j++) {
    let sum = 0;
    for (let i = 0; i < nTotal; i++) {
      sum += S[i][j] * (1 / Math.max(W[i], 0.001)) * yHat[i];
    }
    SWinvYHat[j] = sum;
  }

  const bottomReconciled = Array(nBottom).fill(0);
  for (let j = 0; j < nBottom; j++) {
    let sum = 0;
    for (let k = 0; k < nBottom; k++) {
      sum += Ginv[j][k] * SWinvYHat[k];
    }
    bottomReconciled[j] = sum;
  }

  // Propagate up using S matrix
  const reconciledValues = new Map<string, number>();
  for (let i = 0; i < hierarchy.length; i++) {
    let val = 0;
    for (let j = 0; j < nBottom; j++) {
      val += S[i][j] * bottomReconciled[j];
    }
    reconciledValues.set(hierarchy[i].id, val);
  }

  return hierarchy.map((node) => {
    const val = reconciledValues.get(node.id) ?? 0;
    return {
      nodeId: node.id,
      forecastValue: round(val, 6),
      originalForecast: forecasts[node.id] ?? 0,
      adjusted: Math.abs(val - (forecasts[node.id] ?? 0)) > 0.001,
    };
  });
}

/**
 * Compute coherence error: sum of |parent - sum(children)| across all internal nodes.
 */
function computeCoherenceError(
  hierarchy: HierarchyNode[],
  reconciled: HierarchyForecast[],
): number {
  const valueMap = new Map(reconciled.map((r) => [r.nodeId, r.forecastValue]));
  let totalError = 0;

  for (const node of hierarchy) {
    if (node.children && node.children.length > 0) {
      const parentVal = valueMap.get(node.id) ?? 0;
      const childSum = node.children.reduce((s, childId) => s + (valueMap.get(childId) ?? 0), 0);
      totalError += Math.abs(parentVal - childSum);
    }
  }

  return totalError;
}

// ============================================================================
// Helpers
// ============================================================================

function findDescendantLeaves(node: HierarchyNode, hierarchy: HierarchyNode[]): string[] {
  if (!node.children || node.children.length === 0) return [node.id];
  const leaves: string[] = [];
  for (const childId of node.children) {
    const child = hierarchy.find((n) => n.id === childId);
    if (child) {
      leaves.push(...findDescendantLeaves(child, hierarchy));
    }
  }
  return leaves;
}

function invertMatrixDiag(matrix: number[][], n: number): number[][] {
  // Simplified diagonal inverse
  const result = Array(n)
    .fill(null)
    .map(() => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    const diagVal = matrix[i][i];
    if (Math.abs(diagVal) > 0.001) {
      result[i][i] = 1 / diagVal;
    } else {
      result[i][i] = 1; // Fallback
    }
  }
  return result;
}

function round(value: number, decimals: number = 4): number {
  if (!Number.isFinite(value)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Example: Ontario demand hierarchy
 * Level 0: Ontario (root)
 * Level 1: Toronto, Ottawa, London, Other
 * Level 2: Substations within each region
 */
export const ONTARIO_DEMAND_HIERARCHY: HierarchyNode[] = [
  { id: 'ontario', level: 0, label: 'Ontario' },
  { id: 'toronto', level: 1, label: 'Toronto Region', parent: 'ontario' },
  { id: 'ottawa', level: 1, label: 'Ottawa Region', parent: 'ontario' },
  { id: 'london', level: 1, label: 'London Region', parent: 'ontario' },
  { id: 'other', level: 1, label: 'Other Ontario', parent: 'ontario' },
  { id: 'toronto_ss1', level: 2, label: 'Toronto SS-1', parent: 'toronto' },
  { id: 'toronto_ss2', level: 2, label: 'Toronto SS-2', parent: 'toronto' },
  { id: 'ottawa_ss1', level: 2, label: 'Ottawa SS-1', parent: 'ottawa' },
  { id: 'london_ss1', level: 2, label: 'London SS-1', parent: 'london' },
  { id: 'other_ss1', level: 2, label: 'Other SS-1', parent: 'other' },
];

// Set children arrays
ONTARIO_DEMAND_HIERARCHY[0].children = ['toronto', 'ottawa', 'london', 'other'];
ONTARIO_DEMAND_HIERARCHY[1].children = ['toronto_ss1', 'toronto_ss2'];
ONTARIO_DEMAND_HIERARCHY[2].children = ['ottawa_ss1'];
ONTARIO_DEMAND_HIERARCHY[3].children = ['london_ss1'];
ONTARIO_DEMAND_HIERARCHY[4].children = ['other_ss1'];
