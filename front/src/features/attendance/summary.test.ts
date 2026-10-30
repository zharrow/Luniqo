import { describe, expect, it } from 'vitest'

import { dayAttendance } from '../../../test/fixtures'
import { summarize } from './summary'

describe('summarize', () => {
  it('compte les présents, les arrivées et les départs', () => {
    expect(summarize(dayAttendance)).toEqual({ present: 2, arrivals: 3, departures: 1 })
  })

  it('journée sans pointage', () => {
    expect(summarize([])).toEqual({ present: 0, arrivals: 0, departures: 0 })
  })
})
