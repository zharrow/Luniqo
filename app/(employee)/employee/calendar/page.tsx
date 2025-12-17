'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import {
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'
import { format, startOfWeek, addDays, isSameDay } from 'date-fns'
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

// Stats card config - couleurs du design system
const statsConfig = [
  {
    key: 'total',
    label: 'Tâches cette semaine',
    icon: CalendarIcon,
    color: {
      primary: '#ffab91', // calendar
      light: '#fff3e0',
      dark: '#d97557',
      shadow: 'rgba(255,171,145,0.25)'
    }
  },
  {
    key: 'completed',
    label: 'Complétées',
    icon: CheckCircleIcon,
    color: {
      primary: '#81c995', // haccp
      light: '#e8f5e9',
      dark: '#4a8f5a',
      shadow: 'rgba(129,201,149,0.25)'
    }
  },
  {
    key: 'rate',
    label: 'Taux de complétion',
    icon: ClockIcon,
    color: {
      primary: '#5a9dc9', // clean
      light: '#e3f2fd',
      dark: '#2c5f7f',
      shadow: 'rgba(90,157,201,0.25)'
    }
  }
]

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
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    )
  }

  const statsValues = {
    total: totalWeekTasks,
    completed: totalWeekCompleted,
    rate: `${weekCompletionRate}%`
  }

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header - Style "Douceur Professionnelle" avec couleur Calendar */}
        <div
          className="relative rounded-3xl p-8 bg-white border overflow-hidden shadow-lg"
          style={{
            borderColor: `${statsConfig[0].color.primary}33`
          }}
        >
          <div
            className="absolute inset-0 opacity-60"
            style={{
              background: `linear-gradient(to bottom right, ${statsConfig[0].color.light}, white)`
            }}
          />
          <div className="relative z-10">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Mon Calendrier</h1>
            <p className="text-gray-600">Vue hebdomadaire de vos tâches assignées</p>
          </div>
        </div>

        {/* Week Stats - Couleurs variées du design system */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {statsConfig.map((config) => {
            const Icon = config.icon
            const value = statsValues[config.key as keyof typeof statsValues]

            return (
              <div
                key={config.key}
                className="relative rounded-3xl p-6 bg-white hover:-translate-y-1 transition-all duration-300 group overflow-hidden"
                style={{
                  border: `1px solid ${config.color.primary}33`,
                  boxShadow: '0 0 0 0 transparent'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = `0 16px 48px -12px ${config.color.shadow}`
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 0 0 transparent'
                }}
              >
                {/* Gradient fond */}
                <div
                  className="absolute inset-0 opacity-60"
                  style={{
                    background: `linear-gradient(to bottom right, ${config.color.light}, white)`
                  }}
                />

                <div className="relative z-10 flex items-center gap-3">
                  {/* Icône avec animation */}
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-105 group-hover:rotate-2 transition-all duration-300"
                    style={{
                      background: `linear-gradient(to bottom right, ${config.color.primary}1A, ${config.color.primary}0D)`
                    }}
                  >
                    <Icon className="w-6 h-6" strokeWidth={1.5} style={{ color: config.color.dark }} />
                  </div>

                  <div>
                    <p className="text-3xl font-bold text-gray-900">{value}</p>
                    <p className="text-sm text-gray-600">{config.label}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Week Navigation - Style "Douceur Professionnelle" avec couleur Calendar */}
        <div
          className="relative rounded-3xl p-6 bg-white transition-all duration-300 overflow-hidden shadow-lg"
          style={{
            border: `1px solid ${statsConfig[0].color.primary}33`
          }}
        >
          {/* Gradient fond */}
          <div
            className="absolute inset-0 opacity-60"
            style={{
              background: `linear-gradient(to bottom right, ${statsConfig[0].color.light}, white)`
            }}
          />

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
            <Button
              onClick={goToPreviousWeek}
              variant="outline"
              size="sm"
              className="hover:scale-105 transition-all duration-300"
            >
              <ChevronLeftIcon className="w-4 h-4" />
              Semaine précédente
            </Button>

            <div className="text-center">
              <p className="font-semibold text-gray-900 text-lg">
                {format(weekDays[0], 'd MMM', { locale: fr })} -{' '}
                {format(weekDays[6], 'd MMM yyyy', { locale: fr })}
              </p>
              {!isCurrentWeek && (
                <Button
                  onClick={goToToday}
                  variant="link"
                  size="sm"
                  className="mt-1"
                >
                  Aujourd&apos;hui
                </Button>
              )}
            </div>

            <Button
              onClick={goToNextWeek}
              variant="outline"
              size="sm"
              className="hover:scale-105 transition-all duration-300"
            >
              Semaine suivante
              <ChevronRightIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Calendar Grid - Style "Douceur Professionnelle" */}
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
          {weekDays.map((day, index) => {
            const dayTasks = getTasksForDay(day)
            const stats = getDayStats(day)
            const isToday = formatDateLocal(day) === today
            const isPast = formatDateLocal(day) < today

            // Couleur du jour : Calendar (pêche) si aujourd'hui, Tasks (lime) sinon
            const dayColor = isToday
              ? statsConfig[0].color // calendar (pêche)
              : { primary: '#aed581', light: '#f1f8e9', dark: '#7da453', shadow: 'rgba(174,213,129,0.25)' } // tasks (lime)

            return (
              <div
                key={index}
                className={`relative rounded-3xl p-5 bg-white hover:-translate-y-1 transition-all duration-300 overflow-hidden ${
                  isPast && !isToday ? 'opacity-60' : ''
                }`}
                style={{
                  border: `${isToday ? '2px' : '1px'} solid ${dayColor.primary}${isToday ? '66' : '33'}`,
                  boxShadow: isToday
                    ? `0 16px 48px -12px ${dayColor.shadow}`
                    : '0 0 0 0 transparent'
                }}
                onMouseEnter={(e) => {
                  if (!isToday) {
                    e.currentTarget.style.boxShadow = `0 16px 48px -12px ${dayColor.shadow}`
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isToday) {
                    e.currentTarget.style.boxShadow = '0 0 0 0 transparent'
                  }
                }}
              >
                {/* Gradient fond */}
                <div
                  className="absolute inset-0 opacity-60"
                  style={{
                    background: `linear-gradient(to bottom right, ${dayColor.light}, white)`
                  }}
                />

                <div className="relative z-10">
                  {/* Header du jour */}
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {format(day, 'EEEE', { locale: fr })}
                      </p>
                      <p className="text-3xl font-bold text-gray-900">
                        {format(day, 'd', { locale: fr })}
                      </p>
                    </div>
                    {isToday && (
                      <Badge
                        className="border-0 text-white font-semibold shadow-lg"
                        style={{
                          background: `linear-gradient(to right, ${dayColor.primary}, ${dayColor.dark})`
                        }}
                      >
                        Aujourd&apos;hui
                      </Badge>
                    )}
                  </div>

                  {stats.total > 0 && (
                    <div className="text-xs font-medium mb-3 text-gray-600">
                      {stats.completed}/{stats.total} tâches
                    </div>
                  )}

                  {/* Liste des tâches */}
                  <div className="space-y-2">
                    {dayTasks.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-6">Aucune tâche</p>
                    ) : (
                      dayTasks.map((task) => {
                        // Couleur de la tâche : HACCP (vert) si complétée, gris sinon
                        const taskColor = task.is_completed
                          ? statsConfig[1].color // haccp (vert)
                          : { primary: '#9ca3af', light: '#f9fafb', dark: '#6b7280' } // gris

                        return (
                          <div
                            key={task.id}
                            className="p-3 rounded-2xl relative overflow-hidden transition-all duration-300 hover:scale-105"
                            style={{
                              border: `1px solid ${taskColor.primary}33`,
                              background: `linear-gradient(to bottom right, ${taskColor.light}, white)`
                            }}
                          >
                            <div className="flex items-start gap-2">
                              {task.is_completed ? (
                                <CheckCircleIcon
                                  className="w-5 h-5 mt-0.5 flex-shrink-0"
                                  strokeWidth={2}
                                  style={{ color: taskColor.dark }}
                                />
                              ) : (
                                <div
                                  className="w-5 h-5 rounded-full border-2 mt-0.5 flex-shrink-0"
                                  style={{ borderColor: taskColor.primary }}
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold leading-tight text-gray-900">
                                  {task.task_name}
                                </p>
                                <p className="text-xs text-gray-600 mt-1">{task.room_name}</p>
                                {task.is_completed && task.duration && (
                                  <p className="text-xs font-medium mt-1" style={{ color: taskColor.dark }}>
                                    {task.duration} min
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Info Card - Empty State */}
        {totalWeekTasks === 0 && (
          <div
            className="relative rounded-3xl p-6 bg-white transition-all duration-300 overflow-hidden shadow-lg"
            style={{
              border: '1px solid #9ca3af33'
            }}
          >
            {/* Gradient fond */}
            <div
              className="absolute inset-0 opacity-60"
              style={{
                background: 'linear-gradient(to bottom right, #f9fafb, white)'
              }}
            />

            <div className="relative z-10 text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <CalendarIcon className="w-10 h-10 text-gray-400" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune tâche cette semaine</h3>
              <p className="text-gray-600">Vos tâches assignées apparaîtront ici</p>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
