'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
import { parentMessagingService, type ParentMessage } from '@/lib/services/parent-messaging.service'
import {
  ChatBubbleLeftRightIcon,
  ExclamationTriangleIcon,
  EnvelopeIcon,
  EnvelopeOpenIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { PageBreadcrumb } from '@/components/shared/PageBreadcrumb'

export default function PortalMessagesPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const { selectedNursery } = useNursery()
  const router = useRouter()

  const [messages, setMessages] = useState<any[]>([])
  const [selectedMessage, setSelectedMessage] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (selectedNursery?.id) {
      loadMessages()
    } else if (!authLoading && !selectedNursery) {
      setLoading(false)
    }
  }, [selectedNursery?.id, authLoading])

  async function loadMessages() {
    if (!selectedNursery?.id) return

    try {
      setLoading(true)
      const messagesData = await parentMessagingService.getNurseryMessages(selectedNursery.id)
      setMessages(messagesData)
    } catch (error) {
      console.error('Error loading messages:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSelectMessage(message: any) {
    setSelectedMessage(message)
    setReplyText('')

    // Mark as read if not already
    if (!message.is_read && message.recipient_employee_id) {
      try {
        await parentMessagingService.markAsRead(message.id)
        await loadMessages()
      } catch (error) {
        console.error('Error marking message as read:', error)
      }
    }
  }

  async function handleSendReply() {
    if (!selectedMessage || !replyText.trim() || !session?.user?.id || !selectedNursery?.id) return

    try {
      setSending(true)

      await parentMessagingService.sendMessage({
        nursery_id: selectedNursery.id,
        family_id: selectedMessage.family_id,
        sender_employee_id: session.user.id,
        recipient_guardian_id: selectedMessage.sender_guardian_id,
        subject: `RE: ${selectedMessage.subject || 'Message'}`,
        content: replyText,
        category: selectedMessage.category,
        reply_to_message_id: selectedMessage.id
      })

      setReplyText('')
      await loadMessages()
      alert('Réponse envoyée avec succès !')
    } catch (error) {
      console.error('Error sending reply:', error)
      alert('Erreur lors de l\'envoi de la réponse')
    } finally {
      setSending(false)
    }
  }

  // Filter messages
  const filteredMessages = messages.filter(message => {
    const matchesSearch = searchTerm === '' ||
      message.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.family?.name?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'unread' && !message.is_read && message.recipient_employee_id) ||
      (filterStatus === 'read' && (message.is_read || !message.recipient_employee_id))

    const matchesCategory = filterCategory === 'all' || message.category === filterCategory

    return matchesSearch && matchesStatus && matchesCategory
  })

  function formatDate(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  function getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      general: 'Général',
      absence_notification: 'Absence',
      urgent: 'Urgent',
      administrative: 'Administratif'
    }
    return labels[category] || category
  }

  function getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
      general: 'bg-blue-100 text-blue-800 border-blue-300',
      absence_notification: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      urgent: 'bg-red-100 text-red-800 border-red-300',
      administrative: 'bg-purple-100 text-purple-800 border-purple-300'
    }
    return colors[category] || 'bg-gray-100 text-gray-800 border-gray-300'
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Chargement des messages...</p>
        </div>
      </div>
    )
  }

  if (!selectedNursery) {
    return (
      <div className="p-6">
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <p className="text-yellow-800">Veuillez sélectionner une crèche.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const unreadCount = messages.filter(m => !m.is_read && m.recipient_employee_id).length
  const urgentCount = messages.filter(m => !m.is_read && m.category === 'urgent' && m.recipient_employee_id).length

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <PageBreadcrumb
          items={[
            { label: 'Accueil', href: '/owner/dashboard' },
            { label: 'Portail Parents', href: '/owner/portal' },
            { label: 'Messagerie' }
          ]}
        />
        <div className="mt-4">
          <h1 className="text-3xl font-bold text-gray-900">Messagerie Parents</h1>
          <p className="mt-2 text-gray-600">
            Communication avec les familles via le portail parents
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Messages</p>
                <p className="text-2xl font-bold text-gray-900">{messages.length}</p>
              </div>
              <ChatBubbleLeftRightIcon className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Non Lus</p>
                <p className="text-2xl font-bold text-pink-900">{unreadCount}</p>
              </div>
              <EnvelopeIcon className="h-8 w-8 text-pink-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Urgents</p>
                <p className="text-2xl font-bold text-red-900">{urgentCount}</p>
              </div>
              <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="unread">Non lus</SelectItem>
                <SelectItem value="read">Lus</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les catégories</SelectItem>
                <SelectItem value="general">Général</SelectItem>
                <SelectItem value="absence_notification">Absence</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="administrative">Administratif</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Messages Layout (2 columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Messages List */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">
            Messages ({filteredMessages.length})
          </h2>

          {filteredMessages.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center py-12">
                <ChatBubbleLeftRightIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Aucun message trouvé</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredMessages.map(message => (
                <Card
                  key={message.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedMessage?.id === message.id ? 'ring-2 ring-blue-500' : ''
                  } ${!message.is_read && message.recipient_employee_id ? 'bg-blue-50' : ''}`}
                  onClick={() => handleSelectMessage(message)}
                >
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className={getCategoryColor(message.category)}>
                            {getCategoryLabel(message.category)}
                          </Badge>
                          {!message.is_read && message.recipient_employee_id && (
                            <EnvelopeIcon className="h-4 w-4 text-blue-600" />
                          )}
                          {message.is_read && (
                            <EnvelopeOpenIcon className="h-4 w-4 text-gray-400" />
                          )}
                        </div>

                        <p className="font-semibold text-gray-900 truncate">
                          {message.sender_guardian?.first_name} {message.sender_guardian?.last_name}
                        </p>

                        {message.family && (
                          <p className="text-xs text-gray-500">
                            Famille: {message.family.name}
                          </p>
                        )}

                        {message.subject && (
                          <p className="text-sm text-gray-700 mt-1 truncate font-medium">
                            {message.subject}
                          </p>
                        )}

                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {message.content}
                        </p>

                        <p className="text-xs text-gray-500 mt-2">
                          {formatDate(message.created_at)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Message Detail & Reply */}
        <div>
          {selectedMessage ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Détail du message</span>
                  <Badge variant="outline" className={getCategoryColor(selectedMessage.category)}>
                    {getCategoryLabel(selectedMessage.category)}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">De:</p>
                  <p className="font-semibold text-gray-900">
                    {selectedMessage.sender_guardian?.first_name} {selectedMessage.sender_guardian?.last_name}
                  </p>
                  <p className="text-sm text-gray-600">
                    Famille: {selectedMessage.family?.name}
                  </p>
                </div>

                {selectedMessage.subject && (
                  <div>
                    <p className="text-sm text-gray-600">Sujet:</p>
                    <p className="font-medium text-gray-900">{selectedMessage.subject}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm text-gray-600 mb-2">Message:</p>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-900 whitespace-pre-wrap">{selectedMessage.content}</p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm font-semibold text-gray-900 mb-2">Répondre:</p>
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Tapez votre réponse..."
                    rows={5}
                    className="mb-3"
                  />
                  <Button
                    onClick={handleSendReply}
                    disabled={!replyText.trim() || sending}
                    className="w-full"
                  >
                    {sending ? 'Envoi...' : 'Envoyer la réponse'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center py-12">
                <ChatBubbleLeftRightIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Sélectionnez un message pour le voir en détail</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
