import type { Schemas } from '@/api/types'

export type TabletStatus = 'active' | 'revoked' | 'expired'

/** État d'une tablette : la révocation l'emporte sur l'expiration. */
export function tabletStatus(tablet: Schemas['TabletOut'], now: Date): TabletStatus {
  if (tablet.revoked_at !== null) return 'revoked'
  if (new Date(tablet.expires_at) <= now) return 'expired'
  return 'active'
}
