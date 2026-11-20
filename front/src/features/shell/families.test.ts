import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { contrastRatio, FAMILIES, type FamilyId } from './families'

const SHELL = '#fffdf8'
const css = readFileSync(new URL('../../styles/index.css', import.meta.url), 'utf8')
const ids = Object.keys(FAMILIES) as FamilyId[]

describe('contrastRatio', () => {
  it('vaut 21 entre blanc et noir', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 1)
  })
})

describe('couleurs des familles', () => {
  it.each(ids)('%s respecte les contrastes WCAG AA', (id) => {
    const { color, ink, tint } = FAMILIES[id]
    expect(contrastRatio('#ffffff', color)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(color, SHELL)).toBeGreaterThanOrEqual(3)
    expect(contrastRatio(ink, tint)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(ink, SHELL)).toBeGreaterThanOrEqual(4.5)
  })

  it.each(ids)('%s est déclarée dans index.css avec les mêmes valeurs', (id) => {
    const { color, ink, tint } = FAMILIES[id]
    expect(css).toContain(`--family-${id}: ${color};`)
    expect(css).toContain(`--family-${id}-ink: ${ink};`)
    expect(css).toContain(`--family-${id}-tint: ${tint};`)
  })
})

describe('texte du cadre', () => {
  it('le texte secondaire reste lisible sur le fond de page', () => {
    expect(contrastRatio('#5c6270', '#fbf8f2')).toBeGreaterThanOrEqual(4.5)
  })
  it('le texte principal reste lisible sur le fond du menu', () => {
    expect(contrastRatio('#1e2430', SHELL)).toBeGreaterThanOrEqual(4.5)
  })
})
