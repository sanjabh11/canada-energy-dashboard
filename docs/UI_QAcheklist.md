# 🔍 **Comprehensive QA Checklist for Design System Compliance**

Use this checklist to audit **every page** systematically. Check off each item to ensure complete consistency.

## 🎨 **SECTION 1: COLOR VERIFICATION**

### **A. Background Colors** ⚠️ *Most Common Issue*

**Check for these WRONG colors:**
- [ ] ❌ Any `bg-white` or `bg-gray-50/100` (should be dark)
- [ ] ❌ Any `bg-purple-*` or `bg-indigo-*` (should be forest/electric)
- [ ] ❌ Any `bg-blue-500` or generic blues (should be semantic)
- [ ] ❌ Any bright teal/cyan backgrounds (should be dark green)
- [ ] ❌ Any `from-purple-*` or `to-indigo-*` gradients

**Should ONLY see:**
- [ ] ✅ `bg-[var(--bg-primary)]` or `#0B4F3C` (main background)
- [ ] ✅ `bg-[var(--bg-elevated)]` or `#1A3A2E` (cards)
- [ ] ✅ `.card` class (includes correct background)
- [ ] ✅ `.hero-section` class (correct gradient)

**Quick Visual Test:**
- [ ] Take screenshot → 70%+ of page should be **dark forest green**, not bright or white
- [ ] Bottom 30% of page → Should still be dark, not light

---

### **B. Text Colors**

**Check for these WRONG colors:**
- [ ] ❌ `text-gray-900` or `text-black` (too dark for dark theme)
- [ ] ❌ `text-purple-*` or `text-indigo-*` (wrong palette)
- [ ] ❌ Pure `text-white` everywhere (should have hierarchy)
- [ ] ❌ `text-blue-500` or generic blues

**Should see:**
- [ ] ✅ `text-[var(--text-primary)]` or `.text-primary` for headlines (white)
- [ ] ✅ `text-[var(--text-secondary)]` or `.text-secondary` for body text (#B8E6D5)
- [ ] ✅ `text-[var(--text-tertiary)]` or `.text-tertiary` for labels (#7CA896)
- [ ] ✅ `text-[var(--color-electric)]` or `.text-electric` for accents (#00D9FF)

**Quick Visual Test:**
- [ ] Headings → Bright white, clearly stand out
- [ ] Body text → Soft mint green, readable
- [ ] Labels/captions → Muted green-grey, subtle
- [ ] Accent text/links → Electric cyan, pops

---

### **C. Border Colors**

**Check for these WRONG colors:**
- [ ] ❌ `border-gray-200/300` (too light)
- [ ] ❌ `border-purple-*` or `border-blue-*`
- [ ] ❌ Pure white borders

**Should see:**
- [ ] ✅ `border-[var(--border-subtle)]` or `rgba(0, 217, 255, 0.15)` (default)
- [ ] ✅ `border-[var(--border-medium)]` on hover
- [ ] ✅ Cards have subtle cyan borders, not harsh white/gray

**Quick Visual Test:**
- [ ] Card borders barely visible (subtle cyan glow)
- [ ] On hover → Borders brighten slightly
- [ ] No harsh white or gray lines

---

### **D. Accent Colors (Semantic)**

**Verify proper usage:**
- [ ] ✅ **Green** (`#168B6A` / `text-success`) → Success, renewable, positive
- [ ] ✅ **Cyan** (`#00D9FF` / `text-electric`) → Primary values, CTAs, tech
- [ ] ✅ **Orange** (`#FFB627` / `text-warning`) → Warnings, solar data
- [ ] ✅ **Red** (`#FF4757` / `text-danger`) → Critical, errors, alerts
- [ ] ✅ **Grey** (`#2C3E50` / `text-industrial`) → Industrial, neutral data

**Check these are NOT used:**
- [ ] ❌ Purple for anything
- [ ] ❌ Pink for anything
- [ ] ❌ Generic blue for anything

**Quick Visual Test:**
- [ ] Success badges → Green, not blue
- [ ] Primary buttons → Cyan, not purple
- [ ] Warning indicators → Orange, not yellow
- [ ] Error states → Red, consistent shade

---

## 🃏 **SECTION 2: COMPONENT VERIFICATION**

### **A. Cards**

**Visual Inspection:**
- [ ] All cards have **dark background** (~#1A3A2E), no white cards
- [ ] All cards have **subtle cyan border** (barely visible)
- [ ] Hover state: Card lifts 2px + border brightens
- [ ] Card corners rounded (16px / `var(--radius-lg)`)

**Code Check:**
```jsx
// ✅ CORRECT
<div className="card">
  <div className="card-header">...</div>
  <div className="card-body">...</div>
</div>

// ❌ WRONG - Fix these
<div className="bg-white rounded-lg">
<div className="bg-gray-50 shadow-xl">
<div className="bg-purple-100 border-purple-300">
```

**Checklist per card:**
- [ ] Uses `.card` base class (or equivalent dark background)
- [ ] Header uses `.card-header` or similar structure
- [ ] Body uses `.card-body` or similar structure
- [ ] Footer (if any) uses `.card-footer`
- [ ] No inline styles overriding colors to white/light

---

### **B. Buttons**

**Visual Inspection:**
- [ ] Primary buttons → **Electric cyan** (#00D9FF) background
- [ ] Secondary buttons → **Transparent** with cyan border
- [ ] Ghost buttons → **Transparent** with muted text
- [ ] Hover: All buttons lift slightly + color brightens
- [ ] Disabled: Opacity reduced, cursor not-allowed

**Code Check:**
```jsx
// ✅ CORRECT
<button className="btn btn-primary">Action</button>
<button className="btn btn-secondary">Cancel</button>
<button className="btn btn-ghost">Options</button>

// ❌ WRONG - Fix these
<button className="bg-purple-600 text-white">
<button className="from-purple-600 to-blue-600">
<button className="bg-blue-500">
```

**Checklist:**
- [ ] No purple/indigo gradient buttons
- [ ] No generic blue buttons
- [ ] Primary CTAs use `.btn-primary` (cyan)
- [ ] Secondary actions use `.btn-secondary` (outline)
- [ ] Text buttons use `.btn-ghost`

---

### **C. Badges**

**Visual Inspection:**
- [ ] Success badges → **Green** background + text (#168B6A)
- [ ] Warning badges → **Orange** background + text (#FFB627)
- [ ] Danger badges → **Red** background + text (#FF4757)
- [ ] Info badges → **Cyan** background + text (#00D9FF)
- [ ] All badges have semi-transparent backgrounds (not solid)

**Code Check:**
```jsx
// ✅ CORRECT
<span className="badge badge-success">Good</span>
<span className="badge badge-warning">Warning</span>
<span className="badge badge-danger">Critical</span>
<span className="badge badge-live">Live</span>

// ❌ WRONG - Fix these
<span className="bg-blue-500 text-white">
<span className="bg-purple-100 text-purple-900">
<span className="bg-green-500"> // Too bright, not using design system
```

**Checklist:**
- [ ] All badges use `.badge-*` classes
- [ ] Status badges use semantic colors (green/orange/red)
- [ ] No solid bright backgrounds
- [ ] Text color matches background color family

---

### **D. Forms**

**Visual Inspection:**
- [ ] Inputs have **dark background** with subtle border
- [ ] Focus state: **Cyan border** + glow
- [ ] Placeholder text: Muted (#4A6B5E)
- [ ] Labels: Soft mint (#B8E6D5)

**Code Check:**
```jsx
// ✅ CORRECT
<input className="form-input" />
<select className="form-select" />
<textarea className="form-textarea" />

// ❌ WRONG - Fix these
<input className="bg-white border-gray-300">
<input className="bg-gray-50">
```

**Checklist:**
- [ ] All inputs use `.form-input` or similar dark styling
- [ ] Focus rings are cyan, not blue/purple
- [ ] No white input backgrounds
- [ ] Disabled state visible and muted

---

### **E. Navigation**

**Visual Inspection:**
- [ ] Nav bar: **Dark forest green** background
- [ ] Logo/brand: White or cyan
- [ ] Links: Soft mint (#B8E6D5)
- [ ] Active link: **Cyan** (#00D9FF) with underline/indicator
- [ ] Hover: Links brighten to cyan

**Code Check:**
```jsx
// ✅ CORRECT
<nav className="nav-header">
  <div className="nav-container">
    <a className="nav-logo">Logo</a>
    <a className="nav-link active">Active</a>
    <a className="nav-link">Link</a>
  </div>
</nav>

// ❌ WRONG - Fix these
<nav className="bg-white">
<nav className="bg-blue-600">
<a className="text-purple-600">
```

**Checklist:**
- [ ] Nav background is dark (#0B4F3C or rgba variant)
- [ ] Nav is sticky/fixed at top with backdrop blur
- [ ] Active state clearly visible (cyan)
- [ ] Logo is visible (white or cyan)
- [ ] Mobile menu (if any) uses same dark theme

---

## 🎭 **SECTION 3: HERO SECTION VERIFICATION**

**Critical checks for hero section:**

### **Background Gradient:**
- [ ] Starts with **dark forest green** at top (#0B4F3C)
- [ ] Transitions through medium forest (#168B6A)
- [ ] Ends with **subtle cyan** at bottom (#00D9FF)
- [ ] Overall darkness: 70% dark, 30% light
- [ ] NO bright teal/cyan wallpaper effect

**Visual Test:**
```
Expected gradient appearance:
████████████ (70%) Dark forest green
████ (20%) Transition
██ (10%) Cyan accent at very bottom
```

### **Content:**
- [ ] Title uses `.hero-title` (Archivo Black, 900 weight, ~4-5rem)
- [ ] Subtitle uses `.hero-subtitle` (DM Sans, 400 weight, ~1.5rem)
- [ ] Title is **bright white**, clearly stands out
- [ ] Subtitle is **soft mint**, readable but secondary
- [ ] CTAs use proper button classes (`.btn-primary`, `.btn-secondary`)

### **Code Check:**
```jsx
// ✅ CORRECT
<section className="hero-section">
  <div className="hero-content">
    <h1 className="hero-title">Title</h1>
    <p className="hero-subtitle">Subtitle</p>
    <button className="btn btn-primary btn-lg">CTA</button>
  </div>
</section>

// ❌ WRONG - Fix these
<section className="bg-gradient-to-b from-teal-400 to-cyan-500">
<section className="shader-bg-primary animate-gradient-xy">
<section className="from-purple-900 via-indigo-900">
```

---

## 📊 **SECTION 4: CHART & DATA VISUALIZATION**

### **Chart Containers:**
- [ ] All chart cards use `.card` structure
- [ ] Chart backgrounds are **dark** (match card)
- [ ] No white chart backgrounds
- [ ] Grid lines are subtle (low opacity)

### **Chart Colors:**
- [ ] **Renewable data** → Forest green (#168B6A)
- [ ] **Demand/Electric** → Electric cyan (#00D9FF)
- [ ] **Solar data** → Solar orange (#FFB627)
- [ ] **Industrial** → Grey (#2C3E50)
- [ ] **Critical/alerts** → Red (#FF4757)

**Code Check:**
```jsx
// ✅ CORRECT - Using CSS variables
<Line stroke="var(--color-electric)" />
<Bar fill="var(--color-forest)" />
<Area fill="var(--color-solar)" />

// ❌ WRONG - Fix these
<Line stroke="#8B5CF6" /> // Purple
<Bar fill="#3B82F6" />    // Generic blue
```

### **Metric Values:**
- [ ] Use `JetBrains Mono` font (monospace)
- [ ] Have `font-variant-numeric: tabular-nums`
- [ ] Large size (2xl-4xl for primary metrics)
- [ ] Colored cyan for primary values
- [ ] Labels use muted text (tertiary)

---

## 🎨 **SECTION 5: TYPOGRAPHY HIERARCHY**

### **Font Family Check:**
- [ ] **Headings (h1-h6)** → Archivo font
- [ ] **Body text** → DM Sans font
- [ ] **Metrics/Data** → JetBrains Mono font
- [ ] No Arial, Helvetica, or other fallbacks visible

### **Font Weight Check:**
- [ ] **Hero titles** → 900 (Black)
- [ ] **Page titles (h1)** → 800-900 (Extrabold/Black)
- [ ] **Section headers (h2)** → 700 (Bold)
- [ ] **Card titles (h3)** → 600-700 (Semibold/Bold)
- [ ] **Body text** → 400 (Regular)
- [ ] **Metric values** → 700 (Bold)

### **Text Color Hierarchy:**
- [ ] **Primary** (headlines) → Bright white (#FFFFFF)
- [ ] **Secondary** (body) → Soft mint (#B8E6D5)
- [ ] **Tertiary** (labels) → Muted green-grey (#7CA896)
- [ ] **Disabled** → Very muted (#4A6B5E)

**Visual Test:**
- [ ] Clear distinction between headline and body text
- [ ] Labels clearly secondary to values
- [ ] Three levels of text hierarchy visible

---

## 🔄 **SECTION 6: INTERACTIVE STATES**

### **Hover States:**
- [ ] **Cards** → Lift 2px, border brightens
- [ ] **Buttons** → Brighten + lift 2px
- [ ] **Links** → Change to cyan
- [ ] **Nav links** → Brighten to cyan

### **Focus States:**
- [ ] All interactive elements have visible focus ring
- [ ] Focus ring is **cyan** (#00D9FF)
- [ ] Focus ring has 2px offset
- [ ] Focus ring visible on keyboard navigation

### **Active States:**
- [ ] Active nav link has cyan color + indicator
- [ ] Active tab has cyan border/underline
- [ ] Pressed buttons scale slightly (scale: 0.98)

### **Disabled States:**
- [ ] Opacity reduced to 0.5
- [ ] Cursor: not-allowed
- [ ] No hover effects
- [ ] Colors muted

---

## 📱 **SECTION 7: RESPONSIVE BEHAVIOR**

### **Mobile (< 480px):**
- [ ] All cards visible (no overflow)
- [ ] Text readable (not too small)
- [ ] Buttons touchable (min 44px height)
- [ ] Navigation collapses to hamburger
- [ ] Hero text scales down appropriately
- [ ] Grid becomes single column

### **Tablet (768px):**
- [ ] 2-column grids where appropriate
- [ ] Cards not too stretched
- [ ] Comfortable spacing
- [ ] Navigation visible

### **Desktop (1024px+):**
- [ ] 3-4 column grids
- [ ] Content not too wide (max-width respected)
- [ ] Proper spacing between elements
- [ ] Charts readable

---

## 🚨 **SECTION 8: COMMON MISTAKES TO CATCH**

### **Top 10 Issues to Look For:**

1. **❌ White Cards Remaining**
   - Search for: `bg-white`, `bg-gray-50`, `bg-gray-100`
   - Fix: Replace with `.card` or `bg-[var(--bg-elevated)]`

2. **❌ Purple/Indigo Colors**
   - Search for: `purple-`, `indigo-`, `from-purple`
   - Fix: Replace with forest/electric colors

3. **❌ Generic Blue Colors**
   - Search for: `bg-blue-500`, `text-blue-600`
   - Fix: Replace with semantic colors

4. **❌ Bright Backgrounds**
   - Search for: `from-teal-400`, `bg-cyan-500`
   - Fix: Use dark forest gradient

5. **❌ Wrong Text Colors**
   - Search for: `text-gray-900`, `text-black`
   - Fix: Use `.text-primary`, `.text-secondary`, `.text-tertiary`

6. **❌ Harsh Borders**
   - Search for: `border-gray-300`, `border-white`
   - Fix: Use `border-[var(--border-subtle)]`

7. **❌ Wrong Badge Colors**
   - Search for: `bg-blue-100`, `bg-purple-100`
   - Fix: Use `.badge-success`, `.badge-warning`, etc.

8. **❌ Inline Styles Overriding**
   - Search for: `style={{background: 'white'}}`, `style={{color: 'purple'}}`
   - Fix: Remove inline styles, use design system classes

9. **❌ Missing Hover States**
   - Test: Hover over cards/buttons
   - Fix: Ensure transition classes present

10. **❌ Animation Overload**
    - Search for: `animate-gradient-xy`, `animate-float`, `animate-shimmer`
    - Fix: Remove excessive animations, keep only `.animate-fade-in`, `.animate-pulse`

---

## ✅ **SECTION 9: FINAL VERIFICATION**

### **Screenshot Test (Take Full Page Screenshot):**

**Color Distribution Analysis:**
- [ ] **70%+** of visible area is dark forest green
- [ ] **20%** is text/content (mint/white)
- [ ] **10%** is cyan accents (buttons, borders, highlights)
- [ ] **0%** is purple, indigo, or bright teal

**No White/Light Areas:**
- [ ] No white cards visible
- [ ] No light grey backgrounds
- [ ] No bright teal wallpaper effect
- [ ] All modals/overlays dark if visible

### **Brand Identity Check:**
- [ ] Page feels "Canadian energy" (forest + electricity)
- [ ] NOT "generic tech startup" (purple/blue)
- [ ] Professional/serious tone (dark theme)
- [ ] Distinctive from competitors

### **Consistency Check:**
- [ ] This page looks like RealTimeDashboard
- [ ] Same card styling
- [ ] Same button styling
- [ ] Same color usage
- [ ] Same typography hierarchy

---

## 📋 **QUICK QA WORKFLOW**

**For Each Page (15-20 min):**

1. **Visual Scan (2 min)**
   - Take full screenshot
   - Any white cards? → Fix
   - Any purple/blue? → Fix
   - Hero too bright? → Fix

2. **Code Search (5 min)**
   - Search: `bg-white` → Replace
   - Search: `purple-` → Replace
   - Search: `text-gray-900` → Replace
   - Search: `from-purple` → Replace

3. **Component Check (5 min)**
   - Cards all dark? ✓
   - Buttons cyan? ✓
   - Badges semantic? ✓
   - Forms dark? ✓

4. **Interactive Test (3 min)**
   - Hover cards → Lift?
   - Click buttons → Work?
   - Navigate → Active state?
   - Focus → Visible?

5. **Responsive Test (5 min)**
   - Mobile view → Readable?
   - Tablet view → Comfortable?
   - Desktop → Not stretched?

**Total: ~20 min per page × 8 pages = 2.5 hours**

---

## 🔧 **QUICK FIX REFERENCE**

### **Most Common Fixes:**

```jsx
// 1. WHITE CARDS
❌ <div className="bg-white rounded-lg p-6">
✅ <div className="card">

// 2. PURPLE GRADIENTS
❌ <div className="bg-gradient-to-r from-purple-600 to-blue-600">
✅ <div className="card"> or <section className="hero-section">

// 3. TEXT COLORS
❌ <p className="text-gray-900">
✅ <p className="text-secondary">

// 4. BORDERS
❌ <div className="border-gray-300">
✅ <div className="border-[var(--border-subtle)]">

// 5. BUTTONS
❌ <button className="bg-purple-600 text-white">
✅ <button className="btn btn-primary">

// 6. BADGES
❌ <span className="bg-blue-100 text-blue-900">
✅ <span className="badge badge-info">

// 7. METRIC VALUES
❌ <span className="text-4xl font-bold text-white">
✅ <span className="metric-value">
```

---

## 📊 **QA TRACKING SHEET**

| Page | Colors ✓ | Components ✓ | Hero ✓ | Charts ✓ | Typography ✓ | Interactive ✓ | Responsive ✓ | Status |
|------|---------|--------------|--------|---------|--------------|---------------|--------------|--------|
| Home | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | 🔴 |
| RealTimeDashboard | [✓] | [✓] | [✓] | [✓] | [✓] | [✓] | [✓] | ✅ |
| EnergyDataDashboard | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | 🔴 |
| Analytics & Trends | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | 🔴 |
| AI Data Combos | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | 🔴 |
| Hydrogen Hub | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | 🔴 |
| Critical Minerals | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | 🔴 |
| EV Charging | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | 🔴 |
| Carbon Emissions | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | 🔴 |

**Legend:** 🔴 Not Started | 🟡 In Progress | ✅ Complete

---

## 🎯 **PRIORITY FIXES**

If you're short on time, fix these **in order**:

1. **Hero gradients** (biggest visual impact)
2. **White cards** (breaks dark theme)
3. **Purple/indigo colors** (wrong brand)
4. **Button colors** (CTAs must be cyan)
5. **Badge colors** (semantic correctness)
6. **Text hierarchy** (readability)
7. **Hover states** (polish)

---

**Use this checklist systematically. Each page should take 15-20 minutes to audit and fix remaining issues. Total QA time: ~2.5-3 hours for all pages.**

Good luck! 🚀