-- ============================================================================
-- FIX MIGRATION 1 DATA - Re-insert AI Data Centres and AESO Queue
-- ============================================================================
-- Run this ONLY if ai_data_centres and aeso_interconnection_queue are empty
-- This script re-inserts the sample data that should have been inserted
-- during Migration 1.
-- ============================================================================

-- AI Data Centres (5 facilities - 2,180 MW total)
INSERT INTO ai_data_centres (id, facility_name, operator, location_city, province, status, announcement_date, expected_online_date, contracted_capacity_mw, pue_design, cooling_technology, capital_investment_cad, power_source, renewable_percentage, offgrid, latitude, longitude, gpu_count, primary_workload, notes) VALUES
('dc-ab-001', 'Calgary AI Compute Hub 1', 'Vantage Data Centers', 'Calgary', 'AB', 'Interconnection Queue', '2025-03-15', '2027-06-01', 450, 1.25, 'Free Cooling + Liquid', 2800000000, 'Hybrid', 35, FALSE, 51.0447, -114.0719, 50000, 'Mixed', 'First major AI data centre in Calgary region'),
('dc-ab-002', 'Edmonton AI Cloud Campus', 'Microsoft Azure', 'Edmonton', 'AB', 'Proposed', '2025-02-20', '2028-01-01', 750, 1.20, 'Liquid Cooling', 4500000000, 'Grid', 25, FALSE, 53.5461, -113.4938, 80000, 'Training', 'Partnership with University of Alberta'),
('dc-ab-003', 'Red Deer Modular AI Facility', 'Canadian AI Ventures', 'Red Deer', 'AB', 'Under Construction', '2024-11-10', '2026-03-01', 180, 1.30, 'Air Cooled', 850000000, 'Natural Gas', 0, TRUE, 52.2681, -113.8111, 15000, 'Inference', 'Off-grid natural gas powered with future CCUS integration'),
('dc-ab-004', 'Alberta Industrial Heartland AI Hub', 'AWS', 'Fort Saskatchewan', 'AB', 'Interconnection Queue', '2025-04-01', '2027-12-01', 600, 1.22, 'Free Cooling + Evaporative', 3600000000, 'Grid', 40, FALSE, 53.7134, -113.2105, 65000, 'Mixed', 'Near existing industrial infrastructure'),
('dc-ab-005', 'Lethbridge Green AI Centre', 'Google Cloud', 'Lethbridge', 'AB', 'Proposed', '2025-05-15', '2028-06-01', 320, 1.18, 'Liquid Cooling', 2100000000, 'Renewable', 95, FALSE, 49.6942, -112.8328, 35000, 'Training', '100% wind + solar target with battery storage')
ON CONFLICT (id) DO NOTHING;

-- AESO Interconnection Queue Projects (8 projects - 3,270 MW total)
INSERT INTO aeso_interconnection_queue (id, project_name, proponent, project_type, requested_capacity_mw, region, queue_position, submission_date, study_phase, phase_allocation, allocated_capacity_mw, expected_in_service_date, estimated_network_upgrade_cost_cad, requires_new_transmission, linked_data_centre_id, status, notes) VALUES
('aesoq-001', 'Calgary AI Hub Interconnection', 'Vantage Data Centers', 'AI Data Centre', 450, 'Calgary', 12, '2025-01-20', 'System Impact Study', 'Phase 1 (1200 MW)', 350, '2027-06-01', 125000000, TRUE, 'dc-ab-001', 'Active', 'Phase 1 allocation reduced from 450 MW to 350 MW'),
('aesoq-002', 'Edmonton AI Cloud Campus Grid Tie', 'Microsoft Azure', 'AI Data Centre', 750, 'Edmonton', 15, '2025-02-05', 'Feasibility Study', 'Phase 1 (1200 MW)', 430, '2028-01-01', 180000000, TRUE, 'dc-ab-002', 'Active', 'Largest single data centre project in Alberta'),
('aesoq-003', 'Fort Saskatchewan AI Hub', 'AWS', 'AI Data Centre', 600, 'East Central', 18, '2025-03-10', 'System Impact Study', 'Phase 2', NULL, '2027-12-01', 150000000, TRUE, 'dc-ab-004', 'Active', 'Awaiting Phase 2 allocation'),
('aesoq-004', 'Brooks Solar Farm 500 MW', 'Canadian Solar', 'Solar', 500, 'South', 8, '2024-09-15', 'Facility Study', 'Phase 1 (1200 MW)', 200, '2026-12-01', 95000000, TRUE, NULL, 'Active', 'To support data centre renewable energy requirements'),
('aesoq-005', 'Pincher Creek Wind 400 MW', 'TransAlta', 'Wind', 400, 'Southwest', 10, '2024-10-20', 'System Impact Study', 'Phase 1 (1200 MW)', 220, '2027-03-01', 75000000, FALSE, NULL, 'Active', 'Wind power for renewable energy offtake agreements'),
('aesoq-006', 'Medicine Hat Battery Storage 300 MW', 'ENMAX', 'Battery Storage', 300, 'Southeast', 14, '2025-01-15', 'Feasibility Study', 'Phase 2', NULL, '2027-09-01', 45000000, FALSE, NULL, 'Active', 'Grid stability for data centre load fluctuations'),
('aesoq-007', 'Lethbridge Green AI Interconnection', 'Google Cloud', 'AI Data Centre', 320, 'South', 20, '2025-04-01', 'Feasibility Study', 'Phase 2', NULL, '2028-06-01', 110000000, TRUE, 'dc-ab-005', 'Active', 'Requires dedicated renewable generation'),
('aesoq-008', 'Calgary Region Battery 200 MW', 'AltaLink', 'Battery Storage', 200, 'Calgary', 16, '2025-02-28', 'System Impact Study', 'Phase 2', NULL, '2027-06-01', 35000000, FALSE, NULL, 'Active', 'Support AI data centre ramping requirements')
ON CONFLICT (id) DO NOTHING;

-- Verify the inserts
SELECT '✅ AI Data Centres inserted:' as result, COUNT(*) as count FROM ai_data_centres;
SELECT '✅ AESO Queue projects inserted:' as result, COUNT(*) as count FROM aeso_interconnection_queue;

-- Expected results:
-- ✅ AI Data Centres inserted: 5
-- ✅ AESO Queue projects inserted: 8
