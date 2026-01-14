'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  PhotoIcon,
  ClockIcon,
  HeartIcon,
  ChatBubbleLeftIcon,
  UserGroupIcon,
  FunnelIcon
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid'

export default function TimelineListPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [posts, setPosts] = useState<any[]>([])
  const [children, setChildren] = useState<any[]>([])
  const [selectedChildId, setSelectedChildId] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [guardianId, setGuardianId] = useState<string>('')

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (guardianId) {
      loadPosts()
    }
  }, [selectedChildId, selectedType, guardianId])

  async function loadData() {
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

      // Load children
      const { data: childrenData } = await supabase
        .from('guardian_child')
        .select(`
          child:child_id (
            id,
            first_name,
            last_name,
            photo_url
          )
        `)
        .eq('guardian_id', (guardianUser as any).guardian_id)

      if (childrenData) {
        setChildren(childrenData.map((gc: any) => gc.child).filter(Boolean))
      }

      setIsLoading(false)
    } catch (error) {
      console.error('Failed to load data:', error)
      setIsLoading(false)
    }
  }

  async function loadPosts() {
    try {
      const childIds = children.map(c => c.id)

      if (childIds.length === 0) {
        setPosts([])
        return
      }

      let query = supabase
        .from('timeline_post')
        .select(`
          *,
          child:child_id (id, first_name, last_name, photo_url),
          posted_by:posted_by_employee_id (first_name, last_name)
        `)
        .in('child_id', childIds)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(50)

      // Filter by child
      if (selectedChildId !== 'all') {
        query = query.eq('child_id', selectedChildId)
      }

      // Filter by type
      if (selectedType !== 'all') {
        query = query.eq('post_type', selectedType)
      }

      const { data: postsData } = await query

      if (postsData) {
        setPosts(postsData)
      }
    } catch (error) {
      console.error('Failed to load posts:', error)
    }
  }

  async function toggleReaction(postId: string, emoji: string) {
    try {
      // Get current post
      const post = posts.find(p => p.id === postId)
      if (!post) return

      const reactions = post.reactions || {}
      const currentCount = reactions[emoji] || 0

      // Toggle reaction (simple increment/decrement for demo)
      const newReactions = {
        ...reactions,
        [emoji]: currentCount > 0 ? currentCount - 1 : currentCount + 1
      }

      // Update in database
      const { error } = await (supabase as any)
        .from('timeline_post')
        .update({ reactions: newReactions })
        .eq('id', postId)

      if (!error) {
        // Update local state
        setPosts(posts.map(p =>
          p.id === postId ? { ...p, reactions: newReactions } : p
        ))
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Timeline</h1>
        <p className="text-gray-600 mt-1">Suivez la journée de vos enfants</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200">
        <div className="flex items-center gap-2 mb-3">
          <FunnelIcon className="w-5 h-5 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filtres</span>
        </div>

        <div className="space-y-3">
          {/* Child Filter */}
          <div>
            <label className="block text-xs text-gray-500 mb-2">Enfant</label>
            <select
              value={selectedChildId}
              onChange={(e) => setSelectedChildId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5a9dc9]/20 focus:border-[#5a9dc9] text-sm"
            >
              <option value="all">Tous les enfants</option>
              {children.map(child => (
                <option key={child.id} value={child.id}>
                  {child.first_name} {child.last_name}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-xs text-gray-500 mb-2">Type d'activité</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5a9dc9]/20 focus:border-[#5a9dc9] text-sm"
            >
              <option value="all">Tous les types</option>
              <option value="activity">Activité</option>
              <option value="meal">Repas</option>
              <option value="nap">Sieste</option>
              <option value="photo">Photo</option>
              <option value="milestone">Progrès</option>
              <option value="observation">Observation</option>
              <option value="artwork">Création</option>
              <option value="mood">Humeur</option>
            </select>
          </div>
        </div>
      </div>

      {/* Posts List */}
      {posts.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-200">
          <PhotoIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune activité</h3>
          <p className="text-gray-600">
            Aucune publication ne correspond à vos filtres
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post: any) => (
            <TimelinePostCard
              key={post.id}
              post={post}
              onReaction={(emoji: string) => toggleReaction(post.id, emoji)}
              onClick={() => router.push(`/portal/timeline/${post.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function TimelinePostCard({ post, onReaction, onClick }: any) {
  const timeAgo = getTimeAgo(post.created_at)
  const totalReactions = post.reactions
    ? Object.values(post.reactions).reduce((a: any, b: any) => a + b, 0)
    : 0

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start gap-3">
          {post.child?.photo_url ? (
            <img
              src={post.child.photo_url}
              alt={post.child.first_name}
              className="w-12 h-12 rounded-full object-cover border-2 border-[#5a9dc9]/20"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#f4a5a5] to-[#d88989] flex items-center justify-center text-white font-bold">
              {post.child?.first_name?.[0]}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-gray-900">
                  {post.child?.first_name} {post.child?.last_name}
                </p>
                {post.posted_by && (
                  <p className="text-xs text-gray-500">
                    Par {post.posted_by.first_name} {post.posted_by.last_name}
                  </p>
                )}
              </div>
              <span className="text-xs text-gray-500 flex items-center gap-1 flex-shrink-0">
                <ClockIcon className="w-3 h-3" />
                {timeAgo}
              </span>
            </div>

            <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#f4a5a5]/10 text-[#c66b6b] rounded-full text-xs font-medium mt-2">
              {getPostTypeLabel(post.post_type)}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <button onClick={onClick} className="w-full text-left">
        {post.media_urls && post.media_urls.length > 0 && (
          <div className="px-4 pb-3">
            <img
              src={post.media_urls[0]}
              alt="Post media"
              className="w-full rounded-xl object-cover max-h-96"
            />
          </div>
        )}

        <div className="px-4 pb-4">
          <p className="text-gray-900 leading-relaxed">{post.content}</p>
        </div>
      </button>

      {/* Reactions */}
      <div className="px-4 pb-4 border-t border-gray-100 pt-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onReaction('❤️')
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-gray-50 hover:bg-red-50 transition-colors"
            >
              <HeartIcon className="w-5 h-5 text-red-500" />
              <span className="text-sm font-medium text-gray-700">
                {post.reactions?.['❤️'] || 0}
              </span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onReaction('👍')
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-gray-50 hover:bg-blue-50 transition-colors"
            >
              <span>👍</span>
              <span className="text-sm font-medium text-gray-700">
                {post.reactions?.['👍'] || 0}
              </span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onReaction('😊')
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-gray-50 hover:bg-yellow-50 transition-colors"
            >
              <span>😊</span>
              <span className="text-sm font-medium text-gray-700">
                {post.reactions?.['😊'] || 0}
              </span>
            </button>
          </div>

          {post.comments_count > 0 && (
            <span className="flex items-center gap-1 text-sm text-gray-500">
              <ChatBubbleLeftIcon className="w-4 h-4" />
              {post.comments_count}
            </span>
          )}
        </div>
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
