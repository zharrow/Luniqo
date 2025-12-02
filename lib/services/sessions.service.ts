import { createClient } from '@/lib/supabase/client'

export type SessionStatus = 'EN_COURS' | 'COMPLETEE' | 'INCOMPLETE'
export type LogStatus = 'FAIT' | 'PARTIEL' | 'REPORTE' | 'IMPOSSIBLE'

export interface CleaningSession {
  id: string
  enterprise_id: string
  date: string
  status: SessionStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CleaningLog {
  id: string
  session_id: string | null
  assigned_task_id: string | null
  performed_by_id: string | null
  recorded_by_id: string | null
  status: LogStatus
  note: string | null
  photo_urls: string[] | null
  performed_at: string | null
  created_at: string
}

export interface AssignedTask {
  id: string
  room_id: string | null
  task_template_id: string | null
  default_performer_id: string | null
  frequency: any
  suggested_time: string | null
  expected_duration: number | null
  order_in_room: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SessionWithStats extends CleaningSession {
  total_tasks: number
  completed_tasks: number
  completion_percentage: number
}

export interface CreateSessionInput {
  date: string
  notes?: string
}

export interface UpdateSessionInput {
  status?: SessionStatus
  notes?: string
}

export interface CreateLogInput {
  assigned_task_id: string
  performed_by_id?: string
  recorded_by_id?: string
  status: LogStatus
  note?: string
  photo_urls?: string[]
}

export class SessionsService {
  private supabase = createClient()

  /**
   * Get all sessions for an enterprise
   */
  async getAll(enterpriseId: string, limit?: number): Promise<SessionWithStats[]> {
    let query = this.supabase
      .from('daily_cleaning_session')
      .select('*')
      .eq('enterprise_id', enterpriseId)
      .order('date', { ascending: false })

    if (limit) {
      query = query.limit(limit)
    }

    const { data: sessions, error } = await query

    if (error) throw error

    // Get stats for each session
    const sessionsWithStats = await Promise.all(
      (sessions as any[] || []).map(async (session) => {
        const stats = await this.getSessionStats(session.id)
        return {
          ...session,
          ...stats
        }
      })
    )

    return sessionsWithStats
  }

  /**
   * Get today's session
   */
  async getToday(enterpriseId: string): Promise<SessionWithStats | null> {
    const today = new Date().toISOString().split('T')[0]

    const { data: session, error } = await this.supabase
      .from('daily_cleaning_session')
      .select('*')
      .eq('enterprise_id', enterpriseId)
      .eq('date', today)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw error
    }

    const stats = await this.getSessionStats((session as any).id)

    return {
      ...(session as any),
      ...stats
    }
  }

  /**
   * Get session by ID
   */
  async getById(id: string, enterpriseId: string): Promise<SessionWithStats | null> {
    const { data: session, error } = await this.supabase
      .from('daily_cleaning_session')
      .select('*')
      .eq('id', id)
      .eq('enterprise_id', enterpriseId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    const stats = await this.getSessionStats(id)

    return {
      ...(session as any),
      ...stats
    }
  }

  /**
   * Get session by date
   */
  async getByDate(enterpriseId: string, date: string): Promise<SessionWithStats | null> {
    const { data: session, error } = await this.supabase
      .from('daily_cleaning_session')
      .select('*')
      .eq('enterprise_id', enterpriseId)
      .eq('date', date)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    const stats = await this.getSessionStats((session as any).id)

    return {
      ...(session as any),
      ...stats
    }
  }

  /**
   * Create a new session
   */
  async create(enterpriseId: string, input: CreateSessionInput): Promise<CleaningSession> {
    const { data, error } = await this.supabase
      .from('daily_cleaning_session')
      .insert({
        enterprise_id: enterpriseId,
        date: input.date,
        status: 'EN_COURS',
        notes: input.notes || null
      })
      .select()
      .single()

    if (error) throw error
    return data as any
  }

  /**
   * Update a session
   */
  async update(id: string, enterpriseId: string, input: UpdateSessionInput): Promise<CleaningSession> {
    const { data, error } = await this.supabase
      .from('daily_cleaning_session')
      .update(input)
      .eq('id', id)
      .eq('enterprise_id', enterpriseId)
      .select()
      .single()

    if (error) throw error
    return data as any
  }

  /**
   * Delete a session
   */
  async delete(id: string, enterpriseId: string): Promise<void> {
    const { error } = await this.supabase
      .from('daily_cleaning_session')
      .delete()
      .eq('id', id)
      .eq('enterprise_id', enterpriseId)

    if (error) throw error
  }

  /**
   * Get session statistics
   */
  async getSessionStats(sessionId: string): Promise<{
    total_tasks: number
    completed_tasks: number
    completion_percentage: number
  }> {
    // Count total logs for this session
    const { count: totalCount } = await this.supabase
      .from('task_completion')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId)

    // Count completed logs (status = FAIT)
    const { count: completedCount } = await this.supabase
      .from('task_completion')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .eq('status', 'FAIT')

    const total = totalCount || 0
    const completed = completedCount || 0
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0

    return {
      total_tasks: total,
      completed_tasks: completed,
      completion_percentage: percentage
    }
  }

  /**
   * Get logs for a session
   */
  async getSessionLogs(sessionId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('task_completion')
      .select(`
        *,
        assigned_task:assigned_task_id (
          *,
          room:room_id (*),
          task_template:task_template_id (*)
        ),
        performed_by:performed_by_id (*),
        recorded_by:recorded_by_id (*)
      `)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return (data as any) || []
  }

  /**
   * Create a cleaning log
   */
  async createLog(sessionId: string, input: CreateLogInput): Promise<CleaningLog> {
    const { data, error } = await this.supabase
      .from('task_completion')
      .insert({
        session_id: sessionId,
        assigned_task_id: input.assigned_task_id,
        performed_by_id: input.performed_by_id || null,
        recorded_by_id: input.recorded_by_id || null,
        status: input.status,
        note: input.note || null,
        photo_urls: input.photo_urls || null,
        performed_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return data as any
  }

  /**
   * Update a cleaning log
   */
  async updateLog(logId: string, input: Partial<CreateLogInput>): Promise<CleaningLog> {
    const { data, error } = await this.supabase
      .from('task_completion')
      .update(input)
      .eq('id', logId)
      .select()
      .single()

    if (error) throw error
    return data as any
  }

  /**
   * Get assigned tasks for creating session logs
   */
  async getAssignedTasks(enterpriseId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('assigned_task')
      .select(`
        *,
        room:room_id (*),
        task_template:task_template_id (*),
        default_performer:default_performer_id (*)
      `)
      .eq('room.enterprise_id', enterpriseId)
      .eq('is_active', true)
      .order('room_id', { ascending: true })
      .order('order_in_room', { ascending: true })

    if (error) throw error
    return (data as any) || []
  }

  /**
   * Auto-complete session if all tasks are done
   */
  async checkAndCompleteSession(sessionId: string, enterpriseId: string): Promise<void> {
    const stats = await this.getSessionStats(sessionId)

    if (stats.completion_percentage === 100) {
      await this.update(sessionId, enterpriseId, { status: 'COMPLETEE' })
    }
  }
}

export const sessionsService = new SessionsService()
