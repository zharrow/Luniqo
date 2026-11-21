import type { Schemas, Session } from '@/api/types'

/** Données fictives (règle 5 d'AGENTS.md). */
export const employee: Session = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'employe@demo.test',
  first_name: 'Lucas',
  last_name: 'Bernard',
  role: 'employee',
  enterprise_id: '00000000-0000-4000-8000-0000000000e1',
  mfa: 'not_required',
}

export const owner: Session = {
  ...employee,
  id: '00000000-0000-4000-8000-000000000002',
  email: 'direction@demo.test',
  first_name: 'Camille',
  last_name: 'Martin',
  role: 'owner',
  mfa: 'required',
}

export const nursery: Schemas['NurseryOut'] = {
  id: '00000000-0000-4000-8000-0000000000c1',
  enterprise_id: employee.enterprise_id ?? '',
  name: 'Crèche Démo Nord',
  address: null,
  postal_code: null,
  city: 'Toulouse',
  phone: null,
  email: null,
  capacity: 12,
  is_active: true,
}

export const nurserySummary: Schemas['NurserySummary'] = { children: 12, present: 8, staff: 4 }

/** Mise en route de la Crèche Démo Nord : 2 succès sur 3, sans pointage (LUN-128). */
export const nurseryOnboarding: Schemas['NurseryOnboarding'] = {
  steps: [
    { milestone: 'staff', achieved: true, achieved_at: '2026-11-03T09:00:00Z' },
    { milestone: 'tablet', achieved: true, achieved_at: '2026-11-04T08:30:00Z' },
    { milestone: 'first_attendance', achieved: false, achieved_at: null },
  ],
}

/** Tablette de la Crèche Démo Nord, vue depuis la tablette elle-même (`GET /api/v2/tablet`). */
export const tabletInfo: Schemas['TabletInfo'] = {
  tablet_id: '00000000-0000-4000-8000-0000000000a1',
  label: "Tablette de l'entrée",
  nursery_id: nursery.id,
  nursery_name: nursery.name,
  staff: [
    { id: employee.id, display_name: 'Lucas B.', pin_set: true, pin_locked: false },
    { id: '00000000-0000-4000-8000-000000000003', display_name: 'Inès M.', pin_set: false, pin_locked: false },
    { id: '00000000-0000-4000-8000-000000000004', display_name: 'Nora P.', pin_set: true, pin_locked: true },
  ],
}

export const tabletActor: Schemas['TabletActorOut'] = {
  user_id: employee.id,
  display_name: 'Lucas B.',
  nursery_id: nursery.id,
  nursery_name: nursery.name,
  expires_at: '2026-10-30T09:32:00Z',
}

export const tablet: Schemas['TabletOut'] = {
  id: '00000000-0000-4000-8000-0000000000a1',
  nursery_id: nursery.id,
  label: "Tablette de l'entrée",
  created_at: '2026-10-30T08:00:00Z',
  expires_at: '2027-01-28T08:00:00Z',
  revoked_at: null,
  last_seen_at: '2026-10-30T09:15:00Z',
}

const garnier: Schemas['TabletGuardian'][] = [
  {
    id: '00000000-0000-4000-8000-0000000000f1',
    display_name: 'Alice G.',
    relationship: 'parent',
    is_authorized_pickup: true,
  },
  {
    id: '00000000-0000-4000-8000-0000000000f2',
    display_name: 'Karim G.',
    relationship: 'parent',
    is_authorized_pickup: true,
  },
]

const lambert: Schemas['TabletGuardian'][] = [
  {
    id: '00000000-0000-4000-8000-0000000000f3',
    display_name: 'Sophie L.',
    relationship: 'parent',
    is_authorized_pickup: true,
  },
  {
    id: '00000000-0000-4000-8000-0000000000f4',
    display_name: 'Jeanne L.',
    relationship: 'other',
    is_authorized_pickup: false,
  },
]

/** Enfants attendus aujourd'hui sur la tablette (`GET /api/v2/tablet/children`). */
export const tabletChildren: Schemas['TabletChild'][] = [
  {
    id: '00000000-0000-4000-8000-0000000000d1',
    first_name: 'Léo',
    last_name: 'Garnier',
    presence: 'absent',
    arrived_at: null,
    departed_at: null,
    guardians: garnier,
  },
  {
    id: '00000000-0000-4000-8000-0000000000d2',
    first_name: 'Emma',
    last_name: 'Lambert',
    presence: 'present',
    arrived_at: '2026-10-30T07:45:00Z',
    departed_at: null,
    guardians: lambert,
  },
  {
    id: '00000000-0000-4000-8000-0000000000d3',
    first_name: 'Jules',
    last_name: 'Lambert',
    presence: 'left',
    arrived_at: '2026-10-30T08:10:00Z',
    departed_at: '2026-10-30T11:30:00Z',
    guardians: lambert,
  },
]

const presence: Schemas['AttendanceOut'] = {
  id: '00000000-0000-4000-8000-0000000000b1',
  child_id: '00000000-0000-4000-8000-0000000000d1',
  child_name: 'Léo Garnier',
  day: '2026-10-30',
  arrived_at: '2026-10-30T07:45:00Z',
  arrival_by: 'Lucas B.',
  dropped_off_by: 'Alice G.',
  departed_at: null,
  departure_by: null,
  picked_up_by: null,
  corrected: false,
}

/** Présences du jour d'une crèche (`GET /api/v2/nurseries/{id}/attendance`), par heure d'arrivée. */
export const dayAttendance: Schemas['AttendanceOut'][] = [
  presence,
  {
    ...presence,
    id: '00000000-0000-4000-8000-0000000000b2',
    child_id: '00000000-0000-4000-8000-0000000000d3',
    child_name: 'Jules Lambert',
    arrived_at: '2026-10-30T08:10:00Z',
    dropped_off_by: null,
    departed_at: '2026-10-30T11:30:00Z',
    departure_by: 'Lucas B.',
    picked_up_by: 'Jeanne L.',
  },
  {
    ...presence,
    id: '00000000-0000-4000-8000-0000000000b3',
    child_id: '00000000-0000-4000-8000-0000000000d2',
    child_name: 'Emma Lambert',
    arrived_at: '2026-10-30T08:20:00Z',
    arrival_by: 'Inès M.',
    dropped_off_by: 'Sophie L.',
  },
]

/** Transmissions du 30 octobre 2026 (`GET /api/v2/nurseries/{id}/notes`), les plus récentes d'abord (LUN-146). */
export const dayNotes: Schemas['NoteOut'][] = [
  {
    id: '00000000-0000-4000-8000-0000000000e3',
    child_id: presence.child_id,
    child_name: 'Léo Garnier',
    day: '2026-10-30',
    text: 'A bien mangé, sieste de 13 h à 15 h',
    author: 'Inès M.',
    created_at: '2026-10-30T14:05:00Z',
  },
  {
    id: '00000000-0000-4000-8000-0000000000e2',
    child_id: '00000000-0000-4000-8000-0000000000d2',
    child_name: 'Emma Lambert',
    day: '2026-10-30',
    text: 'Un peu fatiguée, à dire aux parents',
    author: 'Lucas B.',
    created_at: '2026-10-30T10:30:00Z',
  },
  {
    id: '00000000-0000-4000-8000-0000000000e1',
    child_id: presence.child_id,
    child_name: 'Léo Garnier',
    day: '2026-10-30',
    text: 'Arrivé de bonne humeur',
    author: 'Lucas B.',
    created_at: '2026-10-30T08:00:00Z',
  },
]

/**
 * Présences d'une période (`GET …/attendance/history`), par jour puis par heure
 * d'arrivée, vues le 30 octobre 2026 : le départ de Léo n'a pas été pointé le 28.
 */
export const periodAttendance: Schemas['AttendanceOut'][] = [
  {
    ...presence,
    id: '00000000-0000-4000-8000-0000000000c1',
    day: '2026-10-28',
    arrived_at: '2026-10-28T07:50:00Z',
  },
  {
    ...presence,
    id: '00000000-0000-4000-8000-0000000000c2',
    day: '2026-10-29',
    arrived_at: '2026-10-29T07:40:00Z',
    departed_at: '2026-10-29T16:05:00Z',
    departure_by: 'Inès M.',
    picked_up_by: 'Alice G.',
  },
  {
    ...presence,
    id: '00000000-0000-4000-8000-0000000000c3',
    child_id: '00000000-0000-4000-8000-0000000000d2',
    child_name: 'Emma Lambert',
    day: '2026-10-29',
    arrived_at: '2026-10-29T08:15:00Z',
    dropped_off_by: 'Sophie L.',
    departed_at: '2026-10-29T15:30:00Z',
    departure_by: 'Lucas B.',
    picked_up_by: 'Sophie L.',
  },
  ...dayAttendance,
]

function guardianLink(
  id: string,
  first_name: string,
  last_name: string,
  is_authorized_pickup: boolean,
  relationship: Schemas['Relationship'] = 'parent',
): Schemas['ChildGuardianOut'] {
  return {
    guardian: {
      id,
      family_id: '00000000-0000-4000-8000-0000000000e1',
      first_name,
      last_name,
      email: null,
      phone: null,
      has_account: false,
      is_active: true,
    },
    relationship,
    has_parental_authority: relationship === 'parent',
    is_authorized_pickup,
    is_emergency_contact: true,
  }
}

/** Enfants de la crèche (`GET /api/v2/nurseries/{id}/children`). */
export const nurseryChildren: Schemas['ChildOut'][] = [
  {
    id: '00000000-0000-4000-8000-0000000000d1',
    family_id: '00000000-0000-4000-8000-0000000000e1',
    nursery_id: nursery.id,
    first_name: 'Léo',
    last_name: 'Garnier',
    birth_date: '2024-03-12',
    status: 'active',
    enrollment_date: '2025-09-01',
    exit_date: null,
  },
  {
    id: '00000000-0000-4000-8000-0000000000d2',
    family_id: '00000000-0000-4000-8000-0000000000e2',
    nursery_id: nursery.id,
    first_name: 'Emma',
    last_name: 'Lambert',
    birth_date: '2023-11-02',
    status: 'active',
    enrollment_date: '2025-09-01',
    exit_date: null,
  },
]

/** Fiche de Léo (`GET …/children/{id}`) : ses deux parents peuvent venir le chercher. */
export const leoDetail: Schemas['ChildDetail'] = {
  ...(nurseryChildren[0] as Schemas['ChildOut']),
  guardians: [
    guardianLink('00000000-0000-4000-8000-0000000000f1', 'Alice', 'Garnier', true),
    guardianLink('00000000-0000-4000-8000-0000000000f2', 'Karim', 'Garnier', true),
  ],
}

/** Fiche d'Emma : Jeanne, une proche, n'est pas autorisée à venir la chercher. */
export const emmaDetail: Schemas['ChildDetail'] = {
  ...(nurseryChildren[1] as Schemas['ChildOut']),
  guardians: [
    guardianLink('00000000-0000-4000-8000-0000000000f3', 'Sophie', 'Lambert', true),
    guardianLink('00000000-0000-4000-8000-0000000000f4', 'Jeanne', 'Lambert', false, 'other'),
  ],
}

/** Journal des corrections d'une période (`GET …/attendance/corrections`). */
export const corrections: Schemas['CorrectionOut'][] = [
  {
    id: '00000000-0000-4000-8000-000000000a01',
    attendance_id: '00000000-0000-4000-8000-0000000000c2',
    child_id: '00000000-0000-4000-8000-0000000000d1',
    child_name: 'Léo Garnier',
    day: '2026-10-29',
    kind: 'modified',
    reason: 'Départ pointé en retard',
    corrected_at: '2026-10-30T09:12:00Z',
    corrected_by: 'Camille Martin',
    before: {
      arrived_at: '2026-10-29T07:40:00Z',
      departed_at: '2026-10-29T16:20:00Z',
      dropped_off_by: 'Alice Garnier',
      picked_up_by: 'Alice Garnier',
    },
    after: {
      arrived_at: '2026-10-29T07:40:00Z',
      departed_at: '2026-10-29T16:05:00Z',
      dropped_off_by: 'Alice Garnier',
      picked_up_by: 'Alice Garnier',
    },
  },
  {
    id: '00000000-0000-4000-8000-000000000a02',
    attendance_id: null,
    child_id: '00000000-0000-4000-8000-0000000000d2',
    child_name: 'Emma Lambert',
    day: '2026-10-29',
    kind: 'cancelled',
    reason: 'Pointée sur le mauvais enfant',
    corrected_at: '2026-10-30T09:20:00Z',
    corrected_by: 'Camille Martin',
    before: {
      arrived_at: '2026-10-29T08:00:00Z',
      departed_at: '2026-10-29T08:02:00Z',
      dropped_off_by: null,
      picked_up_by: null,
    },
    after: null,
  },
]

/** Instant fixe des éléments « À traiter » : samedi 21 novembre 2026, 10 h à Paris (LUN-154). */
export const TODO_NOW = new Date('2026-11-21T09:00:00Z')

const sud = { nursery_id: '00000000-0000-4000-8000-0000000000c2', nursery_name: 'Micro-crèche Démo Sud' }

/** Un élément de chaque genre, dans l'ordre de l'API (LUN-153), plus deux pour dépasser 5 lignes. */
export const toDoItems: Schemas['ToDoItem'][] = [
  {
    kind: 'pin_locked',
    nursery_id: nursery.id,
    nursery_name: nursery.name,
    subject_id: employee.id,
    subject_name: 'Lucas Bernard',
    since: '2026-11-20T07:42:00Z',
    day: null,
  },
  {
    kind: 'tablet_expired',
    nursery_id: sud.nursery_id,
    nursery_name: sud.nursery_name,
    subject_id: '00000000-0000-4000-8000-0000000000b2',
    subject_name: 'Tablette du dortoir',
    since: '2026-11-10T09:00:00Z',
    day: null,
  },
  {
    kind: 'departure_missing',
    nursery_id: nursery.id,
    nursery_name: nursery.name,
    subject_id: '00000000-0000-4000-8000-0000000000d1',
    subject_name: 'Léo Garnier',
    since: '2026-11-20T07:18:00Z',
    day: '2026-11-20',
  },
  {
    kind: 'departure_missing',
    nursery_id: sud.nursery_id,
    nursery_name: sud.nursery_name,
    subject_id: '00000000-0000-4000-8000-0000000000d3',
    subject_name: 'Nina Roche',
    since: '2026-11-17T07:55:00Z',
    day: '2026-11-17',
  },
  {
    kind: 'tablet_expiring',
    nursery_id: nursery.id,
    nursery_name: nursery.name,
    subject_id: '00000000-0000-4000-8000-0000000000b1',
    subject_name: 'Tablette de l’entrée',
    since: '2026-11-24T09:00:00Z',
    day: null,
  },
  {
    kind: 'onboarding_incomplete',
    nursery_id: sud.nursery_id,
    nursery_name: sud.nursery_name,
    subject_id: sud.nursery_id,
    subject_name: sud.nursery_name,
    since: '2026-11-01T09:00:00Z',
    day: null,
  },
  {
    kind: 'onboarding_incomplete',
    nursery_id: nursery.id,
    nursery_name: nursery.name,
    subject_id: nursery.id,
    subject_name: nursery.name,
    since: '2026-11-02T09:00:00Z',
    day: null,
  },
]
