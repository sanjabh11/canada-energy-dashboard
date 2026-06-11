/**
 * B05 – Connector Registry Bootstrap
 *
 * Imports all official data connectors and registers them in the
 * global connector registry. Import this file in Edge Functions
 * and any scheduled ingestion triggers.
 *
 * Usage:
 *   import { registerAll, listConnectors, runConnector } from './connectors/registry.ts';
 *   registerAll();
 *   await runConnector('statcan-wds', supabaseClient);
 */

import { registerConnector, listConnectors, runConnector, getConnector } from './index.ts';
import { StatCanConnector } from './statcan.ts';
import { CerConnector } from './cer.ts';
import { EcccNpriConnector } from './ecccNpri.ts';
import { AesoConnector } from './aeso.ts';
import { IesoConnector } from './ieso.ts';

export { listConnectors, runConnector, getConnector };

let _registered = false;

/**
 * Register all built-in connectors.
 * Safe to call multiple times — idempotent after first call.
 */
export function registerAll(): void {
  if (_registered) return;
  _registered = true;

  // Annual / quasi-static sources
  registerConnector(new StatCanConnector());
  registerConnector(new CerConnector());
  registerConnector(new EcccNpriConnector());

  // Near-real-time sources (daily refresh)
  registerConnector(new AesoConnector(
    typeof process !== 'undefined' ? process.env['AESO_API_KEY'] : undefined,
  ));
  registerConnector(new IesoConnector());

  console.info(
    `[ConnectorRegistry] Registered ${listConnectors().length} connectors: ` +
    listConnectors().map((c) => c.id).join(', '),
  );
}

/**
 * Run all connectors in sequence.
 * For production, prefer parallel invocation with per-connector
 * Supabase Edge Functions to respect per-function memory limits.
 */
export async function runAll(supabaseClient: unknown): Promise<void> {
  registerAll();
  const connectors = listConnectors();
  for (const meta of connectors) {
    try {
      const result = await runConnector(meta.id, supabaseClient);
      console.info(`[runAll] ${meta.id}: ${result.status} (${result.records_upserted} upserted)`);
    } catch (err) {
      console.error(`[runAll] ${meta.id} threw:`, err);
    }
  }
}

/**
 * Freshness report for all connectors.
 * Caller provides lastRunAt map keyed by connector id.
 */
export function freshnessReport(lastRunMap: Record<string, string | null>): Array<{
  id: string;
  name: string;
  status: string;
  ageHours: number | null;
  isWithinSLA: boolean;
  message: string;
}> {
  registerAll();
  return listConnectors().map((meta) => {
    const connector = getConnector(meta.id);
    if (!connector) return { id: meta.id, name: meta.name, status: 'unknown', ageHours: null, isWithinSLA: false, message: 'Not found in registry' };
    const result = connector.freshnessCheck(lastRunMap[meta.id] ?? null);
    return { id: meta.id, name: meta.name, ...result };
  });
}
