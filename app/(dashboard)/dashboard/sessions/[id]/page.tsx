'use client'

import { use, useEffect, useState } from 'react'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { sessionsService, type SessionWithStats, type CreateLogInput, type LogStatus } from '@/lib/services/sessions.service'
import { roomsService } from '@/lib/services/rooms.service'
import { usersService } from '@/lib/services/users.service'
import { pdfExportService } from '@/lib/services/pdf-export.service'
import {
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  PencilIcon,
  PlusIcon,
  ChevronLeftIcon,
  PhotoIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import { FormDialog } from '@/components/shared/FormDialog'

interface PageProps {
  params: Promise<{ id: string }>
}

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

interface GroupedLogs {
  [roomId: string]: {
    room: { id: string; name: string }
    logs: SessionLog[]
  }
}

export default function SessionDetailPage({ params }: PageProps) {
  const { id } = use(params)
  const { session: authSession, isLoading: authLoading } = useRequireAuth(['Admin'])
  const [session, setSession] = useState<SessionWithStats | null>(null)
  const [logs, setLogs] = useState<SessionLog[]>([])
  const [groupedLogs, setGroupedLogs] = useState<GroupedLogs>({})
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
      const [sessionData, logsData] = await Promise.all([
        sessionsService.getById(id, authSession.enterprise.id),
        sessionsService.getSessionLogs(id)
      ])

      setSession(sessionData)
      setLogs(logsData)

      // Group logs by room
      const grouped: GroupedLogs = {}
      logsData.forEach((log: SessionLog) => {
        const roomId = log.assigned_task.room_id
        if (!grouped[roomId]) {
          grouped[roomId] = {
            room: log.assigned_task.room,
            logs: []
          }
        }
        grouped[roomId].logs.push(log)
      })
      setGroupedLogs(grouped)
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
    if (!editingLog) return

    try {
      setIsSubmitting(true)
      await sessionsService.updateLog(editingLog.id, {
        status: formData.status,
        note: formData.note || undefined
      })

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

  async function handleUpdateSessionStatus(newStatus: 'EN_COURS' | 'COMPLETEE' | 'INCOMPLETE') {
    if (!authSession?.enterprise?.id || !session) return

    try {
      await sessionsService.update(id, authSession.enterprise.id, { status: newStatus })
      loadSessionData()
    } catch (error) {
      console.error('Error updating session status:', error)
      alert('Erreur lors de la mise à jour du statut')
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
        return 'bg-success-50 text-success-700 border-success-200'
      case 'EN_COURS':
        return 'bg-primary-50 text-primary-700 border-primary-200'
      case 'INCOMPLETE':
        return 'bg-warning-50 text-warning-700 border-warning-200'
      default:
        return 'bg-muted text-muted-foreground border-border'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'COMPLETEE': return 'Complétée'
      case 'EN_COURS': return 'En cours'
      case 'INCOMPLETE': return 'Incomplète'
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
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/dashboard/sessions"
            className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 mb-4"
          >
            <ChevronLeftIcon className="w-5 h-5" />
            Retour aux sessions
          </Link>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Quicksand, sans-serif' }}>
                Session du {formatDate(session.date)}
              </h1>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(session.status)}`}>
                  {getStatusLabel(session.status)}
                </span>
                <span className="text-muted-foreground">
                  {session.completed_tasks} / {session.total_tasks} tâches complétées
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={handleExportPDF} className="btn btn-secondary inline-flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export PDF
              </button>
              <button onClick={openAddModal} className="btn btn-primary inline-flex items-center gap-2">
                <PlusIcon className="w-5 h-5" />
                Ajouter un log
              </button>
            </div>
          </div>
        </div>

        {/* Progress Card */}
        <div className="card p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Progression</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleUpdateSessionStatus('EN_COURS')}
                className="btn btn-secondary text-sm"
                disabled={session.status === 'EN_COURS'}
              >
                En cours
              </button>
              <button
                onClick={() => handleUpdateSessionStatus('COMPLETEE')}
                className="btn btn-primary text-sm"
                disabled={session.status === 'COMPLETEE'}
              >
                Marquer complétée
              </button>
              <button
                onClick={() => handleUpdateSessionStatus('INCOMPLETE')}
                className="btn btn-secondary text-sm"
                disabled={session.status === 'INCOMPLETE'}
              >
                Marquer incomplète
              </button>
            </div>
          </div>

          <div className="relative w-full h-4 bg-muted rounded-full overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-300"
              style={{ width: `${session.completion_percentage}%` }}
            ></div>
          </div>

          <div className="flex items-center justify-between mt-2">
            <span className="text-sm text-muted-foreground">
              {session.completion_percentage}% complété
            </span>
            {session.completion_percentage === 100 && (
              <div className="flex items-center gap-1 text-success-600">
                <CheckCircleIcon className="w-5 h-5" />
                <span className="text-sm font-medium">Session terminée</span>
              </div>
            )}
          </div>
        </div>

        {/* Logs by Room */}
        <div className="space-y-6">
          {Object.keys(groupedLogs).length === 0 ? (
            <div className="card p-8 text-center">
              <ClockIcon className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                Aucun log pour cette session
              </h3>
              <p className="text-muted-foreground mb-4">
                Ajoutez des logs de nettoyage pour suivre la progression
              </p>
              <button onClick={openAddModal} className="btn btn-primary inline-flex items-center gap-2">
                <PlusIcon className="w-5 h-5" />
                Ajouter un log
              </button>
            </div>
          ) : (
            Object.entries(groupedLogs).map(([roomId, { room, logs }]) => (
              <div key={roomId} className="card p-6">
                <h3 className="text-xl font-semibold mb-4">
                  {room.name}
                </h3>

                <div className="space-y-3">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start justify-between p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-start gap-3 mb-2">
                          <div>
                            <h4 className="font-medium">
                              {log.assigned_task.task_template.name}
                            </h4>
                            {log.assigned_task.task_template.description && (
                              <p className="text-sm text-muted-foreground">
                                {log.assigned_task.task_template.description}
                              </p>
                            )}
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-medium border whitespace-nowrap ${getLogStatusColor(log.status)}`}>
                            {getLogStatusLabel(log.status)}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {log.performed_by && (
                            <span>
                              Par {log.performed_by.first_name} {log.performed_by.last_name}
                            </span>
                          )}
                          {log.performed_at && (
                            <span className="flex items-center gap-1">
                              <ClockIcon className="w-4 h-4" />
                              {formatTime(log.performed_at)}
                            </span>
                          )}
                        </div>

                        {log.note && (
                          <p className="mt-2 text-sm text-muted-foreground italic">
                            {log.note}
                          </p>
                        )}

                        {log.photo_urls && log.photo_urls.length > 0 && (
                          <div className="flex items-center gap-2 mt-2">
                            <PhotoIcon className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {log.photo_urls.length} photo{log.photo_urls.length > 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => openEditModal(log)}
                        className="p-2 text-muted-foreground hover:text-primary-600 transition-colors"
                      >
                        <PencilIcon className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
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
