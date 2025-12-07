'use client'

import { use, useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/contexts/AuthContext'
import { messagingService, type Conversation, type Message } from '@/lib/services/messaging.service'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function ConversationPage({ params }: PageProps) {
  const { id } = use(params)
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { session } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!session?.user?.id) return

    loadConversation()
    loadMessages()

    // Subscribe to real-time messages
    const channel = messagingService.subscribeToConversation(id, (message) => {
      setMessages((prev) => [...prev, message])
      scrollToBottom()

      // Mark as read if I'm the recipient
      if (message.recipient_id === session.user.id) {
        messagingService.markMessageAsRead(message.id)
      }
    })

    // Mark conversation as read when opening
    messagingService.markConversationAsRead(id, session.user.id)

    return () => {
      messagingService.unsubscribe(channel)
    }
  }, [id, session])

  async function loadConversation() {
    try {
      const data = await messagingService.getConversationById(id)
      setConversation(data)
    } catch (err: any) {
      console.error('Error loading conversation:', err)
      setError('Conversation introuvable')
    }
  }

  async function loadMessages() {
    try {
      setIsLoading(true)
      const data = await messagingService.getMessages(id)
      setMessages(data)
      scrollToBottom()
    } catch (err: any) {
      console.error('Error loading messages:', err)
      setError('Erreur lors du chargement des messages')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!newMessage.trim() || !session?.user?.id || !conversation) return

    const recipientType = session.role === 'Owner' ? 'Developer' : 'Owner'
    const recipientId =
      session.role === 'Owner' ? conversation.developer_id : conversation.owner_id

    try {
      setIsSending(true)
      await messagingService.sendMessage({
        conversation_id: id,
        sender_type: session.role as 'Developer' | 'Owner',
        sender_id: session.user.id,
        recipient_type: recipientType,
        recipient_id: recipientId,
        content: newMessage.trim()
      })

      setNewMessage('')
      scrollToBottom()
    } catch (err: any) {
      console.error('Error sending message:', err)
      setError('Erreur lors de l\'envoi du message')
    } finally {
      setIsSending(false)
    }
  }

  function scrollToBottom() {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  function formatMessageTime(date: string): string {
    const d = new Date(date)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const timeStr = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

    if (d.toDateString() === today.toDateString()) {
      return `Aujourd'hui à ${timeStr}`
    } else if (d.toDateString() === yesterday.toDateString()) {
      return `Hier à ${timeStr}`
    } else {
      return d.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-200 border-t-primary-500 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!conversation) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="card p-12 text-center">
          <p className="text-xl text-danger-600 mb-4">{error || 'Conversation introuvable'}</p>
          <button onClick={() => router.push('/dashboard/messages')} className="btn btn-secondary">
            Retour aux messages
          </button>
        </div>
      </div>
    )
  }

  const otherParty = session?.role === 'Owner' ? conversation.developer : conversation.owner

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="bg-card border-b border-border px-6 py-4">
        <div className="container mx-auto flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard/messages')}
            className="btn btn-secondary px-3 py-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-lg">
            {(() => {
              if (otherParty && 'first_name' in otherParty && typeof otherParty.first_name === 'string') {
                return otherParty.first_name[0]?.toUpperCase()
              }
              return otherParty?.email?.[0]?.toUpperCase() || '?'
            })()}
          </div>

          <div>
            <h1 className="text-xl font-bold">
              {(() => {
                if (otherParty && 'first_name' in otherParty && 'last_name' in otherParty) {
                  const owner = otherParty as { first_name?: string; last_name?: string; email: string }
                  if (owner.first_name && owner.last_name) {
                    return `${owner.first_name} ${owner.last_name}`
                  }
                }
                return otherParty?.email || 'Utilisateur inconnu'
              })()}
            </h1>
            {otherParty?.email && <p className="text-sm text-muted-foreground">{otherParty.email}</p>}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-danger-50 border-b-2 border-danger-200 px-6 py-3">
          <div className="container mx-auto">
            <p className="text-danger-700">{error}</p>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-muted px-6 py-6">
        <div className="container mx-auto max-w-4xl space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30"
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
              <p className="text-muted-foreground">Aucun message pour le moment</p>
              <p className="text-muted-foreground/60 text-sm mt-2">Envoyez le premier message ci-dessous</p>
            </div>
          ) : (
            messages.map((message) => {
              const isMe = message.sender_id === session?.user?.id
              return (
                <div key={message.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-lg px-4 py-3 rounded-2xl ${
                      isMe
                        ? 'bg-primary-500 text-white rounded-br-sm'
                        : 'bg-card rounded-bl-sm shadow-sm'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                    <div
                      className={`text-xs mt-2 flex items-center gap-2 ${
                        isMe ? 'text-primary-100 justify-end' : 'text-muted-foreground'
                      }`}
                    >
                      <span>{formatMessageTime(message.created_at)}</span>
                      {isMe && message.status === 'Read' && (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Input */}
      <div className="bg-card border-t border-border px-6 py-4">
        <div className="container mx-auto max-w-4xl">
          <form onSubmit={handleSendMessage} className="flex gap-3">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage(e)
                }
              }}
              placeholder="Écrivez votre message... (Entrée pour envoyer, Maj+Entrée pour nouvelle ligne)"
              className="flex-1 px-4 py-3 rounded-xl border-2 border-border focus:outline-none focus:ring-4 focus:ring-primary-500 resize-none bg-background"
              rows={3}
              disabled={isSending}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || isSending}
              className="btn btn-primary self-end px-6 disabled:opacity-50"
            >
              {isSending ? (
                <svg
                  className="animate-spin h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
