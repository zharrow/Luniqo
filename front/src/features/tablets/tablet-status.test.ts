import { describe, expect, it } from 'vitest'

import { tablet } from '../../../test/fixtures'
import { tabletStatus } from './tablet-status'

const now = new Date('2026-10-30T10:00:00Z')

describe('tabletStatus', () => {
  it("active avant sa fin d'enrôlement", () => {
    expect(tabletStatus({ ...tablet, expires_at: '2026-10-30T10:00:01Z' }, now)).toBe('active')
  })

  it("expirée à sa fin d'enrôlement", () => {
    expect(tabletStatus({ ...tablet, expires_at: '2026-10-30T10:00:00Z' }, now)).toBe('expired')
  })

  it('révoquée, même expirée', () => {
    expect(
      tabletStatus({ ...tablet, revoked_at: '2026-10-01T08:00:00Z', expires_at: '2026-10-02T08:00:00Z' }, now),
    ).toBe('revoked')
  })
})
