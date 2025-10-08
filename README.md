# Canada Energy Intelligence Platform (CEIP)
## Learning-Focused Energy Data Dashboard

A comprehensive real-time energy data visualization platform for Canadian energy systems, featuring streaming data integration, **5x enhanced AI-powered analytics**, Indigenous energy sovereignty, and educational insights.

---

## 🎯 **Latest Implementation Status (Phase I + II Complete - 93% Complete)**

### ✅ **COMPLETED FEATURES (Production Ready)**

#### **Core Data & Visualization**
- **Real-time Streaming Data**: Ontario IESO demand, Alberta AESO market data, Provincial generation mix, European smart meter data
- **Interactive Dashboards**: 15+ specialized dashboards (Energy, Indigenous, Arctic, Minerals, Compliance, Grid, Security, etc.)
- **Advanced Charts**: Recharts integration with real-time updates, export capabilities, and responsive design
- **Resilient Architecture**: Fallback systems, IndexedDB caching, error handling, and health monitoring

#### **AI-Powered Analytics (5x Enhanced) 🆕**
- **✨ Advanced Prompt System**: Chain-of-Thought reasoning, Few-Shot learning, Canadian energy context injection
- **📚 Knowledge Base**: Comprehensive Canadian energy policies (federal + all provinces), Indigenous protocols, technical standards
- **🔄 Structured Templates**: Reusable, versioned prompts for data analysis, household advice, Indigenous consultation, policy impact
- **🎯 Quality Assurance**: Automated response scoring, validation, and regeneration for consistency
- **Features:**
  - Chart explanations with visual descriptions
  - Transition reports with policy context
  - Data quality assessments
  - Household energy recommendations (personalized)
  - Market intelligence briefs
  - Indigenous-aware consultations (UNDRIP compliant)

#### **Indigenous Energy Sovereignty (90% Complete) ✨ Phase II Enhanced**
- **Territory Mapping**: Interactive TerritorialMap with consultation status
- **FPIC Workflows**: Free, Prior, Informed Consent tracking (4-stage process)
- **TEK Repository**: Traditional Ecological Knowledge management (661 lines infrastructure)
- **🆕 AI Co-Design Assistant**: Indigenous-specific LLM chat for TEK integration, FPIC guidance, and community engagement best practices
- **🆕 Enhanced Filters**: Territory, energy type, season, and category filters with active filter badges
- **Data Governance**: Indigenous data sovereignty notices, 451 status codes for sensitive data, UNDRIP-compliant responses
- **Consultation Dashboard**: Real-time WebSocket communication for stakeholder engagement

#### **Arctic & Northern Energy (95% Complete) ✨ Phase II Enhanced**
- **Arctic Energy Security Monitor**: 631-line dashboard for remote communities
- **🆕 Diesel-to-Renewable Optimizer**: Full-stack optimization engine (880 lines total)
  - Interactive scenario builder with 4 parameter sliders
  - 4 preset scenarios (Aggressive, Moderate, Conservative, Budget-Constrained)
  - Real-time optimization results with cost breakdown, savings projection, payback period
  - Recommended energy mix visualization (Solar, Wind, Battery, Hydro, Biomass)
  - Year-by-year implementation timeline
  - Feasibility checking and reliability scoring
- **Community Energy Profiles**: Detailed profiles for Northern/Arctic communities
- **Climate Resilience**: Adaptation planning and risk assessment

#### **Critical Minerals Supply Chain (85% Complete) ✨ Phase II Enhanced**
- **Enhanced Minerals Dashboard**: 631-line comprehensive tracking
- **🆕 Risk Alert System**: Automated detection of high-risk minerals with animated alerts
- **🆕 AI Geopolitical Analysis**: One-click AI risk analysis per mineral with mitigation strategies
- **Risk Assessment**: Supplier risk scoring, strategic importance classification
- **Local Data Management**: Persistent storage, export/import capabilities
- **Supply Chain Visualization**: Risk distribution, top suppliers, strategic importance

#### **Infrastructure & Security**
- **Supabase Edge Functions**: 40+ deployed functions for LLM, data streaming, and API integrations
- **Security**: Rate limiting, PII redaction, Indigenous data guards, CORS configured
- **Educational Help System**: 24+ comprehensive help entries
- **Performance**: Optimized caching, background sync, abort handling

### 🔧 **CORE FUNCTIONALITY**
- **Live Data Streaming**: Real-time energy market data from authoritative sources
- **Interactive Dashboard**: 4-panel layout with Ontario demand, generation mix, Alberta markets, and weather correlation
- **Investment Analysis**: NPV/IRR calculations with dynamic market data integration
- **Compliance Monitoring**: Regulatory compliance tracking with AI remediation guidance
- **Infrastructure Resilience**: Climate scenario modeling and risk assessment
- **Indigenous Sovereignty**: Territory mapping with governance-compliant data handling
- **Stakeholder Management**: Multi-stakeholder coordination and consultation tracking

### ✅ **PHASE II COMPLETED FEATURES**

#### **TEK Enhancement** ✅ (Completed: 2025-10-08)
- [x] ✅ AI co-design chat interface with Indigenous-specific prompts
- [x] ✅ Enhanced filters (territory, energy type, season)
- [x] ✅ UNDRIP-compliant responses and cultural sensitivity notices
- [ ] NRCan Indigenous Energy Portal API integration (Deferred to Phase III)
- [ ] Leaflet advanced mapping overlays for TEK layers (Deferred to Phase III)

#### **Arctic Optimization Engine** ✅ (Completed: 2025-10-08)
- [x] ✅ Full-stack diesel-to-renewable optimization engine (880 lines)
- [x] ✅ Interactive scenario builder with 4 parameter sliders
- [x] ✅ 4 preset scenarios with real-time calculations
- [x] ✅ Complete results visualization (cost, savings, timeline, mix)
- [ ] Offline caching with IndexedDB for remote communities (Deferred to Phase III)

#### **Minerals Geopolitical Intelligence** ✅ (Completed: 2025-10-08)
- [x] ✅ Automated risk alert system with high-risk mineral detection
- [x] ✅ AI-powered geopolitical analysis per mineral
- [x] ✅ Supply chain risk assessment with mitigation strategies
- [ ] ML-based automated risk scoring (Deferred to Phase III)
- [ ] NetworkX-style dependency graphing (Deferred to Phase III)
- [ ] USGS/NRCan API integration (Deferred to Phase III)

### 🚧 **PENDING FEATURES (Phase III - Future)**

#### **ML Emissions Forecasting** (Needs: 5 weeks - Phase III)
- [ ] PyTorch/TensorFlow time-series model training
- [ ] ECCC GHG projections API integration
- [ ] Historical data backtesting and validation
- [ ] Production-ready forecasting pipeline

#### **Community Forum Enhancements** (Needs: 4 weeks - Phase III)
- [ ] Threaded conversation structure
- [ ] Voting and consensus mechanisms
- [ ] AI-powered mediation (Gemini)
- [ ] Moderation tools and rate limiting

---

## 📊 **TECHNICAL ACHIEVEMENTS**

### **Architecture**
- **Streaming Architecture**: Supabase Edge Functions with real-time SSE connections
- **Data Integration**: Multiple authoritative sources (IESO, AESO, ECCC, Kaggle, HuggingFace)
- **Cloud-Native**: Automatic scaling, global CDN, serverless functions

### **AI/ML System**
- **LLM Integration**: Gemini 2.5 Flash/Pro via Supabase Edge Functions
- **Advanced Prompting**: Chain-of-Thought reasoning, Few-Shot learning, context injection
- **Knowledge Base**: 13 provincial/territorial contexts + federal policies + Indigenous protocols
- **Quality Assurance**: Automated scoring, validation, and regeneration
- **Safety**: Blacklist filtering, PII redaction, Indigenous data sovereignty guards

### **Security & Performance**
- **Rate Limiting**: RPC-based per-user quotas (30 req/min default)
- **PII Protection**: Email, phone, number redaction in all LLM requests
- **CORS**: Configured for production domains
- **Caching**: Multi-layer (IndexedDB, in-memory, Edge Function cache)
- **Performance**: Optimized bundle, lazy loading, abort handling

### **Data Governance**
- **Indigenous Data Sovereignty**: UNDRIP-compliant, FPIC workflows, 451 status codes
- **Privacy-First**: Local storage for sensitive data, no cloud persistence without consent
- **Audit Trail**: Comprehensive logging (llm_call_log, llm_feedback tables)
- **Provenance Tracking**: Citations and data sources for all LLM responses

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

---

## 🚀 **QUICK START GUIDE**

### Prerequisites
- **Node.js**: v18+ (recommended: v20)
- **pnpm**: v8+ (`npm install -g pnpm`)
- **Supabase Account**: Free tier sufficient for development

### Step 1: Clone and Install
```bash
git clone <repository-url>
cd energy-data-dashboard
pnpm install
```

### Step 2: Environment Setup
Create `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

Configure required variables:
```env
# Client-side (VITE_ prefix exposed to browser)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_USE_STREAMING_DATASETS=true
VITE_DEBUG_LOGS=false
VITE_ENABLE_EDGE_FETCH=true
```

**⚠️ SECURITY:** Never commit `.env` with real credentials!

### Step 3: Supabase Setup

#### A. Database Tables (Required)
Run migrations in Supabase SQL Editor:
```bash
# Location: supabase/migrations/
20250827_llm_schemas.sql  # LLM call logging, rate limiting
```

Key tables created:
- `llm_call_log` - LLM request audit trail
- `llm_feedback` - User feedback on LLM responses
- `llm_rate_limit` - Per-user rate limiting
- `household_chat_messages` - Household advisor conversations

#### B. Edge Functions (Required for full features)
Deploy Edge Functions to Supabase:
```bash
# Set Supabase project ref
export SUPABASE_PROJECT_REF=your-project-ref

# Deploy all functions
pnpm run cloud:deploy

# Or deploy individually
supabase functions deploy llm --project-ref $SUPABASE_PROJECT_REF
supabase functions deploy household-advisor --project-ref $SUPABASE_PROJECT_REF
```

**Critical Edge Functions:**
- `llm/` - Main LLM orchestration (explain, analyze, reports)
- `household-advisor/` - Personalized energy advice
- `stream-*` - Real-time data streaming endpoints
- `api-v2-*` - Various API v2 endpoints (indigenous, grid, analytics)

#### C. Server-Side Environment Variables
Set in Supabase Dashboard → Project → Configuration → Functions → Environment:

```bash
# LLM Configuration
LLM_ENABLED=true
LLM_CACHE_TTL_MIN=15
LLM_MAX_RPM=30
LLM_COST_PER_1K=0.003

# Supabase Credentials
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Gemini API
GEMINI_PROVIDER=google
GEMINI_MODEL_EXPLAIN=gemini-2.0-flash-exp
GEMINI_MODEL_ANALYTICS=gemini-2.0-flash-exp
GEMINI_API_KEY=your-gemini-api-key

# CORS (for production)
LLM_CORS_ALLOW_ORIGINS=http://localhost:5173,https://your-domain.com
```

**Get Gemini API Key:** https://makersuite.google.com/app/apikey

### Step 4: Run Development Server
```bash
pnpm run dev
# Opens http://localhost:5173
```

### Step 5: Verify Setup
Check these features work:
- [ ] Dashboard loads with charts
- [ ] Real-time data streaming active (check status indicators)
- [ ] LLM "Explain Chart" button works
- [ ] Household Advisor chat responds
- [ ] Indigenous Dashboard loads territories
- [ ] No console errors

---

## 📝 **AVAILABLE COMMANDS**

### Development
```bash
pnpm install              # Install dependencies
pnpm run dev              # Start dev server (http://localhost:5173)
pnpm run build            # Production build
pnpm run build:prod       # Production build with optimizations
pnpm run preview          # Preview production build
pnpm exec tsc -b          # Type-check only
pnpm run lint             # ESLint check
```

### Testing & Deployment
```bash
pnpm run cloud:deploy     # Deploy Edge Functions to Supabase
pnpm run cloud:health     # Health check for deployed functions
pnpm run cloud:test       # Test LLM endpoints
pnpm run cloud:all        # Deploy + health check + test
pnpm run test:phase4      # Test Phase 4 components
```

### Troubleshooting
```bash
# Clear build cache
rm -rf node_modules/.vite-temp
rm -rf dist

# Reinstall dependencies
rm -rf node_modules
pnpm install

# Check for TypeScript errors
pnpm exec tsc --noEmit
```

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
