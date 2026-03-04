'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
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
  PencilIcon,
  BuildingOfficeIcon
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
  const { selectedNursery } = useNursery()

  const [room, setRoom] = useState<Room | null>(null)
  const [availableTasks, setAvailableTasks] = useState<TaskTemplate[]>([])
  const [assignedTasks, setAssignedTasks] = useState<AssignedTask[]>([])
  const [selectedTaskId, setSelectedTaskId] = useState<string>('none')
  const [suggestedHour, setSuggestedHour] = useState<string>('12')
  const [suggestedMinute, setSuggestedMinute] = useState<string>('30')
  const [expectedDuration, setExpectedDuration] = useState<string>('')
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>([])
  const [editingTask, setEditingTask] = useState<string | null>(null)
  const [editHour, setEditHour] = useState<string>('')
  const [editMinute, setEditMinute] = useState<string>('')
  const [editDuration, setEditDuration] = useState<string>('')
  const [editDays, setEditDays] = useState<DayOfWeek[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (selectedNursery?.id && session?.enterprise?.id && id) {
      loadData()
    }
  }, [selectedNursery?.id, session?.enterprise?.id, id])

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
    if (!selectedNursery?.id || !session?.enterprise?.id || !id) return

    try {
      setLoading(true)

      // Load room details
      const roomData = await roomsService.getById(id as string, selectedNursery.id)
      if (!roomData) {
        alert('Pièce introuvable')
        router.push('/owner/rooms')
        return
      }
      setRoom(roomData)

      // Load all active tasks (enterprise-level, not nursery-level)
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

  async function refreshTasks() {
    if (!session?.enterprise?.id || !id) return

    try {
      const [tasksData, assignedData] = await Promise.all([
        tasksService.getActive(session.enterprise.id),
        assignedTasksService.getActiveByRoom(id as string)
      ])
      setAvailableTasks(tasksData)
      setAssignedTasks(assignedData)
    } catch (error) {
      console.error('Error refreshing tasks:', error)
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

      // Build time string from hours and minutes
      const suggestedTime = suggestedHour && suggestedMinute
        ? `${suggestedHour.padStart(2, '0')}:${suggestedMinute.padStart(2, '0')}`
        : null

      // Build frequency object if days are selected
      const frequency = selectedDays.length > 0
        ? { type: 'specific_days' as const, days: selectedDays }
        : null

      // Assign task with optional time, duration, and frequency
      await assignedTasksService.create({
        room_id: id as string,
        task_template_id: selectedTaskId,
        order_in_room: assignedTasks.length + 1,
        suggested_time: suggestedTime,
        expected_duration: expectedDuration ? parseInt(expectedDuration) : null,
        frequency
      })

      // Reset selection and refresh tasks only
      setSelectedTaskId('none')
      setSuggestedHour('12')
      setSuggestedMinute('30')
      setExpectedDuration('')
      setSelectedDays([])
      refreshTasks()
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

      // Build time string from hours and minutes
      const suggestedTime = editHour && editMinute
        ? `${editHour.padStart(2, '0')}:${editMinute.padStart(2, '0')}`
        : null

      // Build frequency object if days are selected
      const frequency = editDays.length > 0
        ? { type: 'specific_days' as const, days: editDays }
        : null

      await assignedTasksService.update(assignedTaskId, {
        suggested_time: suggestedTime,
        expected_duration: editDuration ? parseInt(editDuration) : null,
        frequency
      })

      // Reset edit state and refresh tasks only
      setEditingTask(null)
      setEditHour('')
      setEditMinute('')
      setEditDuration('')
      setEditDays([])
      refreshTasks()
    } catch (error) {
      console.error('Error updating task schedule:', error)
      alert('Erreur lors de la mise à jour')
    } finally {
      setSaving(false)
    }
  }

  function startEditingTask(assignedTask: AssignedTask) {
    setEditingTask(assignedTask.id)

    // Parse time string (HH:MM) into separate hour and minute
    if (assignedTask.suggested_time) {
      const [hour, minute] = assignedTask.suggested_time.split(':')
      setEditHour(hour || '')
      setEditMinute(minute || '')
    } else {
      setEditHour('')
      setEditMinute('')
    }

    setEditDuration(assignedTask.expected_duration?.toString() || '')
    setEditDays(assignedTask.frequency?.days || [])
  }

  function cancelEditing() {
    setEditingTask(null)
    setEditHour('')
    setEditMinute('')
    setEditDuration('')
    setEditDays([])
  }

  async function handleUnassign(assignedTaskId: string) {
    if (!confirm('Êtes-vous sûr de vouloir retirer cette tâche ?')) return

    try {
      setSaving(true)
      await assignedTasksService.hardDelete(assignedTaskId)
      refreshTasks()
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
            <div className="flex items-center gap-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-orange-100">
                <BuildingOfficeIcon className="w-6 h-6 text-orange-600" strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{room.name}</h1>
                <p className="text-sm text-muted-foreground">
                  Gérez les tâches assignées à cette pièce
                </p>
              </div>
            </div>
            <Badge variant="neutral" size="lg">
              {assignedTasks.length} tâche{assignedTasks.length !== 1 ? 's' : ''} assignée{assignedTasks.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>

        {/* Two-column layout: form left (narrow), list right (wide) */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-6 items-start">
          {/* Assign new task */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlusIcon className="w-5 h-5" />
                Assigner une tâche
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
                  <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
                    <div>
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
                    <div>
                      <Label className="flex items-center gap-1 text-xs">
                        <ClockIcon className="w-3.5 h-3.5" />
                        Horaire
                      </Label>
                      <div className="flex items-center gap-1">
                        <Select value={suggestedHour} onValueChange={setSuggestedHour}>
                          <SelectTrigger className="w-[72px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                              <SelectItem key={hour} value={hour.toString().padStart(2, '0')}>
                                {hour.toString().padStart(2, '0')}h
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-muted-foreground">:</span>
                        <Select value={suggestedMinute} onValueChange={setSuggestedMinute}>
                          <SelectTrigger className="w-[72px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map((min) => (
                              <SelectItem key={min} value={min}>
                                {min}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="expected-duration">
                      Durée estimée
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
                        min
                      </span>
                    </div>
                  </div>

                  {/* Days of week selection */}
                  <div>
                    <Label className="mb-2 block">
                      Jours spécifiques
                    </Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Si vide, la tâche sera répétée tous les jours.
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as DayOfWeek[]).map((day) => {
                        const dayLabels = {
                          Monday: 'Lun',
                          Tuesday: 'Mar',
                          Wednesday: 'Mer',
                          Thursday: 'Jeu',
                          Friday: 'Ven'
                        }
                        const isSelected = selectedDays.includes(day)

                        return (
                          <Badge
                            key={day}
                            variant={isSelected ? 'default' : 'outline'}
                            className="cursor-pointer px-2.5 py-1 text-xs"
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
          <div className="lg:max-h-[calc(100vh-16rem)] lg:flex lg:flex-col">
            <h3 className="flex items-center gap-2 text-lg font-semibold mb-4">
              <ClipboardDocumentListIcon className="w-5 h-5" />
              Tâches assignées
            </h3>
            <div className="lg:overflow-y-auto lg:flex-1">
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
                <div className="divide-y divide-border">
                  {assignedTasks.map((assignedTask) => (
                    <div
                      key={assignedTask.id}
                      className="px-4 py-2.5 hover:bg-accent/50 transition-colors"
                    >
                      {editingTask === assignedTask.id ? (
                        // Edit mode
                        <div className="space-y-3">
                          <h4 className="font-medium">
                            {assignedTask.task_template?.name || 'Tâche supprimée'}
                          </h4>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs">
                                Horaire suggéré
                              </Label>
                              <div className="flex items-center gap-2">
                                <Select value={editHour} onValueChange={setEditHour}>
                                  <SelectTrigger className="w-24">
                                    <SelectValue placeholder="Heure" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                                      <SelectItem key={hour} value={hour.toString().padStart(2, '0')}>
                                        {hour.toString().padStart(2, '0')}h
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <span className="text-muted-foreground">:</span>
                                <Select value={editMinute} onValueChange={setEditMinute}>
                                  <SelectTrigger className="w-24">
                                    <SelectValue placeholder="Min" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map((min) => (
                                      <SelectItem key={min} value={min}>
                                        {min}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
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
                        <div className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">
                              {assignedTask.task_template?.name || 'Tâche supprimée'}
                            </h4>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {assignedTask.task_template?.task_category && (
                              <Badge variant="neutral" size="sm">
                                {assignedTask.task_template.task_category.name}
                              </Badge>
                            )}
                            {assignedTask.suggested_time && (
                              <Badge variant="outline" size="sm" className="gap-1">
                                <ClockIcon className="w-3 h-3" />
                                {assignedTask.suggested_time.slice(0, 5)}
                                {assignedTask.expected_duration && (
                                  <span className="text-muted-foreground">
                                    · {assignedTask.expected_duration}min
                                  </span>
                                )}
                              </Badge>
                            )}
                            {assignedTask.frequency?.days && assignedTask.frequency.days.length > 0 ? (
                              assignedTask.frequency.days.map((day) => {
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
                              })
                            ) : (
                              <Badge variant="secondary" size="sm">
                                Quotidien
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => startEditingTask(assignedTask)}
                              disabled={saving}
                              title="Modifier l'horaire"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleUnassign(assignedTask.id)}
                              disabled={saving}
                              title="Retirer la tâche"
                            >
                              <TrashIcon className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
