'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { sessionsService, type SessionWithStats, type CreateLogInput, type LogStatus } from '@/lib/services/sessions.service'
import { usersService } from '@/lib/services/users.service'
import { pdfExportService } from '@/lib/services/pdf-export.service'
import {
  ClockIcon,
  CheckCircleIcon,
  PencilIcon,
  PlusIcon,
  ChevronLeftIcon,
  PhotoIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import { FormDialog } from '@/components/shared/FormDialog'

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
  const { session: authSession, isLoading: authLoading } = useRequireAuth(['Admin'])
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
    if (authSession?.enterprise?.id) {
      loadSessionData()
      loadAvailableData()
    }
  }, [authSession, id])

  async function loadSessionData() {
    if (!authSession?.enterprise?.id) return

    try {
      setLoading(true)
      const [sessionData, logsData, allTasks] = await Promise.all([
        sessionsService.getById(id, authSession.enterprise.id),
        sessionsService.getSessionLogs(id),
        sessionsService.getAssignedTasks(authSession.enterprise.id)
      ])

      setSession(sessionData)
      setLogs(logsData)

      // Create a map of assigned_task_id -> log
      const logsMap = new Map<string, SessionLog>()
      logsData.forEach((log: SessionLog) => {
        logsMap.set(log.assigned_task_id, log)
      })

      // Combine all assigned tasks with their logs (if any)
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
    if (!authSession?.enterprise?.id) return

    try {
      const [tasks, users] = await Promise.all([
        sessionsService.getAssignedTasks(authSession.enterprise.id),
        usersService.getActive(authSession.enterprise.id)
      ])

      setAvailableTasks(tasks)
      setAvailableUsers(users)
    } catch (error) {
      console.error('Error loading available data:', error)
    }
  }

  async function handleAddLog(e: React.FormEvent) {
    e.preventDefault()
    if (!authSession?.enterprise?.id) return

    try {
      setIsSubmitting(true)
      await sessionsService.createLog(id, {
        ...formData,
        performed_by_id: formData.performed_by_id || undefined,
        note: formData.note || undefined
      })

      // Auto-complete session if all tasks are done
      await sessionsService.checkAndCompleteSession(id, authSession.enterprise.id)

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
    if (!editingLog || !authSession?.enterprise?.id) return

    try {
      setIsSubmitting(true)
      await sessionsService.updateLog(editingLog.id, {
        status: formData.status,
        note: formData.note || undefined
      })

      // Auto-complete session if all tasks are done
      await sessionsService.checkAndCompleteSession(id, authSession.enterprise.id)

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
    if (!session || !authSession?.enterprise) return

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
        performed_at: log.performed_at || undefined,
        note: log.note || undefined,
        photo_urls: log.photo_urls || undefined
      })),
      enterprise_name: authSession.enterprise.name
    }

    try {
      await pdfExportService.exportSession(exportData)
    } catch (error) {
      console.error('Error exporting PDF:', error)
      alert('Erreur lors de l\'export PDF')
    }
  }

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (!session) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Session introuvable</h2>
          <Link href="/dashboard/sessions" className="btn btn-primary">
            Retour aux sessions
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETEE':
        return 'bg-[#e8f5e9] text-[#4a8f5a] border-[#81c995]'
      case 'EN_COURS':
        return 'bg-[#e3f2fd] text-[#2c5f7f] border-[#5a9dc9]'
      default:
        return 'bg-muted text-muted-foreground border-border'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'COMPLETEE': return 'Terminée'
      case 'EN_COURS': return 'En cours'
      default: return status
    }
  }

  const getLogStatusColor = (status: LogStatus) => {
    switch (status) {
      case 'FAIT':
        return 'bg-success-50 text-success-700 border-success-200'
      case 'PARTIEL':
        return 'bg-warning-50 text-warning-700 border-warning-200'
      case 'REPORTE':
        return 'bg-muted text-muted-foreground border-border'
      case 'IMPOSSIBLE':
        return 'bg-danger-50 text-danger-700 border-danger-200'
      default:
        return 'bg-muted text-muted-foreground border-border'
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
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <Link
            href="/dashboard/sessions"
            className="inline-flex items-center gap-2 text-[#5a9dc9] hover:text-[#4a8ab5] mb-4 font-medium transition-colors"
          >
            <ChevronLeftIcon className="w-5 h-5" strokeWidth={2} />
            Retour aux sessions
          </Link>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-3 tracking-tight">
                Session du {formatDate(session.date)}
              </h1>
              <div className="flex items-center gap-3">
                <span className={`px-4 py-1.5 rounded-full text-sm font-medium border ${getStatusColor(session.status)}`}>
                  {getStatusLabel(session.status)}
                </span>
                <span className="text-gray-600 font-medium">
                  {session.completed_tasks} / {session.total_tasks} tâches complétées
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleExportPDF}
                className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 hover:border-[#5a9dc9]/30 hover:bg-[#f8fbfd] transition-all duration-200 inline-flex items-center gap-2 font-medium"
              >
                <DocumentArrowDownIcon className="w-5 h-5" strokeWidth={1.5} />
                Export PDF
              </button>
              <button
                onClick={openAddModal}
                className="px-4 py-2 rounded-xl bg-[#5a9dc9] text-white hover:bg-[#4a8ab5] transition-all duration-200 inline-flex items-center gap-2 font-medium shadow-sm hover:shadow-md"
              >
                <PlusIcon className="w-5 h-5" strokeWidth={2} />
                Ajouter un log
              </button>
            </div>
          </div>
        </div>

        {/* Progress Card */}
        <div
          className={`relative rounded-3xl p-6 bg-white overflow-hidden transition-all duration-500 ${
            session.completion_percentage === 100
              ? 'border-2 border-[#81c995] shadow-[0_8px_32px_-8px_rgba(129,201,149,0.3)]'
              : 'border border-[#5a9dc9]/20'
          }`}
        >
          {/* Gradient fond */}
          <div
            className="absolute inset-0 opacity-60 transition-all duration-500"
            style={{
              background: session.completion_percentage === 100
                ? 'linear-gradient(to bottom right, #f1f9f3, white)'
                : 'linear-gradient(to bottom right, #f8fbfd, white)'
            }}
          ></div>

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 tracking-tight">Progression</h2>
              {session.completion_percentage === 100 && (
                <div className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-[#81c995]/10 border border-[#81c995]/30">
                  <CheckCircleIcon className="w-5 h-5 text-[#4a8f5a]" strokeWidth={2} />
                  <span className="text-sm font-semibold text-[#4a8f5a]">Session terminée</span>
                </div>
              )}
            </div>

            {/* Barre de progression */}
            <div className="relative w-full h-3 bg-gray-100 rounded-full overflow-hidden shadow-inner">
              <div
                className={`absolute top-0 left-0 h-full transition-all duration-500 ease-out ${
                  session.completion_percentage === 100
                    ? 'bg-gradient-to-r from-[#81c995] to-[#4a8f5a]'
                    : 'bg-gradient-to-r from-[#5a9dc9] to-[#81c995]'
                }`}
                style={{ width: `${session.completion_percentage}%` }}
              >
                {session.completion_percentage < 100 && (
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 animate-pulse"></div>
                )}
              </div>
            </div>

            <div className="mt-3">
              <span className="text-sm text-gray-600 font-medium">
                {session.completed_tasks} / {session.total_tasks} tâches complétées ({session.completion_percentage}%)
              </span>
            </div>
          </div>
        </div>

        {/* Tasks by Room */}
        <div className="space-y-6">
          {Object.keys(groupedTasks).length === 0 ? (
            <div className="relative rounded-3xl p-8 bg-white text-center overflow-hidden border border-[#5a9dc9]/20">
              <div className="absolute inset-0 bg-gradient-to-br from-[#f8fbfd] to-white opacity-60"></div>
              <div className="relative z-10">
                <ClockIcon className="w-16 h-16 text-[#5a9dc9]/30 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  Aucune tâche assignée
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Assignez des tâches aux pièces pour suivre la progression
                </p>
                <button onClick={openAddModal} className="btn btn-primary inline-flex items-center gap-2">
                  <PlusIcon className="w-5 h-5" />
                  Ajouter un log
                </button>
              </div>
            </div>
          ) : (
            Object.entries(groupedTasks).map(([roomId, { room, tasks }]) => (
              <div
                key={roomId}
                className="relative rounded-3xl p-6 bg-white overflow-hidden border border-[#5a9dc9]/20 hover:shadow-[0_8px_32px_-8px_rgba(90,157,201,0.2)] transition-all duration-300"
              >
                {/* Gradient fond */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#f8fbfd] to-white opacity-60"></div>

                <div className="relative z-10">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4 tracking-tight">
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
                          {/* Gradient de fond basé sur le statut */}
                          <div
                            className="absolute inset-0 opacity-40"
                            style={{
                              background: isDone
                                ? 'linear-gradient(to bottom right, #f1f9f3, white)'
                                : isPartial
                                ? 'linear-gradient(to bottom right, #fffbeb, white)'
                                : 'linear-gradient(to bottom right, #f9fafb, white)'
                            }}
                          ></div>

                          <div className="relative z-10 flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-start gap-3 mb-2">
                                {/* Icône de statut */}
                                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5 ${
                                  isDone
                                    ? 'bg-[#81c995]/10'
                                    : isPending
                                    ? 'bg-gray-100'
                                    : 'bg-[#fbbf24]/10'
                                }`}>
                                  {isDone ? (
                                    <CheckCircleIcon className="w-5 h-5 text-[#4a8f5a]" strokeWidth={2} />
                                  ) : isPending ? (
                                    <ClockIcon className="w-5 h-5 text-gray-400" strokeWidth={2} />
                                  ) : (
                                    <ClockIcon className="w-5 h-5 text-[#d97557]" strokeWidth={2} />
                                  )}
                                </div>

                                <div className="flex-1">
                                  <h4 className="font-semibold text-gray-900 text-base tracking-tight">
                                    {task.task_template.name}
                                  </h4>
                                  {task.task_template.description && (
                                    <p className="text-sm text-gray-600 mt-0.5">
                                      {task.task_template.description}
                                    </p>
                                  )}
                                </div>

                                {/* Badge de statut */}
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${
                                    log ? getLogStatusColor(log.status) : 'bg-gray-50 text-gray-600 border-gray-200'
                                  }`}
                                >
                                  {log ? getLogStatusLabel(log.status) : 'En attente'}
                                </span>
                              </div>

                              {/* Infos de complétion */}
                              {log && (
                                <>
                                  <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
                                    {log.performed_by && (
                                      <span className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[#5a9dc9]"></div>
                                        {log.performed_by.first_name} {log.performed_by.last_name}
                                      </span>
                                    )}
                                    {log.performed_at && (
                                      <span className="flex items-center gap-1.5">
                                        <ClockIcon className="w-4 h-4" />
                                        {formatTime(log.performed_at)}
                                      </span>
                                    )}
                                  </div>

                                  {log.note && (
                                    <div className="mt-3 p-3 rounded-xl bg-gray-50/80 border border-gray-100">
                                      <p className="text-sm text-gray-700 italic">
                                        {log.note}
                                      </p>
                                    </div>
                                  )}

                                  {log.photo_urls && log.photo_urls.length > 0 && (
                                    <div className="flex items-center gap-2 mt-2">
                                      <PhotoIcon className="w-4 h-4 text-gray-500" />
                                      <span className="text-sm text-gray-600">
                                        {log.photo_urls.length} photo{log.photo_urls.length > 1 ? 's' : ''}
                                      </span>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>

                            {/* Bouton d'action */}
                            {log ? (
                              <button
                                onClick={() => openEditModal(log)}
                                className="ml-3 p-2 rounded-lg text-gray-400 hover:text-[#5a9dc9] hover:bg-[#5a9dc9]/10 transition-all duration-200"
                              >
                                <PencilIcon className="w-5 h-5" strokeWidth={1.5} />
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setFormData({
                                    assigned_task_id: task.id,
                                    performed_by_id: '',
                                    status: 'FAIT',
                                    note: ''
                                  })
                                  setShowAddModal(true)
                                }}
                                className="ml-3 px-4 py-2 rounded-lg bg-[#5a9dc9] text-white text-sm font-medium hover:bg-[#4a8ab5] transition-all duration-200 opacity-0 group-hover:opacity-100"
                              >
                                Marquer
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
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
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Tâche *
                  </label>
                  <select
                    value={formData.assigned_task_id}
                    onChange={(e) => setFormData({ ...formData, assigned_task_id: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-background"
                  >
                    <option value="">Sélectionner une tâche</option>
                    {availableTasks.map((task) => (
                      <option key={task.id} value={task.id}>
                        {task.room.name} - {task.task_template.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Effectué par
                  </label>
                  <select
                    value={formData.performed_by_id}
                    onChange={(e) => setFormData({ ...formData, performed_by_id: e.target.value })}
                    className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-background"
                  >
                    <option value="">Non spécifié</option>
                    {availableUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.first_name} {user.last_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Statut *
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as LogStatus })}
                    required
                    className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-background"
                  >
                    <option value="FAIT">Fait</option>
                    <option value="PARTIEL">Partiel</option>
                    <option value="REPORTE">Reporté</option>
                    <option value="IMPOSSIBLE">Impossible</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Note
                  </label>
                  <textarea
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    rows={3}
                    placeholder="Ajouter une note..."
                    className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none bg-background"
                  />
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
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Tâche
                  </label>
                  <input
                    type="text"
                    value={editingLog ? `${editingLog.assigned_task.room.name} - ${editingLog.assigned_task.task_template.name}` : ''}
                    disabled
                    className="w-full px-4 py-2 border border-border rounded-lg bg-muted text-muted-foreground"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Statut *
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as LogStatus })}
                    required
                    className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-background"
                  >
                    <option value="FAIT">Fait</option>
                    <option value="PARTIEL">Partiel</option>
                    <option value="REPORTE">Reporté</option>
                    <option value="IMPOSSIBLE">Impossible</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Note
                  </label>
                  <textarea
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    rows={3}
                    placeholder="Ajouter une note..."
                    className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none bg-background"
                  />
                </div>
        </FormDialog>
      </div>
    </DashboardLayout>
  )
}
