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
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">Mon Historique</h1>
          <p className="text-muted-foreground">
            Consultez l'historique de vos tâches accomplies
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-primary-100 flex items-center justify-center">
                  <ClipboardDocumentListIcon className="w-6 h-6 text-primary-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                  <CalendarIcon className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.thisWeek}</p>
                  <p className="text-sm text-muted-foreground">Cette semaine</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <CheckCircleIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.thisMonth}</p>
                  <p className="text-sm text-muted-foreground">Ce mois</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                  <ClockIcon className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.avgDuration} min</p>
                  <p className="text-sm text-muted-foreground">Durée moy.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FunnelIcon className="w-5 h-5 text-primary-500" />
              <CardTitle>Filtres</CardTitle>
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

        {/* Task Completions List */}
        <Card>
          <CardHeader>
            <CardTitle>Tâches accomplies ({filteredCompletions.length})</CardTitle>
            <CardDescription>
              Liste de toutes vos tâches terminées
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredCompletions.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardDocumentListIcon className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Aucune tâche trouvée</h3>
                <p className="text-muted-foreground">
                  {searchTerm || filterPeriod !== 'all'
                    ? 'Essayez de modifier vos filtres'
                    : 'Vos tâches accomplies apparaîtront ici'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredCompletions.map((completion) => (
                  <div
                    key={completion.id}
                    className="flex items-start gap-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <CheckCircleIcon className="w-5 h-5 text-green-600" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-1">
                        <div>
                          <h4 className="font-semibold">{completion.task_name}</h4>
                          <p className="text-sm text-muted-foreground">{completion.room_name}</p>
                        </div>
                        {completion.duration && (
                          <Badge variant="outline" className="flex-shrink-0">
                            <ClockIcon className="w-3 h-3 mr-1" />
                            {formatDuration(completion.duration)}
                          </Badge>
                        )}
                      </div>

                      <p className="text-sm text-muted-foreground mb-2">
                        {formatDate(completion.completed_at)}
                        {completion.session_date && (
                          <span className="ml-2">
                            • Session du {format(new Date(completion.session_date), 'd MMM yyyy', { locale: fr })}
                          </span>
                        )}
                      </p>

                      {completion.notes && (
                        <div className="mt-2 p-2 bg-muted rounded text-sm">
                          <p className="font-medium text-xs text-muted-foreground mb-1">Notes :</p>
                          <p>{completion.notes}</p>
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
