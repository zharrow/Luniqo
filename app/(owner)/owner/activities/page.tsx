'use client'

import { useEffect, useState } from 'react'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
// TODO: Implement server actions for data fetching
// import { activitiesService } from '@/lib/services/activities.service'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Calendar, BarChart3, Palette, Music, TreePine, BookOpen, Beaker, Footprints, Sparkles, MessageSquare, Users } from 'lucide-react'

export default function OwnerActivitiesPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const { selectedNursery, isLoading: nurseryLoading } = useNursery()
  const [upcomingActivities, setUpcomingActivities] = useState<any[]>([])
  const [allActivities, setAllActivities] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // TODO: Implement data fetching via server actions
  // useEffect(() => {
  //   if (selectedNursery?.id) {
  //     loadActivities()
  //   }
  // }, [selectedNursery?.id])

  // async function loadActivities() {
  //   if (!selectedNursery?.id) return
  //   try {
  //     setIsLoading(true)
  //     setError(null)
  //     const upcoming = await activitiesService.getUpcoming(selectedNursery.id)
  //     const all = await activitiesService.getAll(selectedNursery.id)
  //     const statistics = await activitiesService.getStatistics(selectedNursery.id)
  //     setUpcomingActivities(upcoming)
  //     setAllActivities(all)
  //     setStats(statistics)
  //   } catch (err) {
  //     console.error('Error loading activities:', err)
  //     setError('Impossible de charger les activités')
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

  const getCategoryIcon = (category: string) => {
    const iconMap: Record<string, any> = {
      arts: Palette,
      music: Music,
      outdoor: TreePine,
      reading: BookOpen,
      science: Beaker,
      motor_skills: Footprints,
      sensory: Sparkles,
      language: MessageSquare,
      social: Users
    }
    const Icon = iconMap[category] || Sparkles
    return <Icon className="w-5 h-5" />
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      arts: 'bg-purple-100 text-purple-800 border-purple-200',
      music: 'bg-pink-100 text-pink-800 border-pink-200',
      outdoor: 'bg-green-100 text-green-800 border-green-200',
      reading: 'bg-blue-100 text-blue-800 border-blue-200',
      science: 'bg-teal-100 text-teal-800 border-teal-200',
      motor_skills: 'bg-orange-100 text-orange-800 border-orange-200',
      sensory: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      language: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      social: 'bg-rose-100 text-rose-800 border-rose-200'
    }
    return colors[category] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      arts: 'Arts plastiques',
      music: 'Musique',
      outdoor: 'Extérieur',
      reading: 'Lecture',
      science: 'Sciences',
      motor_skills: 'Motricité',
      sensory: 'Sensoriel',
      language: 'Langage',
      social: 'Social',
      cooking: 'Cuisine'
    }
    return labels[category] || category
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'planned':
        return <Badge className="bg-blue-100 text-blue-800">Planifiée</Badge>
      case 'in_progress':
        return <Badge className="bg-green-100 text-green-800">En cours</Badge>
      case 'completed':
        return <Badge className="bg-gray-100 text-gray-800">Terminée</Badge>
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800">Annulée</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Mock stats
  const mockStats = {
    total: 45,
    planned: 12,
    completed: 28,
    cancelled: 5,
    byCategory: {
      arts: 8,
      music: 6,
      outdoor: 12,
      reading: 7,
      science: 3,
      motor_skills: 5,
      sensory: 2,
      language: 1,
      social: 1
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-100">
            <Calendar className="w-6 h-6 text-amber-600" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Planification des activités</h1>
            <p className="text-sm text-muted-foreground">
              Gestion du programme pédagogique - {selectedNursery.name}
            </p>
          </div>
        </div>
        <Button className="bg-[#ffe5b4] hover:bg-[#ffd89b] text-gray-900">
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle activité
        </Button>
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
              <p className="text-sm text-muted-foreground mb-1">Total activités</p>
              <p className="text-3xl font-bold text-blue-900">{mockStats.total}</p>
            </div>
            <Calendar className="w-8 h-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-6 bg-yellow-50 border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Planifiées</p>
              <p className="text-3xl font-bold text-yellow-900">{mockStats.planned}</p>
            </div>
            <Calendar className="w-8 h-8 text-yellow-600" />
          </div>
        </Card>

        <Card className="p-6 bg-green-50 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Terminées</p>
              <p className="text-3xl font-bold text-green-900">{mockStats.completed}</p>
            </div>
            <Sparkles className="w-8 h-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-6 bg-purple-50 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Catégories</p>
              <p className="text-3xl font-bold text-purple-900">9</p>
            </div>
            <BarChart3 className="w-8 h-8 text-purple-600" />
          </div>
        </Card>
      </div>

      {/* Category Distribution */}
      <Card className="p-6 mb-8">
        <h3 className="text-lg font-semibold mb-4">Répartition par catégorie</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {Object.entries(mockStats.byCategory).map(([category, count]) => (
            <div
              key={category}
              className={`p-4 rounded-lg border ${getCategoryColor(category)}`}
            >
              <div className="flex items-center gap-2 mb-2">
                {getCategoryIcon(category)}
                <span className="font-semibold text-sm">{getCategoryLabel(category)}</span>
              </div>
              <p className="text-2xl font-bold">{count as number}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="upcoming">
            À venir ({upcomingActivities.length})
          </TabsTrigger>
          <TabsTrigger value="all">
            Toutes les activités ({allActivities.length})
          </TabsTrigger>
        </TabsList>

        {/* Upcoming Activities */}
        <TabsContent value="upcoming">
          {isLoading ? (
            <Card className="p-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Chargement...</p>
              </div>
            </Card>
          ) : upcomingActivities.length === 0 ? (
            <Card className="p-12 text-center bg-gray-50">
              <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucune activité planifiée</h3>
              <p className="text-muted-foreground mb-4">
                Commencez à planifier des activités pédagogiques.
              </p>
              <Button className="bg-[#ffe5b4] hover:bg-[#ffd89b] text-gray-900">
                <Plus className="w-4 h-4 mr-2" />
                Créer une activité
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {upcomingActivities.map((activity: any) => (
                <Card key={activity.id} className="p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`p-3 rounded-lg ${getCategoryColor(activity.category)}`}>
                        {getCategoryIcon(activity.category)}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold text-lg">{activity.name}</h3>
                          {getStatusBadge(activity.status)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>
                            {new Date(activity.planned_date).toLocaleDateString('fr-FR', {
                              weekday: 'long',
                              day: 'numeric',
                              month: 'long'
                            })}
                          </span>
                          {activity.planned_time && <span>{activity.planned_time}</span>}
                          {activity.duration_minutes && <span>{activity.duration_minutes} min</span>}
                          {activity.age_group && (
                            <Badge variant="outline" className="text-xs">
                              {activity.age_group === 'babies' && 'Bébés'}
                              {activity.age_group === 'toddlers' && 'Moyens'}
                              {activity.age_group === 'preschool' && 'Grands'}
                              {activity.age_group === 'all' && 'Tous'}
                            </Badge>
                          )}
                        </div>
                        {activity.led_by && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Animé par: {activity.led_by.first_name} {activity.led_by.last_name}
                          </p>
                        )}
                      </div>

                      <Badge className={getCategoryColor(activity.category)}>
                        {getCategoryLabel(activity.category)}
                      </Badge>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <Button variant="outline" size="sm">
                        Modifier
                      </Button>
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                        Voir détails
                      </Button>
                    </div>
                  </div>

                  {activity.description && (
                    <p className="text-sm text-muted-foreground mt-3 ml-[68px]">
                      {activity.description}
                    </p>
                  )}

                  {activity.learning_objectives && activity.learning_objectives.length > 0 && (
                    <div className="mt-3 ml-[68px]">
                      <p className="text-xs font-semibold text-muted-foreground mb-2">Objectifs pédagogiques:</p>
                      <div className="flex flex-wrap gap-2">
                        {activity.learning_objectives.map((objective: string, idx: number) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {objective}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* All Activities */}
        <TabsContent value="all">
          {isLoading ? (
            <Card className="p-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Chargement...</p>
              </div>
            </Card>
          ) : allActivities.length === 0 ? (
            <Card className="p-12 text-center bg-gray-50">
              <Sparkles className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucune activité</h3>
              <p className="text-muted-foreground">
                L'historique des activités apparaîtra ici.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {allActivities.map((activity: any) => (
                <Card key={activity.id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`p-2 rounded ${getCategoryColor(activity.category)}`}>
                        {getCategoryIcon(activity.category)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold truncate">{activity.name}</h4>
                          {getStatusBadge(activity.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(activity.planned_date).toLocaleDateString('fr-FR')}
                          {activity.planned_time && ` • ${activity.planned_time}`}
                        </p>
                      </div>
                      <Badge className={getCategoryColor(activity.category)}>
                        {getCategoryLabel(activity.category)}
                      </Badge>
                    </div>
                    <Button variant="outline" size="sm" className="ml-3">
                      Détails
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
