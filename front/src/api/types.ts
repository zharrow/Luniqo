import type { components } from './schema'

/** Schémas de l'API, générés depuis /api/openapi.json (scripts/openapi.sh). */
export type Schemas = components['schemas']
export type Session = Schemas['SessionOut']
export type MfaState = Schemas['MfaState']
