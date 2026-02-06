'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
import { parentPortalService } from '@/lib/services/parent-portal.service'
import { parentMessagingService } from '@/lib/services/parent-messaging.service'
import { timelineService } from '@/lib/services/timeline.service'
import {
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  PhotoIcon,
  UsersIcon,
  BellIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageBreadcrumb } from '@/components/shared/PageBreadcrumb'

interface PortalStats {
  total_guardians: number
  active_guardians: number
  avg_posts_per_child: number
  total_messages: number
  engagement_rate: number
}

interface RecentPosts {
  total: number
  published: number
  pending: number
}

interface UnreadMessages {
  total: number
  urgent: number
}

export default function PortalDashboardPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const { selectedNursery } = useNursery()
  const router = useRouter()

  const [stats, setStats] = useState<PortalStats | null>(null)
  const [recentPosts, setRecentPosts] = useState<RecentPosts | null>(null)
  const [unreadMessages, setUnreadMessages] = useState<UnreadMessages | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (selectedNursery?.id) {
      loadData()
    } else if (!authLoading && !selectedNursery) {
      setLoading(false)
    }
  }, [selectedNursery?.id, authLoading])

  async function loadData() {
    if (!selectedNursery?.id) return

    try {
      setLoading(true)

      // Get portal usage stats
      const portalStats = await parentPortalService.getPortalUsageStats(selectedNursery.id)
      setStats(portalStats)

      // Get recent posts stats
      const posts = await timelineService.getPostsByNursery(selectedNursery.id)
      const postsStats = {
        total: posts.length,
        published: posts.filter(p => p.is_published).length,
        pending: posts.filter(p => !p.is_published).length
      }
      setRecentPosts(postsStats)

      // Get messages stats
      const messages = await parentMessagingService.getNurseryMessages(selectedNursery.id)
      const messagesStats = {
        total: messages.filter(m => !m.is_read && m.recipient_employee_id).length,
        urgent: messages.filter(m => !m.is_read && m.category === 'urgent' && m.recipient_employee_id).length
      }
      setUnreadMessages(messagesStats)

    } catch (error) {
      console.error('Error loading portal data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Chargement du portail...</p>
        </div>
      </div>
    )
  }

  if (!selectedNursery) {
    return (
      <div className="p-6">
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <p className="text-yellow-800">Veuillez sélectionner une crèche pour voir les données du portail parents.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <PageBreadcrumb
          items={[
            { label: 'Accueil', href: '/owner/dashboard' },
            { label: 'Portail Parents' }
          ]}
        />
        <div className="flex items-center justify-between mb-8 mt-4">
          <div className="flex items-center gap-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-pink-100">
              <UsersIcon className="w-6 h-6 text-pink-600" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Portail Parents</h1>
              <p className="text-sm text-muted-foreground">
                Gérez la communication avec les familles et partagez le quotidien des enfants
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Active Guardians */}
        <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-blue-900">
              Parents Actifs
            </CardTitle>
            <UsersIcon className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900">
              {stats?.active_guardians || 0}
            </div>
            <p className="text-xs text-blue-700 mt-1">
              sur {stats?.total_guardians || 0} inscrits
            </p>
            <div className="mt-2">
              <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                {stats?.engagement_rate || 0}% d'engagement
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Posts */}
        <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-purple-900">
              Publications
            </CardTitle>
            <PhotoIcon className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-900">
              {recentPosts?.published || 0}
            </div>
            <p className="text-xs text-purple-700 mt-1">
              {recentPosts?.pending || 0} en attente
            </p>
            <div className="mt-2">
              <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">
                {stats?.avg_posts_per_child.toFixed(1) || 0} posts/enfant
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Messages */}
        <Card className="bg-gradient-to-br from-pink-50 to-white border-pink-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-pink-900">
              Messages Non Lus
            </CardTitle>
            <ChatBubbleLeftRightIcon className="h-5 w-5 text-pink-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-pink-900">
              {unreadMessages?.total || 0}
            </div>
            <p className="text-xs text-pink-700 mt-1">
              {unreadMessages?.urgent || 0} urgents
            </p>
            <div className="mt-2">
              <Badge variant="outline" className="bg-pink-100 text-pink-800 border-pink-300">
                {stats?.total_messages || 0} au total
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Engagement */}
        <Card className="bg-gradient-to-br from-green-50 to-white border-green-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-green-900">
              Taux d'Engagement
            </CardTitle>
            <ArrowTrendingUpIcon className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900">
              {stats?.engagement_rate.toFixed(0) || 0}%
            </div>
            <p className="text-xs text-green-700 mt-1">
              Parents actifs / 30j
            </p>
            <div className="mt-2">
              {stats && stats.engagement_rate >= 70 ? (
                <Badge className="bg-green-600 text-white">
                  Excellent
                </Badge>
              ) : stats && stats.engagement_rate >= 50 ? (
                <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                  Bon
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
                  À améliorer
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellIcon className="h-5 w-5 text-blue-600" />
            Actions Rapides
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button
              onClick={() => router.push('/owner/portal/timeline')}
              variant="outline"
              className="h-auto py-4 px-6 flex flex-col items-start gap-2 border-purple-200 hover:bg-purple-50"
            >
              <div className="flex items-center gap-2 w-full">
                <PhotoIcon className="h-5 w-5 text-purple-600" />
                <span className="font-semibold text-purple-900">Modérer Timeline</span>
              </div>
              <p className="text-xs text-left text-gray-600">
                Gérer les publications et commentaires
              </p>
            </Button>

            <Button
              onClick={() => router.push('/owner/portal/messages')}
              variant="outline"
              className="h-auto py-4 px-6 flex flex-col items-start gap-2 border-pink-200 hover:bg-pink-50"
            >
              <div className="flex items-center gap-2 w-full">
                <ChatBubbleLeftRightIcon className="h-5 w-5 text-pink-600" />
                <span className="font-semibold text-pink-900">Messagerie</span>
                {unreadMessages && unreadMessages.total > 0 && (
                  <Badge className="bg-pink-600 text-white ml-auto">
                    {unreadMessages.total}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-left text-gray-600">
                Répondre aux messages des parents
              </p>
            </Button>

            <Button
              onClick={() => router.push('/owner/portal/documents')}
              variant="outline"
              className="h-auto py-4 px-6 flex flex-col items-start gap-2 border-blue-200 hover:bg-blue-50"
            >
              <div className="flex items-center gap-2 w-full">
                <DocumentTextIcon className="h-5 w-5 text-blue-600" />
                <span className="font-semibold text-blue-900">Documents</span>
              </div>
              <p className="text-xs text-left text-gray-600">
                Partager documents avec les familles
              </p>
            </Button>

            <Button
              onClick={() => router.push('/owner/portal/certificates')}
              variant="outline"
              className="h-auto py-4 px-6 flex flex-col items-start gap-2 border-green-200 hover:bg-green-50"
            >
              <div className="flex items-center gap-2 w-full">
                <DocumentTextIcon className="h-5 w-5 text-green-600" />
                <span className="font-semibold text-green-900">Attestations</span>
              </div>
              <p className="text-xs text-left text-gray-600">
                Générer attestations fiscales et CAF
              </p>
            </Button>

            <Button
              onClick={() => router.push('/owner/portal/documents/share')}
              variant="outline"
              className="h-auto py-4 px-6 flex flex-col items-start gap-2 border-yellow-200 hover:bg-yellow-50"
            >
              <div className="flex items-center gap-2 w-full">
                <ChartBarIcon className="h-5 w-5 text-yellow-600" />
                <span className="font-semibold text-yellow-900">Nouveau Document</span>
              </div>
              <p className="text-xs text-left text-gray-600">
                Partager un document avec les familles
              </p>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info Banner */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <BellIcon className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900">Portail Parents Activé</h3>
              <p className="text-sm text-blue-700 mt-1">
                Les parents peuvent maintenant accéder au cahier de vie, recevoir des notifications et communiquer avec l'équipe depuis leur application mobile.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
