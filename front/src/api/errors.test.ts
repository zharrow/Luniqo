import { describe, expect, it } from 'vitest'

import { ApiError, errorMessage, toApiError } from './errors'

describe('toApiError', () => {
  it("reprend le message de l'API", () => {
    const error = toApiError(401, { detail: 'Identifiants invalides' }, null)
    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(401)
    expect(error.message).toBe('Identifiants invalides')
  })

  it('ajoute le délai de Retry-After, en minutes arrondies au-dessus', () => {
    const error = toApiError(429, { detail: 'Trop de tentatives, réessayez plus tard' }, '61')
    expect(error.retryAfter).toBe(61)
    expect(error.message).toBe('Trop de tentatives, réessayez plus tard (dans 2 minutes)')
    expect(toApiError(429, { detail: 'Attendez' }, '30').message).toBe('Attendez (dans 1 minute)')
  })

  it('ignore un Retry-After qui n’est pas un nombre de secondes', () => {
    expect(toApiError(429, { detail: 'Attendez' }, 'Wed, 21 Oct 2026 07:28:00 GMT').retryAfter).toBeNull()
  })

  it('range les erreurs de validation de FastAPI par champ', () => {
    const body = { detail: [{ loc: ['body', 'email'], msg: 'Field required', type: 'missing' }] }
    const error = toApiError(422, body, null)
    expect(error.fields).toEqual({ email: 'Field required' })
    expect(error.message).toBe('Certains champs sont invalides.')
  })

  it('message générique pour une réponse inattendue', () => {
    expect(toApiError(502, '<html>', null).message).toMatch(/indisponible/)
    expect(toApiError(418, null, null).message).toMatch(/inattendue/)
  })
})

describe('errorMessage', () => {
  it('distingue une panne réseau', () => {
    expect(errorMessage(new TypeError('Failed to fetch'))).toMatch(/réseau/)
    expect(errorMessage(new ApiError(404, 'Crèche introuvable'))).toBe('Crèche introuvable')
    expect(errorMessage('?')).toMatch(/inattendue/)
  })
})
