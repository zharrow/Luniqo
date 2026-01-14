import { createClient } from '@/lib/supabase/client'

const supabase: any = createClient()

// ============================================================
// TYPES & INTERFACES
// ============================================================

export interface TimelinePost {
  id: string
  child_id: string
  nursery_id: string
  employee_id: string
  post_type: PostType
  title: string
  content: string | null
  media_urls: string[] | null
  reactions: Record<string, string[]> | null // { "❤️": ["guardian1", "guardian2"], "👍": ["guardian3"] }
  mood: MoodType | null
  is_published: boolean
  published_at: string | null
  created_at: string
  updated_at: string
}

export interface ParentComment {
  id: string
  post_id: string
  guardian_id: string
  text: string
  is_moderated: boolean
  moderation_reason: string | null
  created_at: string
  updated_at: string
}

export type PostType =
  | 'activity'
  | 'meal'
  | 'nap'
  | 'photo'
  | 'video'
  | 'milestone'
  | 'observation'
  | 'artwork'
  | 'mood'
  | 'health_note'

export type MoodType = 'happy' | 'sad' | 'tired' | 'excited' | 'calm' | 'upset'

export interface CreatePostInput {
  child_id: string
  nursery_id: string
  employee_id: string
  post_type: PostType
  title: string
  content?: string
  media_urls?: string[]
  mood?: MoodType
  is_published?: boolean
}

export interface UpdatePostInput {
  post_type?: PostType
  title?: string
  content?: string
  media_urls?: string[]
  mood?: MoodType
  is_published?: boolean
}

export interface PostFilters {
  child_id?: string
  post_type?: PostType
  is_published?: boolean
  start_date?: string
  end_date?: string
}

export interface CreateCommentInput {
  post_id: string
  guardian_id: string
  text: string
}

// ============================================================
// TIMELINE SERVICE
// ============================================================

export class TimelineService {
  private getClient(): any {
    return createClient()
  }

  // ============================================================
  // POST CRUD OPERATIONS
  // ============================================================

  /**
   * Create a new timeline post
   */
  async createPost(input: CreatePostInput): Promise<TimelinePost> {
    const supabase = this.getClient()

    const { data, error } = await supabase
      .from('timeline_post')
      .insert({
        child_id: input.child_id,
        nursery_id: input.nursery_id,
        employee_id: input.employee_id,
        post_type: input.post_type,
        title: input.title,
        content: input.content || null,
        media_urls: input.media_urls || null,
        mood: input.mood || null,
        is_published: input.is_published || false,
        published_at: input.is_published ? new Date().toISOString() : null,
        reactions: {}
      })
      .select()
      .single()

    if (error) throw error
    return data as TimelinePost
  }

  /**
   * Get all posts for a child with optional filters
   */
  async getPosts(childId: string, filters?: PostFilters): Promise<TimelinePost[]> {
    const supabase = this.getClient()

    let query = supabase
      .from('timeline_post')
      .select('*')
      .eq('child_id', childId)
      .order('created_at', { ascending: false })

    if (filters?.post_type) {
      query = query.eq('post_type', filters.post_type)
    }

    if (filters?.is_published !== undefined) {
      query = query.eq('is_published', filters.is_published)
    }

    if (filters?.start_date) {
      query = query.gte('created_at', filters.start_date)
    }

    if (filters?.end_date) {
      query = query.lte('created_at', filters.end_date)
    }

    const { data, error } = await query

    if (error) throw error
    return (data as TimelinePost[]) || []
  }

  /**
   * Get posts for a nursery (all children)
   */
  async getPostsByNursery(nurseryId: string, filters?: PostFilters): Promise<TimelinePost[]> {
    const supabase = this.getClient()

    let query = supabase
      .from('timeline_post')
      .select(`
        *,
        child:child(id, first_name, last_name, photo_url),
        employee:profiles(id, first_name, last_name)
      `)
      .eq('nursery_id', nurseryId)
      .order('created_at', { ascending: false })

    if (filters?.post_type) {
      query = query.eq('post_type', filters.post_type)
    }

    if (filters?.is_published !== undefined) {
      query = query.eq('is_published', filters.is_published)
    }

    if (filters?.start_date) {
      query = query.gte('created_at', filters.start_date)
    }

    if (filters?.end_date) {
      query = query.lte('created_at', filters.end_date)
    }

    const { data, error } = await query

    if (error) throw error
    return (data as any[]) || []
  }

  /**
   * Get a single post by ID
   */
  async getById(postId: string): Promise<TimelinePost | null> {
    const supabase = this.getClient()

    const { data, error } = await supabase
      .from('timeline_post')
      .select(`
        *,
        child:child(id, first_name, last_name, photo_url),
        employee:profiles(id, first_name, last_name)
      `)
      .eq('id', postId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return data as any
  }

  /**
   * Update a post
   */
  async updatePost(postId: string, input: UpdatePostInput): Promise<TimelinePost> {
    const supabase = this.getClient()

    const updateData: any = {
      ...input,
      updated_at: new Date().toISOString()
    }

    // If publishing for the first time, set published_at
    if (input.is_published && !updateData.published_at) {
      updateData.published_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('timeline_post')
      .update(updateData)
      .eq('id', postId)
      .select()
      .single()

    if (error) throw error
    return data as TimelinePost
  }

  /**
   * Publish a post (make visible to parents)
   */
  async publishPost(postId: string): Promise<TimelinePost> {
    return this.updatePost(postId, {
      is_published: true
    })
  }

  /**
   * Unpublish a post
   */
  async unpublishPost(postId: string): Promise<TimelinePost> {
    return this.updatePost(postId, {
      is_published: false
    })
  }

  /**
   * Delete a post
   */
  async deletePost(postId: string): Promise<void> {
    const supabase = this.getClient()

    const { error } = await supabase
      .from('timeline_post')
      .delete()
      .eq('id', postId)

    if (error) throw error
  }

  // ============================================================
  // MEDIA MANAGEMENT
  // ============================================================

  /**
   * Add media URL to a post
   */
  async addMedia(postId: string, mediaUrl: string): Promise<TimelinePost> {
    const supabase = this.getClient()

    // Get current post
    const post = await this.getById(postId)
    if (!post) throw new Error('Post not found')

    // Add new media URL to array
    const currentMedia = post.media_urls || []
    const updatedMedia = [...currentMedia, mediaUrl]

    return this.updatePost(postId, { media_urls: updatedMedia })
  }

  /**
   * Remove media URL from a post
   */
  async removeMedia(postId: string, mediaUrl: string): Promise<TimelinePost> {
    const supabase = this.getClient()

    // Get current post
    const post = await this.getById(postId)
    if (!post) throw new Error('Post not found')

    // Remove media URL from array
    const currentMedia = post.media_urls || []
    const updatedMedia = currentMedia.filter((url: string) => url !== mediaUrl)

    return this.updatePost(postId, { media_urls: updatedMedia })
  }

  // ============================================================
  // REACTIONS
  // ============================================================

  /**
   * Add a reaction to a post
   */
  async addReaction(postId: string, guardianId: string, emoji: string): Promise<TimelinePost> {
    const supabase = this.getClient()

    // Get current post
    const post = await this.getById(postId)
    if (!post) throw new Error('Post not found')

    // Update reactions object
    const reactions = post.reactions || {}
    const emojiReactions = reactions[emoji] || []

    // Add guardian if not already reacted
    if (!emojiReactions.includes(guardianId)) {
      emojiReactions.push(guardianId)
      reactions[emoji] = emojiReactions
    }

    // Update post
    const { data, error } = await supabase
      .from('timeline_post')
      .update({
        reactions,
        updated_at: new Date().toISOString()
      })
      .eq('id', postId)
      .select()
      .single()

    if (error) throw error
    return data as TimelinePost
  }

  /**
   * Remove a reaction from a post
   */
  async removeReaction(postId: string, guardianId: string, emoji: string): Promise<TimelinePost> {
    const supabase = this.getClient()

    // Get current post
    const post = await this.getById(postId)
    if (!post) throw new Error('Post not found')

    // Update reactions object
    const reactions = post.reactions || {}
    const emojiReactions = reactions[emoji] || []

    // Remove guardian
    reactions[emoji] = emojiReactions.filter((id: string) => id !== guardianId)

    // Remove emoji key if empty
    if (reactions[emoji].length === 0) {
      delete reactions[emoji]
    }

    // Update post
    const { data, error } = await supabase
      .from('timeline_post')
      .update({
        reactions,
        updated_at: new Date().toISOString()
      })
      .eq('id', postId)
      .select()
      .single()

    if (error) throw error
    return data as TimelinePost
  }

  /**
   * Get all reactions for a post
   */
  async getReactions(postId: string): Promise<Record<string, string[]>> {
    const post = await this.getById(postId)
    if (!post) throw new Error('Post not found')

    return post.reactions || {}
  }

  // ============================================================
  // COMMENTS
  // ============================================================

  /**
   * Add a comment to a post
   */
  async addComment(input: CreateCommentInput): Promise<ParentComment> {
    const supabase = this.getClient()

    const { data, error } = await supabase
      .from('parent_comment')
      .insert({
        post_id: input.post_id,
        guardian_id: input.guardian_id,
        text: input.text,
        is_moderated: false
      })
      .select()
      .single()

    if (error) throw error
    return data as ParentComment
  }

  /**
   * Get all comments for a post
   */
  async getComments(postId: string): Promise<ParentComment[]> {
    const supabase = this.getClient()

    const { data, error } = await supabase
      .from('parent_comment')
      .select(`
        *,
        guardian:guardian(id, first_name, last_name)
      `)
      .eq('post_id', postId)
      .eq('is_moderated', false)
      .order('created_at', { ascending: true })

    if (error) throw error
    return (data as any[]) || []
  }

  /**
   * Get all comments including moderated ones (for admin)
   */
  async getAllComments(postId: string): Promise<ParentComment[]> {
    const supabase = this.getClient()

    const { data, error } = await supabase
      .from('parent_comment')
      .select(`
        *,
        guardian:guardian(id, first_name, last_name)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return (data as any[]) || []
  }

  /**
   * Moderate a comment (hide it)
   */
  async moderateComment(commentId: string, reason: string): Promise<ParentComment> {
    const supabase = this.getClient()

    const { data, error } = await supabase
      .from('parent_comment')
      .update({
        is_moderated: true,
        moderation_reason: reason,
        updated_at: new Date().toISOString()
      })
      .eq('id', commentId)
      .select()
      .single()

    if (error) throw error
    return data as ParentComment
  }

  /**
   * Unmoderate a comment (show it again)
   */
  async unmoderateComment(commentId: string): Promise<ParentComment> {
    const supabase = this.getClient()

    const { data, error } = await supabase
      .from('parent_comment')
      .update({
        is_moderated: false,
        moderation_reason: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', commentId)
      .select()
      .single()

    if (error) throw error
    return data as ParentComment
  }

  /**
   * Delete a comment
   */
  async deleteComment(commentId: string): Promise<void> {
    const supabase = this.getClient()

    const { error } = await supabase
      .from('parent_comment')
      .delete()
      .eq('id', commentId)

    if (error) throw error
  }

  // ============================================================
  // STATISTICS
  // ============================================================

  /**
   * Get post statistics for a child
   */
  async getPostStats(childId: string): Promise<{
    total: number
    published: number
    draft: number
    byType: Record<PostType, number>
  }> {
    const posts = await this.getPosts(childId)

    const stats = {
      total: posts.length,
      published: posts.filter(p => p.is_published).length,
      draft: posts.filter(p => !p.is_published).length,
      byType: {} as Record<PostType, number>
    }

    // Count by type
    posts.forEach(post => {
      stats.byType[post.post_type] = (stats.byType[post.post_type] || 0) + 1
    })

    return stats
  }

  /**
   * Get engagement statistics for a post
   */
  async getEngagementStats(postId: string): Promise<{
    totalReactions: number
    totalComments: number
    reactionsByEmoji: Record<string, number>
  }> {
    const post = await this.getById(postId)
    if (!post) throw new Error('Post not found')

    const comments = await this.getComments(postId)
    const reactions = post.reactions || {}

    const reactionsByEmoji: Record<string, number> = {}
    let totalReactions = 0

    Object.entries(reactions).forEach(([emoji, guardians]) => {
      const count = (guardians as string[]).length
      reactionsByEmoji[emoji] = count
      totalReactions += count
    })

    return {
      totalReactions,
      totalComments: comments.length,
      reactionsByEmoji
    }
  }
}

// Singleton export
export const timelineService = new TimelineService()
