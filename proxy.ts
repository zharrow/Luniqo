import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - healthz (sonde de santé du conteneur, sans appel à Supabase)
     * - public folder
     * - api/stripe/webhooks (Stripe webhooks - no auth needed)
     */
    '/((?!_next/static|_next/image|favicon.ico|healthz|api/stripe/webhooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
