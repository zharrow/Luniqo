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
