import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    // Generated output — never source. `coverage/lcov-report/*.js` was
    // counted in the lint-warning baseline, making the ratchet depend on
    // whether a coverage report happened to be on disk. Test/build artifacts
    // must stay out of the baseline.
    ignores: [
      'dist',
      'coverage',
      'playwright-report',
      'playwright-report-*',
      'test-results',
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      // eslint-plugin-react-hooks v7 / ESLint 10 compiler diagnostics: ratcheted
      // to warn so the pre-upgrade zero-error baseline stays enforced while the
      // findings stay visible for incremental cleanup (110 findings, 2026-10-04).
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'no-useless-assignment': 'warn',
      'preserve-caught-error': 'warn',
    },
  },
)
