-- Household Energy Advisor - Database Schema
-- Migration: Create tables for household profiles, rebates, and related data

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- HOUSEHOLD PROFILES
-- ============================================================================
CREATE TABLE IF NOT EXISTS household_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT UNIQUE NOT NULL,
  province TEXT NOT NULL CHECK (province IN ('ON', 'AB', 'BC', 'QC', 'SK', 'MB', 'NS', 'NB', 'PE', 'NL', 'YT', 'NT', 'NU')),
  postal_code TEXT,
  home_type TEXT NOT NULL CHECK (home_type IN ('house', 'apartment', 'condo', 'townhouse')),
  square_footage INTEGER CHECK (square_footage > 0),
  occupants INTEGER CHECK (occupants > 0),
  heating_type TEXT NOT NULL CHECK (heating_type IN ('gas', 'electric', 'oil', 'heat-pump', 'dual', 'other')),
  has_ac BOOLEAN DEFAULT false,
  has_solar BOOLEAN DEFAULT false,
  has_ev BOOLEAN DEFAULT false,
  utility_provider TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_household_profiles_province ON household_profiles(province);
CREATE INDEX idx_household_profiles_user_id ON household_profiles(user_id);
CREATE INDEX idx_household_profiles_home_type ON household_profiles(home_type);

-- ============================================================================
-- MONTHLY USAGE DATA
-- ============================================================================
CREATE TABLE IF NOT EXISTS household_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES household_profiles(id) ON DELETE CASCADE,
  month TEXT NOT NULL, -- Format: YYYY-MM
  consumption_kwh NUMERIC NOT NULL CHECK (consumption_kwh >= 0),
  cost_cad NUMERIC NOT NULL CHECK (cost_cad >= 0),
  peak_usage_hours JSONB, -- Array of hours (0-23)
  weather_data JSONB, -- {avgTemp, heatingDegreeDays, coolingDegreeDays}
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(household_id, month)
);

CREATE INDEX idx_household_usage_household_id ON household_usage(household_id);
CREATE INDEX idx_household_usage_month ON household_usage(month);

-- ============================================================================
-- ENERGY REBATES DATABASE
-- ============================================================================
CREATE TABLE IF NOT EXISTS energy_rebates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('federal', 'provincial', 'municipal', 'utility', 'other')),
  province TEXT NOT NULL CHECK (province IN ('ALL', 'ON', 'AB', 'BC', 'QC', 'SK', 'MB', 'NS', 'NB', 'PE', 'NL', 'YT', 'NT', 'NU')),
  amount_min INTEGER NOT NULL DEFAULT 0,
  amount_max INTEGER NOT NULL CHECK (amount_max >= amount_min),
  rebate_type TEXT NOT NULL CHECK (rebate_type IN ('heat-pump', 'insulation', 'windows', 'solar', 'EV-charger', 'smart-thermostat', 'appliance', 'home-retrofit', 'energy-audit', 'other')),
  eligibility_json JSONB, -- Flexible eligibility criteria
  application_url TEXT NOT NULL,
  description TEXT NOT NULL,
  estimated_processing_time TEXT,
  active_until DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_energy_rebates_province ON energy_rebates(province);
CREATE INDEX idx_energy_rebates_type ON energy_rebates(rebate_type);
CREATE INDEX idx_energy_rebates_provider ON energy_rebates(provider);
CREATE INDEX idx_energy_rebates_active ON energy_rebates(is_active);

-- ============================================================================
-- RECOMMENDATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS household_recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES household_profiles(id) ON DELETE CASCADE,
  recommendation_id TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('behavioral', 'upgrade', 'rebate', 'emergency', 'education')),
  priority TEXT NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  potential_savings_json JSONB NOT NULL, -- {monthly, annual, kwh, co2Reduction}
  effort TEXT NOT NULL CHECK (effort IN ('easy', 'moderate', 'significant')),
  action_steps_json JSONB NOT NULL, -- Array of action steps
  related_rebates JSONB, -- Array of rebate IDs
  is_completed BOOLEAN DEFAULT false,
  implemented_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_household_recommendations_household_id ON household_recommendations(household_id);
CREATE INDEX idx_household_recommendations_priority ON household_recommendations(priority);
CREATE INDEX idx_household_recommendations_completed ON household_recommendations(is_completed);

-- ============================================================================
-- SAVINGS TRACKER
-- ============================================================================
CREATE TABLE IF NOT EXISTS household_savings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES household_profiles(id) ON DELETE CASCADE,
  recommendation_id UUID REFERENCES household_recommendations(id) ON DELETE SET NULL,
  month TEXT NOT NULL, -- Format: YYYY-MM
  saved_kwh NUMERIC DEFAULT 0,
  saved_cad NUMERIC DEFAULT 0,
  co2_reduced NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(household_id, recommendation_id, month)
);

CREATE INDEX idx_household_savings_household_id ON household_savings(household_id);
CREATE INDEX idx_household_savings_month ON household_savings(month);

-- ============================================================================
-- CHAT CONVERSATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS household_chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES household_profiles(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  context_json JSONB, -- Additional context (recommendations, rebates, metrics)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_household_chat_household_id ON household_chat_messages(household_id);
CREATE INDEX idx_household_chat_session_id ON household_chat_messages(session_id);
CREATE INDEX idx_household_chat_created_at ON household_chat_messages(created_at DESC);

-- ============================================================================
-- ALERTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS household_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES household_profiles(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('price-spike', 'high-usage', 'rebate-match', 'tip', 'emergency')),
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  is_read BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_household_alerts_household_id ON household_alerts(household_id);
CREATE INDEX idx_household_alerts_read ON household_alerts(is_read);
CREATE INDEX idx_household_alerts_created_at ON household_alerts(created_at DESC);

-- ============================================================================
-- USER PREFERENCES
-- ============================================================================
CREATE TABLE IF NOT EXISTS household_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID UNIQUE NOT NULL REFERENCES household_profiles(id) ON DELETE CASCADE,
  language TEXT DEFAULT 'en' CHECK (language IN ('en', 'fr')),
  alert_price_spikes BOOLEAN DEFAULT true,
  alert_high_usage BOOLEAN DEFAULT true,
  alert_rebate_opportunities BOOLEAN DEFAULT true,
  alert_savings_tips BOOLEAN DEFAULT true,
  notification_method TEXT DEFAULT 'none' CHECK (notification_method IN ('email', 'sms', 'push', 'none')),
  privacy_data_storage BOOLEAN DEFAULT true,
  privacy_analytics BOOLEAN DEFAULT true,
  privacy_marketing BOOLEAN DEFAULT false,
  privacy_consent_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_household_preferences_household_id ON household_preferences(household_id);

-- ============================================================================
-- BENCHMARKING DATA (Aggregated, Anonymous)
-- ============================================================================
CREATE TABLE IF NOT EXISTS household_benchmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  province TEXT NOT NULL,
  home_type TEXT NOT NULL,
  square_footage_range TEXT NOT NULL, -- e.g., "1000-1500"
  occupants INTEGER NOT NULL,
  heating_type TEXT NOT NULL,
  avg_consumption_kwh NUMERIC NOT NULL,
  avg_cost_cad NUMERIC NOT NULL,
  sample_size INTEGER NOT NULL,
  month TEXT NOT NULL, -- Format: YYYY-MM
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(province, home_type, square_footage_range, occupants, heating_type, month)
);

CREATE INDEX idx_household_benchmarks_lookup ON household_benchmarks(province, home_type, occupants, month);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_household_profiles_updated_at
  BEFORE UPDATE ON household_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_energy_rebates_updated_at
  BEFORE UPDATE ON energy_rebates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_household_recommendations_updated_at
  BEFORE UPDATE ON household_recommendations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_household_preferences_updated_at
  BEFORE UPDATE ON household_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- INITIAL DATA: Sample Rebates
-- ============================================================================

INSERT INTO energy_rebates (id, name, provider, province, amount_min, amount_max, rebate_type, eligibility_json, application_url, description, estimated_processing_time, is_active)
VALUES
  ('canada-greener-homes', 'Canada Greener Homes Grant', 'federal', 'ALL', 125, 5000, 'home-retrofit', 
   '{"homeOwner": true, "requiresAudit": true}'::jsonb,
   'https://natural-resources.canada.ca/energy-efficiency/homes/canada-greener-homes-grant/23441',
   'Get up to $5,000 to make energy-efficient retrofits to your home, plus $600 for pre- and post-retrofit EnergyGuide evaluations.',
   '8-12 weeks', true),
   
  ('canada-oil-to-heat-pump', 'Oil to Heat Pump Affordability Grant', 'federal', 'ALL', 10000, 15000, 'heat-pump',
   '{"homeOwner": true, "currentHeating": "oil"}'::jsonb,
   'https://natural-resources.canada.ca/energy-efficiency/homes/canada-greener-homes-initiative/oil-heat-pump-affordability-program/24775',
   'Up to $15,000 for low-income households switching from oil heating to a heat pump.',
   '10-14 weeks', true),
   
  ('on-home-efficiency-rebate', 'Ontario Home Efficiency Rebate Plus', 'provincial', 'ON', 0, 10000, 'heat-pump',
   '{"homeOwner": true, "requiresAudit": true}'::jsonb,
   'https://www.ontario.ca/page/home-efficiency-rebate-plus',
   'Ontario homeowners can get up to $10,000 in rebates for heat pumps and home insulation upgrades.',
   '6-10 weeks', true),
   
  ('bc-home-renovation-rebate', 'CleanBC Home Renovation Rebate', 'provincial', 'BC', 0, 6000, 'heat-pump',
   '{"homeOwner": true}'::jsonb,
   'https://betterhomesbc.ca/',
   'Get up to $6,000 for installing an air-source or ground-source heat pump in BC.',
   '4-8 weeks', true),
   
  ('qc-logis-vert', 'Rénoclimat - Logis-Vert', 'provincial', 'QC', 0, 9000, 'home-retrofit',
   '{"homeOwner": true, "requiresAudit": true}'::jsonb,
   'https://www.transitionenergetique.gouv.qc.ca/residentiel/programmes/renoclimat',
   'Quebec homeowners can get up to $9,000 for energy efficiency improvements.',
   '8-12 weeks', true),
   
  ('smart-thermostat-generic', 'Smart Thermostat Rebate', 'utility', 'ALL', 50, 150, 'smart-thermostat',
   '{}'::jsonb,
   'https://www.nrcan.gc.ca/energy-efficiency/homes/make-your-home-more-energy-efficient/20546',
   'Many utilities offer $50-150 rebates for smart thermostats. Check with your local utility.',
   '2-4 weeks', true),
   
  ('ev-charger-rebate', 'Zero-Emission Vehicle Charger Rebate', 'federal', 'ALL', 0, 5000, 'EV-charger',
   '{"homeOwner": true}'::jsonb,
   'https://natural-resources.canada.ca/energy-efficiency/transportation-alternative-fuels/zero-emission-vehicle-infrastructure-program/21876',
   'Get up to $5,000 for installing a Level 2 EV charger at home.',
   '6-8 weeks', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) - Optional, enable if using Supabase Auth
-- ============================================================================

-- Enable RLS on tables (commented out by default - enable in production with proper auth)
-- ALTER TABLE household_profiles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE household_usage ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE household_recommendations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE household_savings ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE household_chat_messages ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE household_alerts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE household_preferences ENABLE ROW LEVEL SECURITY;

-- Sample RLS policies (customize based on your auth setup)
-- CREATE POLICY "Users can view own profile" ON household_profiles
--   FOR SELECT USING (auth.uid()::text = user_id);
-- 
-- CREATE POLICY "Users can update own profile" ON household_profiles
--   FOR UPDATE USING (auth.uid()::text = user_id);

-- ============================================================================
-- GRANTS - Public read access for rebates, restricted for personal data
-- ============================================================================

-- Public read access for rebates
GRANT SELECT ON energy_rebates TO anon, authenticated;

-- Authenticated users can manage their own data
GRANT ALL ON household_profiles TO authenticated;
GRANT ALL ON household_usage TO authenticated;
GRANT ALL ON household_recommendations TO authenticated;
GRANT ALL ON household_savings TO authenticated;
GRANT ALL ON household_chat_messages TO authenticated;
GRANT ALL ON household_alerts TO authenticated;
GRANT ALL ON household_preferences TO authenticated;

-- Public read for benchmarks (anonymous data)
GRANT SELECT ON household_benchmarks TO anon, authenticated;

COMMENT ON TABLE household_profiles IS 'Household energy profiles with home characteristics and energy setup';
COMMENT ON TABLE household_usage IS 'Monthly electricity usage and cost tracking';
COMMENT ON TABLE energy_rebates IS 'Federal, provincial, and utility rebate programs database';
COMMENT ON TABLE household_recommendations IS 'Personalized energy-saving recommendations';
COMMENT ON TABLE household_savings IS 'Track savings achieved from implemented recommendations';
COMMENT ON TABLE household_chat_messages IS 'Conversational AI chat history';
COMMENT ON TABLE household_alerts IS 'Energy alerts and notifications for households';
COMMENT ON TABLE household_preferences IS 'User preferences for notifications and privacy';
COMMENT ON TABLE household_benchmarks IS 'Anonymous aggregated benchmark data for comparisons';
