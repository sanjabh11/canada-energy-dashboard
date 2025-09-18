// tests/cloud_health.mjs
import fs from 'node:fs';

function parseDotEnv(text) {
  const out = {};
  const lines = text.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith('\'') && val.endsWith('\''))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

let ENV_FILE = {};
try {
  const buf = fs.readFileSync(new URL('../.env', import.meta.url), 'utf8');
  ENV_FILE = parseDotEnv(buf);
} catch {}

const BASE = process.env.VITE_SUPABASE_EDGE_BASE || ENV_FILE.VITE_SUPABASE_EDGE_BASE || 'https://qnymbecjgeaoxsfphrti.functions.supabase.co';
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || ENV_FILE.VITE_SUPABASE_ANON_KEY || '';

const headers = {};
if (ANON_KEY) {
  headers['Authorization'] = `Bearer ${ANON_KEY}`;
  headers['apikey'] = ANON_KEY;
}

const url = `${BASE.replace(/\/$/, '')}/llm/health`;

try {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  const resp = await fetch(url, { headers, signal: controller.signal });
  clearTimeout(timeoutId);
  console.log(resp.status, resp.url);
  if (!resp.ok) {
    const text = await resp.text();
    console.error(text);
    process.exit(1);
  }
  process.exit(0);
} catch (e) {
  console.error('Health request failed:', e.message || e);
  process.exit(2);
}
