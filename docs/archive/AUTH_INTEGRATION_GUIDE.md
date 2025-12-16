# Auth Components Integration Guide
## How to Add Authentication to Your App

**Status**: Components created ✅
**Next Step**: Integrate into existing app
**Time Required**: 30-45 minutes

---

## Files Created

All auth components are in `src/components/auth/`:

1. ✅ **AuthProvider.tsx** - Global auth state (React context)
2. ✅ **AuthModal.tsx** - Login/signup modal UI
3. ✅ **AuthButton.tsx** - Header button (Sign In / User Menu)
4. ✅ **ProtectedRoute.tsx** - Route wrapper for tier checking
5. ✅ **UpgradeModal.tsx** - Tier upgrade UI (Stripe placeholder)
6. ✅ **index.ts** - Centralized exports

---

## Step 1: Wrap App with AuthProvider (5 minutes)

### Edit `src/App.tsx`:

```tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { EnergyDataDashboard } from './components/EnergyDataDashboard';
import { AboutPage } from './components/AboutPage';
import { ContactPage } from './components/ContactPage';
import { HelpProvider } from './components/HelpProvider';
import { AuthProvider } from './components/auth'; // ← ADD THIS
import './App.css';
import './styles/layout.css';

function App() {
  return (
    <div className="App">
      <AuthProvider> {/* ← WRAP WITH AuthProvider */}
        <HelpProvider>
          <Router>
            <Routes>
              <Route path="/" element={<EnergyDataDashboard />} />
              <Route path="/dashboard" element={<EnergyDataDashboard />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
            </Routes>
          </Router>
        </HelpProvider>
      </AuthProvider> {/* ← CLOSE AuthProvider */}
    </div>
  );
}

export default App;
```

**What this does**: Makes auth state available throughout your entire app.

---

## Step 2: Add AuthButton to Header/Navigation (15 minutes)

You need to find where your app header/navigation is. Common locations:
- `src/components/EnergyDataDashboard.tsx` (main dashboard)
- `src/components/Header.tsx` (if you have a separate header component)
- `src/components/Sidebar.tsx` (if navigation is in sidebar)

### Example: Adding to EnergyDataDashboard.tsx

Find your navigation/header section and add AuthButton:

```tsx
import { AuthButton } from './auth'; // ← ADD THIS IMPORT

// Inside your component, in the header/navigation area:
<header className="flex items-center justify-between p-4 bg-slate-900 border-b border-slate-700">
  <h1 className="text-2xl font-bold text-white">Canada Energy Dashboard</h1>

  {/* Navigation links */}
  <nav className="flex items-center gap-6">
    <a href="/" className="text-slate-300 hover:text-white">Home</a>
    <a href="/about" className="text-slate-300 hover:text-white">About</a>
    <a href="/contact" className="text-slate-300 hover:text-white">Contact</a>

    {/* ← ADD AuthButton HERE */}
    <AuthButton />
  </nav>
</header>
```

**What this does**: Shows "Sign In" button when logged out, user menu when logged in.

---

## Step 3: Create a Profile Page (Optional, 10 minutes)

Create `src/components/ProfilePage.tsx`:

```tsx
import React from 'react';
import { useAuth } from './auth';
import { ProtectedRoute } from './auth';

function ProfilePageContent() {
  const { user, edubizUser } = useAuth();

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-white mb-6">My Profile</h1>

      <div className="bg-slate-800 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-white mb-4">Account Information</h2>
        <dl className="space-y-3">
          <div>
            <dt className="text-sm text-slate-400">Email</dt>
            <dd className="text-white">{user?.email}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-400">Full Name</dt>
            <dd className="text-white">{edubizUser?.full_name || 'Not set'}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-400">Province</dt>
            <dd className="text-white">{edubizUser?.province_code || 'Not set'}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-400">Current Tier</dt>
            <dd className="text-white capitalize">{edubizUser?.tier || 'free'}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-400">AI Queries Today</dt>
            <dd className="text-white">{edubizUser?.ai_queries_today || 0} / {edubizUser?.tier === 'free' ? 10 : '∞'}</dd>
          </div>
        </dl>
      </div>

      {/* Badges section (we'll add this in Step 4) */}
      <div className="bg-slate-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">My Badges</h2>
        <p className="text-slate-400">Badge display coming in Week 1 (Fri-Sun)</p>
      </div>
    </div>
  );
}

export function ProfilePage() {
  return (
    <ProtectedRoute requiredTier="free">
      <ProfilePageContent />
    </ProtectedRoute>
  );
}
```

### Add route in `App.tsx`:

```tsx
import { ProfilePage } from './components/ProfilePage'; // ← ADD IMPORT

// In your <Routes>:
<Route path="/profile" element={<ProfilePage />} />
```

**What this does**: Creates a protected profile page that shows user info and tier.

---

## Step 4: Test the Authentication Flow (10 minutes)

### 4.1 Test Signup

1. Start dev server: `npm run dev`
2. Open browser: `http://localhost:5173`
3. Click "Sign In" button (should open AuthModal)
4. Click "Sign Up" tab
5. Fill form:
   - Email: `yourname@test.com`
   - Password: `TestPassword123!`
   - Full Name: Your Name
   - Role: Student
   - Province: Alberta
6. Click "Create Account"
7. Check for success message (check email confirmation alert)

### 4.2 Test Login

1. Click "Sign In" tab
2. Enter credentials:
   - Email: `test@example.com` (or the one you created)
   - Password: `TestPassword123!`
3. Click "Sign In"
4. You should see:
   - AuthModal closes
   - AuthButton shows user menu with your name
   - Tier badge shows "free"

### 4.3 Test User Menu

1. Click AuthButton (shows user dropdown)
2. Click "My Profile"
3. Should see your profile page with:
   - Email
   - Tier (free)
   - AI queries (0/10)

### 4.4 Test Sign Out

1. Click AuthButton → "Sign Out"
2. Should return to "Sign In" button state

---

## Step 5: Add Manual Tier Testing (Optional, 5 minutes)

For testing purposes, you can manually upgrade your tier in Supabase:

1. Go to Supabase Dashboard → SQL Editor
2. Run this query:
   ```sql
   -- Find your user
   select * from public.edubiz_users where email = 'yourname@test.com';

   -- Upgrade to edubiz tier
   update public.edubiz_users
   set tier = 'edubiz'
   where email = 'yourname@test.com';
   ```

3. Refresh your app
4. You should see tier badge change to "edubiz"

To test Pro tier:
```sql
update public.edubiz_users
set tier = 'pro'
where email = 'yourname@test.com';
```

---

## Common Integration Patterns

### Pattern 1: Tier-Gated Feature

Show upgrade prompt for free users:

```tsx
import { useUserTier } from './components/auth';

function CertificateButton() {
  const tier = useUserTier();

  if (tier === 'free') {
    return (
      <div className="text-center p-4 bg-slate-800 rounded-lg border border-slate-700">
        <p className="text-slate-300 mb-2">🔒 Certificate tracks require Edubiz tier</p>
        <a href="/pricing" className="text-cyan-400 hover:text-cyan-300">
          Upgrade to unlock →
        </a>
      </div>
    );
  }

  return (
    <a href="/certificates" className="btn-primary">
      View My Certificates
    </a>
  );
}
```

### Pattern 2: Protected Route

Wrap any component that requires auth:

```tsx
import { ProtectedRoute } from './components/auth';

// In App.tsx routes:
<Route
  path="/certificates"
  element={
    <ProtectedRoute requiredTier="edubiz">
      <CertificatesPage />
    </ProtectedRoute>
  }
/>
```

### Pattern 3: AI Query Limit Check

Before calling AI:

```tsx
import { useAuth } from './components/auth';
import { incrementAIQueries } from '../lib/authService';

async function handleAIQuery() {
  const { user } = useAuth();

  if (user) {
    try {
      const { limit_reached, queries_today } = await incrementAIQueries(user.id);

      if (limit_reached) {
        // Show upgrade modal
        alert('You\'ve reached your daily AI query limit (10). Upgrade to Edubiz for unlimited queries!');
        return;
      }

      console.log(`Queries used today: ${queries_today}`);
      // Proceed with AI query...
    } catch (error) {
      console.error('Error checking AI quota:', error);
    }
  }
}
```

---

## Troubleshooting

### Issue: "useAuth must be used within an AuthProvider"

**Cause**: Component using `useAuth()` is not wrapped by `<AuthProvider>`

**Fix**: Ensure `<AuthProvider>` is at the top level in `App.tsx` (see Step 1)

---

### Issue: User signs up but not appearing in edubiz_users table

**Cause**: Auto-create trigger not set up

**Fix**: Run the trigger SQL from `WEEK1_START_HERE.md` Step 3:

```sql
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.edubiz_users (user_id, email, full_name, tier)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'free'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
```

---

### Issue: AuthModal doesn't close after successful login

**Cause**: Missing `onSuccess` callback or not closing modal in `onSuccess`

**Fix**: Ensure AuthModal has `onSuccess` prop:

```tsx
<AuthModal
  isOpen={showAuthModal}
  onClose={() => setShowAuthModal(false)}
  onSuccess={() => setShowAuthModal(false)} // ← THIS IS IMPORTANT
/>
```

---

### Issue: Tier not updating after manual database change

**Cause**: React state not refreshed

**Fix**: Call `refreshUser()` from auth context:

```tsx
const { refreshUser } = useAuth();

// After updating tier in database:
await refreshUser();
```

Or just refresh the page.

---

## Next Steps

After integrating auth:

1. **Test thoroughly** (signup, login, logout, profile)
2. **Add auth to existing features** (protect routes, show tier gates)
3. **Move on to Week 1 Fri-Sun**: Badge components
4. **Week 2**: Certificate tracks, Stripe integration

---

## Quick Reference: All Auth Hooks

```tsx
import { useAuth, useHasTier, useUserTier } from './components/auth';

// In your component:
const { user, session, edubizUser, loading, signOut, refreshUser } = useAuth();
const hasPro = useHasTier('pro'); // boolean
const tier = useUserTier(); // 'free' | 'edubiz' | 'pro' | null
```

---

**Auth Integration Complete!** ✅

You now have:
- Global auth state (AuthProvider)
- Login/signup UI (AuthModal)
- User menu (AuthButton)
- Tier-based access control (ProtectedRoute)
- Upgrade prompts (UpgradeModal)

**Time to test it!** Follow Step 4 above to verify everything works.
