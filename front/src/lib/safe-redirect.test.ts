import { describe, expect, it } from 'vitest'

import { safeRedirect } from './safe-redirect'

describe('safeRedirect', () => {
  it.each(['/accueil', '/creches/12?jour=2026-10-27', '/a#b'])('garde un chemin de Luniqo : %s', (target) => {
    expect(safeRedirect(target)).toBe(target)
  })

  it.each([
    ['adresse absente', undefined],
    ['autre site', 'https://exemple.com'],
    ['adresse relative au protocole', '//exemple.com'],
    ['barre oblique inverse', '/\\exemple.com'],
    ['tabulation', '/\t/exemple.com'],
    ['retour à la ligne', '/\n/exemple.com'],
    ['schéma javascript', 'javascript:alert(1)'],
    ['chemin relatif', 'accueil'],
    ['valeur non textuelle', 42],
  ])('refuse %s', (_, target) => {
    expect(safeRedirect(target)).toBe('/accueil')
  })
})
