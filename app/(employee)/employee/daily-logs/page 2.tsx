'use client'

import { useEffect, useState } from 'react'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
// TODO: Implement server actions for data fetching
// import { dailyLogsService } from '@/lib/services/daily-logs.service'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Utensils, Moon, Baby, Plus } from 'lucide-react'

export default function EmployeeDailyLogsPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Employee'])
  const { selectedNursery, isLoading: nurseryLoading } = useNursery()
  const [meals, setMeals] = useState<any[]>([])
  const [sleeps, setSleeps] = useState<any[]>([])
  const [changes, setChanges] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false) // Changed to false for now
  const [error, setError] = useState<string | null>(null)

  // TODO: Implement data fetching via server actions
  // useEffect(() => {
  //   if (selectedNursery?.id) {
  //     loadTodayLogs()
  //   }
  // }, [selectedNursery?.id])

  // async function loadTodayLogs() {
  //   if (!selectedNursery?.id) return
  //   try {
  //     setIsLoading(true)
  //     setError(null)
  //     const data = await dailyLogsService.getTodayAllLogs(selectedNursery.id)
  //     setMeals(data.meals)
  //     setSleeps(data.sleeps)
  //     setChanges(data.changes)
  //   } catch (err) {
  //     console.error('Error loading daily logs:', err)
  //     setError('Impossible de charger les logs quotidiens')
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

  const getAppetiteBadge = (appetite: string) => {
    switch (appetite) {
      case 'good':
        return <Badge className="bg-green-100 text-green-800">Bon</Badge>
      case 'normal':
        return <Badge className="bg-blue-100 text-blue-800">Normal</Badge>
      case 'poor':
        return <Badge className="bg-yellow-100 text-yellow-800">Faible</Badge>
      case 'refused':
        return <Badge className="bg-red-100 text-red-800">Refusé</Badge>
      default:
        return <Badge variant="outline">{appetite}</Badge>
    }
  }

  const getMealTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      breakfast: 'Petit-déjeuner',
      morning_snack: 'Collation matin',
      lunch: 'Déjeuner',
      afternoon_snack: 'Goûter',
      dinner: 'Dîner'
    }
    return labels[type] || type
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Logs quotidiens</h1>
        <p className="text-muted-foreground">
          Suivi des repas, siestes et changes - {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <Card className="p-4 mb-6 bg-red-50 border-red-200">
          <p className="text-red-800">{error}</p>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="meals" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="meals" className="flex items-center gap-2">
            <Utensils className="w-4 h-4" />
            Repas ({meals.length})
          </TabsTrigger>
          <TabsTrigger value="sleeps" className="flex items-center gap-2">
            <Moon className="w-4 h-4" />
            Siestes ({sleeps.length})
          </TabsTrigger>
          <TabsTrigger value="changes" className="flex items-center gap-2">
            <Baby className="w-4 h-4" />
            Changes ({changes.length})
          </TabsTrigger>
        </TabsList>

        {/* Meals Tab */}
        <TabsContent value="meals">
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-xl font-semibold">Repas du jour</h2>
            <Button className="bg-[#ffe5b4] hover:bg-[#ffd89b] text-gray-900">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un repas
            </Button>
          </div>

          {isLoading ? (
            <Card className="p-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Chargement...</p>
              </div>
            </Card>
          ) : meals.length === 0 ? (
            <Card className="p-12 text-center bg-gray-50">
              <Utensils className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucun repas enregistré</h3>
              <p className="text-muted-foreground mb-4">
                Commencez à enregistrer les repas des enfants.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {meals.map((meal: any) => (
                <Card key={meal.id} className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {meal.child?.first_name} {meal.child?.last_name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {getMealTypeLabel(meal.meal_type)} - {meal.meal_time}
                      </p>
                    </div>
                    {getAppetiteBadge(meal.appetite)}
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Quantité mangée:</span>
                      <span className="font-medium">{meal.quantity_eaten}</span>
                    </div>
                    {meal.special_notes && (
                      <div>
                        <span className="text-muted-foreground">Notes: </span>
                        <span>{meal.special_notes}</span>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Sleeps Tab */}
        <TabsContent value="sleeps">
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-xl font-semibold">Siestes du jour</h2>
            <Button className="bg-[#b5ead7] hover:bg-[#a0dcc4] text-gray-900">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter une sieste
            </Button>
          </div>

          {isLoading ? (
            <Card className="p-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Chargement...</p>
              </div>
            </Card>
          ) : sleeps.length === 0 ? (
            <Card className="p-12 text-center bg-gray-50">
              <Moon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucune sieste enregistrée</h3>
              <p className="text-muted-foreground mb-4">
                Enregistrez les siestes des enfants.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sleeps.map((sleep: any) => (
                <Card key={sleep.id} className="p-6">
                  <div className="mb-4">
                    <h3 className="font-semibold text-lg">
                      {sleep.child?.first_name} {sleep.child?.last_name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {sleep.sleep_start_time}
                      {sleep.sleep_end_time && ` - ${sleep.sleep_end_time}`}
                    </p>
                  </div>

                  <div className="space-y-2 text-sm">
                    {sleep.duration_minutes && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Durée:</span>
                        <span className="font-medium">{sleep.duration_minutes} min</span>
                      </div>
                    )}
                    {sleep.sleep_quality && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Qualité:</span>
                        <span className="font-medium capitalize">{sleep.sleep_quality}</span>
                      </div>
                    )}
                    {sleep.notes && (
                      <div>
                        <span className="text-muted-foreground">Notes: </span>
                        <span>{sleep.notes}</span>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Changes Tab */}
        <TabsContent value="changes">
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-xl font-semibold">Changes du jour</h2>
            <Button className="bg-[#f4c2c2] hover:bg-[#f0a8a8] text-gray-900">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un change
            </Button>
          </div>

          {isLoading ? (
            <Card className="p-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Chargement...</p>
              </div>
            </Card>
          ) : changes.length === 0 ? (
            <Card className="p-12 text-center bg-gray-50">
              <Baby className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucun change enregistré</h3>
              <p className="text-muted-foreground mb-4">
                Tracez les changes des enfants.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {changes.map((change: any) => (
                <Card key={change.id} className="p-4">
                  <div className="mb-3">
                    <h3 className="font-semibold">
                      {change.child?.first_name} {change.child?.last_name}
                    </h3>
                    <p className="text-sm text-muted-foreground">{change.time}</p>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex gap-2">
                      {change.is_wet && (
                        <Badge variant="outline" className="text-xs">Mouillé</Badge>
                      )}
                      {change.is_soiled && (
                        <Badge variant="outline" className="text-xs">Souillé</Badge>
                      )}
                    </div>
                    {change.skin_condition && change.skin_condition !== 'normal' && (
                      <p className="text-muted-foreground">
                        Peau: <span className="text-foreground">{change.skin_condition}</span>
                      </p>
                    )}
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
