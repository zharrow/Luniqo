import { createClient } from '@/lib/supabase/client'

const supabase: any = createClient()

// ============================================================
// TYPES & INTERFACES
// ============================================================

export interface ParentMessage {
  id: string
  nursery_id: string
  family_id: string
  sender_guardian_id: string | null
  sender_employee_id: string | null
  recipient_guardian_id: string | null
  recipient_employee_id: string | null
  subject: string | null
  content: string
  category: MessageCategory
  attachment_urls: string[] | null
  reply_to_message_id: string | null
  is_read: boolean
  read_at: string | null
  created_at: string
  updated_at: string
}

export interface ParentNotification {
  id: string
  guardian_id: string
  notification_type: NotificationType
  title: string
  message: string
  data: Record<string, any> | null // JSONB for deeplinks
  is_read: boolean
  read_at: string | null
  created_at: string
}

export type MessageCategory = 'general' | 'absence_notification' | 'urgent' | 'administrative'

export type NotificationType =
  | 'new_post'
  | 'new_message'
  | 'invoice_available'
  | 'payment_reminder'
  | 'document_uploaded'
  | 'authorization_expiring'
  | 'announcement'

export interface SendMessageInput {
  nursery_id: string
  family_id: string
  sender_guardian_id?: string
  sender_employee_id?: string
  recipient_guardian_id?: string
  recipient_employee_id?: string
  subject?: string
  content: string
  category: MessageCategory
  attachment_urls?: string[]
  reply_to_message_id?: string
}

export interface CreateNotificationInput {
  guardian_id: string
  notification_type: NotificationType
  title: string
  message: string
  data?: Record<string, any>
}

export interface ConversationThread {
  family_id: string
  guardian_id: string
  employee_id: string | null
  messages: ParentMessage[]
  unread_count: number
  last_message: ParentMessage | null
}

// ============================================================
// PARENT MESSAGING SERVICE
// ============================================================

export class ParentMessagingService {
  private getClient(): any {
    return createClient()
  }

  // ============================================================
  // MESSAGE OPERATIONS
  // ============================================================

  /**
   * Send a message (guardian to employee or employee to guardian)
   */
  async sendMessage(input: SendMessageInput): Promise<ParentMessage> {
    const supabase = this.getClient()

    const { data, error } = await supabase
      .from('parent_message')
      .insert({
        nursery_id: input.nursery_id,
        family_id: input.family_id,
        sender_guardian_id: input.sender_guardian_id || null,
        sender_employee_id: input.sender_employee_id || null,
        recipient_guardian_id: input.recipient_guardian_id || null,
        recipient_employee_id: input.recipient_employee_id || null,
        subject: input.subject || null,
        content: input.content,
        category: input.category,
        attachment_urls: input.attachment_urls || null,
        reply_to_message_id: input.reply_to_message_id || null,
        is_read: false
      })
      .select()
      .single()

    if (error) throw error

    // Create notification for recipient
    if (input.recipient_guardian_id) {
      await this.createNotification({
        guardian_id: input.recipient_guardian_id,
        notification_type: 'new_message',
        title: 'Nouveau message',
        message: input.subject || 'Vous avez reçu un nouveau message',
        data: {
          message_id: data.id,
          family_id: input.family_id
        }
      })
    }

    return data as ParentMessage
  }

  /**
   * Get conversation between guardian and employee
   */
  async getConversation(
    familyId: string,
    guardianId: string,
    employeeId?: string
  ): Promise<ParentMessage[]> {
    const supabase = this.getClient()

    let query = supabase
      .from('parent_message')
      .select(`
        *,
        sender_guardian:guardian!sender_guardian_id(id, first_name, last_name),
        sender_employee:profiles!sender_employee_id(id, first_name, last_name),
        recipient_guardian:guardian!recipient_guardian_id(id, first_name, last_name),
        recipient_employee:profiles!recipient_employee_id(id, first_name, last_name)
      `)
      .eq('family_id', familyId)
      .order('created_at', { ascending: true })

    // Filter for specific guardian
    query = query.or(`sender_guardian_id.eq.${guardianId},recipient_guardian_id.eq.${guardianId}`)

    // Filter for specific employee if provided
    if (employeeId) {
      query = query.or(`sender_employee_id.eq.${employeeId},recipient_employee_id.eq.${employeeId}`)
    }

    const { data, error } = await query

    if (error) throw error
    return (data as any[]) || []
  }

  /**
   * Get all conversations for a guardian
   */
  async getGuardianConversations(guardianId: string): Promise<ConversationThread[]> {
    const supabase = this.getClient()

    // Get all messages for this guardian
    const { data: messages, error } = await supabase
      .from('parent_message')
      .select(`
        *,
        sender_guardian:guardian!sender_guardian_id(id, first_name, last_name),
        sender_employee:profiles!sender_employee_id(id, first_name, last_name),
        recipient_guardian:guardian!recipient_guardian_id(id, first_name, last_name),
        recipient_employee:profiles!recipient_employee_id(id, first_name, last_name),
        family:family(id, name)
      `)
      .or(`sender_guardian_id.eq.${guardianId},recipient_guardian_id.eq.${guardianId}`)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Group by family and employee
    const threadsMap = new Map<string, ConversationThread>()

    messages.forEach((msg: any) => {
      const employeeId = msg.sender_employee_id || msg.recipient_employee_id
      const key = `${msg.family_id}-${employeeId || 'all'}`

      if (!threadsMap.has(key)) {
        threadsMap.set(key, {
          family_id: msg.family_id,
          guardian_id: guardianId,
          employee_id: employeeId,
          messages: [],
          unread_count: 0,
          last_message: null
        })
      }

      const thread = threadsMap.get(key)!
      thread.messages.push(msg)

      if (!msg.is_read && msg.recipient_guardian_id === guardianId) {
        thread.unread_count++
      }

      if (!thread.last_message || new Date(msg.created_at) > new Date(thread.last_message.created_at)) {
        thread.last_message = msg
      }
    })

    return Array.from(threadsMap.values())
  }

  /**
   * Get all messages for a family (Owner view)
   */
  async getFamilyMessages(familyId: string): Promise<ParentMessage[]> {
    const supabase = this.getClient()

    const { data, error } = await supabase
      .from('parent_message')
      .select(`
        *,
        sender_guardian:guardian!sender_guardian_id(id, first_name, last_name),
        sender_employee:profiles!sender_employee_id(id, first_name, last_name),
        recipient_guardian:guardian!recipient_guardian_id(id, first_name, last_name),
        recipient_employee:profiles!recipient_employee_id(id, first_name, last_name)
      `)
      .eq('family_id', familyId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return (data as any[]) || []
  }

  /**
   * Get all messages for a nursery (Owner dashboard)
   */
  async getNurseryMessages(nurseryId: string): Promise<ParentMessage[]> {
    const supabase = this.getClient()

    const { data, error } = await supabase
      .from('parent_message')
      .select(`
        *,
        sender_guardian:guardian!sender_guardian_id(id, first_name, last_name),
        sender_employee:profiles!sender_employee_id(id, first_name, last_name),
        recipient_guardian:guardian!recipient_guardian_id(id, first_name, last_name),
        recipient_employee:profiles!recipient_employee_id(id, first_name, last_name),
        family:family(id, name)
      `)
      .eq('nursery_id', nurseryId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) throw error
    return (data as any[]) || []
  }

  /**
   * Get unread messages for a guardian
   */
  async getUnreadMessages(guardianId: string): Promise<ParentMessage[]> {
    const supabase = this.getClient()

    const { data, error } = await supabase
      .from('parent_message')
      .select(`
        *,
        sender_guardian:guardian!sender_guardian_id(id, first_name, last_name),
        sender_employee:profiles!sender_employee_id(id, first_name, last_name)
      `)
      .eq('recipient_guardian_id', guardianId)
      .eq('is_read', false)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data as any[]) || []
  }

  /**
   * Get unread count for a guardian
   */
  async getUnreadCount(guardianId: string): Promise<number> {
    const supabase = this.getClient()

    const { count, error } = await supabase
      .from('parent_message')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_guardian_id', guardianId)
      .eq('is_read', false)

    if (error) throw error
    return count || 0
  }

  /**
   * Mark a message as read
   */
  async markAsRead(messageId: string): Promise<ParentMessage> {
    const supabase = this.getClient()

    const { data, error } = await supabase
      .from('parent_message')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', messageId)
      .select()
      .single()

    if (error) throw error
    return data as ParentMessage
  }

  /**
   * Mark all messages as read for a guardian
   */
  async markAllAsRead(guardianId: string): Promise<void> {
    const supabase = this.getClient()

    const { error } = await supabase
      .from('parent_message')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('recipient_guardian_id', guardianId)
      .eq('is_read', false)

    if (error) throw error
  }

  /**
   * Delete a message
   */
  async deleteMessage(messageId: string): Promise<void> {
    const supabase = this.getClient()

    const { error } = await supabase
      .from('parent_message')
      .delete()
      .eq('id', messageId)

    if (error) throw error
  }

  // ============================================================
  // NOTIFICATION OPERATIONS
  // ============================================================

  /**
   * Create a notification for a guardian
   */
  async createNotification(input: CreateNotificationInput): Promise<ParentNotification> {
    const supabase = this.getClient()

    const { data, error } = await supabase
      .from('parent_notification')
      .insert({
        guardian_id: input.guardian_id,
        notification_type: input.notification_type,
        title: input.title,
        message: input.message,
        data: input.data || null,
        is_read: false
      })
      .select()
      .single()

    if (error) throw error

    // Send push notification if guardian has push tokens
    await this.sendPushNotification(input.guardian_id, input.title, input.message, input.data)

    return data as ParentNotification
  }

  /**
   * Get notifications for a guardian
   */
  async getNotifications(guardianId: string, unreadOnly: boolean = false): Promise<ParentNotification[]> {
    const supabase = this.getClient()

    let query = supabase
      .from('parent_notification')
      .select('*')
      .eq('guardian_id', guardianId)
      .order('created_at', { ascending: false })

    if (unreadOnly) {
      query = query.eq('is_read', false)
    }

    const { data, error } = await query

    if (error) throw error
    return (data as ParentNotification[]) || []
  }

  /**
   * Get unread notification count
   */
  async getUnreadNotificationCount(guardianId: string): Promise<number> {
    const supabase = this.getClient()

    const { count, error } = await supabase
      .from('parent_notification')
      .select('*', { count: 'exact', head: true })
      .eq('guardian_id', guardianId)
      .eq('is_read', false)

    if (error) throw error
    return count || 0
  }

  /**
   * Mark a notification as read
   */
  async markNotificationAsRead(notificationId: string): Promise<ParentNotification> {
    const supabase = this.getClient()

    const { data, error } = await supabase
      .from('parent_notification')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('id', notificationId)
      .select()
      .single()

    if (error) throw error
    return data as ParentNotification
  }

  /**
   * Mark all notifications as read for a guardian
   */
  async markAllNotificationsAsRead(guardianId: string): Promise<void> {
    const supabase = this.getClient()

    const { error } = await supabase
      .from('parent_notification')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('guardian_id', guardianId)
      .eq('is_read', false)

    if (error) throw error
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    const supabase = this.getClient()

    const { error } = await supabase
      .from('parent_notification')
      .delete()
      .eq('id', notificationId)

    if (error) throw error
  }

  // ============================================================
  // PUSH NOTIFICATIONS
  // ============================================================

  /**
   * Register a push notification token for a guardian
   */
  async registerPushToken(guardianId: string, token: string, platform: 'ios' | 'android' | 'web'): Promise<void> {
    const supabase = this.getClient()

    // Get current guardian
    const { data: guardian, error: fetchError } = await supabase
      .from('guardian_user')
      .select('push_tokens')
      .eq('guardian_id', guardianId)
      .single()

    if (fetchError) throw fetchError

    // Add token to array if not already present
    const currentTokens = guardian?.push_tokens || []
    const tokenEntry = { token, platform, registered_at: new Date().toISOString() }

    // Check if token already exists
    const existingIndex = currentTokens.findIndex((t: any) => t.token === token)
    if (existingIndex >= 0) {
      // Update existing token
      currentTokens[existingIndex] = tokenEntry
    } else {
      // Add new token
      currentTokens.push(tokenEntry)
    }

    // Update guardian_user
    const { error: updateError } = await supabase
      .from('guardian_user')
      .update({
        push_tokens: currentTokens,
        updated_at: new Date().toISOString()
      })
      .eq('guardian_id', guardianId)

    if (updateError) throw updateError
  }

  /**
   * Unregister a push notification token
   */
  async unregisterPushToken(guardianId: string, token: string): Promise<void> {
    const supabase = this.getClient()

    // Get current guardian
    const { data: guardian, error: fetchError } = await supabase
      .from('guardian_user')
      .select('push_tokens')
      .eq('guardian_id', guardianId)
      .single()

    if (fetchError) throw fetchError

    // Remove token from array
    const currentTokens = guardian?.push_tokens || []
    const updatedTokens = currentTokens.filter((t: any) => t.token !== token)

    // Update guardian_user
    const { error: updateError } = await supabase
      .from('guardian_user')
      .update({
        push_tokens: updatedTokens,
        updated_at: new Date().toISOString()
      })
      .eq('guardian_id', guardianId)

    if (updateError) throw updateError
  }

  /**
   * Send a push notification to a guardian
   * NOTE: This is a placeholder. Actual implementation requires Firebase FCM/APNS setup
   */
  async sendPushNotification(
    guardianId: string,
    title: string,
    body: string,
    data?: Record<string, any>
  ): Promise<void> {
    const supabase = this.getClient()

    // Get guardian push tokens
    const { data: guardian, error } = await supabase
      .from('guardian_user')
      .select('push_tokens, notification_preferences')
      .eq('guardian_id', guardianId)
      .single()

    if (error) {
      console.error('Failed to fetch guardian push tokens:', error)
      return
    }

    // Check if push notifications are enabled
    const prefs = guardian?.notification_preferences || {}
    if (prefs.push_enabled === false) {
      console.log('Push notifications disabled for guardian:', guardianId)
      return
    }

    const tokens = guardian?.push_tokens || []
    if (tokens.length === 0) {
      console.log('No push tokens registered for guardian:', guardianId)
      return
    }

    // TODO: Implement actual push notification sending
    // This would integrate with Firebase Cloud Messaging (FCM) for Android/Web
    // and Apple Push Notification service (APNS) for iOS
    console.log('Push notification would be sent:', {
      guardianId,
      tokens: tokens.length,
      title,
      body,
      data
    })

    // Placeholder for future implementation:
    // await sendFCM(tokens, title, body, data)
  }

  // ============================================================
  // STATISTICS
  // ============================================================

  /**
   * Get messaging statistics for a nursery
   */
  async getMessagingStats(nurseryId: string): Promise<{
    total_messages: number
    unread_messages: number
    messages_by_category: Record<MessageCategory, number>
    avg_response_time_hours: number | null
  }> {
    const supabase = this.getClient()

    // Get all messages for nursery
    const { data: messages, error } = await supabase
      .from('parent_message')
      .select('*')
      .eq('nursery_id', nurseryId)

    if (error) throw error

    const stats = {
      total_messages: messages.length,
      unread_messages: messages.filter((m: any) => !m.is_read).length,
      messages_by_category: {} as Record<MessageCategory, number>,
      avg_response_time_hours: null as number | null
    }

    // Count by category
    messages.forEach((msg: any) => {
      const category = msg.category as MessageCategory
      stats.messages_by_category[category] = (stats.messages_by_category[category] || 0) + 1
    })

    return stats
  }
}

// Singleton export
export const parentMessagingService = new ParentMessagingService()
