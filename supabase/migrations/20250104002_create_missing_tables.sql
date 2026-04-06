-- Migration to create missing tables causing 404 errors and additional Phase 2 tables
-- Run in Supabase SQL editor or via supabase db push

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Core data tables for live streaming (causing 404 errors)

-- 1) Ontario hourly demand (front-end queries order=hour.desc)
CREATE TABLE IF NOT EXISTS ontario_hourly_demand (
  hour timestamptz PRIMARY KEY,
  market_demand_mw double precision,
  ontario_demand_mw double precision,
  created_at timestamptz DEFAULT now()
);

-- 2) Provincial generation (front-end expects date column)
CREATE TABLE IF NOT EXISTS provincial_generation (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  date date,
  province_code text,
  source text,
  generation_gwh double precision,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_provincial_generation_date_province ON provincial_generation (date, province_code);

-- 3) Alberta supply/demand (front-end ordered by timestamp)
CREATE TABLE IF NOT EXISTS alberta_supply_demand (
  timestamp timestamptz PRIMARY KEY,
  total_gen_mw double precision,
  total_demand_mw double precision,
  pool_price_cad double precision,
  created_at timestamptz DEFAULT now()
);

-- 4) Weather data (front-end queries weather_data)
CREATE TABLE IF NOT EXISTS weather_data (
  timestamp timestamptz PRIMARY KEY,
  station_id text,
  temperature_c double precision,
  wind_speed_m_s double precision,
  precipitation_mm double precision,
  created_at timestamptz DEFAULT now()
);

-- Phase 2 tables for advanced features

-- Indigenous energy sovereignty
CREATE TABLE IF NOT EXISTS indigenous_projects (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  territory TEXT,
  consent_status TEXT,
  impact_assessment JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS consultations (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES indigenous_projects(id),
  stakeholder TEXT,
  feedback TEXT,
  sentiment TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Critical minerals supply chain
CREATE TABLE IF NOT EXISTS mineral_supply (
  id SERIAL PRIMARY KEY,
  mineral TEXT NOT NULL,
  production_tonnes NUMERIC,
  import_tonnes NUMERIC,
  risk_score NUMERIC,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Infrastructure resilience
CREATE TABLE IF NOT EXISTS resilience_assets (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  vulnerability_score NUMERIC,
  adaptation_cost NUMERIC,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Regulatory compliance
CREATE TABLE IF NOT EXISTS compliance_rules (
  id SERIAL PRIMARY KEY,
  sector TEXT,
  regulation TEXT,
  requirements JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Energy innovation
CREATE TABLE IF NOT EXISTS innovations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  trl INTEGER,
  market_fit TEXT,
  commercialization_path TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Stakeholder coordination
CREATE TABLE IF NOT EXISTS stakeholders (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT,
  interests TEXT,
  contact_info JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Energy security
CREATE TABLE IF NOT EXISTS security_threats (
  id SERIAL PRIMARY KEY,
  threat_type TEXT,
  description TEXT,
  severity TEXT,
  mitigation TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Monitoring table for ETL health
CREATE TABLE IF NOT EXISTS source_health (
  source_name text PRIMARY KEY,
  last_success timestamptz,
  last_failure timestamptz,
  consecutive_failures int DEFAULT 0,
  notes text
);

-- Enable Row Level Security for public access (adjust policies as needed)
-- Note: For development, we'll disable RLS initially to test connectivity
-- ALTER TABLE ontario_hourly_demand DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE provincial_generation DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE alberta_supply_demand DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE weather_data DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE indigenous_projects DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE consultations DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE mineral_supply DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE resilience_assets DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE compliance_rules DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE innovations DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE stakeholders DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE security_threats DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE source_health DISABLE ROW LEVEL SECURITY;