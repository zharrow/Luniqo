'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  BellIcon,
  PhotoIcon,
  CalendarIcon,
  HeartIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { parentPortalService } from '@/lib/services/parent-portal.service'

export default function PortalHomePage() {
  const [isLoading, setIsLoading] = useState(true)
  const [dashboard, setDashboard] = useState<any>(null)
  const [children, setChildren] = useState<any[]>([])
  const [recentPosts, setRecentPosts] = useState<any[]>([])
  const [guardianId, setGuardianId] = useState<string>('')

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
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

      // Load dashboard data
      const dashboardData = await parentPortalService.getDashboard((guardianUser as any).guardian_id)
      setDashboard(dashboardData)

      // Load children
      const { data: childrenData } = await supabase
        .from('guardian_child')
        .select(`
          child:child_id (
            id,
            first_name,
            last_name,
            birth_date,
            photo_url,
            group
          )
        `)
        .eq('guardian_id', (guardianUser as any).guardian_id)

      if (childrenData) {
        setChildren(childrenData.map((gc: any) => gc.child).filter(Boolean))
      }

      // Load recent timeline posts (last 3)
      const { data: postsData } = await supabase
        .from('timeline_post')
        .select(`
          *,
          child:child_id (first_name, last_name, photo_url),
          posted_by:posted_by_employee_id (first_name, last_name)
        `)
        .in('child_id', (childrenData || []).map((gc: any) => gc.child?.id).filter(Boolean))
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(3)

      if (postsData) {
        setRecentPosts(postsData)
      }

      setIsLoading(false)
    } catch (error) {
      console.error('Failed to load dashboard:', error)
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
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-[#5a9dc9] to-[#2c5f7f] rounded-3xl p-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold mb-2">Bienvenue !</h1>
        <p className="text-white/90">
          Suivez la journée de {children.length > 1 ? 'vos enfants' : 'votre enfant'} en temps réel
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          icon={<ChatBubbleLeftRightIcon className="w-6 h-6" />}
          label="Messages"
          value={dashboard?.unread_messages_count || 0}
          color="bg-gradient-to-br from-[#b5e7a0] to-[#81c995]"
          onClick={() => router.push('/portal/messages')}
        />
        <StatCard
          icon={<BellIcon className="w-6 h-6" />}
          label="Notifications"
          value={dashboard?.unread_notifications_count || 0}
          color="bg-gradient-to-br from-[#f4a5a5] to-[#d88989]"
          onClick={() => router.push('/portal/profile')}
        />
        <StatCard
          icon={<PhotoIcon className="w-6 h-6" />}
          label="Photos"
          value={dashboard?.total_posts_count || 0}
          color="bg-gradient-to-br from-[#ffe5b4] to-[#ffd580]"
          onClick={() => router.push('/portal/timeline')}
        />
        <StatCard
          icon={<DocumentTextIcon className="w-6 h-6" />}
          label="Documents"
          value={dashboard?.unread_documents_count || 0}
          color="bg-gradient-to-br from-[#d4a5f4] to-[#b88cd6]"
          onClick={() => router.push('/portal/documents')}
        />
      </div>

      {/* My Children */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Mes enfants</h2>
          <button
            onClick={() => router.push('/portal/children')}
            className="text-sm text-[#5a9dc9] hover:text-[#2c5f7f] font-medium"
          >
            Voir tout
          </button>
        </div>

        {children.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-gray-200">
            <UserGroupIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">Aucun enfant associé</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {children.map((child: any) => (
              <ChildCard key={child.id} child={child} onClick={() => router.push(`/portal/children/${child.id}`)} />
            ))}
          </div>
        )}
      </section>

      {/* Recent Activity */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Activité récente</h2>
          <button
            onClick={() => router.push('/portal/timeline')}
            className="text-sm text-[#5a9dc9] hover:text-[#2c5f7f] font-medium"
          >
            Voir tout
          </button>
        </div>

        {recentPosts.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-gray-200">
            <PhotoIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">Aucune activité récente</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentPosts.map((post: any) => (
              <TimelinePostCard
                key={post.id}
                post={post}
                onClick={() => router.push(`/portal/timeline/${post.id}`)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function StatCard({ icon, label, value, color, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`${color} rounded-2xl p-5 text-white shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1`}
    >
      <div className="flex flex-col items-start gap-2">
        {icon}
        <div>
          <p className="text-3xl font-bold">{value}</p>
          <p className="text-sm text-white/90">{label}</p>
        </div>
      </div>
    </button>
  )
}

function ChildCard({ child, onClick }: any) {
  const age = child.birth_date ? getAge(child.birth_date) : null

  return (
    <button
      onClick={onClick}
      className="bg-white rounded-2xl p-4 border border-gray-200 hover:border-[#5a9dc9] hover:shadow-md transition-all duration-300 text-left"
    >
      <div className="flex items-center gap-4">
        {child.photo_url ? (
          <img
            src={child.photo_url}
            alt={`${child.first_name} ${child.last_name}`}
            className="w-16 h-16 rounded-full object-cover border-2 border-[#5a9dc9]/20"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#5a9dc9] to-[#2c5f7f] flex items-center justify-center text-white text-xl font-bold">
            {child.first_name?.[0]}{child.last_name?.[0]}
          </div>
        )}
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">
            {child.first_name} {child.last_name}
          </h3>
          <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
            {age && (
              <span className="flex items-center gap-1">
                <CalendarIcon className="w-4 h-4" />
                {age}
              </span>
            )}
            {child.group && (
              <span className="px-2 py-0.5 bg-[#5a9dc9]/10 text-[#2c5f7f] rounded-full text-xs font-medium">
                {child.group}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

function TimelinePostCard({ post, onClick }: any) {
  const timeAgo = getTimeAgo(post.created_at)

  return (
    <button
      onClick={onClick}
      className="bg-white rounded-2xl p-4 border border-gray-200 hover:border-[#5a9dc9] hover:shadow-md transition-all duration-300 text-left w-full"
    >
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
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="font-semibold text-gray-900">
              {post.child?.first_name} {post.child?.last_name}
            </p>
            <span className="text-xs text-gray-500 flex items-center gap-1 flex-shrink-0">
              <ClockIcon className="w-3 h-3" />
              {timeAgo}
            </span>
          </div>
          <p className="text-sm text-gray-700 mb-2 line-clamp-2">{post.content}</p>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#f4a5a5]/10 text-[#c66b6b] rounded-full text-xs font-medium">
              {getPostTypeLabel(post.post_type)}
            </span>
            {post.reactions && Object.keys(post.reactions).length > 0 && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <HeartIcon className="w-4 h-4" />
                {Object.values(post.reactions).reduce((a: any, b: any) => a + b, 0) as number}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

function getAge(birthDate: string): string {
  const today = new Date()
  const birth = new Date(birthDate)
  const diffMs = today.getTime() - birth.getTime()
  const ageDate = new Date(diffMs)
  const years = Math.abs(ageDate.getUTCFullYear() - 1970)
  const months = ageDate.getUTCMonth()

  if (years > 0) {
    return `${years} an${years > 1 ? 's' : ''}`
  }
  return `${months} mois`
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
