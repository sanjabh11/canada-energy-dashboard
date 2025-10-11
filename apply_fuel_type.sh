#!/bin/bash
# Apply fuel type migration via Supabase SQL Editor
echo "⚠️  Manual Step Required:"
echo ""
echo "1. Open: https://supabase.com/dashboard/project/qnymbecjgeaoxsfphrti/sql/new"
echo "2. Copy contents of: supabase/migrations/20251011_add_fuel_type_breakdown.sql"
echo "3. Click RUN"
echo ""
echo "This adds fuel_type column and creates renewable_penetration_by_province view"
