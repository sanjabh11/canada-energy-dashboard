/**
 * Unit tests for B07 – PolicyGraph
 * Tests traversal, conflict detection, pathway impact, topological sort.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  PolicyGraph,
  getGlobalPolicyGraph,
  resetGlobalPolicyGraph,
} from '../../src/lib/policyGraph.ts';
import type { PolicyGraphNode, PolicyGraphEdge } from '../../src/lib/policyGraph.ts';

function makeNode(id: string, type: PolicyGraphNode['type'] = 'policy'): PolicyGraphNode {
  return {
    id,
    type,
    label: `${type}: ${id}`,
    jurisdiction: 'CA',
    status: 'enacted',
    metrics: { ghg_reduction_mt: 10, cost_cad_m: 500 },
    trustTier: 1,
  };
}

function makeEdge(id: string, fromId: string, toId: string, type: PolicyGraphEdge['type'] = 'enables'): PolicyGraphEdge {
  return { id, fromId, toId, type, weight: 0.8 };
}

// ── CRUD ─────────────────────────────────────────────────────────────────────

describe('PolicyGraph - CRUD', () => {
  let g: PolicyGraph;
  beforeEach(() => { g = new PolicyGraph(); });

  it('adds and retrieves a node', () => {
    g.addNode(makeNode('p1'));
    expect(g.getNode('p1')).toBeDefined();
    expect(g.getNode('p1')!.label).toContain('p1');
  });

  it('node count increments on add', () => {
    g.addNode(makeNode('p1'));
    g.addNode(makeNode('p2'));
    expect(g.nodeCount).toBe(2);
  });

  it('removes a node and cleans up edges', () => {
    g.addNode(makeNode('p1'));
    g.addNode(makeNode('p2'));
    g.addEdge(makeEdge('e1', 'p1', 'p2'));
    g.removeNode('p1');
    expect(g.getNode('p1')).toBeUndefined();
    expect(g.listEdges()).toHaveLength(0);
  });

  it('throws when adding edge with missing fromId', () => {
    g.addNode(makeNode('p2'));
    expect(() => g.addEdge(makeEdge('e1', 'MISSING', 'p2'))).toThrow();
  });

  it('throws when adding edge with missing toId', () => {
    g.addNode(makeNode('p1'));
    expect(() => g.addEdge(makeEdge('e1', 'p1', 'MISSING'))).toThrow();
  });

  it('filters nodes by type', () => {
    g.addNode(makeNode('p1', 'policy'));
    g.addNode(makeNode('t1', 'technology'));
    g.addNode(makeNode('m1', 'milestone'));
    expect(g.listNodes({ type: 'policy' })).toHaveLength(1);
    expect(g.listNodes({ type: 'technology' })).toHaveLength(1);
  });
});

// ── Traversal ─────────────────────────────────────────────────────────────────

describe('PolicyGraph - traversal', () => {
  let g: PolicyGraph;
  beforeEach(() => {
    g = new PolicyGraph();
    // A → B → C → D
    ['A', 'B', 'C', 'D'].forEach((id) => g.addNode(makeNode(id)));
    g.addEdge(makeEdge('e1', 'A', 'B'));
    g.addEdge(makeEdge('e2', 'B', 'C'));
    g.addEdge(makeEdge('e3', 'C', 'D'));
  });

  it('getDownstream traverses all reachable nodes', () => {
    const result = g.getDownstream('A');
    expect(result.nodeIds).toContain('B');
    expect(result.nodeIds).toContain('C');
    expect(result.nodeIds).toContain('D');
  });

  it('getDownstream respects maxDepth', () => {
    const result = g.getDownstream('A', 1);
    expect(result.nodeIds).toContain('B');
    expect(result.nodeIds).not.toContain('C');
    expect(result.nodeIds).not.toContain('D');
  });

  it('getUpstream returns predecessors', () => {
    const result = g.getUpstream('D');
    expect(result.nodeIds).toContain('C');
    expect(result.nodeIds).toContain('B');
    expect(result.nodeIds).toContain('A');
  });
});

// ── Conflict detection ────────────────────────────────────────────────────────

describe('PolicyGraph - conflicts', () => {
  it('finds conflicting policies bidirectionally', () => {
    const g = new PolicyGraph();
    g.addNode(makeNode('p1'));
    g.addNode(makeNode('p2'));
    g.addNode(makeNode('p3'));
    g.addEdge({ id: 'c1', fromId: 'p1', toId: 'p2', type: 'conflicts_with' });
    g.addEdge({ id: 'c2', fromId: 'p3', toId: 'p1', type: 'conflicts_with' });

    const conflicts = g.findConflicts('p1');
    const conflictIds = conflicts.map((n) => n.id);
    expect(conflictIds).toContain('p2');
    expect(conflictIds).toContain('p3');
  });

  it('returns empty array when no conflicts', () => {
    const g = new PolicyGraph();
    g.addNode(makeNode('p1'));
    expect(g.findConflicts('p1')).toHaveLength(0);
  });
});

// ── Pathway impact ────────────────────────────────────────────────────────────

describe('PolicyGraph - pathwayImpact', () => {
  it('aggregates GHG and cost across downstream nodes', () => {
    const g = new PolicyGraph();
    g.addNode({ ...makeNode('pathway1', 'pathway'), metrics: { ghg_reduction_mt: 20, cost_cad_m: 1000 } });
    g.addNode({ ...makeNode('policy1', 'policy'), metrics: { ghg_reduction_mt: 30, cost_cad_m: 500 } });
    g.addNode({ ...makeNode('milestone1', 'milestone'), effectiveDate: '2030-01-01', metrics: {} });
    g.addEdge(makeEdge('e1', 'pathway1', 'policy1', 'enables'));
    g.addEdge(makeEdge('e2', 'pathway1', 'milestone1', 'contributes_to'));

    const impact = g.pathwayImpact('pathway1');
    expect(impact.totalGhgReductionMt).toBeGreaterThanOrEqual(50);
    expect(impact.totalCostCadM).toBeGreaterThanOrEqual(1500);
    expect(impact.milestones.some((m) => m.id === 'milestone1')).toBe(true);
    expect(impact.feasibilityScore).toBeGreaterThan(0);
    expect(impact.feasibilityScore).toBeLessThanOrEqual(1);
  });

  it('throws for non-pathway node', () => {
    const g = new PolicyGraph();
    g.addNode(makeNode('p1', 'policy'));
    expect(() => g.pathwayImpact('p1')).toThrow();
  });

  it('penalises feasibility score for conflicts', () => {
    const g = new PolicyGraph();
    g.addNode(makeNode('pathway1', 'pathway'));
    g.addNode(makeNode('policy1', 'policy'));
    g.addNode(makeNode('barrier1', 'barrier'));
    g.addEdge(makeEdge('e1', 'pathway1', 'policy1', 'enables'));
    g.addEdge({ id: 'c1', fromId: 'pathway1', toId: 'barrier1', type: 'conflicts_with' });

    const impact = g.pathwayImpact('pathway1');
    expect(impact.conflicts.length).toBeGreaterThan(0);
    expect(impact.feasibilityScore).toBeLessThan(1);
  });
});

// ── Topological sort ──────────────────────────────────────────────────────────

describe('PolicyGraph - topologicalSort', () => {
  it('sorts nodes such that dependencies appear after dependents', () => {
    const g = new PolicyGraph();
    ['A', 'B', 'C'].forEach((id) => g.addNode(makeNode(id)));
    // A depends on B, B depends on C
    g.addEdge({ id: 'e1', fromId: 'A', toId: 'B', type: 'depends_on' });
    g.addEdge({ id: 'e2', fromId: 'B', toId: 'C', type: 'depends_on' });

    const order = g.topologicalSort();
    const iA = order.indexOf('A');
    const iB = order.indexOf('B');
    const iC = order.indexOf('C');
    // In depends_on: A depends on B → A should come after B in sorted order
    // (lower in-degree = first in sort)
    expect(iC).toBeLessThan(iB);
    expect(iB).toBeLessThan(iA);
  });
});

// ── JSON export/import ────────────────────────────────────────────────────────

describe('PolicyGraph - JSON roundtrip', () => {
  it('exports and imports without data loss', () => {
    const g1 = new PolicyGraph();
    g1.addNode(makeNode('n1', 'policy'));
    g1.addNode(makeNode('n2', 'pathway'));
    g1.addEdge(makeEdge('e1', 'n1', 'n2', 'contributes_to'));

    const exported = g1.exportJson();
    const g2 = new PolicyGraph();
    g2.importJson(exported);

    expect(g2.nodeCount).toBe(2);
    expect(g2.edgeCount).toBe(1);
    expect(g2.getNode('n1')!.type).toBe('policy');
  });
});

// ── Global singleton ──────────────────────────────────────────────────────────

describe('getGlobalPolicyGraph', () => {
  beforeEach(() => resetGlobalPolicyGraph());

  it('returns a seeded graph with federal policies', () => {
    const g = getGlobalPolicyGraph();
    expect(g.nodeCount).toBeGreaterThan(5);
    expect(g.getNode('net-zero-2050')).toBeDefined();
    expect(g.getNode('clean-electricity-regs')).toBeDefined();
    expect(g.getNode('carbon-pricing')).toBeDefined();
  });

  it('is idempotent (same instance on second call)', () => {
    const g1 = getGlobalPolicyGraph();
    const g2 = getGlobalPolicyGraph();
    expect(g1).toBe(g2);
  });

  it('can compute pathway impact for net-zero-2050', () => {
    const g = getGlobalPolicyGraph();
    const impact = g.pathwayImpact('net-zero-2050');
    expect(impact.totalGhgReductionMt).toBeGreaterThan(0);
  });
});
