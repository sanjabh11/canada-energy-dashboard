# Week 1 Implementation Guide (Nov 18-24, 2025)
## Foundation: Database + Auth + Gamification

**Goal**: Have functional authentication and gamification system by Sunday Nov 24

---

## Day 1-2: Database Setup (Monday-Tuesday, Nov 18-19)

### Step 1: Run Database Migration (30 minutes)

1. **Open Supabase Dashboard**:
   - Go to https://supabase.com/dashboard
   - Select your project: `qnymbecjgeaoxsfphrti`

2. **Navigate to SQL Editor**:
   - Left sidebar → SQL Editor
   - Click "New Query"

3. **Copy & Paste Migration**:
   - Open: `supabase/migrations/20251117_edubiz_tables.sql`
   - Select ALL content (Ctrl+A)
   - Paste into Supabase SQL Editor

4. **Run Migration**:
   - Click "Run" button (or Ctrl+Enter)
   - Wait for "Success" message (should take 5-10 seconds)
   - Check for errors (if any, report back for debugging)

5. **Verify Tables Created**:
   ```sql
   -- Run these verification queries one by one:

   select count(*) from public.edubiz_users; -- Should return 0
   select count(*) from public.certificate_tracks; -- Should return 3
   select count(*) from public.badges; -- Should return 5
   select * from public.badges order by order_index; -- See all 5 badges
   ```

6. **Test Helper Functions**:
   ```sql
   -- Test tier check function
   select public.can_access_feature(
     '00000000-0000-0000-0000-000000000000'::uuid,
     'edubiz'
   ); -- Should return false (free tier can't access edubiz)
   ```

### Step 2: Enable Supabase Auth (30 minutes)

1. **Navigate to Authentication**:
   - Supabase Dashboard → Authentication → Settings

2. **Enable Email Auth**:
   - Scroll to "Email Auth"
   - Toggle ON "Enable Email Signups"
   - Toggle ON "Enable Email Confirmations" (important for production)
   - Click "Save"

3. **Configure Email Templates** (Optional for now, do in Week 3):
   - Authentication → Email Templates
   - Customize "Confirm Signup" email (add your branding)
   - Customize "Magic Link" email

4. **Get Auth Configuration**:
   - Settings → API
   - Copy these values (you'll need them):
     - `Project URL`: https://qnymbecjgeaoxsfphrti.supabase.co
     - `anon public key`: (already in your .env as VITE_SUPABASE_ANON_KEY)

5. **Test Auth in Supabase Dashboard**:
   - Authentication → Users
   - Click "Add User"
   - Create test user: test@example.com
   - Verify user appears in list

### Step 3: Update Environment Variables (5 minutes)

Check your `.env` file has these (should already exist):

```env
VITE_SUPABASE_URL=https://qnymbecjgeaoxsfphrti.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

---

## Day 3-4: Authentication UI (Wednesday-Thursday, Nov 20-21)

### Step 4: Create Auth Components (6 hours)

I'll create these files for you:

1. **`src/components/auth/AuthModal.tsx`** - Login/signup modal
2. **`src/components/auth/AuthProvider.tsx`** - React context for auth state
3. **`src/components/auth/ProtectedRoute.tsx`** - Route wrapper for tier checking
4. **`src/lib/authService.ts`** - Auth utilities (signup, login, logout)

Let me create these now...

---

## Day 5-7: Gamification System (Friday-Sunday, Nov 22-24)

### Step 5: Create Badge Components (8 hours)

Files to create:

1. **`src/components/gamification/BadgeCard.tsx`** - Individual badge display
2. **`src/components/gamification/BadgeGrid.tsx`** - Grid of all badges
3. **`src/components/gamification/BadgeEarnedModal.tsx`** - Celebration animation
4. **`src/components/gamification/ProgressTracker.tsx`** - Progress toward next badge
5. **`src/lib/gamificationService.ts`** - Badge checking logic

### Step 6: Integrate Badges into Profile (2 hours)

- Add "Badges" tab to user profile
- Show earned badges + locked badges with progress
- Wire up badge earning triggers (e.g., after tour completion)

---

## Day-by-Day Checklist

### ✅ **Monday Nov 18** (3 hours)
- [ ] Run database migration in Supabase
- [ ] Verify 8 tables created
- [ ] Verify 3 certificate tracks seeded
- [ ] Verify 5 badges seeded
- [ ] Test helper functions (SQL queries)

### ✅ **Tuesday Nov 19** (4 hours)
- [ ] Enable Supabase Auth
- [ ] Create test user in dashboard
- [ ] Update .env if needed
- [ ] Read Supabase Auth docs (https://supabase.com/docs/guides/auth)
- [ ] Plan auth UI components

### ✅ **Wednesday Nov 20** (6 hours)
- [ ] Create AuthModal component (login/signup)
- [ ] Create AuthProvider context
- [ ] Create authService utilities
- [ ] Test signup flow (create user via UI)
- [ ] Test login flow
- [ ] Test logout flow

### ✅ **Thursday Nov 21** (6 hours)
- [ ] Create ProtectedRoute component (tier checking)
- [ ] Add "Upgrade to Edubiz" modal (placeholder, no Stripe yet)
- [ ] Wire auth into existing app (App.tsx, navigation)
- [ ] Test: free user sees upgrade prompts
- [ ] Fix any bugs

### ✅ **Friday Nov 22** (6 hours)
- [ ] Create BadgeCard component
- [ ] Create BadgeGrid component
- [ ] Create BadgeEarnedModal (celebration animation)
- [ ] Test badge display (use seed data from database)
- [ ] Polish animations (confetti, zoom effects)

### ✅ **Saturday Nov 23** (6 hours)
- [ ] Create ProgressTracker component
- [ ] Create gamificationService (badge checking logic)
- [ ] Wire up badge earning (e.g., tour completion → "Energy Explorer")
- [ ] Test badge earning flow end-to-end
- [ ] Fix bugs

### ✅ **Sunday Nov 24** (4 hours + demo time)
- [ ] Final integration testing
- [ ] Test signup → tour → badge → profile flow
- [ ] Polish UI (spacing, colors, responsiveness)
- [ ] **DEMO TO RELATIVES** (1 hour)
  - Show signup flow
  - Show tour + badge earning
  - Get feedback on UI/UX
- [ ] Fix critical feedback items
- [ ] Celebrate Week 1 completion! 🎉

---

## Success Criteria (Week 1 Milestone)

By Sunday Nov 24, you should have:

✅ **Database**:
- 8 tables created and verified
- 3 certificate tracks seeded
- 5 badges seeded
- RLS policies working

✅ **Authentication**:
- Signup flow functional (email + password)
- Login flow functional
- Logout flow functional
- User profile page shows current tier (free/edubiz/pro)
- Test user created: you can log in

✅ **Gamification**:
- Badges display on profile page (5 badges visible)
- At least 1 badge can be earned (e.g., "Energy Explorer" after tour)
- Badge earned modal shows celebration animation
- Progress tracker shows "3/5 modules complete" style progress

✅ **Integration**:
- Existing app still works (no regressions)
- New auth modal accessible from header (e.g., "Sign In" button)
- Code committed to git with descriptive messages

---

## Budget Spent Week 1: $0

You'll use only free tiers:
- Supabase Free (50,000 MAU limit - plenty for testing)
- Netlify Free (hosting)
- Local development tools (VS Code, Chrome DevTools)

---

## Troubleshooting

### Issue: Migration fails with "relation already exists"
**Solution**: Some tables might exist from previous tests. Drop them first:
```sql
drop table if exists public.webinar_registrations cascade;
drop table if exists public.webinars cascade;
drop table if exists public.user_badges cascade;
drop table if exists public.badges cascade;
drop table if exists public.user_progress cascade;
drop table if exists public.certificate_modules cascade;
drop table if exists public.certificate_tracks cascade;
drop table if exists public.edubiz_users cascade;
```
Then re-run the migration.

### Issue: "auth.users" not found
**Solution**: Supabase Auth schema not enabled. Go to Dashboard → Authentication → Enable Email Auth.

### Issue: RLS blocking my queries
**Solution**: RLS policies require authenticated users. Either:
1. Use Service Role key (not anon key) for testing in SQL Editor
2. Create test user and authenticate in your app

### Issue: Can't see users in edubiz_users table after signup
**Solution**: You need to insert into edubiz_users after signup. We'll create a database trigger for this (see next section).

---

## Additional Setup: Auto-Create edubiz_users on Signup

Run this additional SQL to automatically create edubiz_users record when someone signs up:

```sql
-- Function: Auto-create edubiz_users record on auth.users insert
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.edubiz_users (user_id, email, full_name, tier)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    'free'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger: Call handle_new_user after auth.users insert
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
```

This ensures every new signup automatically gets a `free` tier record in `edubiz_users`.

---

## Next: I'll Create the Auth Components

Ready for me to create the authentication UI components? Say "yes" and I'll generate:

1. AuthModal.tsx (login/signup)
2. AuthProvider.tsx (React context)
3. authService.ts (utilities)
4. ProtectedRoute.tsx (tier checking)

Then we'll move on to the badge components!
