import { createClient } from '@/lib/supabase/client'
import { formatDateLocal } from '@/lib/utils/date'

// ============================================================================
// TYPES
// ============================================================================

export interface StaffShift {
  id: string
  employee_id: string
  nursery_id: string
  shift_date: string
  start_time: string
  end_time: string
  break_start_time?: string
  break_end_time?: string
  break_duration_minutes: number
  total_hours?: number
  shift_type?: string
  assigned_room_id?: string
  assigned_section_id?: string
  role_during_shift?: string
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
  actual_start_time?: string
  actual_end_time?: string
  actual_hours?: number
  notes?: string
  cancellation_reason?: string
  created_at: string
  updated_at: string
  created_by_id?: string
}

export interface CreateShiftInput {
  employee_id: string
  nursery_id: string
  shift_date: string
  start_time: string
  end_time: string
  break_start_time?: string
  break_end_time?: string
  break_duration_minutes?: number
  shift_type?: string
  assigned_room_id?: string
  assigned_section_id?: string
  role_during_shift?: string
  notes?: string
  created_by_id?: string
}

export interface UpdateShiftInput {
  shift_date?: string
  start_time?: string
  end_time?: string
  break_start_time?: string
  break_end_time?: string
  break_duration_minutes?: number
  shift_type?: string
  assigned_room_id?: string
  assigned_section_id?: string
  role_during_shift?: string
  status?: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
  actual_start_time?: string
  actual_end_time?: string
  notes?: string
  cancellation_reason?: string
}

export interface StaffAbsence {
  id: string
  employee_id: string
  nursery_id: string
  absence_type: string
  start_date: string
  end_date: string
  total_days?: number
  is_partial_day: boolean
  partial_hours?: number
  justification_required: boolean
  justification_document_url?: string
  justification_status?: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  requested_at: string
  reviewed_by_id?: string
  reviewed_at?: string
  rejection_reason?: string
  replaced_by_id?: string
  replacement_notes?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface CreateAbsenceInput {
  employee_id: string
  nursery_id: string
  absence_type: string
  start_date: string
  end_date: string
  total_days?: number
  is_partial_day?: boolean
  partial_hours?: number
  justification_required?: boolean
  justification_document_url?: string
  notes?: string
}

export interface UpdateAbsenceInput {
  absence_type?: string
  start_date?: string
  end_date?: string
  total_days?: number
  is_partial_day?: boolean
  partial_hours?: number
  justification_document_url?: string
  justification_status?: string
  status?: 'pending' | 'approved' | 'rejected' | 'cancelled'
  reviewed_by_id?: string
  reviewed_at?: string
  rejection_reason?: string
  replaced_by_id?: string
  replacement_notes?: string
  notes?: string
}

export interface StaffAvailability {
  id: string
  employee_id: string
  nursery_id: string
  valid_from: string
  valid_until?: string
  day_of_week: number
  is_available: boolean
  available_start_time?: string
  available_end_time?: string
  preference?: string
  max_hours_per_day?: number
  max_hours_per_week?: number
  notes?: string
  created_at: string
  updated_at: string
}

export interface CreateAvailabilityInput {
  employee_id: string
  nursery_id: string
  valid_from: string
  valid_until?: string
  day_of_week: number
  is_available?: boolean
  available_start_time?: string
  available_end_time?: string
  preference?: string
  max_hours_per_day?: number
  max_hours_per_week?: number
  notes?: string
}

export interface StaffAssignment {
  id: string
  employee_id: string
  nursery_id: string
  assignment_type: 'room' | 'section' | 'floater'
  room_id?: string
  section_id?: string
  role?: string
  start_date: string
  end_date?: string
  is_primary_assignment: boolean
  notes?: string
  created_at: string
  updated_at: string
  created_by_id?: string
}

export interface CreateAssignmentInput {
  employee_id: string
  nursery_id: string
  assignment_type: 'room' | 'section' | 'floater'
  room_id?: string
  section_id?: string
  role?: string
  start_date: string
  end_date?: string
  is_primary_assignment?: boolean
  notes?: string
  created_by_id?: string
}

export interface ShiftWithEmployee extends StaffShift {
  employee_name: string
  employee_email: string
  room_name?: string
  section_name?: string
}

export interface AbsenceWithEmployee extends StaffAbsence {
  employee_name: string
  employee_email: string
  replacement_name?: string
}

export interface AssignmentWithDetails extends StaffAssignment {
  employee_name: string
  room_name?: string
  section_name?: string
}

// ============================================================================
// STAFF PLANNING SERVICE
// Description: Manages staff shifts, absences, availability, and assignments
// ============================================================================

export class StaffPlanningService {
  private supabase: any

  constructor() {
    this.supabase = createClient()
  }

  // ==========================================================================
  // SHIFTS METHODS
  // ==========================================================================

  /**
   * Create a new shift
   */
  async createShift(data: CreateShiftInput): Promise<StaffShift> {
    const { data: shift, error } = await this.supabase
      .from('staff_shift')
      .insert(data)
      .select()
      .single()

    if (error) throw error
    return shift
  }

  /**
   * Create multiple shifts at once (for weekly planning)
   */
  async createShifts(shifts: CreateShiftInput[]): Promise<StaffShift[]> {
    const { data, error } = await this.supabase
      .from('staff_shift')
      .insert(shifts)
      .select()

    if (error) throw error
    return data || []
  }

  /**
   * Get shifts by date range for a nursery
   */
  async getShiftsByDateRange(
    nurseryId: string,
    startDate: string,
    endDate: string
  ): Promise<ShiftWithEmployee[]> {
    const { data, error } = await this.supabase
      .from('staff_shift')
      .select(`
        *,
        profiles!inner(
          first_name,
          last_name,
          email
        ),
        room(
          name
        ),
        section(
          name
        )
      `)
      .eq('nursery_id', nurseryId)
      .gte('shift_date', startDate)
      .lte('shift_date', endDate)
      .order('shift_date', { ascending: true })
      .order('start_time', { ascending: true })

    if (error) throw error

    return (data || []).map((s: any) => ({
      ...s,
      employee_name: `${s.profiles.first_name} ${s.profiles.last_name}`,
      employee_email: s.profiles.email,
      room_name: s.room?.name,
      section_name: s.section?.name
    }))
  }

  /**
   * Get shifts for a specific date
   */
  async getShiftsByDate(nurseryId: string, date: string): Promise<ShiftWithEmployee[]> {
    return this.getShiftsByDateRange(nurseryId, date, date)
  }

  /**
   * Get shifts for an employee
   */
  async getShiftsByEmployee(
    employeeId: string,
    startDate: string,
    endDate: string
  ): Promise<StaffShift[]> {
    const { data, error } = await this.supabase
      .from('staff_shift')
      .select('*')
      .eq('employee_id', employeeId)
      .gte('shift_date', startDate)
      .lte('shift_date', endDate)
      .order('shift_date', { ascending: true })
      .order('start_time', { ascending: true })

    if (error) throw error
    return data || []
  }

  /**
   * Get upcoming shifts for an employee
   */
  async getUpcomingShifts(employeeId: string, daysAhead: number = 7): Promise<StaffShift[]> {
    const today = formatDateLocal(new Date())
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + daysAhead)
    const futureDateStr = formatDateLocal(futureDate)

    return this.getShiftsByEmployee(employeeId, today, futureDateStr)
  }

  /**
   * Get a shift by ID
   */
  async getShiftById(shiftId: string): Promise<StaffShift> {
    const { data, error } = await this.supabase
      .from('staff_shift')
      .select('*')
      .eq('id', shiftId)
      .single()

    if (error) throw error
    return data
  }

  /**
   * Update a shift
   */
  async updateShift(shiftId: string, updates: UpdateShiftInput): Promise<StaffShift> {
    const { data, error } = await this.supabase
      .from('staff_shift')
      .update(updates)
      .eq('id', shiftId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Cancel a shift
   */
  async cancelShift(shiftId: string, reason: string): Promise<StaffShift> {
    return this.updateShift(shiftId, {
      status: 'cancelled',
      cancellation_reason: reason
    })
  }

  /**
   * Clock in (employee starts shift)
   */
  async clockIn(shiftId: string): Promise<StaffShift> {
    return this.updateShift(shiftId, {
      status: 'in_progress',
      actual_start_time: new Date().toISOString()
    })
  }

  /**
   * Clock out (employee ends shift)
   */
  async clockOut(shiftId: string): Promise<StaffShift> {
    return this.updateShift(shiftId, {
      status: 'completed',
      actual_end_time: new Date().toISOString()
    })
  }

  /**
   * Delete a shift
   */
  async deleteShift(shiftId: string): Promise<void> {
    const { error } = await this.supabase
      .from('staff_shift')
      .delete()
      .eq('id', shiftId)

    if (error) throw error
  }

  // ==========================================================================
  // ABSENCES METHODS
  // ==========================================================================

  /**
   * Request an absence
   */
  async requestAbsence(data: CreateAbsenceInput): Promise<StaffAbsence> {
    const { data: absence, error } = await this.supabase
      .from('staff_absence')
      .insert(data)
      .select()
      .single()

    if (error) throw error
    return absence
  }

  /**
   * Get absences for an employee
   */
  async getAbsencesByEmployee(employeeId: string): Promise<StaffAbsence[]> {
    const { data, error } = await this.supabase
      .from('staff_absence')
      .select('*')
      .eq('employee_id', employeeId)
      .order('start_date', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * Get absences for a nursery
   */
  async getAbsencesByNursery(
    nurseryId: string,
    status?: string
  ): Promise<AbsenceWithEmployee[]> {
    let query = this.supabase
      .from('staff_absence')
      .select(`
        *,
        profiles!staff_absence_employee_id_fkey(
          first_name,
          last_name,
          email
        ),
        replacement:profiles!staff_absence_replaced_by_id_fkey(
          first_name,
          last_name
        )
      `)
      .eq('nursery_id', nurseryId)
      .order('start_date', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) throw error

    return (data || []).map((a: any) => ({
      ...a,
      employee_name: `${a.profiles.first_name} ${a.profiles.last_name}`,
      employee_email: a.profiles.email,
      replacement_name: a.replacement ? `${a.replacement.first_name} ${a.replacement.last_name}` : undefined
    }))
  }

  /**
   * Get pending absence requests
   */
  async getPendingAbsences(nurseryId: string): Promise<AbsenceWithEmployee[]> {
    return this.getAbsencesByNursery(nurseryId, 'pending')
  }

  /**
   * Get upcoming absences
   */
  async getUpcomingAbsences(nurseryId: string, daysAhead: number = 30): Promise<AbsenceWithEmployee[]> {
    const today = formatDateLocal(new Date())
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + daysAhead)
    const futureDateStr = formatDateLocal(futureDate)

    const { data, error } = await this.supabase
      .from('staff_absence')
      .select(`
        *,
        profiles!staff_absence_employee_id_fkey(
          first_name,
          last_name,
          email
        ),
        replacement:profiles!staff_absence_replaced_by_id_fkey(
          first_name,
          last_name
        )
      `)
      .eq('nursery_id', nurseryId)
      .eq('status', 'approved')
      .gte('start_date', today)
      .lte('start_date', futureDateStr)
      .order('start_date', { ascending: true })

    if (error) throw error

    return (data || []).map((a: any) => ({
      ...a,
      employee_name: `${a.profiles.first_name} ${a.profiles.last_name}`,
      employee_email: a.profiles.email,
      replacement_name: a.replacement ? `${a.replacement.first_name} ${a.replacement.last_name}` : undefined
    }))
  }

  /**
   * Get an absence by ID
   */
  async getAbsenceById(absenceId: string): Promise<StaffAbsence> {
    const { data, error } = await this.supabase
      .from('staff_absence')
      .select('*')
      .eq('id', absenceId)
      .single()

    if (error) throw error
    return data
  }

  /**
   * Update an absence
   */
  async updateAbsence(absenceId: string, updates: UpdateAbsenceInput): Promise<StaffAbsence> {
    const { data, error } = await this.supabase
      .from('staff_absence')
      .update(updates)
      .eq('id', absenceId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Approve an absence
   */
  async approveAbsence(absenceId: string, reviewedById: string): Promise<StaffAbsence> {
    return this.updateAbsence(absenceId, {
      status: 'approved',
      reviewed_by_id: reviewedById,
      reviewed_at: new Date().toISOString()
    })
  }

  /**
   * Reject an absence
   */
  async rejectAbsence(
    absenceId: string,
    reviewedById: string,
    reason: string
  ): Promise<StaffAbsence> {
    return this.updateAbsence(absenceId, {
      status: 'rejected',
      reviewed_by_id: reviewedById,
      reviewed_at: new Date().toISOString(),
      rejection_reason: reason
    })
  }

  /**
   * Assign a replacement for an absence
   */
  async assignReplacement(
    absenceId: string,
    replacementEmployeeId: string,
    notes?: string
  ): Promise<StaffAbsence> {
    return this.updateAbsence(absenceId, {
      replaced_by_id: replacementEmployeeId,
      replacement_notes: notes
    })
  }

  /**
   * Delete an absence
   */
  async deleteAbsence(absenceId: string): Promise<void> {
    const { error } = await this.supabase
      .from('staff_absence')
      .delete()
      .eq('id', absenceId)

    if (error) throw error
  }

  // ==========================================================================
  // AVAILABILITY METHODS
  // ==========================================================================

  /**
   * Set availability for an employee
   */
  async setAvailability(data: CreateAvailabilityInput): Promise<StaffAvailability> {
    const { data: availability, error } = await this.supabase
      .from('staff_availability')
      .insert(data)
      .select()
      .single()

    if (error) throw error
    return availability
  }

  /**
   * Get availability for an employee
   */
  async getAvailability(employeeId: string, nurseryId: string): Promise<StaffAvailability[]> {
    const { data, error } = await this.supabase
      .from('staff_availability')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('nursery_id', nurseryId)
      .order('day_of_week', { ascending: true })

    if (error) throw error
    return data || []
  }

  /**
   * Update availability
   */
  async updateAvailability(
    availabilityId: string,
    updates: Partial<CreateAvailabilityInput>
  ): Promise<StaffAvailability> {
    const { data, error } = await this.supabase
      .from('staff_availability')
      .update(updates)
      .eq('id', availabilityId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Delete availability
   */
  async deleteAvailability(availabilityId: string): Promise<void> {
    const { error } = await this.supabase
      .from('staff_availability')
      .delete()
      .eq('id', availabilityId)

    if (error) throw error
  }

  // ==========================================================================
  // ASSIGNMENTS METHODS
  // ==========================================================================

  /**
   * Create a new assignment
   */
  async createAssignment(data: CreateAssignmentInput): Promise<StaffAssignment> {
    const { data: assignment, error } = await this.supabase
      .from('staff_assignment')
      .insert(data)
      .select()
      .single()

    if (error) throw error
    return assignment
  }

  /**
   * Get current assignments for a nursery
   */
  async getCurrentAssignments(nurseryId: string): Promise<AssignmentWithDetails[]> {
    const { data, error } = await this.supabase
      .from('staff_assignment')
      .select(`
        *,
        profiles!inner(
          first_name,
          last_name
        ),
        room(
          name
        ),
        section(
          name
        )
      `)
      .eq('nursery_id', nurseryId)
      .is('end_date', null)
      .order('is_primary_assignment', { ascending: false })

    if (error) throw error

    return (data || []).map((a: any) => ({
      ...a,
      employee_name: `${a.profiles.first_name} ${a.profiles.last_name}`,
      room_name: a.room?.name,
      section_name: a.section?.name
    }))
  }

  /**
   * Get assignments for an employee
   */
  async getAssignmentsByEmployee(employeeId: string): Promise<StaffAssignment[]> {
    const { data, error } = await this.supabase
      .from('staff_assignment')
      .select('*')
      .eq('employee_id', employeeId)
      .order('start_date', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * Get current primary assignment for an employee
   */
  async getCurrentPrimaryAssignment(
    employeeId: string,
    nurseryId: string
  ): Promise<StaffAssignment | null> {
    const { data, error } = await this.supabase
      .from('staff_assignment')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('nursery_id', nurseryId)
      .eq('is_primary_assignment', true)
      .is('end_date', null)
      .single()

    if (error && error.code !== 'PGRST116') throw error // Ignore "not found" errors
    return data || null
  }

  /**
   * Update an assignment
   */
  async updateAssignment(
    assignmentId: string,
    updates: Partial<CreateAssignmentInput>
  ): Promise<StaffAssignment> {
    const { data, error } = await this.supabase
      .from('staff_assignment')
      .update(updates)
      .eq('id', assignmentId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * End an assignment
   */
  async endAssignment(assignmentId: string, endDate?: string): Promise<StaffAssignment> {
    const dateToUse = endDate || formatDateLocal(new Date())
    return this.updateAssignment(assignmentId, {
      end_date: dateToUse
    })
  }

  /**
   * Delete an assignment
   */
  async deleteAssignment(assignmentId: string): Promise<void> {
    const { error } = await this.supabase
      .from('staff_assignment')
      .delete()
      .eq('id', assignmentId)

    if (error) throw error
  }
}
