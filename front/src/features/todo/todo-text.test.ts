import { describe, expect, it } from 'vitest'

import { TODO_NOW, toDoItems } from '../../../test/fixtures'
import { toDoHref, toDoText, toDoTitle } from './todo-text'

function at(index: number) {
  const item = toDoItems[index]
  if (item === undefined) throw new Error(`Élément ${String(index)} absent des données fictives`)
  return item
}

const pin = at(0)
const expired = at(1)
const departureYesterday = at(2)
const departureOlder = at(3)
const expiring = at(4)
const onboarding = at(5)

describe('textes « À traiter »', () => {
  it('PIN bloqué : débloqué sur place, sans lien', () => {
    expect(toDoText(pin, TODO_NOW)).toEqual({
      family: 'team',
      title: 'PIN bloqué',
      detail: 'Lucas Bernard ne peut plus s’identifier sur la tablette depuis le 20 novembre 2026.',
      action: 'Débloquer',
    })
    expect(toDoHref(pin)).toBeNull()
  })

  it('tablette expirée : vers les tablettes de sa crèche', () => {
    expect(toDoText(expired, TODO_NOW).title).toBe('La tablette « Tablette du dortoir » a expiré')
    expect(toDoText(expired, TODO_NOW).action).toBe('Enrôler de nouveau')
    expect(toDoHref(expired)).toBe(`/creches/${expired.nursery_id}/tablettes`)
  })

  it('départ non pointé : « hier », heure de Paris, historique sur ce seul jour', () => {
    const text = toDoText(departureYesterday, TODO_NOW)
    expect(text.title).toBe('Départ non pointé hier')
    expect(text.detail).toBe('Léo Garnier : arrivée à 08:18, aucun départ enregistré.')
    expect(toDoHref(departureYesterday)).toBe(
      `/creches/${departureYesterday.nursery_id}/presences/historique?du=2026-11-20&au=2026-11-20`,
    )
    expect(toDoText(departureOlder, TODO_NOW).title).toBe('Départ non pointé le 17 novembre 2026')
  })

  it('« hier » suit le jour de Paris, pas celui de UTC', () => {
    // 23 h 30 UTC le 21 = 0 h 30 à Paris le 22 : le 20 n'est plus « hier ».
    expect(toDoText(departureYesterday, new Date('2026-11-21T23:30:00Z')).title).toBe(
      'Départ non pointé le 20 novembre 2026',
    )
  })

  it('tablette qui expire : `since` lu comme la date d’expiration à venir', () => {
    expect(toDoText(expiring, TODO_NOW).title).toBe('La tablette « Tablette de l’entrée » expire dans 3 jours')
    expect(toDoText(expiring, TODO_NOW).detail).toContain('Le 24 novembre 2026 à 10:00.')
    expect(toDoText(expiring, new Date('2026-11-23T09:00:00Z')).title).toContain('expire demain')
    expect(toDoText(expiring, new Date('2026-11-24T07:00:00Z')).title).toContain('expire aujourd’hui')
    expect(toDoHref(expiring)).toBe(`/creches/${expiring.nursery_id}/tablettes`)
  })

  it('mise en route : vers la page de la crèche', () => {
    expect(toDoText(onboarding, TODO_NOW).action).toBe('Voir la mise en route')
    expect(toDoHref(onboarding)).toBe(`/creches/${onboarding.nursery_id}/mise-en-route`)
  })

  it('titre de la page au singulier et au pluriel', () => {
    expect(toDoTitle(1)).toBe('1 chose à régler')
    expect(toDoTitle(4)).toBe('4 choses à régler')
  })
})
