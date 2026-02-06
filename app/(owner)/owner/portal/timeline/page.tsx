'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
import { timelineService, type TimelinePost } from '@/lib/services/timeline.service'
import {
  PhotoIcon,
  EyeIcon,
  EyeSlashIcon,
  TrashIcon,
  ChatBubbleLeftRightIcon,
  FunnelIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageBreadcrumb } from '@/components/shared/PageBreadcrumb'

export default function TimelineModerationPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const { selectedNursery } = useNursery()
  const router = useRouter()

  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')

  useEffect(() => {
    if (selectedNursery?.id) {
      loadPosts()
    } else if (!authLoading && !selectedNursery) {
      setLoading(false)
    }
  }, [selectedNursery?.id, authLoading])

  async function loadPosts() {
    if (!selectedNursery?.id) return

    try {
      setLoading(true)
      const postsData = await timelineService.getPostsByNursery(selectedNursery.id)
      setPosts(postsData)
    } catch (error) {
      console.error('Error loading posts:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleTogglePublish(postId: string, currentStatus: boolean) {
    try {
      if (currentStatus) {
        await timelineService.unpublishPost(postId)
      } else {
        await timelineService.publishPost(postId)
      }
      await loadPosts()
    } catch (error) {
      console.error('Error toggling post publish status:', error)
    }
  }

  async function handleDeletePost(postId: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette publication ?')) return

    try {
      await timelineService.deletePost(postId)
      await loadPosts()
    } catch (error) {
      console.error('Error deleting post:', error)
    }
  }

  // Filter posts
  const filteredPosts = posts.filter(post => {
    const matchesSearch = searchTerm === '' ||
      post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.child?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.child?.last_name?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'published' && post.is_published) ||
      (filterStatus === 'pending' && !post.is_published)

    const matchesType = filterType === 'all' || post.post_type === filterType

    return matchesSearch && matchesStatus && matchesType
  })

  function formatDate(dateString: string): string {
    const date = new Date(dateString)
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  function getPostTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      activity: 'Activité',
      meal: 'Repas',
      nap: 'Sieste',
      photo: 'Photo',
      video: 'Vidéo',
      milestone: 'Étape',
      observation: 'Observation',
      artwork: 'Création',
      mood: 'Humeur',
      health_note: 'Santé'
    }
    return labels[type] || type
  }

  function getPostTypeColor(type: string): string {
    const colors: Record<string, string> = {
      activity: 'bg-blue-100 text-blue-800 border-blue-300',
      meal: 'bg-orange-100 text-orange-800 border-orange-300',
      nap: 'bg-purple-100 text-purple-800 border-purple-300',
      photo: 'bg-pink-100 text-pink-800 border-pink-300',
      video: 'bg-red-100 text-red-800 border-red-300',
      milestone: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      observation: 'bg-green-100 text-green-800 border-green-300',
      artwork: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      mood: 'bg-teal-100 text-teal-800 border-teal-300',
      health_note: 'bg-rose-100 text-rose-800 border-rose-300'
    }
    return colors[type] || 'bg-gray-100 text-gray-800 border-gray-300'
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Chargement des publications...</p>
        </div>
      </div>
    )
  }

  if (!selectedNursery) {
    return (
      <div className="p-6">
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <p className="text-yellow-800">Veuillez sélectionner une crèche.</p>
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
            { label: 'Portail Parents', href: '/owner/portal' },
            { label: 'Modération Timeline' }
          ]}
        />
        <div className="mt-4">
          <h1 className="text-2xl font-bold text-gray-900">Modération Timeline</h1>
          <p className="mt-2 text-gray-600">
            Gérez les publications du cahier de vie avant publication aux parents
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Publications</p>
                <p className="text-2xl font-bold text-gray-900">{posts.length}</p>
              </div>
              <PhotoIcon className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Publiées</p>
                <p className="text-2xl font-bold text-green-900">
                  {posts.filter(p => p.is_published).length}
                </p>
              </div>
              <EyeIcon className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">En attente</p>
                <p className="text-2xl font-bold text-yellow-900">
                  {posts.filter(p => !p.is_published).length}
                </p>
              </div>
              <EyeSlashIcon className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="published">Publiées</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="activity">Activité</SelectItem>
                <SelectItem value="meal">Repas</SelectItem>
                <SelectItem value="nap">Sieste</SelectItem>
                <SelectItem value="photo">Photo</SelectItem>
                <SelectItem value="observation">Observation</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Posts List */}
      {filteredPosts.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <PhotoIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Aucune publication trouvée</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredPosts.map(post => (
            <Card key={post.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className={getPostTypeColor(post.post_type)}>
                        {getPostTypeLabel(post.post_type)}
                      </Badge>
                      {post.is_published ? (
                        <Badge className="bg-green-600 text-white">
                          <EyeIcon className="h-3 w-3 mr-1" />
                          Publiée
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                          <EyeSlashIcon className="h-3 w-3 mr-1" />
                          Brouillon
                        </Badge>
                      )}
                    </div>

                    <h3 className="font-semibold text-lg text-gray-900">{post.title}</h3>

                    {post.child && (
                      <p className="text-sm text-gray-600 mt-1">
                        {post.child.first_name} {post.child.last_name}
                      </p>
                    )}

                    {post.content && (
                      <p className="text-gray-700 mt-2 line-clamp-2">{post.content}</p>
                    )}

                    <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                      <span>Par {post.employee?.first_name} {post.employee?.last_name}</span>
                      <span>•</span>
                      <span>{formatDate(post.created_at)}</span>
                      {post.media_urls && post.media_urls.length > 0 && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <PhotoIcon className="h-4 w-4" />
                            {post.media_urls.length} média(s)
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      variant={post.is_published ? 'outline' : 'default'}
                      onClick={() => handleTogglePublish(post.id, post.is_published)}
                      className="whitespace-nowrap"
                    >
                      {post.is_published ? (
                        <>
                          <EyeSlashIcon className="h-4 w-4 mr-1" />
                          Dépublier
                        </>
                      ) : (
                        <>
                          <EyeIcon className="h-4 w-4 mr-1" />
                          Publier
                        </>
                      )}
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/owner/children/${post.child_id}/timeline`)}
                    >
                      <ChatBubbleLeftRightIcon className="h-4 w-4 mr-1" />
                      Voir
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeletePost(post.id)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <TrashIcon className="h-4 w-4 mr-1" />
                      Supprimer
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
