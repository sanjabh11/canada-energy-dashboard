# Phase 5 Scripts

Automation scripts for historical data import and curtailment replay.

## 🚀 Quick Start

### 1. Download Historical Data
```bash
chmod +x download-ieso-data.sh
./download-ieso-data.sh
```

Downloads IESO Ontario data (Sep-Oct 2024) to `./data/historical/ieso/`

### 2. Import into Database
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=your-service-key \
node import-historical-data.mjs
```

Imports ~8,000 observations with `historical_archive` provenance.

### 3. Run Curtailment Replay
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=your-service-key \
node run-curtailment-replay.mjs
```

Detects events, simulates AI recommendations, calculates MWh avoided.

### 4. Test APIs
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co \
VITE_SUPABASE_ANON_KEY=your-anon-key \
node test-phase5-apis.mjs
```

Validates storage dispatch and enhanced forecast APIs.

## 📁 Files

| Script | Purpose | Runtime |
|--------|---------|---------|
| `download-ieso-data.sh` | Download IESO CSVs | 2-5 min |
| `import-historical-data.mjs` | Import CSVs to Supabase | 10-15 min |
| `run-curtailment-replay.mjs` | Replay simulation | 3-5 min |
| `test-phase5-apis.mjs` | API validation | 30 sec |

## ⚙️ Environment Variables

| Variable | Required For | Get It From |
|----------|--------------|-------------|
| `VITE_SUPABASE_URL` | All scripts | Supabase project settings |
| `SUPABASE_SERVICE_ROLE_KEY` | Import, Replay | Supabase API settings (service_role) |
| `VITE_SUPABASE_ANON_KEY` | Testing | Supabase API settings (anon public) |

## 📊 Expected Output

### Download Script
```
✅ Download complete!
Files saved to: ./data/historical/ieso/
- generator_output_oct2024.csv (25 MB)
- ontario_demand_oct2024.csv (5 MB)
- generator_output_sep2024.csv (25 MB)
- ontario_demand_sep2024.csv (5 MB)
```

### Import Script
```
✅ All historical data imported successfully!
Summary:
- Total generation observations: 6,720
- Total demand observations: 1,464
- Date range: September 2024 - October 2024
- Province: ON (Ontario)
- Provenance: historical_archive
```

### Replay Script
```
📈 AWARD EVIDENCE SUMMARY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 Events detected: 18
⚡ Total curtailed (baseline): 1,245 MWh
✅ AI-avoided curtailment: 542 MWh
📊 Curtailment reduction: 43.5%
💰 Opportunity cost saved: $27,100 CAD
💵 Net economic benefit: $48,500 CAD
🏆 ROI: 8.2x
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 🐛 Troubleshooting

### "Failed to download"
- Check internet connection
- IESO may have moved files - verify URLs at http://reports.ieso.ca/public/
- Try manual download and place in `./data/historical/ieso/`

### "Missing environment variables"
- Ensure `.env` file exists or export variables
- For service_role key, use Settings > API > service_role (not anon)

### "No curtailment events detected"
- Ensure historical data imported first
- Check October 2024 had limited oversupply - normal behavior
- Adjust thresholds in `run-curtailment-replay.mjs` if needed

### "CSV parse error"
- IESO format may have changed - check CSV structure
- Update column names in `import-historical-data.mjs`

## 📝 Notes

- Scripts use `@supabase/supabase-js` - ensure installed: `npm install`
- Historical data is ~60MB download, takes 15 min to import
- Replay simulation requires completed import
- All data tagged with `historical_archive` provenance
