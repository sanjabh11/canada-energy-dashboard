# Indigenous Equity Enhancement - Implementation Plan
**Feature**: Indigenous Economic Impact & Equity Tracking
**Timeline**: 4 hours (immediate implementation)
**Priority**: PHASE 2 - Priority #2 (HIGH ROI for ESG/Federal Funding)

---

## 🎯 STRATEGIC OBJECTIVES

### **Why This Matters**:
1. **Reconciliation**: UNDRIP compliance, TRC Calls to Action
2. **ESG Ratings**: Required data for institutional investors
3. **Federal Funding**: Clean energy programs require Indigenous partnerships
4. **Legal Compliance**: Many provinces mandate Indigenous consultation/benefit sharing
5. **Corporate Reputation**: Energy companies need to demonstrate reconciliation commitment

### **Target Sponsors**:
1. **Federal NRCan** - Indigenous equity requirements for funding programs
2. **Pension Funds** - CPP Investments, OMERS, AIMCO (ESG requirements)
3. **ESG Rating Agencies** - S&P, MSCI, Sustainalytics (need data transparency)
4. **Energy Companies** - Suncor, TC Energy, Enbridge (reconciliation commitments)
5. **Provincial Governments** - Track Indigenous participation in energy transition

---

## 📋 CURRENT STATE ANALYSIS

### **Existing Implementation** (IndigenousDashboard.tsx):
- ✅ Traditional territory mapping (TerritorialMap component)
- ✅ FPIC (Free, Prior, Informed Consent) workflow tracking
- ✅ Consultation status monitoring
- ✅ TEK (Traditional Ecological Knowledge) integration
- ✅ Cultural/environmental data tracking

### **GAPS** (What's Missing):
- ❌ **Equity ownership tracking** (% ownership in projects)
- ❌ **Revenue sharing agreements** (IBAs, royalty %)
- ❌ **Economic impact metrics** (jobs, GDP, procurement)
- ❌ **Financial returns** (dividends, total payments to date)
- ❌ **Benefit agreement registry** (IBA database)
- ❌ **Community investment funds** (capacity building, education)

---

## 🏗️ IMPLEMENTATION ARCHITECTURE

### **Data Flow**:
```
Database (New Tables)
  ↓
Existing IndigenousDashboard.tsx (Enhanced)
  ↓
New Tabs: Economic Impact, Equity Ownership, Revenue Agreements
  ↓
User sees comprehensive Indigenous economic data
```

### **No New Edge Function Needed**:
- Extend existing dashboard with local data manager
- Or use simple queries directly in component
- Or add endpoints to existing api if needed

---

## 📊 DATABASE SCHEMA

### **Table 1: indigenous_equity_ownership**
**Purpose**: Track Indigenous community equity stakes in energy projects

```sql
CREATE TABLE indigenous_equity_ownership (
  id TEXT PRIMARY KEY,
  project_name TEXT NOT NULL,
  project_type TEXT, -- Solar, Wind, Hydro, Pipeline, Transmission, Mining
  indigenous_community TEXT NOT NULL,
  nation_or_band TEXT,

  -- Equity Details
  ownership_percent NUMERIC CHECK (ownership_percent >= 0 AND ownership_percent <= 100),
  ownership_type TEXT, -- Direct Equity, Partnership, Joint Venture, Trust, Cooperative
  investment_date DATE,
  equity_value_cad NUMERIC,

  -- Project Details
  project_capacity_mw NUMERIC,
  project_location TEXT,
  province TEXT,

  -- Financial Returns
  annual_dividend_cad NUMERIC,
  total_return_to_date_cad NUMERIC,

  -- Governance
  board_seats INTEGER,
  community_voting_rights BOOLEAN DEFAULT FALSE,

  status TEXT, -- Active, Planned, Completed, Divested
  data_source TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Real Data Examples**:
- Wataynikaneyap Power (24 First Nations, 51% equity, $340M, transmission)
- Clearwater River Wind (Duncan's First Nation, 50% JV, 150 MW)
- Makwa Solar (Ermineskin Cree, 100% ownership, 36 MW, $30M)

---

### **Table 2: indigenous_revenue_agreements**
**Purpose**: Track Impact Benefit Agreements and revenue-sharing deals

```sql
CREATE TABLE indigenous_revenue_agreements (
  id TEXT PRIMARY KEY,
  agreement_name TEXT NOT NULL,
  project_name TEXT NOT NULL,
  indigenous_community TEXT NOT NULL,
  operator TEXT NOT NULL,

  -- Agreement Type
  agreement_type TEXT, -- IBA, Revenue Sharing, Royalty, Capacity Building, Employment, Procurement
  signing_date DATE,
  expiry_date DATE,

  -- Financial Terms
  royalty_rate_percent NUMERIC,
  fixed_annual_payment_cad NUMERIC,
  variable_payment_based_on TEXT, -- Production, Revenue, Profit, Milestone
  total_value_cad NUMERIC,

  -- Payments to Date
  cumulative_payments_cad NUMERIC DEFAULT 0,
  last_payment_date DATE,
  last_payment_amount_cad NUMERIC,

  -- Benefits
  jobs_created INTEGER,
  training_investment_cad NUMERIC,
  local_procurement_target_percent NUMERIC,

  status TEXT, -- Active, Expired, Renegotiating, Terminated
  data_source TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

### **Table 3: indigenous_economic_impact**
**Purpose**: Annual economic impact metrics by community

```sql
CREATE TABLE indigenous_economic_impact (
  id SERIAL PRIMARY KEY,
  community_name TEXT NOT NULL,
  year INTEGER NOT NULL,

  -- Employment
  direct_jobs INTEGER DEFAULT 0,
  indirect_jobs INTEGER DEFAULT 0,
  training_participants INTEGER DEFAULT 0,
  apprenticeships INTEGER DEFAULT 0,

  -- Procurement
  local_procurement_value_cad NUMERIC DEFAULT 0,
  indigenous_owned_contractors INTEGER DEFAULT 0,

  -- Revenue
  total_revenue_from_energy_projects_cad NUMERIC DEFAULT 0,
  equity_dividends_cad NUMERIC DEFAULT 0,
  royalty_payments_cad NUMERIC DEFAULT 0,
  iba_payments_cad NUMERIC DEFAULT 0,

  -- Investment
  community_investment_fund_balance_cad NUMERIC DEFAULT 0,
  education_investment_cad NUMERIC DEFAULT 0,
  infrastructure_investment_cad NUMERIC DEFAULT 0,

  -- Capacity Building
  business_development_programs INTEGER DEFAULT 0,
  governance_training_participants INTEGER DEFAULT 0,

  -- GDP Contribution
  community_gdp_cad NUMERIC,
  energy_sector_gdp_contribution_percent NUMERIC,

  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(community_name, year)
);
```

---

## 🎨 FRONTEND ENHANCEMENTS

### **New Tabs to Add to IndigenousDashboard.tsx**:

#### **Tab 1: Economic Impact** (New)
- **KPI Cards**:
  - Total Revenue from Energy Projects
  - Jobs Created (Direct + Indirect)
  - Community Investment Funds
  - Local Procurement Value

- **Visualizations**:
  - Revenue trend chart (by year)
  - Employment breakdown (direct, indirect, training)
  - Procurement spending chart
  - GDP contribution by community

#### **Tab 2: Equity Ownership** (New)
- **Projects Table**:
  - Project name, ownership %, equity value
  - Annual dividends, total returns
  - Board seats, governance rights

- **Visualizations**:
  - Pie chart: Equity distribution by project type
  - Bar chart: Top 10 communities by equity value
  - Timeline: Equity investments over time

#### **Tab 3: Revenue Agreements** (New)
- **IBAs Registry**:
  - Agreement name, community, operator
  - Total value, cumulative payments
  - Status, expiry dates

- **Visualizations**:
  - Payment history chart
  - Agreement type breakdown
  - Benefits delivered (jobs, training, procurement)

---

## 📈 SUCCESS METRICS

### **Technical**:
- ✅ 3 new database tables
- ✅ 3 new tabs in IndigenousDashboard
- ✅ Real data for 5+ communities
- ✅ Charts render with accurate data
- ✅ Zero TypeScript errors

### **Business**:
- ✅ Wataynikaneyap $340M equity visible
- ✅ Total Indigenous equity > $500M tracked
- ✅ Jobs created > 1,000 shown
- ✅ Revenue trends visualized
- ✅ ESG reporting-ready data

---

## ⏱️ TIMELINE

### **Phase 1: Database** (1 hour)
1. Create migration file: `20251112002_indigenous_equity_enhancement.sql`
2. Write CREATE TABLE statements
3. Seed real data (Wataynikaneyap, Clearwater, Makwa, etc.)
4. Test migration locally

### **Phase 2: Frontend** (2 hours)
1. Add new interfaces to IndigenousDashboard.tsx
2. Create Economic Impact tab component
3. Create Equity Ownership tab component
4. Create Revenue Agreements tab component
5. Integrate with existing tab navigation

### **Phase 3: Testing** (1 hour)
1. Deploy migration
2. Test data flow
3. Verify charts render
4. Check mobile responsiveness
5. Fix any issues

---

## 🚀 IMPLEMENTATION ORDER

1. ✅ Create implementation plan (COMPLETE)
2. 🔨 Create database migration (NEXT - 30 min)
3. 🔨 Seed real data (30 min)
4. 🔨 Enhance IndigenousDashboard component (1.5 hours)
5. 🔨 Test end-to-end (30 min)
6. 🔨 Commit and push (10 min)

**Let's start building!** 🏗️
