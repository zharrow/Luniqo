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
    const { enterpriseId } = body

    if (!enterpriseId) {
      return NextResponse.json({ error: 'Enterprise ID requis' }, { status: 400 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const returnUrl = `${baseUrl}/owner/billing`

    const portalUrl = await stripeService.createPortalSession(enterpriseId, returnUrl)

    return NextResponse.json({ url: portalUrl })
  } catch (error) {
    console.error('[API] Stripe portal error:', error)
    const message = error instanceof Error ? error.message : 'Erreur interne'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
