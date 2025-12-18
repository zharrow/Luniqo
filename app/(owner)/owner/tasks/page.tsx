'use client'

import { useEffect, useState } from 'react'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { tasksService, type TaskTemplate, type CreateTaskInput } from '@/lib/services/tasks.service'
import { taskCategoriesService, type TaskCategory } from '@/lib/services/task-categories.service'
import { DEFAULT_TASK_CATEGORIES } from '@/lib/utils/default-categories'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ClipboardDocumentListIcon,
  EllipsisVerticalIcon,
  TagIcon
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { DeleteConfirmationDialog } from '@/components/shared/DeleteConfirmationDialog'
import { FormDialog } from '@/components/shared/FormDialog'
import { Card } from '@/components/ui/card'
import { PageBreadcrumb } from '@/components/shared/PageBreadcrumb'

export default function TasksPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const [tasks, setTasks] = useState<TaskTemplate[]>([])
  const [availableCategories, setAvailableCategories] = useState<TaskCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskTemplate | null>(null)
  const [editingCategory, setEditingCategory] = useState<TaskCategory | null>(null)
  const [categoryToDelete, setCategoryToDelete] = useState<TaskCategory | null>(null)
  const [taskToDelete, setTaskToDelete] = useState<TaskTemplate | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<CreateTaskInput>({
    name: '',
    description: '',
    category_id: null,
    estimated_duration: undefined
  })
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    color: '#84cc16'
  })

  useEffect(() => {
    if (session?.enterprise) {
      loadData()
    }
  }, [session])

  async function loadData() {
    if (!session?.enterprise?.id) return

    try {
      setLoading(true)
      const [tasksData, categoriesData] = await Promise.all([
        tasksService.getAll(session.enterprise.id),
        taskCategoriesService.getAll(session.enterprise.id)
      ])
      setTasks(tasksData)
      setAvailableCategories(categoriesData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  function openCreateModal() {
    setEditingTask(null)
    setFormData({
      name: '',
      description: '',
      category_id: null,
      estimated_duration: undefined
    })
    setShowModal(true)
  }

  function openEditModal(task: TaskTemplate) {
    setEditingTask(task)
    setFormData({
      name: task.name,
      description: task.description || '',
      category_id: task.category_id || null,
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
      loadData()
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
      loadData()
    } catch (error) {
      console.error('Error deleting task:', error)
      alert('Erreur lors de la suppression')
    } finally {
      setIsDeleting(false)
      setTaskToDelete(null)
    }
  }

  // Category management functions
  function openCreateCategoryModal() {
    setEditingCategory(null)
    setCategoryFormData({ name: '', color: '#84cc16' })
    setShowCategoryModal(true)
  }

  function openEditCategoryModal(category: TaskCategory) {
    setEditingCategory(category)
    setCategoryFormData({ name: category.name, color: category.color || '#84cc16' })
    setShowCategoryModal(true)
  }

  function selectDefaultCategory(categoryName: string, categoryColor: string) {
    setCategoryFormData({ name: categoryName, color: categoryColor })
  }

  async function handleCategorySubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!session?.enterprise?.id) return

    try {
      setIsSubmitting(true)
      if (editingCategory) {
        await taskCategoriesService.update(editingCategory.id, session.enterprise.id, categoryFormData)
      } else {
        await taskCategoriesService.create(session.enterprise.id, categoryFormData)
      }
      setShowCategoryModal(false)
      loadData()
    } catch (error) {
      console.error('Error saving category:', error)
      alert('Erreur lors de la sauvegarde de la catégorie')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleConfirmDeleteCategory() {
    if (!session?.enterprise?.id || !categoryToDelete) return

    try {
      setIsDeleting(true)
      await taskCategoriesService.hardDelete(categoryToDelete.id, session.enterprise.id)
      loadData()
    } catch (error) {
      console.error('Error deleting category:', error)
      alert('Erreur lors de la suppression de la catégorie')
    } finally {
      setIsDeleting(false)
      setCategoryToDelete(null)
    }
  }

  // Grouper les tâches par catégorie pour la vue Kanban
  const tasksByCategory: Record<string, TaskTemplate[]> = {}

  // Grouper les tâches qui ont une catégorie
  tasks.forEach(task => {
    if (task.task_category) {
      const categoryName = task.task_category.name
      if (!tasksByCategory[categoryName]) {
        tasksByCategory[categoryName] = []
      }
      tasksByCategory[categoryName].push(task)
    }
  })

  // Ajouter une catégorie "Sans catégorie" pour les tâches sans catégorie
  const uncategorizedTasks = tasks.filter(t => !t.task_category)
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
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={openCreateCategoryModal}
                className="flex items-center gap-2"
              >
                <TagIcon className="w-5 h-5" />
                Gérer les catégories
              </Button>
              <button
                onClick={openCreateModal}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-lime-500 to-green-500 text-white font-medium shadow-lg shadow-lime-500/30 hover:shadow-xl hover:shadow-lime-500/40 hover:scale-105 transition-all duration-200 flex items-center gap-2"
              >
                <PlusIcon className="w-5 h-5" />
                Nouvelle tâche
              </button>
            </div>
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
                      className="group relative rounded-3xl p-4 bg-gradient-to-br from-lime-50/80 to-green-50/80 border border-lime-200/50 hover:shadow-lg hover:shadow-lime-500/20 hover:-translate-y-1 transition-all duration-300"
                    >
                      {/* Gradient fond */}
                      <div
                        className="absolute inset-0 opacity-30 group-hover:opacity-50 transition-opacity duration-300 rounded-3xl pointer-events-none"
                        style={{ background: 'linear-gradient(to bottom right, rgba(217, 249, 157, 0.3), rgba(134, 239, 172, 0.3))' }}
                      />

                      <div className="relative z-10">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-sm flex-1 pr-2">{task.name}</h4>
                        <DropdownMenu>
                          <DropdownMenuTrigger className="h-6 w-6 -mt-1 flex-shrink-0 inline-flex items-center justify-center rounded-md hover:bg-accent transition-colors">
                            <EllipsisVerticalIcon className="w-4 h-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="z-[100]">
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
            <Select
              value={formData.category_id || 'none'}
              onValueChange={(value) => setFormData({ ...formData, category_id: value === 'none' ? null : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez une catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucune catégorie</SelectItem>
                {availableCategories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Les catégories permettent d'organiser vos tâches
            </p>
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

        {/* Category Management Modal */}
        <FormDialog
          isOpen={showCategoryModal}
          onClose={() => setShowCategoryModal(false)}
          onSubmit={handleCategorySubmit}
          title={editingCategory ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
          submitLabel={editingCategory ? 'Modifier' : 'Créer'}
          isSubmitting={isSubmitting}
        >
          {/* Suggested Categories (only when creating new) */}
          {!editingCategory && (
            <div className="mb-4 p-3 rounded-lg bg-muted/50 border">
              <h3 className="text-sm font-medium mb-2">Catégories suggérées</h3>
              <div className="grid grid-cols-2 gap-2">
                {DEFAULT_TASK_CATEGORIES.map((cat) => (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => selectDefaultCategory(cat.name, cat.color)}
                    className="flex items-center gap-2 p-2 rounded-md border hover:bg-accent transition-colors text-left"
                  >
                    <div
                      className="w-4 h-4 rounded flex-shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="text-sm">{cat.name}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Cliquez pour pré-remplir le formulaire
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">
              Nom de la catégorie *
            </label>
            <Input
              type="text"
              value={categoryFormData.name}
              onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
              placeholder="ex: Sols, Sanitaires, Cuisine"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Couleur
            </label>
            <div className="flex gap-2 items-center">
              <Input
                type="color"
                value={categoryFormData.color}
                onChange={(e) => setCategoryFormData({ ...categoryFormData, color: e.target.value })}
                className="w-20 h-10"
              />
              <Input
                type="text"
                value={categoryFormData.color}
                onChange={(e) => setCategoryFormData({ ...categoryFormData, color: e.target.value })}
                placeholder="#84cc16"
                className="flex-1"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Couleur utilisée pour afficher la catégorie dans l'interface
            </p>
          </div>

          {/* Existing Categories List */}
          {!editingCategory && availableCategories.length > 0 && (
            <div className="pt-4 border-t">
              <h3 className="text-sm font-medium mb-3">Catégories existantes</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {availableCategories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-2 rounded-lg border hover:bg-accent"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: category.color || '#84cc16' }}
                      />
                      <span className="text-sm">{category.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={(e) => {
                          e.preventDefault()
                          openEditCategoryModal(category)
                        }}
                      >
                        <PencilIcon className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={(e) => {
                          e.preventDefault()
                          setCategoryToDelete(category)
                        }}
                      >
                        <TrashIcon className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </FormDialog>

        {/* Delete Task Confirmation Dialog */}
        <DeleteConfirmationDialog
          isOpen={!!taskToDelete}
          onClose={() => setTaskToDelete(null)}
          onConfirm={handleConfirmDelete}
          itemName={taskToDelete?.name}
          isDeleting={isDeleting}
        />

        {/* Delete Category Confirmation Dialog */}
        <DeleteConfirmationDialog
          isOpen={!!categoryToDelete}
          onClose={() => setCategoryToDelete(null)}
          onConfirm={handleConfirmDeleteCategory}
          itemName={categoryToDelete?.name}
          isDeleting={isDeleting}
        />
      </div>
    </div>
  )
}