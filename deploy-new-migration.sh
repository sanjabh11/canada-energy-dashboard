#!/bin/bash
# Deploy new migration to Supabase

echo "Deploying migration: 20251010_province_configs_batteries.sql"
echo ""
echo "Please run this SQL in your Supabase SQL Editor:"
echo "https://supabase.com/dashboard/project/qnymbecjgeaoxsfphrti/sql/new"
echo ""
cat supabase/migrations/20251010_province_configs_batteries.sql
