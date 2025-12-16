# PRD: Canada Energy Intelligence Platform - Production Monetization

**Version:** 1.0  
**Date:** November 27, 2025  
**Status:** Draft for Review  
**Owner:** CEIP Development Team

---

## 1. Overview

### 1.1 Problem Statement
The Canada Energy Intelligence Platform (CEIP) has 95% of its technical infrastructure complete but lacks production-ready monetization. The platform has 44+ API endpoints, real-time data integration, AI analysis, and comprehensive dashboards—but zero revenue.

### 1.2 Opportunity
Based on feasibility analysis, two validated revenue paths exist:
1. **Indigenous Energy Intelligence** (Score: 9.2/10) - Zero competitors, blue ocean
2. **Consulting Firm API Access** (Score: 7.0/10) - Faster revenue validation

### 1.3 Goals
| Metric | 90-Day Target | 6-Month Target |
|--------|---------------|----------------|
| Revenue (Closed) | $15K-25K | $60K-100K |
| Pipeline | $50K-100K | $200K-300K |
| Paying Customers | 2-3 | 8-12 |
| Indigenous Communities | 20 | 50+ |
| ICE Network Partnership | LOI signed | Formal agreement |

### 1.4 Non-Goals (Explicitly Out of Scope)
- ❌ Government contracts >$25K (too slow for initial validation)
- ❌ Analyst workbench as standalone product (Orennia competes)
- ❌ Bloomberg-style terminal (can't compete on breadth)
- ❌ SOC 2 certification (defer until $100K+ revenue validated)

---

## 2. User Personas

### 2.1 Primary: Energy Consulting Analyst
**Profile:** Junior-to-senior analyst at firms like Dunsky, ICF, GLJ, Econoler  
**Pain Points:**
- Manually scrape IESO/AESO/HydroQuebec data weekly
- Build custom Excel models for each client engagement
- No unified source for Canadian energy policy + grid data
- Spend 4-8 hours/week on data aggregation

**Jobs To Be Done:**
- Get real-time Canadian grid data in API or dashboard
- Generate AI-powered analysis for client reports
- Export data in analyst-ready formats (CSV, JSON)
- Track policy changes across provinces

**Willingness to Pay:** $5K-15K/year per firm (saves 100+ analyst hours/year)

### 2.2 Primary: Indigenous Program Coordinator
**Profile:** Energy coordinator at Indigenous community, ICE Network participant, or ISET program manager  
**Pain Points:**
- No centralized tracking of Indigenous energy projects nationally
- Can't benchmark community projects against peers
- Funders (Wah-ila-toos) require reporting but no tools exist
- No visibility into successful project models to replicate

**Jobs To Be Done:**
- Track project portfolio (solar, wind, biomass, storage)
- Report to funders on project status and impact
- Discover successful projects in similar communities
- Connect with potential partners and investors

**Willingness to Pay:** $5K-15K/year per community/organization (often funded by grants)

### 2.3 Secondary: Impact Investor
**Profile:** ESG analyst at pension fund (CPP, CDPQ, AIMCo) or infrastructure fund  
**Pain Points:**
- No database of Indigenous energy investment opportunities
- UNDRIP compliance assessment is manual and expensive
- Can't evaluate Indigenous partnership quality systematically

**Jobs To Be Done:**
- Screen Indigenous energy investment opportunities
- Assess UNDRIP/FPIC compliance status
- Evaluate community benefit metrics
- Generate ESG-compliant investment reports

**Willingness to Pay:** $20K-50K/year (saves $100K+ in due diligence costs)

---

## 3. Feature Requirements

### 3.1 Phase 1: API Productization (Priority: P0)

**F1.1: API Documentation Portal**
- Auto-generated OpenAPI/Swagger docs from existing 44 endpoints
- Interactive API explorer (try requests in browser)
- Code samples in Python, JavaScript, R
- Authentication guide

**F1.2: API Key Self-Service**
- Registration form (email, organization, use case)
- Instant key generation
- Usage dashboard (requests/day, rate limits)
- Key rotation and revocation

**F1.3: Rate Limiting & Tiers**
| Tier | Requests/Day | Price |
|------|--------------|-------|
| Free | 100 | $0 |
| Developer | 1,000 | $49/month |
| Professional | 10,000 | $199/month |
| Enterprise | Unlimited | Custom |

**Existing Infrastructure:**
- `api_keys` table exists in `supabase/migrations/20251123_api_keys.sql`
- `validateApiKey()` function exists in Edge Functions
- 44 API endpoints operational

**Build Effort:** 32 hours

### 3.2 Phase 2: Indigenous Platform Enhancement (Priority: P0)

**F2.1: Community Project Registry**
- Map visualization (integrate Native Land Digital API)
- Project database (250+ projects, consent-based submission)
- Community profiles (634 First Nations)
- Search by region, technology, capacity, status

**F2.2: OCAP® Compliance Framework**
- Consent management workflow
- Data ownership attribution
- Community-controlled visibility settings
- Audit log for data access

**F2.3: Funder Reporting Dashboard**
- Wah-ila-toos reporting templates
- Project milestone tracking
- Impact metrics (jobs, emissions avoided, revenue)
- Export to funder-required formats

**Existing Infrastructure:**
- `api-v2-indigenous-projects` - Operational ✅
- `api-v2-indigenous-consultations` - Operational ✅
- `api-v2-indigenous-tek` - Operational ✅
- `api-v2-indigenous-territories` - Operational ✅
- Indigenous energy dashboard component exists

**Build Effort:** 24 hours

### 3.3 Phase 3: Consulting Sales Package (Priority: P1)

**F3.1: Demo Environment**
- Sandbox with sample data
- Guided tour (5-minute onboarding)
- AI analysis demo
- Export samples

**F3.2: Sales Materials**
- Landing page (API + Platform)
- Sales deck (PDF, 10 slides)
- Case study templates
- ROI calculator

**F3.3: Stripe Integration**
- Subscription checkout (monthly/annual)
- Usage-based billing for API overages
- Invoice generation
- Customer portal

**Existing Infrastructure:**
- `edubiz_users` table with Stripe fields exists
- `PricingPage.tsx` with tier definitions exists
- Upgrade flow UI exists (placeholder for Stripe)

**Build Effort:** 16 hours

---

## 4. Technical Architecture

### 4.1 Current State (Already Built)
```
Frontend (React/Vite)
├── 77 dashboard components
├── Certificate/Learning system
├── AI Chat integration
├── Real-time IESO/AESO visualizations
└── Indigenous energy dashboard

Backend (Supabase)
├── 44 Edge Functions (API endpoints)
├── PostgreSQL database
├── API key validation
├── User authentication (edubiz_users)
└── Data ingestion pipelines

External Integrations
├── IESO real-time data
├── AESO real-time data  
├── LLM (AI analysis)
└── Stripe (placeholder)
```

### 4.2 Target State (After This PRD)
```
Frontend (React/Vite)
├── + API Documentation Portal
├── + API Key Management UI
├── + Indigenous Map Integration
├── + Funder Reporting Dashboard
├── + Stripe Checkout Flow
└── (existing components unchanged)

Backend (Supabase)
├── + Rate limiting middleware
├── + Usage tracking tables
├── + Enhanced api_keys with quotas
├── + Stripe webhook handlers
└── (existing endpoints unchanged)

External Integrations
├── + Native Land Digital API
├── + Stripe (production)
├── (IESO, AESO, LLM unchanged)
└── 
```

### 4.3 Data Model Changes

**New: `api_usage` table**
```sql
CREATE TABLE api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES api_keys(id),
  endpoint TEXT NOT NULL,
  request_count INT DEFAULT 1,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_api_usage_key_date ON api_usage(api_key_id, date);
```

**Enhanced: `api_keys` table**
```sql
ALTER TABLE api_keys ADD COLUMN tier TEXT DEFAULT 'free';
ALTER TABLE api_keys ADD COLUMN daily_limit INT DEFAULT 100;
ALTER TABLE api_keys ADD COLUMN stripe_subscription_id TEXT;
```

**New: `indigenous_project_consent` table**
```sql
CREATE TABLE indigenous_project_consent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES indigenous_projects(id),
  community_id UUID NOT NULL,
  consent_type TEXT NOT NULL, -- 'public', 'aggregated', 'private'
  granted_by TEXT NOT NULL,
  granted_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  notes TEXT
);
```

---

## 5. Implementation Plan

### Sprint Overview – Deliverables & Advantages

| Sprint | Key Deliverables | Why (Advantages) | How (Implementation Focus) |
|--------|------------------|------------------|----------------------------|
| **Sprint 1 – API Productization** | OpenAPI spec, API docs portal, self-serve API keys, usage tracking, basic rate limiting, API usage dashboard | Converts your existing Edge Functions into a *product* instead of an internal implementation detail. Gives consulting firms and ICE a concrete, testable API surface and validates external demand before heavy UI work. | Wrap existing Supabase Edge Functions with consistent auth, logging, and limits; expose them via a simple docs site and a minimal React dashboard reusing existing layout/components. |
| **Sprint 2 – Indigenous Enhancement** | Indigenous map + community profiles, consent-aware project registry, funder reporting dashboard, OCAP® documentation | Turns a generic platform into a **unique Indigenous energy intelligence product** with no direct competitors. Directly supports ICE and communities with reporting they already need, strengthening partnership value. | Build on existing `api-v2-indigenous-*` endpoints and dashboard; add mapping, consent flows, and reporting views without altering core ingestion pipelines. |
| **Sprint 3 – Sales & Stripe** | Stripe checkout, usage-based billing, demo sandbox, sales deck, pricing page, contract templates | Converts usage and pilots into **recurring, low-friction revenue** and reduces manual invoicing/collections overhead. Makes it easy for consulting firms and communities to buy and expand. | Integrate Stripe with existing `edubiz_users` and pricing components; wire plan tiers to API key limits; ship a stable demo environment plus lightweight sales collateral. |

### 5.1 Sprint 1: API Productization (Week 1-2)
| Task | Hours | Owner | Dependencies |
|------|-------|-------|--------------|
| OpenAPI spec generation from Edge Functions | 8 | Dev | None |
| API documentation portal (Swagger UI) | 4 | Dev | OpenAPI spec |
| API key registration form | 4 | Dev | None |
| Usage tracking middleware | 6 | Dev | None |
| Rate limiting implementation | 4 | Dev | Usage tracking |
| API dashboard UI (my keys, usage) | 6 | Dev | API key form |
| **Total** | **32** | | |

**Deliverable:** Functional API product with self-service key management

### 5.2 Sprint 2: Indigenous Enhancement (Week 3-4)
| Task | Hours | Owner | Dependencies |
|------|-------|-------|--------------|
| Native Land Digital API integration | 8 | Dev | None |
| Community profile pages | 4 | Dev | None |
| Project submission form (consent workflow) | 6 | Dev | None |
| OCAP® compliance documentation | 4 | Dev | ICE consultation |
| Funder reporting dashboard | 6 | Dev | None |
| **Total** | **28** | | |

**Deliverable:** Enhanced Indigenous platform ready for ICE partnership

### 5.3 Sprint 3: Sales & Stripe (Week 5-6)
| Task | Hours | Owner | Dependencies |
|------|-------|-------|--------------|
| Stripe checkout integration | 8 | Dev | Stripe account |
| Usage-based billing logic | 4 | Dev | Usage tracking |
| Demo sandbox environment | 4 | Dev | None |
| Sales deck creation | 4 | Dev | None |
| Landing page for API product | 4 | Dev | None |
| Contract templates | 2 | Dev | Legal review |
| **Total** | **26** | | |

**Deliverable:** Live payment processing, sales-ready materials

### 5.4 Parallel: Business Development (All Weeks)
| Task | Week | Owner |
|------|------|-------|
| Contact ICE Network (partnership proposal) | 1 | Founder |
| Email 10 consulting firms | 2 | Founder |
| Book 3-5 demos | 3 | Founder |
| Draft ICE partnership LOI | 3 | Founder |
| Close first consulting deal | 4-5 | Founder |
| Onboard 10 Indigenous pilot communities | 4-6 | Founder + ICE |

---

## 6. Success Metrics

### 6.1 Leading Indicators (Weekly)
| Metric | Target |
|--------|--------|
| API keys registered | 50+ by Week 6 |
| Demo calls booked | 10+ by Week 4 |
| Indigenous communities contacted | 30+ by Week 4 |
| Consulting firms contacted | 15+ by Week 2 |

### 6.2 Lagging Indicators (Monthly)
| Metric | Month 1 | Month 2 | Month 3 |
|--------|---------|---------|---------|
| Revenue (Closed) | $0-5K | $5K-15K | $15K-25K |
| Paying Customers | 0-1 | 1-2 | 2-3 |
| API Requests/Day | 500 | 2,000 | 5,000 |
| Indigenous Communities | 5 | 15 | 25 |

### 6.3 North Star
**6-Month ARR: $100K** (4-6 consulting firms + ISC/Wah-ila-toos pilot + 10 communities)

---

## 7. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| ICE partnership rejected | Medium | High | Have backup: direct community outreach |
| Consulting firms don't convert | Medium | Medium | Lower price, offer pilot discounts |
| OCAP® compliance issues | Low | High | Engage FNIGC early, get legal review |
| Stripe integration delays | Low | Medium | Use Lemon Squeezy as fallback |
| Competitor enters Indigenous space | Low | High | Move fast, establish partnerships |

---

## 8. Out of Scope / Future Considerations

**Deferred to V2 (After Revenue Validation):**
- SOC 2 Type II certification
- Government contracts >$25K
- SAML/SSO enterprise features
- Multi-language support (French)
- Mobile app
- White-label offerings

**Explicitly Killed:**
- Analyst workbench as standalone product
- Bloomberg-style terminal ambitions
- Enterprise sales without consulting validation first

---

## 9. Appendix

### 9.1 Existing API Endpoints (44 Available)
```
api-v2-aeso-queue
api-v2-ai-datacentres
api-v2-analytics-national-overview
api-v2-analytics-provincial-metrics
api-v2-analytics-trends
api-v2-capacity-market
api-v2-carbon-emissions
api-v2-ccus
api-v2-ccus-projects
api-v2-cer-compliance
api-v2-climate-policy
api-v2-cross-border-trade
api-v2-curtailment-reduction
api-v2-esg-finance
api-v2-ev-charging
api-v2-forecast-performance
api-v2-grid-optimization-recommendations
api-v2-grid-regions
api-v2-grid-stability-metrics
api-v2-grid-status
api-v2-heat-pump-programs
api-v2-hydrogen-hub
api-v2-ieso-queue
api-v2-indigenous-consultations
api-v2-indigenous-projects
api-v2-indigenous-tek
api-v2-indigenous-territories
api-v2-industrial-decarb
api-v2-innovation-market-opportunities
api-v2-innovation-technology-readiness
api-v2-investment-portfolio-optimization
api-v2-investment-project-analysis
api-v2-minerals-supply
api-v2-minerals-supply-chain
api-v2-npri-importer
api-v2-renewable-forecast
api-v2-resilience-adaptation-plan
api-v2-resilience-assets
api-v2-resilience-hazards
api-v2-resilience-vulnerability-map
api-v2-security-incidents
api-v2-security-metrics
api-v2-security-mitigation-strategies
api-v2-storage-dispatch (and more...)
```

### 9.2 Contact List: Consulting Firms
| Firm | Size | Focus | Contact Method |
|------|------|-------|----------------|
| Dunsky Energy | 65+ | Clean energy strategy | LinkedIn + website form |
| ICF Canada | 100+ | Federal consulting | LinkedIn |
| GLJ Ltd | 50+ | Energy asset valuation | Direct email |
| Econoler | 40+ | Energy efficiency | Direct email |
| Delphi Group | 30+ | Sustainability | LinkedIn |
| MNP | 200+ | Financial advisory | Direct email |
| Navius Research | 10+ | Energy modeling | Direct email |

### 9.3 ICE Network Partnership Pitch Points
1. We have the technology platform; you have community relationships
2. Co-ownership model: Indigenous governance, shared revenue
3. Addresses your members' need for project tracking + funder reporting
4. No competitor exists—first-mover advantage
5. Wah-ila-toos funding cycle creates urgency

---

_PRD Version 1.0 - Ready for implementation pending founder approval._
