'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  ChatBubbleLeftRightIcon,
  ClockIcon,
  PlusIcon,
  UserCircleIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline'

export default function MessagesListPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [conversations, setConversations] = useState<any[]>([])
  const [guardianId, setGuardianId] = useState<string>('')
  const [showNewMessageModal, setShowNewMessageModal] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadConversations()
  }, [])

  async function loadConversations() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/portal/login')
        return
      }

      // Get guardian_user
      const { data: guardianUser } = await supabase
        .from('guardian_user')
        .select('guardian_id')
        .eq('user_id', user.id)
        .single()

      if (!guardianUser) {
        router.push('/portal/login')
        return
      }

      setGuardianId((guardianUser as any).guardian_id)

      // Load messages with conversation grouping
      // Group by combination of guardian + employee or guardian + subject
      const { data: messages } = await supabase
        .from('parent_message')
        .select(`
          *,
          sender_guardian:sender_guardian_id (first_name, last_name),
          recipient_employee:recipient_employee_id (first_name, last_name),
          sender_employee:sender_employee_id (first_name, last_name)
        `)
        .or(`sender_guardian_id.eq.${(guardianUser as any).guardian_id},recipient_guardian_id.eq.${(guardianUser as any).guardian_id}`)
        .order('created_at', { ascending: false })

      if (messages) {
        // Group messages by conversation (employee or subject)
        const conversationsMap = new Map()

        messages.forEach((msg: any) => {
          const employeeId = msg.sender_employee_id || msg.recipient_employee_id
          const key = employeeId || `subject_${msg.subject}`

          if (!conversationsMap.has(key)) {
            conversationsMap.set(key, {
              id: key,
              employee: msg.sender_employee || msg.recipient_employee,
              lastMessage: msg,
              messages: [msg],
              unreadCount: 0
            })
          } else {
            const conv = conversationsMap.get(key)
            conv.messages.push(msg)
          }
        })

        // Calculate unread counts
        conversationsMap.forEach(conv => {
          conv.unreadCount = conv.messages.filter((m: any) =>
            m.recipient_guardian_id === (guardianUser as any).guardian_id && !m.is_read
          ).length
        })

        setConversations(Array.from(conversationsMap.values()))
      }

      setIsLoading(false)
    } catch (error) {
      console.error('Failed to load conversations:', error)
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#5a9dc9]/20 border-t-[#5a9dc9] mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          <p className="text-gray-600 mt-1">
            Communiquez avec la crèche
          </p>
        </div>
        <button
          onClick={() => setShowNewMessageModal(true)}
          className="p-3 bg-gradient-to-r from-[#5a9dc9] to-[#2c5f7f] text-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300"
        >
          <PlusIcon className="w-6 h-6" />
        </button>
      </div>

      {/* Conversations List */}
      {conversations.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-200">
          <ChatBubbleLeftRightIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune conversation</h3>
          <p className="text-gray-600 mb-6">
            Commencez une nouvelle conversation avec la crèche
          </p>
          <button
            onClick={() => setShowNewMessageModal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#5a9dc9] to-[#2c5f7f] text-white rounded-xl hover:shadow-lg transition-all duration-300"
          >
            <PlusIcon className="w-5 h-5" />
            Nouveau message
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {conversations.map((conversation: any) => (
            <ConversationCard
              key={conversation.id}
              conversation={conversation}
              onClick={() => router.push(`/portal/messages/${conversation.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ConversationCard({ conversation, onClick }: any) {
  const lastMessage = conversation.lastMessage
  const timeAgo = getTimeAgo(lastMessage.created_at)
  const isUnread = conversation.unreadCount > 0

  return (
    <button
      onClick={onClick}
      className={`w-full bg-white rounded-2xl p-4 border transition-all duration-300 text-left ${
        isUnread
          ? 'border-[#5a9dc9] shadow-md'
          : 'border-gray-200 hover:border-[#5a9dc9] hover:shadow-md'
      }`}
    >
      <div className="flex gap-4">
        {/* Avatar */}
        {conversation.employee ? (
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#5a9dc9] to-[#2c5f7f] flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
            {conversation.employee.first_name?.[0]}{conversation.employee.last_name?.[0]}
          </div>
        ) : (
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center flex-shrink-0">
            <EnvelopeIcon className="w-7 h-7 text-white" />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div>
              <p className={`font-semibold ${isUnread ? 'text-gray-900' : 'text-gray-700'}`}>
                {conversation.employee
                  ? `${conversation.employee.first_name} ${conversation.employee.last_name}`
                  : lastMessage.subject || 'Conversation'}
              </p>
              {lastMessage.category && (
                <span className="text-xs text-gray-500 capitalize">
                  {getCategoryLabel(lastMessage.category)}
                </span>
              )}
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <ClockIcon className="w-3 h-3" />
                {timeAgo}
              </span>
              {isUnread && (
                <span className="px-2 py-0.5 bg-[#5a9dc9] text-white rounded-full text-xs font-medium">
                  {conversation.unreadCount}
                </span>
              )}
            </div>
          </div>

          <p className={`text-sm line-clamp-2 ${isUnread ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
            {lastMessage.message_text}
          </p>
        </div>
      </div>
    </button>
  )
}

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'maintenant'
  if (diffMins < 60) return `${diffMins}min`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}j`
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
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
