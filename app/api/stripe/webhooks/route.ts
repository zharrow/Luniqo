import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { handleStripeEvent } from '@/lib/services/stripe-webhook.service'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    console.error('[Stripe Webhook] Missing stripe-signature header')
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('[Stripe Webhook] STRIPE_WEBHOOK_SECRET not configured')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  let event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error(`[Stripe Webhook] Signature verification failed: ${message}`)
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 })
  }

  try {
    await handleStripeEvent(event)
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[Stripe Webhook] Event processing error:', error)
    // Return 200 to prevent Stripe from retrying (error is logged and stored)
    return NextResponse.json({ received: true, error: 'Processing failed' })
  }
}
