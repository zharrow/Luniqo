'use client'

import { useEffect, useState } from 'react'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
// TODO: Implement server actions for data fetching
// import { observationsService } from '@/lib/services/observations.service'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Eye, Star, AlertCircle, Share2, TrendingUp, BarChart3, Download } from 'lucide-react'

export default function OwnerObservationsPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const { selectedNursery, isLoading: nurseryLoading } = useNursery()
  const [recentObservations, setRecentObservations] = useState<any[]>([])
  const [milestones, setMilestones] = useState<any[]>([])
  const [followUpNeeded, setFollowUpNeeded] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // TODO: Implement data fetching via server actions
  // useEffect(() => {
  //   if (selectedNursery?.id) {
  //     loadObservations()
  //   }
  // }, [selectedNursery?.id])

  // async function loadObservations() {
  //   if (!selectedNursery?.id) return
  //   try {
  //     setIsLoading(true)
  //     setError(null)
  //     const recent = await observationsService.getByNursery(selectedNursery.id, 50)
  //     const milestonesData = recent.filter(o => o.milestone_achieved)
  //     const followUp = await observationsService.getFollowUpNeeded(selectedNursery.id)
  //     const statistics = await observationsService.getStatistics(selectedNursery.id)
  //     setRecentObservations(recent)
  //     setMilestones(milestonesData)
  //     setFollowUpNeeded(followUp)
  //     setStats(statistics)
  //   } catch (err) {
  //     console.error('Error loading observations:', err)
  //     setError('Impossible de charger les observations')
  //   } finally {
  //     setIsLoading(false)
  //   }
  // }

  if (authLoading || nurseryLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!session || !selectedNursery) return null

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      motor: 'bg-orange-100 text-orange-800 border-orange-200',
      language: 'bg-blue-100 text-blue-800 border-blue-200',
      social: 'bg-pink-100 text-pink-800 border-pink-200',
      emotional: 'bg-purple-100 text-purple-800 border-purple-200',
      cognitive: 'bg-teal-100 text-teal-800 border-teal-200',
      autonomy: 'bg-green-100 text-green-800 border-green-200',
      creativity: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    }
    return colors[category] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      motor: 'Motricité',
      language: 'Langage',
      social: 'Social',
      emotional: 'Émotionnel',
      cognitive: 'Cognitif',
      autonomy: 'Autonomie',
      creativity: 'Créativité'
    }
    return labels[category] || category
  }

  // Mock stats
  const mockStats = {
    total: 156,
    milestones: 23,
    followUpNeeded: 8,
    sharedWithParents: 89,
    byCategory: {
      motor: 28,
      language: 35,
      social: 24,
      emotional: 18,
      cognitive: 22,
      autonomy: 17,
      creativity: 12
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Observations pédagogiques</h1>
            <p className="text-muted-foreground">
              Suivi du développement global - {selectedNursery.name}
            </p>
          </div>
          <Button className="bg-[#b5ead7] hover:bg-[#a0dcc4] text-gray-900">
            <Download className="w-4 h-4 mr-2" />
            Exporter rapport
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <Card className="p-4 mb-6 bg-red-50 border-red-200">
          <p className="text-red-800">{error}</p>
        </Card>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-6 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total observations</p>
              <p className="text-3xl font-bold text-blue-900">{mockStats.total}</p>
              <p className="text-xs text-blue-700 mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                +12 cette semaine
              </p>
            </div>
            <Eye className="w-8 h-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-6 bg-yellow-50 border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Jalons atteints</p>
              <p className="text-3xl font-bold text-yellow-900">{mockStats.milestones}</p>
              <p className="text-xs text-muted-foreground mt-1">
                14.7% des observations
              </p>
            </div>
            <Star className="w-8 h-8 text-yellow-600" />
          </div>
        </Card>

        <Card className="p-6 bg-orange-50 border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Suivi requis</p>
              <p className="text-3xl font-bold text-orange-900">{mockStats.followUpNeeded}</p>
              <p className="text-xs text-muted-foreground mt-1">
                À surveiller
              </p>
            </div>
            <AlertCircle className="w-8 h-8 text-orange-600" />
          </div>
        </Card>

        <Card className="p-6 bg-green-50 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Partagées</p>
              <p className="text-3xl font-bold text-green-900">{mockStats.sharedWithParents}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {((mockStats.sharedWithParents / mockStats.total) * 100).toFixed(0)}% du total
              </p>
            </div>
            <Share2 className="w-8 h-8 text-green-600" />
          </div>
        </Card>
      </div>

      {/* Category Distribution */}
      <Card className="p-6 mb-8">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Répartition par domaine de développement
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {Object.entries(mockStats.byCategory).map(([category, count]) => (
            <div
              key={category}
              className={`p-4 rounded-lg border ${getCategoryColor(category)}`}
            >
              <span className="font-semibold text-sm block mb-1">{getCategoryLabel(category)}</span>
              <p className="text-2xl font-bold">{count as number}</p>
              <p className="text-xs mt-1">
                {(((count as number) / mockStats.total) * 100).toFixed(0)}%
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="recent" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="recent">
            <Eye className="w-4 h-4 mr-2" />
            Récentes ({recentObservations.length})
          </TabsTrigger>
          <TabsTrigger value="milestones">
            <Star className="w-4 h-4 mr-2" />
            Jalons ({milestones.length})
          </TabsTrigger>
          <TabsTrigger value="followup">
            <AlertCircle className="w-4 h-4 mr-2" />
            À suivre ({followUpNeeded.length})
          </TabsTrigger>
        </TabsList>

        {/* Recent Observations */}
        <TabsContent value="recent">
          {isLoading ? (
            <Card className="p-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Chargement...</p>
              </div>
            </Card>
          ) : recentObservations.length === 0 ? (
            <Card className="p-12 text-center bg-gray-50">
              <Eye className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucune observation</h3>
              <p className="text-muted-foreground">
                Les observations pédagogiques apparaîtront ici.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {recentObservations.map((observation: any) => (
                <Card key={observation.id} className="p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4">
                    {observation.child?.photo_url ? (
                      <img
                        src={observation.child.photo_url}
                        alt={`${observation.child.first_name} ${observation.child.last_name}`}
                        className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-800 font-semibold">
                          {observation.child?.first_name?.[0]}
                          {observation.child?.last_name?.[0]}
                        </span>
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold">
                            {observation.child?.first_name} {observation.child?.last_name}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {new Date(observation.observation_date).toLocaleDateString('fr-FR')}
                            {observation.observation_time && ` • ${observation.observation_time}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getCategoryColor(observation.category)}>
                            {getCategoryLabel(observation.category)}
                          </Badge>
                          {observation.milestone_achieved && (
                            <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                          )}
                          {observation.is_shared_with_parents && (
                            <Share2 className="w-4 h-4 text-green-600" />
                          )}
                        </div>
                      </div>

                      <p className="text-sm mb-2">{observation.description}</p>

                      {observation.milestone_description && (
                        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                          <p className="text-xs font-semibold text-yellow-800 mb-1">Jalon atteint:</p>
                          <p className="text-sm text-yellow-900">{observation.milestone_description}</p>
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-3 pt-3 border-t">
                        <p className="text-xs text-muted-foreground">
                          Par: {observation.observed_by?.first_name} {observation.observed_by?.last_name}
                        </p>
                        <Button variant="outline" size="sm">
                          Voir détails
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Milestones */}
        <TabsContent value="milestones">
          {isLoading ? (
            <Card className="p-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Chargement...</p>
              </div>
            </Card>
          ) : milestones.length === 0 ? (
            <Card className="p-12 text-center bg-gray-50">
              <Star className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucun jalon enregistré</h3>
              <p className="text-muted-foreground">
                Les jalons de développement importants apparaîtront ici.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {milestones.map((observation: any) => (
                <Card key={observation.id} className="p-5 bg-yellow-50 border-yellow-200">
                  <div className="flex items-start gap-3 mb-3">
                    <Star className="w-6 h-6 text-yellow-600 fill-yellow-600 flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold">
                          {observation.child?.first_name} {observation.child?.last_name}
                        </h4>
                        <Badge className={getCategoryColor(observation.category)}>
                          {getCategoryLabel(observation.category)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {new Date(observation.observation_date).toLocaleDateString('fr-FR')}
                      </p>
                      <p className="text-sm font-semibold text-yellow-900 mb-2">
                        {observation.milestone_description}
                      </p>
                      <p className="text-sm">{observation.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-yellow-200">
                    <p className="text-xs text-muted-foreground">
                      {observation.observed_by?.first_name} {observation.observed_by?.last_name}
                    </p>
                    {!observation.is_shared_with_parents && (
                      <Button size="sm" className="bg-green-600 hover:bg-green-700">
                        <Share2 className="w-3 h-3 mr-2" />
                        Partager
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Follow-up Needed */}
        <TabsContent value="followup">
          {isLoading ? (
            <Card className="p-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Chargement...</p>
              </div>
            </Card>
          ) : followUpNeeded.length === 0 ? (
            <Card className="p-12 text-center bg-gray-50">
              <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucun suivi requis</h3>
              <p className="text-muted-foreground">
                Aucune observation ne nécessite un suivi particulier pour le moment.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {followUpNeeded.map((observation: any) => (
                <Card key={observation.id} className="p-6 bg-orange-50 border-orange-200">
                  <div className="flex items-start gap-3 mb-4">
                    <AlertCircle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-lg">
                          {observation.child?.first_name} {observation.child?.last_name}
                        </h4>
                        <Badge className={getCategoryColor(observation.category)}>
                          {getCategoryLabel(observation.category)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {new Date(observation.observation_date).toLocaleDateString('fr-FR')}
                        {observation.observation_time && ` • ${observation.observation_time}`}
                      </p>
                      <p className="text-sm mb-3">{observation.description}</p>
                      {observation.recommendations && (
                        <div className="p-3 bg-white rounded border border-orange-200">
                          <p className="text-xs font-semibold text-orange-800 mb-1">Recommandations:</p>
                          <p className="text-sm">{observation.recommendations}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-orange-200">
                    <p className="text-xs text-muted-foreground">
                      Observé par: {observation.observed_by?.first_name} {observation.observed_by?.last_name}
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        Marquer résolu
                      </Button>
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                        Voir détails
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
