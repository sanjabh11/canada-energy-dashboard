#!/bin/bash
###############################################################################
# Cleanup Session Files
###############################################################################
# Purpose: Remove temporary files from real data migration session
# Date: October 14, 2025
###############################################################################

set -e

echo "🧹 Cleaning up temporary session files..."

# Create archive directory
mkdir -p docs/archive/real-data-migration-oct2025

# Archive redundant documentation (keep for reference)
echo "📦 Archiving redundant documentation..."
mv -f MIGRATION_FIX.md docs/archive/real-data-migration-oct2025/ 2>/dev/null || true
mv -f EXECUTE_NOW.md docs/archive/real-data-migration-oct2025/ 2>/dev/null || true
mv -f QUICK_START_REAL_DATA.md docs/archive/real-data-migration-oct2025/ 2>/dev/null || true
mv -f REAL_DATA_EXECUTION_GUIDE.md docs/archive/real-data-migration-oct2025/ 2>/dev/null || true

# Keep these primary documents
echo "✅ Keeping primary documentation:"
echo "   - REAL_DATA_MIGRATION_PLAN.md"
echo "   - REAL_DATA_SUMMARY.md"
echo "   - FINAL_STEPS.md"
echo "   - COMPREHENSIVE_GAP_ANALYSIS_AND_IMPROVEMENTS.md"

# Remove backup files
echo "🗑️  Removing backup files..."
rm -f scripts/backfill-ieso-data.mjs.backup 2>/dev/null || true
rm -f scripts/*.backup 2>/dev/null || true

# Remove temporary SQL files
echo "🗑️  Removing temporary SQL files..."
rm -f /tmp/run_migration_*.sql 2>/dev/null || true

# List files that should be reviewed manually
echo ""
echo "⚠️  Files to review manually:"
echo "   - Check for any remaining .backup files"
echo "   - Review and consolidate PHASE5_*.md files if needed"
echo "   - Remove any console.log statements in production code"

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📁 Archived files location: docs/archive/real-data-migration-oct2025/"
echo "📋 Primary documentation preserved in root directory"
