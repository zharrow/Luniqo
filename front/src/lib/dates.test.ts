import { describe, expect, it } from 'vitest'

import { formatDate, formatDateTime, formatTime } from './dates'

describe('dates', () => {
  it("affiche l'heure de Paris, pas celle de l'appareil", () => {
    // 23 h 30 UTC un 31 octobre = 0 h 30 à Paris le 1er novembre (heure d'hiver).
    expect(formatDateTime('2026-10-31T23:30:00Z')).toBe('1 novembre 2026 à 00:30')
    expect(formatDate('2026-10-31T23:30:00Z')).toBe('1 novembre 2026')
    expect(formatTime('2026-10-31T23:30:00Z')).toBe('00:30')
  })
})
