# CRITICAL: Netlify Environment Variables Fix

## 🔴 Issue: Streaming Disabled in Production

**Symptom**: All data shows "Source: Fallback" instead of live streaming data  
**Root Cause**: `VITE_USE_STREAMING_DATASETS` is not set to `true` in Netlify  
**Impact**: No real-time data, all features use mock/fallback data

---

## ✅ IMMEDIATE FIX STEPS

### Step 1: Go to Netlify Dashboard
1. Visit: https://app.netlify.com/sites/canada-energy/settings/env
2. Or: Netlify Dashboard → Sites → canada-energy → Site Settings → Environment Variables

### Step 2: Verify/Add These Variables

**REQUIRED Variables** (must be exact):

```bash
# Supabase Configuration
VITE_SUPABASE_URL=<YOUR_SUPABASE_PROJECT_URL>
VITE_SUPABASE_ANON_KEY=<YOUR_SUPABASE_ANON_KEY>

# Feature Flags - CRITICAL
VITE_USE_STREAMING_DATASETS=true
VITE_ENABLE_EDGE_FETCH=true
VITE_DEBUG_LOGS=false
```

### Step 3: Set Scope
- **Important**: Set all variables to **"All scopes"** or at minimum **"Production"**
- Do NOT set to "Deploy previews" only

### Step 4: Trigger Redeploy
After saving environment variables:
```bash
# Option A: Trigger deploy from Netlify UI
# Go to: Deploys → Trigger deploy → Deploy site

# Option B: Redeploy from CLI
netlify deploy --prod --dir=dist
```

---

## 🔍 Verification Checklist

### After Redeployment, Check:

1. **Console Log** (https://canada-energy.netlify.app)
   ```javascript
   // Should show:
   enableLivestream: true  // ✅
   streamingFeatureEnabled: true  // ✅
   canUseStreaming: true  // ✅
   ```

2. **Dashboard Display**
   ```
   Data Sources: 4/4 Connected  // ✅ (not 0/4)
   Data: X records • Source: Streaming  // ✅ (not Fallback)
   ```

3. **Network Tab**
   - Should see requests to: `<YOUR_SUPABASE_EDGE_BASE>/stream-*`
   - Should NOT see only fallback data

---

## 📊 Current vs Expected State

### Current (BROKEN)
```
📊 Final Configuration: {
  enableLivestream: false,  ❌
  enableWebSocket: false,
  fallbackToMock: true,
  streamingFeatureEnabled: false  ❌
}

Data Sources: 0/4 Connected  ❌
Source: Fallback  ❌
```

### Expected (FIXED)
```
📊 Final Configuration: {
  enableLivestream: true,  ✅
  enableWebSocket: false,
  fallbackToMock: true,
  streamingFeatureEnabled: true  ✅
}

Data Sources: 4/4 Connected  ✅
Source: Streaming  ✅
```

---

## 🚨 Common Mistakes to Avoid

### ❌ WRONG:
```bash
# Missing VITE_ prefix
USE_STREAMING_DATASETS=true  # ❌ Won't work

# Wrong value
VITE_USE_STREAMING_DATASETS=1  # ❌ Must be "true" (string)

# Typo
VITE_USE_STREAMING_DATASET=true  # ❌ Missing 'S'
```

### ✅ CORRECT:
```bash
VITE_USE_STREAMING_DATASETS=true  # ✅ Exact match
```

---

## 🔧 Additional Issues Found

### Issue 2: Curtailment Recommendations Empty

**Symptom**: "No recommendations available" despite 7 events  
**Root Cause**: Recommendations table is empty  
**Fix**: Click "Generate Mock Event" button to create test data

### Issue 3: React Key Warning

**Symptom**: Console warning about missing keys  
**Location**: `RenewableOptimizationHub.tsx:306`  
**Fix**: Already identified, will fix after env vars

---

## 📝 Quick Copy-Paste for Netlify

**Copy these EXACT values into Netlify Environment Variables:**

```
Variable Name: VITE_SUPABASE_URL
Value: <YOUR_SUPABASE_PROJECT_URL>
Scopes: All scopes

Variable Name: VITE_SUPABASE_ANON_KEY
Value: <YOUR_SUPABASE_ANON_KEY>
Scopes: All scopes

Variable Name: VITE_USE_STREAMING_DATASETS
Value: true
Scopes: All scopes

Variable Name: VITE_ENABLE_EDGE_FETCH
Value: true
Scopes: All scopes

Variable Name: VITE_DEBUG_LOGS
Value: false
Scopes: All scopes
```

---

## ⏱️ Expected Timeline

1. **Add Environment Variables**: 2 minutes
2. **Trigger Redeploy**: 1 minute
3. **Build & Deploy**: ~1 minute
4. **Verification**: 2 minutes

**Total**: ~6 minutes to fix

---

## 🎯 Success Criteria

After fix, you should see:
- ✅ Data Sources: 4/4 Connected
- ✅ Source: Streaming (not Fallback)
- ✅ Real-time data updates
- ✅ Console shows `enableLivestream: true`
- ✅ Console shows `streamingFeatureEnabled: true`

---

**NEXT STEP**: Go to Netlify Dashboard and add the environment variables NOW!
