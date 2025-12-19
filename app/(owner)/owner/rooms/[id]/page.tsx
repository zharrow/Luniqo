'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { roomsService, type Room } from '@/lib/services/rooms.service'
import { tasksService, type TaskTemplate } from '@/lib/services/tasks.service'
import { assignedTasksService, type AssignedTask, type DayOfWeek } from '@/lib/services/assigned-tasks.service'
import {
  ArrowLeftIcon,
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  PencilIcon
} from '@heroicons/react/24/outline'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'

export default function RoomTasksPage() {
  const { id } = useParams()
  const router = useRouter()
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])

  const [room, setRoom] = useState<Room | null>(null)
  const [availableTasks, setAvailableTasks] = useState<TaskTemplate[]>([])
  const [assignedTasks, setAssignedTasks] = useState<AssignedTask[]>([])
  const [selectedTaskId, setSelectedTaskId] = useState<string>('none')
  const [suggestedTime, setSuggestedTime] = useState<string>('')
  const [expectedDuration, setExpectedDuration] = useState<string>('')
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>([])
  const [editingTask, setEditingTask] = useState<string | null>(null)
  const [editTime, setEditTime] = useState<string>('')
  const [editDuration, setEditDuration] = useState<string>('')
  const [editDays, setEditDays] = useState<DayOfWeek[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (session?.enterprise && id) {
      loadData()
    }
  }, [session, id])

  // Auto-fill estimated duration from selected task template
  useEffect(() => {
    if (selectedTaskId !== 'none') {
      const selectedTask = availableTasks.find(t => t.id === selectedTaskId)
      if (selectedTask?.estimated_duration) {
        setExpectedDuration(selectedTask.estimated_duration.toString())
      }
    }
  }, [selectedTaskId, availableTasks])

  async function loadData() {
    if (!session?.enterprise?.id || !id) return

    try {
      setLoading(true)

      // Load room details
      const roomData = await roomsService.getById(id as string, session.enterprise.id)
      if (!roomData) {
        alert('Pièce introuvable')
        router.push('/owner/rooms')
        return
      }
      setRoom(roomData)

      // Load all active tasks
      const tasksData = await tasksService.getActive(session.enterprise.id)
      setAvailableTasks(tasksData)

      // Load assigned tasks for this room
      const assignedData = await assignedTasksService.getActiveByRoom(id as string)
      setAssignedTasks(assignedData)
    } catch (error) {
      console.error('Error loading data:', error)
      alert('Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }

  async function handleAssignTask() {
    if (!id || selectedTaskId === 'none') return

    try {
      setSaving(true)

      // Check if already assigned
      const isAlreadyAssigned = await assignedTasksService.isAssigned(
        id as string,
        selectedTaskId
      )

      if (isAlreadyAssigned) {
        alert('Cette tâche est déjà assignée à cette pièce')
        return
      }

      // Build frequency object if days are selected
      const frequency = selectedDays.length > 0
        ? { type: 'specific_days' as const, days: selectedDays }
        : null

      // Assign task with optional time, duration, and frequency
      await assignedTasksService.create({
        room_id: id as string,
        task_template_id: selectedTaskId,
        order_in_room: assignedTasks.length + 1,
        suggested_time: suggestedTime || null,
        expected_duration: expectedDuration ? parseInt(expectedDuration) : null,
        frequency
      })

      // Reset selection and reload
      setSelectedTaskId('none')
      setSuggestedTime('')
      setExpectedDuration('')
      setSelectedDays([])
      loadData()
    } catch (error) {
      console.error('Error assigning task:', error)
      alert('Erreur lors de l\'assignation')
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdateTaskSchedule(assignedTaskId: string) {
    try {
      setSaving(true)

      // Build frequency object if days are selected
      const frequency = editDays.length > 0
        ? { type: 'specific_days' as const, days: editDays }
        : null

      await assignedTasksService.update(assignedTaskId, {
        suggested_time: editTime || null,
        expected_duration: editDuration ? parseInt(editDuration) : null,
        frequency
      })

      // Reset edit state and reload
      setEditingTask(null)
      setEditTime('')
      setEditDuration('')
      setEditDays([])
      loadData()
    } catch (error) {
      console.error('Error updating task schedule:', error)
      alert('Erreur lors de la mise à jour')
    } finally {
      setSaving(false)
    }
  }

  function startEditingTask(assignedTask: AssignedTask) {
    setEditingTask(assignedTask.id)
    setEditTime(assignedTask.suggested_time || '')
    setEditDuration(assignedTask.expected_duration?.toString() || '')
    setEditDays(assignedTask.frequency?.days || [])
  }

  function cancelEditing() {
    setEditingTask(null)
    setEditTime('')
    setEditDuration('')
    setEditDays([])
  }

  async function handleUnassign(assignedTaskId: string) {
    if (!confirm('Êtes-vous sûr de vouloir retirer cette tâche ?')) return

    try {
      setSaving(true)
      await assignedTasksService.hardDelete(assignedTaskId)
      loadData()
    } catch (error) {
      console.error('Error unassigning task:', error)
      alert('Erreur lors de la suppression')
    } finally {
      setSaving(false)
    }
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

  if (!room) {
    return null
  }

  // Filter out already assigned tasks
  const assignedTaskIds = assignedTasks.map(at => at.task_template_id)
  const unassignedTasks = availableTasks.filter(
    task => !assignedTaskIds.includes(task.id)
  )


  return (
    <div className="max-w-7xl mx-auto">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push('/owner/rooms')}
            className="mb-4"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Retour aux pièces
          </Button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                {room.name}
              </h1>
              <p className="text-muted-foreground">
                Gérez les tâches assignées à cette pièce
              </p>
            </div>
            <Badge variant="neutral" size="lg">
              {assignedTasks.length} tâche{assignedTasks.length !== 1 ? 's' : ''} assignée{assignedTasks.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>

        {/* Assign new task */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlusIcon className="w-5 h-5" />
              Assigner une nouvelle tâche
            </CardTitle>
          </CardHeader>
          <CardContent>
            {unassignedTasks.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircleIcon className="w-12 h-12 text-success-500 mx-auto mb-3" />
                <p className="text-muted-foreground">
                  Toutes les tâches disponibles sont déjà assignées à cette pièce
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Label htmlFor="task-select">Tâche à assigner</Label>
                    <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
                      <SelectTrigger id="task-select">
                        <SelectValue placeholder="Sélectionnez une tâche" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sélectionnez une tâche</SelectItem>
                        {unassignedTasks.map((task) => (
                          <SelectItem key={task.id} value={task.id}>
                            {task.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Time and duration fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="suggested-time" className="flex items-center gap-2">
                      <ClockIcon className="w-4 h-4" />
                      Horaire suggéré (optionnel)
                    </Label>
                    <Input
                      id="suggested-time"
                      type="time"
                      value={suggestedTime}
                      onChange={(e) => setSuggestedTime(e.target.value)}
                      placeholder="09:00"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Heure idéale pour effectuer cette tâche
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="expected-duration">
                      Durée estimée (modifiable)
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="expected-duration"
                        type="number"
                        min="1"
                        max="480"
                        value={expectedDuration}
                        onChange={(e) => setExpectedDuration(e.target.value)}
                        placeholder="30"
                      />
                      <span className="text-sm text-muted-foreground whitespace-nowrap">
                        minutes
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Durée pré-remplie depuis la tâche, modifiable selon la pièce
                    </p>
                  </div>
                </div>

                {/* Days of week selection */}
                <div>
                  <Label className="mb-2 block">
                    Jours spécifiques (optionnel)
                  </Label>
                  <p className="text-xs text-muted-foreground mb-3">
                    Si vide, la tâche sera répétée tous les jours. Sélectionnez les jours pour une tâche hebdomadaire.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as DayOfWeek[]).map((day) => {
                      const dayLabels = {
                        Monday: 'Lundi',
                        Tuesday: 'Mardi',
                        Wednesday: 'Mercredi',
                        Thursday: 'Jeudi',
                        Friday: 'Vendredi'
                      }
                      const isSelected = selectedDays.includes(day)

                      return (
                        <Badge
                          key={day}
                          variant={isSelected ? 'default' : 'outline'}
                          className="cursor-pointer px-3 py-1.5 text-sm"
                          onClick={() => {
                            if (isSelected) {
                              setSelectedDays(selectedDays.filter(d => d !== day))
                            } else {
                              setSelectedDays([...selectedDays, day])
                            }
                          }}
                        >
                          {dayLabels[day]}
                        </Badge>
                      )
                    })}
                  </div>
                </div>

                <Button
                  onClick={handleAssignTask}
                  disabled={selectedTaskId === 'none' || saving}
                  className="w-full"
                >
                  {saving ? 'Assignation...' : 'Assigner la tâche'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assigned tasks list */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardDocumentListIcon className="w-5 h-5" />
              Tâches assignées
            </CardTitle>
          </CardHeader>
          <CardContent>
            {assignedTasks.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardDocumentListIcon className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  Aucune tâche assignée
                </h3>
                <p className="text-muted-foreground">
                  Commencez par assigner des tâches à cette pièce
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {assignedTasks.map((assignedTask, index) => (
                  <div
                    key={assignedTask.id}
                    className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    {editingTask === assignedTask.id ? (
                      // Edit mode
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-medium">
                            {index + 1}
                          </div>
                          <h4 className="font-medium">
                            {assignedTask.task_template?.name || 'Tâche supprimée'}
                          </h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor={`edit-time-${assignedTask.id}`} className="text-xs">
                              Horaire suggéré
                            </Label>
                            <Input
                              id={`edit-time-${assignedTask.id}`}
                              type="time"
                              value={editTime}
                              onChange={(e) => setEditTime(e.target.value)}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`edit-duration-${assignedTask.id}`} className="text-xs">
                              Durée (minutes)
                            </Label>
                            <Input
                              id={`edit-duration-${assignedTask.id}`}
                              type="number"
                              min="1"
                              max="480"
                              value={editDuration}
                              onChange={(e) => setEditDuration(e.target.value)}
                            />
                          </div>
                        </div>

                        {/* Days of week selection - Edit mode */}
                        <div>
                          <Label className="text-xs mb-2 block">
                            Jours spécifiques (optionnel)
                          </Label>
                          <div className="flex flex-wrap gap-2">
                            {(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as DayOfWeek[]).map((day) => {
                              const dayLabels = {
                                Monday: 'Lun',
                                Tuesday: 'Mar',
                                Wednesday: 'Mer',
                                Thursday: 'Jeu',
                                Friday: 'Ven'
                              }
                              const isSelected = editDays.includes(day)

                              return (
                                <Badge
                                  key={day}
                                  variant={isSelected ? 'default' : 'outline'}
                                  className="cursor-pointer px-2 py-1 text-xs"
                                  onClick={() => {
                                    if (isSelected) {
                                      setEditDays(editDays.filter(d => d !== day))
                                    } else {
                                      setEditDays([...editDays, day])
                                    }
                                  }}
                                >
                                  {dayLabels[day]}
                                </Badge>
                              )
                            })}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleUpdateTaskSchedule(assignedTask.id)}
                            disabled={saving}
                          >
                            Enregistrer
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={cancelEditing}
                            disabled={saving}
                          >
                            Annuler
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // View mode
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-medium">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">
                              {assignedTask.task_template?.name || 'Tâche supprimée'}
                            </h4>
                            <div className="flex flex-wrap items-center gap-3 mt-1">
                              {assignedTask.task_template?.task_category && (
                                <Badge variant="neutral" size="sm">
                                  {assignedTask.task_template.task_category.name}
                                </Badge>
                              )}
                              {assignedTask.suggested_time && (
                                <div className="flex items-center gap-1 text-sm text-primary-600">
                                  <ClockIcon className="w-4 h-4" />
                                  {assignedTask.suggested_time}
                                  {assignedTask.expected_duration && (
                                    <span className="text-muted-foreground">
                                      ({assignedTask.expected_duration} min)
                                    </span>
                                  )}
                                </div>
                              )}
                              {!assignedTask.suggested_time && (
                                <span className="text-xs text-muted-foreground italic">
                                  Aucun horaire défini
                                </span>
                              )}
                            </div>
                            {/* Display selected days */}
                            {assignedTask.frequency?.days && assignedTask.frequency.days.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                {assignedTask.frequency.days.map((day) => {
                                  const dayLabels: Record<DayOfWeek, string> = {
                                    Monday: 'Lun',
                                    Tuesday: 'Mar',
                                    Wednesday: 'Mer',
                                    Thursday: 'Jeu',
                                    Friday: 'Ven'
                                  }
                                  return (
                                    <Badge key={day} variant="secondary" size="sm">
                                      {dayLabels[day]}
                                    </Badge>
                                  )
                                })}
                              </div>
                            )}
                            {assignedTask.frequency?.days && assignedTask.frequency.days.length === 0 && (
                              <div className="mt-2">
                                <span className="text-xs text-muted-foreground italic">
                                  Tous les jours
                                </span>
                              </div>
                            )}
                            {!assignedTask.frequency && (
                              <div className="mt-2">
                                <span className="text-xs text-muted-foreground italic">
                                  Tous les jours
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => startEditingTask(assignedTask)}
                            disabled={saving}
                            title="Modifier l'horaire"
                          >
                            <PencilIcon className="w-5 h-5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleUnassign(assignedTask.id)}
                            disabled={saving}
                            title="Retirer la tâche"
                          >
                            <TrashIcon className="w-5 h-5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
