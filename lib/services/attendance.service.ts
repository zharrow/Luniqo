// @ts-nocheck
/**
 * AttendanceService - Gestion des présences quotidiennes
 *
 * NOTE: Phase 2 tables (attendance, check_in, check_out, absence, child_planned_schedule)
 * require migrations 16-19 to be applied to Supabase before use.
 * Type checking is disabled until database types are regenerated.
 *
 * Fonctionnalités:
 * - Pointage arrivée/départ
 * - Gestion des absences
 * - Planning prévisionnel
 * - Rapports de présences
 */

import { createClient } from '@/lib/supabase/server'

// =====================================================
// Types
// =====================================================

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'partial'
export type AbsenceReason = 'sick' | 'vacation' | 'family_event' | 'medical_appointment' | 'other'
export type NotificationMethod = 'phone' | 'email' | 'app' | 'in_person'
export type ChildMood = 'happy' | 'sad' | 'tired' | 'grumpy' | 'neutral'
export type PersonRelation = 'mother' | 'father' | 'grandparent' | 'authorized_person' | 'other'

export interface Attendance {
  id: string
  child_id: string
  nursery_id: string
  date: string
  status: AttendanceStatus
  absence_reason?: AbsenceReason
  absence_notes?: string
  scheduled_arrival_time?: string
  scheduled_departure_time?: string
  actual_arrival_time?: string
  actual_departure_time?: string
  total_hours?: number
  checked_in_by_id?: string
  checked_out_by_id?: string
  dropped_by?: string
  picked_by?: string
  created_at: string
  updated_at: string
}

export interface CheckIn {
  id: string
  attendance_id: string
  checked_in_at: string
  checked_in_by_id: string
  dropped_by: string
  dropped_by_relation?: PersonRelation
  dropped_by_signature?: string
  temperature?: number
  mood?: ChildMood
  special_notes?: string
  brought_diapers: boolean
  brought_clothes: boolean
  brought_medication: boolean
  medication_notes?: string
  created_at: string
}

export interface CheckOut {
  id: string
  attendance_id: string
  checked_out_at: string
  checked_out_by_id: string
  picked_by: string
  picked_by_relation?: PersonRelation
  picked_by_signature?: string
  id_verified: boolean
  day_summary?: string
  mood_at_pickup?: ChildMood
  incidents_reported: boolean
  incident_description?: string
  returned_diapers: boolean
  returned_clothes: boolean
  items_missing?: string
  created_at: string
}

export interface Absence {
  id: string
  child_id: string
  nursery_id: string
  start_date: string
  end_date: string
  reason: AbsenceReason
  description?: string
  medical_certificate_url?: string
  medical_certificate_uploaded_at?: string
  declared_by_id?: string
  declared_at: string
  notified_by?: NotificationMethod
  created_at: string
  updated_at: string
}

export interface ChildPlannedSchedule {
  id: string
  child_id: string
  day_of_week: number // 1=Monday, 7=Sunday
  arrival_time: string
  departure_time: string
  valid_from: string
  valid_until?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateAttendanceInput {
  child_id: string
  nursery_id: string
  date: string
  status: AttendanceStatus
  absence_reason?: AbsenceReason
  absence_notes?: string
  scheduled_arrival_time?: string
  scheduled_departure_time?: string
}

export interface CreateCheckInInput {
  attendance_id: string
  checked_in_by_id: string
  dropped_by: string
  dropped_by_relation?: PersonRelation
  dropped_by_signature?: string
  temperature?: number
  mood?: ChildMood
  special_notes?: string
  brought_diapers?: boolean
  brought_clothes?: boolean
  brought_medication?: boolean
  medication_notes?: string
}

export interface CreateCheckOutInput {
  attendance_id: string
  checked_out_by_id: string
  picked_by: string
  picked_by_relation?: PersonRelation
  picked_by_signature?: string
  id_verified?: boolean
  day_summary?: string
  mood_at_pickup?: ChildMood
  incidents_reported?: boolean
  incident_description?: string
  returned_diapers?: boolean
  returned_clothes?: boolean
  items_missing?: string
}

export interface CreateAbsenceInput {
  child_id: string
  nursery_id: string
  start_date: string
  end_date: string
  reason: AbsenceReason
  description?: string
  medical_certificate_url?: string
  declared_by_id?: string
  notified_by?: NotificationMethod
}

export interface AttendanceWithDetails extends Attendance {
  check_in?: CheckIn
  check_out?: CheckOut
  child?: {
    first_name: string
    last_name: string
    photo_url?: string
  }
  checked_in_by?: {
    first_name: string
    last_name: string
  }
  checked_out_by?: {
    first_name: string
    last_name: string
  }
}

// =====================================================
// AttendanceService
// =====================================================

class AttendanceService {

  // ========== Attendance (Présences) ==========

  /**
   * Obtenir les présences du jour pour une crèche
   */
  async getTodayAttendances(nurseryId: string): Promise<AttendanceWithDetails[]> {
    const supabase = await createClient()
    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('attendance')
      .select(`
        *,
        child:child_id (
          first_name,
          last_name,
          photo_url
        ),
        checked_in_by:checked_in_by_id (
          first_name,
          last_name
        ),
        checked_out_by:checked_out_by_id (
          first_name,
          last_name
        )
      `)
      .eq('nursery_id', nurseryId)
      .eq('date', today)
      .order('actual_arrival_time', { ascending: true, nullsFirst: false })

    if (error) throw error
    return data || []
  }

  /**
   * Obtenir les présences pour une date spécifique
   */
  async getAttendancesByDate(nurseryId: string, date: string): Promise<AttendanceWithDetails[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('attendance')
      .select(`
        *,
        child:child_id (
          first_name,
          last_name,
          photo_url
        ),
        checked_in_by:checked_in_by_id (
          first_name,
          last_name
        ),
        checked_out_by:checked_out_by_id (
          first_name,
          last_name
        )
      `)
      .eq('nursery_id', nurseryId)
      .eq('date', date)
      .order('actual_arrival_time', { ascending: true, nullsFirst: false })

    if (error) throw error
    return data || []
  }

  /**
   * Obtenir les présences d'un enfant
   */
  async getChildAttendances(
    childId: string,
    startDate?: string,
    endDate?: string
  ): Promise<Attendance[]> {
    const supabase = await createClient()

    let query = supabase
      .from('attendance')
      .select('*')
      .eq('child_id', childId)
      .order('date', { ascending: false })

    if (startDate) {
      query = query.gte('date', startDate)
    }

    if (endDate) {
      query = query.lte('date', endDate)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  }

  /**
   * Créer une ligne de présence
   */
  async create(input: CreateAttendanceInput): Promise<Attendance> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('attendance')
      .insert(input)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Mettre à jour une présence
   */
  async update(id: string, updates: Partial<Attendance>): Promise<Attendance> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('attendance')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Enregistrer l'heure d'arrivée
   */
  async recordArrival(
    attendanceId: string,
    arrivalTime: string,
    checkedInById: string,
    droppedBy: string
  ): Promise<Attendance> {
    return this.update(attendanceId, {
      actual_arrival_time: arrivalTime,
      checked_in_by_id: checkedInById,
      dropped_by: droppedBy,
      status: 'present'
    })
  }

  /**
   * Enregistrer l'heure de départ
   */
  async recordDeparture(
    attendanceId: string,
    departureTime: string,
    checkedOutById: string,
    pickedBy: string
  ): Promise<Attendance> {
    return this.update(attendanceId, {
      actual_departure_time: departureTime,
      checked_out_by_id: checkedOutById,
      picked_by: pickedBy
    })
  }

  /**
   * Statistiques présences pour une période
   */
  async getStatistics(nurseryId: string, startDate: string, endDate: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('attendance')
      .select('status, total_hours')
      .eq('nursery_id', nurseryId)
      .gte('date', startDate)
      .lte('date', endDate)

    if (error) throw error

    const stats = {
      total: data?.length || 0,
      present: data?.filter(a => a.status === 'present').length || 0,
      absent: data?.filter(a => a.status === 'absent').length || 0,
      late: data?.filter(a => a.status === 'late').length || 0,
      partial: data?.filter(a => a.status === 'partial').length || 0,
      totalHours: data?.reduce((sum, a) => sum + (a.total_hours || 0), 0) || 0,
      avgHours: 0
    }

    stats.avgHours = stats.present > 0 ? stats.totalHours / stats.present : 0

    return stats
  }

  // ========== Check-In ==========

  /**
   * Créer un pointage d'arrivée
   */
  async createCheckIn(input: CreateCheckInInput): Promise<CheckIn> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('check_in')
      .insert(input)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Obtenir le check-in d'une présence
   */
  async getCheckIn(attendanceId: string): Promise<CheckIn | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('check_in')
      .select('*')
      .eq('attendance_id', attendanceId)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data || null
  }

  // ========== Check-Out ==========

  /**
   * Créer un pointage de départ
   */
  async createCheckOut(input: CreateCheckOutInput): Promise<CheckOut> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('check_out')
      .insert(input)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Obtenir le check-out d'une présence
   */
  async getCheckOut(attendanceId: string): Promise<CheckOut | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('check_out')
      .select('*')
      .eq('attendance_id', attendanceId)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data || null
  }

  // ========== Absences ==========

  /**
   * Déclarer une absence
   */
  async createAbsence(input: CreateAbsenceInput): Promise<Absence> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('absence')
      .insert(input)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Obtenir toutes les absences pour une crèche
   */
  async getAbsences(nurseryId: string, startDate?: string, endDate?: string): Promise<Absence[]> {
    const supabase = await createClient()

    let query = supabase
      .from('absence')
      .select('*')
      .eq('nursery_id', nurseryId)
      .order('start_date', { ascending: false })

    if (startDate) {
      query = query.gte('end_date', startDate)
    }

    if (endDate) {
      query = query.lte('start_date', endDate)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  }

  /**
   * Obtenir les absences d'un enfant
   */
  async getChildAbsences(childId: string): Promise<Absence[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('absence')
      .select('*')
      .eq('child_id', childId)
      .order('start_date', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * Supprimer une absence
   */
  async deleteAbsence(id: string): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase
      .from('absence')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // ========== Planning Prévisionnel ==========

  /**
   * Créer un planning type pour un enfant
   */
  async createSchedule(input: Omit<ChildPlannedSchedule, 'id' | 'created_at' | 'updated_at'>): Promise<ChildPlannedSchedule> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('child_planned_schedule')
      .insert(input)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Obtenir le planning d'un enfant
   */
  async getChildSchedule(childId: string): Promise<ChildPlannedSchedule[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('child_planned_schedule')
      .select('*')
      .eq('child_id', childId)
      .eq('is_active', true)
      .order('day_of_week', { ascending: true })

    if (error) throw error
    return data || []
  }

  /**
   * Mettre à jour un planning
   */
  async updateSchedule(id: string, updates: Partial<ChildPlannedSchedule>): Promise<ChildPlannedSchedule> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('child_planned_schedule')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Désactiver un planning
   */
  async deactivateSchedule(id: string): Promise<void> {
    await this.updateSchedule(id, { is_active: false })
  }
}

export const attendanceService = new AttendanceService()
