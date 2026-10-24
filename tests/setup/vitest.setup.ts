import WebSocket from 'ws';

/**
 * Clean-clone safety net — MUST run before any test module is imported
 * (setupFiles execute before each test file's module graph is evaluated).
 *
 * src/lib/supabaseClient.ts calls `createClient(url, anonKey)` at module top,
 * and supabase-js throws `supabaseUrl is required` when both are empty — which
 * kills `vitest run` on a clean clone with no .env. Inject obviously-fake,
 * never-real-looking fallbacks ONLY when the variable is unset or empty; real
 * developer/CI env values always win. Hosts use the `.invalid` TLD (RFC 2606)
 * so an accidental network call can never resolve, and the anon key is a
 * self-describing non-secret string, not a JWT.
 */
const SYNTHETIC_TEST_ENV: Record<string, string> = {
  VITE_SUPABASE_URL: 'https://synthetic-supabase.invalid',
  VITE_SUPABASE_ANON_KEY: 'synthetic-anon-key-not-a-secret',
  VITE_PUBLIC_APP_URL: 'https://app.invalid',
  VITE_UTILITY_CONNECTOR_BASE_URL: 'https://connector.invalid',
};

// import.meta.env under vite-node is a shared object populated from
// process.env; set both so module-level `const env = import.meta.env` reads
// and process.env fallbacks agree on every code path.
const importMetaEnv = import.meta.env as Record<string, string | undefined>;
for (const [key, value] of Object.entries(SYNTHETIC_TEST_ENV)) {
  if (!importMetaEnv[key]) importMetaEnv[key] = value;
  if (!process.env[key]) process.env[key] = value;
}

// jsdom under Vitest 4 exposes localStorage as a bare object without the
// Storage API; install a functional in-memory Storage so DOM tests work.
if (
  typeof localStorage === 'undefined' ||
  typeof localStorage.clear !== 'function'
) {
  class MemoryStorage implements Storage {
    private data = new Map<string, string>();
    get length() { return this.data.size; }
    clear() { this.data.clear(); }
    getItem(key: string) { return this.data.has(key) ? this.data.get(key)! : null; }
    key(index: number) { return [...this.data.keys()][index] ?? null; }
    removeItem(key: string) { this.data.delete(key); }
    setItem(key: string, value: string) { this.data.set(key, String(value)); }
  }
  const storage = new MemoryStorage();
  Object.defineProperty(globalThis, 'localStorage', {
    value: storage,
    configurable: true,
    writable: true,
  });
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'localStorage', {
      value: storage,
      configurable: true,
      writable: true,
    });
  }
}

if (typeof globalThis.WebSocket === 'undefined') {
  Object.defineProperty(globalThis, 'WebSocket', {
    value: WebSocket,
    configurable: true,
  });
}
