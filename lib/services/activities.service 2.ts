// @ts-nocheck
/**
 * ActivitiesService - Gestion des activités pédagogiques
 *
 * NOTE: Phase 2 tables (activity, activity_participation, activity_document)
 * require migration 18 to be applied to Supabase before use.
 * Type checking is disabled until database types are regenerated.
 *
 * Fonctionnalités:
 * - Planification d'activités
 * - Participation des enfants
 * - Documents et médias d'activités
 * - Suivi pédagogique
 */

import { createClient } from '@/lib/supabase/server'

// =====================================================
// Types
// =====================================================

export type ActivityCategory =
  | 'arts'
  | 'music'
  | 'outdoor'
  | 'reading'
  | 'science'
  | 'motor_skills'
  | 'sensory'
  | 'language'
  | 'social'
  | 'cooking'

export type AgeGroup = 'babies' | 'toddlers' | 'preschool' | 'all'

export type ActivityStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled'

export type EngagementLevel = 'high' | 'medium' | 'low' | 'refused'

export type DocumentType = 'photo' | 'video' | 'production' | 'document'

export interface Activity {
  id: string
  nursery_id: string
  name: string
  description?: string
  category: ActivityCategory
  age_group?: AgeGroup
  planned_date?: string
  planned_time?: string
  duration_minutes?: number
  learning_objectives?: string[]
  skills_developed?: string[]
  materials_needed?: string[]
  preparation_notes?: string
  led_by_id?: string
  status: ActivityStatus
  created_at: string
  updated_at: string
}

export interface ActivityParticipation {
  id: string
  activity_id: string
  child_id: string
  attended: boolean
  engagement_level?: EngagementLevel
  enjoyed?: boolean
  notes?: string
  skills_observed?: string[]
  media_urls?: string[]
  recorded_by_id?: string
  recorded_at: string
  created_at: string
}

export interface ActivityDocument {
  id: string
  activity_id: string
  document_type: DocumentType
  file_url: string
  file_name?: string
  file_size?: number
  caption?: string
  tags?: string[]
  children_ids?: string[]
  uploaded_by_id?: string
  uploaded_at: string
  created_at: string
}

export interface CreateActivityInput {
  nursery_id: string
  name: string
  description?: string
  category: ActivityCategory
  age_group?: AgeGroup
  planned_date?: string
  planned_time?: string
  duration_minutes?: number
  learning_objectives?: string[]
  skills_developed?: string[]
  materials_needed?: string[]
  preparation_notes?: string
  led_by_id?: string
  status?: ActivityStatus
}

export interface CreateParticipationInput {
  activity_id: string
  child_id: string
  attended?: boolean
  engagement_level?: EngagementLevel
  enjoyed?: boolean
  notes?: string
  skills_observed?: string[]
  media_urls?: string[]
  recorded_by_id?: string
}

export interface CreateActivityDocumentInput {
  activity_id: string
  document_type: DocumentType
  file_url: string
  file_name?: string
  file_size?: number
  caption?: string
  tags?: string[]
  children_ids?: string[]
  uploaded_by_id?: string
}

export interface ActivityWithDetails extends Activity {
  led_by?: {
    first_name: string
    last_name: string
  }
  participation_count?: number
  documents_count?: number
}

export interface ParticipationWithChild extends ActivityParticipation {
  child: {
    first_name: string
    last_name: string
    photo_url?: string
  }
}

// =====================================================
// ActivitiesService
// =====================================================

class ActivitiesService {

  // ========== Activities (Activités) ==========

  /**
   * Créer une activité
   */
  async create(input: CreateActivityInput): Promise<Activity> {
    const supabase = await createClient()

    // Table 'activity' requires Phase 2 migrations to be applied first
    const { data, error } = await (supabase as any)
      .from('activity')
      .insert(input)
      .select()
      .single()

    if (error) throw error
    return data as Activity
  }

  /**
   * Obtenir toutes les activités d'une crèche
   */
  async getAll(nurseryId: string): Promise<ActivityWithDetails[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('activity')
      .select(`
        *,
        led_by:led_by_id (
          first_name,
          last_name
        )
      `)
      .eq('nursery_id', nurseryId)
      .order('planned_date', { ascending: false, nullsFirst: false })

    if (error) throw error
    return data || []
  }

  /**
   * Obtenir les activités planifiées (à venir)
   */
  async getUpcoming(nurseryId: string): Promise<ActivityWithDetails[]> {
    const supabase = await createClient()
    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('activity')
      .select(`
        *,
        led_by:led_by_id (
          first_name,
          last_name
        )
      `)
      .eq('nursery_id', nurseryId)
      .in('status', ['planned', 'in_progress'])
      .gte('planned_date', today)
      .order('planned_date', { ascending: true })

    if (error) throw error
    return data || []
  }

  /**
   * Obtenir les activités du jour
   */
  async getToday(nurseryId: string): Promise<ActivityWithDetails[]> {
    const supabase = await createClient()
    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('activity')
      .select(`
        *,
        led_by:led_by_id (
          first_name,
          last_name
        )
      `)
      .eq('nursery_id', nurseryId)
      .eq('planned_date', today)
      .order('planned_time', { ascending: true, nullsFirst: false })

    if (error) throw error
    return data || []
  }

  /**
   * Obtenir les activités par catégorie
   */
  async getByCategory(nurseryId: string, category: ActivityCategory): Promise<Activity[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('activity')
      .select('*')
      .eq('nursery_id', nurseryId)
      .eq('category', category)
      .order('planned_date', { ascending: false, nullsFirst: false })

    if (error) throw error
    return data || []
  }

  /**
   * Obtenir une activité par ID
   */
  async getById(id: string): Promise<ActivityWithDetails | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('activity')
      .select(`
        *,
        led_by:led_by_id (
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
   * Mettre à jour une activité
   */
  async update(id: string, updates: Partial<Activity>): Promise<Activity> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('activity')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Changer le statut d'une activité
   */
  async updateStatus(id: string, status: ActivityStatus): Promise<Activity> {
    return this.update(id, { status })
  }

  /**
   * Supprimer une activité
   */
  async delete(id: string): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase
      .from('activity')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // ========== Participation ==========

  /**
   * Enregistrer la participation d'un enfant
   */
  async recordParticipation(input: CreateParticipationInput): Promise<ActivityParticipation> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('activity_participation')
      .insert(input)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Enregistrer plusieurs participations en masse
   */
  async recordBulkParticipation(
    activityId: string,
    childIds: string[],
    recordedById: string
  ): Promise<ActivityParticipation[]> {
    const supabase = await createClient()

    const participations = childIds.map(childId => ({
      activity_id: activityId,
      child_id: childId,
      attended: true,
      recorded_by_id: recordedById
    }))

    const { data, error } = await supabase
      .from('activity_participation')
      .insert(participations)
      .select()

    if (error) throw error
    return data || []
  }

  /**
   * Obtenir les participants d'une activité
   */
  async getParticipants(activityId: string): Promise<ParticipationWithChild[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('activity_participation')
      .select(`
        *,
        child:child_id (
          first_name,
          last_name,
          photo_url
        )
      `)
      .eq('activity_id', activityId)
      .order('child(last_name)', { ascending: true })

    if (error) throw error
    return data || []
  }

  /**
   * Obtenir les activités d'un enfant
   */
  async getChildActivities(childId: string): Promise<ActivityParticipation[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('activity_participation')
      .select(`
        *,
        activity:activity_id (
          name,
          category,
          planned_date,
          status
        )
      `)
      .eq('child_id', childId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * Mettre à jour une participation
   */
  async updateParticipation(
    id: string,
    updates: Partial<ActivityParticipation>
  ): Promise<ActivityParticipation> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('activity_participation')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Supprimer une participation
   */
  async deleteParticipation(id: string): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase
      .from('activity_participation')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // ========== Documents ==========

  /**
   * Ajouter un document à une activité
   */
  async addDocument(input: CreateActivityDocumentInput): Promise<ActivityDocument> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('activity_document')
      .insert(input)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Obtenir les documents d'une activité
   */
  async getDocuments(activityId: string): Promise<ActivityDocument[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('activity_document')
      .select('*')
      .eq('activity_id', activityId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * Obtenir les documents par type
   */
  async getDocumentsByType(
    activityId: string,
    documentType: DocumentType
  ): Promise<ActivityDocument[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('activity_document')
      .select('*')
      .eq('activity_id', activityId)
      .eq('document_type', documentType)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * Supprimer un document
   */
  async deleteDocument(id: string): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase
      .from('activity_document')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // ========== Statistiques ==========

  /**
   * Statistiques activités pour une crèche
   */
  async getStatistics(nurseryId: string, startDate?: string, endDate?: string) {
    const supabase = await createClient()

    let query = supabase
      .from('activity')
      .select('id, category, status, planned_date')
      .eq('nursery_id', nurseryId)

    if (startDate) {
      query = query.gte('planned_date', startDate)
    }

    if (endDate) {
      query = query.lte('planned_date', endDate)
    }

    const { data, error } = await query

    if (error) throw error

    const activities = data || []

    return {
      total: activities.length,
      planned: activities.filter(a => a.status === 'planned').length,
      completed: activities.filter(a => a.status === 'completed').length,
      cancelled: activities.filter(a => a.status === 'cancelled').length,
      byCategory: {
        arts: activities.filter(a => a.category === 'arts').length,
        music: activities.filter(a => a.category === 'music').length,
        outdoor: activities.filter(a => a.category === 'outdoor').length,
        reading: activities.filter(a => a.category === 'reading').length,
        science: activities.filter(a => a.category === 'science').length,
        motor_skills: activities.filter(a => a.category === 'motor_skills').length,
        sensory: activities.filter(a => a.category === 'sensory').length,
        language: activities.filter(a => a.category === 'language').length,
        social: activities.filter(a => a.category === 'social').length,
        cooking: activities.filter(a => a.category === 'cooking').length
      }
    }
  }

  /**
   * Statistiques de participation pour un enfant
   */
  async getChildParticipationStats(childId: string) {
    const participations = await this.getChildActivities(childId)

    return {
      total: participations.length,
      attended: participations.filter(p => p.attended).length,
      highEngagement: participations.filter(p => p.engagement_level === 'high').length,
      enjoyed: participations.filter(p => p.enjoyed === true).length,
      skillsObserved: participations
        .flatMap(p => p.skills_observed || [])
        .filter((skill, index, self) => self.indexOf(skill) === index) // Unique skills
    }
  }
}

export const activitiesService = new ActivitiesService()
