import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    // jsdom tests need a real URL: opaque origins (about:blank) make
    // localStorage a getter that throws SecurityError, which surfaces as
    // `localStorage.clear is not a function` in jsdom 29.
    environmentOptions: {
      jsdom: { url: 'http://localhost/' },
    },
    globals: true,
    include: ['tests/unit/**/*.test.ts'],
    setupFiles: ['tests/setup/vitest.setup.ts'],
    clearMocks: true,
    restoreMocks: true,
    // Some tests spawn Node.js child processes (scripts/*.mjs) which can
    // take 10-60s each under parallel coverage load; a test file can queue
    // several spawns serially. 120s matches the strategy-audit-slice
    // convention (--testTimeout=120000) and covers the governance-script
    // suite without masking genuinely hung tests.
    testTimeout: 120_000,
    hookTimeout: 60_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: [
        'src/lib/**/*.ts',
        'src/components/**/*.tsx',
        'src/instrumentation/**/*.ts',
        // Server-side security paths are critical coverage targets (Codex G18).
        'netlify/functions/**/*.ts',
        'supabase/functions/**/*.ts',
      ],
      exclude: ['src/**/*.test.*', 'src/**/*.d.ts', 'src/**/index.ts', 'netlify/**/*.test.*', 'supabase/**/*.test.*'],
      // Re-measured after widening `include` to server-side functions
      // (netlify/functions/**, supabase/functions/**): full serial run
      // 2026-10-07 — 168/168 files, 1186/1186 tests, 21.42% lines.
      // The floor sits just under the measurement; raise as coverage grows.
      thresholds: { lines: 21 },
    },
  },
});
