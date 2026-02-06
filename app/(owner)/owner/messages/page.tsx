'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { messagingService, type Conversation } from '@/lib/services/messaging.service'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { CountBadge } from '@/components/ui/badge'
import { PlusIcon, ChatBubbleLeftRightIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { PageBreadcrumb } from '@/components/shared/PageBreadcrumb'

export default function MessagesPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Owner', 'Developer'])
  const router = useRouter()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!session?.user?.id) return

    loadConversations()

    // Subscribe to new messages for real-time updates
    const channel = messagingService.subscribeToNotifications(
      session.role as 'Owner' | 'Developer',
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
        session.role as 'Developer' | 'Owner'
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
    if (!session?.user?.id || session.role !== 'Owner') return

    try {
      // Automatically creates a conversation with an available developer
      // No developer ID needed from the owner
      const conversation = await messagingService.getOrCreateSupportConversation(
        session.user.id
      )

      router.push(`/owner/messages/${conversation.id}`)
    } catch (err: any) {
      console.error('Error creating conversation:', err)
      setError(err.message || 'Erreur lors de la création de la conversation')
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

  if (authLoading || isLoading) {
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
          { label: 'Messages' }
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-cyan-100">
            <ChatBubbleLeftRightIcon className="w-6 h-6 text-cyan-600" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
            <p className="text-sm text-muted-foreground">
              {session?.role === 'Owner'
                ? 'Communiquez avec le support'
                : 'Messages des administrateurs'}
            </p>
          </div>
        </div>

        {session?.role === 'Owner' && (
          <Button onClick={handleCreateConversation}>
            <PlusIcon className="w-5 h-5 mr-2" />
            Nouvelle conversation
          </Button>
        )}
      </div>

      {/* Error Message - Style organique */}
      {error && (
        <div
          className="relative rounded-3xl p-4 mb-6 bg-white overflow-hidden"
          style={{
            border: '1px solid #f8717133',
            background: 'linear-gradient(to bottom right, #fef2f2, white)'
          }}
        >
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Conversations List */}
      {conversations.length === 0 ? (
        <div
          className="relative rounded-3xl p-12 bg-white overflow-hidden text-center"
          style={{
            border: '1px solid #80deea33',
            background: 'linear-gradient(to bottom right, #f0fdff, white)'
          }}
        >
          <ChatBubbleLeftRightIcon className="w-24 h-24 mx-auto mb-4" style={{ color: '#80deea40' }} />
          <h2 className="text-2xl font-bold mb-2 text-gray-900">Aucune conversation</h2>
          <p className="text-muted-foreground mb-6">
            {session?.role === 'Owner'
              ? 'Commencez une nouvelle conversation avec le support'
              : 'Aucun message pour le moment'}
          </p>
          {session?.role === 'Owner' && (
            <Button
              onClick={handleCreateConversation}
              className="bg-gradient-to-br from-cyan-500 to-teal-600 hover:from-cyan-600 hover:to-teal-700 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
            >
              Nouvelle conversation
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {conversations.map((conversation) => {
            const otherParty =
              session?.role === 'Owner' ? conversation.developer : conversation.owner

            return (
              <div
                key={conversation.id}
                className="relative rounded-3xl p-6 bg-white hover:-translate-y-1 transition-all duration-300 cursor-pointer group overflow-hidden"
                style={{
                  border: '1px solid #80deea33',
                  boxShadow: '0 0 0 0 rgba(128,222,234,0.25)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 16px 48px -12px rgba(128,222,234,0.25)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 0 0 rgba(128,222,234,0.25)'
                }}
                onClick={() => router.push(`/owner/messages/${conversation.id}`)}
              >
                {/* Gradient fond */}
                <div
                  className="absolute inset-0 opacity-60"
                  style={{ background: 'linear-gradient(to bottom right, #f0fdff, white)' }}
                />

                <div className="relative z-10 flex items-center gap-4">
                  {/* Avatar */}
                  <Avatar className="h-14 w-14 flex-shrink-0 border-2 border-cyan-100 shadow-md">
                    <AvatarFallback
                      className="font-bold text-xl"
                      style={{
                        background: 'linear-gradient(to bottom right, #80deea, #4fc3d9)',
                        color: 'white'
                      }}
                    >
                      {(() => {
                        if (otherParty && 'first_name' in otherParty && typeof otherParty.first_name === 'string') {
                          return otherParty.first_name[0]?.toUpperCase()
                        }
                        return otherParty?.email?.[0]?.toUpperCase() || '?'
                      })()}
                    </AvatarFallback>
                  </Avatar>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-lg font-bold truncate text-gray-900">
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
                      <span className="text-sm text-muted-foreground ml-2 flex-shrink-0">
                        {formatDate(conversation.last_message_at)}
                      </span>
                    </div>

                    {otherParty?.email && (
                      <p className="text-sm text-muted-foreground truncate">{otherParty.email}</p>
                    )}
                  </div>

                  {/* Unread Badge */}
                  {conversation.unread_count && conversation.unread_count > 0 && (
                    <div className="flex-shrink-0">
                      <CountBadge count={conversation.unread_count} />
                    </div>
                  )}

                  {/* Chevron */}
                  <div
                    className="ml-2 w-8 h-8 rounded-full flex items-center justify-center opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 flex-shrink-0"
                    style={{ backgroundColor: '#80deea14' }}
                  >
                    <ChevronRightIcon className="w-4 h-4" style={{ color: '#2c8a99' }} strokeWidth={2} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      </div>
    </div>
  )
}
