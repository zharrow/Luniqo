'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
// TODO: Implement server actions for data fetching
// import { childService } from '@/lib/services/child.service'
// import { dailyLogsService } from '@/lib/services/daily-logs.service'
// import { attendanceService } from '@/lib/services/attendance.service'
// import { activitiesService } from '@/lib/services/activities.service'
// import { observationsService } from '@/lib/services/observations.service'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Calendar, Clock, Utensils, Moon, Baby, Sparkles, Eye, LogIn, LogOut, TrendingUp } from 'lucide-react'

export default function ChildTimelinePage() {
  const params = useParams()
  const router = useRouter()
  const childId = params.id as string
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const { selectedNursery, isLoading: nurseryLoading } = useNursery()
  const [child, setChild] = useState<any>(null)
  const [timeline, setTimeline] = useState<any[]>([])
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // TODO: Implement data fetching via server actions
  // useEffect(() => {
  //   if (selectedNursery?.id && childId) {
  //     loadChildAndTimeline()
  //   }
  // }, [selectedNursery?.id, childId, selectedDate])

  // async function loadChildAndTimeline() {
  //   if (!selectedNursery?.id || !childId) return
  //   try {
  //     setIsLoading(true)
  //     setError(null)
  //
  //     const childData = await childService.getById(childId)
  //     const timelineData = await dailyLogsService.getChildDayTimeline(childId, selectedDate)
  //
  //     setChild(childData)
  //     setTimeline(timelineData)
  //   } catch (err) {
  //     console.error('Error loading timeline:', err)
  //     setError('Impossible de charger la timeline')
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

  // Mock child data
  const mockChild = {
    id: childId,
    first_name: 'Sophie',
    last_name: 'Martin',
    photo_url: null,
    birth_date: '2022-03-15',
    section: { name: 'Moyens' }
  }

  // Mock timeline events
  const mockTimeline = [
    {
      id: '1',
      type: 'check_in',
      time: '08:30',
      title: 'Arrivée',
      description: 'Déposée par maman',
      icon: LogIn,
      color: 'bg-blue-100 text-blue-800 border-blue-200'
    },
    {
      id: '2',
      type: 'activity',
      time: '09:15',
      title: 'Activité - Arts plastiques',
      description: 'Peinture avec les doigts. Très impliquée, a beaucoup aimé.',
      icon: Sparkles,
      color: 'bg-purple-100 text-purple-800 border-purple-200'
    },
    {
      id: '3',
      type: 'meal',
      time: '10:00',
      title: 'Collation du matin',
      description: 'Compote de pommes • Appétit: Bon',
      icon: Utensils,
      color: 'bg-orange-100 text-orange-800 border-orange-200'
    },
    {
      id: '4',
      type: 'observation',
      time: '10:30',
      title: 'Observation - Motricité',
      description: 'A réussi à grimper seule sur le module de motricité',
      milestone: true,
      icon: Eye,
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    },
    {
      id: '5',
      type: 'meal',
      time: '11:45',
      title: 'Déjeuner',
      description: 'Purée de carottes, poisson • Appétit: Normal • Quantité: 3/4',
      icon: Utensils,
      color: 'bg-orange-100 text-orange-800 border-orange-200'
    },
    {
      id: '6',
      type: 'change',
      time: '12:15',
      title: 'Change',
      description: 'Couche souillée • Peau normale',
      icon: Baby,
      color: 'bg-pink-100 text-pink-800 border-pink-200'
    },
    {
      id: '7',
      type: 'sleep',
      time: '13:00',
      title: 'Sieste',
      description: 'Endormie rapidement • 2h15 • Qualité: Bonne',
      icon: Moon,
      color: 'bg-indigo-100 text-indigo-800 border-indigo-200'
    },
    {
      id: '8',
      type: 'meal',
      time: '15:30',
      title: 'Goûter',
      description: 'Yaourt nature, biscuit • Appétit: Bon',
      icon: Utensils,
      color: 'bg-orange-100 text-orange-800 border-orange-200'
    },
    {
      id: '9',
      type: 'activity',
      time: '16:00',
      title: 'Activité - Lecture',
      description: 'Histoire "Le Petit Chaperon Rouge" • Très attentive',
      icon: Sparkles,
      color: 'bg-blue-100 text-blue-800 border-blue-200'
    },
    {
      id: '10',
      type: 'check_out',
      time: '17:45',
      title: 'Départ',
      description: 'Récupérée par papa',
      icon: LogOut,
      color: 'bg-gray-100 text-gray-800 border-gray-200'
    }
  ]

  const daySummary = {
    arrivalTime: '08:30',
    departureTime: '17:45',
    totalHours: 9.25,
    mealsCount: 3,
    sleepDuration: 135, // minutes
    activitiesCount: 2,
    observationsCount: 1,
    changesCount: 1
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/owner/children')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour aux enfants
        </Button>

        <div className="flex items-start gap-4">
          {mockChild.photo_url ? (
            <img
              src={mockChild.photo_url}
              alt={`${mockChild.first_name} ${mockChild.last_name}`}
              className="w-20 h-20 rounded-full object-cover"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-blue-800 font-semibold text-2xl">
                {mockChild.first_name[0]}
                {mockChild.last_name[0]}
              </span>
            </div>
          )}

          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-1">
              {mockChild.first_name} {mockChild.last_name}
            </h1>
            <div className="flex items-center gap-3 text-muted-foreground">
              <span>
                {new Date().getFullYear() - new Date(mockChild.birth_date).getFullYear()} ans
              </span>
              <span>•</span>
              <Badge variant="outline">{mockChild.section.name}</Badge>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm"
            />
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <Card className="p-4 mb-6 bg-red-50 border-red-200">
          <p className="text-red-800">{error}</p>
        </Card>
      )}

      {/* Day Summary */}
      <Card className="p-6 mb-8 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold">
            Résumé de la journée - {new Date(selectedDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-200 rounded-lg">
              <Clock className="w-5 h-5 text-blue-800" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Présence</p>
              <p className="font-semibold">{daySummary.totalHours.toFixed(1)}h</p>
              <p className="text-xs text-muted-foreground">{daySummary.arrivalTime} - {daySummary.departureTime}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-200 rounded-lg">
              <Utensils className="w-5 h-5 text-orange-800" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Repas</p>
              <p className="font-semibold">{daySummary.mealsCount}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-200 rounded-lg">
              <Moon className="w-5 h-5 text-indigo-800" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Sieste</p>
              <p className="font-semibold">{Math.floor(daySummary.sleepDuration / 60)}h{daySummary.sleepDuration % 60}min</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-200 rounded-lg">
              <Sparkles className="w-5 h-5 text-purple-800" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Activités</p>
              <p className="font-semibold">{daySummary.activitiesCount}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Timeline */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Timeline de la journée
        </h2>

        {isLoading ? (
          <Card className="p-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Chargement...</p>
            </div>
          </Card>
        ) : mockTimeline.length === 0 ? (
          <Card className="p-12 text-center bg-gray-50">
            <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucun événement</h3>
            <p className="text-muted-foreground">
              Aucune activité enregistrée pour cette journée.
            </p>
          </Card>
        ) : (
          <div className="relative">
            {/* Timeline vertical line */}
            <div className="absolute left-8 top-4 bottom-4 w-0.5 bg-gray-200"></div>

            <div className="space-y-4">
              {mockTimeline.map((event: any, index: number) => {
                const Icon = event.icon
                return (
                  <div key={event.id} className="relative flex gap-4">
                    {/* Timeline dot */}
                    <div className={`relative z-10 flex-shrink-0 w-16 flex items-center justify-center`}>
                      <div className={`p-2 rounded-lg border-2 ${event.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                    </div>

                    {/* Event card */}
                    <Card className={`flex-1 p-4 border-2 ${event.color.replace('bg-', 'border-').replace('text-', 'bg-').replace('-800', '-50').replace('-200', '-100')}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <Badge className={event.color}>
                            <Clock className="w-3 h-3 mr-1" />
                            {event.time}
                          </Badge>
                          <h3 className="font-semibold">{event.title}</h3>
                        </div>
                        {event.milestone && (
                          <Badge className="bg-yellow-100 text-yellow-800">
                            <TrendingUp className="w-3 h-3 mr-1" />
                            Jalon
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{event.description}</p>
                    </Card>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
