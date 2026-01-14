'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  ChevronLeftIcon,
  ClockIcon,
  HeartIcon,
  ChatBubbleLeftIcon,
  PhotoIcon,
  PaperAirplaneIcon
} from '@heroicons/react/24/outline'

export default function TimelinePostDetailPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [post, setPost] = useState<any>(null)
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [guardianId, setGuardianId] = useState<string>('')

  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  const postId = params.id as string

  useEffect(() => {
    loadPost()
  }, [postId])

  async function loadPost() {
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

      // Load post
      const { data: postData } = await supabase
        .from('timeline_post')
        .select(`
          *,
          child:child_id (id, first_name, last_name, photo_url),
          posted_by:posted_by_employee_id (first_name, last_name)
        `)
        .eq('id', postId)
        .eq('status', 'published')
        .single()

      if (!postData) {
        router.push('/portal/timeline')
        return
      }

      setPost(postData)

      // Load comments
      const { data: commentsData } = await supabase
        .from('parent_comment')
        .select(`
          *,
          guardian:guardian_id (first_name, last_name)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true })

      if (commentsData) {
        setComments(commentsData)
      }

      setIsLoading(false)
    } catch (error) {
      console.error('Failed to load post:', error)
      setIsLoading(false)
    }
  }

  async function handleSubmitComment(e: React.FormEvent) {
    e.preventDefault()

    if (!newComment.trim() || !guardianId) return

    setIsSubmitting(true)

    try {
      const { data, error } = await (supabase as any)
        .from('parent_comment')
        .insert({
          post_id: postId,
          guardian_id: guardianId,
          comment_text: newComment.trim(),
        })
        .select(`
          *,
          guardian:guardian_id (first_name, last_name)
        `)
        .single()

      if (error) throw error

      if (data) {
        setComments([...comments, data])
        setNewComment('')
      }
    } catch (error) {
      console.error('Failed to submit comment:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function toggleReaction(emoji: string) {
    if (!post) return

    try {
      const reactions = post.reactions || {}
      const currentCount = reactions[emoji] || 0

      const newReactions = {
        ...reactions,
        [emoji]: currentCount > 0 ? currentCount - 1 : currentCount + 1
      }

      const { error } = await (supabase as any)
        .from('timeline_post')
        .update({ reactions: newReactions })
        .eq('id', postId)

      if (!error) {
        setPost({ ...post, reactions: newReactions })
      }
    } catch (error) {
      console.error('Failed to toggle reaction:', error)
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

  if (!post) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Publication non trouvée</p>
      </div>
    )
  }

  const timeAgo = getTimeAgo(post.created_at)

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ChevronLeftIcon className="w-5 h-5" />
        <span className="text-sm font-medium">Retour</span>
      </button>

      {/* Post Card */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        {/* Header */}
        <div className="p-5">
          <div className="flex items-start gap-3 mb-4">
            {post.child?.photo_url ? (
              <img
                src={post.child.photo_url}
                alt={post.child.first_name}
                className="w-14 h-14 rounded-full object-cover border-2 border-[#5a9dc9]/20"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#f4a5a5] to-[#d88989] flex items-center justify-center text-white font-bold text-lg">
                {post.child?.first_name?.[0]}
              </div>
            )}

            <div className="flex-1">
              <p className="font-bold text-gray-900 text-lg">
                {post.child?.first_name} {post.child?.last_name}
              </p>
              {post.posted_by && (
                <p className="text-sm text-gray-500">
                  Par {post.posted_by.first_name} {post.posted_by.last_name}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#f4a5a5]/10 text-[#c66b6b] rounded-full text-xs font-medium">
                  {getPostTypeLabel(post.post_type)}
                </span>
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <ClockIcon className="w-3 h-3" />
                  {timeAgo}
                </span>
              </div>
            </div>
          </div>

          {/* Content */}
          <p className="text-gray-900 leading-relaxed mb-4 whitespace-pre-line">
            {post.content}
          </p>

          {/* Media */}
          {post.media_urls && post.media_urls.length > 0 && (
            <div className="space-y-3 mb-4">
              {post.media_urls.map((url: string, index: number) => (
                <img
                  key={index}
                  src={url}
                  alt={`Media ${index + 1}`}
                  className="w-full rounded-xl object-cover"
                />
              ))}
            </div>
          )}

          {/* Reactions */}
          <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
            <button
              onClick={() => toggleReaction('❤️')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-gray-50 hover:bg-red-50 transition-colors"
            >
              <HeartIcon className="w-5 h-5 text-red-500" />
              <span className="text-sm font-medium text-gray-700">
                {post.reactions?.['❤️'] || 0}
              </span>
            </button>
            <button
              onClick={() => toggleReaction('👍')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-gray-50 hover:bg-blue-50 transition-colors"
            >
              <span className="text-lg">👍</span>
              <span className="text-sm font-medium text-gray-700">
                {post.reactions?.['👍'] || 0}
              </span>
            </button>
            <button
              onClick={() => toggleReaction('😊')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-gray-50 hover:bg-yellow-50 transition-colors"
            >
              <span className="text-lg">😊</span>
              <span className="text-sm font-medium text-gray-700">
                {post.reactions?.['😊'] || 0}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Comments Section */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <ChatBubbleLeftIcon className="w-5 h-5" />
          Commentaires ({comments.length})
        </h2>

        {/* Comments List */}
        <div className="space-y-4 mb-6">
          {comments.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">
              Aucun commentaire pour le moment
            </p>
          ) : (
            comments.map((comment: any) => (
              <CommentCard key={comment.id} comment={comment} />
            ))
          )}
        </div>

        {/* Add Comment Form */}
        <form onSubmit={handleSubmitComment} className="border-t border-gray-100 pt-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Ajouter un commentaire..."
              className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5a9dc9]/20 focus:border-[#5a9dc9]"
              disabled={isSubmitting}
            />
            <button
              type="submit"
              disabled={isSubmitting || !newComment.trim()}
              className="px-4 py-2 bg-gradient-to-r from-[#5a9dc9] to-[#2c5f7f] text-white rounded-xl hover:shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PaperAirplaneIcon className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function CommentCard({ comment }: any) {
  const timeAgo = getTimeAgo(comment.created_at)

  return (
    <div className="flex gap-3 p-3 bg-gray-50 rounded-xl">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#5a9dc9] to-[#2c5f7f] flex items-center justify-center text-white font-semibold flex-shrink-0">
        {comment.guardian?.first_name?.[0]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="font-semibold text-gray-900 text-sm">
            {comment.guardian?.first_name} {comment.guardian?.last_name}
          </p>
          <span className="text-xs text-gray-500">{timeAgo}</span>
        </div>
        <p className="text-gray-700 text-sm leading-relaxed">{comment.comment_text}</p>
      </div>
    </div>
  )
}

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'À l\'instant'
  if (diffMins < 60) return `Il y a ${diffMins}min`
  if (diffHours < 24) return `Il y a ${diffHours}h`
  if (diffDays < 7) return `Il y a ${diffDays}j`
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function getPostTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    activity: 'Activité',
    meal: 'Repas',
    nap: 'Sieste',
    photo: 'Photo',
    video: 'Vidéo',
    milestone: 'Progrès',
    observation: 'Observation',
    artwork: 'Création',
    mood: 'Humeur',
    health_note: 'Santé'
  }
  return labels[type] || type
}
