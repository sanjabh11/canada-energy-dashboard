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
    globals: true,
    include: ['tests/unit/**/*.test.ts'],
    setupFiles: ['tests/setup/vitest.setup.ts'],
    clearMocks: true,
    restoreMocks: true,
    // Some tests spawn Node.js child processes (scripts/*.mjs) which can
    // take 10-30s under parallel worker load. 60s covers all spawn-based
    // tests without affecting the fast unit tests (<100ms each).
    testTimeout: 60_000,
    hookTimeout: 60_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/lib/**/*.ts', 'src/components/**/*.tsx'],
      exclude: ['src/**/*.test.*', 'src/**/*.d.ts', 'src/**/index.ts'],
      thresholds: { lines: 45 },
    },
  },
});
