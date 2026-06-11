/**
 * B07 – Policy and Pathway Relationship Graph
 *
 * Manages a directed graph of policy instruments, decarbonization pathways,
 * technology adoption curves, and their interdependencies.
 *
 * Graph model:
 *   Nodes: Policy, Pathway, Technology, Milestone, Barrier
 *   Edges: enables, conflicts_with, depends_on, supersedes, contributes_to
 *
 * Storage:
 *   - In-memory adjacency list (fast traversal for UI)
 *   - Mirrors to `policy_graph_nodes` / `policy_graph_edges` Supabase tables (B03 migration)
 *
 * Key operations:
 *   - addNode / addEdge / removeNode
 *   - getDownstream(nodeId)  — all nodes reachable from this node
 *   - getUpstream(nodeId)    — all nodes that point to this node
 *   - findConflicts(policyId) — policies with conflicting_with edges
 *   - pathwayImpact(pathwayId) — aggregate impact metrics for a pathway
 *   - topologicalSort()      — implementation ordering that respects depends_on
 *   - exportJson()           — serialise for frontend force-directed graph
 */

// ── Shared types ───────────────────────────────────────────────────────────────

export type NodeType = 'policy' | 'pathway' | 'technology' | 'milestone' | 'barrier';
export type EdgeType =
  | 'enables'
  | 'conflicts_with'
  | 'depends_on'
  | 'supersedes'
  | 'contributes_to'
  | 'accelerates'
  | 'impedes';

export interface PolicyGraphNode {
  id: string;
  type: NodeType;
  label: string;
  description?: string;
  jurisdiction: string;         // ISO-3166-2 or "CA"
  status?: 'proposed' | 'enacted' | 'repealed' | 'projected';
  effectiveDate?: string;       // ISO date string
  expiryDate?: string;
  /** Quantified impact metrics (e.g. { ghg_reduction_mt: 50, cost_cad_m: 200 }) */
  metrics?: Record<string, number>;
  /** Original legislative or policy reference URL */
  sourceUrl?: string;
  /** Trust tier 1-4 (from foundation.ts TrustTier) */
  trustTier?: 1 | 2 | 3 | 4;
  tags?: string[];
}

export interface PolicyGraphEdge {
  id: string;
  fromId: string;
  toId: string;
  type: EdgeType;
  weight?: number;              // 0–1 strength; 1 = full dependency
  description?: string;
  sourceUrl?: string;
}

export interface GraphTraversalResult {
  nodeIds: string[];
  depth: number;
  edges: PolicyGraphEdge[];
}

export interface PathwayImpact {
  pathwayId: string;
  totalGhgReductionMt: number;
  totalCostCadM: number;
  enabledPolicies: string[];
  dependencies: string[];
  conflicts: string[];
  milestones: Array<{ id: string; label: string; date?: string }>;
  feasibilityScore: number;     // 0–1 composite score
}

// ── Policy Graph class ─────────────────────────────────────────────────────────

export class PolicyGraph {
  private nodes = new Map<string, PolicyGraphNode>();
  private edges = new Map<string, PolicyGraphEdge>();
  /** Adjacency list: nodeId → Set<edgeId> (outgoing) */
  private adjacency = new Map<string, Set<string>>();
  /** Reverse adjacency: nodeId → Set<edgeId> (incoming) */
  private reverseAdj = new Map<string, Set<string>>();

  // ── Node operations ──────────────────────────────────────────────────────────

  addNode(node: PolicyGraphNode): void {
    this.nodes.set(node.id, node);
    if (!this.adjacency.has(node.id)) this.adjacency.set(node.id, new Set());
    if (!this.reverseAdj.has(node.id)) this.reverseAdj.set(node.id, new Set());
  }

  getNode(id: string): PolicyGraphNode | undefined {
    return this.nodes.get(id);
  }

  removeNode(id: string): void {
    this.nodes.delete(id);
    // Remove all edges connected to this node
    for (const edgeId of this.adjacency.get(id) ?? []) {
      const edge = this.edges.get(edgeId);
      if (edge) {
        this.reverseAdj.get(edge.toId)?.delete(edgeId);
        this.edges.delete(edgeId);
      }
    }
    for (const edgeId of this.reverseAdj.get(id) ?? []) {
      const edge = this.edges.get(edgeId);
      if (edge) {
        this.adjacency.get(edge.fromId)?.delete(edgeId);
        this.edges.delete(edgeId);
      }
    }
    this.adjacency.delete(id);
    this.reverseAdj.delete(id);
  }

  listNodes(filter?: Partial<{ type: NodeType; jurisdiction: string; status: string }>): PolicyGraphNode[] {
    let result = Array.from(this.nodes.values());
    if (filter?.type) result = result.filter((n) => n.type === filter.type);
    if (filter?.jurisdiction) result = result.filter((n) => n.jurisdiction === filter.jurisdiction);
    if (filter?.status) result = result.filter((n) => n.status === filter.status);
    return result;
  }

  // ── Edge operations ──────────────────────────────────────────────────────────

  addEdge(edge: PolicyGraphEdge): void {
    if (!this.nodes.has(edge.fromId)) {
      throw new Error(`PolicyGraph: fromId '${edge.fromId}' not found`);
    }
    if (!this.nodes.has(edge.toId)) {
      throw new Error(`PolicyGraph: toId '${edge.toId}' not found`);
    }
    this.edges.set(edge.id, edge);
    this.adjacency.get(edge.fromId)!.add(edge.id);
    if (!this.reverseAdj.has(edge.toId)) this.reverseAdj.set(edge.toId, new Set());
    this.reverseAdj.get(edge.toId)!.add(edge.id);
  }

  getEdge(id: string): PolicyGraphEdge | undefined {
    return this.edges.get(id);
  }

  listEdges(filter?: { type?: EdgeType; fromId?: string; toId?: string }): PolicyGraphEdge[] {
    let result = Array.from(this.edges.values());
    if (filter?.type) result = result.filter((e) => e.type === filter.type);
    if (filter?.fromId) result = result.filter((e) => e.fromId === filter.fromId);
    if (filter?.toId) result = result.filter((e) => e.toId === filter.toId);
    return result;
  }

  // ── Traversal ────────────────────────────────────────────────────────────────

  /**
   * BFS downstream: all nodes reachable from nodeId following outgoing edges.
   */
  getDownstream(nodeId: string, maxDepth = 6): GraphTraversalResult {
    const visited = new Set<string>();
    const resultEdges: PolicyGraphEdge[] = [];
    const queue: Array<{ id: string; depth: number }> = [{ id: nodeId, depth: 0 }];
    let maxReachedDepth = 0;

    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      if (visited.has(id) || depth > maxDepth) continue;
      visited.add(id);
      maxReachedDepth = Math.max(maxReachedDepth, depth);

      for (const edgeId of this.adjacency.get(id) ?? []) {
        const edge = this.edges.get(edgeId)!;
        resultEdges.push(edge);
        if (!visited.has(edge.toId)) {
          queue.push({ id: edge.toId, depth: depth + 1 });
        }
      }
    }

    return {
      nodeIds: Array.from(visited).filter((id) => id !== nodeId),
      depth: maxReachedDepth,
      edges: resultEdges,
    };
  }

  /**
   * BFS upstream: all nodes that can reach nodeId following outgoing edges.
   */
  getUpstream(nodeId: string, maxDepth = 6): GraphTraversalResult {
    const visited = new Set<string>();
    const resultEdges: PolicyGraphEdge[] = [];
    const queue: Array<{ id: string; depth: number }> = [{ id: nodeId, depth: 0 }];
    let maxReachedDepth = 0;

    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      if (visited.has(id) || depth > maxDepth) continue;
      visited.add(id);
      maxReachedDepth = Math.max(maxReachedDepth, depth);

      for (const edgeId of this.reverseAdj.get(id) ?? []) {
        const edge = this.edges.get(edgeId)!;
        resultEdges.push(edge);
        if (!visited.has(edge.fromId)) {
          queue.push({ id: edge.fromId, depth: depth + 1 });
        }
      }
    }

    return {
      nodeIds: Array.from(visited).filter((id) => id !== nodeId),
      depth: maxReachedDepth,
      edges: resultEdges,
    };
  }

  /**
   * Find all nodes that conflict with the given policy.
   * Follows conflicts_with edges in both directions.
   */
  findConflicts(nodeId: string): PolicyGraphNode[] {
    const conflictNodeIds = new Set<string>();
    for (const edge of this.edges.values()) {
      if (edge.type !== 'conflicts_with') continue;
      if (edge.fromId === nodeId) conflictNodeIds.add(edge.toId);
      if (edge.toId === nodeId) conflictNodeIds.add(edge.fromId);
    }
    return Array.from(conflictNodeIds)
      .map((id) => this.nodes.get(id))
      .filter(Boolean) as PolicyGraphNode[];
  }

  /**
   * Compute aggregate pathway impact: GHG reduction, cost, dependencies, conflicts.
   */
  pathwayImpact(pathwayId: string): PathwayImpact {
    const pathway = this.nodes.get(pathwayId);
    if (!pathway || pathway.type !== 'pathway') {
      throw new Error(`PolicyGraph: '${pathwayId}' is not a pathway node`);
    }

    const downstream = this.getDownstream(pathwayId);
    const allNodeIds = [pathwayId, ...downstream.nodeIds];

    let totalGhg = 0;
    let totalCost = 0;
    const enabledPolicies: string[] = [];
    const dependencies: string[] = [];
    const conflicts: string[] = [];
    const milestones: Array<{ id: string; label: string; date?: string }> = [];

    for (const nodeId of allNodeIds) {
      const node = this.nodes.get(nodeId);
      if (!node) continue;
      totalGhg += node.metrics?.ghg_reduction_mt ?? 0;
      totalCost += node.metrics?.cost_cad_m ?? 0;
      if (node.type === 'policy') enabledPolicies.push(nodeId);
      if (node.type === 'milestone') milestones.push({ id: nodeId, label: node.label, date: node.effectiveDate });
    }

    for (const edge of downstream.edges) {
      if (edge.type === 'depends_on') dependencies.push(edge.toId);
      if (edge.type === 'conflicts_with') conflicts.push(edge.toId);
    }

    // Feasibility: penalise unresolved dependencies and conflicts
    const depsMet = dependencies.length === 0 ? 1 : 0.7;
    const conflictPenalty = conflicts.length > 0 ? Math.max(0, 1 - conflicts.length * 0.15) : 1;
    const feasibilityScore = depsMet * conflictPenalty;

    return {
      pathwayId,
      totalGhgReductionMt: totalGhg,
      totalCostCadM: totalCost,
      enabledPolicies,
      dependencies,
      conflicts,
      milestones,
      feasibilityScore,
    };
  }

  /**
   * Topological sort respecting depends_on edges.
   * "A depends_on B" means B must appear before A in the result.
   * Returns nodeIds in execution order: deepest dependencies first.
   * Throws if cycles detected (circular policy dependencies).
   *
   * Implementation: Kahn's algorithm on the "execution order" graph.
   * For each depends_on edge fromId→toId (fromId needs toId),
   * in the execution graph the arc is reversed: toId executes before fromId.
   * In-degree of fromId is incremented for each dependency it has.
   * Propagation: when a node N is popped (all N's dependencies satisfied),
   * decrement in-degree of every node that depends on N (reverseAdj gives us
   * all "depends_on" edges where N is the toId).
   */
  topologicalSort(): string[] {
    // inDegree[X] = number of depends_on edges where fromId=X
    // (i.e., number of un-satisfied dependencies X still has)
    const inDegree = new Map<string, number>();
    for (const id of this.nodes.keys()) inDegree.set(id, 0);

    for (const edge of this.edges.values()) {
      if (edge.type === 'depends_on') {
        // fromId depends on toId → fromId has one more unresolved prerequisite
        inDegree.set(edge.fromId, (inDegree.get(edge.fromId) ?? 0) + 1);
      }
    }

    // Start with nodes that have no dependencies
    const queue = Array.from(inDegree.entries())
      .filter(([, deg]) => deg === 0)
      .map(([id]) => id);
    const sorted: string[] = [];

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      sorted.push(nodeId);
      // nodeId is now "resolved". Decrement in-degree of nodes that depend ON nodeId.
      // These are edges of type depends_on where toId === nodeId (reverse adjacency).
      for (const edgeId of this.reverseAdj.get(nodeId) ?? []) {
        const edge = this.edges.get(edgeId)!;
        if (edge.type !== 'depends_on') continue;
        // edge.fromId depends on nodeId (edge.toId). Now that nodeId is resolved,
        // decrement fromId's dependency count.
        const newDeg = (inDegree.get(edge.fromId) ?? 0) - 1;
        inDegree.set(edge.fromId, newDeg);
        if (newDeg === 0) queue.push(edge.fromId);
      }
    }

    if (sorted.length < this.nodes.size) {
      const cycleNodes = Array.from(this.nodes.keys()).filter((id) => !sorted.includes(id));
      throw new Error(`PolicyGraph: cycle detected among nodes: ${cycleNodes.join(', ')}`);
    }
    return sorted;
  }

  // ── Serialisation ────────────────────────────────────────────────────────────

  /** Export to JSON suitable for D3 force-directed graph or vis.js. */
  exportJson(): {
    nodes: Array<PolicyGraphNode & { degree: number }>;
    edges: PolicyGraphEdge[];
  } {
    const nodes = Array.from(this.nodes.values()).map((n) => ({
      ...n,
      degree:
        (this.adjacency.get(n.id)?.size ?? 0) +
        (this.reverseAdj.get(n.id)?.size ?? 0),
    }));
    return { nodes, edges: Array.from(this.edges.values()) };
  }

  /** Import a previously exported graph (merge — does not clear existing). */
  importJson(data: {
    nodes: PolicyGraphNode[];
    edges: PolicyGraphEdge[];
  }): void {
    for (const node of data.nodes) this.addNode(node);
    for (const edge of data.edges) {
      try { this.addEdge(edge); }
      catch { /* skip if referenced nodes are missing */ }
    }
  }

  get nodeCount(): number { return this.nodes.size; }
  get edgeCount(): number { return this.edges.size; }
}

// ── Singleton graph for server-side use ────────────────────────────────────────

let _globalGraph: PolicyGraph | null = null;

export function getGlobalPolicyGraph(): PolicyGraph {
  if (!_globalGraph) {
    _globalGraph = new PolicyGraph();
    _seedDefaultPolicies(_globalGraph);
  }
  return _globalGraph;
}

export function resetGlobalPolicyGraph(): void {
  _globalGraph = null;
}

// ── Seed: Canada's key decarbonization policies (CER 2026 / PCO 2024) ─────────

function _seedDefaultPolicies(graph: PolicyGraph): void {
  // Federal framework policies
  const policies: PolicyGraphNode[] = [
    { id: 'net-zero-2050', type: 'pathway', label: 'Net-Zero 2050 Target', jurisdiction: 'CA', status: 'enacted', effectiveDate: '2021-06-29', metrics: { ghg_reduction_mt: 730, cost_cad_m: 140000 }, sourceUrl: 'https://www.canada.ca/en/services/environment/weather/climatechange/climate-plan/net-zero-emissions-2050.html', trustTier: 1 },
    { id: 'clean-electricity-regs', type: 'policy', label: 'Clean Electricity Regulations', jurisdiction: 'CA', status: 'enacted', effectiveDate: '2024-08-15', metrics: { ghg_reduction_mt: 340, cost_cad_m: 45000 }, sourceUrl: 'https://www.canada.ca/en/environment-climate-change/news/2024/08/clean-electricity-regulations.html', trustTier: 1 },
    { id: 'carbon-pricing', type: 'policy', label: 'Federal Carbon Pollution Pricing', jurisdiction: 'CA', status: 'enacted', effectiveDate: '2019-01-01', metrics: { ghg_reduction_mt: 90, cost_cad_m: 0 }, sourceUrl: 'https://www.canada.ca/en/environment-climate-change/services/climate-change/pricing-pollution-how-it-will-work.html', trustTier: 1 },
    { id: 'oil-gas-cap', type: 'policy', label: 'Oil & Gas Sector Emissions Cap', jurisdiction: 'CA', status: 'proposed', effectiveDate: '2030-01-01', metrics: { ghg_reduction_mt: 35, cost_cad_m: 5000 }, trustTier: 1 },
    { id: 'zev-mandate', type: 'policy', label: 'Zero-Emission Vehicle Mandate (2035)', jurisdiction: 'CA', status: 'enacted', effectiveDate: '2024-01-01', metrics: { ghg_reduction_mt: 62, cost_cad_m: 10000 }, sourceUrl: 'https://tc.canada.ca/en/road-transportation/innovative-technologies/zero-emission-vehicles', trustTier: 1 },
    { id: 'clean-fuel-regs', type: 'policy', label: 'Clean Fuel Regulations', jurisdiction: 'CA', status: 'enacted', effectiveDate: '2022-07-01', metrics: { ghg_reduction_mt: 26, cost_cad_m: 2500 }, trustTier: 1 },
    { id: 'smart-renewables', type: 'policy', label: 'Smart Renewables & Electrification Pathways Program', jurisdiction: 'CA', status: 'enacted', effectiveDate: '2022-04-01', metrics: { ghg_reduction_mt: 5, cost_cad_m: 1560 }, trustTier: 1 },
    // Technologies
    { id: 'tech-smr', type: 'technology', label: 'Small Modular Reactors', jurisdiction: 'CA', status: 'projected', metrics: { ghg_reduction_mt: 25, cost_cad_m: 20000 }, trustTier: 2 },
    { id: 'tech-ccs', type: 'technology', label: 'Carbon Capture & Storage', jurisdiction: 'CA', status: 'enacted', metrics: { ghg_reduction_mt: 15, cost_cad_m: 8000 }, trustTier: 2 },
    { id: 'tech-green-h2', type: 'technology', label: 'Green Hydrogen Production', jurisdiction: 'CA', status: 'proposed', metrics: { ghg_reduction_mt: 40, cost_cad_m: 12000 }, trustTier: 2 },
    // Barriers
    { id: 'barrier-grid-capacity', type: 'barrier', label: 'Transmission Grid Capacity', jurisdiction: 'CA', metrics: {}, trustTier: 1 },
    { id: 'barrier-permitting', type: 'barrier', label: 'Project Permitting & Approval Delays', jurisdiction: 'CA', metrics: {}, trustTier: 1 },
    // Provincial
    { id: 'ab-tech-innovation', type: 'policy', label: 'Alberta Technology Innovation & Emissions Reduction Regulation', jurisdiction: 'CA-AB', status: 'enacted', effectiveDate: '2020-01-01', metrics: { ghg_reduction_mt: 12, cost_cad_m: 0 }, sourceUrl: 'https://www.alberta.ca/technology-innovation-and-emissions-reduction-regulation', trustTier: 1 },
  ];

  for (const n of policies) graph.addNode(n);

  // Policy relationships
  const edges: PolicyGraphEdge[] = [
    { id: 'e1', fromId: 'carbon-pricing', toId: 'net-zero-2050', type: 'contributes_to', weight: 0.5 },
    { id: 'e2', fromId: 'clean-electricity-regs', toId: 'net-zero-2050', type: 'contributes_to', weight: 0.7 },
    { id: 'e3', fromId: 'zev-mandate', toId: 'net-zero-2050', type: 'contributes_to', weight: 0.4 },
    { id: 'e4', fromId: 'clean-fuel-regs', toId: 'net-zero-2050', type: 'contributes_to', weight: 0.2 },
    { id: 'e5', fromId: 'oil-gas-cap', toId: 'net-zero-2050', type: 'contributes_to', weight: 0.3 },
    { id: 'e6', fromId: 'carbon-pricing', toId: 'tech-green-h2', type: 'enables', weight: 0.6 },
    { id: 'e7', fromId: 'smart-renewables', toId: 'clean-electricity-regs', type: 'enables', weight: 0.8 },
    { id: 'e8', fromId: 'tech-ccs', toId: 'oil-gas-cap', type: 'enables', weight: 0.7 },
    { id: 'e9', fromId: 'clean-electricity-regs', toId: 'tech-smr', type: 'enables', weight: 0.5 },
    { id: 'e10', fromId: 'barrier-grid-capacity', toId: 'clean-electricity-regs', type: 'impedes', weight: 0.6 },
    { id: 'e11', fromId: 'barrier-permitting', toId: 'tech-smr', type: 'impedes', weight: 0.7 },
    { id: 'e12', fromId: 'barrier-permitting', toId: 'tech-green-h2', type: 'impedes', weight: 0.5 },
    { id: 'e13', fromId: 'ab-tech-innovation', toId: 'oil-gas-cap', type: 'conflicts_with', weight: 0.4 },
    { id: 'e14', fromId: 'zev-mandate', toId: 'tech-green-h2', type: 'accelerates', weight: 0.4 },
  ];

  for (const e of edges) {
    try { graph.addEdge(e); } catch { /* skip if nodes are missing */ }
  }
}
