import { createClient } from '@/lib/supabase/client'
import { AssignedTask, assignedTasksService, DayOfWeek } from './assigned-tasks.service'
import { formatDateLocal } from '@/lib/utils/date'

export interface CalendarTask {
  id: string
  name: string
  category: string | null
  room: {
    id: string
    name: string
  }
  status?: 'todo' | 'in_progress' | 'done'
  assignedTaskId: string
  suggestedTime?: string | null
  expectedDuration?: number | null
}

export interface DayTasks {
  date: Date
  dayName: string
  dayNumber: number
  isToday: boolean
  tasks: CalendarTask[]
}

export interface WeekData {
  weekStart: Date
  weekEnd: Date
  days: DayTasks[]
}

export class CalendarService {
  private supabase: any = createClient()

  /**
   * Get the start of the week (Monday) for a given date
   */
  private getWeekStart(date: Date): Date {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
    return new Date(d.setDate(diff))
  }

  /**
   * Get weekdays (Monday to Friday) starting from a given Monday
   */
  private getWeekDays(startDate: Date): Date[] {
    const days: Date[] = []
    // Only get 5 days (Monday to Friday) - crèche is closed on weekends
    for (let i = 0; i < 5; i++) {
      const day = new Date(startDate)
      day.setDate(startDate.getDate() + i)
      days.push(day)
    }
    return days
  }

  /**
   * Check if a task should appear on a specific day based on its frequency
   */
  private shouldShowTaskOnDay(
    task: AssignedTask,
    date: Date,
    weekStart: Date
  ): boolean {
    // If no frequency specified, task appears every day
    if (!task.frequency || !task.frequency.days || task.frequency.days.length === 0) {
      return true
    }

    // Get day name in English (Monday, Tuesday, etc.)
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }) as DayOfWeek

    // Check if this day is in the frequency days
    return task.frequency.days.includes(dayName)
  }

  /**
   * Get tasks completion status for a specific day
   */
  private async getTasksStatusForDay(
    assignedTaskIds: string[],
    date: Date,
    nurseryId: string
  ): Promise<Map<string, 'todo' | 'in_progress' | 'done'>> {
    const dateStr = formatDateLocal(date)
    const statusMap = new Map<string, 'todo' | 'in_progress' | 'done'>()

    // Get today's session
    const { data: session } = await this.supabase
      .from('daily_cleaning_session')
      .select('id, status')
      .eq('nursery_id', nurseryId)
      .eq('date', dateStr)
      .maybeSingle()

    if (!session) {
      // No session = all tasks are todo
      assignedTaskIds.forEach(id => statusMap.set(id, 'todo'))
      return statusMap
    }

    // Get cleaning logs for this session
    const { data: logs } = await this.supabase
      .from('task_completion')
      .select('assigned_task_id, status')
      .eq('session_id', (session as any).id)
      .in('assigned_task_id', assignedTaskIds)

    if (!logs || logs.length === 0) {
      assignedTaskIds.forEach(id => statusMap.set(id, 'todo'))
      return statusMap
    }

    // Map statuses
    logs.forEach((log: any) => {
      if (log.status === 'FAIT') {
        statusMap.set(log.assigned_task_id, 'done')
      } else if (log.status === 'PARTIEL') {
        statusMap.set(log.assigned_task_id, 'in_progress')
      } else {
        statusMap.set(log.assigned_task_id, 'todo')
      }
    })

    // Set remaining tasks as todo
    assignedTaskIds.forEach(id => {
      if (!statusMap.has(id)) {
        statusMap.set(id, 'todo')
      }
    })

    return statusMap
  }

  /**
   * Get weekly calendar data with tasks
   */
  async getWeeklyData(
    nurseryId: string,
    weekOffset: number = 0,
    roomFilter?: string
  ): Promise<WeekData> {
    // Calculate week start
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const weekStart = this.getWeekStart(today)
    weekStart.setDate(weekStart.getDate() + weekOffset * 7)

    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 4) // Friday (Mon + 4 days)

    // Get all assigned tasks for the nursery
    const assignedTasks = await assignedTasksService.getByNursery(nurseryId)

    // Filter by room if specified
    const filteredTasks = roomFilter
      ? assignedTasks.filter(t => t.room_id === roomFilter)
      : assignedTasks

    // Get week days
    const weekDays = this.getWeekDays(weekStart)

    // Build calendar structure
    const days: DayTasks[] = []
    const todayStr = formatDateLocal(today)

    for (const date of weekDays) {
      const dateStr = formatDateLocal(date)
      const isToday = dateStr === todayStr

      // Get tasks for this day
      const dayTasks: CalendarTask[] = []
      const assignedTaskIds: string[] = []

      filteredTasks.forEach(assignedTask => {
        if (this.shouldShowTaskOnDay(assignedTask, date, weekStart)) {
          if (assignedTask.task_template && assignedTask.room) {
            assignedTaskIds.push(assignedTask.id)
            dayTasks.push({
              id: assignedTask.task_template.id,
              name: assignedTask.task_template.name,
              category: assignedTask.task_template.task_category?.name || null,
              room: {
                id: assignedTask.room.id,
                name: assignedTask.room.name
              },
              assignedTaskId: assignedTask.id,
              suggestedTime: assignedTask.suggested_time,
              expectedDuration: assignedTask.expected_duration
            })
          }
        }
      })

      // Get status for tasks on this day
      const statusMap = await this.getTasksStatusForDay(
        assignedTaskIds,
        date,
        nurseryId
      )

      // Apply status to tasks
      dayTasks.forEach(task => {
        task.status = statusMap.get(task.assignedTaskId) || 'todo'
      })

      // Sort tasks by suggested time, then by name
      dayTasks.sort((a, b) => {
        if (a.suggestedTime && b.suggestedTime) {
          return a.suggestedTime.localeCompare(b.suggestedTime)
        }
        if (a.suggestedTime) return -1
        if (b.suggestedTime) return 1
        return a.name.localeCompare(b.name)
      })

      days.push({
        date,
        dayName: date.toLocaleDateString('fr-FR', { weekday: 'long' }),
        dayNumber: date.getDate(),
        isToday,
        tasks: dayTasks
      })
    }

    return {
      weekStart,
      weekEnd,
      days
    }
  }

  /**
   * Get daily calendar data with tasks for a single day
   */
  async getDailyData(
    nurseryId: string,
    dayOffset: number = 0,
    roomFilter?: string
  ): Promise<DayTasks> {
    // Calculate target date
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const targetDate = new Date(today)
    targetDate.setDate(today.getDate() + dayOffset)

    // Get week start for context (used by shouldShowTaskOnDay)
    const weekStart = this.getWeekStart(targetDate)

    // Get all assigned tasks for the nursery
    const assignedTasks = await assignedTasksService.getByNursery(nurseryId)

    // Filter by room if specified
    const filteredTasks = roomFilter
      ? assignedTasks.filter(t => t.room_id === roomFilter)
      : assignedTasks

    // Get tasks for this day
    const dayTasks: CalendarTask[] = []
    const assignedTaskIds: string[] = []

    filteredTasks.forEach(assignedTask => {
      if (this.shouldShowTaskOnDay(assignedTask, targetDate, weekStart)) {
        if (assignedTask.task_template && assignedTask.room) {
          assignedTaskIds.push(assignedTask.id)
          dayTasks.push({
            id: assignedTask.task_template.id,
            name: assignedTask.task_template.name,
            category: assignedTask.task_template.task_category?.name || null,
            room: {
              id: assignedTask.room.id,
              name: assignedTask.room.name
            },
            assignedTaskId: assignedTask.id,
            suggestedTime: assignedTask.suggested_time,
            expectedDuration: assignedTask.expected_duration
          })
        }
      }
    })

    // Get status for tasks on this day
    const statusMap = await this.getTasksStatusForDay(
      assignedTaskIds,
      targetDate,
      nurseryId
    )

    // Apply status to tasks
    dayTasks.forEach(task => {
      task.status = statusMap.get(task.assignedTaskId) || 'todo'
    })

    // Sort tasks by suggested time, then by name
    dayTasks.sort((a, b) => {
      if (a.suggestedTime && b.suggestedTime) {
        return a.suggestedTime.localeCompare(b.suggestedTime)
      }
      if (a.suggestedTime) return -1
      if (b.suggestedTime) return 1
      return a.name.localeCompare(b.name)
    })

    const todayStr = formatDateLocal(today)
    const dateStr = formatDateLocal(targetDate)
    const isToday = dateStr === todayStr

    return {
      date: targetDate,
      dayName: targetDate.toLocaleDateString('fr-FR', { weekday: 'long' }),
      dayNumber: targetDate.getDate(),
      isToday,
      tasks: dayTasks
    }
  }

  /**
   * Get task count statistics for the week
   */
  async getWeekStats(nurseryId: string, weekOffset: number = 0): Promise<{
    totalTasks: number
    completedTasks: number
    inProgressTasks: number
    todoTasks: number
  }> {
    const weekData = await this.getWeeklyData(nurseryId, weekOffset)

    let totalTasks = 0
    let completedTasks = 0
    let inProgressTasks = 0
    let todoTasks = 0

    weekData.days.forEach(day => {
      day.tasks.forEach(task => {
        totalTasks++
        if (task.status === 'done') completedTasks++
        else if (task.status === 'in_progress') inProgressTasks++
        else todoTasks++
      })
    })

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      todoTasks
    }
  }
}

export const calendarService = new CalendarService()
