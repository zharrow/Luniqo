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
  FunnelIcon,
  EllipsisVerticalIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { DeleteConfirmationDialog } from '@/components/shared/DeleteConfirmationDialog'
import { FormDialog } from '@/components/shared/FormDialog'

export default function TasksPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Admin'])
  const [tasks, setTasks] = useState<TaskTemplate[]>([])
  const [filteredTasks, setFilteredTasks] = useState<TaskTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskTemplate | null>(null)
  const [filterType, setFilterType] = useState<TaskType | 'ALL'>('ALL')
  const [taskToDelete, setTaskToDelete] = useState<TaskTemplate | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
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
      default: return 'bg-muted text-muted-foreground border-border'
    }
  }

  const getTypeBadgeVariant = (type: TaskType): 'primary' | 'success' | 'danger' | 'warning' | 'neutral' => {
    switch (type) {
      case 'DAILY': return 'primary'
      case 'WEEKLY': return 'neutral'
      case 'MONTHLY': return 'warning'
      case 'OCCASIONAL': return 'success'
      default: return 'neutral'
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
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-3xl font-bold">
                Tâches
              </h1>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="text-muted-foreground hover:text-primary transition-colors">
                    <InformationCircleIcon className="w-6 h-6" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-96" align="start">
                  <div className="space-y-3">
                    <h4 className="font-semibold">Types de tâches</h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium text-primary">Quotidiennes :</span>
                        <span className="text-muted-foreground"> Tâches à effectuer chaque jour</span>
                      </div>
                      <div>
                        <span className="font-medium text-secondary">Hebdomadaires :</span>
                        <span className="text-muted-foreground"> Tâches à effectuer une fois par semaine</span>
                      </div>
                      <div>
                        <span className="font-medium text-accent">Mensuelles :</span>
                        <span className="text-muted-foreground"> Tâches à effectuer une fois par mois</span>
                      </div>
                      <div>
                        <span className="font-medium text-success-600">Occasionnelles :</span>
                        <span className="text-muted-foreground"> Tâches ponctuelles ou à la demande</span>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <p className="text-muted-foreground">
              Gérez les templates de tâches de nettoyage
            </p>
          </div>
          <Button onClick={openCreateModal} className="flex items-center gap-2">
            <PlusIcon className="w-5 h-5" />
            Nouvelle tâche
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-6">
          <FunnelIcon className="w-5 h-5 text-muted-foreground" />
          <div className="flex gap-2 flex-wrap">
            {taskTypes.map((type) => (
              <Button
                key={type.value}
                variant={filterType === type.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType(type.value)}
              >
                {type.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Tasks grid */}
        {filteredTasks.length === 0 ? (
          <Card className="p-12 text-center">
            <ClipboardDocumentListIcon className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {filterType === 'ALL' ? 'Aucune tâche' : `Aucune tâche ${getTypeLabel(filterType as TaskType).toLowerCase()}`}
            </h3>
            <p className="text-muted-foreground mb-4">
              Commencez par créer votre première tâche
            </p>
            <Button onClick={openCreateModal}>
              Créer une tâche
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTasks.map((task) => (
              <Card
                key={task.id}
                className={!task.is_active ? 'opacity-50' : ''}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold mb-2">
                        {task.name}
                      </h3>
                      <div className="flex items-center gap-2">
                        <Badge variant={getTypeBadgeVariant(task.type)} size="sm">
                          {getTypeLabel(task.type)}
                        </Badge>
                        {!task.is_active && (
                          <Badge variant="danger" size="sm">
                            Désactivée
                          </Badge>
                        )}
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" title="Actions">
                          <EllipsisVerticalIcon className="w-5 h-5" />
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
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {task.description}
                    </p>
                  )}

                  <div className="space-y-2 text-sm">
                    {task.category && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Catégorie</span>
                        <span className="font-medium">{task.category}</span>
                      </div>
                    )}
                    {task.estimated_duration && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Durée estimée</span>
                        <span className="font-medium">{task.estimated_duration} min</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
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
              Type de tâche *
            </label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value as TaskType })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DAILY">Quotidienne</SelectItem>
                <SelectItem value="WEEKLY">Hebdomadaire</SelectItem>
                <SelectItem value="MONTHLY">Mensuelle</SelectItem>
                <SelectItem value="OCCASIONAL">Occasionnelle</SelectItem>
              </SelectContent>
            </Select>
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

          <div className="grid grid-cols-2 gap-4">
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
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Durée par défaut (min)
              </label>
              <Input
                type="number"
                value={formData.default_duration || ''}
                onChange={(e) => setFormData({ ...formData, default_duration: e.target.value ? parseInt(e.target.value) : undefined })}
                placeholder="15"
                min="1"
              />
            </div>
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
    </DashboardLayout>
  )
}
