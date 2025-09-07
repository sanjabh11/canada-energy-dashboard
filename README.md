# Canada Energy Dashboard (Phase 3 - COMPLETE)

A comprehensive real-time energy data visualization platform for Canadian energy systems, featuring streaming data integration, AI-powered analytics, and educational insights.

## 🚀 **Latest Implementation Status (Phase 3 - 4.7/5 Complete)**

### ✅ **COMPLETED FEATURES**
- **Real-time Streaming Data**: Ontario IESO demand, Alberta AESO market data, Provincial generation mix, European smart meter data
- **AI-Powered Analytics**: LLM integration for chart explanations, transition reports, and data quality assessments
- **Educational Help System**: 24+ comprehensive help entries covering all dashboard features
- **Advanced UI Components**: Interactive charts, real-time status indicators, data quality panels
- **Resilient Architecture**: Fallback systems, caching, error handling, and health monitoring
- **Security**: Removed sensitive tokens, proper .gitignore configuration

### 🔧 **CORE FUNCTIONALITY**
- **Live Data Streaming**: Real-time energy market data from authoritative sources
- **Interactive Dashboard**: 4-panel layout with Ontario demand, generation mix, Alberta markets, and weather correlation
- **Investment Analysis**: NPV/IRR calculations with dynamic market data integration
- **Compliance Monitoring**: Regulatory compliance tracking with AI remediation guidance
- **Infrastructure Resilience**: Climate scenario modeling and risk assessment
- **Indigenous Sovereignty**: Territory mapping with governance-compliant data handling
- **Stakeholder Management**: Multi-stakeholder coordination and consultation tracking

### 📊 **TECHNICAL ACHIEVEMENTS**
- **Streaming Architecture**: Supabase Edge Functions with real-time SSE connections
- **Data Integration**: Multiple authoritative data sources (IESO, AESO, ECCC, Kaggle, HuggingFace)
- **AI Integration**: Gemini-powered analytics and educational insights
- **Performance**: Optimized caching, IndexedDB storage, and background sync
- **Security**: Enterprise-grade authentication and data protection
- **Scalability**: Cloud-native architecture with automatic scaling

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default tseslint.config({
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

- Replace `tseslint.configs.recommended` to `tseslint.configs.recommendedTypeChecked` or `tseslint.configs.strictTypeChecked`
- Optionally add `...tseslint.configs.stylisticTypeChecked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and update the config:

```js
// eslint.config.js
import react from 'eslint-plugin-react'

export default tseslint.config({
  // Set the react version
  settings: { react: { version: '18.3' } },
  plugins: {
    // Add the react plugin
    react,
  },
  rules: {
    // other rules...
    // Enable its recommended rules
    ...react.configs.recommended.rules,
    ...react.configs['jsx-runtime'].rules,
  },
})
```

---

# Energy Data Streaming Integration: Setup & Usage

This app supports real-time dataset streaming with resilient fallbacks and persistent caching.

## Environment variables (.env)

Copy `.env.example` to `.env` and fill in values:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_USE_STREAMING_DATASETS=false
VITE_DEBUG_LOGS=false
```

- `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`: Supabase project values. Do not commit real keys.
- `VITE_USE_STREAMING_DATASETS`: set to `true` to enable streaming via Supabase Edge Functions; `false` uses local fallback JSON.
- `VITE_DEBUG_LOGS`: set to `true` to enable verbose console logs for debugging (e.g., connection status and abort handling). Default `false`.

### Security: Client vs Server secrets
- Client `.env` (Vite) must only contain variables prefixed with `VITE_`. These are exposed to the browser.
- Server-side secrets (no `VITE_` prefix), such as `LLM_*`, `SUPABASE_SERVICE_ROLE_KEY`, and `GEMINI_*`, should be set in Supabase Functions Environment (Project → Configuration → Functions → Environment), not in the client `.env`.
- Ensure `.gitignore` includes `.env` and consider `git update-index --assume-unchanged .env` locally to avoid accidental commits.

## Commands

- Install deps: `pnpm install`
- Type-check: `pnpm exec tsc -b`
- Dev server: `pnpm run dev`

## Streaming endpoints

Edge helper tries both styles automatically:
- Dashed: `manifest-<dataset>`, `stream-<dataset>`
- Nested: `manifest/<provider>/<dataset>`, `stream/<provider>/<dataset>`

Authorization headers are injected from env via `src/lib/config.ts`.

## Caching (IndexedDB)

- Minimal cache in `src/lib/cache.ts` stores last successful dataset arrays per key.
- `src/lib/dataManager.ts` writes to cache after successful loads and will hydrate from cache if both stream and fallback fail.

## Abort handling

- `src/components/RealTimeDashboard.tsx` uses `AbortController` to cancel overlapping refreshes and pass `signal` into `energyDataManager.loadData()`.

## Test checklist

- Streaming ON with valid env → Source: Stream; data present.
- Streaming OFF or failure → Source: Fallback; data present.
- Endpoint variant mismatch still works.
- Disable network after one successful load → cached data hydrates.
- Rapid refreshes do not overlap; no console errors.

Record results in `docs/delivery/PBI-EDSI-MVP/test_evidence.md`.

---

# Supabase Cloud: LLM Edge Function (Gemini)

- The Edge Function is in `supabase/functions/llm/`.
- Native Gemini integration is implemented in `supabase/functions/llm/call_llm_adapter.ts` (Google Generative Language API).

## Configure environment (Cloud)

1) Copy `.env.example` and set project/client values for local app usage.
2) In Supabase Dashboard → Project → Configuration → Functions → Environment, set server-side vars:

```
LLM_ENABLED=true
LLM_CACHE_TTL_MIN=15
LLM_MAX_RPM=30
LLM_COST_PER_1K=0.003

SUPABASE_URL=<project url>
SUPABASE_SERVICE_ROLE_KEY=<service role key>

GEMINI_PROVIDER=google
GEMINI_MODEL_EXPLAIN=gemini-2.5-flash
GEMINI_MODEL_ANALYTICS=gemini-2.5-pro
GEMINI_API_KEY=<your Google GenAI API key>
```

Optional: OAuth bearer instead of API key via `GEMINI_OAUTH_BEARER`.

## Database migration

Run `supabase/migrations/20250827_llm_schemas.sql` in Supabase SQL editor to create:
- `llm_call_log`, `llm_feedback`, `llm_rate_limit`
- RPC `public.llm_rl_increment` (atomic rate limit)
- Retention purge + `mv_llm_daily_spend` view + refresh function

Sanity checks:

```sql
select * from public.llm_rl_increment('dev-user', date_trunc('minute', now()), 60);
select public.refresh_mv_llm_daily_spend();
```

## Deploy and test

- Deploy the `llm` function via CI or Supabase Cloud.
- Test against Cloud:

```
export LLM_BASE="https://<project-ref>.functions.supabase.co/llm"
node tests/test_llm_endpoints.js
```

### CORS configuration (required for browser calls)

For the dashboard (localhost or production) to call the Edge Function from the browser, set allowed origins on the server:

1) Add guidance to `.env.example`: `LLM_CORS_ALLOW_ORIGINS` (already included).
2) Set the secret in Supabase (replace with your origins):

```
supabase secrets set --project-ref <project-ref> \
  LLM_CORS_ALLOW_ORIGINS="http://localhost:5173,https://your-domain"
```

After deployment, preflight should return 204 with `Access-Control-Allow-Origin`, and normal responses should include the same header. We expose `X-RateLimit-*` headers for observability.

## Expected:
- Explain: 200 + provenance + `X-RateLimit-*` headers
- Safety: 403
- Indigenous: 451
- Analytics: 200 + sources + `X-RateLimit-*` headers

---

# LLM UI Panels (Transition Report & Data Quality)

Two new panels are integrated into the main dashboard under the "LLM Insights" section:

- Transition Report: calls `POST /llm/transition-report` with `{ datasetPath, timeframe }`. Shows summary, key findings, policy implications, confidence, and citations. Includes a JSON download.
- Data Quality: calls `POST /llm/data-quality` with `{ datasetPath, timeframe }`. Shows summary, issues, recommendations, and citations. Includes a JSON download.

## Local setup

- Ensure `.env` includes:
  - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
  - Optional: `VITE_SUPABASE_EDGE_BASE` (e.g., `https://<project-ref>.functions.supabase.co`)
- The UI uses auth headers injected from env (Bearer + apikey) via `src/lib/config.ts`/`src/lib/edge.ts`.

## Run and view

```bash
pnpm install
pnpm run dev
# Open http://localhost:5173
```

In the dashboard, scroll to the "LLM Insights" section to view panels. Requests are abortable on rerenders/unmount via `AbortController`.

## Notes

- Endpoints are centrally defined in `src/lib/constants.ts` (`ENDPOINTS.LLM.TRANSITION_REPORT`, `ENDPOINTS.LLM.DATA_QUALITY`).
- Client wrappers: `src/lib/llmClient.ts` (`getTransitionReport`, `getDataQuality`).
- Panels: `src/components/TransitionReportPanel.tsx`, `src/components/DataQualityPanel.tsx`.
- Integration point: `src/components/RealTimeDashboard.tsx` (LLM Insights grid).
