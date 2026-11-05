import { describe, expect, it } from 'vitest'

import {
  addDays,
  daysBetween,
  formatDate,
  formatDateTime,
  formatDay,
  formatLongDay,
  formatTime,
  todayInParis,
} from './dates'

describe('dates', () => {
  it("affiche l'heure de Paris, pas celle de l'appareil", () => {
    // 23 h 30 UTC un 31 octobre = 0 h 30 à Paris le 1er novembre (heure d'hiver).
    expect(formatDateTime('2026-10-31T23:30:00Z')).toBe('1 novembre 2026 à 00:30')
    expect(formatDate('2026-10-31T23:30:00Z')).toBe('1 novembre 2026')
    expect(formatTime('2026-10-31T23:30:00Z')).toBe('00:30')
  })

  it("donne le jour de Paris : 0 h 30 à Paris n'est pas la veille (règle 3 de CLAUDE.md)", () => {
    expect(todayInParis(new Date('2026-10-31T23:30:00Z'))).toBe('2026-11-01')
    expect(todayInParis(new Date('2026-07-14T21:59:00Z'))).toBe('2026-07-14')
    expect(todayInParis(new Date('2026-07-14T22:00:00Z'))).toBe('2026-07-15')
  })

  it("compte les jours du calendrier, passage à l'heure d'hiver compris", () => {
    expect(addDays('2026-10-30', -6)).toBe('2026-10-24')
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(addDays('2028-03-01', -1)).toBe('2028-02-29')
    expect(daysBetween('2026-10-24', '2026-10-30')).toBe(6)
    expect(daysBetween('2026-10-30', '2026-10-30')).toBe(0)
  })

  it('écrit un jour du calendrier sans le décaler', () => {
    expect(formatLongDay('2026-10-30')).toBe('vendredi 30 octobre 2026')
    expect(formatDay('2026-11-01')).toBe('1 novembre 2026')
  })
})
