#!/bin/bash
# Cleanup Script for Unused/Redundant Files
# Date: 2025-10-12
# Purpose: Remove unnecessary documentation and temporary files

echo "🧹 Starting cleanup of unused files..."

# List of files to remove (redundant documentation)
REDUNDANT_DOCS=(
  "ACTION_REQUIRED.md"
  "ALTERNATIVE_SOLUTION.md"
  "BLANK_PAGES_FIX.md"
  "CHECK_ENV.md"
  "CRITICAL_FIXES_CORS_AND_DATA.md"
  "CRITICAL_FIXES_CORS_CSP.md"
  "DEPLOYMENT_COMPLETE.md"
  "DEPLOYMENT_MANUAL_STEPS.md"
  "DEPLOY_EDGE_FUNCTIONS.md"
  "ERROR_RESOLUTION_COMPLETE.md"
  "FIXES_APPLIED_SUMMARY.md"
  "IMPLEMENTATION_SESSION_SUMMARY.md"
  "KEY_ROTATION_REQUIRED.md"
  "MIGRATION_FIXED.md"
  "MIGRATION_FIX_COMPLETE.md"
  "NETLIFY_ENV_FIX.md"
  "NETLIFY_ENV_VARS_FIX.md"
  "PHASE1_COMPLETION_VERIFIED.md"
  "PHASE1_IMPLEMENTATION_SUMMARY.md"
  "PHASE2_IMPLEMENTATION_SUMMARY.md"
  "PHASE5_DEPLOYMENT_STATUS.md"
  "PHASE5_IMPLEMENTATION_STATUS.md"
  "PHASE5_IMPLEMENTATION_SUMMARY_TABLE.md"
  "PRODUCTION_ISSUES_SUMMARY.md"
  "QUICK_FIX_GUIDE.md"
  "QUICK_START_PHASES_1_2.md"
  "SESSION_IMPROVEMENTS_SUMMARY.md"
  "SESSION_SUMMARY_2025-10-10.md"
  "STREAMING_FALLBACK_DEBUG.md"
  "STREAMING_FIX_COMPLETE.md"
  "STREAMING_FIX_PLAN.md"
  "STREAMING_STATUS.md"
  "TIER1_IMPLEMENTATION_SUMMARY.md"
)

# Create archive directory
ARCHIVE_DIR="docs/archive/$(date +%Y%m%d)"
mkdir -p "$ARCHIVE_DIR"

# Move redundant docs to archive
echo "📦 Archiving redundant documentation..."
for file in "${REDUNDANT_DOCS[@]}"; do
  if [ -f "$file" ]; then
    mv "$file" "$ARCHIVE_DIR/"
    echo "  ✅ Archived: $file"
  fi
done

# Remove temporary files
echo "🗑️  Removing temporary files..."
find . -name "*.backup" -type f -delete
find . -name "*.tmp" -type f -delete
find . -name ".DS_Store" -type f -delete
find . -name "*.log" -not -path "./node_modules/*" -type f -delete

# Remove empty directories
echo "📁 Removing empty directories..."
find . -type d -empty -not -path "./node_modules/*" -delete

# Keep only essential documentation
ESSENTIAL_DOCS=(
  "README.md"
  "COMPREHENSIVE_IMPLEMENTATION_STATUS.md"
  "BOTTLENECK_ANALYSIS_AND_COMPREHENSIVE_FIX.md"
  "THREE_GAPS_CLOSED_FINAL.md"
  "WIND_ACCURACY_INTEGRATION_COMPLETE.md"
  "FINAL_GAP_ANALYSIS_2025-10-10.md"
  "PHASE5_COMPLETE_FINAL_SUMMARY.md"
  "PHASE5_COMPREHENSIVE_GAP_ANALYSIS.md"
  "PHASE5_FINAL_VALIDATION_REPORT.md"
  "PHASE5_GAP_ANALYSIS_AND_PLAN.md"
  "PHASE5_TEST_SUITE_COMPLETE.md"
  "RENEWABLE_ENERGY_AWARD_STATUS.md"
  "SECURITY_AUDIT_REPORT.md"
  "SECURITY_REMEDIATION_PLAN.md"
)

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📊 Summary:"
echo "  - Archived: ${#REDUNDANT_DOCS[@]} redundant docs → $ARCHIVE_DIR"
echo "  - Removed: Temporary files (.backup, .tmp, .DS_Store, *.log)"
echo "  - Kept: ${#ESSENTIAL_DOCS[@]} essential documentation files"
echo ""
echo "📚 Essential docs remaining:"
for doc in "${ESSENTIAL_DOCS[@]}"; do
  if [ -f "$doc" ]; then
    echo "  ✅ $doc"
  fi
done
