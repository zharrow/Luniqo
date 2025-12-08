'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/contexts/AuthContext'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { getTodayLocal, formatDateLocal } from '@/lib/utils/date'

interface AssignedTaskWithCompletion {
  id: string
  task_name: string
  room_name: string
  session_date: string
  is_completed: boolean
  completed_at: string | null
  duration: number | null
}

export default function EmployeeCalendarPage() {
  const { session, isLoading: authLoading, role } = useAuth()
  const router = useRouter()
  const [weekStart, setWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [tasks, setTasks] = useState<AssignedTaskWithCompletion[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading) {
      if (!session || role !== 'Employee') {
        router.push('/login')
        return
      }
      loadWeekTasks()
    }
  }, [session, authLoading, role, router, weekStart])

  const loadWeekTasks = async () => {
    if (!session?.user?.id || !session?.enterprise?.id) return

    try {
      setLoading(true)
      const supabase = createClient()

      // Calculer les dates de la semaine
      const weekDates = Array.from({ length: 7 }, (_, i) => {
        const date = addDays(weekStart, i)
        return formatDateLocal(date)
      })

      const startDate = weekDates[0]
      const endDate = weekDates[6]

      // Charger les sessions de la semaine
      const { data: sessions, error: sessionsError } = await supabase
        .from('daily_cleaning_session')
        .select('id, date')
        .eq('enterprise_id', session.enterprise.id)
        .gte('date', startDate)
        .lte('date', endDate)

      if (sessionsError) throw sessionsError

      if (!sessions || sessions.length === 0) {
        setTasks([])
        setLoading(false)
        return
      }

      // Type assertion pour TypeScript
      const validSessions = sessions as Array<{ id: string; date: string }>
      const sessionIds = validSessions.map((s) => s.id)

      // Charger les tâches assignées avec leurs complétions
      const { data: assignedTasks, error: tasksError } = await supabase
        .from('assigned_task')
        .select(`
          id,
          session_id,
          task_template:task_template_id (
            name
          ),
          room:room_id (
            name
          )
        `)
        .in('session_id', sessionIds)

      if (tasksError) throw tasksError

      // Charger les complétions de l'employé
      const { data: completions, error: completionsError } = await supabase
        .from('task_completion')
        .select('assigned_task_id, completed_at, duration')
        .eq('completed_by_id', session.user.id)
        .in(
          'assigned_task_id',
          (assignedTasks || []).map((t: any) => t.id)
        )

      if (completionsError) throw completionsError

      // Créer un map des complétions
      const completionMap = new Map(
        (completions || []).map((c: any) => [c.assigned_task_id, c])
      )

      // Créer un map des sessions par id
      const sessionMap = new Map(validSessions.map((s) => [s.id, s.date]))

      // Combiner les données
      const formattedTasks: AssignedTaskWithCompletion[] = (assignedTasks || []).map(
        (task: any) => {
          const completion = completionMap.get(task.id)
          return {
            id: task.id,
            task_name: task.task_template?.name || 'Tâche inconnue',
            room_name: task.room?.name || 'Pièce inconnue',
            session_date: sessionMap.get(task.session_id) || '',
            is_completed: !!completion,
            completed_at: completion?.completed_at || null,
            duration: completion?.duration || null
          }
        }
      )

      setTasks(formattedTasks)
    } catch (error) {
      console.error('Error loading week tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const goToPreviousWeek = () => {
    setWeekStart(addDays(weekStart, -7))
  }

  const goToNextWeek = () => {
    setWeekStart(addDays(weekStart, 7))
  }

  const goToToday = () => {
    setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))
  }

  const getTasksForDay = (date: Date): AssignedTaskWithCompletion[] => {
    const dateStr = formatDateLocal(date)
    return tasks.filter((task) => task.session_date === dateStr)
  }

  const getDayStats = (date: Date) => {
    const dayTasks = getTasksForDay(date)
    return {
      total: dayTasks.length,
      completed: dayTasks.filter((t) => t.is_completed).length
    }
  }

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const isCurrentWeek = weekDays.some((day) => isSameDay(day, new Date()))
  const today = getTodayLocal()

  const totalWeekTasks = tasks.length
  const totalWeekCompleted = tasks.filter((t) => t.is_completed).length
  const weekCompletionRate =
    totalWeekTasks > 0 ? Math.round((totalWeekCompleted / totalWeekTasks) * 100) : 0

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Mon Calendrier</h1>
            <p className="text-muted-foreground">
              Vue hebdomadaire de vos tâches assignées
            </p>
          </div>
        </div>

        {/* Week Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-primary-100 flex items-center justify-center">
                  <CalendarIcon className="w-6 h-6 text-primary-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalWeekTasks}</p>
                  <p className="text-sm text-muted-foreground">Tâches cette semaine</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                  <CheckCircleIcon className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalWeekCompleted}</p>
                  <p className="text-sm text-muted-foreground">Complétées</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <ClockIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{weekCompletionRate}%</p>
                  <p className="text-sm text-muted-foreground">Taux de complétion</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Week Navigation */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <Button onClick={goToPreviousWeek} variant="outline" size="sm">
                <ChevronLeftIcon className="w-4 h-4" />
                Semaine précédente
              </Button>

              <div className="text-center">
                <p className="font-semibold">
                  {format(weekDays[0], 'd MMM', { locale: fr })} -{' '}
                  {format(weekDays[6], 'd MMM yyyy', { locale: fr })}
                </p>
                {!isCurrentWeek && (
                  <Button onClick={goToToday} variant="link" size="sm" className="mt-1">
                    Aujourd'hui
                  </Button>
                )}
              </div>

              <Button onClick={goToNextWeek} variant="outline" size="sm">
                Semaine suivante
                <ChevronRightIcon className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Calendar Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
          {weekDays.map((day, index) => {
            const dayTasks = getTasksForDay(day)
            const stats = getDayStats(day)
            const isToday = formatDateLocal(day) === today
            const isPast = formatDateLocal(day) < today

            return (
              <Card
                key={index}
                className={`${
                  isToday ? 'border-primary-500 border-2' : ''
                } ${isPast && !isToday ? 'opacity-70' : ''}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground uppercase">
                        {format(day, 'EEEE', { locale: fr })}
                      </p>
                      <p className="text-2xl font-bold">
                        {format(day, 'd', { locale: fr })}
                      </p>
                    </div>
                    {isToday && (
                      <Badge className="bg-primary-500">Aujourd'hui</Badge>
                    )}
                  </div>
                  {stats.total > 0 && (
                    <div className="text-xs text-muted-foreground mt-2">
                      {stats.completed}/{stats.total} tâches
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-2">
                  {dayTasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Aucune tâche
                    </p>
                  ) : (
                    dayTasks.map((task) => (
                      <div
                        key={task.id}
                        className={`p-2 rounded-lg border ${
                          task.is_completed
                            ? 'bg-green-50 border-green-200'
                            : 'bg-muted border-border'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {task.is_completed ? (
                            <CheckCircleIcon className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border-2 border-muted-foreground mt-0.5 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium leading-tight">
                              {task.task_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {task.room_name}
                            </p>
                            {task.is_completed && task.duration && (
                              <p className="text-xs text-green-600 mt-1">
                                {task.duration} min
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Info Card */}
        {totalWeekTasks === 0 && (
          <Card>
            <CardContent className="pt-6 text-center py-12">
              <CalendarIcon className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Aucune tâche cette semaine</h3>
              <p className="text-muted-foreground">
                Vos tâches assignées apparaîtront ici
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
