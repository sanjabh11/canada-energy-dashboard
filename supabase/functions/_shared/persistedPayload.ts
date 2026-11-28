// Bounds for untrusted data written to ml_alert_evaluations. A caller
// payload can carry arbitrarily deep, long or non-serializable content;
// persisted records get a generic recursive bound (string/array/object/key
// caps) plus a serialized byte cap so a hostile body cannot write unbounded
// or non-JSONB-safe content into the evaluation table. Endpoint-specific
// allowlists (see tierInputSanitize.ts) stay stricter where a schema exists.

const MAX_PERSISTED_STRING = 512;
const MAX_PERSISTED_ARRAY = 100;
const MAX_PERSISTED_KEYS = 64;
const MAX_PERSISTED_KEY_CHARS = 128;
const MAX_PERSISTED_DEPTH = 6;
export const MAX_PERSISTED_PAYLOAD_BYTES = 65536;

/**
 * Recursively bound a JSON-ish value for persistence: strings are truncated,
 * arrays are capped, object keys/depth are capped, non-finite numbers become
 * null, and non-JSON-safe types (bigint, symbol, function, undefined) are
 * dropped so JSON.stringify cannot throw on the result.
 */
export function sanitizeBoundedJson(value: unknown, depth = 0): unknown {
  if (value == null) return null;
  switch (typeof value) {
    case "string":
      return value.slice(0, MAX_PERSISTED_STRING);
    case "number":
      return Number.isFinite(value) ? value : null;
    case "boolean":
      return value;
    case "object":
      break;
    default:
      return null;
  }
  if (depth >= MAX_PERSISTED_DEPTH) return "[truncated:depth]";
  if (Array.isArray(value)) {
    return value.slice(0, MAX_PERSISTED_ARRAY).map((entry) => sanitizeBoundedJson(entry, depth + 1));
  }
  const out: Record<string, unknown> = {};
  let count = 0;
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (count >= MAX_PERSISTED_KEYS) break;
    out[String(key).slice(0, MAX_PERSISTED_KEY_CHARS)] = sanitizeBoundedJson(entry, depth + 1);
    count += 1;
  }
  return out;
}

/**
 * Final persistence gate: byte-check the sanitized payload and replace
 * anything over the cap with a bounded marker rather than persisting raw.
 */
export function boundedPersistedPayload(value: unknown, maxBytes = MAX_PERSISTED_PAYLOAD_BYTES): unknown {
  const sanitized = sanitizeBoundedJson(value);
  const bytes = new TextEncoder().encode(JSON.stringify(sanitized ?? null)).length;
  return bytes <= maxBytes ? sanitized : { error: "payload_oversize" };
}
