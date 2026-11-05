import { describe, expect, it } from 'vitest'

import { fileName } from './export-csv'

describe('nom du fichier exporté', () => {
  it("reprend celui de l'API", () => {
    expect(fileName('attachment; filename="presences_2026-10-24_2026-10-30.csv"')).toBe(
      'presences_2026-10-24_2026-10-30.csv',
    )
  })

  it('écarte un nom absent ou qui sortirait du dossier de téléchargement', () => {
    expect(fileName(null)).toBeNull()
    expect(fileName('attachment')).toBeNull()
    expect(fileName('attachment; filename="../../.bashrc"')).toBeNull()
  })
})
