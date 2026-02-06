// Stripe Service
// Manages Stripe customers, subscriptions, checkout sessions, and portal
// Used by API routes and server actions (server-side only)

import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import type {
  StripeCustomer,
  StripeSubscription,
  StripeSubscriptionItem,
  Module,
} from '@/types/database.types'

// ============================================================================
// TYPES
// ============================================================================

export interface SubscriptionCheckoutParams {
  enterpriseId: string
  nurseryId: string
  moduleIds: string[]
  successUrl: string
  cancelUrl: string
}

export interface InvoicePaymentCheckoutParams {
  enterpriseId: string
  invoiceId: string
  amount: number
  description: string
  successUrl: string
  cancelUrl: string
}

export interface EnterpriseSubscriptionInfo {
  subscription: StripeSubscription
  items: (StripeSubscriptionItem & { module: Module })[]
}

// Helper: cast supabase client to bypass type inference issues with new Stripe tables
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function db(): Promise<any> {
  return await createClient()
}

// ============================================================================
// CUSTOMER MANAGEMENT
// ============================================================================

/**
 * Get or create a Stripe customer for an enterprise
 */
async function getOrCreateCustomer(enterpriseId: string): Promise<StripeCustomer> {
  const supabase = await db()

  // Check if customer already exists in our DB
  const { data: existing } = await supabase
    .from('stripe_customer')
    .select('*')
    .eq('enterprise_id', enterpriseId)
    .single()

  if (existing) return existing as StripeCustomer

  // Fetch enterprise + owner info for Stripe customer creation
  const { data: enterprise, error: entError } = await supabase
    .from('enterprise')
    .select('id, name, owner_id')
    .eq('id', enterpriseId)
    .single()

  if (entError || !enterprise) {
    throw new Error(`Enterprise not found: ${enterpriseId}`)
  }

  // Fetch owner email
  let email = `enterprise-${enterpriseId}@luniqo.com`
  if (enterprise.owner_id) {
    const { data: owner } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', enterprise.owner_id)
      .single()
    if (owner?.email) email = owner.email
  }

  // Create Stripe customer
  const stripeCustomer = await stripe.customers.create({
    email,
    name: enterprise.name,
    metadata: {
      enterprise_id: enterpriseId,
      platform: 'luniqo',
    },
  })

  // Store in our DB
  const { data: created, error: createError } = await supabase
    .from('stripe_customer')
    .insert({
      enterprise_id: enterpriseId,
      stripe_customer_id: stripeCustomer.id,
      stripe_email: email,
      stripe_name: enterprise.name,
    })
    .select()
    .single()

  if (createError || !created) {
    throw new Error(`Failed to store Stripe customer: ${createError?.message}`)
  }

  return created as StripeCustomer
}

/**
 * Get Stripe customer by enterprise ID (returns null if not found)
 */
async function getCustomerByEnterprise(enterpriseId: string): Promise<StripeCustomer | null> {
  const supabase = await db()

  const { data } = await supabase
    .from('stripe_customer')
    .select('*')
    .eq('enterprise_id', enterpriseId)
    .single()

  return (data as StripeCustomer) || null
}

// ============================================================================
// SUBSCRIPTION CHECKOUT
// ============================================================================

/**
 * Create a Stripe Checkout session for module subscriptions
 * Redirects user to Stripe-hosted page for payment
 */
async function createSubscriptionCheckout(params: SubscriptionCheckoutParams): Promise<{ url: string; sessionId: string }> {
  const { enterpriseId, nurseryId, moduleIds, successUrl, cancelUrl } = params
  const supabase = await db()

  // Get or create Stripe customer
  const customer = await getOrCreateCustomer(enterpriseId)

  // Fetch modules with Stripe price IDs
  const { data: modules } = await supabase
    .from('module')
    .select('*')
    .in('id', moduleIds)

  const modulesWithPrices = ((modules || []) as Module[]).filter((m: Module) => m.stripe_price_id)

  if (modulesWithPrices.length === 0) {
    throw new Error('No valid modules found with Stripe prices')
  }

  // Build line items
  const lineItems = modulesWithPrices.map((mod: Module) => ({
    price: mod.stripe_price_id!,
    quantity: 1,
  }))

  // Create Checkout Session
  const session = await stripe.checkout.sessions.create({
    customer: customer.stripe_customer_id,
    mode: 'subscription',
    payment_method_types: ['card', 'sepa_debit'],
    line_items: lineItems,
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
    metadata: {
      enterprise_id: enterpriseId,
      nursery_id: nurseryId,
      module_ids: moduleIds.join(','),
      type: 'module_subscription',
    },
    subscription_data: {
      metadata: {
        enterprise_id: enterpriseId,
        nursery_id: nurseryId,
        module_ids: moduleIds.join(','),
      },
    },
    locale: 'fr',
    allow_promotion_codes: true,
  })

  // Store checkout session in DB
  await supabase.from('stripe_checkout_session').insert({
    enterprise_id: enterpriseId,
    stripe_session_id: session.id,
    stripe_customer_id: customer.stripe_customer_id,
    mode: 'subscription',
    status: 'open',
    url: session.url,
    success_url: successUrl,
    cancel_url: cancelUrl,
    amount_total: session.amount_total,
    currency: 'eur',
    metadata: {
      nursery_id: nurseryId,
      module_ids: moduleIds,
    },
    expires_at: session.expires_at
      ? new Date(session.expires_at * 1000).toISOString()
      : null,
  })

  return { url: session.url!, sessionId: session.id }
}

// ============================================================================
// INVOICE PAYMENT CHECKOUT
// ============================================================================

/**
 * Create a Stripe Checkout session for a one-time invoice payment
 */
async function createInvoicePaymentCheckout(params: InvoicePaymentCheckoutParams): Promise<{ url: string; sessionId: string }> {
  const { enterpriseId, invoiceId, amount, description, successUrl, cancelUrl } = params

  // Get or create Stripe customer
  const customer = await getOrCreateCustomer(enterpriseId)

  // Create Checkout Session for one-time payment
  const session = await stripe.checkout.sessions.create({
    customer: customer.stripe_customer_id,
    mode: 'payment',
    payment_method_types: ['card', 'sepa_debit'],
    line_items: [
      {
        price_data: {
          currency: 'eur',
          product_data: {
            name: description,
          },
          unit_amount: Math.round(amount * 100), // Convert to cents
        },
        quantity: 1,
      },
    ],
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
    metadata: {
      enterprise_id: enterpriseId,
      invoice_id: invoiceId,
      type: 'invoice_payment',
    },
    locale: 'fr',
  })

  // Store checkout session in DB
  const supabase = await db()
  await supabase.from('stripe_checkout_session').insert({
    enterprise_id: enterpriseId,
    stripe_session_id: session.id,
    stripe_customer_id: customer.stripe_customer_id,
    mode: 'payment',
    status: 'open',
    url: session.url,
    success_url: successUrl,
    cancel_url: cancelUrl,
    amount_total: session.amount_total,
    currency: 'eur',
    metadata: { invoice_id: invoiceId },
  })

  return { url: session.url!, sessionId: session.id }
}

// ============================================================================
// CUSTOMER PORTAL
// ============================================================================

/**
 * Create a Stripe Customer Portal session for managing subscriptions
 */
async function createPortalSession(enterpriseId: string, returnUrl: string): Promise<string> {
  const customer = await getOrCreateCustomer(enterpriseId)

  const session = await stripe.billingPortal.sessions.create({
    customer: customer.stripe_customer_id,
    return_url: returnUrl,
  })

  return session.url
}

// ============================================================================
// SUBSCRIPTION MANAGEMENT
// ============================================================================

/**
 * Get all subscriptions for an enterprise with their items and modules
 */
async function getEnterpriseSubscriptions(enterpriseId: string): Promise<EnterpriseSubscriptionInfo[]> {
  const supabase = await db()

  const { data: subscriptions } = await supabase
    .from('stripe_subscription')
    .select('*')
    .eq('enterprise_id', enterpriseId)
    .in('status', ['active', 'trialing', 'past_due'])
    .order('created_at', { ascending: false })

  if (!subscriptions || subscriptions.length === 0) return []

  const results: EnterpriseSubscriptionInfo[] = []

  for (const sub of subscriptions) {
    const { data: items } = await supabase
      .from('stripe_subscription_item')
      .select('*, module:module(*)')
      .eq('stripe_subscription_id', sub.id)

    results.push({
      subscription: sub as StripeSubscription,
      items: (items || []) as (StripeSubscriptionItem & { module: Module })[],
    })
  }

  return results
}

/**
 * Cancel a subscription at the end of the current billing period
 */
async function cancelSubscription(stripeSubscriptionId: string): Promise<void> {
  await stripe.subscriptions.update(stripeSubscriptionId, {
    cancel_at_period_end: true,
  })

  const supabase = await db()
  await supabase
    .from('stripe_subscription')
    .update({ cancel_at_period_end: true })
    .eq('stripe_subscription_id', stripeSubscriptionId)
}

/**
 * Reactivate a subscription that was set to cancel at period end
 */
async function reactivateSubscription(stripeSubscriptionId: string): Promise<void> {
  await stripe.subscriptions.update(stripeSubscriptionId, {
    cancel_at_period_end: false,
  })

  const supabase = await db()
  await supabase
    .from('stripe_subscription')
    .update({ cancel_at_period_end: false })
    .eq('stripe_subscription_id', stripeSubscriptionId)
}

/**
 * Get all modules with Stripe prices for the billing page
 */
async function getModulesWithPrices(): Promise<Module[]> {
  const supabase = await db()

  const { data } = await supabase
    .from('module')
    .select('*')
    .eq('is_active', true)
    .eq('is_free', false)
    .order('display_order', { ascending: true })

  return ((data || []) as Module[]).filter((m: Module) => m.stripe_price_id)
}

/**
 * Check if an enterprise has an active subscription
 */
async function hasActiveSubscription(enterpriseId: string): Promise<boolean> {
  const supabase = await db()

  const { data } = await supabase
    .from('stripe_subscription')
    .select('id')
    .eq('enterprise_id', enterpriseId)
    .eq('status', 'active')
    .limit(1)
    .single()

  return !!data
}

// ============================================================================
// EXPORT
// ============================================================================

export const stripeService = {
  getOrCreateCustomer,
  getCustomerByEnterprise,
  createSubscriptionCheckout,
  createInvoicePaymentCheckout,
  createPortalSession,
  getEnterpriseSubscriptions,
  cancelSubscription,
  reactivateSubscription,
  getModulesWithPrices,
  hasActiveSubscription,
}
