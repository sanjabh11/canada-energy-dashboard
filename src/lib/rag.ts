// src/lib/rag.ts
// RAG (Retrieval-Augmented Generation) helpers for LLM endpoints

export interface Snippet {
  text: string;
  context?: string;
}

/**
 * Builds small snippet array from numeric summary and sample rows for provenance depth
 */
export function buildSnippets(rows: any[], numericSummary: any, maxSnippets = 3): Snippet[] {
  const out: Snippet[] = [];
  try {
    // Include one numeric metric if available
    const cols = Object.entries((numericSummary?.columns || {})) as Array<[string, any]>;
    const metric = cols.find(([, v]) => v && typeof v.mean === 'number');
    if (metric) {
      const [name, v] = metric;
      out.push({ text: `${name} mean ≈ ${Number(v.mean).toFixed(2)} (n=${v.count})`, context: 'numeric_summary' });
    }
    // Include up to (maxSnippets-1) sample rows as compact JSON lines
    const take = Math.max(0, maxSnippets - out.length);
    for (let i = 0; i < Math.min(take, rows.length); i++) {
      const r = rows[i];
      out.push({ text: JSON.stringify(r).slice(0, 240), context: 'sample_row' });
    }
  } catch (_) { /* noop */ }
  return out;
}

/**
 * Redacts PII from data and provides a summary of redactions
 */
export function redactPIIWithSummary(input: unknown): { redacted: any; summary: Record<string, number> } {
  const summary: Record<string, number> = { emails: 0, phones: 0, numbers: 0 };
  const redactText = (txt: string) => {
    let out = txt;
    // Email addresses
    out = out.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, () => { summary.emails++; return '[redacted-email]'; });
    // Phone numbers (very loose)
    out = out.replace(/\b(?:\+?\d[\s-]?){7,15}\b/g, (m) => {
      // Avoid replacing years like 2024 isolated; require at least 7 digits overall
      const digits = (m.match(/\d/g) || []).length;
      if (digits >= 7) { summary.phones++; return '[redacted-phone]'; }
      return m;
    });
    // Long numeric sequences (account-like)
    out = out.replace(/\b\d{6,}\b/g, () => { summary.numbers++; return '[redacted-number]'; });
    return out;
  };
  const walk = (val: any): any => {
    if (val == null) return val;
    if (typeof val === 'string') return redactText(val);
    if (Array.isArray(val)) return val.map(walk);
    if (typeof val === 'object') {
      const o: Record<string, any> = {};
      for (const k of Object.keys(val)) o[k] = walk(val[k]);
      return o;
    }
    return val;
  };
  const redacted = walk(input);
  return { redacted, summary };
}

/**
 * Computes rough token/cost estimator based on character count
 */
export function calcTokenCost(messages: Array<{ role: string; content: string }>): { tokens: number; usd: number } {
  try {
    const COST_PER_1K = 0; // Placeholder, update with actual cost
    const text = messages.map(m => m.content || '').join('\n');
    const approxTokens = Math.ceil(text.length / 4); // ~4 chars per token heuristic
    const usd = (approxTokens / 1000) * COST_PER_1K;
    return { tokens: approxTokens, usd: Number(usd.toFixed(6)) };
  } catch (_) {
    return { tokens: 0, usd: 0 };
  }
}
