'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import {
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  ClockIcon,
  CalendarIcon,
  FunnelIcon
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface TaskCompletion {
  id: string
  task_name: string
  room_name: string
  completed_at: string
  session_date: string
  duration: number | null
  notes: string | null
}

// Stats card config - couleurs du design system
const statsConfig = [
  {
    key: 'total',
    label: 'Total',
    icon: ClipboardDocumentListIcon,
    color: {
      primary: '#9fa8da', // analytics
      light: '#e8eaf6',
      dark: '#6870a0',
      shadow: 'rgba(159,168,218,0.25)'
    }
  },
  {
    key: 'thisWeek',
    label: 'Cette semaine',
    icon: CalendarIcon,
    color: {
      primary: '#aed581', // tasks
      light: '#f1f8e9',
      dark: '#7da453',
      shadow: 'rgba(174,213,129,0.25)'
    }
  },
  {
    key: 'thisMonth',
    label: 'Ce mois',
    icon: CheckCircleIcon,
    color: {
      primary: '#5a9dc9', // clean
      light: '#e3f2fd',
      dark: '#2c5f7f',
      shadow: 'rgba(90,157,201,0.25)'
    }
  },
  {
    key: 'avgDuration',
    label: 'Durée moy.',
    icon: ClockIcon,
    color: {
      primary: '#b39ddb', // settings
      light: '#f3e5f5',
      dark: '#7e57a3',
      shadow: 'rgba(179,157,219,0.25)'
    }
  }
]

export default function EmployeeHistoryPage() {
  const { session, isLoading: authLoading, role } = useAuth()
  const router = useRouter()
  const [completions, setCompletions] = useState<TaskCompletion[]>([])
  const [filteredCompletions, setFilteredCompletions] = useState<TaskCompletion[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterPeriod, setFilterPeriod] = useState<string>('30')

  useEffect(() => {
    if (!authLoading) {
      if (!session || role !== 'Employee') {
        router.push('/login')
        return
      }
      loadCompletions()
    }
  }, [session, authLoading, role, router])

  useEffect(() => {
    applyFilters()
  }, [completions, searchTerm, filterPeriod])

  const loadCompletions = async () => {
    if (!session?.user?.id) return

    try {
      setLoading(true)
      const supabase = createClient()

      const { data, error } = await supabase
        .from('task_completion')
        .select(`
          id,
          completed_at,
          duration,
          notes,
          assigned_task:assigned_task_id (
            task_template:task_template_id (
              name
            ),
            room:room_id (
              name
            )
          ),
          daily_cleaning_session:session_id (
            date
          )
        `)
        .eq('completed_by_id', session.user.id)
        .order('completed_at', { ascending: false })
        .limit(200)

      if (error) throw error

      const formattedData: TaskCompletion[] = (data || []).map((item: any) => ({
        id: item.id,
        task_name: item.assigned_task?.task_template?.name || 'Tâche inconnue',
        room_name: item.assigned_task?.room?.name || 'Pièce inconnue',
        completed_at: item.completed_at,
        session_date: item.daily_cleaning_session?.date || '',
        duration: item.duration,
        notes: item.notes
      }))

      setCompletions(formattedData)
    } catch (error) {
      console.error('Error loading task completions:', error)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...completions]

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (c) =>
          c.task_name.toLowerCase().includes(term) ||
          c.room_name.toLowerCase().includes(term) ||
          c.notes?.toLowerCase().includes(term)
      )
    }

    // Filter by period
    if (filterPeriod !== 'all') {
      const daysAgo = parseInt(filterPeriod)
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysAgo)

      filtered = filtered.filter((c) => new Date(c.completed_at) >= cutoffDate)
    }

    setFilteredCompletions(filtered)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return format(date, "d MMM yyyy 'à' HH:mm", { locale: fr })
  }

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return 'N/A'
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h${mins > 0 ? mins.toString().padStart(2, '0') : ''}`
  }

  const stats = {
    total: filteredCompletions.length,
    thisWeek: filteredCompletions.filter((c) => {
      const date = new Date(c.completed_at)
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return date >= weekAgo
    }).length,
    thisMonth: filteredCompletions.filter((c) => {
      const date = new Date(c.completed_at)
      const monthAgo = new Date()
      monthAgo.setDate(monthAgo.getDate() - 30)
      return date >= monthAgo
    }).length,
    avgDuration:
      filteredCompletions.filter((c) => c.duration).length > 0
        ? Math.round(
            filteredCompletions.reduce((sum, c) => sum + (c.duration || 0), 0) /
              filteredCompletions.filter((c) => c.duration).length
          )
        : 0
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header - Style "Douceur Professionnelle" avec couleur Analytics */}
        <div className="relative rounded-3xl p-8 bg-white border overflow-hidden shadow-lg"
          style={{
            borderColor: `${statsConfig[0].color.primary}33`
          }}
        >
          <div className="absolute inset-0 opacity-60"
            style={{
              background: `linear-gradient(to bottom right, ${statsConfig[0].color.light}, white)`
            }}
          />
          <div className="relative z-10">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Mon Historique
            </h1>
            <p className="text-gray-600">
              Consultez l'historique de vos tâches accomplies
            </p>
          </div>
        </div>

        {/* Stats Cards - Couleurs variées du design system */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsConfig.map((config) => {
            const Icon = config.icon
            const value = config.key === 'avgDuration'
              ? `${stats[config.key]} min`
              : stats[config.key as keyof typeof stats]

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

        {/* Filters - Style "Douceur Professionnelle" avec couleur Communication */}
        <div
          className="relative rounded-3xl p-6 bg-white hover:-translate-y-1 transition-all duration-300 overflow-hidden shadow-lg"
          style={{
            border: `1px solid #64b5d133`, // communication
            boxShadow: '0 0 0 0 transparent'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 16px 48px -12px rgba(100,181,209,0.25)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 0 0 0 transparent'
          }}
        >
          {/* Gradient fond */}
          <div
            className="absolute inset-0 opacity-60"
            style={{ background: 'linear-gradient(to bottom right, #e0f7fa, white)' }}
          />

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{ background: 'linear-gradient(to bottom right, #64b5d11A, #64b5d10D)' }}
              >
                <FunnelIcon className="w-5 h-5 text-[#3a7a8f]" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Filtres</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Rechercher</label>
                <Input
                  placeholder="Tâche, pièce, notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Période</label>
                <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 derniers jours</SelectItem>
                    <SelectItem value="30">30 derniers jours</SelectItem>
                    <SelectItem value="90">90 derniers jours</SelectItem>
                    <SelectItem value="all">Tout l&apos;historique</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Task Completions List - Style "Douceur Professionnelle" avec couleur Tasks */}
        <div
          className="relative rounded-3xl p-6 bg-white transition-all duration-300 overflow-hidden shadow-lg"
          style={{
            border: `1px solid #aed58133`, // tasks
          }}
        >
          {/* Gradient fond */}
          <div
            className="absolute inset-0 opacity-60"
            style={{ background: 'linear-gradient(to bottom right, #f1f8e9, white)' }}
          />

          <div className="relative z-10">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-1">
                Tâches accomplies ({filteredCompletions.length})
              </h3>
              <p className="text-sm text-gray-600">
                Liste de toutes vos tâches terminées
              </p>
            </div>

            {filteredCompletions.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#aed581]/10 to-[#aed581]/5 flex items-center justify-center mx-auto mb-4">
                  <ClipboardDocumentListIcon className="w-10 h-10 text-[#7da453]" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune tâche trouvée</h3>
                <p className="text-gray-600">
                  {searchTerm || filterPeriod !== 'all'
                    ? 'Essayez de modifier vos filtres'
                    : 'Vos tâches accomplies apparaîtront ici'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredCompletions.map((completion) => (
                  <div
                    key={completion.id}
                    className="relative rounded-3xl p-5 bg-white hover:-translate-y-1 transition-all duration-300 group overflow-hidden"
                    style={{
                      border: '1px solid #81c99533', // haccp/success
                      boxShadow: '0 0 0 0 transparent'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 16px 48px -12px rgba(129,201,149,0.25)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = '0 0 0 0 transparent'
                    }}
                  >
                    {/* Gradient fond */}
                    <div
                      className="absolute inset-0 opacity-60"
                      style={{ background: 'linear-gradient(to bottom right, #e8f5e9, white)' }}
                    />

                    <div className="relative z-10 flex items-start gap-4">
                      {/* Icône avec animation */}
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 group-hover:rotate-2 transition-all duration-300"
                        style={{ background: 'linear-gradient(to bottom right, #81c9951A, #81c9950D)' }}
                      >
                        <CheckCircleIcon className="w-6 h-6 text-[#4a8f5a]" strokeWidth={2} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div>
                            <h4 className="font-semibold text-gray-900">{completion.task_name}</h4>
                            <p className="text-sm text-gray-600">{completion.room_name}</p>
                          </div>
                          {completion.duration && (
                            <Badge variant="outline" className="flex-shrink-0">
                              <ClockIcon className="w-3 h-3 mr-1" strokeWidth={1.5} />
                              {formatDuration(completion.duration)}
                            </Badge>
                          )}
                        </div>

                        <p className="text-sm text-gray-600 mb-2">
                          {formatDate(completion.completed_at)}
                          {completion.session_date && (
                            <span className="ml-2">
                              • Session du {format(new Date(completion.session_date), 'd MMM yyyy', { locale: fr })}
                            </span>
                          )}
                        </p>

                        {completion.notes && (
                          <div className="mt-3 p-3 bg-white/70 rounded-xl border border-gray-200 text-sm">
                            <p className="font-medium text-xs text-gray-500 mb-1">Notes :</p>
                            <p className="text-gray-700">{completion.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
