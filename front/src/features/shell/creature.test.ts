import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(new URL('../../styles/index.css', import.meta.url), 'utf8')
const html = readFileSync(new URL('../../../index.html', import.meta.url), 'utf8')

/** Corps d'un bloc `selecteur { … }` (sans bloc imbriqué). */
function block(source: string, selector: string): string {
  const start = source.indexOf(`${selector} {`)
  if (start === -1) return ''
  return source.slice(start, source.indexOf('}', start))
}

describe('saut du personnage (LUN-151)', () => {
  it("ne joue qu'une fois, en moins de 5 secondes (WCAG 2.2.2)", () => {
    const hop = block(css, '.creature-hop')
    expect(hop).toMatch(/animation:\s*creature-hop\s+1\.2s\b[^;]*\b1\b/)
    expect(hop).not.toContain('infinite')
    expect(css).toContain('@keyframes creature-hop')
  })

  it('est annulé quand la personne demande moins de mouvement (WCAG 2.3.3)', () => {
    const media = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'))
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
    expect(block(media, '.creature-hop')).toMatch(/animation:\s*none/)
  })
})

describe('icône d’onglet', () => {
  it('index.html déclare le personnage en SVG', () => {
    expect(html).toContain('<link rel="icon" type="image/svg+xml" href="/favicon.svg" />')
  })

  it('favicon.svg ne dépend d’aucune ressource externe', () => {
    const svg = readFileSync(new URL('../../../public/favicon.svg', import.meta.url), 'utf8')
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)
    expect(svg).not.toMatch(/href=|url\(http|<script/)
  })
})
