'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useRequireTabletAuth } from '@/lib/contexts/TabletAuthContext'
import { createClient } from '@/lib/supabase/client'

interface Room {
  id: string
  name: string
}

interface TaskTemplate {
  id: string
  name: string
  description: string | null
}

interface AssignedTask {
  id: string
  task_template: TaskTemplate
  suggested_time?: string | null
  expected_duration?: number | null
}

interface CleaningLog {
  id: string
  assigned_task_id: string
  status: string
  note: string | null
  photo_urls: string[] | null
  created_at: string
  assigned_task: AssignedTask
}

export default function ValidatedTasksPage() {
  const params = useParams()
  const roomId = params.id as string

  const [room, setRoom] = useState<Room | null>(null)
  const [validatedTasks, setValidatedTasks] = useState<CleaningLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedPhotos, setSelectedPhotos] = useState<string[] | null>(null)

  const { session, isLoading: authLoading } = useRequireTabletAuth()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (authLoading) {
      return
    }

    if (session) {
      loadValidatedTasks()
    }
  }, [session, authLoading, roomId])

  async function loadValidatedTasks() {
    try {
      if (!session?.user?.id || !session?.enterprise?.id) return

      // Load room details
      const { data: roomData, error: roomError } = await supabase
        .from('room')
        .select('id, name')
        .eq('id', roomId)
        .eq('enterprise_id', session.enterprise.id)
        .single()

      if (roomError) throw roomError
      setRoom(roomData as unknown as Room)

      // Get today's session
      const today = new Date().toISOString().split('T')[0]
      const { data: sessionData } = await supabase
        .from('cleaning_session')
        .select('id')
        .eq('enterprise_id', session.enterprise.id)
        .eq('date', today)
        .single()

      if (!sessionData) {
        setValidatedTasks([])
        setIsLoading(false)
        return
      }

      // Load validated tasks (cleaning logs) for this session and room
      const { data: logsData, error: logsError } = await supabase
        .from('cleaning_log')
        .select(`
          id,
          assigned_task_id,
          status,
          note,
          photo_urls,
          created_at,
          assigned_task:assigned_task_id (
            id,
            suggested_time,
            expected_duration,
            task_template:task_template_id (
              id,
              name,
              description
            )
          )
        `)
        .eq('session_id', (sessionData as any)?.id || '')
        .eq('performed_by_id', session.user.id)
        .in('assigned_task_id',
          await supabase
            .from('assigned_task')
            .select('id')
            .eq('room_id', roomId)
            .then(res => (res.data as any[])?.map((t: any) => t.id) || [])
        )
        .order('created_at', { ascending: false })

      if (logsError) throw logsError

      setValidatedTasks(logsData as any[] || [])

    } catch (err: any) {
      console.error('Error loading validated tasks:', err)
      setError('Erreur lors du chargement des tâches validées')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleInvalidateTask(logId: string) {
    if (!window.confirm('Êtes-vous sûr de vouloir annuler la validation de cette tâche ?')) {
      return
    }

    try {
      const { error: deleteError } = await supabase
        .from('cleaning_log')
        .delete()
        .eq('id', logId)

      if (deleteError) throw deleteError

      // Remove from list
      setValidatedTasks(prev => prev.filter(t => t.id !== logId))

      // Show success message
      alert('La tâche a été invalidée avec succès')

    } catch (err: any) {
      console.error('Error invalidating task:', err)
      alert('Erreur lors de l\'invalidation de la tâche')
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

  return (
    <div className="tablet-mode min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 p-8 pb-32">
      {/* Header */}
      <div className="flex items-center gap-6 mb-12">
        <button
          onClick={() => router.push(`/tablet/room/${roomId}`)}
          className="btn btn-secondary px-6 py-4 text-xl"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-5xl font-bold mb-2" style={{ fontFamily: 'Quicksand, sans-serif' }}>
            Tâches validées
          </h1>
          <p className="text-2xl text-muted-foreground">
            {room?.name} - {validatedTasks.length} tâche{validatedTasks.length > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="card p-6 mb-8 bg-danger-50 border-2 border-danger-200">
          <p className="text-xl text-danger-700">{error}</p>
        </div>
      )}

      {/* Validated Tasks List */}
      {validatedTasks.length > 0 ? (
        <div className="space-y-6 mb-8">
          {validatedTasks.map((log) => (
            <div
              key={log.id}
              className="card p-8 bg-white border-2 border-success-200"
            >
              {/* Task Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-3">
                    <svg className="w-10 h-10 text-success-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="text-3xl font-bold">
                      {log.assigned_task.task_template.name}
                    </h3>
                  </div>

                  {log.assigned_task.task_template.description && (
                    <p className="text-xl text-muted-foreground mb-4 ml-14">
                      {log.assigned_task.task_template.description}
                    </p>
                  )}

                  {/* Task metadata */}
                  <div className="flex flex-wrap items-center gap-4 ml-14">
                    {log.assigned_task.suggested_time && (
                      <div className="flex items-center gap-2 text-lg text-muted-foreground">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{log.assigned_task.suggested_time}</span>
                      </div>
                    )}
                    {log.assigned_task.expected_duration && (
                      <div className="flex items-center gap-2 text-lg text-muted-foreground">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span>{log.assigned_task.expected_duration} min</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-lg text-success-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Validée à {new Date(log.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>

                {/* Invalidate button */}
                <button
                  onClick={() => handleInvalidateTask(log.id)}
                  className="btn bg-danger-500 text-white hover:bg-danger-600 px-6 py-4 text-lg font-semibold"
                >
                  <svg className="w-6 h-6 mr-2 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Annuler
                </button>
              </div>

              {/* Note */}
              {log.note && (
                <div className="ml-14 mb-4">
                  <p className="text-lg font-medium mb-2">Commentaire :</p>
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-lg text-gray-700">{log.note}</p>
                  </div>
                </div>
              )}

              {/* Photos */}
              {log.photo_urls && log.photo_urls.length > 0 && (
                <div className="ml-14">
                  <p className="text-lg font-medium mb-3">Photos ({log.photo_urls.length}) :</p>
                  <div className="grid grid-cols-3 gap-4">
                    {log.photo_urls.map((url, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedPhotos(log.photo_urls)}
                        className="aspect-square rounded-xl overflow-hidden border-2 border-gray-200 hover:border-primary-400 transition-colors"
                      >
                        <img
                          src={url}
                          alt={`Photo ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <svg className="w-24 h-24 text-muted-foreground/30 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-2xl text-muted-foreground">Aucune tâche validée pour le moment</p>
        </div>
      )}

      {/* Photo Viewer Modal */}
      {selectedPhotos && (
        <>
          <div
            className="fixed inset-0 bg-black/80 z-40"
            onClick={() => setSelectedPhotos(null)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-8">
            <div className="bg-white rounded-3xl p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-3xl font-bold">Photos ({selectedPhotos.length})</h3>
                <button
                  onClick={() => setSelectedPhotos(null)}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {selectedPhotos.map((url, index) => (
                  <div key={index} className="rounded-2xl overflow-hidden border-2 border-gray-200">
                    <img
                      src={url}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-auto"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Back Button */}
      <div className="fixed bottom-8 left-0 right-0 px-8">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => router.push(`/tablet/room/${roomId}`)}
            className="btn bg-primary-500 text-white hover:bg-primary-600 w-full h-24 text-3xl font-bold shadow-2xl"
          >
            <svg className="w-8 h-8 mr-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Retour aux tâches
          </button>
        </div>
      </div>
    </div>
  )
}
