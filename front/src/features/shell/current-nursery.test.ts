import { describe, expect, it } from 'vitest'

import { readRememberedNursery, rememberNursery, resolveNurseryId, switchTarget } from './current-nursery'

describe('resolveNurseryId', () => {
  it("fait foi de l'adresse, même absente de la liste", () => {
    expect(resolveNurseryId('n2', 'n1', ['n1', 'n2'])).toBe('n2')
    expect(resolveNurseryId('n9', null, ['n1'])).toBe('n9')
  })

  it('reprend la crèche mémorisée si elle est accessible', () => {
    expect(resolveNurseryId(undefined, 'n2', ['n1', 'n2'])).toBe('n2')
  })

  it('retombe sur la première accessible si la mémorisée ne l’est plus', () => {
    expect(resolveNurseryId(undefined, 'n3', ['n1', 'n2'])).toBe('n1')
  })

  it('rend null sans crèche', () => {
    expect(resolveNurseryId(undefined, null, [])).toBeNull()
  })
})

describe('stockage de la crèche', () => {
  it('ne lève jamais à la lecture', () => {
    expect(
      readRememberedNursery({
        getItem: () => {
          throw new Error()
        },
      }),
    ).toBeNull()
  })

  it("ne lève jamais à l'écriture", () => {
    expect(() =>
      rememberNursery('n1', {
        setItem: () => {
          throw new Error()
        },
      }),
    ).not.toThrow()
  })

  it('relit ce qui a été écrit', () => {
    const data = new Map<string, string>()
    rememberNursery('n1', { setItem: (k, v) => void data.set(k, v) })
    expect(readRememberedNursery({ getItem: (k) => data.get(k) ?? null })).toBe('n1')
  })

  it('ne lève pas sans localStorage (node)', () => {
    expect(readRememberedNursery()).toBeNull()
    expect(() => rememberNursery('n1')).not.toThrow()
  })
})

describe('switchTarget', () => {
  it("remplace l'identifiant sur une page de crèche", () => {
    expect(switchTarget('/creches/n1/presences/historique', 'n2')).toBe('/creches/n2/presences/historique')
  })

  it('va aux présences depuis une autre page', () => {
    expect(switchTarget('/accueil', 'n2')).toBe('/creches/n2/presences')
    expect(switchTarget('/reglages', 'n2')).toBe('/creches/n2/presences')
  })

  it("rend l'accueil pour le groupe", () => {
    expect(switchTarget('/creches/n1/tablettes', 'group')).toBe('/accueil')
  })
})
