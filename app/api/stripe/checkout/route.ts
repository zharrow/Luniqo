import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripeService } from '@/lib/services/stripe.service'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const { type, enterpriseId, nurseryId, moduleIds, invoiceId, amount, description } = body

    if (!enterpriseId) {
      return NextResponse.json({ error: 'Enterprise ID requis' }, { status: 400 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    if (type === 'subscription') {
      // Module subscription checkout
      if (!nurseryId || !moduleIds || moduleIds.length === 0) {
        return NextResponse.json(
          { error: 'nurseryId et moduleIds requis pour un abonnement' },
          { status: 400 }
        )
      }

      const result = await stripeService.createSubscriptionCheckout({
        enterpriseId,
        nurseryId,
        moduleIds,
        successUrl: `${baseUrl}/owner/billing/success`,
        cancelUrl: `${baseUrl}/owner/billing`,
      })

      return NextResponse.json({ url: result.url, sessionId: result.sessionId })
    } else if (type === 'payment') {
      // Invoice payment checkout
      if (!invoiceId || !amount) {
        return NextResponse.json(
          { error: 'invoiceId et amount requis pour un paiement' },
          { status: 400 }
        )
      }

      const result = await stripeService.createInvoicePaymentCheckout({
        enterpriseId,
        invoiceId,
        amount,
        description: description || 'Paiement facture Luniqo',
        successUrl: `${baseUrl}/owner/billing/success`,
        cancelUrl: `${baseUrl}/owner/billing`,
      })

      return NextResponse.json({ url: result.url, sessionId: result.sessionId })
    }

    return NextResponse.json({ error: 'Type de checkout invalide' }, { status: 400 })
  } catch (error) {
    console.error('[API] Stripe checkout error:', error)
    const message = error instanceof Error ? error.message : 'Erreur interne'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
