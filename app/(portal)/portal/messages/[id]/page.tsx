'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  ChevronLeftIcon,
  PaperAirplaneIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline'

export default function ConversationDetailPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [guardianId, setGuardianId] = useState<string>('')
  const [conversationTitle, setConversationTitle] = useState('')
  const [employeeId, setEmployeeId] = useState<string>('')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  const conversationId = params.id as string

  useEffect(() => {
    loadConversation()
  }, [conversationId])

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadConversation() {
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

      // Load messages for this conversation
      // ConversationId could be employee ID or subject-based
      let query = supabase
        .from('parent_message')
        .select(`
          *,
          sender_guardian:sender_guardian_id (first_name, last_name),
          recipient_employee:recipient_employee_id (first_name, last_name),
          sender_employee:sender_employee_id (first_name, last_name)
        `)
        .or(`sender_guardian_id.eq.${(guardianUser as any).guardian_id},recipient_guardian_id.eq.${(guardianUser as any).guardian_id}`)
        .order('created_at', { ascending: true })

      // If conversationId is a UUID (employee ID)
      if (conversationId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        query = query.or(`sender_employee_id.eq.${conversationId},recipient_employee_id.eq.${conversationId}`)
        setEmployeeId(conversationId)
      }

      const { data: messagesData } = await query

      if (messagesData && messagesData.length > 0) {
        setMessages(messagesData)

        // Set conversation title
        const firstMsg = messagesData[0] as any
        const employee = firstMsg.sender_employee || firstMsg.recipient_employee
        if (employee) {
          setConversationTitle(`${employee.first_name} ${employee.last_name}`)
          setEmployeeId(firstMsg.sender_employee_id || firstMsg.recipient_employee_id)
        } else {
          setConversationTitle(firstMsg.subject || 'Conversation')
        }

        // Mark messages as read
        const unreadIds = messagesData
          .filter((m: any) => m.recipient_guardian_id === (guardianUser as any).guardian_id && !m.is_read)
          .map((m: any) => m.id)

        if (unreadIds.length > 0) {
          await (supabase as any)
            .from('parent_message')
            .update({ is_read: true })
            .in('id', unreadIds)
        }
      }

      setIsLoading(false)
    } catch (error) {
      console.error('Failed to load conversation:', error)
      setIsLoading(false)
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault()

    if (!newMessage.trim() || !guardianId) return

    setIsSubmitting(true)

    try {
      const { data, error } = await (supabase as any)
        .from('parent_message')
        .insert({
          sender_guardian_id: guardianId,
          recipient_employee_id: employeeId || null,
          message_text: newMessage.trim(),
          category: 'general',
          subject: messages[0]?.subject || null
        })
        .select(`
          *,
          sender_guardian:sender_guardian_id (first_name, last_name),
          recipient_employee:recipient_employee_id (first_name, last_name)
        `)
        .single()

      if (error) throw error

      if (data) {
        setMessages([...messages, data])
        setNewMessage('')
      }
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsSubmitting(false)
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
    <div className="flex flex-col h-[calc(100vh-180px)]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push('/portal/messages')}
          className="text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ChevronLeftIcon className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{conversationTitle}</h1>
          <p className="text-sm text-gray-500">Conversation</p>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 bg-white rounded-2xl border border-gray-200 p-4 overflow-y-auto mb-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Aucun message</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message: any) => (
              <MessageBubble
                key={message.id}
                message={message}
                isOwn={message.sender_guardian_id === guardianId}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex gap-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Votre message..."
            className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5a9dc9]/20 focus:border-[#5a9dc9]"
            disabled={isSubmitting}
          />
          <button
            type="submit"
            disabled={isSubmitting || !newMessage.trim()}
            className="px-6 py-3 bg-gradient-to-r from-[#5a9dc9] to-[#2c5f7f] text-white rounded-xl hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PaperAirplaneIcon className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  )
}

function MessageBubble({ message, isOwn }: any) {
  const time = new Date(message.created_at).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  })

  const senderName = isOwn
    ? 'Vous'
    : message.sender_employee
    ? `${message.sender_employee.first_name} ${message.sender_employee.last_name}`
    : message.sender_guardian
    ? `${message.sender_guardian.first_name} ${message.sender_guardian.last_name}`
    : 'Inconnu'

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[75%] ${isOwn ? 'order-2' : 'order-1'}`}>
        <div className="flex items-end gap-2 mb-1">
          {!isOwn && (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#5a9dc9] to-[#2c5f7f] flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
              {senderName[0]}
            </div>
          )}
          <div className={`flex-1 ${isOwn ? 'text-right' : 'text-left'}`}>
            <p className="text-xs text-gray-500 mb-1">{senderName}</p>
            <div
              className={`inline-block px-4 py-3 rounded-2xl ${
                isOwn
                  ? 'bg-gradient-to-r from-[#5a9dc9] to-[#2c5f7f] text-white rounded-br-sm'
                  : 'bg-gray-100 text-gray-900 rounded-bl-sm'
              }`}
            >
              <p className="text-sm leading-relaxed whitespace-pre-line">{message.message_text}</p>
            </div>
            <p className="text-xs text-gray-400 mt-1">{time}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
