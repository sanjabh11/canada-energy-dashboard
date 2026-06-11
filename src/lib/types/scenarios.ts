/**
 * CEIP Futures Workbench Scenario Core Typings
 * 
 * Defines the canonical types for versioned scenarios, assumption packs,
 * scenario runs, outcomes, and evidence sources.
 */

export type TrustTier =
  | 'official_historical'
  | 'official_projection'
  | 'proxy'
  | 'simulated'
  | 'demo'
  | 'stale';

export interface EvidenceSource {
  id: string;
  title: string;
  publisher: string;
  sourceUrl?: string;
  sourceType: string;
  retrievedAt: string;
  sourceUpdatedAt?: string;
  freshnessStatus: string;
  isFallback: boolean;
  licenseNotes?: string;
  trustTier: TrustTier;
  evidenceHash?: string;
}

export interface Scenario {
  id: string;
  name: string;
  description?: string;
  jurisdiction: string; // e.g. "Ontario", "Alberta", "Canada"
  horizonYears: number[]; // e.g. [2026, 2030, 2035, 2040, 2050]
  sectors: string[]; // e.g. ["electricity", "transportation", "buildings", "industry"]
  technologies: string[]; // e.g. ["wind", "solar", "nuclear", "gas", "storage", "hydro"]
  policyLevers: Record<string, unknown>; // Levers like carbon pricing, clean electricity standards
  macroAssumptions: Record<string, unknown>; // GDP, population growth
  demandAssumptions: Record<string, unknown>; // EV growth rates, heat pump rates, load growths
  reliabilityAssumptions: Record<string, unknown>; // reserve margins, capacity buffers
  affordabilityAssumptions: Record<string, unknown>; // pricing rules
  createdBy?: string;
  createdAt: string;
}

export interface AssumptionPack {
  id: string;
  version: string;
  name: string;
  description?: string;
  citations: Array<{
    title: string;
    url?: string;
    publisher: string;
    date?: string;
  }>;
  owner: string;
  createdAt: string;
  isDefault: boolean;
  reproducibilityHash: string;
  assumptions: Record<string, unknown>;
}

export interface ScenarioRun {
  id: string;
  scenarioId: string;
  assumptionPackId: string;
  modelVersions: Record<string, string>;
  inputHashes: string;
  randomSeed: number;
  runStatus: 'pending' | 'completed' | 'failed';
  warnings: string[];
  outcomeSeriesPointers: string[];
  createdAt: string;
  completedAt?: string;
}

export interface OutcomeSeries {
  id: string;
  runId: string;
  metric: string; // e.g. "electricity_demand", "ghg_emissions", "cost_of_service"
  geography: string; // e.g. "AB", "ON", "CAN"
  sector: string; // e.g. "electricity", "transportation"
  fuel?: string; // e.g. "natural_gas", "electricity", "hydrogen"
  technology?: string; // e.g. "wind", "ccus", "smr"
  unit: string; // e.g. "MWh", "tCO2e", "CAD/MWh"
  years: number[];
  values: number[];
  uncertaintyLower?: number[];
  uncertaintyUpper?: number[];
  provenanceId?: string;
}
