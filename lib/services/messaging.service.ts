import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export interface Conversation {
  id: string
  admin_id: string
  developer_id: string
  last_message_at: string | null
  created_at: string
  updated_at: string
  admin?: {
    id: string
    email: string
    first_name: string
    last_name: string
  }
  developer?: {
    id: string
    email: string
  }
  unread_count?: number
}

export interface Message {
  id: string
  conversation_id: string
  sender_type: 'Developer' | 'Admin' | 'User'
  sender_id: string
  recipient_type: 'Developer' | 'Admin' | 'User'
  recipient_id: string
  content: string
  status: 'Sent' | 'Delivered' | 'Read'
  created_at: string
  read_at: string | null
}

export interface Notification {
  id: string
  enterprise_id: string | null
  recipient_type: 'Developer' | 'Admin' | 'User'
  recipient_id: string | null
  title: string
  content: string
  type: string | null
  priority: 'Info' | 'Warning' | 'Critical'
  status: 'Unread' | 'Read' | 'Archived'
  resource_type: string | null
  resource_id: string | null
  created_at: string
  read_at: string | null
}

class MessagingService {
  // ============================================================================
  // CONVERSATIONS
  // ============================================================================

  async getConversations(userId: string, userType: 'Developer' | 'Admin'): Promise<Conversation[]> {
    const field = userType === 'Developer' ? 'developer_id' : 'admin_id'
    const otherField = userType === 'Developer' ? 'admin' : 'developer'

    const { data, error } = await supabase
      .from('conversation')
      .select(`
        *,
        ${otherField}!${field === 'developer_id' ? 'developer_id' : 'admin_id'}(id, email, first_name, last_name)
      `)
      .eq(field, userId)
      .order('last_message_at', { ascending: false, nullsFirst: false })

    if (error) {
      console.error('Error fetching conversations:', error)
      throw error
    }

    // Get unread count for each conversation
    const conversationsWithUnread = await Promise.all(
      (data || []).map(async (conv) => {
        const { count } = await supabase
          .from('message')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .eq('recipient_id', userId)
          .eq('status', 'Sent')

        return {
          ...conv,
          unread_count: count || 0
        }
      })
    )

    return conversationsWithUnread
  }

  async getOrCreateConversation(adminId: string, developerId: string): Promise<Conversation> {
    // Try to find existing conversation
    const { data: existing, error: findError } = await supabase
      .from('conversation')
      .select('*')
      .eq('admin_id', adminId)
      .eq('developer_id', developerId)
      .single()

    if (existing && !findError) {
      return existing
    }

    // Create new conversation
    const { data, error } = await supabase
      .from('conversation')
      .insert({
        admin_id: adminId,
        developer_id: developerId
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating conversation:', error)
      throw error
    }

    return data
  }

  async getConversationById(conversationId: string): Promise<Conversation | null> {
    const { data, error } = await supabase
      .from('conversation')
      .select(`
        *,
        admin!admin_id(id, email, first_name, last_name),
        developer!developer_id(id, email)
      `)
      .eq('id', conversationId)
      .single()

    if (error) {
      console.error('Error fetching conversation:', error)
      return null
    }

    return data
  }

  // ============================================================================
  // MESSAGES
  // ============================================================================

  async getMessages(conversationId: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from('message')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching messages:', error)
      throw error
    }

    return data || []
  }

  async sendMessage(message: {
    conversation_id: string
    sender_type: 'Developer' | 'Admin'
    sender_id: string
    recipient_type: 'Developer' | 'Admin'
    recipient_id: string
    content: string
  }): Promise<Message> {
    const { data, error } = await supabase
      .from('message')
      .insert({
        conversation_id: message.conversation_id,
        sender_type: message.sender_type,
        sender_id: message.sender_id,
        recipient_type: message.recipient_type,
        recipient_id: message.recipient_id,
        content: message.content,
        status: 'Sent'
      })
      .select()
      .single()

    if (error) {
      console.error('Error sending message:', error)
      throw error
    }

    // Update conversation last_message_at
    await supabase
      .from('conversation')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', message.conversation_id)

    return data
  }

  async markMessageAsRead(messageId: string): Promise<void> {
    const { error } = await supabase
      .from('message')
      .update({
        status: 'Read',
        read_at: new Date().toISOString()
      })
      .eq('id', messageId)

    if (error) {
      console.error('Error marking message as read:', error)
      throw error
    }
  }

  async markConversationAsRead(conversationId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('message')
      .update({
        status: 'Read',
        read_at: new Date().toISOString()
      })
      .eq('conversation_id', conversationId)
      .eq('recipient_id', userId)
      .eq('status', 'Sent')

    if (error) {
      console.error('Error marking conversation as read:', error)
      throw error
    }
  }

  // ============================================================================
  // NOTIFICATIONS
  // ============================================================================

  async getNotifications(
    recipientType: 'Developer' | 'Admin' | 'User',
    recipientId: string,
    enterpriseId?: string
  ): Promise<Notification[]> {
    let query = supabase
      .from('notification')
      .select('*')
      .eq('recipient_type', recipientType)

    // Global notifications (recipient_id is null) OR specific to user
    query = query.or(`recipient_id.is.null,recipient_id.eq.${recipientId}`)

    // Filter by enterprise if provided
    if (enterpriseId) {
      query = query.eq('enterprise_id', enterpriseId)
    }

    query = query.order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) {
      console.error('Error fetching notifications:', error)
      throw error
    }

    return data || []
  }

  async createNotification(notification: {
    enterprise_id?: string
    recipient_type: 'Developer' | 'Admin' | 'User'
    recipient_id?: string
    title: string
    content: string
    type?: string
    priority?: 'Info' | 'Warning' | 'Critical'
    resource_type?: string
    resource_id?: string
  }): Promise<Notification> {
    const { data, error } = await supabase
      .from('notification')
      .insert({
        enterprise_id: notification.enterprise_id || null,
        recipient_type: notification.recipient_type,
        recipient_id: notification.recipient_id || null,
        title: notification.title,
        content: notification.content,
        type: notification.type || null,
        priority: notification.priority || 'Info',
        resource_type: notification.resource_type || null,
        resource_id: notification.resource_id || null,
        status: 'Unread'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating notification:', error)
      throw error
    }

    return data
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notification')
      .update({
        status: 'Read',
        read_at: new Date().toISOString()
      })
      .eq('id', notificationId)

    if (error) {
      console.error('Error marking notification as read:', error)
      throw error
    }
  }

  async markAllNotificationsAsRead(
    recipientType: 'Developer' | 'Admin' | 'User',
    recipientId: string
  ): Promise<void> {
    const { error } = await supabase
      .from('notification')
      .update({
        status: 'Read',
        read_at: new Date().toISOString()
      })
      .eq('recipient_type', recipientType)
      .or(`recipient_id.is.null,recipient_id.eq.${recipientId}`)
      .eq('status', 'Unread')

    if (error) {
      console.error('Error marking all notifications as read:', error)
      throw error
    }
  }

  async deleteNotification(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notification')
      .delete()
      .eq('id', notificationId)

    if (error) {
      console.error('Error deleting notification:', error)
      throw error
    }
  }

  async getUnreadNotificationCount(
    recipientType: 'Developer' | 'Admin' | 'User',
    recipientId: string,
    enterpriseId?: string
  ): Promise<number> {
    let query = supabase
      .from('notification')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_type', recipientType)
      .eq('status', 'Unread')

    query = query.or(`recipient_id.is.null,recipient_id.eq.${recipientId}`)

    if (enterpriseId) {
      query = query.eq('enterprise_id', enterpriseId)
    }

    const { count, error } = await query

    if (error) {
      console.error('Error fetching unread count:', error)
      return 0
    }

    return count || 0
  }

  // ============================================================================
  // REALTIME SUBSCRIPTIONS
  // ============================================================================

  subscribeToConversation(
    conversationId: string,
    onMessage: (message: Message) => void
  ) {
    return supabase
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          onMessage(payload.new as Message)
        }
      )
      .subscribe()
  }

  subscribeToNotifications(
    recipientType: 'Developer' | 'Admin' | 'User',
    recipientId: string,
    onNotification: (notification: Notification) => void
  ) {
    return supabase
      .channel(`notifications:${recipientType}:${recipientId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notification',
          filter: `recipient_type=eq.${recipientType}`
        },
        (payload) => {
          const notif = payload.new as Notification
          // Only trigger if global or specific to this user
          if (!notif.recipient_id || notif.recipient_id === recipientId) {
            onNotification(notif)
          }
        }
      )
      .subscribe()
  }

  unsubscribe(channel: any) {
    return supabase.removeChannel(channel)
  }
}

export const messagingService = new MessagingService()
