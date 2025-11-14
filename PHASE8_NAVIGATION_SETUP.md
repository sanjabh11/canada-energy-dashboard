# Phase 8 Navigation Setup Guide

## Problem
The CCUS Projects and Carbon Emissions dashboards exist but aren't accessible from the UI navigation yet.

## Quick Fix (Manual Method)

### Step 1: Add Imports

Edit `src/components/EnergyDataDashboard.tsx`

After line 48 (after `import HeatPumpDashboard from './HeatPumpDashboard';`), add:

```typescript
import CCUSProjectsDashboard from './CCUSProjectsDashboard';
import CarbonEmissionsDashboard from './CarbonEmissionsDashboard';
```

### Step 2: Add Help IDs

Find the `helpIdByTab` object (around line 50-77) and add these two entries at the end:

```typescript
  HeatPumps: 'page.heat-pumps',
  CCUS: 'page.ccus-projects',              // ADD THIS LINE
  CarbonEmissions: 'page.carbon-emissions'  // ADD THIS LINE
};
```

### Step 3: Add Navigation Tabs

Find the `<Tabs>` component (search for `<Tab label="Heat Pumps"`).

After the HeatPumps tab, add:

```typescript
<Tab label="Heat Pumps" value="HeatPumps" />
<Tab label="CCUS Projects" value="CCUS" />
<Tab label="Carbon Emissions" value="CarbonEmissions" />
```

### Step 4: Add Tab Panels

Find the `<TabPanel>` components (search for `<TabPanel value="HeatPumps"`).

After the HeatPumps TabPanel, add:

```typescript
<TabPanel value="HeatPumps">
  <HeatPumpDashboard />
</TabPanel>

<TabPanel value="CCUS">
  <CCUSProjectsDashboard />
</TabPanel>

<TabPanel value="CarbonEmissions">
  <CarbonEmissionsDashboard />
</TabPanel>
```

### Step 5: Rebuild and Deploy

```bash
npm run build
netlify deploy --prod --dir=dist
```

## Verification

After deployment, you should see two new tabs in the navigation:
- "CCUS Projects" - Shows 7 real CCUS projects ($32.3B, 13.8 Mt/year)
- "Carbon Emissions" - Shows provincial GHG emissions tracking

## Troubleshooting

**Problem:** Tabs don't appear
- **Solution:** Check browser cache, hard refresh (Ctrl+Shift+R)

**Problem:** Dashboard shows blank/loading
- **Solution:** Check console for API errors, verify CORS_ALLOWED_ORIGINS is set

**Problem:** TypeScript errors during build
- **Solution:** Run `git pull` to ensure you have latest fixes

