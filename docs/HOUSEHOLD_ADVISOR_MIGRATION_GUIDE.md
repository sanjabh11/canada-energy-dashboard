# 🔄 Household Energy Advisor - Database Migration Guide

## Overview

This guide walks you through setting up the database schema for the Household Energy Advisor feature. The migration creates 8 tables with proper indexes, constraints, and pre-populated rebate data.

---

## 📋 Prerequisites

- Supabase CLI installed (`npm install -g supabase`)
- PostgreSQL 14+ (if running locally)
- Supabase project created (or local instance running)

---

## 🚀 Quick Setup

### Option 1: Using Supabase CLI (Recommended)

```bash
# Navigate to project root
cd /path/to/energy-data-dashboard

# Push migration to Supabase
cd supabase
supabase db push

# Verify tables created
supabase db list
```

**Expected Output:**
```
✓ Migration applied: 20250104_household_advisor_tables.sql
✓ Created 8 tables
✓ Created 15+ indexes
✓ Inserted 7 rebate programs
```

---

### Option 2: Manual SQL Execution

If you prefer to run the migration manually:

```bash
# Copy the migration file
cp supabase/migrations/20250104_household_advisor_tables.sql /tmp/

# Connect to your database
psql -U postgres -d your_database

# Execute the migration
\i /tmp/20250104_household_advisor_tables.sql

# Verify
\dt household_*
```

---

### Option 3: Supabase Dashboard

1. Go to https://app.supabase.com
2. Select your project
3. Navigate to **SQL Editor**
4. Paste contents of `supabase/migrations/20250104_household_advisor_tables.sql`
5. Click **Run**

---

## 📊 Tables Created

### 1. `household_profiles`
**Purpose**: Store household characteristics and energy setup

**Columns**:
- `id` (UUID, PK)
- `user_id` (TEXT, unique)
- `province` (TEXT)
- `postal_code` (TEXT, optional)
- `home_type` (TEXT: house|apartment|condo|townhouse)
- `square_footage` (INTEGER)
- `occupants` (INTEGER)
- `heating_type` (TEXT: gas|electric|oil|heat-pump|dual|other)
- `has_ac` (BOOLEAN)
- `has_solar` (BOOLEAN)
- `has_ev` (BOOLEAN)
- `utility_provider` (TEXT, optional)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

**Indexes**:
- `idx_household_profiles_province`
- `idx_household_profiles_user_id`
- `idx_household_profiles_home_type`

---

### 2. `household_usage`
**Purpose**: Track monthly electricity consumption

**Columns**:
- `id` (UUID, PK)
- `household_id` (UUID, FK → household_profiles)
- `month` (TEXT, format: YYYY-MM)
- `consumption_kwh` (NUMERIC)
- `cost_cad` (NUMERIC)
- `peak_usage_hours` (JSONB, array of hours 0-23)
- `weather_data` (JSONB, optional)
- `notes` (TEXT, optional)
- `created_at` (TIMESTAMPTZ)

**Constraints**:
- Unique(household_id, month)
- Check: consumption_kwh >= 0
- Check: cost_cad >= 0

**Indexes**:
- `idx_household_usage_household_id`
- `idx_household_usage_month`

---

### 3. `energy_rebates`
**Purpose**: Database of federal, provincial, and utility rebate programs

**Columns**:
- `id` (TEXT, PK)
- `name` (TEXT)
- `provider` (TEXT: federal|provincial|municipal|utility|other)
- `province` (TEXT: ALL|ON|AB|BC|QC|...)
- `amount_min` (INTEGER)
- `amount_max` (INTEGER)
- `rebate_type` (TEXT: heat-pump|solar|EV-charger|...)
- `eligibility_json` (JSONB)
- `application_url` (TEXT)
- `description` (TEXT)
- `estimated_processing_time` (TEXT, optional)
- `active_until` (DATE, optional)
- `is_active` (BOOLEAN, default: true)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

**Indexes**:
- `idx_energy_rebates_province`
- `idx_energy_rebates_type`
- `idx_energy_rebates_provider`
- `idx_energy_rebates_active`

**Pre-populated Data**: 7 rebate programs (see below)

---

### 4. `household_recommendations`
**Purpose**: Store AI-generated energy-saving recommendations

**Columns**:
- `id` (UUID, PK)
- `household_id` (UUID, FK → household_profiles)
- `recommendation_id` (TEXT)
- `category` (TEXT: behavioral|upgrade|rebate|emergency|education)
- `priority` (TEXT: high|medium|low)
- `title` (TEXT)
- `description` (TEXT)
- `potential_savings_json` (JSONB)
- `effort` (TEXT: easy|moderate|significant)
- `action_steps_json` (JSONB)
- `related_rebates` (JSONB, optional)
- `is_completed` (BOOLEAN, default: false)
- `implemented_at` (TIMESTAMPTZ, optional)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

**Indexes**:
- `idx_household_recommendations_household_id`
- `idx_household_recommendations_priority`
- `idx_household_recommendations_completed`

---

### 5. `household_savings`
**Purpose**: Track actual savings from implemented recommendations

**Columns**:
- `id` (UUID, PK)
- `household_id` (UUID, FK → household_profiles)
- `recommendation_id` (UUID, FK → household_recommendations, optional)
- `month` (TEXT, format: YYYY-MM)
- `saved_kwh` (NUMERIC)
- `saved_cad` (NUMERIC)
- `co2_reduced` (NUMERIC, kg)
- `notes` (TEXT, optional)
- `created_at` (TIMESTAMPTZ)

**Constraints**:
- Unique(household_id, recommendation_id, month)

**Indexes**:
- `idx_household_savings_household_id`
- `idx_household_savings_month`

---

### 6. `household_chat_messages`
**Purpose**: Store conversation history with AI advisor

**Columns**:
- `id` (UUID, PK)
- `household_id` (UUID, FK → household_profiles)
- `session_id` (TEXT)
- `role` (TEXT: user|assistant|system)
- `content` (TEXT)
- `context_json` (JSONB, optional)
- `created_at` (TIMESTAMPTZ)

**Indexes**:
- `idx_household_chat_household_id`
- `idx_household_chat_session_id`
- `idx_household_chat_created_at`

---

### 7. `household_alerts`
**Purpose**: Energy-related notifications and alerts

**Columns**:
- `id` (UUID, PK)
- `household_id` (UUID, FK → household_profiles)
- `alert_type` (TEXT: price-spike|high-usage|rebate-match|tip|emergency)
- `priority` (TEXT: low|medium|high|critical)
- `title` (TEXT)
- `message` (TEXT)
- `action_url` (TEXT, optional)
- `is_read` (BOOLEAN, default: false)
- `expires_at` (TIMESTAMPTZ, optional)
- `created_at` (TIMESTAMPTZ)

**Indexes**:
- `idx_household_alerts_household_id`
- `idx_household_alerts_read`
- `idx_household_alerts_created_at`

---

### 8. `household_preferences`
**Purpose**: User notification and privacy settings

**Columns**:
- `id` (UUID, PK)
- `household_id` (UUID, FK → household_profiles, unique)
- `language` (TEXT: en|fr)
- `alert_price_spikes` (BOOLEAN)
- `alert_high_usage` (BOOLEAN)
- `alert_rebate_opportunities` (BOOLEAN)
- `alert_savings_tips` (BOOLEAN)
- `notification_method` (TEXT: email|sms|push|none)
- `privacy_data_storage` (BOOLEAN)
- `privacy_analytics` (BOOLEAN)
- `privacy_marketing` (BOOLEAN)
- `privacy_consent_date` (TIMESTAMPTZ, optional)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

**Indexes**:
- `idx_household_preferences_household_id`

---

### 9. `household_benchmarks` (Aggregated Data)
**Purpose**: Anonymous comparison data for similar homes

**Columns**:
- `id` (UUID, PK)
- `province` (TEXT)
- `home_type` (TEXT)
- `square_footage_range` (TEXT, e.g., "1000-1500")
- `occupants` (INTEGER)
- `heating_type` (TEXT)
- `avg_consumption_kwh` (NUMERIC)
- `avg_cost_cad` (NUMERIC)
- `sample_size` (INTEGER)
- `month` (TEXT, format: YYYY-MM)
- `created_at` (TIMESTAMPTZ)

**Constraints**:
- Unique(province, home_type, square_footage_range, occupants, heating_type, month)

**Indexes**:
- `idx_household_benchmarks_lookup`

---

## 🎁 Pre-Populated Rebate Programs

The migration includes 7 rebate programs:

1. **Canada Greener Homes Grant** (Federal, ALL provinces)
   - Amount: $125 - $5,000
   - Type: home-retrofit
   - Requires: Energy audit

2. **Oil to Heat Pump Affordability Grant** (Federal, ALL provinces)
   - Amount: $10,000 - $15,000
   - Type: heat-pump
   - For: Low-income households with oil heating

3. **Ontario Home Efficiency Rebate Plus** (Provincial, ON)
   - Amount: $0 - $10,000
   - Type: heat-pump
   - Requires: Energy audit

4. **CleanBC Home Renovation Rebate** (Provincial, BC)
   - Amount: $0 - $6,000
   - Type: heat-pump

5. **Rénoclimat - Logis-Vert** (Provincial, QC)
   - Amount: $0 - $9,000
   - Type: home-retrofit
   - Requires: Energy audit

6. **Smart Thermostat Rebate** (Utility, ALL provinces)
   - Amount: $50 - $150
   - Type: smart-thermostat

7. **Zero-Emission Vehicle Charger Rebate** (Federal, ALL provinces)
   - Amount: $0 - $5,000
   - Type: EV-charger

**Total Potential**: Up to $25,000+ per household

---

## ✅ Verification Steps

After migration, verify everything is working:

### Check Tables
```sql
-- Count tables created
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'household_%';
-- Expected: 8

-- Count energy_rebates table
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'energy_rebates';
-- Expected: 1

-- Total: 9 tables
```

### Check Rebate Data
```sql
-- Verify rebates inserted
SELECT COUNT(*) FROM energy_rebates;
-- Expected: 7

-- View rebates by province
SELECT province, COUNT(*) 
FROM energy_rebates 
GROUP BY province 
ORDER BY province;

-- Check for federal rebates
SELECT name, amount_max 
FROM energy_rebates 
WHERE provider = 'federal';
```

### Check Indexes
```sql
-- Count indexes
SELECT COUNT(*) 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename LIKE 'household_%';
-- Expected: 15+
```

### Check Triggers
```sql
-- Verify update triggers
SELECT tgname, tgrelid::regclass 
FROM pg_trigger 
WHERE tgname LIKE '%updated_at%';
-- Expected: 4 triggers
```

---

## 🔐 Row Level Security (Optional)

The migration includes commented-out RLS policies. To enable:

### 1. Enable RLS on Tables
```sql
ALTER TABLE household_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_savings ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_preferences ENABLE ROW LEVEL SECURITY;
```

### 2. Create Policies
```sql
-- Users can view own profile
CREATE POLICY "Users can view own profile" ON household_profiles
  FOR SELECT USING (auth.uid()::text = user_id);

-- Users can update own profile
CREATE POLICY "Users can update own profile" ON household_profiles
  FOR UPDATE USING (auth.uid()::text = user_id);

-- Users can insert own data
CREATE POLICY "Users can insert own data" ON household_profiles
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Apply similar policies to other tables
```

### 3. Public Read for Rebates
```sql
-- Already included in migration
GRANT SELECT ON energy_rebates TO anon, authenticated;
```

---

## 🛠️ Maintenance

### Adding New Rebates

```sql
INSERT INTO energy_rebates VALUES
  ('your-rebate-id', 
   'Rebate Name', 
   'provincial', 
   'ON', 
   100, 5000, 
   'heat-pump', 
   '{"homeOwner": true, "incomeLimit": 90000}'::jsonb,
   'https://application-url.ca',
   'Description of the rebate',
   '6-8 weeks', 
   NULL, 
   true,
   NOW(),
   NOW()
  );
```

### Updating Rebate Amounts

```sql
UPDATE energy_rebates 
SET amount_max = 12000, 
    updated_at = NOW()
WHERE id = 'on-home-efficiency-rebate';
```

### Deactivating Expired Rebates

```sql
UPDATE energy_rebates 
SET is_active = false, 
    updated_at = NOW()
WHERE active_until < CURRENT_DATE;
```

### Cleaning Old Data

```sql
-- Delete chat messages older than 1 year
DELETE FROM household_chat_messages 
WHERE created_at < NOW() - INTERVAL '1 year';

-- Archive old usage data (move to separate table)
-- Depends on your archival strategy
```

---

## 🔄 Rollback

If you need to rollback the migration:

```sql
-- Drop all tables (cascades to related data)
DROP TABLE IF EXISTS household_benchmarks CASCADE;
DROP TABLE IF EXISTS household_preferences CASCADE;
DROP TABLE IF EXISTS household_alerts CASCADE;
DROP TABLE IF EXISTS household_chat_messages CASCADE;
DROP TABLE IF EXISTS household_savings CASCADE;
DROP TABLE IF EXISTS household_recommendations CASCADE;
DROP TABLE IF EXISTS energy_rebates CASCADE;
DROP TABLE IF EXISTS household_usage CASCADE;
DROP TABLE IF EXISTS household_profiles CASCADE;

-- Drop trigger function
DROP FUNCTION IF EXISTS update_updated_at_column();
```

**⚠️ WARNING: This will delete all household advisor data!**

---

## 📊 Performance Tuning

### Analyze Tables (Recommended after large inserts)

```sql
ANALYZE household_profiles;
ANALYZE household_usage;
ANALYZE energy_rebates;
ANALYZE household_recommendations;
```

### Check Index Usage

```sql
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE tablename LIKE 'household_%'
ORDER BY idx_scan DESC;
```

### Vacuum Tables (if needed)

```sql
VACUUM ANALYZE household_usage;
VACUUM ANALYZE household_chat_messages;
```

---

## 🧪 Test Data

### Insert Test Household

```sql
INSERT INTO household_profiles VALUES
  ('11111111-1111-1111-1111-111111111111',
   'test-user-1',
   'ON',
   'M5V 3A8',
   'house',
   1800,
   3,
   'electric',
   true,
   false,
   false,
   'Hydro One',
   NOW(),
   NOW()
  );
```

### Insert Test Usage

```sql
INSERT INTO household_usage VALUES
  ('22222222-2222-2222-2222-222222222222',
   '11111111-1111-1111-1111-111111111111',
   '2025-01',
   950,
   142,
   '[7,8,9,17,18,19,20,21]'::jsonb,
   '{"avgTemp": -8, "heatingDegreeDays": 700}'::jsonb,
   'Winter month - high heating usage',
   NOW()
  );
```

---

## 📝 Migration Checklist

Before deploying to production:

- [ ] Backup existing database
- [ ] Run migration in staging environment
- [ ] Verify all 9 tables created
- [ ] Verify 7 rebates inserted
- [ ] Test queries for performance
- [ ] Enable RLS (if using Supabase Auth)
- [ ] Grant appropriate permissions
- [ ] Test application integration
- [ ] Monitor database size
- [ ] Set up automated backups

---

## 🆘 Troubleshooting

### Error: "relation already exists"
**Solution**: Tables already exist. Either drop them first or skip migration.

### Error: "permission denied"
**Solution**: Ensure you have CREATE TABLE permissions.

### Error: "function uuid_generate_v4() does not exist"
**Solution**: Enable uuid extension first:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### Error: "column type JSONB does not exist"
**Solution**: Upgrade PostgreSQL to version 9.4+

---

## 📞 Support

If you encounter issues:

1. Check PostgreSQL version: `SELECT version();`
2. Check existing tables: `\dt household_*`
3. Check error logs in Supabase dashboard
4. Review migration file syntax
5. Consult: `docs/HOUSEHOLD_ADVISOR_README.md`

---

**Migration complete! Your database is ready for the Household Energy Advisor! 🎉**
