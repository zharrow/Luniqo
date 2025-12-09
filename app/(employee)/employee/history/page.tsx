'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
        {/* Header - Style Analytics (Indigo) */}
        <div className="rounded-3xl bg-gradient-to-br from-indigo-100 via-blue-50 to-purple-100 p-8 border border-indigo-200/50 shadow-lg">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-blue-700 bg-clip-text text-transparent mb-2">
            Mon Historique 📊
          </h1>
          <p className="text-gray-600">
            Consultez l'historique de vos tâches accomplies
          </p>
        </div>

        {/* Stats Cards - Couleurs variées */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Total - Indigo */}
          <Card className="rounded-3xl border-indigo-200/50 bg-gradient-to-br from-indigo-50 to-blue-50 shadow-lg hover:shadow-xl hover:shadow-indigo-100 transition-all duration-300 hover:scale-105">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center border border-indigo-200 shadow-sm">
                  <ClipboardDocumentListIcon className="w-7 h-7 text-indigo-600" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-3xl font-bold text-indigo-700">{stats.total}</p>
                  <p className="text-sm text-indigo-600/80">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* This Week - Vert */}
          <Card className="rounded-3xl border-emerald-200/50 bg-gradient-to-br from-emerald-50 to-teal-50 shadow-lg hover:shadow-xl hover:shadow-emerald-100 transition-all duration-300 hover:scale-105">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center border border-emerald-200 shadow-sm">
                  <CalendarIcon className="w-7 h-7 text-emerald-600" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-3xl font-bold text-emerald-700">{stats.thisWeek}</p>
                  <p className="text-sm text-emerald-600/80">Cette semaine</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* This Month - Bleu */}
          <Card className="rounded-3xl border-sky-200/50 bg-gradient-to-br from-sky-50 to-cyan-50 shadow-lg hover:shadow-xl hover:shadow-sky-100 transition-all duration-300 hover:scale-105">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-100 to-cyan-100 flex items-center justify-center border border-sky-200 shadow-sm">
                  <CheckCircleIcon className="w-7 h-7 text-sky-600" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-3xl font-bold text-sky-700">{stats.thisMonth}</p>
                  <p className="text-sm text-sky-600/80">Ce mois</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Avg Duration - Violet */}
          <Card className="rounded-3xl border-violet-200/50 bg-gradient-to-br from-violet-50 to-purple-50 shadow-lg hover:shadow-xl hover:shadow-violet-100 transition-all duration-300 hover:scale-105">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center border border-violet-200 shadow-sm">
                  <ClockIcon className="w-7 h-7 text-violet-600" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-3xl font-bold text-violet-700">{stats.avgDuration} min</p>
                  <p className="text-sm text-violet-600/80">Durée moy.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters - Style Indigo */}
        <Card className="rounded-3xl border-indigo-200/50 bg-gradient-to-br from-indigo-50 to-blue-50 shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="rounded-2xl bg-gradient-to-br from-indigo-100 to-blue-100 p-2 border border-indigo-200">
                <FunnelIcon className="w-5 h-5 text-indigo-600" strokeWidth={1.5} />
              </div>
              <CardTitle className="text-indigo-700">Filtres</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Rechercher</label>
                <Input
                  placeholder="Tâche, pièce, notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Période</label>
                <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 derniers jours</SelectItem>
                    <SelectItem value="30">30 derniers jours</SelectItem>
                    <SelectItem value="90">90 derniers jours</SelectItem>
                    <SelectItem value="all">Tout l'historique</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Task Completions List - Style Indigo */}
        <Card className="rounded-3xl border-indigo-200/50 bg-gradient-to-br from-white to-indigo-50/30 shadow-lg">
          <CardHeader>
            <CardTitle className="text-indigo-700">
              Tâches accomplies ({filteredCompletions.length})
            </CardTitle>
            <CardDescription className="text-indigo-600/70">
              Liste de toutes vos tâches terminées
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredCompletions.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardDocumentListIcon className="w-16 h-16 text-indigo-300 mx-auto mb-4" strokeWidth={1.5} />
                <h3 className="text-lg font-semibold text-indigo-700 mb-2">Aucune tâche trouvée</h3>
                <p className="text-indigo-600/70">
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
                    className="flex items-start gap-4 p-5 rounded-2xl border border-emerald-200/50 bg-gradient-to-br from-emerald-50 to-teal-50 hover:shadow-lg hover:shadow-emerald-100 transition-all duration-300"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center flex-shrink-0 border border-emerald-200 shadow-sm">
                      <CheckCircleIcon className="w-6 h-6 text-emerald-600" strokeWidth={2} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <h4 className="font-semibold text-gray-800">{completion.task_name}</h4>
                          <p className="text-sm text-gray-600">📍 {completion.room_name}</p>
                        </div>
                        {completion.duration && (
                          <Badge variant="outline" className="flex-shrink-0 border-emerald-200 bg-emerald-50 text-emerald-700">
                            <ClockIcon className="w-3 h-3 mr-1" strokeWidth={1.5} />
                            {formatDuration(completion.duration)}
                          </Badge>
                        )}
                      </div>

                      <p className="text-sm text-gray-600 mb-2">
                        🕒 {formatDate(completion.completed_at)}
                        {completion.session_date && (
                          <span className="ml-2">
                            • Session du {format(new Date(completion.session_date), 'd MMM yyyy', { locale: fr })}
                          </span>
                        )}
                      </p>

                      {completion.notes && (
                        <div className="mt-3 p-3 bg-white/70 rounded-xl border border-emerald-100 text-sm">
                          <p className="font-medium text-xs text-emerald-600 mb-1">📝 Notes :</p>
                          <p className="text-gray-700">{completion.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
