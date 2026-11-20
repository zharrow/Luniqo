export const NURSERY_KEY = 'luniqo.creche'

export function resolveNurseryId(
  fromUrl: string | undefined,
  remembered: string | null,
  accessible: readonly string[],
): string | null {
  if (fromUrl) return fromUrl
  if (remembered && accessible.includes(remembered)) return remembered
  return accessible[0] ?? null
}

function defaultStorage(): Storage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage
  } catch {
    return undefined
  }
}

export function readRememberedNursery(storage?: Pick<Storage, 'getItem'>): string | null {
  try {
    const target = storage ?? defaultStorage()
    return target?.getItem(NURSERY_KEY) ?? null
  } catch {
    return null
  }
}

export function rememberNursery(id: string, storage?: Pick<Storage, 'setItem'>): void {
  try {
    const target = storage ?? defaultStorage()
    target?.setItem(NURSERY_KEY, id)
  } catch {
    // Stockage indisponible ou plein : la crèche n'est simplement pas mémorisée.
  }
}

/** `to` : identifiant de crèche, ou 'group' pour la vue du groupe. */
export function switchTarget(pathname: string, to: string): string {
  if (to === 'group') return '/accueil'
  const match = /^\/creches\/[^/]+(\/.*)?$/.exec(pathname)
  if (match) return `/creches/${to}${match[1] ?? ''}`
  return `/creches/${to}/presences`
}
