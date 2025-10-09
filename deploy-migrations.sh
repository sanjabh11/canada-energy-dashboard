#!/bin/bash
# Deploy migrations to Supabase with password
# Usage: ./deploy-migrations.sh

export PGPASSWORD='posit12#'
supabase db push --password "$PGPASSWORD"
