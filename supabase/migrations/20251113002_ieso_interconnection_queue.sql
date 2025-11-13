-- Migration: IESO Interconnection Queue & Connection Process
-- Created: 2025-11-13
-- Purpose: Track Ontario renewable energy, storage, and generation projects seeking grid connection
-- Strategic Priority: ~3GW battery storage by 2028, 5GW renewable procurement, capacity market transparency
-- Gap Analysis: HIGH PRIORITY - Multi-province grid queue expansion (42GW+ in Ontario pipeline)

-- ============================================================================
-- IESO INTERCONNECTION QUEUE
-- ============================================================================

-- Ontario grid connection queue (IESO territory)
CREATE TABLE IF NOT EXISTS ieso_interconnection_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT UNIQUE, -- IESO project identifier
  project_name TEXT NOT NULL,
  proponent TEXT, -- Developer/operator name

  -- Location
  location_municipality TEXT,
  location_region TEXT, -- Central, East, West, Northeast, Northwest
  connection_point TEXT, -- Transmission station
  latitude NUMERIC,
  longitude NUMERIC,

  -- Technology
  project_type TEXT CHECK (project_type IN (
    'Solar',
    'Wind - Onshore',
    'Wind - Offshore',
    'Battery Storage',
    'Pumped Hydro Storage',
    'Hydroelectric',
    'Biomass',
    'Biogas',
    'Natural Gas - Simple Cycle',
    'Natural Gas - Combined Cycle',
    'Natural Gas - Cogeneration',
    'Nuclear - SMR',
    'Nuclear - Large Scale',
    'Hydrogen',
    'Hybrid (Solar + Storage)',
    'Hybrid (Wind + Storage)',
    'Other'
  )) NOT NULL,

  fuel_type TEXT, -- For generation: Solar, Wind, Natural Gas, Biomass, etc.
  storage_duration_hours NUMERIC, -- For storage projects

  -- Capacity
  capacity_mw NUMERIC NOT NULL,
  energy_capacity_mwh NUMERIC, -- For storage

  -- Connection specifications
  connection_type TEXT CHECK (connection_type IN ('Transmission', 'Distribution')),
  voltage_level_kv NUMERIC,
  requires_transmission_upgrade BOOLEAN DEFAULT FALSE,
  transmission_upgrade_cost_estimate_cad NUMERIC,

  -- Project status (IESO uses "Committed Projects" model)
  status TEXT CHECK (status IN (
    'Early Development',
    'Connection Assessment (CA)',
    'System Impact Assessment (SIA)',
    'Customer Impact Assessment (CIA)',
    'Facilities Study',
    'Connection Agreement Signed',
    'Under Construction',
    'In-Service',
    'Withdrawn',
    'On Hold',
    'Rejected'
  )) DEFAULT 'Early Development',

  -- Study phase tracking
  connection_assessment_complete BOOLEAN DEFAULT FALSE,
  system_impact_assessment_complete BOOLEAN DEFAULT FALSE,
  customer_impact_assessment_complete BOOLEAN DEFAULT FALSE,
  facilities_study_complete BOOLEAN DEFAULT FALSE,

  -- Procurement program
  procurement_program TEXT, -- LT1 RFP, LT2 RFP, Expedited LT1, Feed-in Tariff, Market Participant, etc.
  contract_awarded BOOLEAN DEFAULT FALSE,
  contract_award_date DATE,
  contract_capacity_mw NUMERIC,
  contract_price_cad_per_mwh NUMERIC,

  -- Timeline
  application_date DATE,
  study_start_date DATE,
  proposed_in_service_date DATE,
  actual_in_service_date DATE,
  target_cod DATE, -- Commercial Operation Date
  withdrawal_date DATE,

  -- Queue management
  queue_position INTEGER,
  queue_entered_date DATE,
  days_in_queue INTEGER,

  -- Economic data
  estimated_capex_cad NUMERIC,
  jobs_created INTEGER,

  -- Environmental
  renewable_energy_credits BOOLEAN DEFAULT FALSE,
  carbon_free BOOLEAN DEFAULT FALSE,

  -- Indigenous engagement
  indigenous_partnership BOOLEAN DEFAULT FALSE,
  indigenous_community TEXT,

  -- Metadata
  data_source TEXT DEFAULT 'IESO',
  ieso_connection_process_url TEXT,
  notes TEXT,
  last_updated DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ieso_queue_type ON ieso_interconnection_queue(project_type);
CREATE INDEX idx_ieso_queue_status ON ieso_interconnection_queue(status);
CREATE INDEX idx_ieso_queue_capacity ON ieso_interconnection_queue(capacity_mw DESC);
CREATE INDEX idx_ieso_queue_region ON ieso_interconnection_queue(location_region);
CREATE INDEX idx_ieso_queue_in_service_date ON ieso_interconnection_queue(proposed_in_service_date);
CREATE INDEX idx_ieso_queue_procurement ON ieso_interconnection_queue(procurement_program);
CREATE INDEX idx_ieso_queue_position ON ieso_interconnection_queue(queue_position);

COMMENT ON TABLE ieso_interconnection_queue IS 'IESO interconnection queue tracking renewable energy, storage, and generation projects seeking Ontario grid connection';

-- ============================================================================
-- IESO PROCUREMENT PROGRAMS
-- ============================================================================

CREATE TABLE IF NOT EXISTS ieso_procurement_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_name TEXT NOT NULL,
  program_type TEXT CHECK (program_type IN (
    'Long-Term RFP',
    'Medium-Term RFP',
    'Expedited Procurement',
    'Capacity Auction',
    'Feed-in Tariff',
    'Net Metering',
    'Standby Rate',
    'Demand Response',
    'Energy Efficiency',
    'Other'
  )),

  -- Procurement targets
  target_capacity_mw NUMERIC,
  target_energy_gwh NUMERIC,
  eligible_technologies TEXT[], -- Array: ['Solar', 'Wind', 'Storage']

  -- Results
  rfp_issued_date DATE,
  rfp_closing_date DATE,
  contract_award_date DATE,
  contracted_capacity_mw NUMERIC,
  contracted_energy_gwh NUMERIC,
  contract_count INTEGER,

  -- Economics
  average_contract_price_cad_per_mwh NUMERIC,
  lowest_bid_cad_per_mwh NUMERIC,
  highest_bid_cad_per_mwh NUMERIC,
  total_program_value_cad NUMERIC,

  -- In-service targets
  target_in_service_year INTEGER,
  target_in_service_date_start DATE,
  target_in_service_date_end DATE,

  -- Program status
  status TEXT CHECK (status IN ('Announced', 'Open', 'Closed', 'Under Evaluation', 'Contracts Awarded', 'Cancelled')),

  -- Strategic context
  program_rationale TEXT, -- Grid reliability, emissions reduction, renewable targets, etc.

  notes TEXT,
  ieso_program_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ieso_programs_type ON ieso_procurement_programs(program_type);
CREATE INDEX idx_ieso_programs_status ON ieso_procurement_programs(status);
CREATE INDEX idx_ieso_programs_in_service ON ieso_procurement_programs(target_in_service_year);

COMMENT ON TABLE ieso_procurement_programs IS 'IESO renewable energy and storage procurement programs (LT RFPs, capacity auctions, etc.)';

-- ============================================================================
-- PROVINCIAL INTERCONNECTION QUEUES (Multi-Province Unified Schema)
-- ============================================================================

-- Unified table for all provincial interconnection queues (AB, ON, SK, BC, QC, etc.)
CREATE TABLE IF NOT EXISTS provincial_interconnection_queues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  province_code TEXT NOT NULL CHECK (province_code IN ('ON', 'AB', 'SK', 'BC', 'MB', 'QC', 'NB', 'NS', 'NL', 'PE')),
  iso_operator TEXT NOT NULL, -- IESO, AESO, SaskPower, BC Hydro, Hydro-Québec, etc.

  queue_id TEXT, -- Operator-specific queue identifier
  project_name TEXT NOT NULL,
  proponent TEXT,

  -- Location
  location_city TEXT,
  location_region TEXT,
  latitude NUMERIC,
  longitude NUMERIC,

  -- Technology
  project_type TEXT NOT NULL,
  fuel_type TEXT,
  storage_duration_hours NUMERIC,

  -- Capacity
  capacity_mw NUMERIC NOT NULL,
  energy_capacity_mwh NUMERIC,

  -- Queue management
  queue_position INTEGER,
  queue_entered_date DATE,
  study_phase TEXT, -- CA, SIA, CIA, Facilities Study, etc.

  -- Status
  status TEXT NOT NULL,
  proposed_in_service_date DATE,
  actual_in_service_date DATE,
  withdrawal_date DATE,

  -- Connection
  connection_point TEXT,
  voltage_kv NUMERIC,
  transmission_upgrade_required BOOLEAN DEFAULT FALSE,
  transmission_upgrade_cost_cad NUMERIC,

  -- Economic
  estimated_capex_cad NUMERIC,

  -- Metadata
  data_source TEXT,
  operator_url TEXT,
  notes TEXT,
  last_updated DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_prov_queue_province ON provincial_interconnection_queues(province_code);
CREATE INDEX idx_prov_queue_iso ON provincial_interconnection_queues(iso_operator);
CREATE INDEX idx_prov_queue_type ON provincial_interconnection_queues(project_type);
CREATE INDEX idx_prov_queue_status ON provincial_interconnection_queues(status);
CREATE INDEX idx_prov_queue_capacity ON provincial_interconnection_queues(capacity_mw DESC);

COMMENT ON TABLE provincial_interconnection_queues IS 'Unified cross-Canada interconnection queue tracking for all provinces and ISOs';

-- ============================================================================
-- SEED DATA: IESO Battery Storage Procurement (LT1 RFP Results)
-- ============================================================================

-- LT1 RFP Expedited - 881 MW Battery Storage (May/June 2023)
INSERT INTO ieso_interconnection_queue (
  id, project_name, proponent, location_region,
  project_type, capacity_mw, energy_capacity_mwh, storage_duration_hours,
  status, procurement_program, contract_awarded, contract_award_date,
  proposed_in_service_date, renewable_energy_credits, carbon_free,
  data_source, notes, last_updated
) VALUES
(
  '770e8400-e29b-41d4-a716-446655440001',
  'Atura Halton Hills BESS', 'Atura Power', 'West',
  'Battery Storage', 150, 600, 4,
  'Under Construction', 'Expedited LT1 RFP', TRUE, '2023-05-31',
  '2026-05-01', FALSE, TRUE,
  'IESO LT1 Expedited Results',
  'Part of 739 MW initial battery storage procurement announced May 2023',
  '2023-06-01'
),
(
  '770e8400-e29b-41d4-a716-446655440002',
  'Oneida Energy Storage', 'Six Nations Development Corporation', 'West',
  'Battery Storage', 250, 1000, 4,
  'Under Construction', 'Expedited LT1 RFP', TRUE, '2023-06-30',
  '2026-05-01', FALSE, TRUE,
  'IESO LT1 Expedited Results',
  'Part of 142 MW June 2023 batch. Indigenous partnership. Total Expedited LT1: 881 MW',
  '2023-06-30'
) ON CONFLICT (id) DO NOTHING;

-- LT1 RFP Main Results - 1,748 MW Battery Storage + 411 MW Gas/Biogas (May 2024)
INSERT INTO ieso_interconnection_queue (
  id, project_name, proponent, location_region,
  project_type, capacity_mw, energy_capacity_mwh, storage_duration_hours,
  status, procurement_program, contract_awarded, contract_award_date,
  proposed_in_service_date, renewable_energy_credits, carbon_free,
  data_source, notes, last_updated
) VALUES
(
  '770e8400-e29b-41d4-a716-446655440003',
  'Brighton Beach BESS', 'NRStor', 'East',
  'Battery Storage', 300, 1200, 4,
  'Connection Agreement Signed', 'LT1 RFP', TRUE, '2024-05-01',
  '2028-05-01', FALSE, TRUE,
  'IESO LT1 Main Results',
  'Part of 1,748.22 MW battery storage awarded May 2024. Total LT1 (all phases): 2,629 MW storage + 411 MW gas/biogas',
  '2024-05-01'
) ON CONFLICT (id) DO NOTHING;

-- LT2 RFP - 2,000 MW Renewable Energy by 2030
INSERT INTO ieso_interconnection_queue (
  id, project_name, proponent, location_region,
  project_type, capacity_mw,
  status, procurement_program,
  proposed_in_service_date,
  data_source, notes, last_updated
) VALUES
(
  '770e8400-e29b-41d4-a716-446655440010',
  'LT2 Wind Project Placeholder 1', 'TBD', 'Northwest',
  'Wind - Onshore', 500,
  'Early Development', 'LT2 RFP',
  '2030-12-31',
  'IESO LT2 Announcement December 2023',
  'LT2 RFP seeks 2,000 MW non-emitting generation (wind, solar, hydro) for 2030, plus 1,500 MW for 2032 and 1,500 MW for 2034. Total 5,000 MW renewable procurement.',
  '2023-12-01'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- IESO PROCUREMENT PROGRAMS SEED DATA
-- ============================================================================

INSERT INTO ieso_procurement_programs (
  id, program_name, program_type,
  target_capacity_mw, eligible_technologies,
  rfp_issued_date, rfp_closing_date, contract_award_date,
  contracted_capacity_mw, contract_count,
  target_in_service_year, target_in_service_date_end,
  status, program_rationale,
  notes, ieso_program_url
) VALUES
(
  '880e8400-e29b-41d4-a716-446655440001',
  'Expedited LT1 RFP - Battery Storage', 'Expedited Procurement',
  1000, ARRAY['Battery Storage'],
  '2023-01-01', '2023-04-01', '2023-05-31',
  881, 15,
  2026, '2026-05-01',
  'Contracts Awarded', 'Fast-track battery storage for grid reliability and renewable integration',
  'Total 881 MW awarded in two batches: 739 MW (May 2023) and 142 MW (June 2023). Largest energy storage procurement in Canadian history at the time.',
  'https://www.ieso.ca/en/Sector-Participants/Market-Operations/Markets-and-Related-Programs/Long-Term-RFP'
),
(
  '880e8400-e29b-41d4-a716-446655440002',
  'LT1 RFP - Storage and Capacity Resources', 'Long-Term RFP',
  2000, ARRAY['Battery Storage', 'Biogas', 'Natural Gas'],
  '2023-06-01', '2023-12-01', '2024-05-01',
  2159, 45,
  2028, '2028-12-31',
  'Contracts Awarded', 'Long-term capacity and storage for 2025-2035 demand growth',
  '1,748.22 MW battery storage + 410.69 MW gas/biogas. Total program value: $9.8B over contract life.',
  'https://www.ieso.ca/en/Sector-Participants/Market-Operations/Markets-and-Related-Programs/Long-Term-RFP'
),
(
  '880e8400-e29b-41d4-a716-446655440003',
  'LT2 RFP - Renewable Energy 2030', 'Long-Term RFP',
  2000, ARRAY['Wind - Onshore', 'Wind - Offshore', 'Solar', 'Hydroelectric', 'Battery Storage', 'Biogas', 'Hydrogen'],
  '2024-06-01', '2025-03-01', NULL,
  NULL, NULL,
  2030, '2030-12-31',
  'Under Evaluation', 'Non-emitting generation to meet 2030 emissions targets and AI data centre load growth',
  'Part of 5,000 MW cadenced procurement: 2,000 MW for 2030, 1,500 MW for 2032, 1,500 MW for 2034. Focus on wind, solar, hydro generation.',
  'https://www.ieso.ca/en/Sector-Participants/Market-Operations/Markets-and-Related-Programs/Long-Term-RFP'
),
(
  '880e8400-e29b-41d4-a716-446655440004',
  'LT3 RFP - Renewable Energy 2032', 'Long-Term RFP',
  1500, ARRAY['Wind - Onshore', 'Wind - Offshore', 'Solar', 'Hydroelectric', 'Battery Storage'],
  NULL, NULL, NULL,
  NULL, NULL,
  2032, '2032-12-31',
  'Announced', 'Continued renewable buildout for decarbonization',
  'Part of IESO 5-year cadenced procurement plan. RFP timing TBD.',
  'https://www.ieso.ca/'
),
(
  '880e8400-e29b-41d4-a716-446655440005',
  'LT4 RFP - Renewable Energy 2034', 'Long-Term RFP',
  1500, ARRAY['Wind - Onshore', 'Wind - Offshore', 'Solar', 'Hydroelectric', 'Battery Storage'],
  NULL, NULL, NULL,
  NULL, NULL,
  2034, '2034-12-31',
  'Announced', 'Long-term renewable energy buildout',
  'Final phase of 5,000 MW cadenced procurement announced December 2023.',
  'https://www.ieso.ca/'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- VIEWS FOR ANALYTICS
-- ============================================================================

CREATE OR REPLACE VIEW ieso_queue_summary AS
SELECT
  project_type,
  status,
  COUNT(*) as project_count,
  SUM(capacity_mw) as total_capacity_mw,
  SUM(energy_capacity_mwh) as total_energy_mwh,
  SUM(estimated_capex_cad) as total_investment_cad
FROM ieso_interconnection_queue
GROUP BY project_type, status;

COMMENT ON VIEW ieso_queue_summary IS 'Summary of IESO interconnection queue by technology and status';

CREATE OR REPLACE VIEW ieso_procurement_summary AS
SELECT
  program_name,
  program_type,
  status,
  target_capacity_mw,
  contracted_capacity_mw,
  contract_count,
  target_in_service_year,
  ROUND((contracted_capacity_mw::NUMERIC / NULLIF(target_capacity_mw, 0)) * 100, 1) as procurement_fill_rate_percent
FROM ieso_procurement_programs
ORDER BY target_in_service_year;

COMMENT ON VIEW ieso_procurement_summary IS 'Summary of IESO procurement programs with fill rates';
