# Whop App Store Submission Guide

## Product: Alberta Rate Watchdog + Energy Quiz Pro

**Submission Date:** December 2024  
**Version:** 1.0.0  
**Category:** Education / Utilities

---

## App URLs for Review

### Primary Product (Alberta Rate Watchdog)
```
https://canada-energy-dashboard.netlify.app/whop/watchdog
```

### Secondary Product (Energy Quiz Pro)
```
https://canada-energy-dashboard.netlify.app/whop/quiz
```

### Trial Access (for Reviewers)
```
https://canada-energy-dashboard.netlify.app/whop/quiz?trial=true
```

---

## Reviewer Instructions

### For Guest Testing (No Account Required)

1. **Rate Watchdog** - Navigate to `/whop/watchdog`
   - View real-time Alberta electricity rates from AESO
   - See price forecasts and alerts
   - Click "Unlock CEIP Advanced" to see upsell modal
   - Toggle between light/dark themes using the sun/moon button

2. **Energy Quiz** - Navigate to `/whop/quiz?trial=true`
   - Trial activates automatically with `?trial=true`
   - All 6 modules (72 questions) are unlocked during trial
   - Complete any quiz to see progress tracking
   - Scores saved locally (no login required)

### Key Features to Test

- [ ] Rate alerts load without authentication
- [ ] Quiz questions display correctly
- [ ] Theme toggle works in both apps
- [ ] Upgrade modal shows pricing details
- [ ] Navigation between quiz modules
- [ ] Quiz completion and score display
- [ ] Trial badge visible on premium modules

---

## Screenshots

### 1. Quiz Dashboard (Initial State)
![Quiz Dashboard](./screenshots/quiz_dashboard_initial.png)
- Shows 6 modules with 3 free and 3 premium
- "Start 7-Day Free Trial" CTA at bottom

### 2. Quiz Dashboard (Trial Active)
![Quiz Dashboard with Trial](./screenshots/quiz_dashboard_trial_on.png)
- Trial banner showing days remaining
- All modules now unlocked with "Trial" badge

### 3. Quiz Question Interface
![Quiz Question](./screenshots/quiz_question_1.png)
- Clean question display with 4 options
- Progress indicator
- Mobile-responsive design

### 4. Quiz Answer Feedback
![Quiz Feedback](./screenshots/quiz_feedback_1.png)
- Immediate feedback on answer selection
- Explanation for correct answer
- Visual indication of correct/incorrect

### 5. Rate Watchdog (Dark Mode)
![Watchdog Dark](./screenshots/watchdog_initial.png)
- Real-time electricity rates from AESO
- Price forecasts and trends
- Upgrade CTA in header

### 6. Upgrade Modal
![Upgrade Modal](./screenshots/watchdog_modal.png)
- Clear pricing ($29/month)
- Feature list
- Call-to-action to Whop checkout

---

## Demo Video

**Recording:** `whop_trial_activation.webp` (30-45 seconds)

Shows:
1. Quiz Dashboard with 6 modules
2. Trial activation via button click
3. Premium modules unlocking
4. Starting and answering quiz questions
5. Feedback display

---

## Product Details

### Alberta Rate Watchdog (FREE)

**Description:**
Real-time electricity rate monitoring for Alberta consumers. See current pool prices, 12-hour forecasts, and price alerts powered by AESO data.

**Features:**
- Live pool price from Alberta Electric System Operator (AESO)
- 12-hour price forecasts
- Historical rate trends
- Price spike alerts
- Light/dark mode support

**Target Audience:**
- Alberta homeowners
- Business owners managing energy costs
- Energy traders and analysts

---

### Energy Quiz Pro (Freemium)

**Description:**
Master Canadian energy systems with 72+ educational questions across 6 modules. From beginner grid basics to advanced carbon market strategies.

**Features:**
- 6 comprehensive modules
- 12 questions per module (72 total)
- Difficulty levels: Beginner, Intermediate, Advanced
- Progress tracking (localStorage)
- 7-day free trial for premium modules

**Pricing Tiers:**
| Tier | Price | Access |
|------|-------|--------|
| Free | $0 | Modules 1-3 |
| Trial | $0 (7 days) | All 6 modules |
| Pro | $29/month | All modules + certificates |

**Target Audience:**
- Energy sector professionals
- Students learning about energy
- Career changers entering energy industry

---

## Technical Details

### Stack
- React 18 + TypeScript
- Vite build system
- Tailwind CSS styling
- Hosted on Netlify

### API Integrations
- AESO (Alberta Electric System Operator) - Real-time rates
- No external authentication required

### Client-Side Only
- All quiz logic runs in browser
- Progress stored in localStorage
- No database dependency for guest users

---

## Compliance Checklist

- [x] No authentication required for core features
- [x] App works in Whop iframe
- [x] No "Sign In" or auth prompts visible
- [x] Clear value proposition
- [x] Upgrade path to paid tier
- [x] Mobile-responsive design
- [x] Light and dark mode support
- [x] Fast loading (<3s)

---

## Contact

**Developer:** Canada Energy Intelligence Platform  
**Support:** support@ceip.energy  
**Website:** https://canada-energy-dashboard.netlify.app

---

## Changelog

### v1.0.0 (December 2024)
- Initial Whop submission
- 6 quiz modules with 72 questions
- Rate Watchdog with AESO integration
- Trial access via URL parameter
- Light/dark theme support
