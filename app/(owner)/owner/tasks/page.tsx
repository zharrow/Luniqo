'use client'

import { useEffect, useState } from 'react'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { tasksService, type TaskTemplate, type CreateTaskInput } from '@/lib/services/tasks.service'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ClipboardDocumentListIcon,
  EllipsisVerticalIcon
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { DeleteConfirmationDialog } from '@/components/shared/DeleteConfirmationDialog'
import { FormDialog } from '@/components/shared/FormDialog'
import { Card } from '@/components/ui/card'
import { PageBreadcrumb } from '@/components/shared/PageBreadcrumb'

export default function TasksPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const [tasks, setTasks] = useState<TaskTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskTemplate | null>(null)
  const [taskToDelete, setTaskToDelete] = useState<TaskTemplate | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<CreateTaskInput>({
    name: '',
    description: '',
    category: '',
    estimated_duration: undefined
  })

  useEffect(() => {
    if (session?.enterprise) {
      loadTasks()
    }
  }, [session])

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
      category: '',
      estimated_duration: undefined
    })
    setShowModal(true)
  }

  function openEditModal(task: TaskTemplate) {
    setEditingTask(task)
    setFormData({
      name: task.name,
      description: task.description || '',
      category: task.category || '',
      estimated_duration: task.estimated_duration || undefined
    })
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!session?.enterprise?.id) return

    try {
      setIsSubmitting(true)
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
    } finally {
      setIsSubmitting(false)
    }
  }

  function openDeleteDialog(task: TaskTemplate) {
    setTaskToDelete(task)
  }

  async function handleConfirmDelete() {
    if (!session?.enterprise?.id || !taskToDelete) return

    try {
      setIsDeleting(true)
      await tasksService.delete(taskToDelete.id, session.enterprise.id)
      loadTasks()
    } catch (error) {
      console.error('Error deleting task:', error)
      alert('Erreur lors de la suppression')
    } finally {
      setIsDeleting(false)
      setTaskToDelete(null)
    }
  }

  // Grouper les tâches par catégorie pour la vue Kanban
  const categories = Array.from(new Set(tasks.map(t => t.category).filter(Boolean)))
  const tasksByCategory = categories.reduce((acc, category) => {
    acc[category!] = tasks.filter(t => t.category === category)
    return acc
  }, {} as Record<string, TaskTemplate[]>)

  // Ajouter une catégorie "Sans catégorie" pour les tâches sans catégorie
  const uncategorizedTasks = tasks.filter(t => !t.category)
  if (uncategorizedTasks.length > 0) {
    tasksByCategory['Sans catégorie'] = uncategorizedTasks
  }

  if (authLoading || loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <PageBreadcrumb
          items={[
            { label: 'Dashboard', href: '/owner/dashboard' },
            { label: 'Tâches' }
          ]}
        />

        {/* Header with Gradient - Module Tasks (Lime) */}
        <div className="relative mb-8 p-8 rounded-3xl bg-gradient-to-br from-lime-50 via-green-50 to-emerald-50 border border-lime-200/50 overflow-hidden">
          <div className="absolute inset-0 bg-[url('/patterns/dots.svg')] opacity-5"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-lime-400 to-green-500 flex items-center justify-center shadow-lg shadow-lime-500/30">
                <ClipboardDocumentListIcon className="w-8 h-8 text-white" strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="text-3xl font-bold mb-1 bg-gradient-to-r from-lime-600 to-green-600 bg-clip-text text-transparent" style={{ fontFamily: 'Quicksand, sans-serif' }}>
                  Tâches
                </h1>
                <p className="text-lime-700/70">
                  Gérez les templates de tâches de nettoyage
                </p>
              </div>
            </div>
            <button
              onClick={openCreateModal}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-lime-500 to-green-500 text-white font-medium shadow-lg shadow-lime-500/30 hover:shadow-xl hover:shadow-lime-500/40 hover:scale-105 transition-all duration-200 flex items-center gap-2"
            >
              <PlusIcon className="w-5 h-5" />
              Nouvelle tâche
            </button>
          </div>
        </div>

        {/* Empty state */}
        {tasks.length === 0 ? (
          <Card className="p-12 text-center">
            <ClipboardDocumentListIcon className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">
              Aucune tâche
            </h3>
            <p className="text-muted-foreground mb-4">
              Commencez par créer votre première tâche
            </p>
            <Button onClick={openCreateModal}>
              Créer une tâche
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Object.entries(tasksByCategory).map(([category, categoryTasks]) => (
              <div key={category}>
                <div className="mb-3 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-br from-lime-400 to-green-500 shadow-sm shadow-lime-500/30" />
                  <h3 className="font-semibold text-sm text-lime-900">{category}</h3>
                  <span className="text-xs text-lime-700/60 ml-auto">{categoryTasks.length}</span>
                </div>
                <div className="space-y-2">
                  {categoryTasks.map((task) => (
                    <div
                      key={task.id}
                      className="group relative rounded-3xl p-4 bg-gradient-to-br from-lime-50/80 to-green-50/80 border border-lime-200/50 hover:shadow-lg hover:shadow-lime-500/20 hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                    >
                      {/* Gradient fond */}
                      <div
                        className="absolute inset-0 opacity-30 group-hover:opacity-50 transition-opacity duration-300"
                        style={{ background: 'linear-gradient(to bottom right, rgba(217, 249, 157, 0.3), rgba(134, 239, 172, 0.3))' }}
                      />

                      <div className="relative z-10">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-sm flex-1 pr-2">{task.name}</h4>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 -mt-1 flex-shrink-0">
                              <EllipsisVerticalIcon className="w-3 h-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditModal(task)}>
                              <PencilIcon className="w-4 h-4" />
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => openDeleteDialog(task)}
                            >
                              <TrashIcon className="w-4 h-4" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      {task.description && (
                        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{task.description}</p>
                      )}
                      <div className="flex items-center justify-between text-xs">
                        {task.estimated_duration && (
                          <span className="text-muted-foreground">{task.estimated_duration} min</span>
                        )}
                        {!task.is_active && <Badge variant="danger" size="sm">Désactivée</Badge>}
                      </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Form Dialog */}
        <FormDialog
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmit}
          title={editingTask ? 'Modifier la tâche' : 'Nouvelle tâche'}
          submitLabel={editingTask ? 'Modifier' : 'Créer'}
          isSubmitting={isSubmitting}
        >
          <div>
            <label className="block text-sm font-medium mb-1">
              Nom de la tâche *
            </label>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="ex: Nettoyer les sols"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Catégorie
            </label>
            <Input
              type="text"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="ex: Sols, Sanitaires, Cuisine"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Description détaillée"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Durée estimée (min)
            </label>
            <Input
              type="number"
              value={formData.estimated_duration || ''}
              onChange={(e) => setFormData({ ...formData, estimated_duration: e.target.value ? parseInt(e.target.value) : undefined })}
              placeholder="15"
              min="1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Cette durée sera utilisée par défaut lors de l'assignation à une salle
            </p>
          </div>
        </FormDialog>

        {/* Delete Confirmation Dialog */}
        <DeleteConfirmationDialog
          isOpen={!!taskToDelete}
          onClose={() => setTaskToDelete(null)}
          onConfirm={handleConfirmDelete}
          itemName={taskToDelete?.name}
          isDeleting={isDeleting}
        />
      </div>
    </div>
  )
}