import { useState } from 'react'

import { errorMessage } from '@/api/errors'
import type { Schemas } from '@/api/types'
import { FormError } from '@/components/form-error'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate, formatDateTime } from '@/lib/dates'
import { cn } from '@/lib/utils'

import { type TabletStatus, tabletStatus } from './tablet-status'

type TabletListProps = {
  tablets: Schemas['TabletOut'][] | undefined
  pending: boolean
  error: unknown
  onRevoke: (tabletId: string) => void
  /** Tablette dont la révocation est en cours d'envoi. */
  revoking?: string | null
  revokeError?: string | null
  now?: Date
}

const STATUS: Record<TabletStatus, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-accent text-accent-foreground' },
  expired: { label: 'Expirée', className: 'bg-muted text-muted-foreground' },
  revoked: { label: 'Révoquée', className: 'bg-secondary text-secondary-foreground' },
}

/** Tablettes de la crèche, avec états de chargement, d'erreur et vide (CLAUDE.md, règle 5). */
export function TabletList({
  tablets,
  pending,
  error,
  onRevoke,
  revoking = null,
  revokeError = null,
  now = new Date(),
}: TabletListProps) {
  // Révocation en deux temps : un clic de trop ne coupe pas une tablette en service.
  const [confirming, setConfirming] = useState<string | null>(null)

  if (pending) return <p className="text-muted-foreground">Chargement des tablettes…</p>
  if (error !== null && error !== undefined) return <FormError message={errorMessage(error)} />
  if (tablets === undefined || tablets.length === 0) {
    return <p className="text-muted-foreground">Aucune tablette enrôlée pour cette crèche.</p>
  }

  return (
    <div className="grid gap-3">
      <FormError message={revokeError} />
      <ul className="grid gap-3">
        {tablets.map((tablet) => {
          const status = tabletStatus(tablet, now)
          return (
            <li key={tablet.id}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex flex-wrap items-center gap-2">
                    <h3>{tablet.label}</h3>
                    <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', STATUS[status].className)}>
                      {STATUS[status].label}
                    </span>
                  </CardTitle>
                  <CardDescription>{describe(tablet, status)}</CardDescription>
                </CardHeader>
                {status === 'active' && (
                  <CardContent className="flex flex-wrap items-center gap-2">
                    {confirming === tablet.id ? (
                      <>
                        <span className="text-sm">Révoquer « {tablet.label} » ? Elle ne servira plus.</span>
                        <Button
                          variant="destructive"
                          className="h-11"
                          disabled={revoking === tablet.id}
                          onClick={() => onRevoke(tablet.id)}
                        >
                          {revoking === tablet.id ? 'Révocation…' : 'Confirmer la révocation'}
                        </Button>
                        <Button variant="outline" className="h-11" onClick={() => setConfirming(null)}>
                          Annuler
                        </Button>
                      </>
                    ) : (
                      <Button variant="outline" className="h-11" onClick={() => setConfirming(tablet.id)}>
                        Révoquer
                      </Button>
                    )}
                  </CardContent>
                )}
              </Card>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function describe(tablet: Schemas['TabletOut'], status: TabletStatus): string {
  const enrolled = `Enrôlée le ${formatDate(tablet.created_at)}`
  if (status === 'revoked' && tablet.revoked_at !== null) {
    return `${enrolled} · révoquée le ${formatDate(tablet.revoked_at)}`
  }
  const seen =
    tablet.last_seen_at === null ? 'jamais utilisée' : `dernière activité le ${formatDateTime(tablet.last_seen_at)}`
  const end = status === 'expired' ? 'expirée le' : "jusqu'au"
  return `${enrolled} · ${seen} · ${end} ${formatDate(tablet.expires_at)}`
}
