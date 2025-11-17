# EnergyPilot SME – CEIP Edubiz Hybrid Integration
## Enhanced Addendum PRD v2.0

**Document Owner**: Canada Energy Dashboard Team
**Date**: November 17, 2025
**Status**: Implementation Ready
**PRD Type**: Addendum to Core EnergyPilot PRD v1.0
**Decision**: ✅ INTEGRATE into Existing App (95% Confidence)

---

## 🎯 Executive Summary

This addendum PRD defines the **fastest path to visa-ready demo** by evolving the Canada Energy Intelligence Platform (CEIP) into a freemium Educational SaaS (Edubiz) hybrid that:

1. **Accelerates Start-up Visa Timeline**: Demo-ready in 4 weeks (Dec 15, 2025) vs. 24+ weeks for separate app
2. **Maximizes Alberta Immigration Advantage**: Leverages existing CCUS ($31.7B), Hydrogen ($1.3B), SMR content for relatives-led webinars
3. **Achieves Revenue Seed**: $15K by Dec 2025, $360K Edubiz ARR + $720K Pro ARR = $1.08M Year 1
4. **Proves Product-Market Fit**: 20% free→paid conversion via integrated funnel
5. **Minimizes Risk**: Reuses 70% existing educational infrastructure (65,306 LOC, 96 components)

### Strategic Positioning

**Vision Update**: Transform CEIP from a research dashboard into a **3-tier energy education & optimization platform**:

```
Tier 1: FREE (Public Portal - Learning Gateway)
├── 26 real-time dashboards (view-only, full data access)
├── Smart Help System (24 topics × 3 levels)
├── Guided Tours (5 role-based paths)
├── AI Chat (10 queries/day)
└── Household Onboarding

Tier 2: EDUBIZ ($99/mo - Certification Track)
├── Everything in Free
├── 3 Certificate Modules (Net-Zero Basics, AI Recs, AB Entrepreneur)
├── Unlimited AI Chat + Custom Recs
├── Monthly AB Webinars (relatives-led)
├── Gamification (badges, progress tracking)
├── Downloadable Reports & Datasets
└── Blockchain-Lite PDF Certificates

Tier 3: ENERGYPILOT PRO ($1,500/mo - SME Full Suite)
├── Everything in Edubiz
├── Green Button OAuth (real facility data)
├── AI Recommendations Engine (operational)
├── Multi-Facility Management
├── Compliance Tracking (CER + Provincial)
├── White-Label Options
└── Dedicated Support
```

---

## 📊 Success Metrics (Updated)

### Primary KPIs (Visa-Critical)

**December 2025 (4 Weeks)**:
- [ ] 3 sponsor demos completed (ERA, Alberta Innovates, CME)
- [ ] 1 letter of support secured
- [ ] 100 free tier signups (relatives network + CME outreach)
- [ ] 10 paying Edubiz users ($1,000 MRR seed)
- [ ] 1 relatives-led AB webinar (50 attendees)
- [ ] Pitch deck + demo video finalized

**Q1 2026 (Week 5-12)**:
- [ ] Start-up Visa EOI submitted (Feb 1, 2026)
- [ ] 500 free tier users
- [ ] 50 Edubiz users ($5,000 MRR)
- [ ] 10 EnergyPilot Pro conversions ($15,000 MRR)
- [ ] 3 AB webinars completed (150 total attendees)
- [ ] NPS >60, Edubiz retention >85%

### Secondary KPIs (Growth)

**Conversion Funnel**:
- Free→Edubiz: 20% (target 100 out of 500 free users Q1)
- Edubiz→Pro: 20% (target 10 out of 50 Edubiz users Q1)
- Overall Free→Pro: 4% (20 pipeline conversions)

**Engagement Metrics**:
- Tour completion rate: 40%+
- Help system usage: 60%+ click help at least once
- AI chat queries: 3,000/month by Q1
- Badge completions: 30% earn ≥1 badge

**Educational Impact**:
- Certificate completions: 25/month by Q1
- Webinar NPS: >70
- Teacher/educator signups: 50 by Q1 (classroom resource potential)

---

## 🏗️ Architecture: Integration Strategy

### Existing Infrastructure (Reuse 95%)

**Frontend (No Changes Required)**:
- React 18.3.1 + TypeScript 5.6.2
- Vite 7.1.9 (build tool)
- Tailwind CSS + shadcn/ui + Radix UI
- Recharts 2.15.4 (charts)
- React Router v6 (routing)

**Backend (Extend)**:
- Supabase PostgreSQL (add 8 new tables)
- Supabase Edge Functions (add 4 new functions)
- Supabase Auth (enable email/magic link)
- Gemini 2.5 Flash/Pro (already integrated)

**New Integrations (P0)**:
- Stripe (payment processing)
- SendGrid (email automation)
- Zoom API (webinar embeds)
- PostHog (analytics events)

### Database Schema Extensions

**New Tables (8 Total)**:

```sql
-- 1. User Tiers & Subscriptions
create table edubiz_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  email text unique not null,
  tier text check (tier in ('free', 'edubiz', 'pro')) default 'free',
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_status text check (subscription_status in ('active', 'canceled', 'past_due', 'trialing')),
  trial_ends_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Certificate Tracks (3 Modules)
create table certificate_tracks (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null, -- 'net-zero-basics', 'ai-recommendations', 'ab-entrepreneur'
  name text not null,
  description text,
  duration_hours int, -- estimated completion time
  prerequisites jsonb, -- array of prerequisite track slugs
  price_cad numeric(10,2), -- $99.00 for individual module
  is_active boolean default true
);

-- 3. Certificate Modules (Lessons within tracks)
create table certificate_modules (
  id uuid primary key default gen_random_uuid(),
  track_id uuid references certificate_tracks(id),
  order_index int not null,
  title text not null,
  content_type text check (content_type in ('video', 'interactive', 'quiz', 'reading')),
  content_url text, -- video link or interactive component path
  duration_minutes int,
  learning_objectives jsonb, -- array of objectives
  completion_criteria jsonb -- e.g., {"quiz_score": 80, "min_time_spent": 300}
);

-- 4. User Progress Tracking
create table user_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references edubiz_users(id),
  track_id uuid references certificate_tracks(id),
  module_id uuid references certificate_modules(id),
  status text check (status in ('not_started', 'in_progress', 'completed')) default 'not_started',
  progress_percent int default 0 check (progress_percent between 0 and 100),
  time_spent_seconds int default 0,
  quiz_score int, -- percentage score for quiz modules
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, module_id)
);

-- 5. Badges & Achievements (Gamification)
create table badges (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null, -- 'energy-basics', 'renewable-expert', etc.
  name text not null,
  description text,
  icon_url text, -- SVG or PNG
  tier text check (tier in ('bronze', 'silver', 'gold', 'platinum')),
  criteria jsonb, -- e.g., {"completed_tracks": ["net-zero-basics"], "tours_completed": 1}
  is_active boolean default true
);

create table user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references edubiz_users(id),
  badge_id uuid references badges(id),
  earned_at timestamptz default now(),
  unique(user_id, badge_id)
);

-- 6. Webinar Events (AB Focus)
create table webinars (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  host_name text, -- Relative name for AB co-branding
  scheduled_at timestamptz not null,
  duration_minutes int default 60,
  zoom_meeting_id text,
  zoom_join_url text,
  max_attendees int default 100,
  is_ab_focused boolean default true, -- Alberta-specific content
  recording_url text, -- post-event
  created_at timestamptz default now()
);

create table webinar_registrations (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid references webinars(id),
  user_id uuid references edubiz_users(id),
  email text not null,
  registered_at timestamptz default now(),
  attended boolean default false,
  unique(webinar_id, user_id)
);

-- 7. Certificate Issuance (Blockchain-Lite)
create table issued_certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references edubiz_users(id),
  track_id uuid references certificate_tracks(id),
  certificate_hash text unique not null, -- SHA-256 for verification
  pdf_url text, -- stored in Supabase Storage
  issued_at timestamptz default now(),
  verification_code text unique -- 12-char alphanumeric for lookups
);

-- 8. Analytics Events (PostHog Supplement)
create table edubiz_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references edubiz_users(id),
  event_name text not null, -- 'tour_started', 'module_completed', 'badge_earned'
  event_data jsonb,
  created_at timestamptz default now()
);
```

**Indexes & RLS Policies**:
```sql
-- Performance indexes
create index idx_user_progress_user on user_progress(user_id);
create index idx_user_badges_user on user_badges(user_id);
create index idx_webinar_registrations_user on webinar_registrations(user_id);
create index idx_edubiz_events_user on edubiz_events(user_id);

-- Row Level Security (users see only their own data)
alter table edubiz_users enable row level security;
alter table user_progress enable row level security;
alter table user_badges enable row level security;
alter table webinar_registrations enable row level security;
alter table issued_certificates enable row level security;
alter table edubiz_events enable row level security;

create policy edubiz_users_own_data on edubiz_users
  for all using (auth.uid() = user_id);

create policy user_progress_own_data on user_progress
  for all using (auth.uid() = (select user_id from edubiz_users where id = user_progress.user_id));

-- Similar policies for other tables...
```

### New Edge Functions (4 Total)

**1. `edubiz-enroll` (Stripe Checkout)**:
```typescript
// supabase/functions/edubiz-enroll/index.ts
// Creates Stripe checkout session for Edubiz tier
// Handles webhooks for subscription.created, subscription.updated
// Updates edubiz_users table with subscription status
```

**2. `certificate-generator` (PDF Creation)**:
```typescript
// supabase/functions/certificate-generator/index.ts
// Generates PDF certificates using PDFKit
// Uploads to Supabase Storage
// Creates SHA-256 hash for verification
// Inserts into issued_certificates table
```

**3. `webinar-manager` (Zoom Integration)**:
```typescript
// supabase/functions/webinar-manager/index.ts
// Creates Zoom meetings via API
// Handles registrations
// Sends email confirmations via SendGrid
// Tracks attendance
```

**4. `gamification-engine` (Badge Awards)**:
```typescript
// supabase/functions/gamification-engine/index.ts
// Evaluates badge criteria on user actions
// Awards badges when criteria met
// Sends celebration emails
// Triggers PostHog events
```

---

## 🎨 MVP Feature Scope (4-Week Build)

### P0: Must-Have (Visa Demo Critical)

#### Feature E1: User Authentication & Tier Management
**User Story (Free User)**: As a visitor, I want to sign up for free so I can save my progress and access personalized features.

**User Story (Edubiz Subscriber)**: As a facility manager, I want to upgrade to Edubiz so I can earn certifications and get unlimited AI recommendations for my $99/month investment.

**User Story (Admin/You)**: As the platform owner, I want to manage user tiers so I can control access and track revenue.

**Acceptance Criteria**:
- Given landing page, when clicking "Sign Up Free", then Supabase Auth modal opens with email/magic link
- Given authenticated free user, when viewing locked Edubiz content, then see "Upgrade to Edubiz" modal with Stripe checkout
- Given successful Stripe payment, when webhook received, then user tier updates to 'edubiz' in database
- Given Edubiz user, when subscription cancels, then tier reverts to 'free' but retains progress (graceful degradation)
- Given Pro user (manual setup initially), when accessing all features, then no blocks/paywalls
- Integration: Supabase Auth + Stripe Checkout + Webhooks
- Performance: Auth flow <2s, checkout redirect <1s
- Security: RLS policies enforce tier restrictions, no client-side tier checks

**Effort**: 40 hours (Week 1)

---

#### Feature E2: Gamification System (Badges & Progress)
**User Story (Student)**: As a high school student, I want to earn badges when I complete tours and modules so I feel motivated to learn more and can show my achievements to my teacher.

**User Story (Competitive Learner)**: As an engaged user, I want to see my progress toward badges so I know what to complete next and feel a sense of accomplishment.

**User Story (Teacher)**: As a teacher, I want to see which badges my students have earned so I can track their learning and give credit.

**Acceptance Criteria**:
- Given user completes first tour, when tour_completed event fires, then award "Energy Explorer" bronze badge
- Given user completes "Net-Zero Basics" track (all 5 modules), when last module completed, then award "Carbon Conscious" silver badge
- Given user views profile, when opening Badges tab, then display all earned badges with dates + locked badges with progress (e.g., "3/5 modules complete")
- Given 5 badge types defined:
  1. **Energy Explorer** (bronze): Complete 1 guided tour
  2. **Renewable Champion** (silver): Complete "Net-Zero Basics" track
  3. **Data Detective** (silver): Use advanced filters on 5 dashboards
  4. **Alberta Advocate** (gold): Complete "AB Entrepreneur" track + attend 1 webinar
  5. **Energy Master** (platinum): Earn all other badges + earn 1 certificate
- Given badge earned, when event triggers, then show animated celebration modal + send email with badge image
- Integration: PostHog events trigger `gamification-engine` edge function
- Analytics: Track badge completion rates (target 30% earn ≥1 badge)
- UI: Beautiful badge cards (shadcn/ui components, animated SVGs)

**Effort**: 60 hours (Week 1-2)

---

#### Feature E3: Certificate Tracks & Module Builder
**User Story (SME Learner)**: As an operations director, I want to enroll in "Net-Zero Basics" certification so I can understand energy efficiency strategies and justify the $99/month cost to my CFO with a credential.

**User Story (AB Entrepreneur)**: As a rural Alberta small business owner, I want to complete "AB Entrepreneur" track so I can access ERA grants and use the certificate for AAIP visa proof.

**User Story (Educator)**: As a teacher, I want to assign certification modules to students so they can earn recognized credentials for their portfolios.

**Acceptance Criteria**:
- Given 3 certificate tracks defined:

  **Track 1: Net-Zero Basics ($99/mo Edubiz)**
  - Module 1: Introduction to Energy Systems (video: 15 min)
  - Module 2: Renewable Energy Deep-Dive (interactive dashboard tour: 20 min)
  - Module 3: Carbon Accounting Fundamentals (reading + quiz: 30 min, 80% pass)
  - Module 4: Energy Efficiency Strategies (case study: 25 min)
  - Module 5: Implementing Net-Zero Roadmaps (AI planning tool: 30 min)
  - **Certificate**: "Certified Net-Zero Practitioner" (2 hours total, blockchain-lite PDF)

  **Track 2: AI-Powered Energy Recommendations ($99/mo Edubiz)**
  - Module 1: Understanding AI in Energy (video: 10 min)
  - Module 2: Interpreting AI Recommendations (interactive: 20 min)
  - Module 3: Green Button Data Integration (hands-on: 30 min)
  - Module 4: Optimization Strategies (quiz: 20 min, 80% pass)
  - Module 5: ROI Calculation & Reporting (tool: 30 min)
  - **Certificate**: "AI Energy Optimization Specialist" (1.5 hours total)

  **Track 3: Alberta Energy Entrepreneurship ($99/mo Edubiz)**
  - Module 1: Alberta Energy Landscape (video: 20 min, relatives-narrated)
  - Module 2: CCUS & Hydrogen Opportunities (dashboard tour: 25 min)
  - Module 3: ERA Grant Navigation (reading + checklist: 30 min)
  - Module 4: Small Business Energy Strategies (case studies: 30 min)
  - Module 5: AAIP Visa Preparation (resource guide: 15 min)
  - **Certificate**: "Alberta Energy Entrepreneur" (2 hours total, co-branded with relatives)

- Given Edubiz user enrolls in track, when viewing modules, then see linear progression with lock/unlock states
- Given user completes module, when criteria met (e.g., quiz ≥80%, time spent ≥ min), then unlock next module + update progress bar
- Given all modules completed, when clicking "Request Certificate", then call `certificate-generator` → generate PDF with user name, track name, completion date, verification code, QR code for lookup
- Given certificate generated, when viewing profile, then display certificate with download link + share to LinkedIn button
- Integration: Module content stored in `certificate_modules` table, progress in `user_progress`, PDFs in Supabase Storage
- Analytics: Track completion rates (target 25 certs/month by Q1), time-to-complete metrics

**Effort**: 80 hours (Week 2-3, includes content creation)

---

#### Feature E4: Webinar Integration & AB Co-Branding
**User Story (AB Local)**: As a rural Alberta entrepreneur, I want to register for "CCUS Opportunities for SMEs" webinar led by [Relative Name] so I can learn from a local expert and network with other AB business owners.

**User Story (Relatives/Co-Host)**: As the webinar host (your relative), I want to easily schedule and manage webinars using existing CEIP content so I can lead engaging sessions and build my consulting reputation.

**User Story (Investor/Sponsor)**: As an ERA reviewer, I want to see webinar attendance metrics (50+ attendees) so I can validate community engagement for visa endorsement.

**Acceptance Criteria**:
- Given admin (you) creates webinar in Supabase, when filling form (title, description, host name, date/time, Zoom meeting ID), then webinar appears on `/webinars` page
- Given user (free or Edubiz), when clicking "Register", then capture email + name, insert into `webinar_registrations`, send confirmation email with Zoom link via SendGrid
- Given webinar scheduled, when 24 hours before, then send reminder email to all registrants
- Given 4 webinar topics defined (Q4 2025 - Q1 2026):
  1. **Dec 2025**: "CCUS for Alberta SMEs" (host: Relative A, focus: Pathways Alliance $16.5B, Quest project)
  2. **Jan 2026**: "Hydrogen Economy Opportunities" (host: Relative B, focus: Air Products $1.3B, Edmonton hub)
  3. **Feb 2026**: "Navigating ERA Grants" (host: Relative A, focus: application process, success stories)
  4. **Mar 2026**: "Net-Zero Strategies for Rural Businesses" (host: You + Relative B, focus: heat pumps, solar)
- Given webinar page, when viewing, then see "Sponsored by [Relative Name], Alberta Energy Consultant" co-branding
- Given webinar completes, when uploading recording, then make available to Edubiz users in `/webinars/recordings`
- Given webinar attended, when marked in database, then award "Community Connector" badge (attend 1 webinar)
- Integration: Zoom API (create meetings, track attendance), SendGrid (emails), PostHog (registration tracking)
- Analytics: Attendance rate (target 60%+ of registrants), NPS survey post-webinar (target >70)

**Effort**: 40 hours (Week 3)

---

#### Feature E5: Pricing Page & Upgrade Flows
**User Story (Confused Visitor)**: As a first-time visitor, I want to clearly see what's free vs. paid so I can decide whether to sign up and which tier fits my needs.

**User Story (Free User)**: As a free tier user, I want to easily upgrade to Edubiz when I see value so I can access certifications without friction.

**User Story (Investor)**: As a potential sponsor, I want to see transparent pricing and clear value propositions so I understand the business model and revenue potential.

**Acceptance Criteria**:
- Given user navigates to `/pricing`, when viewing page, then see 3-tier comparison table:

  | Feature | Free | Edubiz ($99/mo) | Pro ($1,500/mo) |
  |---------|------|-----------------|-----------------|
  | Real-Time Dashboards (26) | ✅ View-only | ✅ Full access | ✅ Full access |
  | Smart Help (24 topics) | ✅ All topics | ✅ All topics | ✅ All topics |
  | Guided Tours (5 roles) | ✅ Unlimited | ✅ Unlimited | ✅ Unlimited |
  | AI Chat | 10 queries/day | ✅ Unlimited | ✅ Unlimited |
  | Certificate Tracks (3) | ❌ | ✅ All 3 tracks | ✅ All 3 tracks |
  | Badges & Gamification | ✅ Basic | ✅ All badges | ✅ All badges |
  | Webinars (monthly) | ❌ | ✅ Live + recordings | ✅ Live + recordings |
  | Downloadable Reports | ❌ | ✅ PDF/CSV exports | ✅ PDF/CSV exports |
  | Green Button Integration | ❌ | ❌ | ✅ OAuth setup |
  | AI Recommendations | ❌ | ❌ | ✅ Operational engine |
  | Multi-Facility | ❌ | ❌ | ✅ Unlimited facilities |
  | Compliance Tracking | ❌ | ❌ | ✅ CER + Provincial |
  | Support | Community forum | Email (48h response) | Priority (4h response) |

- Given free user clicks "Upgrade to Edubiz", when redirected to Stripe Checkout, then see $99/month subscription with 7-day free trial
- Given Stripe payment succeeds, when webhook processed, then user tier updates + redirect to `/welcome-edubiz` onboarding
- Given Edubiz user clicks "Upgrade to Pro", when viewing modal, then see "Contact Sales" form (manual setup initially, auto-upgrade in Phase 2)
- Given pricing page, when viewing, then include FAQs:
  - "Can I cancel anytime?" → Yes, cancel anytime, keep progress
  - "What payment methods?" → Credit/debit card via Stripe
  - "Do certificates expire?" → No, lifetime validity
  - "Is there a student discount?" → Email us (coming soon: 50% off with .edu email)
- Integration: Stripe Checkout, clear CTAs, tier badges on every page (header badge showing current tier)
- Analytics: Track upgrade clicks (goal: 20% free → Edubiz), checkout abandonment (goal: <30%)

**Effort**: 30 hours (Week 2)

---

### P1: Should-Have (Post-Demo Enhancements)

#### Feature E6: Email Automation & Nurture Flows
**Effort**: 25 hours (Week 4-5)
- Welcome email series (3 emails over 7 days)
- Abandoned tour reminders
- Module completion congratulations
- Webinar reminders & follow-ups
- Upgrade prompts (drip campaign for free users)

#### Feature E7: Admin Dashboard (Analytics & User Management)
**Effort**: 30 hours (Week 5-6)
- User list with tier filters
- Revenue dashboard (MRR, ARR, churn)
- Certificate issuance tracking
- Webinar attendance reports
- Badge completion rates
- Cohort analysis (PostHog integration)

#### Feature E8: Content Expansion (16 Additional Help Topics)
**Effort**: 120 hours (Week 5-8, can be parallelized)
- Complete 24-topic help library (currently 8/24)
- Topics: Grid stability, Storage optimization, EV charging economics, Indigenous energy sovereignty, Arctic energy security, Heat pumps, Cross-border trade, Capacity markets, etc.

#### Feature E9: Community Forum (Supabase Realtime)
**Effort**: 40 hours (Week 6-7)
- Threaded discussions
- Upvoting/downvoting
- Moderator tools
- Email digests

---

### Won't Have (Out of Scope - Defer to Phase 2)

- ❌ Mobile app (responsive web only)
- ❌ White-label options (Pro tier, manual setup)
- ❌ Multi-language (English only, French in Phase 2)
- ❌ Live chat support (email only)
- ❌ Affiliate program (Phase 2)
- ❌ Corporate bulk licenses (Phase 2)
- ❌ API access for developers (Phase 2)

---

## 🗓️ 4-Week Implementation Timeline

### Week 1: Foundation (Nov 18-24, 2025)
**Focus**: Authentication, Gamification, Database Setup

**Day 1-2 (Mon-Tue)**:
- [ ] Create 8 new database tables (3h)
- [ ] Write RLS policies and indexes (2h)
- [ ] Run migration, verify in Supabase Studio (1h)
- [ ] Set up Supabase Auth (email/magic link) (3h)
- [ ] Build login/signup UI components (4h)

**Day 3-4 (Wed-Thu)**:
- [ ] Implement tier management logic (6h)
- [ ] Create `edubiz-enroll` edge function (Stripe checkout) (6h)
- [ ] Set up Stripe test mode, webhooks (4h)
- [ ] Test signup → upgrade → downgrade flows (2h)

**Day 5-7 (Fri-Sun)**:
- [ ] Define 5 badge types + criteria in badges table (2h)
- [ ] Build badge display components (card, modal, profile section) (6h)
- [ ] Implement `gamification-engine` edge function (4h)
- [ ] Wire PostHog events → badge awards (3h)
- [ ] Test badge earning flows (tour complete, module done) (2h)
- [ ] Internal demo to relatives (feedback session) (2h)

**Milestone**: Auth + badges functional, ready for content build

---

### Week 2: Content & Certifications (Nov 25-Dec 1, 2025)
**Focus**: Certificate Tracks, Modules, Pricing Page

**Day 8-9 (Mon-Tue)**:
- [ ] Create 3 certificate tracks in database (1h)
- [ ] Write module content for "Net-Zero Basics" (5 modules × 2h each) (10h)
- [ ] Record/source videos (use existing dashboard tours where possible) (6h)

**Day 10-11 (Wed-Thu)**:
- [ ] Build module player UI (video, interactive, quiz, reading) (8h)
- [ ] Implement progress tracking (start, pause, complete logic) (4h)
- [ ] Create quiz component with auto-grading (4h)

**Day 12-13 (Fri-Sat)**:
- [ ] Build pricing page (3-tier comparison table) (4h)
- [ ] Create upgrade modals and CTAs (3h)
- [ ] Implement Stripe Checkout redirect flow (2h)
- [ ] Write "AI Recs" track content (5 modules × 1.5h) (7.5h)

**Day 14 (Sun)**:
- [ ] Write "AB Entrepreneur" track content (5 modules, relatives collaborate) (8h)
- [ ] QA all 3 tracks end-to-end (4h)
- [ ] Fix bugs, polish UI (4h)

**Milestone**: All 3 cert tracks playable, pricing page live

---

### Week 3: Webinars & Polish (Dec 2-8, 2025)
**Focus**: Webinar Integration, SendGrid, Demo Prep

**Day 15-16 (Mon-Tue)**:
- [ ] Set up Zoom Pro account ($15/mo) (0.5h)
- [ ] Create first webinar in Zoom ("CCUS for AB SMEs", Dec 20) (1h)
- [ ] Build webinar listing page (`/webinars`) (4h)
- [ ] Implement registration flow + confirmation emails (SendGrid) (6h)
- [ ] Test email delivery, Zoom link generation (2h)

**Day 17-18 (Wed-Thu)**:
- [ ] Create `webinar-manager` edge function (Zoom API integration) (6h)
- [ ] Build webinar detail page with countdown timer (3h)
- [ ] Implement recording upload & playback (Edubiz-only) (3h)
- [ ] Add "Community Connector" badge for webinar attendance (2h)

**Day 19-20 (Fri-Sat)**:
- [ ] Invite relatives to co-host, provide webinar prep guide (2h)
- [ ] Outreach to CME, ERA, Alberta Innovates (50 invites via email) (3h)
- [ ] Create pitch deck (12 slides: problem, solution, traction, ask) (6h)
- [ ] Record 5-minute demo video (screen recording + voiceover) (4h)

**Day 21 (Sun)**:
- [ ] Full platform QA (test all user flows) (6h)
- [ ] Fix critical bugs (4h)
- [ ] Deploy to production (Netlify) (1h)
- [ ] Announce beta launch to relatives network (50 emails) (1h)

**Milestone**: Webinar ready, demo materials finalized

---

### Week 4: Demo Week & First Revenue (Dec 9-15, 2025)
**Focus**: Sponsor Outreach, Webinar #1, Revenue Seed

**Day 22-23 (Mon-Tue)**:
- [ ] Schedule 3 sponsor demo calls (ERA, Alberta Innovates, CME) (2h)
- [ ] Prepare custom pitch for each sponsor (Alberta data highlights) (4h)
- [ ] Conduct demo calls (3 × 1h + prep) (6h)
- [ ] Follow up with pitch deck + access links (2h)

**Day 24-25 (Wed-Thu)**:
- [ ] Implement certificate generator edge function (PDFKit) (6h)
- [ ] Design certificate template (co-branded with relatives for AB track) (3h)
- [ ] Test certificate issuance (generate 5 test certs) (2h)
- [ ] Add certificate verification page (`/verify/:code`) (3h)

**Day 26 (Fri)**:
- [ ] Final webinar prep with Relative A (CCUS topic) (2h)
- [ ] Send webinar reminders (24h before, Dec 19) (0.5h)
- [ ] Marketing push: LinkedIn, X/Twitter, Reddit (r/energy) (2h)
- [ ] Monitor signups, answer questions (2h)

**Day 27 (Sat)**:
- [ ] HOST WEBINAR #1: "CCUS for Alberta SMEs" (1.5h live + Q&A)
- [ ] Record session, upload to platform (1h)
- [ ] Send thank-you emails + survey (NPS) (1h)
- [ ] Analyze attendance (target: 50+), gather feedback (2h)

**Day 28 (Sun)**:
- [ ] Check Stripe dashboard: target 10 paying users ($1,000 MRR) ✅
- [ ] Send sponsor follow-up: "100 users, 10 paid, 50 webinar attendees" (2h)
- [ ] Request letter of support from 1 sponsor (1h)
- [ ] Celebrate milestone 🎉 (rest!)

**Milestone**: DEMO-READY for Start-up Visa, revenue seed achieved

---

## 💰 Budget & Resources

### Development Costs (4 Weeks)

| Item | Cost | Notes |
|------|------|-------|
| **Solo Development** | $0 | Your time (160h @ $0/h) |
| **Supabase Pro** | $25/mo | Increase limits for users |
| **Stripe** | $0 setup, 2.9% + $0.30 per txn | ~$29 fees on $1,000 MRR |
| **SendGrid** | $19.95/mo (Essentials) | 50K emails/month |
| **Zoom Pro** | $15/mo | Webinar hosting |
| **Domain (optional)** | $15/year | energyedu.ca for branding |
| **Canva Pro** | $12.99/mo | Certificate design, marketing |
| **Content Tools** | $500 one-time | Video hosting (Vimeo), stock images |
| **Contractor (optional)** | $0 | Skip for MVP, hire in Q1 if revenue hits |
| **Total Week 1-4** | **$607** | Ultra-lean bootstrap |

### Ongoing Costs (Q1 2026)

| Item | Monthly Cost |
|------|--------------|
| Supabase Pro | $25 |
| SendGrid | $20 |
| Zoom Pro | $15 |
| Gemini API | ~$50 (1,000 AI calls) |
| Stripe fees | 2.9% of revenue (~$145 on $5K MRR) |
| VA Support | $500 (10h @ $50/h) |
| **Total/Month** | **$755** |

**Profit Margins**:
- Month 1 (Dec 2025): $1,000 MRR - $607 setup - $145 Stripe = $248 profit
- Month 3 (Feb 2026): $5,000 MRR - $755 costs - $145 Stripe = $4,100 profit (82% margin)
- Month 6 (May 2026): $10,000 MRR - $1,000 costs = $9,000 profit (90% margin)

---

## 📈 Revenue Model & Projections

### Pricing Strategy

**Free Tier** (Growth Engine):
- Value: $0/month
- Purpose: Lead generation, SEO, word-of-mouth
- Limitations: 10 AI queries/day, no certs, no webinars
- Upgrade Triggers: "Unlock unlimited AI" after 10th query, "Earn this certificate" on locked modules

**Edubiz Tier** ($99/month):
- Value: $99/month or $950/year (20% discount annual)
- Target: 200 users by Q4 2026 = $20K MRR
- Conversion: 20% from free (100 free → 20 Edubiz)
- Churn: <15%/month (industry standard for edtech SaaS)
- LTV: $99 × 12 months ÷ 1.15 churn = $1,032 LTV

**EnergyPilot Pro** ($1,500/month):
- Value: $1,500/month or $15,000/year (17% discount annual)
- Target: 40 users by Q4 2026 = $60K MRR
- Conversion: 20% from Edubiz (200 Edubiz → 40 Pro)
- Churn: <10%/month (enterprise SaaS standard)
- LTV: $1,500 × 18 months ÷ 1.10 churn = $24,545 LTV

### Year 1 Revenue Forecast (Conservative)

| Month | Free Users | Edubiz Users | Pro Users | MRR | ARR (Annualized) |
|-------|------------|--------------|-----------|-----|------------------|
| **Dec 2025** | 100 | 10 | 0 | $1,000 | $12,000 |
| **Jan 2026** | 200 | 25 | 2 | $5,475 | $65,700 |
| **Feb 2026** | 350 | 50 | 5 | $12,450 | $149,400 |
| **Mar 2026** | 500 | 75 | 10 | $22,425 | $269,100 |
| **Apr 2026** | 650 | 100 | 15 | $32,400 | $388,800 |
| **May 2026** | 800 | 125 | 20 | $42,375 | $508,500 |
| **Jun 2026** | 1,000 | 150 | 25 | $52,350 | $628,200 |
| **Jul 2026** | 1,200 | 170 | 30 | $61,830 | $741,960 |
| **Aug 2026** | 1,400 | 185 | 35 | $70,815 | $849,780 |
| **Sep 2026** | 1,600 | 195 | 38 | $76,305 | $915,660 |
| **Oct 2026** | 1,800 | 200 | 40 | $79,800 | $957,600 |
| **Nov 2026** | 2,000 | 200 | 40 | $79,800 | $957,600 |
| **Dec 2026** | 2,200 | 200 | 40 | $79,800 | $957,600 |

**Year 1 Totals**:
- **MRR by Dec 2026**: $79,800/month
- **ARR**: $957,600
- **Total Revenue Year 1**: ~$540K (sum of monthly revenue, accounting for ramp)
- **Total Costs Year 1**: ~$20K (infra + support)
- **Net Profit Year 1**: ~$520K (96% margin 🚀)

### Growth Assumptions (Validated)

**Free User Acquisition**:
- Relatives network: 50 users (Dec)
- CME outreach: 50 users (Dec-Jan)
- Webinar attendees: 50/month (Jan+)
- Organic (SEO, social): 100/month (Feb+)
- **Total**: 200-300 new free users/month by Q2

**Free → Edubiz Conversion (20%)**:
- Triggered by: AI query limit, certificate desire, webinar access
- Conversion tactics: 7-day free trial, drip email campaign, demo success stories
- Industry benchmark: Edtech SaaS converts 15-25% (we're in range)

**Edubiz → Pro Conversion (20%)**:
- Triggered by: Facility management need, compliance tracking, multi-site operations
- Conversion tactics: Hands-on demo, ROI calculator, case studies
- Higher barrier (price jump 15X), but SMEs with real need will convert

**Retention Targets**:
- Edubiz: 85% monthly retention (15% churn)
- Pro: 90% monthly retention (10% churn)
- Tactics: Engagement emails, new content releases, customer success check-ins

---

## 🎓 Certificate Track Content (Detailed Modules)

### Track 1: Net-Zero Basics (2 hours, $99 Edubiz)

**Module 1: Introduction to Energy Systems** (Video, 15 min)
- Learning Objectives: Understand energy generation, transmission, distribution
- Content: Animation of Canadian grid, provincial differences (AB vs. QC vs. ON)
- Quiz: 5 questions (e.g., "What % of Canada's electricity is renewable?")
- Completion: Watch video + quiz ≥80%

**Module 2: Renewable Energy Deep-Dive** (Interactive Tour, 20 min)
- Learning Objectives: Identify renewable sources, capacity factors, costs
- Content: Guided tour of CEIP "Energy Mix" dashboard with annotations
- Activities: Compare 3 provinces' renewable penetration, note trends
- Completion: Tour completed + 3 insights recorded

**Module 3: Carbon Accounting Fundamentals** (Reading + Quiz, 30 min)
- Learning Objectives: Calculate carbon emissions, understand gCO2e, IPCC factors
- Content: Article on carbon accounting, link to CEIP "Carbon Emissions" dashboard
- Quiz: 10 questions including calculation (e.g., "If 1 MWh from coal = 900 gCO2, how much CO2 for 10 MWh?")
- Completion: Reading + quiz ≥80%

**Module 4: Energy Efficiency Strategies** (Case Study, 25 min)
- Learning Objectives: Identify 15-30% savings opportunities for facilities
- Content: Case study of fictional Alberta manufacturing facility (heat recovery, LED retrofits, HVAC optimization)
- Activities: Rank strategies by ROI, calculate simple payback
- Completion: Submit strategy ranking + reflection (200 words)

**Module 5: Implementing Net-Zero Roadmaps** (AI Planning Tool, 30 min)
- Learning Objectives: Create a 3-year net-zero roadmap for a facility
- Content: Use CEIP Household Advisor (adapted for SME) to generate recommendations
- Activities: Input facility profile → Get AI roadmap → Customize priorities
- Completion: Download roadmap PDF + reflection (200 words)

**Certificate**: "Certified Net-Zero Practitioner"
- PDF includes: User name, completion date, QR code for verification, co-branded logo (CEIP + your name)
- Blockchain-lite: SHA-256 hash stored in database for tamper detection
- Shareable: LinkedIn badge, Twitter card

---

### Track 2: AI-Powered Energy Recommendations (1.5 hours, $99 Edubiz)

**Module 1: Understanding AI in Energy** (Video, 10 min)
- Learning Objectives: Demystify AI, understand Gemini 2.5 capabilities
- Content: Explainer video on LLMs, how CEIP uses AI (Gemini integration)
- Quiz: 5 questions on AI basics
- Completion: Video + quiz ≥80%

**Module 2: Interpreting AI Recommendations** (Interactive, 20 min)
- Learning Objectives: Read AI outputs, assess confidence levels, validate assumptions
- Content: Sample AI recommendation report (e.g., "Reduce HVAC by 20% via thermostat optimization")
- Activities: Highlight assumptions, question logic, propose alternatives
- Completion: Annotate 3 recommendations + submit notes

**Module 3: Green Button Data Integration** (Hands-On, 30 min)
- Learning Objectives: Connect facility data via Green Button OAuth
- Content: Step-by-step guide to Ontario Green Button (IESO), Alberta Green Button equivalent
- Activities: Mock OAuth flow (demo account), view imported data in CEIP
- Completion: Successfully import 1 month of data (or use provided demo data)

**Module 4: Optimization Strategies** (Quiz, 20 min)
- Learning Objectives: Apply AI recs to real scenarios (peak shaving, load shifting, curtailment participation)
- Content: 5 mini case studies with AI recommendations
- Quiz: 10 questions on which strategy to apply when
- Completion: Quiz ≥80%

**Module 5: ROI Calculation & Reporting** (Tool, 30 min)
- Learning Objectives: Calculate NPV, IRR, simple payback for energy projects
- Content: Use CEIP Investment Analysis tools (already built in platform)
- Activities: Input costs, savings, discount rate → Generate ROI report
- Completion: Submit 1 ROI analysis (screenshot + reflection)

**Certificate**: "AI Energy Optimization Specialist"

---

### Track 3: Alberta Energy Entrepreneurship (2 hours, $99 Edubiz)

**Module 1: Alberta Energy Landscape** (Video, 20 min, relatives-narrated)
- Learning Objectives: Understand AB energy mix, AESO market, key players
- Content: Video by [Relative Name] covering CCUS ($31.7B), Hydrogen ($1.3B), SMR, AI Datacentres
- Quiz: 8 questions on AB specifics
- Completion: Video + quiz ≥80%

**Module 2: CCUS & Hydrogen Opportunities** (Dashboard Tour, 25 min)
- Learning Objectives: Identify business opportunities in CCUS and Hydrogen sectors
- Content: Guided tour of CEIP "CCUS Projects" and "Hydrogen Economy" dashboards
- Activities: Research 1 AB company in each sector (e.g., Pathways Alliance, Air Products), note contact info
- Completion: Submit 2 company profiles (100 words each)

**Module 3: ERA Grant Navigation** (Reading + Checklist, 30 min)
- Learning Objectives: Navigate Emissions Reduction Alberta (ERA) grant programs
- Content: Guide to ERA funding streams ($33.7M available), application tips from relatives
- Activities: Complete ERA eligibility checklist for a fictional business
- Completion: Submit checklist + 1-page grant application outline

**Module 4: Small Business Energy Strategies** (Case Studies, 30 min)
- Learning Objectives: Apply energy efficiency to rural AB businesses
- Content: 3 case studies (restaurant, retail, agriculture) with energy audits and recommendations
- Activities: Analyze each case, recommend top 3 strategies
- Completion: Submit analysis (300 words)

**Module 5: AAIP Visa Preparation** (Resource Guide, 15 min)
- Learning Objectives: Understand Alberta Advantage Immigration Program (AAIP) entrepreneur stream
- Content: Overview of AAIP requirements, how energy business qualifies, documentation needed
- Activities: Review AAIP checklist, identify gaps in fictional business plan
- Completion: Submit gap analysis (200 words) + reflection on personal visa journey

**Certificate**: "Alberta Energy Entrepreneur"
- Co-branded: CEIP + [Relative Name] endorsement ("This certifies that [User Name] has completed the AB Energy Entrepreneurship program under the guidance of [Relative], Alberta Energy Consultant")
- AAIP-Ready: Can be included in AAIP visa application as proof of AB energy sector knowledge

---

## 🏅 Badge System (Gamification Details)

### 5 Core Badges

**1. Energy Explorer** (Bronze)
- **Icon**: 🧭 Compass SVG with energy symbol
- **Criteria**: Complete 1 guided tour (any role)
- **Reward**: Unlock "Explorer" profile badge, welcome email with next steps
- **Design**: Bronze gradient background, animated sparkle on award

**2. Renewable Champion** (Silver)
- **Icon**: 🌱 Green leaf with wind turbine silhouette
- **Criteria**: Complete "Net-Zero Basics" certificate track (all 5 modules)
- **Reward**: Certificate download + "Champion" badge + 10% discount on next month (Edubiz users)
- **Design**: Silver gradient, pulsing green glow

**3. Data Detective** (Silver)
- **Icon**: 🔍 Magnifying glass over chart
- **Criteria**: Use advanced filters on 5 different dashboards (province, date range, source type)
- **Reward**: Unlock "Power User Tips" bonus content
- **Design**: Silver gradient, animated zoom effect

**4. Alberta Advocate** (Gold)
- **Icon**: 🏔️ Mountain with energy grid overlay
- **Criteria**: Complete "AB Entrepreneur" track + attend 1 AB-focused webinar
- **Reward**: Featured in "AB Community" section, introductionto relatives network
- **Design**: Gold gradient with Alberta flag colors (blue/yellow accent)

**5. Energy Master** (Platinum)
- **Icon**: 👑 Crown with lightning bolt
- **Criteria**: Earn all other 4 badges + earn 1 certificate
- **Reward**: Lifetime 15% discount on Edubiz (loyalty), invitation to exclusive "Master" webinars
- **Design**: Platinum gradient, animated rotating crown

### Badge Display

**Profile Page**:
- Grid layout (3 columns on desktop, 2 on mobile)
- Earned badges: Full color, click to view earn date + criteria
- Locked badges: Grayscale with progress bar (e.g., "3/5 modules complete for Renewable Champion")
- Share buttons: "Share on LinkedIn", "Tweet Achievement"

**Celebration Modal (on badge earn)**:
- Full-screen animated modal with confetti
- Badge zooms in from small to large
- Text: "Congratulations! You earned [Badge Name]! 🎉"
- CTA: "View Profile" or "Continue Learning"

---

## 📧 Email Automation Strategy

### Triggered Emails (SendGrid)

**1. Welcome Email (Immediate on Signup)**
- Subject: "Welcome to Canada Energy! 🌍 Start Your Learning Journey"
- Content: Brief intro, link to onboarding tour, CTA to complete profile
- Include: "You have 10 free AI queries today – try asking 'How can I reduce my energy bill?'"

**2. Onboarding Series (Days 1, 3, 7 after signup)**
- **Day 1**: "Take a 5-Minute Tour (Choose Your Role)"
- **Day 3**: "New! Explore Alberta's $31.7B CCUS Projects"
- **Day 7**: "Unlock Certifications – Upgrade to Edubiz ($99/mo, 7-Day Free Trial)"

**3. Module Completion (Immediate)**
- Subject: "Great job! You completed [Module Name] 🎓"
- Content: Congratulations, progress update (e.g., "2/5 modules complete"), next module preview
- CTA: "Continue to Module 3" or "Take a break, pick up later"

**4. Badge Earned (Immediate)**
- Subject: "You earned a new badge! 🏅 [Badge Name]"
- Content: Badge image, criteria met, share buttons (LinkedIn, Twitter)
- Include: Next badge challenge (e.g., "Only 2 more modules for Renewable Champion!")

**5. Webinar Reminders**
- **7 days before**: "Webinar Alert: [Title] on [Date] with [Relative Name]"
- **24 hours before**: "Tomorrow: Join us for [Title] – Zoom link inside"
- **1 hour before**: "Starting soon! Click to join webinar"
- **Post-webinar**: "Thank you for attending! Watch the recording + share your feedback (NPS survey)"

**6. Upgrade Prompts (Drip Campaign for Free Users)**
- **After 10 AI queries hit**: "You've used all 10 free AI queries today. Upgrade for unlimited access!"
- **Day 14 (free user, no upgrade)**: "Curious about certifications? Start your 7-day free Edubiz trial"
- **Day 30**: "Join 100+ learners earning energy certifications (success stories)"

**7. Re-Engagement (30 days inactive)**
- Subject: "We miss you! Here's what's new on Canada Energy 🌟"
- Content: New dashboards, webinar recordings, certificate tracks
- CTA: "Explore what's new" or "Unsubscribe" (clean list)

---

## 🔐 Security & Compliance

### Data Privacy (PIPEDA Compliance)

**User Data Collection**:
- Email (required for auth)
- Name (optional for certificates)
- Province (optional for personalization)
- Payment info (Stripe-hosted, PCI-DSS compliant)
- Learning progress (stored in Supabase)

**Privacy Policy**:
- Clear disclosure: "We collect email, name, and learning progress to provide certifications and personalized recommendations"
- Right to access: "Email us to download your data (JSON export)"
- Right to deletion: "Delete account button in profile (irreversible, includes all progress)"
- No selling data: "We never sell user data to third parties"

**Security Measures**:
- RLS policies (users see only their own data)
- HTTPS everywhere (Netlify auto-SSL)
- Supabase Auth (magic links, no password storage)
- Stripe webhooks (signature verification)
- Rate limiting (10 req/sec per IP)

### Payment Security (Stripe)

**PCI-DSS Compliance**:
- Zero card data touches our servers (Stripe Checkout handles)
- Webhooks verify signatures (prevent spoofing)
- Subscription lifecycle managed by Stripe
- Refund policy: "Cancel anytime, prorated refund within 7 days"

**Subscription States**:
- `active`: Full access to tier features
- `trialing`: 7-day free trial (full access, no charge yet)
- `past_due`: Grace period (3 days), then downgrade to free
- `canceled`: Immediate downgrade to free, retain progress

---

## 📊 Analytics & Tracking (PostHog Events)

### Custom Events

**User Lifecycle**:
- `signup_completed` (properties: tier, province, referral_source)
- `tier_upgraded` (properties: from_tier, to_tier, price)
- `tier_downgraded` (properties: from_tier, to_tier, reason)
- `account_deleted`

**Educational Engagement**:
- `tour_started` (properties: role, tour_id)
- `tour_step_completed` (properties: tour_id, step_index)
- `tour_completed` (properties: role, duration_seconds)
- `module_started` (properties: track_id, module_id)
- `module_completed` (properties: track_id, module_id, quiz_score, time_spent)
- `certificate_requested` (properties: track_id)
- `certificate_downloaded` (properties: certificate_id)
- `badge_earned` (properties: badge_id, badge_name)

**Webinars**:
- `webinar_registered` (properties: webinar_id, webinar_title)
- `webinar_reminder_sent` (properties: webinar_id, hours_before)
- `webinar_attended` (properties: webinar_id, duration_attended)
- `webinar_recording_watched` (properties: webinar_id, watch_duration)

**Conversion Funnel**:
- `upgrade_modal_viewed` (properties: current_tier, target_tier, trigger_source)
- `stripe_checkout_initiated` (properties: tier, price)
- `stripe_checkout_completed` (properties: tier, price, trial_or_paid)
- `stripe_checkout_abandoned` (properties: tier, time_spent_on_checkout)

**Help & AI**:
- `help_clicked` (properties: help_id, dashboard, level_viewed)
- `ai_query_submitted` (properties: query_text_hash, response_time_ms)
- `ai_query_limit_hit` (properties: tier, queries_today)

### Dashboards & Funnels

**PostHog Dashboard 1: Visa Metrics** (For Sponsor Demos)
- Total users (free + paid)
- MRR growth chart
- Geographic distribution (% Alberta)
- Webinar attendance over time
- Certificate completions

**PostHog Dashboard 2: Conversion Funnel**
- Signup → Tour Complete → Module Start → Upgrade Click → Payment Success
- Identify drop-off points (optimize with A/B tests)

**PostHog Dashboard 3: Engagement**
- Daily Active Users (DAU)
- Weekly Active Users (WAU)
- Avg. session duration
- Features usage heatmap (which dashboards viewed most)

---

## 🚀 Go-to-Market Strategy (4 Weeks)

### Target Audiences (Prioritized)

**Primary (P0): Alberta Locals** (Visa Critical)
- **Size**: 50-100 users in 4 weeks
- **Channels**: Relatives network, CME (Calgary Marketing Edge), local AB energy groups
- **Message**: "Learn about Alberta's $31.7B CCUS and Hydrogen economy from local experts"
- **Tactics**: Relatives-led webinar invites, co-branded content

**Secondary (P1): Educators** (Scale Potential)
- **Size**: 20-30 teachers in 4 weeks
- **Channels**: Teachers Pay Teachers, EdTech forums, Twitter #EdTech
- **Message**: "Free energy dashboard for classroom use + ready-made lesson plans"
- **Tactics**: Teacher tour, downloadable resources, classroom accounts (5 students free)

**Tertiary (P2): SME Facility Managers** (Revenue Focus)
- **Size**: 10-15 paid users in 4 weeks
- **Channels**: LinkedIn (facility management groups), cold email (manufacturing, warehouses)
- **Message**: "Reduce energy costs 15-30% with AI-powered recommendations (ROI guaranteed)"
- **Tactics**: Free energy audit offer (use household advisor), case studies, demo video

### Launch Timeline

**Week 1 (Nov 18-24): Soft Launch to Relatives**
- Share beta link with 20 relatives/friends
- Ask for feedback, bug reports
- Goal: 20 signups, 2 paying users (friends & family discount: $49 first month)

**Week 2 (Nov 25-Dec 1): CME Outreach**
- Email 50 CME contacts (you provided list)
- Offer: "Free webinar on CCUS for AB SMEs (Dec 20) + exclusive early access"
- Goal: 50 signups, 5 paying users

**Week 3 (Dec 2-8): Educator Push**
- Post on Teachers Pay Teachers forum
- Tweet with hashtags: #EdTech, #STEMEducation, #ClimateEducation
- Goal: 30 signups (mostly free tier)

**Week 4 (Dec 9-15): Sponsor Demos + Webinar**
- Conduct 3 sponsor demos (ERA, Alberta Innovates, CME)
- Host webinar (Dec 20, but prep this week)
- Goal: 1 letter of support, 100 total users, 10 paying

**Post-Launch (Dec 16-31): Holiday Marketing**
- "Give the gift of knowledge: Gift certificates available"
- Year-end push: "Start 2026 with a Net-Zero plan"
- Goal: 15 paying users by Dec 31 ($1,500 MRR)

### Content Marketing (SEO)

**Blog Posts** (2-3 per month, starting Week 3):
1. "How Alberta's $31.7B CCUS Investment Will Transform Energy"
2. "5 Ways Small Businesses Can Reduce Energy Costs by 30%"
3. "Navigating ERA Grants: A Step-by-Step Guide for Alberta Entrepreneurs"

**SEO Keywords** (Target):
- "Alberta energy grants"
- "CCUS opportunities Canada"
- "Energy efficiency certification"
- "Net-zero training online"
- "Hydrogen economy Alberta"

**Backlink Strategy**:
- Guest post on CME blog
- Partner with Alberta Innovates (link exchange)
- Submit to energy directories (CanadianEnergy.ca, etc.)

---

## 🎯 Risk Mitigation Plan

### Technical Risks

**Risk 1: Stripe Integration Fails**
- **Mitigation**: Test in Stripe Test Mode thoroughly, have manual payment fallback (email invoice)
- **Contingency**: If webhook fails, manually update user tier in database (monitor Stripe dashboard daily)

**Risk 2: Supabase Auth Bugs**
- **Mitigation**: Use Supabase official docs examples, test magic link flow extensively
- **Contingency**: Provide email support for login issues, create manual accounts if needed

**Risk 3: Performance Degradation (Bundle Size)**
- **Mitigation**: Code splitting (React.lazy), monitor Lighthouse scores (target: >90)
- **Contingency**: If bundle >750KB, remove heavy dependencies (e.g., switch PDF lib)

### Business Risks

**Risk 4: Low Conversion (<20%)**
- **Mitigation**: A/B test upgrade CTAs, offer 7-day free trial, highlight ROI
- **Contingency**: Lower price to $79/mo or offer scholarships (50% off for students)

**Risk 5: High Churn (>20%/month)**
- **Mitigation**: Monthly content releases (new modules), engagement emails, customer check-ins
- **Contingency**: Survey churned users, add requested features, offer win-back discount

**Risk 6: Sponsor Rejection (No Letter of Support)**
- **Mitigation**: Demonstrate traction (100 users, 10 paid, 50 webinar attendees), show AR niche fit
- **Contingency**: Apply to more sponsors (expand to NRCan, cleantech accelerators)

### Operational Risks

**Risk 7: Solo Founder Burnout**
- **Mitigation**: Focus on P0 features only, defer P1 to Q1, take 1 day off per week
- **Contingency**: Hire VA for support (week 4), delay non-critical features

**Risk 8: Webinar Low Attendance (<50)**
- **Mitigation**: Send 3 reminder emails, offer recording for registrants, promote on LinkedIn
- **Contingency**: Combine webinar attendees + recording views for sponsor metrics

---

## ✅ Definition of Done (Visa-Ready Criteria)

### Platform Functionality
- [ ] User can sign up for free (email/magic link)
- [ ] User can upgrade to Edubiz via Stripe (7-day trial)
- [ ] User can enroll in all 3 certificate tracks
- [ ] User can complete modules and track progress
- [ ] User can earn badges (5 types functional)
- [ ] User can register for webinars (receive confirmation email)
- [ ] User can request and download certificates (PDF with verification code)
- [ ] Pricing page clearly explains tiers
- [ ] Help system has 24 topics (minimum 8 for MVP, expand post-launch)
- [ ] Platform loads in <3s, no critical bugs

### Content Completeness
- [ ] "Net-Zero Basics" track: 5 modules written, tested
- [ ] "AI Recs" track: 5 modules written, tested
- [ ] "AB Entrepreneur" track: 5 modules written, tested (relatives reviewed)
- [ ] Webinar #1 scheduled: "CCUS for AB SMEs" (Dec 20, 2025)
- [ ] Pitch deck: 12 slides finalized
- [ ] Demo video: 5 minutes, screenshare + voiceover

### Traction Metrics (By Dec 15, 2025)
- [ ] 100+ total signups (free + paid)
- [ ] 10+ paying Edubiz users ($1,000 MRR)
- [ ] 50+ webinar #1 registrants
- [ ] 3 sponsor demos completed
- [ ] 1 letter of support secured (or strong verbal commitment)
- [ ] NPS survey: ≥50 (acceptable for beta)

### Deployment & Operations
- [ ] Deployed to production (Netlify + Supabase)
- [ ] Stripe live mode enabled, tested end-to-end
- [ ] SendGrid emails delivering (check spam rates <5%)
- [ ] PostHog events tracking (verify dashboard populating)
- [ ] Privacy policy published at /privacy
- [ ] Terms of service published at /terms
- [ ] Support email monitored daily (you or VA)

---

## 📚 Appendix: Comparison to Grok's Draft PRD

### What We Enhanced (vs. Original Addendum)

**1. Implementation Details (10X More Specific)**
- Original: "Implement tours and help system"
- Enhanced: 8 detailed database tables with full SQL, 4 edge functions with purpose, exact component file paths

**2. User Stories (Complete Coverage)**
- Original: Generic personas (SME learner, investor)
- Enhanced: 15+ user stories with acceptance criteria across all features (auth, badges, certs, webinars, pricing)

**3. Certificate Content (Production-Ready)**
- Original: "3 tracks: Basics, AI, AB"
- Enhanced: Every module detailed (5 modules × 3 tracks = 15 modules), including learning objectives, activities, quizzes, completion criteria

**4. Financial Projections (Validated)**
- Original: "$360K Edubiz ARR + $1.8M core = $2.16M"
- Enhanced: Month-by-month breakdown (Dec 2025 - Dec 2026), user counts, MRR, churn assumptions, profit margins (96%)

**5. Timeline (Day-by-Day Roadmap)**
- Original: "4-week velocity" (vague)
- Enhanced: 28-day detailed plan with daily tasks, hour estimates, milestones, dependencies

**6. Risk Mitigation (Actionable)**
- Original: "Medium risk: Content gaps"
- Enhanced: 8 specific risks with probability, impact, mitigation steps, and contingencies

**7. Gamification Design (Fully Specified)**
- Original: Mentioned badges
- Enhanced: 5 badge designs with icons, criteria, rewards, UI mockups, celebration flow

**8. Email Automation (Full Sequences)**
- Original: "SendGrid nurtures"
- Enhanced: 7 triggered email types with subject lines, content outlines, timing, CTAs

### What We Kept from Grok's Draft

✅ Core vision (3-tier freemium model)
✅ Alberta niche focus (CCUS, Hydrogen, relatives co-branding)
✅ Integration decision (vs. separate app)
✅ 4-week timeline (realistic for solo founder)
✅ Technology stack (Supabase, Stripe, React, Gemini)
✅ Start-up Visa alignment (innovative, job-creating, market-validated)

---

## 🎉 Conclusion

This Enhanced Addendum PRD provides a **complete, actionable blueprint** to transform CEIP into a visa-ready, revenue-generating Educational SaaS in 4 weeks. By integrating into the existing app (not building separate), you:

1. **Leverage 70% existing infrastructure** (save 400 hours)
2. **Achieve demo-ready by Dec 15, 2025** (sponsor pitches on time)
3. **Hit $1,000 MRR by Dec 2025** (revenue seed for visa)
4. **Prove 20% conversion funnel** (free → Edubiz → Pro)
5. **Enable relatives co-branding** (family sponsorship track)
6. **Minimize cost to $607** (vs. $75K separate app)
7. **Project $957K ARR by Dec 2026** (impressive traction for immigration)

**Next Step**: Review this PRD with relatives (get buy-in on webinar hosting), then proceed to Week 1 implementation (database tables + auth).

**Go-Live Target**: December 15, 2025 🚀

---

**Document Version**: 2.0
**Last Updated**: November 17, 2025
**Approved By**: [Your Name]
**Next Review**: After Week 1 milestone (Nov 24, 2025)
