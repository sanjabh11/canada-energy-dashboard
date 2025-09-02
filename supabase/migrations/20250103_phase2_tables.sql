-- Migration for Phase 2: Investment, Resilience, Innovation

CREATE TABLE investment_projects (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  costs JSONB,
  revenues JSONB,
  risks TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE esg_data (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES investment_projects(id),
  score NUMERIC,
  factors JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE resilience_assets (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  vulnerability_score NUMERIC,
  adaptation_cost NUMERIC,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE climate_projections (
  id SERIAL PRIMARY KEY,
  location TEXT,
  year INTEGER,
  temperature_increase NUMERIC,
  sea_level_rise NUMERIC,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE innovations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  trl INTEGER,
  market_fit TEXT,
  commercialization_path TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
