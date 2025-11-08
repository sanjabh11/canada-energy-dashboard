# Canada Energy Dashboard - Data Replacement Plan
## Mock Data → Real Data Integration Strategy

**Document Version**: 1.0
**Date**: November 8, 2025
**Status**: Ready for Implementation

---

## Executive Summary

The Canada Energy Dashboard currently uses a **hybrid architecture** with:
- **Mock/Fallback Data**: 4 GitHub-hosted JSON files (Kaggle 2008-2023), 3 hardcoded TypeScript services, procedural SQL seed data
- **Real Data**: 33+ database tables, IESO API integration, Open-Meteo weather API, 50+ Edge Functions
- **LLM Integration**: Google Gemini API for insights

This plan provides a phased approach to replace all mock data with real-time sources from Canadian grid operators, government agencies, and industry APIs.

---

## Part 1: Current State Analysis

### 1.1 Mock Data Sources (TO BE REPLACED)

| Source | Type | Size | Records | Date Range | Priority |
|--------|------|------|---------|------------|----------|
| `provincial_generation_sample.json` | GitHub JSON | 500KB | ~1000+ | 2008-2023 | **HIGH** |
| `ontario_demand_sample.json` | GitHub JSON | 200KB | ~8700+ | 2023+ | **HIGH** |
| `ontario_prices_sample.json` | GitHub JSON | 300KB | ~5000+ | 2023+ | **HIGH** |
| `hf_electricity_demand_sample.json` | GitHub JSON | Unknown | Unknown | Unknown | **MEDIUM** |
| `realDataService.ts` | Hardcoded TS | N/A | 6 regions, 4 minerals, 5 assets | Static | **HIGH** |
| `enhancedDataService.ts` | Hardcoded TS | N/A | 4 provinces grid status | Static | **MEDIUM** |
| `testDataInjector.ts` | Test scenarios | N/A | 4 scenarios | Dynamic | **LOW** (keep for testing) |
| SQL seed migrations | Procedural SQL | N/A | 30 days gen, 7 days demand | Dynamic | **MEDIUM** |

### 1.2 Real Data Sources (ALREADY WORKING)

✅ **IESO (Ontario)** - Hourly demand, 5-min prices, grid status
✅ **Open-Meteo** - Weather for 8 provinces (hourly)
✅ **Supabase Database** - 33+ tables with real data
✅ **Google Gemini** - LLM insights and analysis
✅ **NRCan/StatCan** - Critical minerals, production stats
✅ **CER** - Compliance records, incident reports

### 1.3 Data Provenance Tracking

✅ All tables have `data_source` column (`'real-time'`, `'historical'`, `'validated'`, `'simulated'`, `'mock'`)
✅ Stream health monitoring in `stream_health` table
✅ Invocation logging in `edge_invocation_log` table

---

## Part 2: Real Data Source Identification

### 2.1 Provincial Grid Operators

#### **Ontario - IESO** ✅ ALREADY INTEGRATED
- **API**: https://www.ieso.ca/en/Power-Data
- **Data**: Real-time demand, 5-min prices, generator output, imports/exports
- **Frequency**: 5-minute intervals
- **Status**: ✅ **Live via edge functions**
- **Cost**: Free (public data)

#### **Alberta - AESO** 🔴 NOT YET INTEGRATED
- **API**: http://ets.aeso.ca/ets_web/ip/Market/Reports/
- **Data**: Real-time grid demand, pool prices, transmission constraints, interconnection queue
- **Frequency**: 1-minute intervals
- **Status**: 🔴 **Disabled** (`VITE_ENABLE_AESO_STREAMING=false`)
- **Cost**: Free (public data)
- **Priority**: **CRITICAL** - Alberta is key for AI data centres (10GW+ queue)

#### **British Columbia - BC Hydro** 🔴 NOT INTEGRATED
- **API**: https://www.bchydro.com/energy-in-bc/operations/transmission-system.html
- **Data**: Generation mix, demand, reservoir levels, transmission
- **Frequency**: Hourly
- **Status**: 🔴 **No API integration** (using mock data)
- **Cost**: Public data available
- **Priority**: **HIGH** - Major hydro province (85% renewable)

#### **Quebec - Hydro-Québec** 🔴 NOT INTEGRATED
- **API**: https://www.hydroquebec.com/data/documents-donnees/
- **Data**: Generation, demand, exports, reservoir levels
- **Frequency**: Hourly
- **Status**: 🔴 **No API integration** (using mock data)
- **Cost**: Public data available
- **Priority**: **HIGH** - Largest hydro fleet in Canada (95% renewable)

#### **Saskatchewan - SaskPower** 🔴 NOT INTEGRATED
- **API**: https://www.saskpower.com/Our-Power-Future/Our-Electricity
- **Data**: Generation mix, demand, wind output
- **Frequency**: Hourly
- **Status**: 🔴 **No API integration** (using mock data)
- **Cost**: Public data available
- **Priority**: **MEDIUM**

#### **Manitoba - Manitoba Hydro** 🔴 NOT INTEGRATED
- **API**: https://www.hydro.mb.ca/corporate/operations/
- **Data**: Generation, demand, exports
- **Frequency**: Hourly
- **Status**: 🔴 **No API integration** (using mock data)
- **Cost**: Public data available
- **Priority**: **MEDIUM**

#### **New Brunswick - NB Power** 🔴 NOT INTEGRATED
- **API**: https://www.nbpower.com/en/about-us/news-media-centre/power-statistics/
- **Data**: Generation mix, demand, imports/exports
- **Frequency**: Daily (limited real-time)
- **Status**: 🔴 **No API integration** (using mock data)
- **Cost**: Public data available
- **Priority**: **LOW**

#### **Nova Scotia - Nova Scotia Power** 🔴 NOT INTEGRATED
- **API**: https://www.nspower.ca/about-us/how-we-make-electricity
- **Data**: Generation mix, demand, renewable output
- **Frequency**: Daily (limited real-time)
- **Status**: 🔴 **No API integration** (using mock data)
- **Cost**: Public data available
- **Priority**: **LOW**

### 2.2 Federal Government Data Sources

#### **Natural Resources Canada (NRCan)** ⚠️ PARTIAL
- **API**: https://open.canada.ca/data/en/dataset
- **Data**: Critical minerals production, reserves, projects, supply chain
- **Frequency**: Annual updates, quarterly reports
- **Status**: ⚠️ **Partial** (some tables populated via manual import)
- **Cost**: Free (open data)
- **Priority**: **HIGH** - Critical minerals are strategic priority

#### **Statistics Canada** ⚠️ PARTIAL
- **API**: https://www.statcan.gc.ca/en/developers
- **Data**: Energy statistics, mineral production, trade flows
- **Frequency**: Monthly/quarterly
- **Status**: ⚠️ **Partial** (some data via CSV import)
- **Cost**: Free (open data)
- **Priority**: **HIGH**

#### **Canada Energy Regulator (CER)** ⚠️ PARTIAL
- **API**: https://www.cer-rec.gc.ca/en/safety-environment/industry-performance/
- **Data**: Pipeline incidents, compliance records, safety metrics
- **Frequency**: Real-time incident reporting, quarterly aggregates
- **Status**: ⚠️ **Partial** (some compliance data loaded)
- **Cost**: Free (open data)
- **Priority**: **MEDIUM**

#### **Environment and Climate Change Canada (ECCC)** 🔴 NOT INTEGRATED
- **API**: https://api.weather.gc.ca/
- **Data**: Weather observations, climate normals, GHG emissions
- **Frequency**: Hourly (weather), annual (emissions)
- **Status**: 🔴 **Not integrated** (using Open-Meteo instead for weather)
- **Cost**: Free (open data)
- **Priority**: **LOW** (Open-Meteo is sufficient)

### 2.3 Industry & Commercial Data Sources

#### **S&P Global Platts** 💰 COMMERCIAL
- **API**: https://www.spglobal.com/commodityinsights/en/
- **Data**: Commodity prices (electricity, gas, minerals)
- **Frequency**: Real-time
- **Status**: 🔴 **Not integrated** (requires subscription)
- **Cost**: $$$ (commercial license required)
- **Priority**: **MEDIUM** - Consider for pricing accuracy

#### **Bloomberg Commodity Data** 💰 COMMERCIAL
- **API**: https://www.bloomberg.com/professional/product/market-data/
- **Data**: Critical minerals pricing, energy commodity prices
- **Frequency**: Real-time
- **Status**: 🔴 **Not integrated** (requires subscription)
- **Cost**: $$$$ (enterprise license required)
- **Priority**: **LOW** - Too expensive for MVP

#### **London Metal Exchange (LME)** 💰 COMMERCIAL
- **API**: https://www.lme.com/Market-Data
- **Data**: Nickel, copper, cobalt, lithium prices
- **Frequency**: Real-time
- **Status**: 🔴 **Not integrated** (requires subscription)
- **Cost**: $$$ (data license required)
- **Priority**: **MEDIUM** - Critical for minerals dashboard

#### **Global AI Data Centre Registry** 🔴 NO PUBLIC API
- **Source**: Manual tracking of public announcements
- **Data**: AI data centre projects, power requirements, locations
- **Frequency**: Ad-hoc (announcement-based)
- **Status**: 🔴 **Hardcoded** (need manual database population)
- **Cost**: Free (manual data entry)
- **Priority**: **CRITICAL** - Key differentiator for dashboard

---

## Part 3: Phased Implementation Plan

### Phase 1: IMMEDIATE WINS (Week 1-2) 🚨 CRITICAL

#### 1.1 Enable AESO (Alberta) Real-Time Data
**Impact**: Replace ~40% of mock provincial generation data
**Effort**: Low (edge function exists, just disabled)

**Tasks**:
- [ ] Set `VITE_ENABLE_AESO_STREAMING=true` in `.env`
- [ ] Test AESO API endpoints (http://ets.aeso.ca)
- [ ] Verify data ingestion into `provincial_generation` table
- [ ] Add AESO-specific error handling for API downtime
- [ ] Update dashboard to show AESO real-time badge

**Files to modify**:
- `.env.local` - Enable flag
- `supabase/functions/stream-provincial-generation/index.ts` - Add AESO fetcher
- `src/lib/dataStreamers.ts` - Update frontend to handle AESO data

**Success metrics**:
- Alberta data updates every 1 minute
- `data_source = 'real-time'` for Alberta records
- Zero fallback to Kaggle JSON for Alberta

---

#### 1.2 Replace Hardcoded Grid Regions with Database Queries
**Impact**: Remove all hardcoded grid status data
**Effort**: Medium

**Tasks**:
- [ ] Migrate `realDataService.ts` Canadian regions to `grid_regions` table
- [ ] Create SQL migration `add_grid_regions_table.sql`
- [ ] Update `enhancedDataService.ts` to query database instead of hardcoded arrays
- [ ] Add data validation for grid frequency (59.9-60.1 Hz acceptable range)
- [ ] Remove hardcoded baseLoad values

**Database schema**:
```sql
CREATE TABLE grid_regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  province_code text NOT NULL,
  region_name text NOT NULL,
  design_capacity_mw int,
  renewable_percent numeric,
  last_updated timestamptz DEFAULT now()
);
```

**Files to modify**:
- `src/lib/realDataService.ts` - Remove hardcoded `canadianRegions` array
- `src/lib/enhancedDataService.ts` - Query database via edge function
- `supabase/migrations/` - Add new migration

**Success metrics**:
- Zero hardcoded grid regions in source code
- All grid data sourced from `grid_regions` table
- `data_source = 'validated'` for static reference data

---

#### 1.3 Populate AI Data Centres Table with Real Projects
**Impact**: Enable strategic AI data centre tracking
**Effort**: Medium (manual data entry + automation)

**Tasks**:
- [ ] Research and document all announced Canadian AI data centres
  - Google (Calgary, 1GW+)
  - Microsoft (Quebec, 800MW)
  - Amazon (Toronto, 500MW)
  - Vantage (Montreal, 300MW)
  - Others from news sources
- [ ] Create data entry spreadsheet with columns:
  - `facility_name`, `location`, `province_code`, `power_requirement_mw`, `status`, `expected_operational_date`, `data_source`, `announcement_url`
- [ ] Import to `ai_datacentres` table via SQL migration
- [ ] Set up Google Alerts for new Canadian AI data centre announcements
- [ ] Create edge function to query this data

**Database migration**:
```sql
-- Seed initial AI data centres
INSERT INTO ai_datacentres (facility_name, location, province_code, power_requirement_mw, status, expected_operational_date, data_source, announcement_url)
VALUES
  ('Google Calgary AI Hub', 'Calgary', 'AB', 1200, 'Proposed', '2027-Q4', 'Press Release', 'https://...'),
  ('Microsoft Azure Quebec', 'Montreal', 'QC', 800, 'Under Construction', '2026-Q2', 'Press Release', 'https://...'),
  -- ... add all known projects
;
```

**Success metrics**:
- At least 10 real AI data centre projects documented
- Zero hardcoded data in source code
- Automated alerts for new announcements

---

### Phase 2: CRITICAL PROVINCIAL DATA (Week 3-6) 🔥 HIGH PRIORITY

#### 2.1 Integrate BC Hydro Real-Time Data
**Impact**: Replace mock data for 3rd largest province (85% renewable)
**Effort**: High (new API integration)

**API Research**:
- Endpoint: https://www.bchydro.com/energy-in-bc/operations/transmission-system.html
- Format: JSON or XML (need to verify)
- Authentication: Likely public, no key required

**Tasks**:
- [ ] Reverse-engineer BC Hydro website API calls (browser network inspector)
- [ ] Create edge function `stream-bc-hydro-data/index.ts`
- [ ] Map BC Hydro data fields to `provincial_generation` schema
- [ ] Add error handling for API downtime (fall back to last known good data)
- [ ] Schedule hourly cron job for ingestion
- [ ] Update dashboard to show BC Hydro real-time badge

**Files to create**:
- `supabase/functions/stream-bc-hydro-data/index.ts`
- `supabase/functions/bc-hydro-ingestion-cron/index.ts`

**Success metrics**:
- BC data updates every hour
- `data_source = 'real-time'` for BC records
- Reservoir level data available

---

#### 2.2 Integrate Hydro-Québec Real-Time Data
**Impact**: Replace mock data for 2nd largest province (95% renewable)
**Effort**: High (new API integration)

**API Research**:
- Endpoint: https://www.hydroquebec.com/data/documents-donnees/
- Format: CSV exports or JSON API (need to verify)
- Authentication: Likely public

**Tasks**:
- [ ] Identify Hydro-Québec real-time data endpoints
- [ ] Create edge function `stream-hydro-quebec-data/index.ts`
- [ ] Map Hydro-Québec data to schema
- [ ] Add support for Churchill Falls export data
- [ ] Schedule hourly cron job
- [ ] Update dashboard

**Success metrics**:
- QC data updates every hour
- Export/import flows tracked
- `data_source = 'real-time'`

---

#### 2.3 Replace Provincial Generation Fallback JSON
**Impact**: Eliminate Kaggle 2008-2023 outdated data
**Effort**: Low (remove fallback after real data sources online)

**Tasks**:
- [ ] Verify all provinces have real-time data sources (ON, AB, BC, QC)
- [ ] Update `sampleDataLoader.ts` to return error instead of Kaggle fallback
- [ ] Remove `public/data/provincial_generation_sample.json` from repository
- [ ] Update documentation to mark Kaggle source as deprecated
- [ ] Add monitoring alerts if real-time sources fail

**Success metrics**:
- Zero fallbacks to Kaggle JSON for provinces with real-time APIs
- Error notifications sent to ops team if real-time sources unavailable

---

### Phase 3: MINERALS & SUPPLY CHAIN (Week 7-10) ⛏️ STRATEGIC

#### 3.1 Integrate NRCan Critical Minerals Database
**Impact**: Real-time critical minerals project tracking
**Effort**: Medium

**API Research**:
- Endpoint: https://open.canada.ca/data/en/dataset (search for minerals)
- Format: JSON, CSV, XML
- Authentication: API key (free)

**Tasks**:
- [ ] Register for NRCan Open Data API key
- [ ] Identify datasets:
  - Critical minerals projects
  - Mineral reserves estimates
  - Production statistics by province
  - Environmental assessments
- [ ] Create edge function `nrcan-minerals-sync/index.ts`
- [ ] Map NRCan fields to `critical_minerals_projects` table
- [ ] Schedule daily sync (midnight)
- [ ] Replace hardcoded minerals in `realDataService.ts`

**Database updates**:
```sql
-- Add NRCan reference IDs
ALTER TABLE critical_minerals_projects
ADD COLUMN nrcan_project_id text,
ADD COLUMN nrcan_last_sync timestamptz;
```

**Success metrics**:
- 100+ real mineral projects in database
- Zero hardcoded minerals data
- Daily automated sync from NRCan

---

#### 3.2 Integrate LME Pricing Data (if budget allows)
**Impact**: Real-time commodity pricing for lithium, nickel, cobalt, copper
**Effort**: High (commercial API, cost)

**Cost Analysis**:
- LME Data License: ~$2,000-5,000/month (enterprise)
- Alternative: Web scraping (risky, terms of service violation)
- Free Alternative: Use NRCan quarterly pricing reports (delayed but official)

**Decision Point**:
⚠️ **Recommend FREE ALTERNATIVE** for MVP:
- Use NRCan quarterly pricing reports (free, official)
- Supplement with manual spot price updates from public sources
- Consider LME license in future if budget increases

**Tasks (Free Alternative)**:
- [ ] Download NRCan quarterly mineral price reports (CSV)
- [ ] Create SQL import script for price history
- [ ] Update `minerals_prices` table monthly
- [ ] Add disclaimer: "Pricing data is quarterly estimate, not real-time"

---

### Phase 4: WEATHER & FORECASTING (Week 11-12) 🌦️ ENHANCEMENT

#### 4.1 Expand Open-Meteo Coverage
**Impact**: Improve renewable forecasting accuracy
**Effort**: Low

**Current Coverage**: 8 major cities
**Target Coverage**: 25+ locations (all major wind/solar farms)

**Tasks**:
- [ ] Identify coordinates of all major renewable projects:
  - Wind farms: Wolfe Island ON, Pincher Creek AB, etc.
  - Solar farms: Sarnia ON, Vulcan AB, etc.
- [ ] Update `weather-ingestion-cron/index.ts` with new locations
- [ ] Increase API call quota if needed (still free tier)
- [ ] Map weather data to renewable generation forecasts

**Success metrics**:
- 25+ weather observation points
- Weather data within 50km of every major renewable project
- Improved forecast accuracy (reduce MAE by 10%)

---

#### 4.2 Integrate ECCC Historical Climate Data
**Impact**: Long-term climate trend analysis
**Effort**: Medium

**API**: https://api.weather.gc.ca/

**Tasks**:
- [ ] Register for ECCC API access
- [ ] Download historical climate normals (1991-2020)
- [ ] Import to `climate_historical_data` table
- [ ] Create analytics for renewable generation vs climate trends
- [ ] Add climate change scenario modeling

---

### Phase 5: HOUSEKEEPING & OPTIMIZATION (Ongoing)

#### 5.1 Remove All Hardcoded Test Data from Production
**Tasks**:
- [ ] Keep `testDataInjector.ts` but disable in production builds
- [ ] Add environment check: `if (import.meta.env.DEV)` before test injection
- [ ] Remove all procedural SQL seed data from production migrations
- [ ] Create separate `seed-dev.sql` for development environments only

#### 5.2 Implement Data Quality Monitoring
**Tasks**:
- [ ] Create dashboard for data source health
- [ ] Alert on stale data (no updates in 2+ hours for real-time sources)
- [ ] Track `data_source` column distribution (goal: 90%+ real-time)
- [ ] Monitor API error rates via `edge_invocation_log`

#### 5.3 Documentation Updates
**Tasks**:
- [ ] Update README with real data sources
- [ ] Document all API keys and credentials in secure vault
- [ ] Create runbook for data source failures
- [ ] Update architecture diagram to show real data flows

---

## Part 4: API Integration Specifications

### 4.1 AESO (Alberta) Integration

**API Documentation**: http://ets.aeso.ca/ets_web/ip/Market/Reports/

**Key Endpoints**:
```
Current Supply Demand Report:
http://ets.aeso.ca/ets_web/ip/Market/Reports/CSDReportServlet

Pool Price Report:
http://ets.aeso.ca/ets_web/ip/Market/Reports/PoolPriceReportServlet

Interconnection Queue:
http://ets.aeso.ca/ets_web/ip/Market/Reports/InterconnectionQueueServlet
```

**Sample Response**:
```json
{
  "timestamp": "2025-11-08T14:35:00Z",
  "alberta_internal_load": 9847,
  "net_to_grid_generation": 10121,
  "pool_price": 48.52,
  "generation_by_fuel": {
    "coal": 1245,
    "gas": 5234,
    "hydro": 823,
    "wind": 2819,
    "solar": 0
  }
}
```

**Edge Function Implementation**:
```typescript
// supabase/functions/stream-aeso-data/index.ts
const AESO_API_BASE = 'http://ets.aeso.ca/ets_web/ip/Market/Reports';

async function fetchAESOCurrentSupplyDemand() {
  const response = await fetch(`${AESO_API_BASE}/CSDReportServlet`);
  const data = await response.json();

  // Transform to our schema
  return {
    timestamp: new Date(data.timestamp),
    province_code: 'AB',
    market_demand_mw: data.alberta_internal_load,
    generation_by_source: data.generation_by_fuel,
    data_source: 'real-time',
  };
}

async function ingestAESOData() {
  const data = await fetchAESOCurrentSupplyDemand();

  // Insert into database
  const { error } = await supabase
    .from('provincial_generation')
    .upsert(data, { onConflict: 'timestamp,province_code' });

  if (error) throw error;
}
```

**Cron Schedule**: Every 1 minute (AESO updates real-time)

---

### 4.2 NRCan Critical Minerals Integration

**API Documentation**: https://open.canada.ca/data/en/

**Key Datasets**:
```
Critical Minerals Projects:
https://open.canada.ca/data/en/dataset/[dataset-id]/resource/[resource-id]

Mineral Production Statistics:
https://open.canada.ca/data/en/dataset/[dataset-id]/resource/[resource-id]
```

**Sample Response** (CSV format):
```csv
project_name,province,mineral,stage,capacity_tonnes_per_year,capital_cost_cad
Whabouchi Lithium,QC,Lithium,Feasibility,23000,600000000
Sudbury Nickel,ON,Nickel,Production,180000,N/A
```

**Edge Function Implementation**:
```typescript
// supabase/functions/nrcan-minerals-sync/index.ts
const NRCAN_API_KEY = Deno.env.get('NRCAN_API_KEY');
const NRCAN_MINERALS_DATASET = 'https://open.canada.ca/data/en/dataset/...';

async function syncNRCanMinerals() {
  const response = await fetch(NRCAN_MINERALS_DATASET, {
    headers: { 'Authorization': `Bearer ${NRCAN_API_KEY}` }
  });

  const csv = await response.text();
  const projects = parseCSV(csv); // Use CSV parser

  for (const project of projects) {
    await supabase
      .from('critical_minerals_projects')
      .upsert({
        project_name: project.project_name,
        province: project.province,
        primary_mineral: project.mineral,
        stage: project.stage,
        design_capacity_tonnes_per_year: project.capacity_tonnes_per_year,
        capital_cost_cad: project.capital_cost_cad,
        nrcan_project_id: project.id,
        nrcan_last_sync: new Date(),
        data_source: 'validated',
      }, { onConflict: 'nrcan_project_id' });
  }
}
```

**Cron Schedule**: Daily at 2am (NRCan updates infrequently)

---

## Part 5: Success Metrics & KPIs

### Data Quality Metrics

| Metric | Current | Target | Timeline |
|--------|---------|--------|----------|
| Real-time data percentage | 30% | 90% | Phase 3 |
| Mock data percentage | 40% | 5% | Phase 3 |
| Historical validated data | 30% | 5% | Phase 5 |
| API uptime (avg) | 95% | 99.5% | Phase 4 |
| Data freshness (< 1hr old) | 50% | 95% | Phase 2 |
| Provinces with real-time data | 1 (ON) | 4+ (ON, AB, BC, QC) | Phase 2 |
| Critical minerals projects | 0 real | 100+ real | Phase 3 |
| AI data centres tracked | 0 real | 10+ real | Phase 1 |

### User-Facing Improvements

- **Data Confidence Badges**: Show "Real-Time", "Historical", or "Estimated" on dashboards
- **Data Source Attribution**: Link to source APIs for transparency
- **Staleness Warnings**: Alert users if data is more than 1 hour old
- **Forecast Accuracy**: Display MAE/MAPE metrics for renewable forecasts

---

## Part 6: Risk Mitigation

### Risks & Mitigation Strategies

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| AESO API shutdown or change | Medium | High | Cache last 7 days of data, maintain GitHub fallback |
| NRCan API rate limits | Low | Medium | Implement exponential backoff, daily sync instead of hourly |
| Commercial API costs exceed budget | High | High | Use free alternatives (NRCan, StatCan), manual updates |
| Data quality issues (missing fields) | High | Medium | Implement validation rules, log and alert on schema mismatches |
| Provincial APIs require authentication | Medium | Medium | Register for API keys preemptively, document in secret manager |
| Real-time data latency | Medium | Low | Set realistic SLAs (5-15 min acceptable for grid data) |

---

## Part 7: Cost Estimate

### Free Data Sources (Zero Cost)
- ✅ IESO (Ontario) - Free
- ✅ AESO (Alberta) - Free
- ✅ Open-Meteo - Free (up to 10,000 calls/day)
- ✅ NRCan Open Data - Free
- ✅ Statistics Canada - Free
- ✅ CER Public Data - Free

### Potential Paid Sources (Optional)
- ⚠️ LME Commodity Pricing - $2,000-5,000/month (SKIP for MVP)
- ⚠️ S&P Global Platts - $1,000-3,000/month (SKIP for MVP)
- ⚠️ Bloomberg Terminal - $2,000/month per user (SKIP)

**Total Estimated Cost for MVP**: **$0/month** 🎉

---

## Part 8: Implementation Timeline

### Sprint 1-2 (Week 1-2): Immediate Wins
- ✅ Fix build errors (DONE)
- [ ] Enable AESO streaming
- [ ] Populate AI data centres table
- [ ] Remove hardcoded grid regions

### Sprint 3-6 (Week 3-6): Provincial Data
- [ ] Integrate BC Hydro
- [ ] Integrate Hydro-Québec
- [ ] Remove Kaggle fallback

### Sprint 7-10 (Week 7-10): Minerals & Supply Chain
- [ ] NRCan minerals sync
- [ ] StatCan trade flows
- [ ] Pricing data updates

### Sprint 11-12 (Week 11-12): Weather & Forecasting
- [ ] Expand Open-Meteo coverage
- [ ] ECCC historical climate

### Ongoing: Housekeeping
- [ ] Data quality monitoring
- [ ] Documentation updates
- [ ] Remove test data from production

---

## Part 9: Next Steps (ACTIONABLE TODAY)

### Immediate Actions (Next 24 Hours)

1. **Enable AESO Streaming**
   ```bash
   # Update .env.local
   echo "VITE_ENABLE_AESO_STREAMING=true" >> .env.local

   # Test AESO API
   curl http://ets.aeso.ca/ets_web/ip/Market/Reports/CSDReportServlet

   # If successful, deploy edge function
   ```

2. **Create AI Data Centres Spreadsheet**
   - Research Google Calgary AI hub announcement
   - Research Microsoft Azure Quebec expansion
   - Create Google Sheet with columns: name, location, MW, status, date, source URL
   - Import to `ai_datacentres` table

3. **Document Current Data Sources**
   - Update README.md with "Data Sources" section
   - List all current APIs and their status
   - Document environment variables required

### Week 1 Deliverables

- [ ] AESO real-time data flowing
- [ ] At least 5 real AI data centres documented
- [ ] Zero hardcoded grid regions (moved to database)
- [ ] Updated architecture diagram showing real data flows

---

## Conclusion

This plan provides a clear roadmap to replace all mock data with real sources. The phased approach prioritizes:
1. **High-impact, low-effort wins** (AESO, AI data centres)
2. **Critical provincial data** (BC, QC)
3. **Strategic data** (minerals, supply chain)
4. **Enhancements** (weather, forecasting)

All targets are achievable with **zero additional cost** using free public APIs from Canadian grid operators and government agencies.

**Estimated Timeline**: 12 weeks to 90%+ real data coverage
**Estimated Cost**: $0/month (using only free data sources)
**Primary Risk**: API availability and data quality (mitigated by fallback chains)

---

**Document Status**: ✅ Ready for Implementation
**Approval Required**: Product Owner, Tech Lead
**Next Review Date**: November 15, 2025
