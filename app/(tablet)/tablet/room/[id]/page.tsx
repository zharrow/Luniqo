'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useRequireTabletAuth } from '@/lib/contexts/TabletAuthContext'
import { createClient } from '@/lib/supabase/client'
import { DailyCalendar } from '@/components/tablet/DailyCalendar'
import { TaskValidationModal } from '@/components/tablet/TaskValidationModal'
import type { CalendarTask } from '@/lib/services/calendar.service'

interface Room {
  id: string
  name: string
  description: string | null
}

interface TaskTemplate {
  id: string
  name: string
  description: string | null
  suggested_time?: string | null
  expected_duration?: number | null
}

interface AssignedTask {
  id: string
  room_id: string
  task_template_id: string
  task_template: TaskTemplate
  is_active: boolean
  suggested_time?: string | null
  expected_duration?: number | null
}

interface ValidatedTaskData {
  assignedTaskId: string
  note: string
  photo_urls: string[]
}

export default function TabletRoomPage() {
  const params = useParams()
  const roomId = params.id as string

  const [room, setRoom] = useState<Room | null>(null)
  const [tasks, setTasks] = useState<AssignedTask[]>([])
  const [validatedTasks, setValidatedTasks] = useState<ValidatedTaskData[]>([])
  const [selectedTask, setSelectedTask] = useState<AssignedTask | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const { session, isLoading: authLoading, logout } = useRequireTabletAuth()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (authLoading) {
      return
    }

    if (session) {
      loadRoomData()
    }
  }, [session, authLoading, roomId])

  async function loadRoomData() {
    try {
      if (!session?.user?.id || !session?.enterprise?.id) return

      // Check if user has access to this room
      const { data: access } = await supabase
        .from('employee_room_access')
        .select('room_id')
        .eq('employee_id', session.user.id)
        .eq('room_id', roomId)
        .single()

      if (!access) {
        setError('Vous n\'avez pas accès à cette pièce')
        setIsLoading(false)
        return
      }

      // Load room details
      const { data: roomData, error: roomError } = await supabase
        .from('room')
        .select('id, name, description')
        .eq('id', roomId)
        .eq('enterprise_id', session.enterprise.id)
        .single()

      if (roomError) throw roomError
      setRoom(roomData as unknown as Room)

      // Load assigned tasks for this room
      const { data: tasksData, error: tasksError } = await supabase
        .from('assigned_task')
        .select(`
          id,
          room_id,
          task_template_id,
          is_active,
          suggested_time,
          expected_duration,
          task_template:task_template_id (
            id,
            name,
            description
          )
        `)
        .eq('room_id', roomId)
        .eq('is_active', true)
        .order('task_template_id')

      if (tasksError) throw tasksError

      setTasks(tasksData as any[])

      // Load already validated tasks from today's session
      const today = new Date().toISOString().split('T')[0]
      const { data: sessionData } = await supabase
        .from('daily_cleaning_session')
        .select('id')
        .eq('enterprise_id', session.enterprise.id)
        .eq('date', today)
        .single()

      if (sessionData) {
        // Get task IDs for this room
        const roomTaskIds = (tasksData as any[]).map(t => t.id)

        // Load cleaning logs for this session and room
        const { data: logsData } = await supabase
          .from('task_completion')
          .select('assigned_task_id, note, photo_urls')
          .eq('session_id', (sessionData as any).id)
          .eq('performed_by_id', session.user.id)
          .in('assigned_task_id', roomTaskIds)

        if (logsData && logsData.length > 0) {
          // Convert to ValidatedTaskData format
          const validated: ValidatedTaskData[] = (logsData as any[]).map(log => ({
            assignedTaskId: log.assigned_task_id,
            note: log.note || '',
            photo_urls: log.photo_urls || []
          }))
          setValidatedTasks(validated)
        }
      }

    } catch (err: any) {
      console.error('Error loading room data:', err)
      setError('Erreur lors du chargement de la pièce')
    } finally {
      setIsLoading(false)
    }
  }

  function handleTaskClick(calendarTask: CalendarTask) {
    // Find the assigned task
    const task = tasks.find(t => t.id === calendarTask.assignedTaskId)
    if (task) {
      setSelectedTask(task)
      setIsModalOpen(true)
    }
  }

  async function handleValidateTask(data: { note: string; photo_urls: string[] }) {
    if (!selectedTask || !session?.user?.id || !session?.enterprise?.id) return

    try {
      // Get or create today's session
      const today = new Date().toISOString().split('T')[0]

      let { data: existingSession } = await supabase
        .from('daily_cleaning_session')
        .select('id')
        .eq('enterprise_id', session.enterprise.id)
        .eq('date', today)
        .single()

      let sessionId: string

      if (!existingSession) {
        // Create new session
        const { data: newSession, error: createError } = await (supabase
          .from('daily_cleaning_session')
          .insert({
            enterprise_id: session.enterprise.id,
            date: today,
            status: 'EN_COURS'
          } as any)
          .select('id')
          .single() as any)

        if (createError) throw createError
        sessionId = (newSession as any).id
      } else {
        sessionId = (existingSession as any).id
      }

      // Save task as cleaning log
      const { error: logError } = await (supabase
        .from('task_completion')
        .insert({
          session_id: sessionId,
          assigned_task_id: selectedTask.id,
          performed_by_id: session.user.id,
          recorded_by_id: session.user.id,
          status: 'FAIT',
          note: data.note || null,
          photo_urls: data.photo_urls.length > 0 ? data.photo_urls : null
        } as any) as any)

      if (logError) throw logError

      // Add to validated tasks
      setValidatedTasks(prev => [...prev, {
        assignedTaskId: selectedTask.id,
        note: data.note,
        photo_urls: data.photo_urls
      }])

      // Trigger calendar refresh
      setRefreshTrigger(prev => prev + 1)

      // Close modal
      setIsModalOpen(false)
      setSelectedTask(null)

    } catch (err: any) {
      console.error('Error saving task:', err)
      setError('Erreur lors de l\'enregistrement')
    }
  }

  function handleFinishSession() {
    if (validatedTasks.length === 0) {
      setError('Veuillez valider au moins une tâche avant de terminer')
      return
    }

    const params = new URLSearchParams({
      room: room?.name || '',
      completed: validatedTasks.length.toString(),
      total: tasks.length.toString()
    })
    router.push(`/tablet/room/validated?${params.toString()}`)
  }

  if (isLoading) {
    return (
      <div className="tablet-mode min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-secondary-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-24 w-24 border-8 border-primary-200 border-t-primary-500 mx-auto mb-6"></div>
          <p className="text-2xl text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }

  // Filter out validated tasks
  const remainingTasksCount = tasks.length - validatedTasks.length
  const progress = tasks.length > 0 ? Math.round((validatedTasks.length / tasks.length) * 100) : 0

  return (
    <div className="tablet-mode min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 p-8 pb-32">
      {/* Header */}
      <div className="flex justify-between items-center mb-12">
        <div className="flex items-center gap-6">
          <button
            onClick={() => router.push('/tablet/home')}
            className="btn btn-secondary px-6 py-4 text-xl"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-5xl font-bold mb-2" style={{ fontFamily: 'Quicksand, sans-serif' }}>
              {room?.name}
            </h1>
            {room?.description && (
              <p className="text-2xl text-muted-foreground">{room.description}</p>
            )}
          </div>
        </div>

        {/* Progress and Logout */}
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-5xl font-bold text-primary-500 mb-2">
              {progress}%
            </div>
            <p className="text-xl text-muted-foreground">
              {validatedTasks.length} / {tasks.length} tâches
            </p>
          </div>
          <button
            onClick={logout}
            className="px-6 py-4 text-xl rounded-xl font-semibold text-white bg-destructive hover:opacity-90 transition-opacity shadow-lg"
            title="Déconnexion"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="card p-6 mb-8 bg-danger-50 border-2 border-danger-200">
          <p className="text-xl text-danger-700">{error}</p>
        </div>
      )}

      {/* Progress Bar */}
      <div className="card p-6 mb-8">
        <div className="w-full h-8 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary-500 to-success-500 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Success message if all tasks are done */}
      {remainingTasksCount === 0 && tasks.length > 0 && (
        <div className="card p-8 mb-8 bg-success-50 border-2 border-success-500">
          <div className="flex items-center gap-4">
            <svg className="w-12 h-12 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-3xl font-bold text-success-700 mb-1">Toutes les tâches sont terminées !</h3>
              <p className="text-xl text-success-600">Vous pouvez maintenant terminer la session</p>
            </div>
          </div>
        </div>
      )}

      {/* Daily Calendar */}
      {session?.enterprise?.id && remainingTasksCount > 0 ? (
        <div className="mb-8">
          <DailyCalendar
            enterpriseId={session.enterprise.id}
            roomId={roomId}
            selectedTaskIds={validatedTasks.map(v => v.assignedTaskId)}
            onTaskClick={handleTaskClick}
            refreshTrigger={refreshTrigger}
          />
        </div>
      ) : remainingTasksCount === 0 && tasks.length > 0 ? (
        <div className="card p-12 text-center bg-white">
          <svg className="w-24 h-24 text-success-500 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-3xl font-bold text-gray-900 mb-2">Excellent travail !</p>
          <p className="text-xl text-muted-foreground">Toutes les tâches de cette pièce ont été validées</p>
        </div>
      ) : (
        <div className="card p-12 text-center">
          <svg className="w-24 h-24 text-muted-foreground/30 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-2xl text-muted-foreground">Aucune tâche assignée à cette pièce</p>
        </div>
      )}

      {/* Task Validation Modal */}
      {selectedTask && (
        <TaskValidationModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setSelectedTask(null)
          }}
          onValidate={handleValidateTask}
          taskName={selectedTask.task_template.name}
          taskDescription={selectedTask.task_template.description}
          suggestedTime={selectedTask.suggested_time || selectedTask.task_template.suggested_time}
          expectedDuration={selectedTask.expected_duration || selectedTask.task_template.expected_duration}
        />
      )}

      {/* Bottom Buttons */}
      {tasks.length > 0 && (
        <div className="fixed bottom-8 left-0 right-0 px-8">
          <div className="max-w-7xl mx-auto flex gap-4">
            {/* View Validated Tasks Button */}
            {validatedTasks.length > 0 && (
              <button
                onClick={() => router.push(`/tablet/room/${roomId}/validated`)}
                className="flex-1 btn btn-secondary h-24 text-2xl font-bold shadow-2xl"
              >
                <svg className="w-8 h-8 mr-3 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Voir les tâches validées ({validatedTasks.length})
              </button>
            )}

            {/* Finish Session Button */}
            <button
              onClick={handleFinishSession}
              disabled={validatedTasks.length === 0}
              className="flex-1 h-24 text-2xl font-bold shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl !bg-green-600 hover:!bg-green-700 text-white transition-colors"
            >
              <svg className="w-8 h-8 mr-3 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Terminer la session
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
