import { describe, expect, it } from 'vitest'
import { activeItemId, navigationFor, searchScreens, SOON_MODULES, soonModule } from './navigation'

const ROLES = ['owner', 'developer', 'employee', 'guardian'] as const

describe('navigationFor', () => {
  it('range la direction en cinq familles', () => {
    const nav = navigationFor('owner', 'n1')
    expect(nav.groups.map((g) => g.label)).toEqual(["Aujourd'hui", 'Enfants', 'Équipe', 'Lieux et hygiène', 'Gestion'])
  })

  it('construit les adresses des écrans réels et des modules à venir', () => {
    const { flat } = navigationFor('owner', 'n1')
    const by = (label: string) => flat.find((i) => i.label === label)
    expect(by('Présences')).toMatchObject({ href: '/creches/n1/presences', soon: false })
    expect(by('Ménage')).toMatchObject({ href: '/creches/n1/bientot/menage', soon: true })
    expect(by('Facturation')?.href).toBe('/bientot/facturation')
  })

  it('replie un groupe seulement si toutes ses entrées sont à venir', () => {
    const nav = navigationFor('owner', 'n1')
    for (const g of nav.groups) {
      expect(g.collapsedByDefault).toBe(g.items.every((i) => i.soon))
    }
    expect(nav.groups.filter((g) => g.collapsedByDefault).map((g) => g.label)).toEqual([
      'Enfants',
      'Lieux et hygiène',
      'Gestion',
    ])
  })

  it("sans crèche, n'offre aucune adresse de crèche", () => {
    const nav = navigationFor('owner', null)
    expect(nav.flat.some((i) => i.href.startsWith('/creches/'))).toBe(false)
    expect(nav.flat.some((i) => i.href === '/accueil')).toBe(true)
    expect(nav.footer.some((i) => i.href === '/reglages')).toBe(true)
  })

  it("donne à l'employée trois entrées réelles, sans Tablettes", () => {
    const nav = navigationFor('employee', 'n1')
    expect(nav.flat.map((i) => i.label)).toEqual(['Ma journée', 'Présences', 'Mon compte'])
    expect(nav.flat.some((i) => i.soon)).toBe(false)
    expect(nav.groups).toHaveLength(1)
    expect(nav.groups[0]?.label).toBe('')
    expect(nav.footer).toEqual([])
  })

  it('donne au parent cinq entrées hors crèche', () => {
    const { flat, footer } = navigationFor('guardian', null)
    expect(flat).toHaveLength(5)
    expect(flat.some((i) => i.href.startsWith('/creches/'))).toBe(false)
    expect(footer).toEqual([])
  })

  it("donne à l'éditeur un groupe « Éditeur » non replié", () => {
    const nav = navigationFor('developer', null)
    expect(nav.groups).toHaveLength(1)
    expect(nav.groups[0]).toMatchObject({ label: 'Éditeur', family: 'today', collapsedByDefault: false })
    expect(nav.flat[0]?.href).toBe('/accueil')
    expect(nav.footer.map((i) => i.href)).toEqual(['/reglages'])
  })

  it('chaque entrée à venir pointe vers un module déclaré', () => {
    for (const role of ROLES) {
      for (const id of ['n1', null]) {
        for (const item of navigationFor(role, id).flat.filter((i) => i.soon)) {
          const slug = item.href.split('/bientot/')[1] ?? ''
          expect(soonModule(slug), `${role} ${item.href}`).toBeDefined()
        }
      }
    }
  })

  it('toute adresse réelle appartient à la liste connue', () => {
    const known = ['/accueil', '/reglages', '/mon-pin', '/creches/n1/presences', '/creches/n1/tablettes']
    for (const role of ROLES) {
      const nav = navigationFor(role, 'n1')
      for (const item of [...nav.flat, ...nav.footer].filter((i) => !i.soon)) {
        expect(known).toContain(item.href)
      }
    }
  })
})

describe('SOON_MODULES', () => {
  it('a des slugs uniques et une description pour chacun', () => {
    const slugs = SOON_MODULES.map((m) => m.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const m of SOON_MODULES) expect(m.description.trim()).not.toBe('')
    expect(soonModule('aide')).toMatchObject({ scope: 'enterprise', family: 'today' })
  })
})

describe('activeItemId', () => {
  const nav = navigationFor('owner', 'n1')
  const labelOf = (id: string | null) => nav.flat.find((i) => i.id === id)?.label

  it("retient l'adresse la plus longue, segment entier", () => {
    expect(labelOf(activeItemId(nav, '/creches/n1/presences/historique'))).toBe('Présences')
    expect(labelOf(activeItemId(nav, '/creches/n1/bientot/haccp'))).toBe('HACCP')
    expect(activeItemId(nav, '/creches/n1/presencesX')).toBeNull()
  })

  it('renvoie null hors menu', () => {
    expect(activeItemId(nav, '/inconnu')).toBeNull()
  })
})

describe('searchScreens', () => {
  const nav = navigationFor('owner', 'n1')

  it('ignore la casse et les accents', () => {
    expect(searchScreens(nav, 'presen').map((i) => i.label)).toContain('Présences')
    expect(searchScreens(nav, 'PRÉSENCES').map((i) => i.label)).toContain('Présences')
  })

  it('renvoie une liste vide pour une saisie vide', () => {
    expect(searchScreens(nav, '')).toEqual([])
    expect(searchScreens(nav, '   ')).toEqual([])
  })
})
