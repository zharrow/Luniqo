import { describe, expect, it } from 'vitest'

import { nextStep, stepHref } from './next-step'

describe('nextStep', () => {
  it('session complète : application', () => {
    expect(nextStep('not_required')).toBe('app')
    expect(nextStep('verified')).toBe('app')
  })

  it('facteur à présenter ou à enregistrer : écran correspondant', () => {
    expect(nextStep('required')).toBe('/connexion/second-facteur')
    expect(nextStep('setup_required')).toBe('/connexion/activation')
  })
})

describe('stepHref', () => {
  it("garde l'adresse de retour jusqu'à la fin du second facteur", () => {
    expect(stepHref('required', '/creches')).toBe('/connexion/second-facteur?redirect=%2Fcreches')
    expect(stepHref('setup_required', undefined)).toBe('/connexion/activation')
  })

  it("n'envoie jamais vers un autre site", () => {
    expect(stepHref('verified', '//exemple.com')).toBe('/accueil')
    expect(stepHref('not_required', '/creches')).toBe('/creches')
  })
})
