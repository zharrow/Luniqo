import { describe, expect, it } from 'vitest'

import { periodAttendance } from '../../../test/fixtures'
import {
  groupByDay,
  isMissingDeparture,
  lastDays,
  periodError,
  previousMonth,
  summarizePeriod,
  thisMonth,
} from './period'

describe('période', () => {
  it('propose les 7 derniers jours, le mois en cours et le mois précédent', () => {
    expect(lastDays('2026-10-30')).toEqual({ from: '2026-10-24', to: '2026-10-30' })
    expect(thisMonth('2026-10-30')).toEqual({ from: '2026-10-01', to: '2026-10-30' })
    expect(previousMonth('2026-10-30')).toEqual({ from: '2026-09-01', to: '2026-09-30' })
    // Janvier : le mois précédent est décembre de l'année d'avant.
    expect(previousMonth('2027-01-01')).toEqual({ from: '2026-12-01', to: '2026-12-31' })
  })

  it("refuse les périodes que l'API refuserait, avec ses messages", () => {
    expect(periodError({ from: '2026-10-30', to: '2026-10-30' })).toBeNull()
    expect(periodError({ from: '2026-10-31', to: '2026-10-30' })).toBe('La date de début suit la date de fin')
    // 366 jours bornes comprises : accepté ; un de plus : refusé.
    expect(periodError({ from: '2025-10-30', to: '2026-10-30' })).toBeNull()
    expect(periodError({ from: '2025-10-29', to: '2026-10-30' })).toBe('Période limitée à 366 jours par requête')
  })

  it("regroupe par jour sans changer l'ordre de l'API", () => {
    const days = groupByDay(periodAttendance)
    expect(days.map(({ day, presences }) => [day, presences.length])).toEqual([
      ['2026-10-28', 1],
      ['2026-10-29', 2],
      ['2026-10-30', 3],
    ])
    expect(days[2]?.presences.map((presence) => presence.child_name)).toEqual([
      'Léo Garnier',
      'Jules Lambert',
      'Emma Lambert',
    ])
    expect(groupByDay([])).toEqual([])
  })

  it("compte les enfants une fois, et sépare le départ oublié de l'enfant encore présent", () => {
    expect(summarizePeriod(periodAttendance, '2026-10-30')).toEqual({
      arrivals: 6,
      children: 3,
      days: 3,
      // Léo le 28. Léo et Emma, encore là le 30, ne sont pas des oublis.
      missingDepartures: 1,
    })
    const [forgotten] = periodAttendance
    expect(forgotten && isMissingDeparture(forgotten, '2026-10-30')).toBe(true)
    expect(forgotten && isMissingDeparture(forgotten, '2026-10-28')).toBe(false)
  })
})
