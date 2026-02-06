// @ts-nocheck
/**
 * ObservationsService - Observations pédagogiques des enfants
 *
 * NOTE: Phase 2 tables (child_observation, child_planned_schedule)
 * require migration 19 to be applied to Supabase before use.
 * Type checking is disabled until database types are regenerated.
 *
 * Fonctionnalités:
 * - Enregistrement d'observations
 * - Suivi du développement par domaine
 * - Jalons de développement
 * - Partage avec parents
 */

import { createClient } from '@/lib/supabase/server'

// =====================================================
// Types
// =====================================================

export type ObservationCategory =
  | 'motor'           // Motricité
  | 'language'        // Langage
  | 'social'          // Interactions sociales
  | 'emotional'       // Émotionnel
  | 'cognitive'       // Cognitif
  | 'autonomy'        // Autonomie
  | 'creativity'      // Créativité

export type ObservationContext =
  | 'during_play'
  | 'during_meal'
  | 'during_activity'
  | 'free_time'
  | 'outdoor'
  | 'naptime'
  | 'arrival'
  | 'departure'

export interface ChildObservation {
  id: string
  child_id: string
  nursery_id: string
  observation_date: string
  observation_time?: string
  category: ObservationCategory
  context?: ObservationContext
  description: string
  behaviors_observed?: string[]
  skills_demonstrated?: string[]
  milestone_achieved: boolean
  milestone_description?: string
  follow_up_needed: boolean
  recommendations?: string
  is_shared_with_parents: boolean
  shared_at?: string
  observed_by_id: string
  created_at: string
  updated_at: string
}

export interface CreateObservationInput {
  child_id: string
  nursery_id: string
  observation_date: string
  observation_time?: string
  category: ObservationCategory
  context?: ObservationContext
  description: string
  behaviors_observed?: string[]
  skills_demonstrated?: string[]
  milestone_achieved?: boolean
  milestone_description?: string
  follow_up_needed?: boolean
  recommendations?: string
  is_shared_with_parents?: boolean
  observed_by_id: string
}

export interface ObservationWithDetails extends ChildObservation {
  child?: {
    first_name: string
    last_name: string
    photo_url?: string
  }
  observed_by?: {
    first_name: string
    last_name: string
  }
}

export interface ObservationSummary {
  category: ObservationCategory
  count: number
  milestones: number
  last_observation_date?: string
}

// =====================================================
// ObservationsService
// =====================================================

class ObservationsService {

  // ========== CRUD Operations ==========

  /**
   * Créer une observation
   */
  async create(input: CreateObservationInput): Promise<ChildObservation> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('child_observation')
      .insert(input)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Obtenir toutes les observations d'un enfant
   */
  async getByChild(childId: string): Promise<ObservationWithDetails[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('child_observation')
      .select(`
        *,
        observed_by:observed_by_id (
          first_name,
          last_name
        )
      `)
      .eq('child_id', childId)
      .order('observation_date', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * Obtenir les observations par catégorie
   */
  async getByCategory(
    childId: string,
    category: ObservationCategory
  ): Promise<ObservationWithDetails[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('child_observation')
      .select(`
        *,
        observed_by:observed_by_id (
          first_name,
          last_name
        )
      `)
      .eq('child_id', childId)
      .eq('category', category)
      .order('observation_date', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * Obtenir toutes les observations d'une crèche
   */
  async getByNursery(nurseryId: string, limit?: number): Promise<ObservationWithDetails[]> {
    const supabase = await createClient()

    let query = supabase
      .from('child_observation')
      .select(`
        *,
        child:child_id (
          first_name,
          last_name,
          photo_url
        ),
        observed_by:observed_by_id (
          first_name,
          last_name
        )
      `)
      .eq('nursery_id', nurseryId)
      .order('observation_date', { ascending: false })

    if (limit) {
      query = query.limit(limit)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  }

  /**
   * Obtenir les observations du jour
   */
  async getToday(nurseryId: string): Promise<ObservationWithDetails[]> {
    const supabase = await createClient()
    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('child_observation')
      .select(`
        *,
        child:child_id (
          first_name,
          last_name,
          photo_url
        ),
        observed_by:observed_by_id (
          first_name,
          last_name
        )
      `)
      .eq('nursery_id', nurseryId)
      .eq('observation_date', today)
      .order('observation_time', { ascending: false, nullsFirst: false })

    if (error) throw error
    return data || []
  }

  /**
   * Obtenir les observations pour une période
   */
  async getByDateRange(
    nurseryId: string,
    startDate: string,
    endDate: string
  ): Promise<ObservationWithDetails[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('child_observation')
      .select(`
        *,
        child:child_id (
          first_name,
          last_name,
          photo_url
        ),
        observed_by:observed_by_id (
          first_name,
          last_name
        )
      `)
      .eq('nursery_id', nurseryId)
      .gte('observation_date', startDate)
      .lte('observation_date', endDate)
      .order('observation_date', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * Obtenir une observation par ID
   */
  async getById(id: string): Promise<ObservationWithDetails | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('child_observation')
      .select(`
        *,
        child:child_id (
          first_name,
          last_name,
          photo_url
        ),
        observed_by:observed_by_id (
          first_name,
          last_name
        )
      `)
      .eq('id', id)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data || null
  }

  /**
   * Mettre à jour une observation
   */
  async update(id: string, updates: Partial<ChildObservation>): Promise<ChildObservation> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('child_observation')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Supprimer une observation
   */
  async delete(id: string): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase
      .from('child_observation')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // ========== Jalons & Partage ==========

  /**
   * Obtenir les jalons (milestones) d'un enfant
   */
  async getMilestones(childId: string): Promise<ObservationWithDetails[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('child_observation')
      .select(`
        *,
        observed_by:observed_by_id (
          first_name,
          last_name
        )
      `)
      .eq('child_id', childId)
      .eq('milestone_achieved', true)
      .order('observation_date', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * Partager une observation avec les parents
   */
  async shareWithParents(id: string): Promise<ChildObservation> {
    return this.update(id, {
      is_shared_with_parents: true,
      shared_at: new Date().toISOString()
    })
  }

  /**
   * Retirer le partage d'une observation
   */
  async unshareWithParents(id: string): Promise<ChildObservation> {
    return this.update(id, {
      is_shared_with_parents: false,
      shared_at: undefined
    })
  }

  /**
   * Obtenir les observations partagées pour un enfant
   */
  async getSharedObservations(childId: string): Promise<ObservationWithDetails[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('child_observation')
      .select(`
        *,
        observed_by:observed_by_id (
          first_name,
          last_name
        )
      `)
      .eq('child_id', childId)
      .eq('is_shared_with_parents', true)
      .order('observation_date', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * Obtenir les observations nécessitant un suivi
   */
  async getFollowUpNeeded(nurseryId: string): Promise<ObservationWithDetails[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('child_observation')
      .select(`
        *,
        child:child_id (
          first_name,
          last_name,
          photo_url
        ),
        observed_by:observed_by_id (
          first_name,
          last_name
        )
      `)
      .eq('nursery_id', nurseryId)
      .eq('follow_up_needed', true)
      .order('observation_date', { ascending: true })

    if (error) throw error
    return data || []
  }

  // ========== Résumés & Statistiques ==========

  /**
   * Résumé des observations par catégorie pour un enfant
   */
  async getCategorySummary(childId: string): Promise<ObservationSummary[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('child_observation')
      .select('category, milestone_achieved, observation_date')
      .eq('child_id', childId)

    if (error) throw error

    const observations = data || []

    // Group by category
    const categories: ObservationCategory[] = [
      'motor',
      'language',
      'social',
      'emotional',
      'cognitive',
      'autonomy',
      'creativity'
    ]

    return categories.map(category => {
      const categoryObs = observations.filter(o => o.category === category)

      return {
        category,
        count: categoryObs.length,
        milestones: categoryObs.filter(o => o.milestone_achieved).length,
        last_observation_date: categoryObs.length > 0
          ? categoryObs.sort((a, b) => b.observation_date.localeCompare(a.observation_date))[0].observation_date
          : undefined
      }
    })
  }

  /**
   * Statistiques globales pour une crèche
   */
  async getStatistics(nurseryId: string, startDate?: string, endDate?: string) {
    const supabase = await createClient()

    let query = supabase
      .from('child_observation')
      .select('id, category, milestone_achieved, follow_up_needed, is_shared_with_parents')
      .eq('nursery_id', nurseryId)

    if (startDate) {
      query = query.gte('observation_date', startDate)
    }

    if (endDate) {
      query = query.lte('observation_date', endDate)
    }

    const { data, error } = await query

    if (error) throw error

    const observations = data || []

    return {
      total: observations.length,
      milestones: observations.filter(o => o.milestone_achieved).length,
      followUpNeeded: observations.filter(o => o.follow_up_needed).length,
      sharedWithParents: observations.filter(o => o.is_shared_with_parents).length,
      byCategory: {
        motor: observations.filter(o => o.category === 'motor').length,
        language: observations.filter(o => o.category === 'language').length,
        social: observations.filter(o => o.category === 'social').length,
        emotional: observations.filter(o => o.category === 'emotional').length,
        cognitive: observations.filter(o => o.category === 'cognitive').length,
        autonomy: observations.filter(o => o.category === 'autonomy').length,
        creativity: observations.filter(o => o.category === 'creativity').length
      }
    }
  }

  /**
   * Obtenir les compétences observées pour un enfant
   */
  async getObservedSkills(childId: string): Promise<string[]> {
    const observations = await this.getByChild(childId)

    const allSkills = observations.flatMap(o => o.skills_demonstrated || [])

    // Retourner les compétences uniques
    return [...new Set(allSkills)]
  }

  /**
   * Obtenir les comportements observés pour un enfant
   */
  async getObservedBehaviors(childId: string): Promise<string[]> {
    const observations = await this.getByChild(childId)

    const allBehaviors = observations.flatMap(o => o.behaviors_observed || [])

    // Retourner les comportements uniques
    return [...new Set(allBehaviors)]
  }
}

export const observationsService = new ObservationsService()
