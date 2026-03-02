# Whop vs Standalone Capability Matrix

**Document Version:** 1.0  
**Created:** 2026-02-28  
**Part of:** PBI-OpenClaw-Monetization-Orchestration-T1

## Overview

This document defines the capability differences between Whop marketplace integration and standalone deployment modes. It ensures consistent feature availability expectations across both distribution channels.

---

## Distribution Modes

### Whop Marketplace Mode
- **Entry Point:** `https://whop.com/ignite-be15/`
- **Auth:** Whop OAuth + JWT tokens
- **Billing:** Whop handles all payments
- **Routes:** `/whop/*` and `/whop-mini/*`
- **Embedding:** iFrame-optimized, zero external API calls on initial load (Whop Mini)

### Standalone Mode
- **Entry Point:** `https://canadaenergyintelligence.com`
- **Auth:** Whop OAuth (optional) + Guest mode
- **Billing:** Paddle (primary) + Stripe (fallback)
- **Routes:** All non-Whop routes
- **Deployment:** Netlify edge functions + Supabase backend

---

## Capability Matrix

| Feature | Whop Mode | Standalone Mode | Notes |
|---------|-----------|-----------------|-------|
| **Authentication** | ✅ Whop OAuth (required) | ✅ Whop OAuth + Guest | Standalone allows guest access |
| **Tier Model** | ✅ `free/basic/pro/team` | ✅ `free/basic/pro/team` | Canonical tiers enforced in both |
| **Auth UI Visibility** | ❌ Hidden | ✅ Visible | Route-based policy |
| **Billing Provider** | ✅ Whop only | ✅ Paddle + Stripe | Whop users can upgrade via Whop |
| **Email Capture** | ⚠️ Limited | ✅ Full dual capture | Whop provides email; standalone captures pre-checkout |
| **Entitlement Cache** | ✅ Webhook-synced | ✅ Webhook-synced | Both use `public.entitlements` table |
| **Server-Verified Access** | ✅ Required | ⚠️ Optional | Whop mode enforces server checks |
| **Analytics Tracking** | ✅ Full funnel | ✅ Full funnel | Both use `src/lib/analytics.ts` |
| **Lead Lifecycle** | ⚠️ Limited | ✅ Full | Standalone tracks full lifecycle |
| **Pricing Page** | ❌ Not accessible | ✅ Accessible | Whop users upgrade in Whop dashboard |
| **Dashboard Access** | ✅ All dashboards | ✅ All dashboards | Feature gating by tier, not mode |
| **API Access** | ✅ Same as standalone | ✅ Full API | Tier-based, not mode-based |
| **Data Export** | ✅ Same as standalone | ✅ CSV/PDF export | Tier-based, not mode-based |
| **Whop Mini App** | ✅ Optimized | ❌ N/A | Zero external API calls on load |
| **Offline Mode** | ❌ Not supported | ⚠️ PWA (future) | Standalone can add service worker |
| **Custom Domain** | ❌ Whop subdomain | ✅ Custom domain | Standalone uses Netlify DNS |

---

## Feature Gating by Tier (Both Modes)

| Feature | Free | Basic | Pro | Team |
|---------|------|-------|-----|------|
| Rate Watchdog | ✅ | ✅ | ✅ | ✅ |
| Provincial Generation | ✅ | ✅ | ✅ | ✅ |
| TIER Calculator | ❌ | ✅ | ✅ | ✅ |
| Funder Reporting | ❌ | ❌ | ✅ | ✅ |
| API Access | ❌ | ❌ | ✅ | ✅ |
| Team Collaboration | ❌ | ❌ | ❌ | ✅ |
| White-label Export | ❌ | ❌ | ❌ | ✅ |

---

## Technical Implementation

### Whop Mode Detection
```typescript
// Route-based detection
const isWhopRoute = location.pathname.startsWith('/whop/') || 
                    location.pathname.startsWith('/whop-mini/');

// Auth provider detection
const { isWhopUser } = useAuth();
```

### Entitlement Resolution
```typescript
// Both modes use canonical tier model
import { normalizeTier, hasTierAccess } from '@/lib/entitlements';

const userTier = normalizeTier(tier); // 'free' | 'basic' | 'pro' | 'team'
const hasAccess = hasTierAccess(userTier, 'pro');
```

### Billing Adapter Selection
```typescript
// Whop mode: Whop billing only
const billingProvider = isWhopUser ? 'whop' : 'paddle';
const adapter = createBillingAdapter(billingProvider);
```

---

## Migration Path

### Whop → Standalone
1. User creates account on standalone site
2. Email match links Whop entitlement to standalone account
3. Entitlement cache synced via webhook
4. User can access both modes with same tier

### Standalone → Whop
1. User purchases via Whop marketplace
2. Whop webhook creates/updates entitlement
3. User can access Whop embedded experience
4. Standalone account linked via email

---

## Limitations

### Whop Mode
- Cannot access standalone pricing page (must upgrade via Whop)
- Auth UI hidden (Whop handles auth)
- Limited lead lifecycle tracking (Whop owns user data)

### Standalone Mode
- Cannot access Whop Mini optimized experience
- Requires separate billing integration (Paddle/Stripe)
- Must implement own auth UI

---

## Future Enhancements

### Planned (Q2 2026)
- [ ] Unified account linking UI
- [ ] Cross-mode entitlement sync dashboard
- [ ] Whop Mini PWA offline mode

### Under Consideration
- [ ] Whop marketplace API access tier
- [ ] Standalone → Whop migration wizard
- [ ] Hybrid mode (Whop auth + Paddle billing)

---

## References

- **Entitlement Model:** `src/lib/entitlements.ts`
- **Billing Adapter:** `src/lib/billingAdapter.ts`
- **Auth Provider:** `src/components/auth/AuthProvider.tsx`
- **Whop Integration:** `src/lib/whop.ts`
- **Webhook Handler:** `supabase/functions/whop-webhook/index.ts`
