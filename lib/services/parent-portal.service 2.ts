import { createClient } from '@/lib/supabase/client'
import { timelineService } from './timeline.service'
import { parentMessagingService } from './parent-messaging.service'
import { parentDocumentsService } from './parent-documents.service'

const supabase: any = createClient()

// ============================================================
// TYPES & INTERFACES
// ============================================================

export interface GuardianUser {
  guardian_id: string
  email: string
  password_hash: string
  last_login_at: string | null
  push_tokens: PushToken[] | null
  notification_preferences: NotificationPreferences
  language: string
  theme: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PushToken {
  token: string
  platform: 'ios' | 'android' | 'web'
  registered_at: string
}

export interface NotificationPreferences {
  push_enabled: boolean
  email_enabled: boolean
  new_posts: boolean
  new_messages: boolean
  invoices: boolean
  documents: boolean
  announcements: boolean
}

export interface ParentDashboard {
  guardian: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
  children: ChildDashboardData[]
  unread_counts: {
    messages: number
    notifications: number
    documents: number
  }
  recent_activity: RecentActivity[]
  pending_actions: PendingAction[]
}

export interface ChildDashboardData {
  id: string
  first_name: string
  last_name: string
  photo_url: string | null
  age_months: number
  section: string
  recent_posts: any[]
  today_attendance: {
    is_present: boolean
    check_in_time: string | null
    check_out_time: string | null
  } | null
  this_week_activities: number
}

export interface RecentActivity {
  id: string
  type: 'post' | 'message' | 'document' | 'invoice'
  title: string
  description: string
  timestamp: string
  child_id?: string
  child_name?: string
  icon: string
  link: string
}

export interface PendingAction {
  id: string
  type: 'acknowledge_document' | 'pay_invoice' | 'update_info' | 'sign_authorization'
  title: string
  description: string
  urgency: 'low' | 'medium' | 'high'
  due_date: string | null
  link: string
}

export interface ChildTimeline {
  child: {
    id: string
    first_name: string
    last_name: string
    photo_url: string | null
    birth_date: string
    section: string
  }
  posts: any[]
  stats: {
    total_posts: number
    this_week_posts: number
    total_photos: number
    total_videos: number
  }
}

export interface UpdatePreferencesInput {
  language?: string
  theme?: string
}

export interface UpdateNotificationSettingsInput {
  push_enabled?: boolean
  email_enabled?: boolean
  new_posts?: boolean
  new_messages?: boolean
  invoices?: boolean
  documents?: boolean
  announcements?: boolean
}

// ============================================================
// PARENT PORTAL SERVICE
// ============================================================

export class ParentPortalService {
  private getClient(): any {
    return createClient()
  }

  // ============================================================
  // DASHBOARD
  // ============================================================

  /**
   * Get complete dashboard data for a guardian
   */
  async getDashboard(guardianId: string): Promise<ParentDashboard> {
    const supabase = this.getClient()

    // Get guardian info
    const { data: guardian, error: guardianError } = await supabase
      .from('guardian')
      .select('id, first_name, last_name, email')
      .eq('id', guardianId)
      .single()

    if (guardianError) throw guardianError

    // Get children
    const childrenData = await this.getChildrenDashboardData(guardianId)

    // Get unread counts
    const unreadCounts = await this.getUnreadCounts(guardianId)

    // Get recent activity
    const recentActivity = await this.getRecentActivity(guardianId, 10)

    // Get pending actions
    const pendingActions = await this.getPendingActions(guardianId)

    return {
      guardian,
      children: childrenData,
      unread_counts: unreadCounts,
      recent_activity: recentActivity,
      pending_actions: pendingActions
    }
  }

  /**
   * Get dashboard data for all children of a guardian
   */
  private async getChildrenDashboardData(guardianId: string): Promise<ChildDashboardData[]> {
    const supabase = this.getClient()

    // Get children
    const { data: guardianChildren, error: gcError } = await supabase
      .from('guardian_child')
      .select(`
        child:child(
          id,
          first_name,
          last_name,
          photo_url,
          birth_date,
          section
        )
      `)
      .eq('guardian_id', guardianId)

    if (gcError) throw gcError

    const childrenData: ChildDashboardData[] = []

    for (const gc of guardianChildren) {
      const child = gc.child

      // Get recent posts (last 5)
      const recentPosts = await timelineService.getPosts(child.id, {
        is_published: true
      })

      // Get today's attendance
      const todayDate = new Date().toISOString().split('T')[0]
      const { data: attendance, error: attendanceError } = await supabase
        .from('attendance')
        .select('status, check_in_time, check_out_time')
        .eq('child_id', child.id)
        .eq('date', todayDate)
        .single()

      const todayAttendance = attendance
        ? {
            is_present: attendance.status === 'PRESENT',
            check_in_time: attendance.check_in_time,
            check_out_time: attendance.check_out_time
          }
        : null

      // Get this week's activities count
      const startOfWeek = new Date()
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
      const startDate = startOfWeek.toISOString().split('T')[0]

      const { count: activitiesCount, error: activitiesError } = await supabase
        .from('activity')
        .select('*', { count: 'exact', head: true })
        .eq('child_id', child.id)
        .gte('activity_date', startDate)

      // Calculate age in months
      const birthDate = new Date(child.birth_date)
      const now = new Date()
      const ageMonths = (now.getFullYear() - birthDate.getFullYear()) * 12 + (now.getMonth() - birthDate.getMonth())

      childrenData.push({
        id: child.id,
        first_name: child.first_name,
        last_name: child.last_name,
        photo_url: child.photo_url,
        age_months: ageMonths,
        section: child.section,
        recent_posts: recentPosts.slice(0, 5),
        today_attendance: todayAttendance,
        this_week_activities: activitiesCount || 0
      })
    }

    return childrenData
  }

  /**
   * Get child timeline with all posts
   */
  async getChildTimeline(childId: string, guardianId: string): Promise<ChildTimeline> {
    const supabase = this.getClient()

    // Verify guardian has access to this child
    const { data: access, error: accessError } = await supabase
      .from('guardian_child')
      .select('*')
      .eq('guardian_id', guardianId)
      .eq('child_id', childId)
      .single()

    if (accessError || !access) {
      throw new Error('Guardian does not have access to this child')
    }

    // Get child info
    const { data: child, error: childError } = await supabase
      .from('child')
      .select('id, first_name, last_name, photo_url, birth_date, section')
      .eq('id', childId)
      .single()

    if (childError) throw childError

    // Get all published posts
    const posts = await timelineService.getPosts(childId, { is_published: true })

    // Calculate stats
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    const oneWeekAgoStr = oneWeekAgo.toISOString()

    const thisWeekPosts = posts.filter(p => p.created_at >= oneWeekAgoStr)

    const totalPhotos = posts.reduce((sum, p) => {
      return sum + (p.media_urls?.filter((url: string) => url.includes('.jpg') || url.includes('.png')).length || 0)
    }, 0)

    const totalVideos = posts.reduce((sum, p) => {
      return sum + (p.media_urls?.filter((url: string) => url.includes('.mp4') || url.includes('.mov')).length || 0)
    }, 0)

    return {
      child,
      posts,
      stats: {
        total_posts: posts.length,
        this_week_posts: thisWeekPosts.length,
        total_photos: totalPhotos,
        total_videos: totalVideos
      }
    }
  }

  // ============================================================
  // UNREAD COUNTS
  // ============================================================

  /**
   * Get all unread counts for a guardian
   */
  async getUnreadCounts(guardianId: string): Promise<{
    messages: number
    notifications: number
    documents: number
  }> {
    const messagesCount = await parentMessagingService.getUnreadCount(guardianId)
    const notificationsCount = await parentMessagingService.getUnreadNotificationCount(guardianId)
    const documentsCount = await this.getUnreadDocumentsCount(guardianId)

    return {
      messages: messagesCount,
      notifications: notificationsCount,
      documents: documentsCount
    }
  }

  /**
   * Get count of unread documents (pending acknowledgments)
   */
  private async getUnreadDocumentsCount(guardianId: string): Promise<number> {
    const pendingDocs = await parentDocumentsService.getPendingAcknowledgments(guardianId)
    return pendingDocs.length
  }

  // ============================================================
  // RECENT ACTIVITY
  // ============================================================

  /**
   * Get recent activity feed for a guardian
   */
  async getRecentActivity(guardianId: string, limit: number = 20): Promise<RecentActivity[]> {
    const supabase = this.getClient()

    const activities: RecentActivity[] = []

    // Get guardian's children
    const { data: guardianChildren, error: gcError } = await supabase
      .from('guardian_child')
      .select('child_id, child:child(first_name, last_name)')
      .eq('guardian_id', guardianId)

    if (gcError) throw gcError

    const childIds = guardianChildren.map((gc: any) => gc.child_id)

    // Get recent posts
    for (const gc of guardianChildren) {
      const posts = await timelineService.getPosts(gc.child_id, {
        is_published: true
      })

      posts.slice(0, 5).forEach(post => {
        activities.push({
          id: post.id,
          type: 'post',
          title: post.title,
          description: post.content || '',
          timestamp: post.published_at || post.created_at,
          child_id: gc.child_id,
          child_name: `${gc.child.first_name} ${gc.child.last_name}`,
          icon: '📝',
          link: `/portal/timeline/${post.id}`
        })
      })
    }

    // Get recent messages
    const messages = await parentMessagingService.getUnreadMessages(guardianId)
    messages.slice(0, 5).forEach((msg: any) => {
      activities.push({
        id: msg.id,
        type: 'message',
        title: msg.subject || 'Nouveau message',
        description: msg.content.substring(0, 100),
        timestamp: msg.created_at,
        icon: '💬',
        link: `/portal/messages/${msg.id}`
      })
    })

    // Sort by timestamp and limit
    return activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)
  }

  // ============================================================
  // PENDING ACTIONS
  // ============================================================

  /**
   * Get pending actions for a guardian
   */
  async getPendingActions(guardianId: string): Promise<PendingAction[]> {
    const supabase = this.getClient()

    const actions: PendingAction[] = []

    // Get pending document acknowledgments
    const pendingDocs = await parentDocumentsService.getPendingAcknowledgments(guardianId)
    pendingDocs.forEach(doc => {
      actions.push({
        id: doc.id,
        type: 'acknowledge_document',
        title: 'Confirmer réception document',
        description: doc.title,
        urgency: 'medium',
        due_date: doc.expires_at,
        link: `/portal/documents/${doc.id}`
      })
    })

    // Get unpaid invoices
    const { data: guardian, error: guardianError } = await supabase
      .from('guardian')
      .select('family_id')
      .eq('id', guardianId)
      .single()

    if (!guardianError && guardian?.family_id) {
      const { data: unpaidInvoices, error: invoicesError } = await supabase
        .from('invoice')
        .select('id, invoice_number, total_amount, due_date')
        .eq('family_id', guardian.family_id)
        .in('status', ['PENDING', 'OVERDUE'])
        .order('due_date', { ascending: true })

      if (!invoicesError && unpaidInvoices) {
        unpaidInvoices.forEach((invoice: any) => {
          const now = new Date()
          const dueDate = new Date(invoice.due_date)
          const isOverdue = dueDate < now

          actions.push({
            id: invoice.id,
            type: 'pay_invoice',
            title: isOverdue ? 'Facture en retard' : 'Facture à payer',
            description: `${invoice.invoice_number} - ${invoice.total_amount}€`,
            urgency: isOverdue ? 'high' : 'medium',
            due_date: invoice.due_date,
            link: `/portal/invoices/${invoice.id}`
          })
        })
      }
    }

    // Sort by urgency and due date
    return actions.sort((a, b) => {
      const urgencyOrder = { high: 0, medium: 1, low: 2 }
      if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
        return urgencyOrder[a.urgency] - urgencyOrder[b.urgency]
      }
      if (a.due_date && b.due_date) {
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      }
      return 0
    })
  }

  // ============================================================
  // USER PREFERENCES
  // ============================================================

  /**
   * Get guardian user preferences
   */
  async getPreferences(guardianId: string): Promise<GuardianUser | null> {
    const supabase = this.getClient()

    const { data, error } = await supabase
      .from('guardian_user')
      .select('*')
      .eq('guardian_id', guardianId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return data as GuardianUser
  }

  /**
   * Update guardian preferences
   */
  async updatePreferences(guardianId: string, input: UpdatePreferencesInput): Promise<GuardianUser> {
    const supabase = this.getClient()

    const { data, error } = await supabase
      .from('guardian_user')
      .update({
        ...input,
        updated_at: new Date().toISOString()
      })
      .eq('guardian_id', guardianId)
      .select()
      .single()

    if (error) throw error
    return data as GuardianUser
  }

  /**
   * Update notification settings
   */
  async updateNotificationSettings(
    guardianId: string,
    input: UpdateNotificationSettingsInput
  ): Promise<GuardianUser> {
    const supabase = this.getClient()

    // Get current preferences
    const user = await this.getPreferences(guardianId)
    if (!user) throw new Error('Guardian user not found')

    const currentPrefs = user.notification_preferences || {}
    const updatedPrefs = {
      ...currentPrefs,
      ...input
    }

    const { data, error } = await supabase
      .from('guardian_user')
      .update({
        notification_preferences: updatedPrefs,
        updated_at: new Date().toISOString()
      })
      .eq('guardian_id', guardianId)
      .select()
      .single()

    if (error) throw error
    return data as GuardianUser
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(guardianId: string): Promise<void> {
    const supabase = this.getClient()

    const { error } = await supabase
      .from('guardian_user')
      .update({
        last_login_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('guardian_id', guardianId)

    if (error) throw error
  }

  // ============================================================
  // STATISTICS
  // ============================================================

  /**
   * Get portal usage statistics for a nursery (Owner dashboard)
   */
  async getPortalUsageStats(nurseryId: string): Promise<{
    total_guardians: number
    active_guardians: number
    avg_posts_per_child: number
    total_messages: number
    engagement_rate: number
  }> {
    const supabase = this.getClient()

    // Get total guardians in nursery
    const { data: families, error: familiesError } = await supabase
      .from('family')
      .select('id')
      .eq('nursery_id', nurseryId)

    if (familiesError) throw familiesError

    const familyIds = families.map((f: any) => f.id)

    const { count: totalGuardians, error: guardiansError } = await supabase
      .from('guardian')
      .select('*', { count: 'exact', head: true })
      .in('family_id', familyIds)

    if (guardiansError) throw guardiansError

    // Get active guardians (logged in last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { count: activeGuardians, error: activeError } = await supabase
      .from('guardian_user')
      .select('*', { count: 'exact', head: true })
      .gte('last_login_at', thirtyDaysAgo.toISOString())

    if (activeError) throw activeError

    // Get total posts
    const { count: totalPosts, error: postsError } = await supabase
      .from('timeline_post')
      .select('*', { count: 'exact', head: true })
      .eq('nursery_id', nurseryId)
      .eq('is_published', true)

    if (postsError) throw postsError

    // Get total children
    const { count: totalChildren, error: childrenError } = await supabase
      .from('child')
      .select('*', { count: 'exact', head: true })
      .eq('nursery_id', nurseryId)

    if (childrenError) throw childrenError

    // Get total messages
    const { count: totalMessages, error: messagesError } = await supabase
      .from('parent_message')
      .select('*', { count: 'exact', head: true })
      .eq('nursery_id', nurseryId)

    if (messagesError) throw messagesError

    const avgPostsPerChild = totalChildren ? (totalPosts || 0) / totalChildren : 0
    const engagementRate = totalGuardians ? ((activeGuardians || 0) / totalGuardians) * 100 : 0

    return {
      total_guardians: totalGuardians || 0,
      active_guardians: activeGuardians || 0,
      avg_posts_per_child: Math.round(avgPostsPerChild * 10) / 10,
      total_messages: totalMessages || 0,
      engagement_rate: Math.round(engagementRate * 10) / 10
    }
  }
}

// Singleton export
export const parentPortalService = new ParentPortalService()
