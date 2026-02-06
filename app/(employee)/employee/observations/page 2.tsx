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
import { Eye, Star, AlertCircle, Share2, Plus, TrendingUp } from 'lucide-react'

export default function EmployeeObservationsPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Employee'])
  const { selectedNursery, isLoading: nurseryLoading } = useNursery()
  const [todayObservations, setTodayObservations] = useState<any[]>([])
  const [recentObservations, setRecentObservations] = useState<any[]>([])
  const [followUpNeeded, setFollowUpNeeded] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false) // Changed to false for now
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
  //     const today = await observationsService.getToday(selectedNursery.id)
  //     const recent = await observationsService.getByNursery(selectedNursery.id, 20)
  //     const followUp = await observationsService.getFollowUpNeeded(selectedNursery.id)
  //     setTodayObservations(today)
  //     setRecentObservations(recent)
  //     setFollowUpNeeded(followUp)
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
    switch (category) {
      case 'motor':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'language':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'social':
        return 'bg-pink-100 text-pink-800 border-pink-200'
      case 'emotional':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'cognitive':
        return 'bg-teal-100 text-teal-800 border-teal-200'
      case 'autonomy':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'creativity':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
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

  const getContextLabel = (context: string) => {
    const labels: Record<string, string> = {
      during_play: 'Pendant le jeu',
      during_meal: 'Pendant le repas',
      during_activity: 'Pendant l\'activité',
      free_time: 'Temps libre',
      outdoor: 'Extérieur',
      naptime: 'Sieste',
      arrival: 'Arrivée',
      departure: 'Départ'
    }
    return labels[context] || context
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Observations pédagogiques</h1>
        <p className="text-muted-foreground">
          Suivi du développement et observations quotidiennes - {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="p-6 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Aujourd'hui</p>
              <p className="text-3xl font-bold text-blue-900">{todayObservations.length}</p>
            </div>
            <Eye className="w-8 h-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-6 bg-yellow-50 border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Jalons</p>
              <p className="text-3xl font-bold text-yellow-900">
                {todayObservations.filter(o => o.milestone_achieved).length}
              </p>
            </div>
            <Star className="w-8 h-8 text-yellow-600" />
          </div>
        </Card>

        <Card className="p-6 bg-orange-50 border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Suivi requis</p>
              <p className="text-3xl font-bold text-orange-900">{followUpNeeded.length}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-orange-600" />
          </div>
        </Card>
      </div>

      {/* Error Message */}
      {error && (
        <Card className="p-4 mb-6 bg-red-50 border-red-200">
          <p className="text-red-800">{error}</p>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="today" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="today" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Aujourd'hui ({todayObservations.length})
          </TabsTrigger>
          <TabsTrigger value="recent" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Récentes ({recentObservations.length})
          </TabsTrigger>
          <TabsTrigger value="followup" className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            À suivre ({followUpNeeded.length})
          </TabsTrigger>
        </TabsList>

        {/* Today's Observations */}
        <TabsContent value="today">
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-xl font-semibold">Observations du jour</h2>
            <Button className="bg-[#b5ead7] hover:bg-[#a0dcc4] text-gray-900">
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle observation
            </Button>
          </div>

          {isLoading ? (
            <Card className="p-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Chargement...</p>
              </div>
            </Card>
          ) : todayObservations.length === 0 ? (
            <Card className="p-12 text-center bg-gray-50">
              <Eye className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucune observation enregistrée</h3>
              <p className="text-muted-foreground mb-4">
                Commencez à observer et documenter le développement des enfants.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {todayObservations.map((observation: any) => (
                <Card key={observation.id} className="p-6 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      {observation.child?.photo_url ? (
                        <img
                          src={observation.child.photo_url}
                          alt={`${observation.child.first_name} ${observation.child.last_name}`}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-blue-800 font-semibold text-lg">
                            {observation.child?.first_name?.[0]}
                            {observation.child?.last_name?.[0]}
                          </span>
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-lg">
                          {observation.child?.first_name} {observation.child?.last_name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {observation.observation_time || 'Heure non précisée'}
                          {observation.context && ` • ${getContextLabel(observation.context)}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge className={getCategoryColor(observation.category)}>
                        {getCategoryLabel(observation.category)}
                      </Badge>
                      {observation.milestone_achieved && (
                        <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                      )}
                      {observation.is_shared_with_parents && (
                        <Share2 className="w-5 h-5 text-blue-500" />
                      )}
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm">{observation.description}</p>
                  </div>

                  {observation.milestone_description && (
                    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Star className="w-4 h-4 text-yellow-600" />
                        <span className="text-sm font-semibold text-yellow-800">Jalon atteint</span>
                      </div>
                      <p className="text-sm text-yellow-900">{observation.milestone_description}</p>
                    </div>
                  )}

                  {observation.skills_demonstrated && observation.skills_demonstrated.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-muted-foreground mb-2">Compétences démontrées:</p>
                      <div className="flex flex-wrap gap-2">
                        {observation.skills_demonstrated.map((skill: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {observation.follow_up_needed && (
                    <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertCircle className="w-4 h-4 text-orange-600" />
                        <span className="text-sm font-semibold text-orange-800">Suivi recommandé</span>
                      </div>
                      {observation.recommendations && (
                        <p className="text-sm text-orange-900">{observation.recommendations}</p>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t">
                    <p className="text-xs text-muted-foreground">
                      Observé par: {observation.observed_by?.first_name} {observation.observed_by?.last_name}
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        Modifier
                      </Button>
                      {!observation.is_shared_with_parents && (
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                          <Share2 className="w-4 h-4 mr-2" />
                          Partager
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Recent Observations */}
        <TabsContent value="recent">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Observations récentes</h2>
            <p className="text-sm text-muted-foreground">
              Les 20 dernières observations de la crèche
            </p>
          </div>

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
                Les observations récentes apparaîtront ici.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {recentObservations.map((observation: any) => (
                <Card key={observation.id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3">
                    {observation.child?.photo_url ? (
                      <img
                        src={observation.child.photo_url}
                        alt={`${observation.child.first_name} ${observation.child.last_name}`}
                        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-800 font-semibold text-sm">
                          {observation.child?.first_name?.[0]}
                          {observation.child?.last_name?.[0]}
                        </span>
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold">
                          {observation.child?.first_name} {observation.child?.last_name}
                        </h4>
                        <div className="flex items-center gap-2">
                          <Badge className={getCategoryColor(observation.category)}>
                            {getCategoryLabel(observation.category)}
                          </Badge>
                          {observation.milestone_achieved && (
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {new Date(observation.observation_date).toLocaleDateString('fr-FR')}
                        {observation.observation_time && ` • ${observation.observation_time}`}
                      </p>
                      <p className="text-sm line-clamp-2">{observation.description}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Follow-up Needed */}
        <TabsContent value="followup">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Observations nécessitant un suivi</h2>
            <p className="text-sm text-muted-foreground">
              Points d'attention pour le développement des enfants
            </p>
          </div>

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
                Pas d'observation nécessitant un suivi particulier pour le moment.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {followUpNeeded.map((observation: any) => (
                <Card key={observation.id} className="p-6 border-orange-200 bg-orange-50">
                  <div className="flex items-start gap-3 mb-4">
                    {observation.child?.photo_url ? (
                      <img
                        src={observation.child.photo_url}
                        alt={`${observation.child.first_name} ${observation.child.last_name}`}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-orange-200 flex items-center justify-center">
                        <span className="text-orange-800 font-semibold text-lg">
                          {observation.child?.first_name?.[0]}
                          {observation.child?.last_name?.[0]}
                        </span>
                      </div>
                    )}

                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-lg">
                          {observation.child?.first_name} {observation.child?.last_name}
                        </h3>
                        <Badge className={getCategoryColor(observation.category)}>
                          {getCategoryLabel(observation.category)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(observation.observation_date).toLocaleDateString('fr-FR')}
                        {observation.observation_time && ` • ${observation.observation_time}`}
                      </p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm mb-3">{observation.description}</p>
                    {observation.recommendations && (
                      <div className="p-3 bg-white rounded-lg border border-orange-200">
                        <p className="text-xs font-semibold text-orange-800 mb-1">Recommandations:</p>
                        <p className="text-sm">{observation.recommendations}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-orange-200">
                    <p className="text-xs text-muted-foreground">
                      Par: {observation.observed_by?.first_name} {observation.observed_by?.last_name}
                    </p>
                    <Button size="sm" variant="outline" className="bg-white">
                      Voir détails
                    </Button>
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
