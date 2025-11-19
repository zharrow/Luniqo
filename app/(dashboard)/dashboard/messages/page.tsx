'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/contexts/AuthContext'
import { messagingService, type Conversation } from '@/lib/services/messaging.service'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { SparklesText } from '@/components/ui/sparkles-text'
import { CountBadge } from '@/components/ui/Badge'
import { PlusIcon, ChatBubbleLeftRightIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

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
          <SparklesText
            className="text-3xl font-bold mb-2"
            colors={{ first: '#a855f7', second: '#06b6d4' }}
          >
            Messages
          </SparklesText>
          <p className="text-muted-foreground">
            {session?.role === 'Admin'
              ? 'Communiquez avec le support'
              : 'Messages des administrateurs'}
          </p>
        </div>

        {session?.role === 'Admin' && (
          <Button onClick={handleCreateConversation} className="inline-flex items-center gap-2">
            <PlusIcon className="w-5 h-5" />
            Nouvelle conversation
          </Button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <Card className="p-4 mb-6 bg-destructive/10 border-destructive/20">
          <p className="text-destructive">{error}</p>
        </Card>
      )}

      {/* Conversations List */}
      {conversations.length === 0 ? (
        <Card className="p-12 text-center">
          <ChatBubbleLeftRightIcon className="w-24 h-24 mx-auto mb-4 text-muted-foreground/30" />
          <h2 className="text-2xl font-bold mb-2">Aucune conversation</h2>
          <p className="text-muted-foreground mb-6">
            {session?.role === 'Admin'
              ? 'Commencez une nouvelle conversation avec le support'
              : 'Aucun message pour le moment'}
          </p>
          {session?.role === 'Admin' && (
            <Button onClick={handleCreateConversation}>
              Nouvelle conversation
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-4">
          {conversations.map((conversation) => {
            const otherParty =
              session?.role === 'Admin' ? conversation.developer : conversation.admin

            return (
              <Card
                key={conversation.id}
                className="hover:shadow-lg transition-all cursor-pointer group"
                onClick={() => router.push(`/dashboard/messages/${conversation.id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <Avatar className="h-14 w-14 flex-shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl">
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
                        <h3 className="text-lg font-bold truncate">
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

                    {/* Arrow */}
                    <ChevronRightIcon className="w-6 h-6 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
