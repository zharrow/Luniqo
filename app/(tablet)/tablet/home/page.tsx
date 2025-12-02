'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRequireTabletAuth } from '@/lib/contexts/TabletAuthContext'
import { createClient } from '@/lib/supabase/client'

interface Room {
  id: string
  name: string
  description: string | null
  image_key: string | null
  is_active: boolean
}

export default function TabletHomePage() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const { session, isLoading: authLoading, logout } = useRequireTabletAuth()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) {
      return
    }

    // useRequireTabletAuth handles redirect if no session
    if (session) {
      loadAccessibleRooms()
    }
  }, [session, authLoading])

  async function loadAccessibleRooms() {
    try {
      if (!session?.user?.id) return

      // Get rooms accessible by this user
      const { data: userRooms, error: urError } = await supabase
        .from('employee_room_access')
        .select('room_id')
        .eq('employee_id', session.user.id)

      if (urError) throw urError

      const roomIds = (userRooms as any[])?.map(ur => ur.room_id) || []

      if (roomIds.length === 0) {
        setError('Aucune pièce accessible. Contactez votre administrateur.')
        setIsLoading(false)
        return
      }

      // Get room details
      const { data: roomsData, error: roomsError } = await supabase
        .from('room')
        .select('*')
        .in('id', roomIds)
        .eq('is_active', true)
        .order('display_order', { ascending: true })

      if (roomsError) throw roomsError

      setRooms(roomsData as unknown as Room[])
    } catch (err: any) {
      console.error('Error loading rooms:', err)
      setError('Erreur lors du chargement des pièces')
    } finally {
      setIsLoading(false)
    }
  }

  function handleLogout() {
    logout() // Already redirects to /tablet/login
  }

  function handleRoomSelect(roomId: string) {
    router.push(`/tablet/room/${roomId}`)
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
    <div className="tablet-mode min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-5xl font-bold mb-2" style={{ fontFamily: 'Quicksand, sans-serif' }}>
            Bonjour {session?.user && 'first_name' in session.user ? session.user.first_name : session?.user?.email} !
          </h1>
          <p className="text-2xl text-muted-foreground">Sélectionnez une pièce pour commencer</p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => router.push('/tablet/haccp')}
            className="btn bg-success-500 text-white hover:bg-success-600 px-8 py-4 text-xl"
          >
            <svg className="w-6 h-6 mr-3 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            HACCP
          </button>
          <button
            onClick={handleLogout}
            className="btn bg-danger-500 text-white hover:bg-danger-600 px-8 py-4 text-xl"
          >
            <svg className="w-6 h-6 mr-3 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Déconnexion
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="card p-6 mb-8 bg-danger-50 border-2 border-danger-200">
          <p className="text-xl text-danger-700">{error}</p>
        </div>
      )}

      {/* Room Grid */}
      {rooms.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {rooms.map((room) => (
            <button
              key={room.id}
              onClick={() => handleRoomSelect(room.id)}
              className="card p-8 hover:shadow-2xl hover:scale-105 transition-all duration-300 text-left group"
            >
              {/* Room Icon */}
              <div className="w-24 h-24 rounded-2xl bg-primary-100 flex items-center justify-center mb-6 group-hover:bg-primary-500 transition-colors">
                <svg
                  className="w-12 h-12 text-primary-500 group-hover:text-white transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
              </div>

              {/* Room Name */}
              <h2 className="text-3xl font-bold mb-3 group-hover:text-primary-500 transition-colors">
                {room.name}
              </h2>

              {/* Room Description */}
              {room.description && (
                <p className="text-xl text-muted-foreground mb-6">{room.description}</p>
              )}

              {/* Action Arrow */}
              <div className="flex items-center text-primary-500 text-xl font-semibold group-hover:translate-x-2 transition-transform">
                Accéder
                <svg className="w-6 h-6 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <svg className="w-24 h-24 text-muted-foreground/30 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <p className="text-2xl text-muted-foreground">Aucune pièce disponible</p>
        </div>
      )}

      {/* Enterprise Info */}
      {session?.enterprise && (
        <div className="mt-12 text-center">
          <p className="text-xl text-muted-foreground">
            {session.enterprise.name}
          </p>
        </div>
      )}
    </div>
  )
}
