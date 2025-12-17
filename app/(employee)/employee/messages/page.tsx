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

export default function EmployeeMessagesPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Employee'])
  const router = useRouter()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!session?.user?.id) return

    loadConversations()

    // Subscribe to new messages for real-time updates
    const channel = messagingService.subscribeToNotifications(
      'Employee',
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
      // TODO: Implement employee messaging functionality
      // For now, employees don't have access to conversations
      setConversations([])
    } catch (err: any) {
      console.error('Error loading conversations:', err)
      setError('Erreur lors du chargement des conversations')
    } finally {
      setIsLoading(false)
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
      {/* Breadcrumb */}
      <PageBreadcrumb
        items={[
          { label: 'Dashboard', href: '/employee/dashboard' },
          { label: 'Messages' }
        ]}
      />

      {/* Header - Style organique turquoise (module communication) */}
      <div
        className="relative rounded-3xl p-6 mb-8 bg-white overflow-hidden"
        style={{
          border: '1px solid #64b5d133',
          background: 'linear-gradient(to bottom right, #f0fdff, white)'
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className="inline-flex items-center justify-center w-14 h-14 rounded-2xl"
              style={{ background: 'linear-gradient(to bottom right, #64b5d11A, #64b5d10D)' }}
            >
              <ChatBubbleLeftRightIcon className="w-7 h-7" style={{ color: '#2c8a99' }} strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-1 bg-gradient-to-r from-cyan-600 to-teal-700 bg-clip-text text-transparent">
                Messages
              </h1>
              <p className="text-muted-foreground">
                Communiquez avec votre équipe
              </p>
            </div>
          </div>
        </div>
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
            border: '1px solid #64b5d133',
            background: 'linear-gradient(to bottom right, #f0fdff, white)'
          }}
        >
          <ChatBubbleLeftRightIcon className="w-24 h-24 mx-auto mb-4" style={{ color: '#64b5d140' }} />
          <h2 className="text-2xl font-bold mb-2 text-gray-900">Aucune conversation</h2>
          <p className="text-muted-foreground">
            Aucun message pour le moment
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {conversations.map((conversation) => {
            const otherParty = conversation.owner

            return (
              <div
                key={conversation.id}
                className="relative rounded-3xl p-6 bg-white hover:-translate-y-1 transition-all duration-300 cursor-pointer group overflow-hidden"
                style={{
                  border: '1px solid #64b5d133',
                  boxShadow: '0 0 0 0 rgba(100,181,209,0.25)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 16px 48px -12px rgba(100,181,209,0.25)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 0 0 rgba(100,181,209,0.25)'
                }}
                onClick={() => router.push(`/employee/messages/${conversation.id}`)}
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
                        background: 'linear-gradient(to bottom right, #64b5d1, #4fc3d9)',
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
                    style={{ backgroundColor: '#64b5d114' }}
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
  )
}
