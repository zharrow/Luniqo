'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
import { sessionsService, type SessionWithStats, type CreateLogInput, type LogStatus } from '@/lib/services/sessions.service'
import { usersService } from '@/lib/services/users.service'
import { pdfExportService } from '@/lib/services/pdf-export.service'
import { trackSession, trackTaskCompleted, trackFeatureUsed } from '@/lib/analytics/posthog'
import {
  ClockIcon,
  CheckCircleIcon,
  PencilIcon,
  PlusIcon,
  ChevronLeftIcon,
  PhotoIcon,
  DocumentArrowDownIcon,
  CalendarIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import { FormDialog } from '@/components/shared/FormDialog'

// shadcn/ui components
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface SessionLog {
  id: string
  assigned_task_id: string
  performed_by_id: string | null
  recorded_by_id: string | null
  status: LogStatus
  note: string | null
  photo_urls: string[] | null
  performed_at: string | null
  created_at: string
  assigned_task: {
    id: string
    room_id: string
    task_template_id: string
    room: {
      id: string
      name: string
    }
    task_template: {
      id: string
      name: string
      description: string | null
    }
  }
  performed_by: {
    id: string
    first_name: string
    last_name: string
  } | null
}

interface AssignedTaskWithLog {
  id: string
  room_id: string
  task_template_id: string
  room: {
    id: string
    name: string
  }
  task_template: {
    id: string
    name: string
    description: string | null
  }
  log: SessionLog | null
}

interface GroupedTasks {
  [roomId: string]: {
    room: { id: string; name: string }
    tasks: AssignedTaskWithLog[]
  }
}

export default function SessionDetailPage() {
  const params = useParams()
  const id = params.id as string
  const { isLoading: authLoading } = useRequireAuth(['Owner'])
  const { selectedNursery } = useNursery()
  const [session, setSession] = useState<SessionWithStats | null>(null)
  const [logs, setLogs] = useState<SessionLog[]>([])
  const [groupedTasks, setGroupedTasks] = useState<GroupedTasks>({})
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingLog, setEditingLog] = useState<SessionLog | null>(null)
  const [availableTasks, setAvailableTasks] = useState<any[]>([])
  const [availableUsers, setAvailableUsers] = useState<any[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState<CreateLogInput>({
    assigned_task_id: '',
    performed_by_id: '',
    status: 'FAIT',
    note: ''
  })

  useEffect(() => {
    if (selectedNursery?.id) {
      loadSessionData()
      loadAvailableData()
    } else if (!authLoading && !selectedNursery) {
      setLoading(false)
    }
  }, [selectedNursery?.id, authLoading, id])

  async function loadSessionData() {
    if (!selectedNursery?.id) return

    try {
      setLoading(true)
      const [sessionData, logsData, allTasks] = await Promise.all([
        sessionsService.getById(id, selectedNursery.id),
        sessionsService.getSessionLogs(id),
        sessionsService.getAssignedTasks(selectedNursery.id)
      ])

      setSession(sessionData)
      setLogs(logsData)

      // Track session view
      trackSession('viewed', {
        session_id: id,
        nursery_id: selectedNursery.id,
        tasks_count: sessionData?.total_tasks,
        completion_rate: sessionData?.completion_percentage,
      })

      const logsMap = new Map<string, SessionLog>()
      logsData.forEach((log: SessionLog) => {
        logsMap.set(log.assigned_task_id, log)
      })

      const grouped: GroupedTasks = {}
      allTasks.forEach((task: any) => {
        const roomId = task.room_id
        if (!grouped[roomId]) {
          grouped[roomId] = {
            room: task.room,
            tasks: []
          }
        }
        grouped[roomId].tasks.push({
          id: task.id,
          room_id: task.room_id,
          task_template_id: task.task_template_id,
          room: task.room,
          task_template: task.task_template,
          log: logsMap.get(task.id) || null
        })
      })

      setGroupedTasks(grouped)
    } catch (error) {
      console.error('Error loading session:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadAvailableData() {
    if (!selectedNursery?.id) return

    try {
      const [tasks, users] = await Promise.all([
        sessionsService.getAssignedTasks(selectedNursery.id),
        usersService.getActiveEmployeesByNursery(selectedNursery.id)
      ])

      setAvailableTasks(tasks)
      setAvailableUsers(users)
    } catch (error) {
      console.error('Error loading available data:', error)
    }
  }

  async function handleAddLog(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedNursery?.id) return

    try {
      setIsSubmitting(true)
      await sessionsService.createLog(id, {
        ...formData,
        performed_by_id: formData.performed_by_id || undefined,
        note: formData.note || undefined
      })

      // Track task completion
      const task = availableTasks.find(t => t.id === formData.assigned_task_id)
      if (task) {
        trackTaskCompleted({
          task_id: task.id,
          task_name: task.task_template?.name || 'Unknown',
          room_name: task.room?.name,
          nursery_id: selectedNursery.id,
        })
      }

      await sessionsService.checkAndCompleteSession(id, selectedNursery.id)

      setShowAddModal(false)
      resetForm()
      loadSessionData()
    } catch (error) {
      console.error('Error creating log:', error)
      alert('Erreur lors de la création du log')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleUpdateLog(e: React.FormEvent) {
    e.preventDefault()
    if (!editingLog || !selectedNursery?.id) return

    try {
      setIsSubmitting(true)
      await sessionsService.updateLog(editingLog.id, {
        status: formData.status,
        note: formData.note || undefined
      })

      await sessionsService.checkAndCompleteSession(id, selectedNursery.id)

      setShowEditModal(false)
      setEditingLog(null)
      resetForm()
      loadSessionData()
    } catch (error) {
      console.error('Error updating log:', error)
      alert('Erreur lors de la mise à jour du log')
    } finally {
      setIsSubmitting(false)
    }
  }

  function openAddModal() {
    resetForm()
    setShowAddModal(true)
  }

  function openEditModal(log: SessionLog) {
    setEditingLog(log)
    setFormData({
      assigned_task_id: log.assigned_task_id,
      performed_by_id: log.performed_by_id || '',
      status: log.status,
      note: log.note || ''
    })
    setShowEditModal(true)
  }

  function resetForm() {
    setFormData({
      assigned_task_id: '',
      performed_by_id: '',
      status: 'FAIT',
      note: ''
    })
  }

  async function handleExportPDF() {
    if (!session || !selectedNursery) return

    const exportData = {
      id: session.id,
      date: session.date,
      status: session.status,
      completed_tasks: session.completed_tasks,
      total_tasks: session.total_tasks,
      completion_percentage: session.completion_percentage,
      logs: logs.map(log => ({
        room_name: log.assigned_task.room.name,
        task_name: log.assigned_task.task_template.name,
        task_description: log.assigned_task.task_template.description || undefined,
        status: log.status,
        performed_by: log.performed_by
          ? `${log.performed_by.first_name} ${log.performed_by.last_name}`
          : undefined,
        performed_at: log.performed_at || undefined
      })),
      enterprise_name: selectedNursery.name
    }

    try {
      await pdfExportService.exportSession(exportData)

      // Track PDF export
      trackFeatureUsed('export_pdf', {
        export_type: 'session',
        session_id: session.id,
        tasks_count: session.total_tasks,
      })
    } catch (error) {
      console.error('Error exporting PDF:', error)
      alert('Erreur lors de l\'export PDF')
    }
  }

  if (authLoading || loading) {
    return <LoadingSpinner />
  }

  if (!session) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Session introuvable</h2>
          <Button asChild>
            <Link href="/owner/sessions">Retour aux sessions</Link>
          </Button>
        </div>
      </div>
    )
  }

  const getStatusBadgeVariant = (status: string): 'success' | 'clean' | 'neutral' => {
    switch (status) {
      case 'COMPLETEE': return 'success'
      case 'EN_COURS': return 'clean'
      default: return 'neutral'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'COMPLETEE': return 'Terminée'
      case 'EN_COURS': return 'En cours'
      default: return status
    }
  }

  const getLogStatusBadgeVariant = (status: LogStatus): 'success' | 'warning' | 'neutral' | 'danger' => {
    switch (status) {
      case 'FAIT': return 'success'
      case 'PARTIEL': return 'warning'
      case 'REPORTE': return 'neutral'
      case 'IMPOSSIBLE': return 'danger'
      default: return 'neutral'
    }
  }

  const getLogStatusLabel = (status: LogStatus) => {
    switch (status) {
      case 'FAIT': return 'Fait'
      case 'PARTIEL': return 'Partiel'
      case 'REPORTE': return 'Reporté'
      case 'IMPOSSIBLE': return 'Impossible'
      default: return status
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date)
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/owner/sessions"
          className="inline-flex items-center gap-2 text-primary hover:text-primary/80 mb-4 font-medium transition-colors"
        >
          <ChevronLeftIcon className="h-5 w-5" strokeWidth={2} />
          Retour aux sessions
        </Link>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-sky-100">
              <CalendarIcon className="w-6 h-6 text-sky-600" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Session du {formatDate(session.date)}</h1>
              <div className="flex items-center gap-3 mt-1">
                <Badge variant={getStatusBadgeVariant(session.status)} size="md">
                  {session.completed_tasks}/{session.total_tasks} · {getStatusLabel(session.status)}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={handleExportPDF} className="gap-2">
              <DocumentArrowDownIcon className="h-5 w-5" strokeWidth={1.5} />
              Export PDF
            </Button>
            <Button onClick={openAddModal} className="gap-2">
              <PlusIcon className="h-5 w-5" strokeWidth={2} />
              Ajouter un log
            </Button>
          </div>
        </div>
      </div>

      {/* Tasks by Room */}
      <div className="space-y-6">
        {Object.keys(groupedTasks).length === 0 ? (
          <div
            className="relative rounded-3xl p-8 bg-white text-center overflow-hidden"
            style={{ border: '1px solid #5a9dc933' }}
          >
            <div
              className="absolute inset-0 opacity-60"
              style={{ background: 'linear-gradient(to bottom right, #f8fbfd, white)' }}
            />
            <div className="relative z-10">
              <ClockIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucune tâche assignée</h3>
              <p className="text-sm text-gray-600 mb-4">
                Assignez des tâches aux pièces pour suivre la progression
              </p>
              <Button onClick={openAddModal} className="gap-2">
                <PlusIcon className="h-5 w-5" />
                Ajouter un log
              </Button>
            </div>
          </div>
        ) : (
          Object.entries(groupedTasks).map(([roomId, { room, tasks }]) => (
            <div key={roomId}>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                {room.name}
              </h3>

              <div className="space-y-3">
                  {tasks.map((task) => {
                    const log = task.log
                    const isDone = log?.status === 'FAIT'
                    const isPartial = log?.status === 'PARTIEL'
                    const isPending = !log

                    return (
                      <div
                        key={task.id}
                        className="relative rounded-2xl p-4 bg-white border transition-all duration-300 group hover:-translate-y-0.5 overflow-hidden"
                        style={{
                          borderColor: isDone ? 'rgba(129,201,149,0.3)' : isPending ? 'rgba(156,163,175,0.2)' : 'rgba(251,191,36,0.3)'
                        }}
                      >
                        <div
                          className="absolute inset-0 opacity-40"
                          style={{
                            background: isDone
                              ? 'linear-gradient(to bottom right, #f1f9f3, white)'
                              : isPartial
                              ? 'linear-gradient(to bottom right, #fffbeb, white)'
                              : 'linear-gradient(to bottom right, #f9fafb, white)'
                          }}
                        />

                        <div className="relative z-10 flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-start gap-3 mb-2">
                              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5 ${
                                isDone
                                  ? 'bg-[#81c995]/10'
                                  : isPending
                                  ? 'bg-gray-100'
                                  : 'bg-[#fbbf24]/10'
                              }`}>
                                {isDone ? (
                                  <CheckCircleIcon className="h-5 w-5 text-[#4a8f5a]" strokeWidth={2} />
                                ) : (
                                  <ClockIcon className={`h-5 w-5 ${isPending ? 'text-gray-400' : 'text-[#d97557]'}`} strokeWidth={2} />
                                )}
                              </div>

                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900">
                                  {task.task_template.name}
                                </h4>
                                {task.task_template.description && (
                                  <p className="text-sm text-gray-600 mt-0.5">
                                    {task.task_template.description}
                                  </p>
                                )}
                              </div>

                              <Badge
                                variant={log ? getLogStatusBadgeVariant(log.status) : 'neutral'}
                                size="sm"
                              >
                                {log ? getLogStatusLabel(log.status) : 'En attente'}
                              </Badge>
                            </div>

                            {log && (
                              <>
                                <div className="flex items-center gap-4 text-sm text-gray-600 mt-2 ml-11">
                                  {log.performed_by && (
                                    <span className="flex items-center gap-1.5">
                                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                      {log.performed_by.first_name} {log.performed_by.last_name}
                                    </span>
                                  )}
                                  {log.performed_at && (
                                    <span className="flex items-center gap-1.5">
                                      <ClockIcon className="h-4 w-4" />
                                      {formatTime(log.performed_at)}
                                    </span>
                                  )}
                                </div>

                                {log.note && (
                                  <div className="mt-3 ml-11 p-3 rounded-xl bg-gray-50/80 border border-gray-100">
                                    <p className="text-sm text-gray-700 italic">{log.note}</p>
                                  </div>
                                )}

                                {log.photo_urls && log.photo_urls.length > 0 && (
                                  <div className="flex items-center gap-2 mt-2 ml-11">
                                    <PhotoIcon className="h-4 w-4 text-gray-500" />
                                    <span className="text-sm text-gray-600">
                                      {log.photo_urls.length} photo{log.photo_urls.length > 1 ? 's' : ''}
                                    </span>
                                  </div>
                                )}
                              </>
                            )}
                          </div>

                          {log ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(log)}
                              className="ml-3"
                            >
                              <PencilIcon className="h-5 w-5" strokeWidth={1.5} />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => {
                                setFormData({
                                  assigned_task_id: task.id,
                                  performed_by_id: '',
                                  status: 'FAIT',
                                  note: ''
                                })
                                setShowAddModal(true)
                              }}
                              className="ml-3 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              Marquer
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Log Modal */}
      <FormDialog
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddLog}
        title="Ajouter un log"
        submitLabel="Ajouter"
        isSubmitting={isSubmitting}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="task">Tâche *</Label>
            <Select
              value={formData.assigned_task_id || 'none'}
              onValueChange={(value) => setFormData({ ...formData, assigned_task_id: value === 'none' ? '' : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une tâche" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sélectionner une tâche</SelectItem>
                {availableTasks.map((task) => (
                  <SelectItem key={task.id} value={task.id}>
                    {task.room.name} - {task.task_template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="performer">Effectué par</Label>
            <Select
              value={formData.performed_by_id || 'none'}
              onValueChange={(value) => setFormData({ ...formData, performed_by_id: value === 'none' ? '' : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Non spécifié" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Non spécifié</SelectItem>
                {availableUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.first_name} {user.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Statut *</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value as LogStatus })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FAIT">Fait</SelectItem>
                <SelectItem value="PARTIEL">Partiel</SelectItem>
                <SelectItem value="REPORTE">Reporté</SelectItem>
                <SelectItem value="IMPOSSIBLE">Impossible</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Note</Label>
            <Textarea
              id="note"
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              rows={3}
              placeholder="Ajouter une note..."
            />
          </div>
        </div>
      </FormDialog>

      {/* Edit Log Modal */}
      <FormDialog
        isOpen={showEditModal && !!editingLog}
        onClose={() => {
          setShowEditModal(false)
          setEditingLog(null)
        }}
        onSubmit={handleUpdateLog}
        title="Modifier le log"
        submitLabel="Enregistrer"
        isSubmitting={isSubmitting}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tâche</Label>
            <Input
              value={editingLog ? `${editingLog.assigned_task.room.name} - ${editingLog.assigned_task.task_template.name}` : ''}
              disabled
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-status">Statut *</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value as LogStatus })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FAIT">Fait</SelectItem>
                <SelectItem value="PARTIEL">Partiel</SelectItem>
                <SelectItem value="REPORTE">Reporté</SelectItem>
                <SelectItem value="IMPOSSIBLE">Impossible</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-note">Note</Label>
            <Textarea
              id="edit-note"
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              rows={3}
              placeholder="Ajouter une note..."
            />
          </div>
        </div>
      </FormDialog>
    </div>
  )
}
