# Testing Checklist - Canada Energy Dashboard

**Date**: Week 3, Day 1 (December 2025)
**Purpose**: Complete end-to-end platform testing before sponsor demos
**Target**: Zero P0/P1 bugs before Week 4 sponsor calls

---

## 🎯 Testing Overview

This document provides comprehensive test scenarios for the Canada Energy Dashboard platform. All tests should be executed across:
- **Browsers**: Chrome, Firefox, Safari, Edge
- **Viewports**: Desktop (1920x1080), Tablet (768x1024), Mobile (375x667)
- **User Tiers**: Free, Edubiz, Pro

---

## 📋 Test Scenario 1: Free User Journey

### 1.1 Sign Up Flow

**Test Steps**:
1. Navigate to `/` (homepage)
2. Click "Sign Up" button in navigation
3. Enter test email: `testuser1+free@example.com`
4. Enter password: `TestPassword123!`
5. Click "Sign Up"

**Expected Results**:
- [ ] Sign up form accepts valid email and password
- [ ] Success message displayed: "Check your email for confirmation link"
- [ ] Confirmation email sent to inbox (check Supabase email logs)
- [ ] User redirected to "Please confirm your email" page

**Bug Priority if Fails**: P0 (Critical - blocks user onboarding)

---

### 1.2 Email Confirmation

**Test Steps**:
1. Check email inbox for confirmation link
2. Click confirmation link in email
3. Should redirect to login page or dashboard

**Expected Results**:
- [ ] Confirmation link works (doesn't 404)
- [ ] Success message: "Email confirmed! Please log in"
- [ ] User can now log in with credentials

**Bug Priority if Fails**: P0 (Critical - user cannot access account)

**Note**: If running localhost, Supabase may not send actual emails. Check Supabase dashboard → Authentication → Users to manually confirm user.

---

### 1.3 Login Flow

**Test Steps**:
1. Navigate to `/` or `/login`
2. Enter email: `testuser1+free@example.com`
3. Enter password: `TestPassword123!`
4. Click "Log In"

**Expected Results**:
- [ ] Login successful
- [ ] Redirected to dashboard (`/` or `/dashboard`)
- [ ] User's email visible in profile dropdown (top right)
- [ ] Session persists across page refreshes

**Bug Priority if Fails**: P0 (Critical - cannot access platform)

---

### 1.4 Dashboard Exploration

**Test Steps**:
1. After login, view dashboard
2. Check all charts and data visualizations
3. Test navigation menu

**Expected Results**:
- [ ] Dashboard loads without errors
- [ ] All charts render (generation mix, prices, emissions)
- [ ] Data is current (not placeholder/hardcoded)
- [ ] Province selector works (switch between provinces)
- [ ] Navigation menu accessible (hamburger on mobile, sidebar on desktop)
- [ ] All navigation links work (Dashboard, Certificates, Badges, Profile, Pricing)

**Bug Priority if Fails**:
- Charts don't load: P1 (High - major UX issue)
- Navigation broken: P0 (Critical - cannot access features)

---

### 1.5 Browse Certificates

**Test Steps**:
1. Click "Certificates" in navigation
2. View all 3 certificate tracks

**Expected Results**:
- [ ] CertificatesPage loads (`/certificates`)
- [ ] All 3 tracks visible:
  - Residential Energy Efficiency
  - Grid Operations & Markets
  - Policy & Regulatory Compliance
- [ ] Each track shows:
  - Title, description, icon
  - Duration (hours)
  - Module count (5 modules each)
  - Price (if applicable)
  - "View Track" or "Upgrade to Access" button
- [ ] Free tier: At least one track should be accessible (or all locked with upgrade prompt)

**Bug Priority if Fails**: P1 (High - core feature unavailable)

---

### 1.6 View Locked Track (Tier Gate)

**Test Steps**:
1. On `/certificates`, click a track that requires Edubiz/Pro tier
2. Should show upgrade prompt or tier gate

**Expected Results**:
- [ ] Locked track shows "Upgrade Required" badge
- [ ] Click takes user to `/pricing` page OR shows upgrade modal
- [ ] Clear messaging: "Upgrade to Edubiz to access this track"

**Bug Priority if Fails**: P2 (Medium - tier gating not enforced)

**Security Note**: Verify user cannot bypass by manually navigating to `/certificates/locked-track-slug`

---

### 1.7 Pricing Page

**Test Steps**:
1. Navigate to `/pricing`
2. View all 3 pricing tiers

**Expected Results**:
- [ ] All 3 tiers visible: Free, Edubiz ($99/mo), Pro ($1,500/mo)
- [ ] Current tier highlighted (Free should have "Current Plan" button)
- [ ] Feature comparison shows checkmarks/X marks correctly
- [ ] "Upgrade" CTAs for Edubiz and Pro tiers
- [ ] FAQ section renders (accordion/collapsible)
- [ ] All links functional (e.g., "Contact Sales" for Pro)

**Bug Priority if Fails**: P1 (High - cannot understand pricing or upgrade)

---

### 1.8 Profile Page (Free Tier)

**Test Steps**:
1. Navigate to `/profile`
2. View user stats and tier information

**Expected Results**:
- [ ] Profile page loads
- [ ] Displays user email
- [ ] Shows current tier: "Free"
- [ ] Shows usage stats:
  - AI queries used: X/10 (daily limit for free)
  - Modules completed: 0 (initially)
  - Certificates earned: 0 (initially)
  - Total learning time: 0 minutes (initially)
- [ ] "Upgrade" button visible

**Bug Priority if Fails**: P2 (Medium - stats not critical for free users)

---

### 1.9 Badges Page (Free Tier)

**Test Steps**:
1. Navigate to `/badges`
2. View badge progress

**Expected Results**:
- [ ] BadgesPage loads
- [ ] Shows all 5 badges (First Steps, Knowledge Seeker, Track Master, Consistency Champion, Energy Explorer)
- [ ] All badges initially locked/grayscale (no modules completed yet)
- [ ] Progress bars show 0% (initially)
- [ ] Tooltips/descriptions explain how to earn each badge

**Bug Priority if Fails**: P3 (Low - badges are gamification, not core functionality)

---

### 1.10 Start Free Track (If Available)

**Test Steps**:
1. If any track is available to free users, navigate to `/certificates/:trackSlug`
2. View module list

**Expected Results**:
- [ ] CertificateTrackPage loads
- [ ] Shows track header (title, description, duration, module count)
- [ ] Lists all 5 modules
- [ ] Module 1 is unlocked ("Start" button enabled)
- [ ] Modules 2-5 are locked (lock icon, greyed out)
- [ ] Sequential unlocking enforced

**Bug Priority if Fails**: P1 (High - cannot start learning)

**Note**: If all tracks require paid tier, this test is skipped for free users.

---

### 1.11 Complete Reading Module

**Assume Module 1 is a "reading" type module**

**Test Steps**:
1. Click "Start" on Module 1
2. Navigate to `/modules/:moduleId`
3. Read content (scroll through markdown)
4. Click "Mark as Complete" or "Next" button

**Expected Results**:
- [ ] ModulePlayer loads
- [ ] Reading content renders (markdown formatted correctly)
- [ ] Headings, lists, bold/italic text display properly
- [ ] Scroll tracking works (progress bar updates as user scrolls)
- [ ] "Mark as Complete" button enabled after scrolling to bottom
- [ ] Clicking "Complete" triggers:
  - Module marked as completed in database
  - Progress saved (check `/profile` stats update)
  - Badge check (First Steps badge awarded if first module)
  - Badge modal shows if badge earned
  - Redirect to track page OR next module unlocks

**Bug Priority if Fails**:
- Content doesn't render: P0 (Critical - cannot consume content)
- Progress not saved: P0 (Critical - data loss)
- Badge not awarded: P3 (Low - gamification)

---

### 1.12 Complete Video Module

**Assume Module 2 is a "video" type module**

**Test Steps**:
1. Navigate to Module 2 (after unlocking via Module 1 completion)
2. Click "Start"
3. Watch embedded YouTube video
4. Video should track watch progress

**Expected Results**:
- [ ] ModulePlayer loads with video embed
- [ ] YouTube video plays without errors
- [ ] Video controls work (play, pause, fullscreen)
- [ ] Watch progress tracked (80% threshold for completion)
- [ ] "Mark as Complete" button enabled after 80% watched
- [ ] Transcript visible below video (if provided)

**Bug Priority if Fails**:
- Video doesn't load: P1 (High - cannot consume content)
- Progress tracking broken: P2 (Medium - affects completion logic)

**Note**: Test both with actual video URL and placeholder URL. Placeholder should show error message gracefully.

---

### 1.13 Complete Quiz Module

**Assume Module 3 is a "quiz" type module**

**Test Steps**:
1. Navigate to Module 3
2. Answer all quiz questions
3. Submit quiz
4. View results and retry if needed

**Expected Results**:
- [ ] ModulePlayer loads quiz interface
- [ ] All questions display with radio buttons (single-choice MCQ)
- [ ] Can select one answer per question
- [ ] "Submit Quiz" button enabled after all questions answered
- [ ] After submission:
  - Score calculated (e.g., 5/7 correct = 71%)
  - Pass/fail threshold shown (typically 75%)
  - Correct answers highlighted in green
  - Incorrect answers highlighted in red
  - Explanations shown for each question
- [ ] If failed (< 75%):
  - "Retry Quiz" button shown
  - Can retake quiz immediately
- [ ] If passed (≥ 75%):
  - Module marked as completed
  - Score saved to database
  - Next module unlocks

**Bug Priority if Fails**:
- Quiz doesn't load: P0 (Critical - cannot complete module)
- Scoring incorrect: P1 (High - unfair grading)
- Retry broken: P2 (Medium - UX issue)

---

### 1.14 Complete Interactive Module

**Assume Module 4 is an "interactive" calculator module**

**Test Steps**:
1. Navigate to Module 4
2. Use interactive calculator
3. Input values and see results

**Expected Results**:
- [ ] ModulePlayer loads calculator interface
- [ ] All input fields visible with labels
- [ ] Can enter numeric values
- [ ] Calculations update live OR on "Calculate" button click
- [ ] Results display correctly (formulas apply correctly)
- [ ] "Mark as Complete" button enabled after interacting with calculator
- [ ] Completion tracked

**Bug Priority if Fails**:
- Calculator doesn't load: P1 (High - cannot complete module)
- Calculations wrong: P1 (High - misleading educational content)

**Test Cases for Calculator** (e.g., Carbon Credit Calculator):
- Input: Facility Emissions = 75,000 tonnes, Production = 100,000 units
- Expected Emissions Intensity: 0.75 tonnes/unit
- (Add more test cases based on actual calculator)

---

### 1.15 Sequential Module Unlocking

**Test Steps**:
1. After completing Module 1, check Module 2 status
2. After completing Module 2, check Module 3 status
3. Verify cannot skip ahead to Module 5 without completing 1-4

**Expected Results**:
- [ ] Module N unlocks only after Module N-1 is completed
- [ ] Lock icon shown on locked modules
- [ ] "Start" button disabled or not shown for locked modules
- [ ] Clicking locked module shows message: "Complete previous modules to unlock"

**Bug Priority if Fails**: P2 (Medium - learning path integrity issue)

**Security Test**:
- Manually navigate to `/modules/:module5Id` (bypassing UI)
- Expected: Redirected to track page OR shown "Module locked" message

---

### 1.16 Certificate Issuance (Track Completion)

**Test Steps**:
1. Complete all 5 modules in a track
2. Return to track page (`/certificates/:trackSlug`)
3. Check for certificate issuance

**Expected Results**:
- [ ] After completing Module 5, certificate auto-issued
- [ ] Track page shows:
  - "Certificate Earned!" badge
  - Issue date
  - Verification code (e.g., `CERT-RES-20250102-XYZ123`)
  - "Download PDF" button (may show "Coming Soon" if PDF generation not implemented)
- [ ] Profile page updates:
  - Certificates earned: 1
- [ ] Badge awarded: "Track Master" badge (for completing first track)

**Bug Priority if Fails**:
- Certificate not issued: P0 (Critical - core value proposition broken)
- Verification code not generated: P1 (High - credibility issue)

---

### 1.17 Badge Awarding

**Test Steps**:
1. After completing first module, check for "First Steps" badge
2. After completing 5 modules across tracks, check for "Knowledge Seeker" badge
3. After completing full track, check for "Track Master" badge

**Expected Results**:
- [ ] Badge modal pops up when badge earned (congrats message)
- [ ] Badge appears as colored/unlocked on `/badges` page
- [ ] Badge progress bars update correctly

**Bug Priority if Fails**: P3 (Low - gamification feature, not core learning)

---

### 1.18 AI Help System (If Functional)

**Test Steps**:
1. Free user should have 10 AI queries per day
2. Ask a question via help system (if available)
3. Check query count decrements

**Expected Results**:
- [ ] Can ask up to 10 questions
- [ ] After 10th question, shown upgrade prompt
- [ ] Query count resets daily (test by checking next day or manually reset in DB)

**Bug Priority if Fails**: P2 (Medium - feature not critical, but tier enforcement important)

**Note**: If CORS error still present or AI system not functional, skip this test. Document as "Known limitation - AI system not yet operational."

---

### 1.19 Logout & Session Persistence

**Test Steps**:
1. Log out (click logout in profile dropdown)
2. Verify redirected to homepage/login
3. Manually navigate to `/profile` (should redirect to login)
4. Log back in
5. Verify progress persists (modules completed, badges earned)

**Expected Results**:
- [ ] Logout works (session cleared)
- [ ] Protected routes require re-authentication
- [ ] After re-login, all progress intact (modules, badges, certificates)

**Bug Priority if Fails**:
- Logout broken: P1 (High - security issue)
- Progress lost: P0 (Critical - data loss)

---

## 📋 Test Scenario 2: Edubiz User Journey

### 2.1 Manual Tier Upgrade (Database)

**Test Steps** (Backend):
1. Create a new test user: `testuser2+edubiz@example.com`
2. Confirm email and log in
3. Open Supabase dashboard → Database → `edubiz_users` table
4. Find user by `id` (matches `auth.users.id`)
5. Update `tier` column from `'free'` to `'edubiz'`
6. Save changes

**Expected Results**:
- [ ] Database update successful
- [ ] User tier updated to "edubiz"

**Note**: Since Stripe integration not yet implemented, manual DB update is acceptable for testing.

---

### 2.2 Verify Tier Upgrade (Frontend)

**Test Steps**:
1. Refresh app (hard refresh: Cmd+Shift+R or Ctrl+F5)
2. Navigate to `/profile`
3. Check tier display

**Expected Results**:
- [ ] Profile shows: "Current Tier: Edubiz"
- [ ] Tier badge updated (icon changes to 🎓)
- [ ] Upgrade button removed or changed to "Manage Subscription"

**Bug Priority if Fails**: P1 (High - tier system broken)

---

### 2.3 Access All Certificate Tracks

**Test Steps**:
1. Navigate to `/certificates`
2. All 3 tracks should now be unlocked

**Expected Results**:
- [ ] No "Upgrade Required" badges on any tracks
- [ ] All tracks show "View Track" or "Start Track" buttons
- [ ] Can click into any track

**Bug Priority if Fails**: P0 (Critical - tier gates not working)

---

### 2.4 Pricing Page (Edubiz Tier)

**Test Steps**:
1. Navigate to `/pricing`
2. Check tier highlighting

**Expected Results**:
- [ ] Edubiz tier card highlighted (ring/border)
- [ ] Edubiz tier shows "Current Plan" button (disabled)
- [ ] Free tier shows "Cannot Downgrade" button (disabled)
- [ ] Pro tier shows "Upgrade to Pro" button (enabled)

**Bug Priority if Fails**: P2 (Medium - UI clarity issue)

---

### 2.5 Complete Full Track (All 5 Modules)

**Test Steps**:
1. Choose any track (e.g., Policy & Regulatory)
2. Complete all 5 modules sequentially
3. Track progress on `/certificates/:trackSlug`

**Expected Results**:
- [ ] All modules unlock sequentially
- [ ] All 4 content types work (reading, video, quiz, interactive)
- [ ] Progress bar updates after each module (20%, 40%, 60%, 80%, 100%)
- [ ] After Module 5 completion:
  - Certificate auto-issued
  - Verification code generated
  - Issue date recorded

**Bug Priority if Fails**: P0 (Critical - core learning flow broken)

**Track Completion Time** (estimated):
- Track 1 (Residential): ~3-4 hours
- Track 2 (Grid Ops): ~3-4 hours
- Track 3 (Policy): ~3.5-4 hours

**Testing Shortcut** (for time efficiency):
- Manually mark modules as "completed" in database for faster testing
- SQL: `UPDATE user_module_progress SET status = 'completed', completed_at = NOW() WHERE user_id = '...' AND module_id = '...'`
- Then test certificate issuance logic only

---

### 2.6 Certificate Display & Verification

**Test Steps**:
1. After track completion, navigate to `/certificates/:trackSlug`
2. View certificate details

**Expected Results**:
- [ ] Certificate banner shows "Certificate Earned!"
- [ ] Issue date displayed (format: "January 15, 2025" or "2025-01-15")
- [ ] Verification code displayed (format: `CERT-XXX-YYYYMMDD-HASH`)
- [ ] "Download PDF" button visible
  - If PDF generation implemented: Click button, PDF downloads
  - If NOT implemented: Button shows tooltip "Coming Soon" or disabled state

**Bug Priority if Fails**:
- Certificate not shown: P0 (Critical)
- Verification code missing: P1 (High)
- Download button broken: P2 (Medium - if PDF implemented)

---

### 2.7 Profile Stats (Edubiz User with Completions)

**Test Steps**:
1. Navigate to `/profile` after completing a track
2. Check all stats

**Expected Results**:
- [ ] Modules completed: 5 (or total across all tracks)
- [ ] Certificates earned: 1
- [ ] Total learning time: ~180-240 minutes (depends on actual time spent)
- [ ] AI queries used: X (if AI system functional)
- [ ] Tier: Edubiz

**Bug Priority if Fails**: P2 (Medium - stats not critical but nice to have)

---

### 2.8 Badge Progress (Multiple Badges)

**Test Steps**:
1. Navigate to `/badges` after track completion
2. Check earned badges

**Expected Results**:
- [ ] "First Steps" - Unlocked (completed first module)
- [ ] "Knowledge Seeker" - Unlocked (completed 5 modules)
- [ ] "Track Master" - Unlocked (completed full track)
- [ ] "Consistency Champion" - Locked (requires login streak - not yet implemented)
- [ ] "Energy Explorer" - Locked (requires dashboard tour - not yet implemented)

**Bug Priority if Fails**: P3 (Low - gamification)

---

### 2.9 Unlimited AI Queries (Edubiz Perk)

**Test Steps** (if AI system functional):
1. Ask more than 10 AI questions in one day
2. Verify no limit enforced for Edubiz users

**Expected Results**:
- [ ] No query limit for Edubiz users
- [ ] Can ask unlimited questions
- [ ] No upgrade prompt after 10th query

**Bug Priority if Fails**: P2 (Medium - tier benefit not working)

**Note**: Skip if AI system not operational.

---

## 📋 Test Scenario 3: Pro User Journey

### 3.1 Manual Tier Upgrade to Pro

**Test Steps** (Backend):
1. Create test user: `testuser3+pro@example.com`
2. Update tier in database: `tier = 'pro'`

**Expected Results**:
- [ ] Database update successful

---

### 3.2 Verify Pro Tier Features

**Test Steps**:
1. Log in as Pro user
2. Navigate to `/profile`
3. Check tier display

**Expected Results**:
- [ ] Profile shows: "Current Tier: Pro"
- [ ] Tier badge: ⭐ or "PRO" label

**Bug Priority if Fails**: P1 (High)

---

### 3.3 Pricing Page (Pro Tier)

**Test Steps**:
1. Navigate to `/pricing`

**Expected Results**:
- [ ] Pro tier card highlighted
- [ ] Pro tier shows "Current Plan" (disabled)
- [ ] Free and Edubiz tiers show "Cannot Downgrade" (disabled)

**Bug Priority if Fails**: P2 (Medium)

---

### 3.4 All Features Accessible

**Test Steps**:
1. Verify all certificate tracks accessible
2. Verify unlimited AI queries
3. Check for Pro-specific features (if any)

**Expected Results**:
- [ ] All tracks unlocked
- [ ] No tier gates anywhere
- [ ] (Future) Green Button import visible (even if not functional yet)
- [ ] (Future) API access settings visible

**Bug Priority if Fails**: P1 (High - Pro users should have full access)

---

## 📋 Test Scenario 4: Badge System

### 4.1 First Steps Badge

**Trigger**: Complete first module ever

**Test Steps**:
1. New user completes Module 1 of any track
2. Check badge award

**Expected Results**:
- [ ] Badge modal shows: "First Steps - Complete your first module"
- [ ] Badge unlocked on `/badges` page

**Bug Priority if Fails**: P3 (Low)

---

### 4.2 Knowledge Seeker Badge

**Trigger**: Complete 5 modules (across any tracks)

**Test Steps**:
1. User completes 5 modules total
2. Check badge award

**Expected Results**:
- [ ] Badge modal shows after 5th module completion
- [ ] Badge unlocked on `/badges` page

**Bug Priority if Fails**: P3 (Low)

---

### 4.3 Track Master Badge

**Trigger**: Complete full track (all 5 modules)

**Test Steps**:
1. User completes all 5 modules of a track
2. Check badge award

**Expected Results**:
- [ ] Badge modal shows after track completion
- [ ] Badge unlocked on `/badges` page

**Bug Priority if Fails**: P3 (Low)

---

### 4.4 Consistency Champion Badge

**Trigger**: Login streak (7 consecutive days)

**Test Steps**:
1. (Manual) Update user login streak in database OR wait 7 days
2. Check badge award

**Expected Results**:
- [ ] Badge awarded after 7-day login streak
- [ ] Badge unlocked on `/badges` page

**Bug Priority if Fails**: P3 (Low - feature may not be implemented yet)

**Note**: Login streak tracking may not be implemented. If not, document as "Future feature."

---

### 4.5 Energy Explorer Badge

**Trigger**: Complete dashboard tour

**Test Steps**:
1. Complete dashboard onboarding tour (if implemented)
2. Check badge award

**Expected Results**:
- [ ] Badge awarded after tour completion
- [ ] Badge unlocked on `/badges` page

**Bug Priority if Fails**: P3 (Low - feature may not be implemented yet)

**Note**: Dashboard tour may not be implemented. If not, document as "Future feature."

---

## 📋 Test Scenario 5: Edge Cases & Security

### 5.1 URL Manipulation (Bypass Tier Gates)

**Test Steps**:
1. Log in as Free user
2. Manually navigate to `/certificates/locked-track-slug` (Edubiz-only track)
3. Try to access module directly: `/modules/:edubizModuleId`

**Expected Results**:
- [ ] Redirected to `/pricing` or shown "Upgrade Required" message
- [ ] Cannot access locked content by URL manipulation

**Bug Priority if Fails**: P0 (Critical - security issue, unauthorized access)

---

### 5.2 Module Unlocking Bypass

**Test Steps**:
1. Free user on Track 1, only Module 1 completed
2. Manually navigate to `/modules/:module5Id` (locked module)

**Expected Results**:
- [ ] Redirected to track page OR shown "Complete previous modules first"
- [ ] Cannot access locked module content

**Bug Priority if Fails**: P1 (High - learning path integrity)

---

### 5.3 Logout & Unauthenticated Access

**Test Steps**:
1. Log out
2. Manually navigate to `/profile`, `/badges`, `/certificates/:trackSlug`, `/modules/:id`

**Expected Results**:
- [ ] All protected routes redirect to `/login` or show "Please log in" message
- [ ] Cannot access user-specific pages without authentication

**Bug Priority if Fails**: P0 (Critical - security issue)

---

### 5.4 Session Persistence

**Test Steps**:
1. Log in
2. Refresh page (hard refresh)
3. Close tab and reopen app (same session)

**Expected Results**:
- [ ] User remains logged in after refresh
- [ ] Session persists across tab close/reopen (unless manually logged out)

**Bug Priority if Fails**: P1 (High - poor UX)

---

### 5.5 Progress Data Loss

**Test Steps**:
1. Complete Module 1 (70% through)
2. Close browser without finishing
3. Reopen and log in
4. Navigate back to Module 1

**Expected Results**:
- [ ] Progress saved (e.g., scroll position for reading module, watch time for video)
- [ ] Can resume from where left off

**Bug Priority if Fails**: P2 (Medium - affects UX but not critical)

**Note**: Full module completion progress should NEVER be lost (P0 if fails).

---

### 5.6 Empty State Handling

**Test Steps**:
1. New user with no modules completed
2. Navigate to `/profile`, `/badges`, `/certificates/:trackSlug`

**Expected Results**:
- [ ] No errors or blank screens
- [ ] Empty states show helpful messages:
  - Profile: "You haven't completed any modules yet. Start learning!"
  - Badges: All badges locked with 0% progress
  - Track page: "Start your first module" CTA visible

**Bug Priority if Fails**: P2 (Medium - UX issue)

---

### 5.7 Invalid Routes (404 Handling)

**Test Steps**:
1. Navigate to `/invalid-route`
2. Navigate to `/certificates/invalid-slug`
3. Navigate to `/modules/invalid-id`

**Expected Results**:
- [ ] Shows 404 page or "Not Found" message
- [ ] Provides link back to homepage or relevant page
- [ ] No console errors

**Bug Priority if Fails**: P3 (Low - nice-to-have error handling)

---

## 📋 Test Scenario 6: Responsive Design (Mobile/Tablet)

### 6.1 Mobile Navigation

**Test Steps** (Viewport: 375x667 - iPhone SE):
1. Open dashboard on mobile
2. Check navigation menu

**Expected Results**:
- [ ] Hamburger menu visible (top left or right)
- [ ] Clicking hamburger opens sidebar or dropdown menu
- [ ] All navigation links accessible
- [ ] Menu closes after selecting a link

**Bug Priority if Fails**: P1 (High - mobile users cannot navigate)

---

### 6.2 Mobile Certificate Browsing

**Test Steps**:
1. View `/certificates` on mobile
2. Scroll through tracks

**Expected Results**:
- [ ] Tracks stack vertically (one per row)
- [ ] All content readable (no text cutoff)
- [ ] CTA buttons tappable (not too small)

**Bug Priority if Fails**: P2 (Medium - affects mobile UX)

---

### 6.3 Mobile Module Player

**Test Steps**:
1. Start a module on mobile
2. Test reading, video, quiz, interactive content

**Expected Results**:
- [ ] Content fits viewport (no horizontal scroll)
- [ ] Videos responsive (fit screen width)
- [ ] Quiz radio buttons easy to tap
- [ ] Calculator inputs accessible on mobile keyboard

**Bug Priority if Fails**: P1 (High - cannot complete modules on mobile)

---

### 6.4 Tablet View (768x1024 - iPad)

**Test Steps**:
1. Test all pages on tablet viewport

**Expected Results**:
- [ ] Layout adapts gracefully (between mobile and desktop)
- [ ] No awkward spacing or broken layouts
- [ ] Touch targets large enough for fingers

**Bug Priority if Fails**: P2 (Medium)

---

## 📋 Browser Compatibility

### Browsers to Test

- [ ] Google Chrome (latest)
- [ ] Mozilla Firefox (latest)
- [ ] Safari (latest - macOS/iOS)
- [ ] Microsoft Edge (latest)

### Known Issues

**Safari**:
- May have issues with video embeds (YouTube)
- Check CSS grid/flexbox compatibility

**Firefox**:
- Check CSS animations (badge modals)

**Edge**:
- Generally compatible with Chrome (Chromium-based)

**Bug Priority**:
- Chrome broken: P0 (most users)
- Firefox/Safari broken: P1 (significant user base)
- Edge broken: P2 (smaller user base)

---

## 🐛 Bug Tracking Template

For each bug found, document in `BUGS.md`:

```markdown
## Bug #001: [Title]

**Priority**: P0 / P1 / P2 / P3
**Status**: Open / In Progress / Fixed
**Found**: [Date]
**Tester**: [Name]

**Description**:
[Clear description of the bug]

**Steps to Reproduce**:
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Result**:
[What should happen]

**Actual Result**:
[What actually happens]

**Screenshots/Logs**:
[Attach screenshots or console logs]

**Environment**:
- Browser: Chrome 120
- OS: macOS 14.2
- Viewport: 1920x1080
- User Tier: Free

**Fix Notes** (if fixed):
[Description of fix applied]
```

---

## ✅ Pre-Demo Acceptance Criteria

Before scheduling sponsor demos (Week 4), ensure:

**Critical (Must Fix)**:
- [ ] Zero P0 bugs (all critical bugs fixed)
- [ ] Zero P1 bugs (all high-priority bugs fixed)
- [ ] Complete user journey works: Signup → Login → Complete Module → Earn Certificate
- [ ] All 3 tier gates functional (Free, Edubiz, Pro)
- [ ] All 4 module content types render correctly (reading, video, quiz, interactive)
- [ ] Certificate issuance works with verification code
- [ ] No console errors on any page

**Important (Should Fix)**:
- [ ] All P2 bugs fixed or documented as "known issues"
- [ ] Mobile responsive (can demo on iPhone/iPad)
- [ ] Badge system functional (at least First Steps and Track Master badges)

**Nice-to-Have (Can Defer)**:
- [ ] P3 bugs fixed (cosmetic issues, gamification features)
- [ ] AI help system fully functional (can mention "in development" during demo)
- [ ] PDF download working (can show verification code as alternative)

---

## 📊 Testing Progress Tracker

**Test Scenarios Completed**:
- [ ] Scenario 1: Free User Journey (15 subtests)
- [ ] Scenario 2: Edubiz User Journey (9 subtests)
- [ ] Scenario 3: Pro User Journey (4 subtests)
- [ ] Scenario 4: Badge System (5 subtests)
- [ ] Scenario 5: Edge Cases & Security (7 subtests)
- [ ] Scenario 6: Responsive Design (4 subtests)
- [ ] Browser Compatibility (4 browsers)

**Total Tests**: 48 subtests + 4 browser checks = 52 test cases

**Target**:
- Complete all tests by end of Week 3, Day 5 (December 6th)
- Fix all P0/P1 bugs by end of Week 3, Day 6 (December 7th)

---

## 🔄 Next Steps

After completing this testing checklist:

1. **Document all bugs** in `BUGS.md` (with priority labels)
2. **Create bug fix plan** (prioritize P0 → P1 → P2 → P3)
3. **Re-test after fixes** (regression testing)
4. **Get second opinion** (peer review or user acceptance testing)
5. **Mark platform "Demo Ready"** (only if zero P0/P1 bugs)

---

**Document Status**: ✅ Complete
**Next Document**: `TESTING_RESULTS.md` (to be created after running tests)
**Week 3 Progress**: Day 1 Afternoon (testing setup)
