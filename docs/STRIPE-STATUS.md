# Stripe Integration - Status Report

**Date**: 2026-01-26
**Status**: ✅ **COMPLETE** - Ready for deployment

---

## Overview

Complete Stripe integration for Luniqo with two payment flows:
1. **Module Subscriptions** - Recurring monthly payments for nursery modules
2. **Invoice Payments** - One-time payments for family invoices (optional Phase 2)

Architecture: **Stripe Checkout** (hosted pages) for PCI-DSA compliance (SAQ A minimal)

---

## ✅ Completed Implementation

### 1. Database Schema

**File**: `supabase/migrations/65_stripe_integration.sql`

**Tables created**:
- ✅ `stripe_customer` - Enterprise → Stripe Customer mapping (1:1)
- ✅ `stripe_subscription` - Active subscriptions with status tracking
- ✅ `stripe_subscription_item` - Subscription items (1 per module per nursery)
- ✅ `stripe_checkout_session` - Checkout sessions (open/complete/expired)
- ✅ `stripe_webhook_event` - Webhook events for idempotency

**Table modifications**:
- ✅ `module` - Added `stripe_price_id`, `stripe_price_id_annual`
- ✅ `payment` - Added `stripe_payment_intent_id`
- ✅ `payment_method` - Added `stripe_customer_id`, `stripe_payment_method_id`

**Status**: Ready to run in Supabase SQL Editor

---

### 2. Backend Services

#### Stripe Client (`lib/stripe/index.ts`)
- ✅ Singleton pattern with lazy initialization
- ✅ Proxy for convenient access
- ✅ API version: `2025-12-15.clover`

#### Stripe Service (`lib/services/stripe.service.ts`)
- ✅ `getOrCreateCustomer()` - Auto-create Stripe customers
- ✅ `createSubscriptionCheckout()` - Module subscription checkout
- ✅ `createInvoicePaymentCheckout()` - Invoice payment checkout
- ✅ `createPortalSession()` - Customer portal for self-service
- ✅ `getEnterpriseSubscriptions()` - List active subscriptions
- ✅ `cancelSubscription()` - Cancel at period end
- ✅ `reactivateSubscription()` - Undo cancellation
- ✅ `getModulesWithPrices()` - Fetch modules for billing page

#### Webhook Service (`lib/services/stripe-webhook.service.ts`)
- ✅ `handleStripeEvent()` - Main event router with idempotency
- ✅ `handleCheckoutCompleted()` - Update checkout status
- ✅ `handleSubscriptionCreated()` - Grant module access
- ✅ `handleSubscriptionUpdated()` - Update subscription status
- ✅ `handleSubscriptionDeleted()` - Revoke module access
- ✅ `handleInvoicePaymentSucceeded()` - Log successful payments
- ✅ `handlePaymentIntentSucceeded()` - Update payment records
- ✅ `handlePaymentIntentFailed()` - Log failed payments

**Key feature**: Automatic `nursery_module_access` management on subscription changes

#### Server Actions (`lib/actions/stripe.actions.ts`)
- ✅ `syncStripePrices()` - Sync Stripe → module table
- ✅ `createStripeProducts()` - Auto-create products for all paid modules
- ✅ `processStripeRefund()` - Issue refunds

---

### 3. API Routes

#### Checkout (`app/api/stripe/checkout/route.ts`)
- ✅ POST endpoint for creating checkout sessions
- ✅ Supports both `subscription` and `payment` modes
- ✅ Authentication check via `supabase.auth.getUser()`
- ✅ Returns checkout URL and session ID

#### Webhooks (`app/api/stripe/webhooks/route.ts`)
- ✅ POST endpoint for receiving Stripe events
- ✅ Raw body parsing for signature verification
- ✅ `stripe.webhooks.constructEvent()` validation
- ✅ Graceful error handling (returns 200 to prevent retries)

#### Portal (`app/api/stripe/portal/route.ts`)
- ✅ POST endpoint for customer portal access
- ✅ Returns portal URL for self-service management

---

### 4. UI Pages

#### Billing Page (`app/(owner)/owner/billing/page.tsx`)
- ✅ Display active subscriptions with module details
- ✅ MRR calculation (Monthly Recurring Revenue)
- ✅ Module catalog grid with pricing
- ✅ Multi-select module subscription
- ✅ "Souscrire" button → Stripe Checkout redirect
- ✅ "Gérer mes paiements" → Stripe Customer Portal
- ✅ Billing history table
- ✅ Empty state for no subscriptions

#### Success Page (`app/(owner)/owner/billing/success/page.tsx`)
- ✅ Animated success confirmation
- ✅ Session ID display
- ✅ Navigation to billing page or dashboard
- ✅ Confetti animation (3 seconds)

---

### 5. Navigation

#### Sidebar (`components/layout/AppSidebar.tsx`)
- ✅ Added "Abonnements" link with `CreditCardIcon`
- ✅ Peach color (`#f0b775`) for billing module
- ✅ `moduleId: 'base'` (free module)

---

### 6. Type Definitions

#### Database Types (`types/database.types.ts`)
- ✅ `StripeCustomer` interface
- ✅ `StripeSubscription` interface
- ✅ `StripeSubscriptionItem` interface
- ✅ `StripeCheckoutSession` interface
- ✅ `StripeWebhookEvent` interface
- ✅ Enums: `StripeSubscriptionStatus`, `StripeCheckoutStatus`

---

### 7. Packages

**Installed**:
- ✅ `stripe@^20.2.0` - Backend SDK
- ✅ `@stripe/stripe-js@^8.6.4` - Frontend SDK (optional, for embedded elements)

---

## 🔧 Deployment Checklist

### Step 1: Environment Variables

Add to `.env.local` (and production env):

```bash
# Stripe Keys
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx

# App URL (for Stripe redirects)
NEXT_PUBLIC_APP_URL=https://luniqo.com  # or http://localhost:3000 for dev
```

**Where to get keys**:
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Developers → API Keys
3. Copy Secret Key and Publishable Key
4. Webhook secret will be generated in Step 4

---

### Step 2: Run Database Migration

**Option A - Supabase Dashboard**:
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to SQL Editor
4. Copy entire contents of `supabase/migrations/65_stripe_integration.sql`
5. Paste and run (should execute in ~2 seconds)

**Option B - Supabase CLI** (if configured):
```bash
supabase db push
```

**Verify**:
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_name LIKE 'stripe_%';
```
Should return 5 tables: `stripe_customer`, `stripe_subscription`, `stripe_subscription_item`, `stripe_checkout_session`, `stripe_webhook_event`

---

### Step 3: Create Stripe Products

**Option A - Using Server Action** (Recommended):

1. Add temporary developer button to billing page:
```typescript
// Add this to app/(owner)/owner/billing/page.tsx temporarily
import { createStripeProducts } from '@/lib/actions/stripe.actions'

// Add button in UI:
<Button onClick={async () => {
  const result = await createStripeProducts()
  console.log(result)
}}>
  Create Stripe Products
</Button>
```

2. Click button → Will create products for all paid modules
3. Check Stripe Dashboard → Products should appear
4. Remove button after creation

**Option B - Manual Creation in Stripe Dashboard**:

Go to Products → Add Product for each paid module:

| Module | Monthly Price | Annual Price | Metadata |
|--------|--------------|--------------|----------|
| Nettoyage | 29 EUR | 278.40 EUR | `module_id: cleaning` |
| HACCP Traçabilité | 39 EUR | 374.40 EUR | `module_id: haccp` |
| Enfants & Familles | 29 EUR | 278.40 EUR | `module_id: children` |
| Présences & Activités | 39 EUR | 374.40 EUR | `module_id: attendance` |
| Personnel & Planning | 49 EUR | 470.40 EUR | `module_id: staff` |
| Inscriptions & Contrats | 39 EUR | 374.40 EUR | `module_id: enrollment` |
| Facturation & Finances | 59 EUR | 566.40 EUR | `module_id: billing` |
| Analytics | 49 EUR | 470.40 EUR | `module_id: analytics` |

**Important**: Add `module_id` in metadata for each product!

**Then sync prices**:
```typescript
import { syncStripePrices } from '@/lib/actions/stripe.actions'
const result = await syncStripePrices()
console.log(result) // { synced: 8, errors: [] }
```

---

### Step 4: Configure Webhook Endpoint

**Production**:
1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. URL: `https://luniqo.com/api/stripe/webhooks`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Copy webhook signing secret → Add to env as `STRIPE_WEBHOOK_SECRET`

**Development** (using Stripe CLI):
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local
stripe listen --forward-to localhost:3000/api/stripe/webhooks

# Copy webhook secret from output → Add to .env.local
```

---

### Step 5: Enable Customer Portal

1. Go to Stripe Dashboard → Settings → Billing → Customer portal
2. Enable portal
3. Configure allowed operations:
   - ✅ Update payment method
   - ✅ View invoices
   - ✅ Cancel subscriptions (at period end)
   - ✅ Resume subscriptions
4. Set branding (optional):
   - Upload Luniqo logo
   - Primary color: `#5a9dc9`

---

### Step 6: Test Payment Flow

**Test card numbers** (Stripe test mode):
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- 3D Secure: `4000 0027 6000 3184`

**Test flow**:
1. Login as Owner → Go to `/owner/billing`
2. Select modules (e.g., "Nettoyage" + "HACCP")
3. Click "Souscrire"
4. Enter test card: `4242 4242 4242 4242`
5. Fill form: any future expiry, any CVC, any postal code
6. Click "Pay"
7. Should redirect to `/owner/billing/success`
8. Check sidebar → Modules should appear
9. Check Supabase:
   ```sql
   SELECT * FROM nursery_module_access WHERE is_active = true;
   ```
10. Check Stripe Dashboard → Subscriptions → Should see new subscription

**Test customer portal**:
1. Go to `/owner/billing`
2. Click "Gérer mes paiements"
3. Should redirect to Stripe portal
4. Try updating payment method
5. Try canceling subscription
6. Verify webhook events in `stripe_webhook_event` table

---

## 🔒 Security Features

| Feature | Implementation |
|---------|----------------|
| **PCI Compliance** | ✅ Stripe Checkout (hosted) = SAQ A minimal |
| **Webhook Verification** | ✅ `stripe.webhooks.constructEvent()` signature check |
| **Idempotency** | ✅ `stripe_webhook_event` table prevents duplicate processing |
| **Authentication** | ✅ All API routes verify `supabase.auth.getUser()` |
| **Authorization** | ✅ Enterprise ID matching before operations |
| **Service Role** | ✅ Webhooks use service role (no user context) |

---

## 📊 Monitoring

### Database Queries

**Check active subscriptions**:
```sql
SELECT
  e.name as enterprise,
  s.status,
  s.current_period_end,
  COUNT(si.id) as modules_count
FROM stripe_subscription s
JOIN enterprise e ON s.enterprise_id = e.id
LEFT JOIN stripe_subscription_item si ON si.stripe_subscription_id = s.id
WHERE s.status IN ('active', 'trialing')
GROUP BY e.name, s.status, s.current_period_end;
```

**Check webhook processing**:
```sql
SELECT
  event_type,
  COUNT(*) as total,
  SUM(CASE WHEN processed THEN 1 ELSE 0 END) as processed,
  SUM(CASE WHEN processing_error IS NOT NULL THEN 1 ELSE 0 END) as errors
FROM stripe_webhook_event
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY event_type
ORDER BY total DESC;
```

**Calculate MRR (Monthly Recurring Revenue)**:
```sql
SELECT
  SUM(si.quantity * m.price_monthly) as mrr_eur
FROM stripe_subscription_item si
JOIN stripe_subscription s ON si.stripe_subscription_id = s.id
JOIN module m ON si.module_id = m.id
WHERE s.status = 'active';
```

---

## 🎯 Module Pricing

| Module ID | Name | Monthly | Annual | Description |
|-----------|------|---------|--------|-------------|
| `base` | Configuration & Base | FREE | FREE | Dashboard, nurseries, employees, messages |
| `cleaning` | Nettoyage | 29€ | 278€ | Rooms, tasks, sessions, history |
| `haccp` | HACCP Traçabilité | 39€ | 374€ | Children, meals, temps, products, incidents |
| `children` | Enfants & Familles | 29€ | 278€ | Child profiles, family portal |
| `attendance` | Présences & Activités | 39€ | 374€ | Attendance tracking, daily activities |
| `staff` | Personnel & Planning | 49€ | 470€ | Staff scheduling, absences, hours |
| `enrollment` | Inscriptions & Contrats | 39€ | 374€ | Admissions, contracts, documents |
| `billing` | Facturation & Finances | 59€ | 566€ | Invoicing, payments, accounting |
| `analytics` | Analytics | 49€ | 470€ | Statistics, reports, dashboards |

**Annual discount**: 20% (12 months for price of 9.6)

---

## 🐛 Troubleshooting

### Issue: "No valid modules found with Stripe prices"

**Cause**: Modules don't have `stripe_price_id` set

**Solution**: Run `createStripeProducts()` or `syncStripePrices()`

---

### Issue: Webhook events not processing

**Checks**:
1. Verify webhook secret in env matches Stripe Dashboard
2. Check `stripe_webhook_event` table for `processing_error` column
3. Check server logs for `[Stripe Webhook]` messages
4. Verify webhook endpoint is publicly accessible (no firewall)
5. Test with Stripe CLI: `stripe trigger checkout.session.completed`

---

### Issue: Module access not granted after payment

**Debug**:
```sql
-- Check if webhook was received
SELECT * FROM stripe_webhook_event
WHERE event_type = 'customer.subscription.created'
ORDER BY created_at DESC LIMIT 5;

-- Check if subscription was stored
SELECT * FROM stripe_subscription
ORDER BY created_at DESC LIMIT 5;

-- Check if module access was granted
SELECT * FROM nursery_module_access
WHERE is_active = true
ORDER BY created_at DESC LIMIT 10;
```

**Fix**: Manually grant access if webhook failed:
```sql
INSERT INTO nursery_module_access (nursery_id, module_id, is_active, notes)
VALUES ('nursery-uuid', 'module-id', true, 'Manually granted after webhook failure')
ON CONFLICT (nursery_id, module_id) DO UPDATE SET is_active = true;
```

---

## 📝 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                          OWNER (Frontend)                        │
│                     /owner/billing/page.tsx                      │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      │ 1. POST /api/stripe/checkout
                      │    { type: 'subscription', moduleIds: [...] }
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│                    API ROUTE (Next.js)                           │
│              app/api/stripe/checkout/route.ts                    │
│                                                                   │
│  - Verify auth                                                   │
│  - Call stripeService.createSubscriptionCheckout()              │
│  - Return checkout URL                                           │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      │ 2. Redirect to Stripe Checkout
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│                    STRIPE CHECKOUT (Hosted)                      │
│                  https://checkout.stripe.com/...                 │
│                                                                   │
│  - Secure payment form                                           │
│  - PCI-compliant                                                 │
│  - Card / SEPA / Apple Pay / Google Pay                          │
└─────────────────────┬───────────────┬───────────────────────────┘
                      │               │
         3a. Success  │               │  3b. Cancel
                      │               │
         ┌────────────▼─────┐    ┌────▼─────────┐
         │  /billing/success │    │   /billing   │
         └──────────────────┘    └──────────────┘
                      │
                      │ 4. Stripe Webhook Event
                      │    checkout.session.completed
                      │    customer.subscription.created
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│                   WEBHOOK HANDLER                                │
│            app/api/stripe/webhooks/route.ts                      │
│                                                                   │
│  - Verify signature                                              │
│  - Call handleStripeEvent()                                      │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      │ 5. Process event
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│               WEBHOOK SERVICE                                    │
│        lib/services/stripe-webhook.service.ts                    │
│                                                                   │
│  - Check idempotency (stripe_webhook_event)                      │
│  - Route to handler (handleSubscriptionCreated)                  │
│  - Store subscription (stripe_subscription)                      │
│  - Grant module access (nursery_module_access)                   │
│  - Mark as processed                                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✅ Completion Summary

| Component | Status | Files |
|-----------|--------|-------|
| Database Schema | ✅ Ready | `65_stripe_integration.sql` |
| Stripe Client | ✅ Complete | `lib/stripe/index.ts` |
| Stripe Service | ✅ Complete | `lib/services/stripe.service.ts` |
| Webhook Service | ✅ Complete | `lib/services/stripe-webhook.service.ts` |
| Server Actions | ✅ Complete | `lib/actions/stripe.actions.ts` |
| Checkout API | ✅ Complete | `app/api/stripe/checkout/route.ts` |
| Webhooks API | ✅ Complete | `app/api/stripe/webhooks/route.ts` |
| Portal API | ✅ Complete | `app/api/stripe/portal/route.ts` |
| Billing UI | ✅ Complete | `app/(owner)/owner/billing/page.tsx` |
| Success UI | ✅ Complete | `app/(owner)/owner/billing/success/page.tsx` |
| Navigation | ✅ Complete | `components/layout/AppSidebar.tsx` |
| Types | ✅ Complete | `types/database.types.ts` |
| Packages | ✅ Installed | `stripe`, `@stripe/stripe-js` |
| **Build** | ✅ **Passing** | `npm run build` - 0 errors |

---

## 🚀 Next Steps

1. **Configure environment variables** (5 min)
2. **Run migration** in Supabase (2 min)
3. **Create Stripe products** (10 min)
4. **Configure webhook** (5 min)
5. **Enable customer portal** (3 min)
6. **Test payment flow** (10 min)

**Total deployment time**: ~35 minutes

---

**Questions?** Check the detailed plan in `STRIPE-PLAN.md`

**Ready to deploy!** 🎉
