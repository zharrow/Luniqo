'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/contexts/AuthContext'
import { messagingService, type Conversation } from '@/lib/services/messaging.service'

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const { session } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!session?.user?.id) return

    loadConversations()

    // Subscribe to new messages for real-time updates
    const channel = messagingService.subscribeToNotifications(
      session.role as 'Admin' | 'Developer',
      session.user.id,
      () => {
        // Reload conversations when new message arrives
        loadConversations()
      }
    )

    return () => {
      messagingService.unsubscribe(channel)
    }
  }, [session])

  async function loadConversations() {
    if (!session?.user?.id || !session.role) return

    try {
      setIsLoading(true)
      const data = await messagingService.getConversations(
        session.user.id,
        session.role as 'Developer' | 'Admin'
      )
      setConversations(data)
    } catch (err: any) {
      console.error('Error loading conversations:', err)
      setError('Erreur lors du chargement des conversations')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCreateConversation() {
    if (!session?.user?.id || session.role !== 'Admin') return

    try {
      // For demo, use a fixed developer ID
      // In production, you'd have a list of developers to choose from
      const developerId = prompt('Developer ID:')
      if (!developerId) return

      const conversation = await messagingService.getOrCreateConversation(
        session.user.id,
        developerId
      )

      router.push(`/dashboard/messages/${conversation.id}`)
    } catch (err: any) {
      console.error('Error creating conversation:', err)
      setError('Erreur lors de la création de la conversation')
    }
  }

  function formatDate(date: string | null): string {
    if (!date) return 'Aucun message'

    const d = new Date(date)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'À l\'instant'
    if (diffMins < 60) return `Il y a ${diffMins} min`
    if (diffHours < 24) return `Il y a ${diffHours}h`
    if (diffDays < 7) return `Il y a ${diffDays}j`

    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-200 border-t-primary-500 mx-auto mb-4"></div>
          <p className="text-neutral-600">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">Messages</h1>
          <p className="text-neutral-600">
            {session?.role === 'Admin'
              ? 'Communiquez avec le support'
              : 'Messages des administrateurs'}
          </p>
        </div>

        {session?.role === 'Admin' && (
          <button onClick={handleCreateConversation} className="btn btn-primary">
            <svg className="w-5 h-5 mr-2 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Nouvelle conversation
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="card p-4 mb-6 bg-danger-50 border-2 border-danger-200">
          <p className="text-danger-700">{error}</p>
        </div>
      )}

      {/* Conversations List */}
      {conversations.length === 0 ? (
        <div className="card p-12 text-center">
          <svg
            className="w-24 h-24 mx-auto mb-4 text-neutral-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <h2 className="text-2xl font-bold text-neutral-700 mb-2">Aucune conversation</h2>
          <p className="text-neutral-500 mb-6">
            {session?.role === 'Admin'
              ? 'Commencez une nouvelle conversation avec le support'
              : 'Aucun message pour le moment'}
          </p>
          {session?.role === 'Admin' && (
            <button onClick={handleCreateConversation} className="btn btn-primary">
              Nouvelle conversation
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {conversations.map((conversation) => {
            const otherParty =
              session?.role === 'Admin' ? conversation.developer : conversation.admin

            return (
              <button
                key={conversation.id}
                onClick={() => router.push(`/dashboard/messages/${conversation.id}`)}
                className="card p-6 hover:shadow-lg transition-all text-left group relative"
              >
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-xl flex-shrink-0">
                    {(() => {
                      if (otherParty && 'first_name' in otherParty && typeof otherParty.first_name === 'string') {
                        return otherParty.first_name[0]?.toUpperCase()
                      }
                      return otherParty?.email?.[0]?.toUpperCase() || '?'
                    })()}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-lg font-bold text-neutral-900 truncate">
                        {(() => {
                          if (otherParty && 'first_name' in otherParty && 'last_name' in otherParty) {
                            const admin = otherParty as { first_name?: string; last_name?: string; email: string }
                            if (admin.first_name && admin.last_name) {
                              return `${admin.first_name} ${admin.last_name}`
                            }
                          }
                          return otherParty?.email || 'Utilisateur inconnu'
                        })()}
                      </h3>
                      <span className="text-sm text-neutral-500 ml-2 flex-shrink-0">
                        {formatDate(conversation.last_message_at)}
                      </span>
                    </div>

                    {otherParty?.email && (
                      <p className="text-sm text-neutral-500 truncate">{otherParty.email}</p>
                    )}
                  </div>

                  {/* Unread Badge */}
                  {conversation.unread_count && conversation.unread_count > 0 && (
                    <div className="w-8 h-8 rounded-full bg-danger-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                    </div>
                  )}

                  {/* Arrow */}
                  <svg
                    className="w-6 h-6 text-neutral-400 group-hover:text-primary-500 group-hover:translate-x-1 transition-all flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
