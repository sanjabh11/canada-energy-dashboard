// Shared TIER simulator request core — the decision path behind the
// tier-simulator edge handler, expressed against a minimal database
// interface so tests can mock persistence at the handler boundary and the
// edge entrypoint stays a thin HTTP adapter. No Deno/env imports here.

import {
  calculateTierScenario,
  fillTierPriceDefaultsFromRates,
  tierPricesFullySupplied,
} from "./mlForecasting.ts";
import { sanitizeTierInputPayload } from "./tierInputSanitize.ts";

export const TIER_MARKET_RATE_ROW_LIMIT = 5;
export const TIER_MAX_PERSISTED_PAYLOAD_BYTES = 65536;

/** Minimal persistence surface the handler needs — mockable in tests. */
export interface TierScenarioDb {
  listTierMarketRates(limit: number): Promise<{
    data: Array<Record<string, unknown>> | null;
    error: { message?: string } | null;
  }>;
  insertMlAlertEvaluation(row: Record<string, unknown>): Promise<{
    error: { message?: string; code?: string } | null;
  }>;
}

export interface TierScenarioRun {
  result: ReturnType<typeof calculateTierScenario>;
  /** Message of the failed persistence insert, or null when persisted/skipped. */
  insertErrorMessage: string | null;
}

/**
 * Resolve caller TIER input against tier_market_rates (per-field fill with
 * per-price provenance), run the deterministic engine, then persist the
 * evaluation with an allowlisted input payload and a byte-bounded result
 * payload. Database failures degrade to computed defaults or a skipped
 * insert — never to a thrown request — and are reported via
 * insertErrorMessage/log so silent staleness stays observable.
 */
export async function runTierScenario(
  body: Record<string, unknown>,
  db: TierScenarioDb | null,
): Promise<TierScenarioRun> {
  // Decide DB access on the RAW caller values — checking after a null-fill
  // would let baked-in defaults masquerade as caller prices and skip the
  // rate table entirely. The fill itself canonicalizes containers.
  let resolvedBody: Record<string, unknown>;
  if (db && !tierPricesFullySupplied(body)) {
    let rows: Array<Record<string, unknown>> | null = null;
    try {
      const response = await db.listTierMarketRates(TIER_MARKET_RATE_ROW_LIMIT);
      if (response.error) {
        // Silent degradation must still be observable — defaults are the
        // designed fallback, but a dead rate table must not fail invisibly.
        console.error("tier_market_rates read failed:", response.error.message ?? response.error);
      } else {
        rows = response.data;
      }
    } catch (err) {
      console.error("tier_market_rates read threw:", err instanceof Error ? err.message : err);
    }
    resolvedBody = fillTierPriceDefaultsFromRates(body, rows);
  } else {
    resolvedBody = fillTierPriceDefaultsFromRates(body, null);
  }

  const result = calculateTierScenario(resolvedBody);

  let insertErrorMessage: string | null = null;
  if (db) {
    // Result payload must stay bounded regardless of what the engine
    // receives — a serialized payload over the byte cap is replaced by a
    // bounded marker rather than persisted raw.
    const resultBytes = new TextEncoder().encode(JSON.stringify(result)).length;
    const { error } = await db.insertMlAlertEvaluation({
      alert_type: "tier_simulator",
      province: "AB",
      subject_key: "tier_pathway",
      input_payload: sanitizeTierInputPayload(resolvedBody),
      result_payload:
        resultBytes <= TIER_MAX_PERSISTED_PAYLOAD_BYTES
          ? result
          : { error: "result_payload_oversize", model_version: result.meta?.model_version ?? "tier-deterministic-v1" },
      claim_label: result.meta.claim_label ?? "estimated",
      confidence_score: result.meta.confidence_score,
      warnings: result.warnings,
    });
    insertErrorMessage = error ? String(error.message ?? error).slice(0, 300) : null;
  }

  return { result, insertErrorMessage };
}
