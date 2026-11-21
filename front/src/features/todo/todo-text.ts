import type { Schemas } from '@/api/types'
import { addDays, daysBetween, formatDate, formatDay, formatTime, todayInParis } from '@/lib/dates'

import type { FamilyId } from '../shell/families'

export type ToDoItem = Schemas['ToDoItem']
export type ToDoKind = ToDoItem['kind']

/** Ce que la ligne affiche ; l'API n'envoie que des faits (LUN-153), les phrases sont écrites ici. */
export type ToDoText = {
  /** Famille du menu dont la ligne reprend l'icône et les couleurs. */
  family: FamilyId
  title: string
  detail: string
  /** Libellé de l'unique bouton de la ligne. */
  action: string
}

/** Jour de Paris d'un instant renvoyé par l'API. */
function parisDayOf(iso: string): string {
  return todayInParis(new Date(iso))
}

/** « aujourd'hui », « demain », « dans 3 jours ». */
function untilDay(today: string, day: string): string {
  const days = daysBetween(today, day)
  if (days <= 0) return 'aujourd’hui'
  if (days === 1) return 'demain'
  return `dans ${String(days)} jours`
}

/** « hier » ou « le 18 novembre 2026 ». */
function pastDay(today: string, day: string): string {
  return day === addDays(today, -1) ? 'hier' : `le ${formatDay(day)}`
}

/**
 * Phrase et bouton d'un élément « À traiter ». `now` : instant de l'affichage, pour écrire
 * « hier » ou « dans 3 jours » au jour de Paris.
 */
export function toDoText(item: ToDoItem, now: Date = new Date()): ToDoText {
  const today = todayInParis(now)
  switch (item.kind) {
    case 'pin_locked':
      return {
        family: 'team',
        title: 'PIN bloqué',
        detail: `${item.subject_name} ne peut plus s’identifier sur la tablette depuis le ${formatDate(item.since)}.`,
        action: 'Débloquer',
      }
    case 'tablet_expired':
      return {
        family: 'team',
        title: `La tablette « ${item.subject_name} » a expiré`,
        detail: `Depuis le ${formatDate(item.since)}, l’équipe ne peut plus y pointer. Enrôlez-la de nouveau.`,
        action: 'Enrôler de nouveau',
      }
    case 'departure_missing': {
      const day = item.day ?? parisDayOf(item.since)
      return {
        family: 'today',
        title: `Départ non pointé ${pastDay(today, day)}`,
        detail: `${item.subject_name} : arrivée à ${formatTime(item.since)}, aucun départ enregistré.`,
        action: 'Corriger',
      }
    }
    case 'tablet_expiring':
      // `since` est ici l'expiration à venir (LUN-153).
      return {
        family: 'team',
        title: `La tablette « ${item.subject_name} » expire ${untilDay(today, parisDayOf(item.since))}`,
        detail: `Le ${formatDate(item.since)} à ${formatTime(item.since)}. Renouvelez-la pour que l’équipe continue à pointer.`,
        action: 'Renouveler',
      }
    case 'onboarding_incomplete':
      return {
        family: 'admin',
        title: 'Mise en route à terminer',
        detail: 'Il reste des étapes avant que l’équipe puisse pointer les enfants au quotidien.',
        action: 'Voir la mise en route',
      }
  }
}

/** Écran où faire le geste ; `null` pour le PIN, débloqué sur place. */
export function toDoHref(item: ToDoItem): string | null {
  const nursery = `/creches/${item.nursery_id}`
  switch (item.kind) {
    case 'pin_locked':
      return null
    case 'tablet_expired':
    case 'tablet_expiring':
      return `${nursery}/tablettes`
    case 'departure_missing': {
      const day = item.day ?? parisDayOf(item.since)
      return `${nursery}/presences/historique?du=${day}&au=${day}`
    }
    case 'onboarding_incomplete':
      return `${nursery}/mise-en-route`
  }
}

/** « 1 chose à régler », « 4 choses à régler ». */
export function toDoTitle(total: number): string {
  return `${String(total)} ${total === 1 ? 'chose' : 'choses'} à régler`
}
