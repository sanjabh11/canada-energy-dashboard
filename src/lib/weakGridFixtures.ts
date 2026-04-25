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
