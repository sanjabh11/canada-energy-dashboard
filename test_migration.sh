#!/bin/bash

# Test script for migration push
echo "Testing Supabase migration push..."
echo "Using password: posit12#"

# Run the migration push with password
echo "posit12#" | supabase db push --password-stdin

echo "Migration push completed with exit code: $?"
