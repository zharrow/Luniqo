// Sonde de santé du conteneur front (M2/Docker) : prouve que le serveur
// Next.js répond, sans appeler Supabase. Exclue du middleware (proxy.ts).
export const dynamic = 'force-dynamic'

export function GET() {
  return new Response('ok\n', {
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
  })
}
