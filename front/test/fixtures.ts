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
