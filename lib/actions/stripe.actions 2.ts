'use server'

import { stripe } from '@/lib/stripe'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Module } from '@/types/database.types'

// ============================================================================
// SERVER ACTIONS FOR STRIPE MANAGEMENT
// These actions require admin privileges and use the service role
// Untyped client to avoid Supabase type inference issues with new columns
// ============================================================================

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  return createSupabaseClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// ============================================================================
// SYNC STRIPE PRICES → MODULES
// ============================================================================

/**
 * Sync Stripe product prices to the module table
 * Fetches all active prices from Stripe and updates stripe_price_id on matching modules
 */
export async function syncStripePrices(): Promise<{ synced: number; errors: string[] }> {
  const supabase = getAdminClient()
  const errors: string[] = []
  let synced = 0

  try {
    // Fetch all active prices from Stripe
    const prices = await stripe.prices.list({
      active: true,
      expand: ['data.product'],
      limit: 100,
    })

    for (const price of prices.data) {
      const product = price.product as { metadata?: { module_id?: string } }
      const moduleId = product?.metadata?.module_id

      if (!moduleId) continue

      const isAnnual = price.recurring?.interval === 'year'

      const updateData = isAnnual
        ? { stripe_price_id_annual: price.id }
        : { stripe_price_id: price.id }

      const { error } = await supabase
        .from('module')
        .update(updateData)
        .eq('id', moduleId)

      if (error) {
        errors.push(`Failed to update module ${moduleId}: ${error.message}`)
      } else {
        synced++
      }
    }

    return { synced, errors }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { synced, errors: [message] }
  }
}

// ============================================================================
// CREATE STRIPE PRODUCTS
// ============================================================================

/**
 * Create Stripe products and prices for all paid modules
 * Only creates products that don't already have a stripe_price_id
 */
export async function createStripeProducts(): Promise<{ created: number; errors: string[] }> {
  const supabase = getAdminClient()
  const errors: string[] = []
  let created = 0

  // Fetch all paid modules without Stripe price
  const { data: modulesRaw, error: fetchError } = await supabase
    .from('module')
    .select('*')
    .eq('is_active', true)
    .eq('is_free', false)

  if (fetchError || !modulesRaw) {
    return { created: 0, errors: [fetchError?.message || 'Failed to fetch modules'] }
  }

  // Filter modules that don't have a Stripe price yet
  const modules = (modulesRaw as unknown as Module[]).filter(m => !m.stripe_price_id)

  for (const mod of modules) {
    try {
      // Create Stripe product
      const product = await stripe.products.create({
        name: mod.name,
        description: mod.description,
        metadata: {
          module_id: mod.id,
          category: mod.category || '',
        },
      })

      // Create monthly price
      const monthlyPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(mod.price_monthly * 100), // Convert to cents
        currency: 'eur',
        recurring: {
          interval: 'month',
        },
        metadata: {
          module_id: mod.id,
          billing_period: 'monthly',
        },
      })

      // Create annual price (20% discount)
      const annualAmount = Math.round(mod.price_monthly * 12 * 0.8 * 100)
      const annualPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: annualAmount,
        currency: 'eur',
        recurring: {
          interval: 'year',
        },
        metadata: {
          module_id: mod.id,
          billing_period: 'annual',
        },
      })

      // Update module with Stripe price IDs
      await supabase
        .from('module')
        .update({
          stripe_price_id: monthlyPrice.id,
          stripe_price_id_annual: annualPrice.id,
        })
        .eq('id', mod.id)

      created++
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      errors.push(`Failed to create product for ${mod.name}: ${message}`)
    }
  }

  return { created, errors }
}

// ============================================================================
// REFUND
// ============================================================================

/**
 * Process a refund for a Stripe payment
 */
export async function processStripeRefund(
  paymentIntentId: string,
  amount?: number,
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer'
): Promise<{ success: boolean; refundId?: string; error?: string }> {
  try {
    const refundParams: Record<string, unknown> = {
      payment_intent: paymentIntentId,
    }

    if (amount) {
      refundParams.amount = Math.round(amount * 100) // Convert to cents
    }

    if (reason) {
      refundParams.reason = reason
    }

    const refund = await stripe.refunds.create(refundParams as Parameters<typeof stripe.refunds.create>[0])

    return { success: true, refundId: refund.id }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Stripe] Refund error:', message)
    return { success: false, error: message }
  }
}
