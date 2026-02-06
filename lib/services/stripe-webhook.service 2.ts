// Stripe Webhook Service
// Handles incoming Stripe webhook events with idempotency
// Uses service role client (no user context in webhooks)

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'

// ============================================================================
// ADMIN CLIENT (Service Role for webhook processing)
// Untyped client to avoid Supabase type inference issues with new tables
// ============================================================================

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables for webhook processing')
  }

  return createSupabaseClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

// ============================================================================
// MAIN EVENT HANDLER
// ============================================================================

/**
 * Process a Stripe webhook event with idempotency
 * Returns true if event was processed, false if already processed
 */
export async function handleStripeEvent(event: Stripe.Event): Promise<boolean> {
  const supabase = getAdminClient()

  // Check idempotency - skip if already processed
  const { data: existing } = await supabase
    .from('stripe_webhook_event')
    .select('id, processed')
    .eq('stripe_event_id', event.id)
    .single()

  if (existing?.processed) {
    console.log(`[Stripe Webhook] Event ${event.id} already processed, skipping`)
    return false
  }

  // Record event (mark as not processed yet)
  if (!existing) {
    await supabase.from('stripe_webhook_event').insert({
      stripe_event_id: event.id,
      event_type: event.type,
      processed: false,
      payload: event.data.object as unknown as Record<string, unknown>,
    })
  }

  try {
    // Route to appropriate handler
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice)
        break

      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent)
        break

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent)
        break

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`)
    }

    // Mark as processed
    await supabase
      .from('stripe_webhook_event')
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
      })
      .eq('stripe_event_id', event.id)

    return true
  } catch (error) {
    // Record processing error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[Stripe Webhook] Error processing ${event.type}:`, errorMessage)

    await supabase
      .from('stripe_webhook_event')
      .update({
        processing_error: errorMessage,
      })
      .eq('stripe_event_id', event.id)

    throw error
  }
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

/**
 * Handle checkout.session.completed
 * Update checkout session status in our DB
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const supabase = getAdminClient()

  console.log(`[Stripe Webhook] Checkout completed: ${session.id}`)

  await supabase
    .from('stripe_checkout_session')
    .update({
      status: 'complete',
      completed_at: new Date().toISOString(),
    })
    .eq('stripe_session_id', session.id)
}

/**
 * Handle customer.subscription.created
 * Store subscription and grant module access
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const supabase = getAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sub = subscription as any
  const metadata = sub.metadata || {}
  const enterpriseId = metadata.enterprise_id
  const nurseryId = metadata.nursery_id
  const moduleIds = metadata.module_ids?.split(',') || []

  if (!enterpriseId) {
    console.error('[Stripe Webhook] Missing enterprise_id in subscription metadata')
    return
  }

  console.log(`[Stripe Webhook] Subscription created: ${sub.id} for enterprise ${enterpriseId}`)

  // Get stripe_customer record
  const { data: stripeCustomer } = await supabase
    .from('stripe_customer')
    .select('id')
    .eq('stripe_customer_id', sub.customer as string)
    .single()

  if (!stripeCustomer) {
    console.error('[Stripe Webhook] Stripe customer not found in DB')
    return
  }

  // Store subscription
  const { data: storedSub, error: subError } = await supabase
    .from('stripe_subscription')
    .upsert(
      {
        enterprise_id: enterpriseId,
        stripe_customer_id: stripeCustomer.id,
        stripe_subscription_id: sub.id,
        status: sub.status,
        current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        cancel_at_period_end: sub.cancel_at_period_end,
        metadata: metadata,
      },
      { onConflict: 'stripe_subscription_id' }
    )
    .select('id')
    .single()

  if (subError || !storedSub) {
    console.error('[Stripe Webhook] Failed to store subscription:', subError)
    return
  }

  // Store subscription items and grant module access
  if (nurseryId && moduleIds.length > 0) {
    for (let i = 0; i < sub.items.data.length; i++) {
      const item = sub.items.data[i]
      const moduleId = moduleIds[i]

      if (!moduleId) continue

      // Store subscription item
      await supabase.from('stripe_subscription_item').upsert(
        {
          stripe_subscription_id: storedSub.id,
          nursery_id: nurseryId,
          module_id: moduleId,
          stripe_subscription_item_id: item.id,
          stripe_price_id: typeof item.price === 'string' ? item.price : item.price.id,
        },
        { onConflict: 'stripe_subscription_item_id' }
      )

      // Grant module access to nursery
      // Use granted_by_id = NULL to indicate Stripe-managed access
      // Don't overwrite existing manual grants (where granted_by_id IS NOT NULL)
      const { data: existingAccess } = await supabase
        .from('nursery_module_access')
        .select('granted_by_id')
        .eq('nursery_id', nurseryId)
        .eq('module_id', moduleId)
        .single()

      if (existingAccess?.granted_by_id) {
        // Manual grant exists - only update is_active and add note about Stripe
        await supabase
          .from('nursery_module_access')
          .update({
            is_active: true,
            notes: `Manuel + Stripe: ${sub.id}`,
          })
          .eq('nursery_id', nurseryId)
          .eq('module_id', moduleId)
      } else {
        // No manual grant - create/update Stripe-managed access
        await supabase.from('nursery_module_access').upsert(
          {
            nursery_id: nurseryId,
            module_id: moduleId,
            is_active: true,
            granted_by_id: null, // NULL = Stripe-managed
            notes: `Stripe subscription: ${sub.id}`,
          },
          { onConflict: 'nursery_id,module_id' }
        )
      }
    }

    console.log(`[Stripe Webhook] Granted access to modules [${moduleIds.join(', ')}] for nursery ${nurseryId}`)
  }
}

/**
 * Handle customer.subscription.updated
 * Update subscription status and synchronize module access
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const supabase = getAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sub = subscription as any

  console.log(`[Stripe Webhook] Subscription updated: ${sub.id}, status: ${sub.status}`)

  // Update subscription status
  await supabase
    .from('stripe_subscription')
    .update({
      status: sub.status,
      current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
      current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      cancel_at_period_end: sub.cancel_at_period_end,
      canceled_at: sub.canceled_at
        ? new Date(sub.canceled_at * 1000).toISOString()
        : null,
    })
    .eq('stripe_subscription_id', sub.id)

  // Get stored subscription
  const { data: storedSub } = await supabase
    .from('stripe_subscription')
    .select('id, metadata')
    .eq('stripe_subscription_id', sub.id)
    .single()

  if (!storedSub) return

  const metadata = (storedSub.metadata as any) || {}
  const nurseryId = metadata.nursery_id

  if (!nurseryId) return

  // Get current subscription items from Stripe
  const currentModuleIds = new Set<string>()
  for (const item of sub.items.data) {
    const priceId = typeof item.price === 'string' ? item.price : item.price.id

    // Get module_id from price metadata (we store it when creating the price)
    const { data: priceData } = await supabase
      .from('stripe_subscription_item')
      .select('module_id')
      .eq('stripe_price_id', priceId)
      .limit(1)
      .single()

    if (priceData?.module_id) {
      currentModuleIds.add(priceData.module_id)
    }
  }

  // Get existing Stripe-managed access (granted_by_id IS NULL)
  const { data: existingAccess } = await supabase
    .from('nursery_module_access')
    .select('module_id')
    .eq('nursery_id', nurseryId)
    .is('granted_by_id', null) // Only Stripe-managed access

  const existingModuleIds = new Set(existingAccess?.map(a => a.module_id) || [])

  // Revoke access for modules no longer in subscription (only Stripe-managed)
  for (const moduleId of existingModuleIds) {
    if (!currentModuleIds.has(moduleId)) {
      await supabase
        .from('nursery_module_access')
        .update({ is_active: false })
        .eq('nursery_id', nurseryId)
        .eq('module_id', moduleId)
        .is('granted_by_id', null) // Only revoke Stripe-managed access

      console.log(`[Stripe Webhook] Revoked Stripe access to module ${moduleId} for nursery ${nurseryId}`)
    }
  }

  // Grant access for new modules (only if not manually granted)
  for (const moduleId of currentModuleIds) {
    if (!existingModuleIds.has(moduleId)) {
      // Check if manual grant exists
      const { data: manualAccess } = await supabase
        .from('nursery_module_access')
        .select('granted_by_id')
        .eq('nursery_id', nurseryId)
        .eq('module_id', moduleId)
        .single()

      if (manualAccess?.granted_by_id) {
        // Manual grant exists - just activate it
        await supabase
          .from('nursery_module_access')
          .update({
            is_active: true,
            notes: `Manuel + Stripe: ${sub.id}`,
          })
          .eq('nursery_id', nurseryId)
          .eq('module_id', moduleId)
      } else {
        // Create new Stripe-managed access
        await supabase.from('nursery_module_access').upsert(
          {
            nursery_id: nurseryId,
            module_id: moduleId,
            is_active: true,
            granted_by_id: null, // NULL = Stripe-managed
            notes: `Stripe subscription: ${sub.id}`,
          },
          { onConflict: 'nursery_id,module_id' }
        )
      }

      console.log(`[Stripe Webhook] Granted Stripe access to module ${moduleId} for nursery ${nurseryId}`)
    }
  }
}

/**
 * Handle customer.subscription.deleted
 * Revoke Stripe-managed module access when subscription ends
 * Preserves manual grants (granted_by_id IS NOT NULL)
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const supabase = getAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sub = subscription as any

  console.log(`[Stripe Webhook] Subscription deleted: ${sub.id}`)

  // Update subscription status
  await supabase
    .from('stripe_subscription')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', sub.id)

  // Get subscription items to revoke access
  const { data: storedSub } = await supabase
    .from('stripe_subscription')
    .select('id')
    .eq('stripe_subscription_id', sub.id)
    .single()

  if (!storedSub) return

  const { data: items } = await supabase
    .from('stripe_subscription_item')
    .select('nursery_id, module_id')
    .eq('stripe_subscription_id', storedSub.id)

  if (!items) return

  // Revoke ONLY Stripe-managed access (granted_by_id IS NULL)
  // Preserve manual grants
  for (const item of items) {
    const { data: access } = await supabase
      .from('nursery_module_access')
      .select('granted_by_id')
      .eq('nursery_id', item.nursery_id)
      .eq('module_id', item.module_id)
      .single()

    if (access?.granted_by_id) {
      // Manual grant exists - keep it active, just update notes
      await supabase
        .from('nursery_module_access')
        .update({
          notes: `Manuel (Stripe annulé: ${sub.id})`,
        })
        .eq('nursery_id', item.nursery_id)
        .eq('module_id', item.module_id)

      console.log(`[Stripe Webhook] Preserved manual access to module ${item.module_id} for nursery ${item.nursery_id}`)
    } else {
      // Stripe-managed access - revoke it
      await supabase
        .from('nursery_module_access')
        .update({ is_active: false })
        .eq('nursery_id', item.nursery_id)
        .eq('module_id', item.module_id)
        .is('granted_by_id', null)

      console.log(`[Stripe Webhook] Revoked Stripe access to module ${item.module_id} for nursery ${item.nursery_id}`)
    }
  }
}

/**
 * Handle invoice.payment_succeeded
 * Log successful subscription renewal payments
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log(`[Stripe Webhook] Invoice payment succeeded: ${invoice.id}, amount: ${invoice.amount_paid}`)
}

/**
 * Handle payment_intent.succeeded
 * Update payment record for one-time invoice payments
 */
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const supabase = getAdminClient()
  const metadata = paymentIntent.metadata || {}

  console.log(`[Stripe Webhook] PaymentIntent succeeded: ${paymentIntent.id}`)

  // If this is an invoice payment, update the payment record
  if (metadata.invoice_id) {
    await supabase
      .from('payment')
      .update({
        stripe_payment_intent_id: paymentIntent.id,
        status: 'validated',
        validated_at: new Date().toISOString(),
      })
      .eq('id', metadata.invoice_id)
  }
}

/**
 * Handle payment_intent.payment_failed
 * Log failed payments for monitoring
 */
async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.error(
    `[Stripe Webhook] PaymentIntent failed: ${paymentIntent.id}`,
    paymentIntent.last_payment_error?.message
  )
}
