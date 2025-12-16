# Data Sources & Provenance

This document summarizes the primary data sources used by the **Sustainable Finance & ESG** and **Industrial Decarbonization** dashboards, along with notes on refresh cadence and reliability. It is intended as a quick reference for analysts, sponsors, and reviewers.

---

## 1. Sustainable Finance & ESG Dashboard

### 1.1 ESG Ratings (`esg_ratings`)
- **Source:** Yahoo Finance ESG (public sustainability dataset).
- **Coverage:** Major Canadian-listed energy companies (e.g., SU.TO, CNQ.TO, IMO.TO, CPX.TO, TA.TO, ENB.TO, CVE.TO, TRP.TO, PPL.TO, BIR.TO).
- **Fields used:**
  - `company` (long name from Yahoo)
  - `sector` (mapped into `oil_gas`, `utility`, `renewable`, `mining`)
  - `msci_score_numeric` (normalized 0–10 score from Yahoo `totalEsg` 0–100)
  - `rating_date` (import date)
- **Ingestion path:**
  - Script: `scripts/import_yahoo_finance_esg.py` (Python, `yfinance` + Supabase client).
  - Automation: `.github/workflows/esg_yahoo_import.yml` (weekly cron + manual trigger).
- **Cadence:** Weekly refresh via GitHub Actions.
- **Notes:**
  - Vendor methodology may change over time; scores are best used for trends + cross-sectional comparison, not as absolute risk measures.
  - For regulatory filings or investment approvals, always cross-check issuer sustainability reports and vendor documentation.

### 1.2 Green Bonds (`green_bonds`)
- **Intended sources:**
  - SEDAR+ issuer filings (offering memoranda, prospectuses).
  - Climate Bonds Initiative labelled bond database.
  - Issuer sustainability reports and investor presentations.
- **Ingestion path:**
  - Currently: seed/sample data in migration `20251122_esg_dashboard.sql`.
  - Production: expected via curated CSV imports (e.g., from research spreadsheets) into `green_bonds`.
- **Cadence:** Ad hoc updates when new bonds are issued or when research files are updated.
- **Notes:** Ensure labelled bonds meet Green Bond Principles / CBI criteria before including them as green.

### 1.3 Sustainability-Linked Loans (`sustainability_linked_loans`)
- **Sources:**
  - Bank and issuer press releases (TD, RBC, CIBC, BMO, etc.).
  - Annual and sustainability reports describing loan KPIs and ratchets.
- **Ingestion path:**
  - Seed/sample rows in `20251122_esg_dashboard.sql`.
  - Future: CSV imports managed via research workflow (not yet automated in this repo).
- **Cadence:** Ad hoc, as new facilities are announced.
- **Notes:** Pay attention to KPI definitions (intensity vs absolute emissions) and step-up / step-down mechanics when interpreting loan impact.

### 1.4 Carbon Pricing Exposure (`carbon_pricing_exposure`)
- **Sources:**
  - Company-reported annual emissions (Mt CO₂e) from sustainability / TCFD reports.
  - Canada&apos;s carbon price schedule (current and projected 2030 price).
- **Ingestion path:**
  - Seed/example data in `20251122_esg_dashboard.sql`.
  - Future production deployments should link calculations to `facility_emissions` and policy scenario configuration.
- **Cadence:** Annual (aligned with emissions reporting) or when carbon price policy changes.

---

## 2. Industrial Decarbonization Dashboard

### 2.1 Facility Emissions (`facility_emissions`)
- **Source:**
  - Environment and Climate Change Canada (ECCC) National Pollutant Release Inventory (NPRI) and related GHG reporting programs.
- **Fields:**
  - `facility_name`, `operator`, `province_code`, `city`, `latitude`, `longitude`.
  - `sector`, `emissions_tonnes` (total CO₂e), `co2_tonnes`, `ch4_tonnes`, `n2o_tonnes`, `hfc_tonnes` (where available).
  - `reporting_year`, optional `emission_intensity`, `production_unit`.
- **Ingestion paths:**
  - Script: `scripts/import_npri_facilities.py` (CSV → Supabase upsert).
  - Edge Function: `supabase/functions/api-v2-npri-importer` (ECCC DataMart API → Supabase upsert).
  - Workflow: `.github/workflows/npri_import.yml` (manual trigger, parameterized by year/province).
- **Cadence:** Annual, when new NPRI data is released (typically with a ~1-year lag).
- **Notes:** NPRI data may be revised; for high-stakes analysis, confirm latest records directly on the NPRI portal.

### 2.2 Methane Reduction (`methane_reduction_tracker`)
- **Sources:**
  - Company-reported methane baselines and current-year emissions.
  - Federal 75% methane reduction target (vs 2012/2019 baselines).
- **Ingestion path:**
  - Seed/example records in `20251122_industrial_decarb.sql`.
  - Future: curated CSV imports or direct manual entry via Supabase.
- **Cadence:** Annual or when companies update methane disclosures.
- **Notes:** Often reported at the company or asset-level, not always per-facility.

### 2.3 OBPS Compliance (`obps_compliance`)
- **Sources:**
  - Provincial and federal Output-Based Pricing System (OBPS/TIER) compliance reports.
  - Public datasets listing facility-level credits/debits and, where published, market prices.
- **Ingestion path:**
  - Table defined and seeded in `20251122_industrial_decarb.sql`.
  - CSV helper: `scripts/import_obps_compliance.py` (CSV → Supabase upsert on `facility_name, reporting_year`).
- **Cadence:** Annual, following OBPS/TIER compliance reporting cycles.
- **Notes:** Credit prices can be volatile; when estimating `financial_value_cad`, document the assumed price and date.

### 2.4 Efficiency Projects (`efficiency_projects`)
- **Sources:**
  - EMRF (Emissions Reduction Fund) project lists.
  - Emissions Reduction Alberta (ERA) funded project database.
  - Company sustainability and climate strategy reports.
- **Ingestion path:**
  - Table defined and seeded in `20251122_industrial_decarb.sql`.
  - CSV helper: `scripts/import_efficiency_projects.py` (CSV → Supabase upsert).
- **Cadence:** Ad hoc, as new projects are announced or funded.
- **Notes:** Not all projects are captured; dashboard focuses on larger, high-impact initiatives suitable for sponsor demos and scenario analysis.

---

## 3. General Data Quality Notes

- **Idempotent Imports:**
  - `esg_ratings` has a unique constraint on `company`.
  - `facility_emissions` has a unique constraint on (`facility_name`, `reporting_year`).
  - Import scripts and edge functions use `upsert` with these keys to avoid duplicates.

- **Refresh Strategy:**
  - Frequent, automated: ESG ratings (weekly via GitHub Actions).
  - Periodic, semi-automated: NPRI facility emissions (annual via edge importer / scripts).
  - Manual/curated: Green bonds, sustainability-linked loans, OBPS compliance, efficiency projects.

- **Verification Practices:**
  - For sponsor-facing analysis, sample-check dashboard values against source files (NPRI CSVs, OBPS reports, issuer filings).
  - Record any manual overrides or adjustments in analysis notebooks or deal memos.

This file should be kept in sync with ingestion scripts, edge functions, and dashboard help content as new data sources are added.
