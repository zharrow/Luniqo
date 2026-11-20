export type FamilyId = 'today' | 'children' | 'team' | 'places' | 'admin'

export type Family = {
  label: string
  /** Fond plein de l'entrée active (texte blanc dessus). */
  color: string
  /** Encre : texte et icônes de la famille sur le fond du menu ou sur la teinte. */
  ink: string
  /** Fond léger (survol, pastille). */
  tint: string
}

/** Valeurs dupliquées dans src/styles/index.css : le test de families.test.ts vérifie l'accord. */
export const FAMILIES: Record<FamilyId, Family> = {
  today: { label: "Aujourd'hui", color: '#2459d6', ink: '#1a3f99', tint: '#eaf0fd' },
  children: { label: 'Enfants', color: '#c2452b', ink: '#8e2f1c', tint: '#fdece7' },
  team: { label: 'Équipe', color: '#6d45c4', ink: '#4a2c8f', tint: '#efe9fb' },
  places: { label: 'Lieux et hygiène', color: '#0b7a70', ink: '#0b5e56', tint: '#e1f5f2' },
  admin: { label: 'Gestion', color: '#8f6400', ink: '#6b4e00', tint: '#fff5d1' },
}

function luminance(hex: string): number {
  const linear = (start: number) => {
    const c = parseInt(hex.slice(start, start + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * linear(1) + 0.7152 * linear(3) + 0.0722 * linear(5)
}

/** Rapport de contraste WCAG entre deux couleurs `#rrggbb`. */
export function contrastRatio(a: string, b: string): number {
  const [la, lb] = [luminance(a), luminance(b)]
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}
