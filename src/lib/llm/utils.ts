// LLM Client Utilities
// Helper functions for LLM client operations

import type { LlmResponseMeta } from './types';

function isEnvFlagEnabled(name: string): boolean {
  return String((import.meta as any)?.env?.[name] || '').toLowerCase() === 'true';
}

export function orderCandidates(primary: string, fallback: string): string[] {
  const liteEnabled = isEnvFlagEnabled('VITE_LLM_LITE_ENABLED');
  if (!liteEnabled) {
    return [primary];
  }

  const preferLite = isEnvFlagEnabled('VITE_LLM_PREFER_LITE');
  const candidates = preferLite ? [fallback, primary] : [primary, fallback];

  return Array.from(new Set(candidates));
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
