import { z } from 'zod';

export const TrustTierSchema = z.enum([
  'official_historical',
  'official_projection',
  'proxy',
  'simulated',
  'demo',
  'stale',
]);

export const EvidenceSourceSchema = z.object({
  id: z.string(),
  title: z.string(),
  publisher: z.string(),
  sourceUrl: z.string().url().optional(),
  sourceType: z.string(),
  retrievedAt: z.string().datetime(),
  sourceUpdatedAt: z.string().datetime().optional(),
  freshnessStatus: z.string(),
  isFallback: z.boolean(),
  licenseNotes: z.string().optional(),
  trustTier: TrustTierSchema,
  evidenceHash: z.string().optional(),
});

export const ScenarioSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Scenario name is required'),
  description: z.string().optional(),
  jurisdiction: z.string(),
  horizonYears: z.array(z.number().int().min(2020).max(2100)),
  sectors: z.array(z.string()),
  technologies: z.array(z.string()),
  policyLevers: z.record(z.any()),
  macroAssumptions: z.record(z.any()),
  demandAssumptions: z.record(z.any()),
  reliabilityAssumptions: z.record(z.any()),
  affordabilityAssumptions: z.record(z.any()),
  createdBy: z.string().optional(),
  createdAt: z.string().datetime(),
});

export const AssumptionPackSchema = z.object({
  id: z.string(),
  version: z.string(),
  name: z.string().min(1, 'Pack name is required'),
  description: z.string().optional(),
  citations: z.array(
    z.object({
      title: z.string(),
      url: z.string().url().optional(),
      publisher: z.string(),
      date: z.string().optional(),
    })
  ),
  owner: z.string(),
  createdAt: z.string().datetime(),
  isDefault: z.boolean(),
  reproducibilityHash: z.string(),
  assumptions: z.record(z.any()),
});

export const ScenarioRunSchema = z.object({
  id: z.string(),
  scenarioId: z.string(),
  assumptionPackId: z.string(),
  modelVersions: z.record(z.string()),
  inputHashes: z.string(),
  randomSeed: z.number().int(),
  runStatus: z.enum(['pending', 'completed', 'failed']),
  warnings: z.array(z.string()),
  outcomeSeriesPointers: z.array(z.string()),
  createdAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
});

export const OutcomeSeriesSchema = z.object({
  id: z.string(),
  runId: z.string(),
  metric: z.string(),
  geography: z.string(),
  sector: z.string(),
  fuel: z.string().optional(),
  technology: z.string().optional(),
  unit: z.string(),
  years: z.array(z.number().int()),
  values: z.array(z.number()),
  uncertaintyLower: z.array(z.number()).optional(),
  uncertaintyUpper: z.array(z.number()).optional(),
  provenanceId: z.string().optional(),
});

/**
 * Calculates a deterministic SHA-256 hash of any JSON-serializable object.
 * Useful for validating reproducibility of scenario configurations and inputs.
 */
export async function calculateConfigHash(obj: Record<string, unknown>): Promise<string> {
  // Order keys deterministically before hashing
  const sortKeys = (input: any): any => {
    if (input === null || typeof input !== 'object') return input;
    if (Array.isArray(input)) return input.map(sortKeys);
    
    return Object.keys(input)
      .sort()
      .reduce((acc, key) => {
        acc[key] = sortKeys(input[key]);
        return acc;
      }, {} as Record<string, any>);
  };

  const sorted = sortKeys(obj);
  const serialized = JSON.stringify(sorted);
  const msgBuffer = new TextEncoder().encode(serialized);
  
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}
