'use client'

import { useEffect, useState } from 'react'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { tasksService, type TaskTemplate, type CreateTaskInput, type TaskType } from '@/lib/services/tasks.service'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ClipboardDocumentListIcon,
  FunnelIcon
} from '@heroicons/react/24/outline'

export default function TasksPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Admin'])
  const [tasks, setTasks] = useState<TaskTemplate[]>([])
  const [filteredTasks, setFilteredTasks] = useState<TaskTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskTemplate | null>(null)
  const [filterType, setFilterType] = useState<TaskType | 'ALL'>('ALL')
  const [formData, setFormData] = useState<CreateTaskInput>({
    name: '',
    description: '',
    type: 'DAILY',
    category: '',
    default_duration: undefined,
    estimated_duration: undefined
  })

  useEffect(() => {
    if (session?.enterprise) {
      loadTasks()
    }
  }, [session])

  useEffect(() => {
    if (filterType === 'ALL') {
      setFilteredTasks(tasks)
    } else {
      setFilteredTasks(tasks.filter(t => t.type === filterType))
    }
  }, [tasks, filterType])

  async function loadTasks() {
    if (!session?.enterprise?.id) return

    try {
      setLoading(true)
      const data = await tasksService.getAll(session.enterprise.id)
      setTasks(data)
    } catch (error) {
      console.error('Error loading tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  function openCreateModal() {
    setEditingTask(null)
    setFormData({
      name: '',
      description: '',
      type: 'DAILY',
      category: '',
      default_duration: undefined,
      estimated_duration: undefined
    })
    setShowModal(true)
  }

  function openEditModal(task: TaskTemplate) {
    setEditingTask(task)
    setFormData({
      name: task.name,
      description: task.description || '',
      type: task.type,
      category: task.category || '',
      default_duration: task.default_duration || undefined,
      estimated_duration: task.estimated_duration || undefined
    })
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!session?.enterprise?.id) return

    try {
      if (editingTask) {
        await tasksService.update(editingTask.id, session.enterprise.id, formData)
      } else {
        await tasksService.create(session.enterprise.id, formData)
      }

      setShowModal(false)
      loadTasks()
    } catch (error) {
      console.error('Error saving task:', error)
      alert('Erreur lors de la sauvegarde')
    }
  }

  async function handleDelete(task: TaskTemplate) {
    if (!session?.enterprise?.id) return
    if (!confirm(`Êtes-vous sûr de vouloir désactiver "${task.name}" ?`)) return

    try {
      await tasksService.softDelete(task.id, session.enterprise.id)
      loadTasks()
    } catch (error) {
      console.error('Error deleting task:', error)
      alert('Erreur lors de la suppression')
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

  const taskTypes: { value: TaskType | 'ALL'; label: string; color: string }[] = [
    { value: 'ALL', label: 'Toutes', color: 'neutral' },
    { value: 'DAILY', label: 'Quotidiennes', color: 'primary' },
    { value: 'WEEKLY', label: 'Hebdomadaires', color: 'secondary' },
    { value: 'MONTHLY', label: 'Mensuelles', color: 'accent' },
    { value: 'OCCASIONAL', label: 'Occasionnelles', color: 'success' }
  ]

  const getTypeColor = (type: TaskType) => {
    switch (type) {
      case 'DAILY': return 'bg-primary-50 text-primary-700 border-primary-200'
      case 'WEEKLY': return 'bg-secondary-50 text-secondary-700 border-secondary-200'
      case 'MONTHLY': return 'bg-accent-50 text-accent-700 border-accent-200'
      case 'OCCASIONAL': return 'bg-success-50 text-success-700 border-success-200'
      default: return 'bg-neutral-50 text-neutral-700 border-neutral-200'
    }
  }

  const getTypeLabel = (type: TaskType) => {
    return taskTypes.find(t => t.value === type)?.label || type
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 mb-2" style={{ fontFamily: 'Quicksand, sans-serif' }}>
              Tâches
            </h1>
            <p className="text-neutral-600">
              Gérez les templates de tâches de nettoyage
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="btn btn-primary flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            Nouvelle tâche
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-6">
          <FunnelIcon className="w-5 h-5 text-neutral-500" />
          <div className="flex gap-2 flex-wrap">
            {taskTypes.map((type) => (
              <button
                key={type.value}
                onClick={() => setFilterType(type.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filterType === type.value
                    ? 'bg-primary-500 text-white'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tasks grid */}
        {filteredTasks.length === 0 ? (
          <div className="card p-12 text-center">
            <ClipboardDocumentListIcon className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-neutral-900 mb-2">
              {filterType === 'ALL' ? 'Aucune tâche' : `Aucune tâche ${getTypeLabel(filterType as TaskType).toLowerCase()}`}
            </h3>
            <p className="text-neutral-600 mb-4">
              Commencez par créer votre première tâche
            </p>
            <button onClick={openCreateModal} className="btn btn-primary">
              Créer une tâche
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                className={`card p-6 ${!task.is_active && 'opacity-50'}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-neutral-900 mb-2">
                      {task.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${getTypeColor(task.type)}`}>
                        {getTypeLabel(task.type)}
                      </span>
                      {!task.is_active && (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-danger-50 text-danger-700 border border-danger-200">
                          Désactivée
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(task)}
                      className="p-2 rounded-lg hover:bg-neutral-100 transition-colors"
                      title="Modifier"
                    >
                      <PencilIcon className="w-4 h-4 text-neutral-600" />
                    </button>
                    <button
                      onClick={() => handleDelete(task)}
                      className="p-2 rounded-lg hover:bg-danger-50 transition-colors"
                      title="Désactiver"
                    >
                      <TrashIcon className="w-4 h-4 text-danger-600" />
                    </button>
                  </div>
                </div>

                {task.description && (
                  <p className="text-sm text-neutral-600 mb-4 line-clamp-2">
                    {task.description}
                  </p>
                )}

                <div className="space-y-2 text-sm">
                  {task.category && (
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">Catégorie</span>
                      <span className="font-medium text-neutral-900">{task.category}</span>
                    </div>
                  )}
                  {task.estimated_duration && (
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">Durée estimée</span>
                      <span className="font-medium text-neutral-900">{task.estimated_duration} min</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <>
            <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setShowModal(false)}></div>
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
              <div className="card w-full max-w-md p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-bold text-neutral-900 mb-4">
                  {editingTask ? 'Modifier la tâche' : 'Nouvelle tâche'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Nom de la tâche *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="ex: Nettoyer les sols"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Type de tâche *
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as TaskType })}
                      className="w-full px-4 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    >
                      <option value="DAILY">Quotidienne</option>
                      <option value="WEEKLY">Hebdomadaire</option>
                      <option value="MONTHLY">Mensuelle</option>
                      <option value="OCCASIONAL">Occasionnelle</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Catégorie
                    </label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="ex: Sols, Sanitaires, Cuisine"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Description détaillée"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Durée estimée (min)
                      </label>
                      <input
                        type="number"
                        value={formData.estimated_duration || ''}
                        onChange={(e) => setFormData({ ...formData, estimated_duration: e.target.value ? parseInt(e.target.value) : undefined })}
                        className="w-full px-4 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="15"
                        min="1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Durée par défaut (min)
                      </label>
                      <input
                        type="number"
                        value={formData.default_duration || ''}
                        onChange={(e) => setFormData({ ...formData, default_duration: e.target.value ? parseInt(e.target.value) : undefined })}
                        className="w-full px-4 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="15"
                        min="1"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="flex-1 px-4 py-2 rounded-lg border border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="flex-1 btn btn-primary"
                    >
                      {editingTask ? 'Modifier' : 'Créer'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
