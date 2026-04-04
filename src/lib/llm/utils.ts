// LLM Client Utilities
// Helper functions for LLM client operations

import type { LlmResponseMeta } from './types';

const preferLite = String((import.meta as any)?.env?.VITE_LLM_PREFER_LITE || '').toLowerCase() === 'true';

export function orderCandidates(primary: string, fallback: string): string[] {
  return preferLite ? [fallback, primary] : [primary, fallback];
}

export function attachMeta<T>(json: unknown, payload: T): T {
  const meta = json && typeof json === 'object' && 'meta' in json ? (json as { meta?: LlmResponseMeta }).meta : undefined;
  if (!meta || !payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return payload;
  }

  return { ...(payload as object), meta } as T;
}

export function attachMetaToArray<T>(json: unknown, payload: T[]): T[] {
  const meta = json && typeof json === 'object' && 'meta' in json ? (json as { meta?: LlmResponseMeta }).meta : undefined;
  return meta ? Object.assign(payload, { meta }) : payload;
}
