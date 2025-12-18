# Portability Manifest - CEIP Integration Documentation

> **Purpose:** Document all external integration points to enable future provider migration without full codebase audit.

---

## 1. Billing Providers

### Current: Whop
| Integration Point | File | Purpose |
| :--- | :--- | :--- |
| Checkout Links | `src/lib/billingAdapter.ts` | Redirect to whop.com checkout |
| Tier Mapping | `src/lib/whop.ts` → `WHOP_ACCESS_MATRIX` | 4 tiers: free/basic/pro/team |
| Webhook Handler | `supabase/functions/whop-webhook/index.ts` | Membership & payment events |

### Parallel: Stripe (Ready for Migration)
| Integration Point | File | Purpose |
| :--- | :--- | :--- |
| StripeBillingAdapter | `src/lib/billingAdapter.ts` | Checkout sessions |
| Stripe Webhook | `supabase/functions/stripe-webhook/index.ts` | Payment events |

### Migration Procedure
1. Set `localStorage.billing_provider = 'stripe'` for new users
2. Update upgrade CTAs to use `StripeBillingAdapter`
3. Let existing Whop subscriptions churn naturally
4. Offer "Legacy Migration Discount" to Whop users

---

## 2. Authentication

### Current: Whop OAuth + Guest Mode
| Integration Point | File | Purpose |
| :--- | :--- | :--- |
| Whop OAuth | `src/lib/whop.ts` → `getWhopLoginUrl()` | Login redirect |
| Token Verification | `src/lib/whop.ts` → `verifyWhopToken()` | JWT validation |
| Guest Mode | `src/lib/whop.ts` → `loginAsGuest()` | Non-Whop fallback |

### Abstraction Layer
| File | Interface |
| :--- | :--- |
| `src/lib/entitlements.ts` | Provider-agnostic access checks |
| `src/lib/billingAdapter.ts` | `IBillingAdapter` interface |

### Migration Procedure
1. Add additional OAuth providers (Google, email/password)
2. Link new providers to `IdentityProviders` table
3. Update `entitlements.ts` to check local DB first

---

## 3. Data Storage

### Owned Data (Portable)
| Data Type | Location | Export Method |
| :--- | :--- | :--- |
| Captured Emails | localStorage `ceip_captured_emails` | `exportEmailsAsCsv()` |
| Entitlements Cache | localStorage `ceip_entitlement` | JSON export |
| Quiz Progress | localStorage `quiz_*` keys | JSON export |
| User Preferences | localStorage `theme`, etc. | JSON export |

### Supabase Tables (If Configured)
| Table | Purpose | Portable |
| :--- | :--- | :--- |
| `entitlements` | Subscription status | ✅ Yes |
| `webhook_events` | Idempotency log | ✅ Yes |
| `payments` | Transaction history | ✅ Yes |
| `profiles` | User metadata | ✅ Yes |

### Whop-Owned Data (Not Portable)
| Data Type | Access |
| :--- | :--- |
| Payment tokens (credit cards) | ❌ Cannot export |
| Transaction history | Partial (API read-only) |
| Customer emails | ❌ Whop owns |

---

## 4. API Endpoints

### Internal Endpoints (Supabase Edge Functions)
| Endpoint | File | Purpose |
| :--- | :--- | :--- |
| `POST /functions/v1/whop-webhook` | `supabase/functions/whop-webhook/` | Whop events |
| `POST /functions/v1/stripe-webhook` | `supabase/functions/stripe-webhook/` | Stripe events |
| `POST /api/leads/capture` | (Future) | Email storage |
| `POST /api/billing/stripe/checkout` | (Future) | Stripe sessions |

### External APIs Used
| Provider | Endpoint | Purpose | Rate Limit |
| :--- | :--- | :--- | :--- |
| AESO | `api.aeso.ca` | Alberta electricity data | 1000/day |
| Whop | `api.whop.com/v5/` | User verification | Unknown |
| Stripe | `api.stripe.com` | Payment processing | 100/sec |

---

## 5. Environment Variables

### Required for Production
```bash
# Whop
VITE_WHOP_CLIENT_ID=         # OAuth client ID
VITE_WHOP_API_KEY=           # Server-side API key
WHOP_WEBHOOK_SECRET=         # Webhook signature verification

# Stripe (Parallel)
VITE_STRIPE_PUBLISHABLE_KEY= # Client-side key
STRIPE_SECRET_KEY=           # Server-side key
STRIPE_WEBHOOK_SECRET=       # Webhook signature

# Supabase
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## 6. Feature Flags

### Billing Provider Toggle
```typescript
// Switch provider for A/B testing or migration
localStorage.setItem('billing_provider', 'stripe' | 'whop');
```

### Trial Access
```
?trial=true  → Grants 7-day pro access
```

---

## 7. Migration Checklist

### Phase 1: Parallel Infrastructure
- [x] Create `billingAdapter.ts` abstraction
- [x] Implement `StripeBillingAdapter`
- [x] Create Whop webhook handler
- [x] Create entitlement cache
- [ ] Deploy Stripe webhook handler
- [ ] Create Shadow User schema

### Phase 2: New Door
- [ ] Add Stripe as checkout option
- [ ] Track conversion by provider
- [ ] Monitor churn rates

### Phase 3: Incentive Campaign
- [ ] Identify Whop-only users
- [ ] Email "Legacy Migration Discount"
- [ ] Track migration rate

### Phase 4: Sunset
- [ ] Stop new Whop signups
- [ ] Set sunset date for Whop users
- [ ] Final migration push

---

## 8. Contacts

| System | Support |
| :--- | :--- |
| Whop | support@whop.com |
| Stripe | dashboard.stripe.com/support |
| Supabase | supabase.com/dashboard/support |

---

*Last Updated: December 2024*
*Version: 1.0.0*
