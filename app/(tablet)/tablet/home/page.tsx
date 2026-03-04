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
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

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

      // Get room details, filtered by selected nursery
      const { data: roomsData, error: roomsError } = await supabase
        .from('room')
        .select('*')
        .in('id', roomIds)
        .eq('nursery_id', session.selectedNursery.id)
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
    setShowLogoutConfirm(true)
  }

  function confirmLogout() {
    setShowLogoutConfirm(false)
    logout()
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
            onClick={() => router.push('/tablet/haccp/meals')}
            className="px-8 py-4 text-xl rounded-xl font-semibold text-white bg-[#4a8f5a] active:opacity-80 transition-opacity shadow-lg"
          >
            <svg className="w-6 h-6 mr-3 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Repas
          </button>
          <button
            onClick={() => router.push('/tablet/haccp/temperatures')}
            className="px-8 py-4 text-xl rounded-xl font-semibold text-white bg-[#e57c5a] active:opacity-80 transition-opacity shadow-lg"
          >
            <svg className="w-6 h-6 mr-3 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Températures
          </button>
          <button
            onClick={handleLogout}
            className="px-8 py-4 text-xl rounded-xl font-semibold text-white bg-destructive active:opacity-80 transition-opacity shadow-lg"
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
              className="relative rounded-3xl p-8 bg-white shadow-[0_16px_48px_-12px_rgba(90,157,201,0.25)] active:opacity-90 transition-opacity text-left group border border-[#5a9dc9]/20 overflow-hidden"
            >
              {/* Gradient pastel doux en fond */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#f8fbfd] to-white opacity-60"></div>

              <div className="relative z-10">
                {/* Room Icon avec animation */}
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-[#5a9dc9]/10 to-[#5a9dc9]/5 mb-6">
                  <svg
                    className="w-12 h-12 text-[#5a9dc9]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                    />
                  </svg>
                </div>

                {/* Room Name */}
                <h2 className="text-3xl font-bold mb-3 text-[#5a9dc9] tracking-tight">
                  {room.name}
                </h2>

                {/* Room Description */}
                {room.description && (
                  <p className="text-xl text-gray-600 mb-6">{room.description}</p>
                )}

                {/* Chevron animé */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-[#5a9dc9] text-xl font-semibold">
                    Accéder
                  </div>
                  <div className="w-10 h-10 rounded-full bg-[#5a9dc9]/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#5a9dc9]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
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

      {/* Nursery & Enterprise Info */}
      {session?.selectedNursery && (
        <div className="mt-12 text-center">
          <p className="text-xl text-muted-foreground">
            {session.selectedNursery.name} — {session.enterprise?.name}
          </p>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-3xl p-10 shadow-2xl max-w-md w-full mx-4 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-destructive/10 mb-6">
              <svg className="w-10 h-10 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold mb-3" style={{ fontFamily: 'Quicksand, sans-serif' }}>
              Se déconnecter ?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Êtes-vous sûr de vouloir vous déconnecter de la tablette ?
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 px-6 py-4 text-xl rounded-xl font-semibold border-2 border-gray-200 text-gray-700 bg-gray-50 active:opacity-80 transition-opacity"
              >
                Annuler
              </button>
              <button
                onClick={confirmLogout}
                className="flex-1 px-6 py-4 text-xl rounded-xl font-semibold text-white bg-destructive active:opacity-80 transition-opacity"
              >
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
