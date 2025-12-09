'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/contexts/AuthContext'
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
      <>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header - Style Calendar (Pêche) */}
        <div className="rounded-3xl bg-gradient-to-br from-amber-100 via-orange-50 to-yellow-100 p-8 border border-amber-200/50 shadow-lg">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-700 bg-clip-text text-transparent mb-2">
            Mon Calendrier 📅
          </h1>
          <p className="text-gray-600">
            Vue hebdomadaire de vos tâches assignées
          </p>
        </div>

        {/* Week Stats - Couleurs variées */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total Tasks - Pêche */}
          <Card className="rounded-3xl border-amber-200/50 bg-gradient-to-br from-amber-50 to-orange-50 shadow-lg hover:shadow-xl hover:shadow-amber-100 transition-all duration-300 hover:scale-105">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center border border-amber-200 shadow-sm group-hover:rotate-6 transition-transform">
                  <CalendarIcon className="w-7 h-7 text-amber-600" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-3xl font-bold text-amber-700">{totalWeekTasks}</p>
                  <p className="text-sm text-amber-600/80">Tâches cette semaine</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Completed Tasks - Vert */}
          <Card className="rounded-3xl border-emerald-200/50 bg-gradient-to-br from-emerald-50 to-teal-50 shadow-lg hover:shadow-xl hover:shadow-emerald-100 transition-all duration-300 hover:scale-105">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center border border-emerald-200 shadow-sm group-hover:rotate-6 transition-transform">
                  <CheckCircleIcon className="w-7 h-7 text-emerald-600" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-3xl font-bold text-emerald-700">{totalWeekCompleted}</p>
                  <p className="text-sm text-emerald-600/80">Complétées</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Completion Rate - Bleu */}
          <Card className="rounded-3xl border-sky-200/50 bg-gradient-to-br from-sky-50 to-blue-50 shadow-lg hover:shadow-xl hover:shadow-sky-100 transition-all duration-300 hover:scale-105">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-100 to-blue-100 flex items-center justify-center border border-sky-200 shadow-sm group-hover:rotate-6 transition-transform">
                  <ClockIcon className="w-7 h-7 text-sky-600" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-3xl font-bold text-sky-700">{weekCompletionRate}%</p>
                  <p className="text-sm text-sky-600/80">Taux de complétion</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Week Navigation - Style Pêche */}
        <Card className="rounded-3xl border-amber-200/50 bg-gradient-to-br from-amber-50 to-orange-50 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <Button
                onClick={goToPreviousWeek}
                variant="outline"
                size="sm"
                className="border-amber-200 text-amber-700 hover:bg-amber-50 transition-all duration-300 hover:scale-105"
              >
                <ChevronLeftIcon className="w-4 h-4" />
                Semaine précédente
              </Button>

              <div className="text-center">
                <p className="font-semibold text-amber-700 text-lg">
                  {format(weekDays[0], 'd MMM', { locale: fr })} -{' '}
                  {format(weekDays[6], 'd MMM yyyy', { locale: fr })}
                </p>
                {!isCurrentWeek && (
                  <Button
                    onClick={goToToday}
                    variant="link"
                    size="sm"
                    className="mt-1 text-amber-600 hover:text-amber-700"
                  >
                    Aujourd'hui
                  </Button>
                )}
              </div>

              <Button
                onClick={goToNextWeek}
                variant="outline"
                size="sm"
                className="border-amber-200 text-amber-700 hover:bg-amber-50 transition-all duration-300 hover:scale-105"
              >
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
                className={`rounded-3xl transition-all duration-300 ${
                  isToday
                    ? 'border-2 border-amber-400 bg-gradient-to-br from-amber-50 to-orange-50 shadow-xl shadow-amber-200'
                    : 'border-gray-200/50 bg-gradient-to-br from-white to-gray-50 shadow-md hover:shadow-lg'
                } ${isPast && !isToday ? 'opacity-60' : ''}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {format(day, 'EEEE', { locale: fr })}
                      </p>
                      <p className={`text-3xl font-bold ${isToday ? 'text-amber-700' : 'text-gray-700'}`}>
                        {format(day, 'd', { locale: fr })}
                      </p>
                    </div>
                    {isToday && (
                      <Badge className="bg-gradient-to-r from-amber-500 to-orange-600 text-white border-0 shadow-lg">
                        Aujourd&apos;hui
                      </Badge>
                    )}
                  </div>
                  {stats.total > 0 && (
                    <div className={`text-xs font-medium mt-2 ${isToday ? 'text-amber-600' : 'text-gray-600'}`}>
                      {stats.completed}/{stats.total} tâches
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-2">
                  {dayTasks.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">
                      Aucune tâche
                    </p>
                  ) : (
                    dayTasks.map((task) => (
                      <div
                        key={task.id}
                        className={`p-3 rounded-2xl border transition-all duration-300 ${
                          task.is_completed
                            ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200 shadow-sm hover:shadow-md'
                            : 'bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200 hover:border-gray-300 shadow-sm'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {task.is_completed ? (
                            <CheckCircleIcon className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" strokeWidth={2} />
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-gray-400 mt-0.5 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold leading-tight text-gray-700">
                              {task.task_name}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              📍 {task.room_name}
                            </p>
                            {task.is_completed && task.duration && (
                              <p className="text-xs text-emerald-600 font-medium mt-1">
                                ⏱️ {task.duration} min
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
          <Card className="rounded-3xl border-gray-200 bg-gradient-to-br from-gray-50 to-slate-50 shadow-lg">
            <CardContent className="pt-6 text-center py-12">
              <CalendarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" strokeWidth={1.5} />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Aucune tâche cette semaine</h3>
              <p className="text-gray-500">
                Vos tâches assignées apparaîtront ici
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  )
}
