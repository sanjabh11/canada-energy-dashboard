# How to Access Phase 1 Dashboards - Visual Guide

## Problem: Phase 1 Tabs Are Hidden in "More" Dropdown

The new Phase 1 dashboards (AI Data Centres, Hydrogen Hub, Critical Minerals) are in the **"More" dropdown** because the navigation shows only the first 6 tabs directly.

## Current Navigation Layout

**Visible tabs (first 6):**
1. Home
2. Dashboard
3. Analytics & Trends
4. Provinces
5. Renewable Forecasts
6. My Energy AI

**Hidden in "More" dropdown (tabs 7+):**
7. **AI Data Centres** ← YOU WANT THIS
8. **Hydrogen Hub** ← YOU WANT THIS
9. **Critical Minerals** ← YOU WANT THIS
10. Curtailment Reduction
11. Storage Dispatch
12. Investment
13. Resilience
14. Innovation
15. Indigenous
16. Stakeholders
17. Grid Ops
18. Security
19. Features

---

## How to Access the "More" Dropdown

### Step 1: Locate the "More" Button

Look at your navigation bar (top of the screen). You should see:

```
[Home] [Dashboard] [Analytics & Trends] [Provinces] [Renewable Forecasts] [My Energy AI] [More ▾]
```

The **[More ▾]** button is at the end with a down arrow icon.

### Step 2: Click "More"

Click the **"More"** button. A dropdown menu should appear **directly below it** with a white background and border.

### Step 3: Look for Phase 1 Tabs

In the dropdown menu, you should see (at the very top):

```
🖥️ AI Data Centres
⛽ Hydrogen Hub
📦 Critical Minerals
💨 Curtailment Reduction
🔋 Storage Dispatch
... (more items below)
```

### Step 4: Click a Tab

Click on **"AI Data Centres"**, **"Hydrogen Hub"**, or **"Critical Minerals"** to open that dashboard.

---

## Troubleshooting: If You Don't See the Dropdown

### Issue 1: Dropdown Appears But Quickly Closes

**Symptom:** You click "More" but the dropdown closes immediately or doesn't stay open.

**Causes:**
- Click outside detection issue
- z-index overlap
- Page scroll causing repositioning

**Fix:** Try these in order:
1. Click "More" and **hold your mouse over the dropdown** (don't move away)
2. Scroll the page to the very top before clicking "More"
3. Try in a different browser (Chrome, Firefox, Safari)
4. Hard reload: **Ctrl+Shift+R** (Windows) or **Cmd+Shift+R** (Mac)

### Issue 2: Dropdown Hidden Behind Other Elements

**Symptom:** Dropdown appears but you can't see it or it's cut off.

**Fix:**
1. Open browser DevTools (F12)
2. Click "More" button
3. In DevTools, search for `z-50` or `.absolute` elements
4. Check if dropdown is being rendered but hidden

### Issue 3: Phase 1 Tabs Not in Dropdown

**Symptom:** Dropdown works but doesn't show AI Data Centres, Hydrogen Hub, or Critical Minerals.

**Possible causes:**
- Frontend not rebuilt after code changes
- Wrong build deployed
- Browser cache issue

**Fix:**
1. Clear browser cache completely
2. Hard reload: **Ctrl+Shift+R** (Windows) or **Cmd+Shift+R** (Mac)
3. Try incognito/private browsing mode
4. Check if build is latest: Look at footer for version/date
5. Rebuild if needed: `npm run build:prod`

---

## Better Solution: Move Phase 1 Tabs to Main Navigation

The current navigation hides your most important new features! Let's move them to be directly visible.

### Option A: Replace Less Important Tabs

**Recommended:** Remove "Analytics & Trends" from main nav (it's redundant with Dashboard) and add your Phase 1 tabs.

**New main navigation would be:**
1. Home
2. Dashboard
3. **AI Data Centres** ← NOW VISIBLE
4. **Hydrogen Hub** ← NOW VISIBLE
5. **Critical Minerals** ← NOW VISIBLE
6. My Energy AI
7. More ▾ (everything else)

### Option B: Increase Visible Tab Count

Change NavigationRibbon to show **9 tabs** instead of 6.

**New main navigation would be:**
1. Home
2. Dashboard
3. Analytics & Trends
4. Provinces
5. Renewable Forecasts
6. My Energy AI
7. **AI Data Centres** ← NOW VISIBLE
8. **Hydrogen Hub** ← NOW VISIBLE
9. **Critical Minerals** ← NOW VISIBLE
10. More ▾ (everything else)

---

## Would You Like Me to Implement a Fix?

I can quickly fix this navigation issue for you. Which would you prefer?

### Quick Fix Options:

**Option 1: Move Phase 1 tabs to position 3-5** (recommended)
- Moves AI Data Centres, Hydrogen Hub, Critical Minerals right after Dashboard
- Moves Analytics, Provinces, Renewable Forecasts to "More" dropdown
- **Result:** Your sponsor-focused features are immediately visible
- **Time:** 2 minutes

**Option 2: Increase visible tabs to 9**
- Shows 9 tabs before "More" dropdown
- All Phase 1 tabs become visible
- Nothing moved to dropdown
- **Result:** Everything visible, but navigation bar is wider
- **Time:** 1 minute

**Option 3: Create "Priority" section in dropdown**
- Keeps current layout
- Adds visual separator in dropdown: "🌟 Featured" section at top
- Phase 1 tabs appear first with highlighting
- **Result:** Phase 1 tabs easy to find in dropdown
- **Time:** 3 minutes

---

## For Now: Manual Access Instructions

**Until we implement a fix, here's how to access Phase 1:**

### For AI Data Centres Dashboard:
1. Click **"More ▾"** in navigation
2. Click **"AI Data Centres"** (first item in dropdown, Server icon 🖥️)
3. You should see the dashboard with Phase 1 allocation gauge

### For Hydrogen Hub Dashboard:
1. Click **"More ▾"** in navigation
2. Click **"Hydrogen Hub"** (second item in dropdown, Fuel icon ⛽)
3. You should see Edmonton vs Calgary comparison

### For Critical Minerals Dashboard:
1. Click **"More ▾"** in navigation
2. Click **"Critical Minerals"** (third item in dropdown, Package icon 📦)
3. You should see supply chain completeness visualization

---

## Quick Test Right Now

**Try this immediately:**

1. Open your app in the browser
2. Look at the very end of the navigation bar
3. You should see a button labeled **"More"** with a "..." icon and down arrow
4. Click it
5. Do you see a white dropdown menu appear below it?
   - **YES** → Great! Look for "AI Data Centres" at the top of the list
   - **NO** → There's a rendering issue (see troubleshooting above)

---

## Screenshot of What You Should See

When you click "More", the dropdown should look like this:

```
┌─────────────────────────────────┐
│ 🖥️  AI Data Centres             │  ← Click this!
│ ⛽  Hydrogen Hub                 │  ← Or this!
│ 📦  Critical Minerals            │  ← Or this!
│ 💨  Curtailment Reduction        │
│ 🔋  Storage Dispatch             │
│ 📈  Investment                   │
│ 🛡️  Resilience                   │
│ ⚡  Innovation                    │
│ 🛡️  Indigenous                   │
│ ⚡  Stakeholders                  │
│ 📊  Grid Ops                     │
│ 🔒  Security                     │
│ ℹ️  Features                     │
└─────────────────────────────────┘
```

The dropdown should:
- Have a **white background**
- Have a **border** around it
- Appear **directly below the "More" button**
- Stay open when you hover over it
- Close when you click an item or click outside

---

## Next Steps

**Reply with one of these:**

1. **"The dropdown works! I can see the tabs now!"** → Great! Use the manual instructions above
2. **"The dropdown doesn't show/closes immediately"** → I'll fix the dropdown component
3. **"I want Option 1: Move Phase 1 tabs to main navigation"** → I'll reorder the tabs
4. **"I want Option 2: Show 9 tabs instead of 6"** → I'll increase visible count
5. **"I want Option 3: Highlight Phase 1 in dropdown"** → I'll add Featured section

Let me know what you see and I'll help fix it!
