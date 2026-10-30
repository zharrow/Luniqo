import type { ReactNode } from 'react'

import { errorMessage } from '@/api/errors'
import type { Schemas } from '@/api/types'
import { FormError } from '@/components/form-error'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type NurseryListProps = {
  nurseries: Schemas['NurseryOut'][] | undefined
  pending: boolean
  error: unknown
  /** Liens propres à chaque crèche (gestion par la direction), fournis par la route. */
  actions?: ((nursery: Schemas['NurseryOut']) => ReactNode) | undefined
}

/** Crèches accessibles, avec états de chargement, d'erreur et vide (CLAUDE.md, règle 5). */
export function NurseryList({ nurseries, pending, error, actions }: NurseryListProps) {
  if (pending) return <p className="text-muted-foreground">Chargement des crèches…</p>
  if (error !== null && error !== undefined) return <FormError message={errorMessage(error)} />
  if (nurseries === undefined || nurseries.length === 0) {
    return <p className="text-muted-foreground">Aucune crèche accessible pour le moment.</p>
  }
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {nurseries.map((nursery) => (
        <li key={nursery.id}>
          <Card>
            <CardHeader>
              <CardTitle>{nursery.name}</CardTitle>
              <CardDescription>
                {nursery.city} · {nursery.capacity} places
              </CardDescription>
            </CardHeader>
            {actions !== undefined && <CardContent>{actions(nursery)}</CardContent>}
          </Card>
        </li>
      ))}
    </ul>
  )
}
