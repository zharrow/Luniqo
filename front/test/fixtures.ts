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

export const tablet: Schemas['TabletOut'] = {
  id: '00000000-0000-4000-8000-0000000000a1',
  nursery_id: nursery.id,
  label: "Tablette de l'entrée",
  created_at: '2026-10-30T08:00:00Z',
  expires_at: '2027-01-28T08:00:00Z',
  revoked_at: null,
  last_seen_at: '2026-10-30T09:15:00Z',
}
