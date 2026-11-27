/**
 * Bounded streaming body reader for unauthenticated edge endpoints.
 * Reads request bytes incrementally and cancels on overflow — a missing or
 * misleading Content-Length (or no cap on req.text()) must never let an
 * oversized body be fully buffered before the limit is enforced.
 * Pure Web APIs so it is unit-testable outside Deno.
 */

export type BoundedBodyResult = {
  ok: boolean;
  text?: string;
  reason?: "too_large" | "read_failed";
};

export async function readBoundedBody(req: Request, maxBytes: number): Promise<BoundedBodyResult> {
  const body = req.body;
  if (body == null) return { ok: true, text: "" };
  const chunks: Uint8Array[] = [];
  let total = 0;
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    // getReader() throws synchronously on an already-disturbed body — keep it
    // inside the result contract rather than letting a TypeError escape.
    reader = body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value && value.byteLength > 0) {
        total += value.byteLength;
        if (total > maxBytes) {
          // Cancel immediately — do not buffer the remainder.
          await reader.cancel().catch(() => {});
          return { ok: false, reason: "too_large" };
        }
        chunks.push(value);
      }
    }
  } catch {
    await reader?.cancel().catch(() => {});
    return { ok: false, reason: "read_failed" };
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { ok: true, text: new TextDecoder().decode(merged) };
}

/** Shared byte cap for public request bodies (JSON payloads are small). */
export const MAX_PUBLIC_BODY_BYTES = 65536;

export type BoundedJsonResult = {
  ok: boolean;
  json?: unknown;
  reason?: "too_large" | "read_failed" | "malformed_json";
};

/**
 * Bounded read + JSON parse for unauthenticated endpoints. `malformed_json`
 * keeps the historical `.catch(() => ({}))` semantics explicit so callers can
 * map reasons to status codes (413 for overflow, 400 otherwise).
 */
export async function readBoundedJson(req: Request, maxBytes = MAX_PUBLIC_BODY_BYTES): Promise<BoundedJsonResult> {
  const res = await readBoundedBody(req, maxBytes);
  if (!res.ok) return { ok: false, reason: res.reason };
  const text = res.text ?? "";
  if (text.trim() === "") return { ok: true, json: {} };
  try {
    return { ok: true, json: JSON.parse(text) };
  } catch {
    return { ok: false, reason: "malformed_json" };
  }
}

/**
 * Object-shape gate for JSON endpoints: a parsed body is only usable when it
 * is a plain JSON object. `null`, arrays, and scalars are rejected instead of
 * being cast to a record — destructuring `null` throws and array/scalar
 * member reads silently yield undefined, both of which blur the contract.
 * Returns the record, or null when the shape is unacceptable.
 */
export function asJsonObject(json: unknown): Record<string, any> | null {
  if (json == null || typeof json !== "object" || Array.isArray(json)) return null;
  return json as Record<string, any>;
}
