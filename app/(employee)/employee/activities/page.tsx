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
import { Palette, Music, TreePine, BookOpen, Beaker, Footprints, Sparkles, MessageSquare, Users, Plus } from 'lucide-react'

export default function EmployeeActivitiesPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Employee'])
  const { selectedNursery, isLoading: nurseryLoading } = useNursery()
  const [todayActivities, setTodayActivities] = useState<any[]>([])
  const [upcomingActivities, setUpcomingActivities] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false) // Changed to false for now
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
  //     const today = await activitiesService.getToday(selectedNursery.id)
  //     const upcoming = await activitiesService.getUpcoming(selectedNursery.id)
  //     setTodayActivities(today)
  //     setUpcomingActivities(upcoming)
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
    switch (category) {
      case 'arts':
        return <Palette className="w-5 h-5" />
      case 'music':
        return <Music className="w-5 h-5" />
      case 'outdoor':
        return <TreePine className="w-5 h-5" />
      case 'reading':
        return <BookOpen className="w-5 h-5" />
      case 'science':
        return <Beaker className="w-5 h-5" />
      case 'motor_skills':
        return <Footprints className="w-5 h-5" />
      case 'sensory':
        return <Sparkles className="w-5 h-5" />
      case 'language':
        return <MessageSquare className="w-5 h-5" />
      case 'social':
        return <Users className="w-5 h-5" />
      default:
        return <Sparkles className="w-5 h-5" />
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'arts':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'music':
        return 'bg-pink-100 text-pink-800 border-pink-200'
      case 'outdoor':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'reading':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'science':
        return 'bg-teal-100 text-teal-800 border-teal-200'
      case 'motor_skills':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'sensory':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'language':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200'
      case 'social':
        return 'bg-rose-100 text-rose-800 border-rose-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
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
        return <Badge variant="outline" className="bg-blue-50">Planifiée</Badge>
      case 'in_progress':
        return <Badge className="bg-green-100 text-green-800">En cours</Badge>
      case 'completed':
        return <Badge className="bg-gray-100 text-gray-800">Terminée</Badge>
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-50 text-red-800">Annulée</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Activités pédagogiques</h1>
        <p className="text-muted-foreground">
          Planification et suivi des activités quotidiennes - {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <Card className="p-4 mb-6 bg-red-50 border-red-200">
          <p className="text-red-800">{error}</p>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="today" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="today" className="flex items-center gap-2">
            Aujourd'hui ({todayActivities.length})
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="flex items-center gap-2">
            À venir ({upcomingActivities.length})
          </TabsTrigger>
        </TabsList>

        {/* Today's Activities */}
        <TabsContent value="today">
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-xl font-semibold">Activités du jour</h2>
            <Button className="bg-[#ffe5b4] hover:bg-[#ffd89b] text-gray-900">
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle activité
            </Button>
          </div>

          {isLoading ? (
            <Card className="p-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Chargement...</p>
              </div>
            </Card>
          ) : todayActivities.length === 0 ? (
            <Card className="p-12 text-center bg-gray-50">
              <Sparkles className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucune activité prévue</h3>
              <p className="text-muted-foreground mb-4">
                Planifiez des activités pédagogiques pour les enfants.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {todayActivities.map((activity: any) => (
                <Card key={activity.id} className="p-6 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-lg ${getCategoryColor(activity.category)}`}>
                        {getCategoryIcon(activity.category)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{activity.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {activity.planned_time || 'Heure non précisée'}
                          {activity.duration_minutes && ` • ${activity.duration_minutes} min`}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(activity.status)}
                  </div>

                  {activity.description && (
                    <p className="text-sm text-muted-foreground mb-4">
                      {activity.description}
                    </p>
                  )}

                  <div className="flex items-center gap-2 mb-4">
                    <Badge variant="outline" className={getCategoryColor(activity.category)}>
                      {getCategoryLabel(activity.category)}
                    </Badge>
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
                    <p className="text-sm text-muted-foreground mb-4">
                      Animé par: {activity.led_by.first_name} {activity.led_by.last_name}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      Voir détails
                    </Button>
                    {activity.status === 'planned' && (
                      <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700">
                        Démarrer
                      </Button>
                    )}
                    {activity.status === 'in_progress' && (
                      <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700">
                        Terminer
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Upcoming Activities */}
        <TabsContent value="upcoming">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Activités à venir</h2>
            <p className="text-sm text-muted-foreground">
              Activités planifiées pour les prochains jours
            </p>
          </div>

          {isLoading ? (
            <Card className="p-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Chargement...</p>
              </div>
            </Card>
          ) : upcomingActivities.length === 0 ? (
            <Card className="p-12 text-center bg-gray-50">
              <Sparkles className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucune activité planifiée</h3>
              <p className="text-muted-foreground mb-4">
                Planifiez des activités pour les prochains jours.
              </p>
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
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short'
                            })}
                          </span>
                          {activity.planned_time && <span>{activity.planned_time}</span>}
                          {activity.duration_minutes && <span>{activity.duration_minutes} min</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={getCategoryColor(activity.category)}>
                          {getCategoryLabel(activity.category)}
                        </Badge>
                      </div>
                    </div>

                    <Button variant="outline" size="sm" className="ml-4">
                      Voir détails
                    </Button>
                  </div>

                  {activity.description && (
                    <p className="text-sm text-muted-foreground mt-3 ml-[68px]">
                      {activity.description}
                    </p>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
