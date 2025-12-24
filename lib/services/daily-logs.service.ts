// @ts-nocheck
/**
 * DailyLogsService - Logs quotidiens (repas, siestes, changes)
 *
 * NOTE: Phase 2 tables (child_meal_log, child_sleep_log, child_change_log)
 * require migration 17 to be applied to Supabase before use.
 * Type checking is disabled until database types are regenerated.
 *
 * Fonctionnalités:
 * - Logs repas détaillés
 * - Logs de siestes
 * - Logs de changes/hygiène
 * - Timeline journée enfant
 */

import { createClient } from '@/lib/supabase/server'

// =====================================================
// Types
// =====================================================

export type MealType = 'breakfast' | 'morning_snack' | 'lunch' | 'afternoon_snack' | 'dinner'
export type Appetite = 'good' | 'normal' | 'poor' | 'refused'
export type QuantityEaten = 'all' | 'most' | 'half' | 'quarter' | 'none'
export type SleepQuality = 'deep' | 'light' | 'restless' | 'interrupted'
export type SleepLocation = 'crib' | 'mat' | 'stroller' | 'bed'
export type ChangeType = 'diaper' | 'toilet' | 'accident'
export type SkinCondition = 'normal' | 'red' | 'rash' | 'irritated'

export interface ChildMealLog {
  id: string
  child_id: string
  nursery_id: string
  date: string
  meal_time: string
  meal_type: MealType
  meal_id?: string
  appetite: Appetite
  quantity_eaten: QuantityEaten
  liked?: boolean
  refused_items?: string[]
  allergy_noted: boolean
  special_notes?: string
  logged_by_id: string
  logged_at: string
  created_at: string
}

export interface ChildSleepLog {
  id: string
  child_id: string
  nursery_id: string
  date: string
  sleep_start_time: string
  sleep_end_time?: string
  duration_minutes?: number
  sleep_quality?: SleepQuality
  woke_up_crying: boolean
  notes?: string
  sleep_location?: SleepLocation
  logged_by_id: string
  logged_at: string
  created_at: string
}

export interface ChildChangeLog {
  id: string
  child_id: string
  nursery_id: string
  date: string
  time: string
  change_type: ChangeType
  is_wet: boolean
  is_soiled: boolean
  skin_condition?: SkinCondition
  cream_applied: boolean
  cream_type?: string
  asked_for_toilet: boolean
  successful_toilet: boolean
  notes?: string
  changed_by_id: string
  logged_at: string
  created_at: string
}

export interface CreateMealLogInput {
  child_id: string
  nursery_id: string
  date: string
  meal_time: string
  meal_type: MealType
  meal_id?: string
  appetite: Appetite
  quantity_eaten: QuantityEaten
  liked?: boolean
  refused_items?: string[]
  allergy_noted?: boolean
  special_notes?: string
  logged_by_id: string
}

export interface CreateSleepLogInput {
  child_id: string
  nursery_id: string
  date: string
  sleep_start_time: string
  sleep_end_time?: string
  sleep_quality?: SleepQuality
  woke_up_crying?: boolean
  notes?: string
  sleep_location?: SleepLocation
  logged_by_id: string
}

export interface CreateChangeLogInput {
  child_id: string
  nursery_id: string
  date: string
  time: string
  change_type: ChangeType
  is_wet?: boolean
  is_soiled?: boolean
  skin_condition?: SkinCondition
  cream_applied?: boolean
  cream_type?: string
  asked_for_toilet?: boolean
  successful_toilet?: boolean
  notes?: string
  changed_by_id: string
}

export interface ChildDaySummary {
  meals: ChildMealLog[]
  sleeps: ChildSleepLog[]
  changes: ChildChangeLog[]
}

export interface MealLogWithDetails extends ChildMealLog {
  logged_by?: {
    first_name: string
    last_name: string
  }
  meal?: {
    name: string
    meal_type: string
  }
}

// =====================================================
// DailyLogsService
// =====================================================

class DailyLogsService {

  // ========== Meal Logs (Repas) ==========

  /**
   * Créer un log de repas
   */
  async createMealLog(input: CreateMealLogInput): Promise<ChildMealLog> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('child_meal_log')
      .insert(input)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Obtenir les logs de repas d'un enfant pour une date
   */
  async getMealLogsByDate(childId: string, date: string): Promise<MealLogWithDetails[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('child_meal_log')
      .select(`
        *,
        logged_by:logged_by_id (
          first_name,
          last_name
        ),
        meal:meal_id (
          name,
          meal_type
        )
      `)
      .eq('child_id', childId)
      .eq('date', date)
      .order('meal_time', { ascending: true })

    if (error) throw error
    return data || []
  }

  /**
   * Obtenir les logs de repas du jour pour une crèche
   */
  async getTodayMealLogs(nurseryId: string): Promise<MealLogWithDetails[]> {
    const supabase = await createClient()
    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('child_meal_log')
      .select(`
        *,
        logged_by:logged_by_id (
          first_name,
          last_name
        ),
        child:child_id (
          first_name,
          last_name
        )
      `)
      .eq('nursery_id', nurseryId)
      .eq('date', today)
      .order('meal_time', { ascending: true })

    if (error) throw error
    return data || []
  }

  /**
   * Obtenir les logs de repas pour une période
   */
  async getMealLogsRange(
    childId: string,
    startDate: string,
    endDate: string
  ): Promise<ChildMealLog[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('child_meal_log')
      .select('*')
      .eq('child_id', childId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false })
      .order('meal_time', { ascending: true })

    if (error) throw error
    return data || []
  }

  /**
   * Mettre à jour un log de repas
   */
  async updateMealLog(id: string, updates: Partial<ChildMealLog>): Promise<ChildMealLog> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('child_meal_log')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Supprimer un log de repas
   */
  async deleteMealLog(id: string): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase
      .from('child_meal_log')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // ========== Sleep Logs (Siestes) ==========

  /**
   * Créer un log de sieste
   */
  async createSleepLog(input: CreateSleepLogInput): Promise<ChildSleepLog> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('child_sleep_log')
      .insert(input)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Obtenir les logs de sieste d'un enfant pour une date
   */
  async getSleepLogsByDate(childId: string, date: string): Promise<ChildSleepLog[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('child_sleep_log')
      .select('*')
      .eq('child_id', childId)
      .eq('date', date)
      .order('sleep_start_time', { ascending: true })

    if (error) throw error
    return data || []
  }

  /**
   * Obtenir les logs de sieste du jour pour une crèche
   */
  async getTodaySleepLogs(nurseryId: string): Promise<ChildSleepLog[]> {
    const supabase = await createClient()
    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('child_sleep_log')
      .select(`
        *,
        child:child_id (
          first_name,
          last_name
        )
      `)
      .eq('nursery_id', nurseryId)
      .eq('date', today)
      .order('sleep_start_time', { ascending: true })

    if (error) throw error
    return data || []
  }

  /**
   * Mettre à jour un log de sieste (ex: ajouter heure de réveil)
   */
  async updateSleepLog(id: string, updates: Partial<ChildSleepLog>): Promise<ChildSleepLog> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('child_sleep_log')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Terminer une sieste (enregistrer heure de réveil)
   */
  async endSleep(id: string, endTime: string, quality?: SleepQuality): Promise<ChildSleepLog> {
    return this.updateSleepLog(id, {
      sleep_end_time: endTime,
      sleep_quality: quality
    })
  }

  /**
   * Supprimer un log de sieste
   */
  async deleteSleepLog(id: string): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase
      .from('child_sleep_log')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // ========== Change Logs (Changes) ==========

  /**
   * Créer un log de change
   */
  async createChangeLog(input: CreateChangeLogInput): Promise<ChildChangeLog> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('child_change_log')
      .insert(input)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Obtenir les logs de change d'un enfant pour une date
   */
  async getChangeLogsByDate(childId: string, date: string): Promise<ChildChangeLog[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('child_change_log')
      .select('*')
      .eq('child_id', childId)
      .eq('date', date)
      .order('time', { ascending: true })

    if (error) throw error
    return data || []
  }

  /**
   * Obtenir les logs de change du jour pour une crèche
   */
  async getTodayChangeLogs(nurseryId: string): Promise<ChildChangeLog[]> {
    const supabase = await createClient()
    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('child_change_log')
      .select(`
        *,
        child:child_id (
          first_name,
          last_name
        )
      `)
      .eq('nursery_id', nurseryId)
      .eq('date', today)
      .order('time', { ascending: true })

    if (error) throw error
    return data || []
  }

  /**
   * Mettre à jour un log de change
   */
  async updateChangeLog(id: string, updates: Partial<ChildChangeLog>): Promise<ChildChangeLog> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('child_change_log')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Supprimer un log de change
   */
  async deleteChangeLog(id: string): Promise<void> {
    const supabase = await createClient()

    const { error} = await supabase
      .from('child_change_log')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // ========== Summary & Timeline ==========

  /**
   * Obtenir le résumé complet de la journée d'un enfant
   */
  async getChildDaySummary(childId: string, date: string): Promise<ChildDaySummary> {
    const [meals, sleeps, changes] = await Promise.all([
      this.getMealLogsByDate(childId, date),
      this.getSleepLogsByDate(childId, date),
      this.getChangeLogsByDate(childId, date)
    ])

    return { meals, sleeps, changes }
  }

  /**
   * Obtenir tous les logs du jour pour une crèche
   */
  async getTodayAllLogs(nurseryId: string) {
    const [meals, sleeps, changes] = await Promise.all([
      this.getTodayMealLogs(nurseryId),
      this.getTodaySleepLogs(nurseryId),
      this.getTodayChangeLogs(nurseryId)
    ])

    return { meals, sleeps, changes }
  }

  // ========== Statistiques ==========

  /**
   * Statistiques repas pour un enfant sur une période
   */
  async getMealStatistics(childId: string, startDate: string, endDate: string) {
    const meals = await this.getMealLogsRange(childId, startDate, endDate)

    return {
      total: meals.length,
      goodAppetite: meals.filter(m => m.appetite === 'good').length,
      poorAppetite: meals.filter(m => m.appetite === 'poor').length,
      refused: meals.filter(m => m.appetite === 'refused').length,
      ateAll: meals.filter(m => m.quantity_eaten === 'all').length,
      ateHalfOrLess: meals.filter(m => ['half', 'quarter', 'none'].includes(m.quantity_eaten)).length
    }
  }

  /**
   * Statistiques sommeil pour un enfant sur une période
   */
  async getSleepStatistics(childId: string, startDate: string, endDate: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('child_sleep_log')
      .select('duration_minutes, sleep_quality')
      .eq('child_id', childId)
      .gte('date', startDate)
      .lte('date', endDate)

    if (error) throw error

    const sleeps = data || []
    const totalDuration = sleeps.reduce((sum, s) => sum + (s.duration_minutes || 0), 0)

    return {
      total: sleeps.length,
      totalMinutes: totalDuration,
      avgMinutes: sleeps.length > 0 ? totalDuration / sleeps.length : 0,
      deepSleep: sleeps.filter(s => s.sleep_quality === 'deep').length,
      restlessSleep: sleeps.filter(s => s.sleep_quality === 'restless').length
    }
  }
}

export const dailyLogsService = new DailyLogsService()
