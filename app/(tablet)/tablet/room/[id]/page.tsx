'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/lib/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import PhotoUpload from '@/components/shared/PhotoUpload'

interface Room {
  id: string
  name: string
  description: string | null
}

interface TaskTemplate {
  id: string
  name: string
  description: string | null
  task_type: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'OCCASIONAL'
}

interface AssignedTask {
  id: string
  room_id: string
  task_template_id: string
  task_template: TaskTemplate
  is_active: boolean
}

interface TaskStatus {
  task_id: string
  completed: boolean
  note: string
  photo_urls: string[]
}

export default function TabletRoomPage() {
  const params = useParams()
  const roomId = params.id as string

  const [room, setRoom] = useState<Room | null>(null)
  const [tasks, setTasks] = useState<AssignedTask[]>([])
  const [taskStatuses, setTaskStatuses] = useState<Record<string, TaskStatus>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const { session } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (!session || session.role !== 'User') {
      router.push('/tablet/login')
      return
    }

    loadRoomData()
  }, [session, roomId])

  async function loadRoomData() {
    try {
      if (!session?.user?.id || !session?.enterprise?.id) return

      // Check if user has access to this room
      const { data: access } = await supabase
        .from('user_rooms')
        .select('room_id')
        .eq('user_id', session.user.id)
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
          task_template:task_template_id (
            id,
            name,
            description,
            task_type
          )
        `)
        .eq('room_id', roomId)
        .eq('is_active', true)
        .order('task_template_id')

      if (tasksError) throw tasksError

      setTasks(tasksData as any[])

      // Initialize task statuses
      const initialStatuses: Record<string, TaskStatus> = {}
      tasksData?.forEach((task: any) => {
        initialStatuses[task.id] = {
          task_id: task.id,
          completed: false,
          note: '',
          photo_urls: []
        }
      })
      setTaskStatuses(initialStatuses)

    } catch (err: any) {
      console.error('Error loading room data:', err)
      setError('Erreur lors du chargement de la pièce')
    } finally {
      setIsLoading(false)
    }
  }

  function toggleTaskCompletion(taskId: string) {
    setTaskStatuses(prev => ({
      ...prev,
      [taskId]: {
        ...prev[taskId],
        completed: !prev[taskId].completed
      }
    }))
  }

  function updateTaskNote(taskId: string, note: string) {
    setTaskStatuses(prev => ({
      ...prev,
      [taskId]: {
        ...prev[taskId],
        note
      }
    }))
  }

  function updateTaskPhotos(taskId: string, photo_urls: string[]) {
    setTaskStatuses(prev => ({
      ...prev,
      [taskId]: {
        ...prev[taskId],
        photo_urls
      }
    }))
  }

  async function handleValidate() {
    if (!session?.user?.id || !session?.enterprise?.id) return

    setIsSaving(true)
    setError('')

    try {
      // Get or create today's session
      const today = new Date().toISOString().split('T')[0]

      let { data: existingSession, error: sessionError } = await supabase
        .from('cleaning_session')
        .select('id')
        .eq('enterprise_id', session.enterprise.id)
        .eq('date', today)
        .single()

      let sessionId: string

      if (!existingSession) {
        // Create new session
        const { data: newSession, error: createError } = await supabase
          .from('cleaning_session')
          .insert({
            enterprise_id: session.enterprise.id,
            date: today,
            status: 'EN_COURS'
          })
          .select('id')
          .single()

        if (createError) throw createError
        sessionId = (newSession as any).id
      } else {
        sessionId = (existingSession as any).id
      }

      // Save completed tasks as cleaning logs
      const completedTasks = Object.values(taskStatuses).filter(t => t.completed)

      if (completedTasks.length === 0) {
        setError('Veuillez compléter au moins une tâche')
        setIsSaving(false)
        return
      }

      const logs = completedTasks.map(status => {
        const task = tasks.find(t => t.id === status.task_id)
        return {
          session_id: sessionId,
          room_id: roomId,
          task_template_id: task?.task_template_id,
          performed_by_id: session.user.id,
          recorded_by_id: session.user.id,
          status: 'FAIT' as const,
          note: status.note || null,
          photo_urls: status.photo_urls.length > 0 ? status.photo_urls : null
        }
      })

      const { error: logsError } = await supabase
        .from('cleaning_log')
        .insert(logs)

      if (logsError) throw logsError

      // Success - redirect to success page with stats
      const params = new URLSearchParams({
        room: room?.name || '',
        completed: completedCount.toString(),
        total: totalCount.toString(),
        progress: progress.toString()
      })
      router.push(`/tablet/room/success?${params.toString()}`)

    } catch (err: any) {
      console.error('Error saving tasks:', err)
      setError('Erreur lors de l\'enregistrement')
    } finally {
      setIsSaving(false)
    }
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

  const completedCount = Object.values(taskStatuses).filter(t => t.completed).length
  const totalCount = tasks.length
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return (
    <div className="tablet-mode min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 p-8">
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

        {/* Progress */}
        <div className="text-right">
          <div className="text-5xl font-bold text-primary-500 mb-2">
            {progress}%
          </div>
          <p className="text-xl text-muted-foreground">
            {completedCount} / {totalCount} tâches
          </p>
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

      {/* Tasks List */}
      {tasks.length > 0 ? (
        <div className="space-y-6 mb-8">
          {tasks.map((task) => {
            const status = taskStatuses[task.id]
            const isCompleted = status?.completed

            return (
              <div
                key={task.id}
                className={`card p-8 transition-all duration-300 ${
                  isCompleted
                    ? 'bg-success-50 border-2 border-success-500'
                    : 'bg-white hover:shadow-lg'
                }`}
              >
                <div className="flex items-start gap-6">
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleTaskCompletion(task.id)}
                    className={`flex-shrink-0 w-16 h-16 rounded-2xl border-4 flex items-center justify-center transition-all ${
                      isCompleted
                        ? 'bg-success-500 border-success-600 scale-110'
                        : 'bg-card border-border hover:border-primary-500'
                    }`}
                  >
                    {isCompleted && (
                      <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>

                  {/* Task Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-3">
                      <h3 className="text-3xl font-bold">
                        {task.task_template.name}
                      </h3>
                      <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
                        task.task_template.task_type === 'DAILY' ? 'bg-primary-100 text-primary-700' :
                        task.task_template.task_type === 'WEEKLY' ? 'bg-secondary-100 text-secondary-700' :
                        task.task_template.task_type === 'MONTHLY' ? 'bg-warning-100 text-warning-700' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {task.task_template.task_type}
                      </span>
                    </div>

                    {task.task_template.description && (
                      <p className="text-xl text-muted-foreground mb-4">
                        {task.task_template.description}
                      </p>
                    )}

                    {/* Note Input & Photo Upload */}
                    {isCompleted && (
                      <div className="mt-4 space-y-6">
                        <div>
                          <label className="block text-lg font-medium mb-2">
                            Note (optionnel)
                          </label>
                          <textarea
                            value={status.note}
                            onChange={(e) => updateTaskNote(task.id, e.target.value)}
                            className="w-full px-4 py-3 text-lg rounded-xl border-2 border-border focus:outline-none focus:ring-4 focus:ring-primary-500 focus:border-transparent bg-background"
                            rows={3}
                            placeholder="Ajouter une remarque..."
                          />
                        </div>

                        <div>
                          <label className="block text-lg font-medium mb-3">
                            Photos (optionnel)
                          </label>
                          <PhotoUpload
                            onPhotosChange={(urls) => updateTaskPhotos(task.id, urls)}
                            maxPhotos={3}
                            existingPhotos={status.photo_urls}
                            tabletMode={true}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <svg className="w-24 h-24 text-muted-foreground/30 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-2xl text-muted-foreground">Aucune tâche assignée à cette pièce</p>
        </div>
      )}

      {/* Validate Button */}
      {tasks.length > 0 && (
        <div className="fixed bottom-8 left-0 right-0 px-8">
          <div className="max-w-7xl mx-auto">
            <button
              onClick={handleValidate}
              disabled={isSaving || completedCount === 0}
              className="btn bg-success-500 text-white hover:bg-success-600 w-full h-24 text-3xl font-bold shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <span className="flex items-center justify-center gap-3">
                  <svg className="animate-spin h-10 w-10" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Enregistrement...
                </span>
              ) : (
                <>
                  <svg className="w-10 h-10 mr-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Valider les tâches ({completedCount})
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
