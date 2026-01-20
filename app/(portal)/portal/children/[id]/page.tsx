'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  CalendarIcon,
  UserGroupIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  ClockIcon,
  PhotoIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  ChevronLeftIcon,
  HeartIcon
} from '@heroicons/react/24/outline'

export default function ChildProfilePage() {
  const [isLoading, setIsLoading] = useState(true)
  const [child, setChild] = useState<any>(null)
  const [recentPosts, setRecentPosts] = useState<any[]>([])
  const [stats, setStats] = useState({
    total_posts: 0,
    total_photos: 0,
    total_videos: 0
  })

  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  const childId = params.id as string

  useEffect(() => {
    loadChild()
  }, [childId])

  async function loadChild() {
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

      // Load child with full details
      const { data: childData } = await supabase
        .from('child')
        .select(`
          *,
          nursery:nursery_id (
            name,
            address,
            city,
            postal_code,
            phone,
            email
          )
        `)
        .eq('id', childId)
        .single()

      if (!childData) {
        router.push('/portal/children')
        return
      }

      // Verify guardian has access to this child
      const { data: guardianChild } = await supabase
        .from('guardian_child')
        .select('*')
        .eq('guardian_id', (guardianUser as any).guardian_id)
        .eq('child_id', childId)
        .single()

      if (!guardianChild) {
        router.push('/portal/children')
        return
      }

      setChild({ ...(childData as any), relationship: (guardianChild as any).relationship })

      // Load recent posts
      const { data: postsData } = await supabase
        .from('timeline_post')
        .select('*')
        .eq('child_id', childId)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(5)

      if (postsData) {
        setRecentPosts(postsData)

        // Calculate stats
        const photoCount = (postsData as any[]).filter((p: any) => p.media_urls && p.media_urls.length > 0).length
        const videoCount = (postsData as any[]).filter((p: any) => p.post_type === 'video').length

        setStats({
          total_posts: postsData.length,
          total_photos: photoCount,
          total_videos: videoCount
        })
      }

      setIsLoading(false)
    } catch (error) {
      console.error('Failed to load child:', error)
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

  if (!child) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Enfant non trouvé</p>
      </div>
    )
  }

  const age = child.birth_date ? getAge(child.birth_date) : null

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => router.push('/portal/children')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ChevronLeftIcon className="w-5 h-5" />
        <span className="text-sm font-medium">Retour</span>
      </button>

      {/* Profile Header */}
      <div className="bg-gradient-to-r from-[#5a9dc9] to-[#2c5f7f] rounded-3xl p-6 text-white shadow-lg">
        <div className="flex items-start gap-5">
          {child.photo_url ? (
            <img
              src={child.photo_url}
              alt={`${child.first_name} ${child.last_name}`}
              className="w-24 h-24 rounded-2xl object-cover border-3 border-white shadow-lg"
            />
          ) : (
            <div className="w-24 h-24 rounded-2xl bg-white/20 flex items-center justify-center text-3xl font-bold">
              {child.first_name?.[0]}{child.last_name?.[0]}
            </div>
          )}

          <div className="flex-1">
            <h1 className="text-2xl font-bold mb-2">
              {child.first_name} {child.last_name}
            </h1>
            <div className="flex flex-wrap gap-3 text-sm text-white/90">
              {age && (
                <span className="flex items-center gap-1">
                  <CalendarIcon className="w-4 h-4" />
                  {age}
                </span>
              )}
              {child.gender && (
                <span>{child.gender === 'male' ? 'Garçon' : 'Fille'}</span>
              )}
              {child.group && (
                <span className="px-3 py-1 bg-white/20 rounded-full font-medium">
                  {child.group}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3">
        <ActionButton
          icon={<PhotoIcon className="w-6 h-6" />}
          label="Timeline"
          count={stats.total_posts}
          onClick={() => router.push(`/portal/timeline/${child.id}`)}
        />
        <ActionButton
          icon={<ChatBubbleLeftRightIcon className="w-6 h-6" />}
          label="Messages"
          onClick={() => router.push('/portal/messages')}
        />
        <ActionButton
          icon={<DocumentTextIcon className="w-6 h-6" />}
          label="Documents"
          onClick={() => router.push('/portal/documents')}
        />
      </div>

      {/* Information */}
      <section className="bg-white rounded-2xl p-5 border border-gray-200">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Informations</h2>
        <div className="space-y-4">
          {child.birth_date && (
            <InfoRow
              icon={<CalendarIcon className="w-5 h-5 text-gray-400" />}
              label="Date de naissance"
              value={new Date(child.birth_date).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            />
          )}
          {child.relationship && (
            <InfoRow
              icon={<UserGroupIcon className="w-5 h-5 text-gray-400" />}
              label="Lien de parenté"
              value={child.relationship}
            />
          )}
          {child.enrollment_date && (
            <InfoRow
              icon={<ClockIcon className="w-5 h-5 text-gray-400" />}
              label="Date d'inscription"
              value={new Date(child.enrollment_date).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            />
          )}
        </div>
      </section>

      {/* Nursery Info */}
      {child.nursery && (
        <section className="bg-white rounded-2xl p-5 border border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Crèche</h2>
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">{child.nursery.name}</h3>
            {child.nursery.address && (
              <InfoRow
                icon={<MapPinIcon className="w-5 h-5 text-gray-400" />}
                label="Adresse"
                value={`${child.nursery.address}, ${child.nursery.postal_code} ${child.nursery.city}`}
              />
            )}
            {child.nursery.phone && (
              <InfoRow
                icon={<PhoneIcon className="w-5 h-5 text-gray-400" />}
                label="Téléphone"
                value={child.nursery.phone}
                href={`tel:${child.nursery.phone}`}
              />
            )}
            {child.nursery.email && (
              <InfoRow
                icon={<EnvelopeIcon className="w-5 h-5 text-gray-400" />}
                label="Email"
                value={child.nursery.email}
                href={`mailto:${child.nursery.email}`}
              />
            )}
          </div>
        </section>
      )}

      {/* Recent Posts */}
      {recentPosts.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Activité récente</h2>
            <button
              onClick={() => router.push(`/portal/timeline/${child.id}`)}
              className="text-sm text-[#5a9dc9] hover:text-[#2c5f7f] font-medium"
            >
              Voir tout
            </button>
          </div>
          <div className="space-y-3">
            {recentPosts.slice(0, 3).map((post: any) => (
              <PostPreview
                key={post.id}
                post={post}
                onClick={() => router.push(`/portal/timeline/${post.id}`)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function ActionButton({ icon, label, count, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-2xl p-4 border border-gray-200 hover:border-[#5a9dc9] hover:shadow-md transition-all duration-300"
    >
      <div className="flex flex-col items-center gap-2 text-gray-700">
        {icon}
        <span className="text-xs font-medium">{label}</span>
        {count !== undefined && (
          <span className="text-lg font-bold text-[#5a9dc9]">{count}</span>
        )}
      </div>
    </button>
  )
}

function InfoRow({ icon, label, value, href }: any) {
  const content = (
    <div className="flex items-start gap-3">
      {icon}
      <div className="flex-1">
        <p className="text-xs text-gray-500 mb-1">{label}</p>
        <p className={`text-sm ${href ? 'text-[#5a9dc9] hover:underline' : 'text-gray-900'}`}>
          {value}
        </p>
      </div>
    </div>
  )

  if (href) {
    return <a href={href}>{content}</a>
  }

  return content
}

function PostPreview({ post, onClick }: any) {
  const timeAgo = getTimeAgo(post.created_at)

  return (
    <button
      onClick={onClick}
      className="w-full bg-gray-50 rounded-xl p-3 border border-gray-200 hover:border-[#5a9dc9] hover:bg-white transition-all duration-300 text-left"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="px-2 py-1 bg-[#f4a5a5]/10 text-[#c66b6b] rounded-full text-xs font-medium">
          {getPostTypeLabel(post.post_type)}
        </span>
        <span className="text-xs text-gray-500 flex items-center gap-1">
          <ClockIcon className="w-3 h-3" />
          {timeAgo}
        </span>
      </div>
      <p className="text-sm text-gray-700 line-clamp-2">{post.content}</p>
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
