'use client'

import { useEffect, useState } from 'react'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
// TODO: Implement server actions for data fetching
// import { attendanceService, AttendanceWithDetails } from '@/lib/services/attendance.service'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Clock, XCircle, Users } from 'lucide-react'

type AttendanceWithDetails = any // Temporary type

export default function EmployeeAttendancePage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Employee'])
  const { selectedNursery, isLoading: nurseryLoading } = useNursery()
  const [attendances, setAttendances] = useState<AttendanceWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(false) // Changed to false for now
  const [error, setError] = useState<string | null>(null)

  // TODO: Implement data fetching via server actions
  // useEffect(() => {
  //   if (selectedNursery?.id) {
  //     loadAttendances()
  //   }
  // }, [selectedNursery?.id])

  // async function loadAttendances() {
  //   if (!selectedNursery?.id) return
  //   try {
  //     setIsLoading(true)
  //     setError(null)
  //     const data = await attendanceService.getTodayAttendances(selectedNursery.id)
  //     setAttendances(data)
  //   } catch (err) {
  //     console.error('Error loading attendances:', err)
  //     setError('Impossible de charger les présences')
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

  const stats = {
    total: attendances.length,
    present: attendances.filter(a => a.status === 'present').length,
    absent: attendances.filter(a => a.status === 'absent').length,
    late: attendances.filter(a => a.status === 'late').length
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Présent</Badge>
      case 'absent':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Absent</Badge>
      case 'late':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Retard</Badge>
      case 'partial':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Partiel</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Présences du jour</h1>
        <p className="text-muted-foreground">
          Pointage des arrivées et départs - {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-6 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total enfants</p>
              <p className="text-3xl font-bold text-blue-900">{stats.total}</p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-6 bg-green-50 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Présents</p>
              <p className="text-3xl font-bold text-green-900">{stats.present}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-6 bg-yellow-50 border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Retards</p>
              <p className="text-3xl font-bold text-yellow-900">{stats.late}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
        </Card>

        <Card className="p-6 bg-red-50 border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Absents</p>
              <p className="text-3xl font-bold text-red-900">{stats.absent}</p>
            </div>
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
        </Card>
      </div>

      {/* Error Message */}
      {error && (
        <Card className="p-4 mb-6 bg-red-50 border-red-200">
          <p className="text-red-800">{error}</p>
        </Card>
      )}

      {/* Attendances List */}
      {isLoading ? (
        <Card className="p-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Chargement des présences...</p>
          </div>
        </Card>
      ) : attendances.length === 0 ? (
        <Card className="p-12 text-center bg-gray-50">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Aucune présence enregistrée</h3>
          <p className="text-muted-foreground">
            Les présences du jour apparaîtront ici.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {attendances.map((attendance) => (
            <Card key={attendance.id} className="p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  {/* Child Info */}
                  <div className="flex-shrink-0">
                    {attendance.child?.photo_url ? (
                      <img
                        src={attendance.child.photo_url}
                        alt={`${attendance.child.first_name} ${attendance.child.last_name}`}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-800 font-semibold text-lg">
                          {attendance.child?.first_name?.[0]}
                          {attendance.child?.last_name?.[0]}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">
                      {attendance.child?.first_name} {attendance.child?.last_name}
                    </h3>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      {attendance.actual_arrival_time && (
                        <span>Arrivée: {attendance.actual_arrival_time}</span>
                      )}
                      {attendance.actual_departure_time && (
                        <span>Départ: {attendance.actual_departure_time}</span>
                      )}
                      {attendance.dropped_by && (
                        <span>Déposé par: {attendance.dropped_by}</span>
                      )}
                      {attendance.picked_by && (
                        <span>Récupéré par: {attendance.picked_by}</span>
                      )}
                    </div>
                  </div>

                  <div>
                    {getStatusBadge(attendance.status)}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 ml-4">
                  {!attendance.actual_arrival_time && (
                    <Button size="sm" className="bg-green-600 hover:bg-green-700">
                      Pointer arrivée
                    </Button>
                  )}
                  {attendance.actual_arrival_time && !attendance.actual_departure_time && (
                    <Button size="sm" variant="outline">
                      Pointer départ
                    </Button>
                  )}
                </div>
              </div>

              {attendance.total_hours && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Durée totale: <span className="font-semibold text-foreground">{attendance.total_hours.toFixed(2)} heures</span>
                  </p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
