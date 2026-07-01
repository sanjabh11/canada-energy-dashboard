export interface WeakGridFixtureNode {
  id: string;
  shortCircuitKa: number;
}

export interface WeakGridFixtureEdge {
  fromNodeId: string;
  toNodeId: string;
  limitMw: number;
  currentMw: number;
}

export interface WeakGridFixture {
  key: string;
  label: string;
  province: string;
  sourceMode: 'fixture';
  note: string;
  scenario: {
    shortCircuitLevelKa: number;
    minimumShortCircuitKa: number;
    inverterPenetrationPct: number;
    reserveMarginPercent: number;
    topology: {
      nodes: WeakGridFixtureNode[];
      edges: WeakGridFixtureEdge[];
    };
  };
}

export const WEAK_GRID_FIXTURES: Record<string, WeakGridFixture> = {
  pincher_creek: {
    key: 'pincher_creek',
    label: 'Pincher Creek transfer corridor',
    province: 'AB',
    sourceMode: 'fixture',
    note: 'Fixture-based weak-grid corridor derived from the existing Pincher Creek screening examples. Use live SCED and short-circuit studies before operational decisions.',
    scenario: {
      shortCircuitLevelKa: 5.4,
      minimumShortCircuitKa: 8,
      inverterPenetrationPct: 42,
      reserveMarginPercent: 6,
      topology: {
        nodes: [
          { id: 'pincher-1', shortCircuitKa: 5.2 },
          { id: 'pincher-2', shortCircuitKa: 6.1 },
          { id: 'pincher-3', shortCircuitKa: 8.8 },
        ],
        edges: [
          { fromNodeId: 'pincher-1', toNodeId: 'pincher-2', limitMw: 180, currentMw: 166 },
          { fromNodeId: 'pincher-2', toNodeId: 'pincher-3', limitMw: 210, currentMw: 154 },
        ],
      },
    },
  },
  fort_macleod: {
    key: 'fort_macleod',
    label: 'Fort Macleod inverter cluster',
    province: 'AB',
    sourceMode: 'fixture',
    note: 'Fixture-based weak-grid cluster for wind and inverter-heavy conditions. This remains advisory until a live protection-study feed exists.',
    scenario: {
      shortCircuitLevelKa: 6.2,
      minimumShortCircuitKa: 8.5,
      inverterPenetrationPct: 48,
      reserveMarginPercent: 5,
      topology: {
        nodes: [
          { id: 'fortmac-1', shortCircuitKa: 6.2 },
          { id: 'fortmac-2', shortCircuitKa: 6.9 },
          { id: 'fortmac-3', shortCircuitKa: 7.6 },
        ],
        edges: [
          { fromNodeId: 'fortmac-1', toNodeId: 'fortmac-2', limitMw: 200, currentMw: 188 },
          { fromNodeId: 'fortmac-2', toNodeId: 'fortmac-3', limitMw: 210, currentMw: 194 },
        ],
      },
    },
  },
};

export const DEFAULT_WEAK_GRID_FIXTURE_KEY = 'pincher_creek';

export function getWeakGridFixture(key = DEFAULT_WEAK_GRID_FIXTURE_KEY): WeakGridFixture {
  return WEAK_GRID_FIXTURES[key] ?? WEAK_GRID_FIXTURES[DEFAULT_WEAK_GRID_FIXTURE_KEY];
}

// ============================================================================
// Dynamic Short-Circuit Ratio (SCR) Computation
// ============================================================================

export type GridStrengthClass = 'weak' | 'marginal' | 'strong';

export interface DynamicSCRResult {
  nodeId: string;
  scr: number;
  shortCircuitMva: number;
  isWeak: boolean;
  strengthClass: GridStrengthClass;
  contributingFactors: string[];
  advisoryLabel: string;
  method: string;
}

export interface FleetSCRResult {
  minScr: number;
  maxScr: number;
  meanScr: number;
  weakNodes: string[];
  marginalNodes: string[];
  strongNodes: string[];
  overallAssessment: GridStrengthClass;
  nodeResults: DynamicSCRResult[];
  advisoryLabel: string;
  method: string;
}

/**
 * Compute dynamic Short-Circuit Ratio (SCR) for each node in a grid topology.
 *
 * SCR = Short-Circuit MVA / Base MVA
 *
 * A node is considered:
 *   - 'weak' if SCR < 3.0 (high risk of voltage instability)
 *   - 'marginal' if 3.0 ≤ SCR < 5.0 (monitor closely)
 *   - 'strong' if SCR ≥ 5.0 (stable)
 *
 * References:
 *   - IEEE Std 1547-2018: SCR thresholds for inverter-based generation
 *   - NERC reliability guideline: BPS-connected inverter-based resources
 *
 * @param topology Grid topology with nodes (short-circuit kA) and edges
 * @param systemVoltageKv System voltage in kV (default 138 kV)
 * @param baseMva Base MVA for SCR calculation (default 100 MVA)
 */
export function computeDynamicSCR(
  topology: { nodes: WeakGridFixtureNode[]; edges: WeakGridFixtureEdge[] },
  systemVoltageKv: number = 138,
  baseMva: number = 100,
): DynamicSCRResult[] {
  if (baseMva <= 0) {
    return topology.nodes.map((node) => ({
      nodeId: node.id,
      scr: 0,
      shortCircuitMva: 0,
      isWeak: true,
      strengthClass: 'weak' as GridStrengthClass,
      contributingFactors: ['Invalid baseMVA: must be positive'],
      advisoryLabel: 'ERROR: Invalid baseMVA (<=0). SCR cannot be computed. Fix input before using results.',
      method: 'Dynamic SCR — ERROR: baseMva <= 0',
    }));
  }

  if (topology.nodes.length === 0) {
    return [];
  }

  const results: DynamicSCRResult[] = [];

  for (const node of topology.nodes) {
    // Short-circuit MVA = sqrt(3) * V_kV * I_kA
    const scmva = Math.sqrt(3) * systemVoltageKv * node.shortCircuitKa;
    const scr = scmva / baseMva;

    const strengthClass: GridStrengthClass = scr < 3.0
      ? 'weak'
      : scr < 5.0
        ? 'marginal'
        : 'strong';

    const contributingFactors: string[] = [];
    if (scr < 3.0) {
      contributingFactors.push('Low short-circuit level reduces grid strength');
      contributingFactors.push('Risk of voltage instability under inverter penetration');
    }
    if (scr < 5.0) {
      contributingFactors.push('Monitor during high renewable generation periods');
    }

    // Check connected edges for loading stress
    const connectedEdges = topology.edges.filter(
      (e) => e.fromNodeId === node.id || e.toNodeId === node.id,
    );
    for (const edge of connectedEdges) {
      if (edge.limitMw <= 0) continue;
      const loadingPct = (edge.currentMw / edge.limitMw) * 100;
      if (loadingPct > 85) {
        contributingFactors.push(`Edge ${edge.fromNodeId}→${edge.toNodeId} at ${loadingPct.toFixed(0)}% capacity`);
      }
    }

    results.push({
      nodeId: node.id,
      scr: round(scr, 3),
      shortCircuitMva: round(scmva, 2),
      isWeak: scr < 3.0,
      strengthClass,
      contributingFactors,
      advisoryLabel: strengthClass === 'weak'
        ? 'ADVISORY: Weak grid — SCR < 3.0. High voltage instability risk. Use live protection studies before operational decisions.'
        : strengthClass === 'marginal'
          ? 'CAUTION: Marginal grid — 3.0 ≤ SCR < 5.0. Monitor during high renewable generation.'
          : 'OK: Strong grid — SCR ≥ 5.0. Stable for inverter-based generation.',
      method: `Dynamic SCR (V=${systemVoltageKv}kV, base=${baseMva}MVA, I_sc=${node.shortCircuitKa}kA)`,
    });
  }

  return results;
}

/**
 * Aggregate SCR results across multiple grid corridors/fixtures.
 */
export function computeFleetSCR(
  fixtures: WeakGridFixture[],
  systemVoltageKv: number = 138,
  baseMva: number = 100,
): FleetSCRResult {
  if (fixtures.length === 0) {
    return {
      minScr: 0,
      maxScr: 0,
      meanScr: 0,
      weakNodes: [],
      marginalNodes: [],
      strongNodes: [],
      overallAssessment: 'weak',
      nodeResults: [],
      advisoryLabel: 'ERROR: No fixtures provided. Cannot compute fleet SCR.',
      method: 'Fleet SCR — ERROR: empty fixtures array',
    };
  }

  const allResults: DynamicSCRResult[] = [];

  for (const fixture of fixtures) {
    const nodeResults = computeDynamicSCR(fixture.scenario.topology, systemVoltageKv, baseMva);
    allResults.push(...nodeResults);
  }

  const scrValues = allResults.map((r) => r.scr);
  const minScr = Math.min(...scrValues);
  const maxScr = Math.max(...scrValues);
  const meanScr = scrValues.reduce((s, v) => s + v, 0) / (scrValues.length || 1);

  const weakNodes = allResults.filter((r) => r.strengthClass === 'weak').map((r) => r.nodeId);
  const marginalNodes = allResults.filter((r) => r.strengthClass === 'marginal').map((r) => r.nodeId);
  const strongNodes = allResults.filter((r) => r.strengthClass === 'strong').map((r) => r.nodeId);

  const overallAssessment: GridStrengthClass = weakNodes.length > 0
    ? 'weak'
    : marginalNodes.length > 0
      ? 'marginal'
      : 'strong';

  return {
    minScr: round(minScr, 3),
    maxScr: round(maxScr, 3),
    meanScr: round(meanScr, 3),
    weakNodes,
    marginalNodes,
    strongNodes,
    overallAssessment,
    nodeResults: allResults,
    advisoryLabel: overallAssessment === 'weak'
      ? `FLEET ADVISORY: ${weakNodes.length} weak node(s) detected. SCR < 3.0. Operational decisions require live protection studies.`
      : overallAssessment === 'marginal'
        ? `FLEET CAUTION: ${marginalNodes.length} marginal node(s). Monitor during high renewable generation.`
        : 'FLEET OK: All nodes have SCR ≥ 5.0. Stable for inverter-based generation.',
    method: `Fleet SCR aggregation across ${fixtures.length} fixture(s), ${allResults.length} node(s) (V=${systemVoltageKv}kV, base=${baseMva}MVA)`,
  };
}

function round(value: number, decimals: number = 3): number {
  if (!Number.isFinite(value)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
