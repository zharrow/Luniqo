import { useQueryClient } from '@tanstack/react-query'

import { $api } from '@/api/client'
import { retryFailed } from '@/lib/retry-failed'

import type { NavLinkComponent } from '../shell/nav-link'
import { rowKey, ToDoList } from './todo-list'

export const TO_DO = '/api/v2/to-do'

/** Liste « À traiter » de la direction, toutes ses crèches (LUN-153) ; partagée avec le titre de l'accueil. */
export function useToDo(enabled = true) {
  return $api.useQuery('get', TO_DO, {}, { enabled })
}

/**
 * Section « À traiter » : charge la liste, débloque un PIN sur place puis relit la liste.
 * Les autres boutons mènent à l'écran où faire le geste.
 */
export function ToDoSection({ link, now }: { link?: NavLinkComponent; now?: Date }) {
  const queryClient = useQueryClient()
  const toDo = useToDo()
  const unlock = $api.useMutation('post', '/api/v2/staff/{user_id}/pin/unlock', {
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['get', TO_DO] }),
  })
  const failed = unlock.isError ? unlock.variables.params.path.user_id : null
  const failedItem = toDo.data?.items.find((item) => item.kind === 'pin_locked' && item.subject_id === failed)

  return (
    <section aria-labelledby="a-traiter" className="grid gap-3">
      <h2 id="a-traiter" className="text-lg font-medium">
        À traiter
      </h2>
      <ToDoList
        items={toDo.data?.items}
        pending={toDo.isPending}
        error={toDo.error}
        onRetry={retryFailed(toDo)}
        onUnlock={(item) => {
          unlock.mutate({ params: { path: { user_id: item.subject_id } } })
        }}
        unlocking={unlock.isPending ? unlock.variables.params.path.user_id : null}
        unlockError={failedItem === undefined ? null : { key: rowKey(failedItem), error: unlock.error }}
        now={now}
        link={link}
      />
    </section>
  )
}
