'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
import { usersService } from '@/lib/services/users.service'
import {
  StaffPlanningService,
  type AbsenceWithEmployee
} from '@/lib/services/staff-planning.service'
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowLeftIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { PageBreadcrumb } from '@/components/shared/PageBreadcrumb'
import { formatDateLocal } from '@/lib/utils/date'

const staffPlanningService = new StaffPlanningService()

const DAYS_OF_WEEK = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

const ABSENCE_TYPES = [
  { value: 'vacation', label: 'Congés payés', color: 'bg-blue-100 border-blue-300 text-blue-700' },
  { value: 'sick_leave', label: 'Arrêt maladie', color: 'bg-red-100 border-red-300 text-red-700' },
  { value: 'unpaid_leave', label: 'Congé sans solde', color: 'bg-gray-100 border-gray-300 text-gray-700' },
  { value: 'maternity_leave', label: 'Congé maternité', color: 'bg-pink-100 border-pink-300 text-pink-700' },
  { value: 'paternity_leave', label: 'Congé paternité', color: 'bg-green-100 border-green-300 text-green-700' },
  { value: 'family_event', label: 'Événement familial', color: 'bg-purple-100 border-purple-300 text-purple-700' },
  { value: 'training', label: 'Formation', color: 'bg-yellow-100 border-yellow-300 text-yellow-700' },
  { value: 'other', label: 'Autre', color: 'bg-orange-100 border-orange-300 text-orange-700' }
]

export default function AbsenceCalendarPage() {
  const router = useRouter()
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const { selectedNursery, isLoading: nurseryLoading } = useNursery()
  const [currentMonthStart, setCurrentMonthStart] = useState<Date>(getMonthStart(new Date()))
  const [absences, setAbsences] = useState<AbsenceWithEmployee[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session?.enterprise?.id && selectedNursery?.id) {
      loadData()
    } else if (!authLoading && !nurseryLoading) {
      setLoading(false)
    }
  }, [session?.enterprise?.id, selectedNursery?.id, currentMonthStart, authLoading, nurseryLoading])

  function getMonthStart(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1)
  }

  function getMonthDates(monthStart: Date): string[] {
    const year = monthStart.getFullYear()
    const month = monthStart.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    // Get day of week for first day (0 = Sunday, 1 = Monday, etc.)
    let startDayOfWeek = firstDay.getDay()
    startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1 // Convert to Monday = 0

    const dates = []

    // Add empty cells for days before month starts
    for (let i = 0; i < startDayOfWeek; i++) {
      dates.push('')
    }

    // Add all days of the month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day)
      dates.push(formatDateLocal(date))
    }

    return dates
  }

  function getMonthName(monthStart: Date): string {
    return monthStart.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  }

  async function loadData() {
    if (!selectedNursery?.id || !session?.enterprise?.id) return

    try {
      setLoading(true)

      // Get start and end of month
      const monthStart = formatDateLocal(currentMonthStart)
      const monthEnd = formatDateLocal(
        new Date(currentMonthStart.getFullYear(), currentMonthStart.getMonth() + 1, 0)
      )

      // Load employees and absences
      const [employeesData, absencesData] = await Promise.all([
        usersService.getActiveEmployeesByNursery(selectedNursery.id),
        staffPlanningService.getAbsencesByNursery(selectedNursery.id, 'approved')
      ])

      // Filter absences that overlap with current month
      const filteredAbsences = absencesData.filter(
        (absence) => absence.start_date <= monthEnd && absence.end_date >= monthStart
      )

      setEmployees(employeesData)
      setAbsences(filteredAbsences)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  function previousMonth() {
    const newMonthStart = new Date(currentMonthStart)
    newMonthStart.setMonth(currentMonthStart.getMonth() - 1)
    setCurrentMonthStart(newMonthStart)
  }

  function nextMonth() {
    const newMonthStart = new Date(currentMonthStart)
    newMonthStart.setMonth(currentMonthStart.getMonth() + 1)
    setCurrentMonthStart(newMonthStart)
  }

  function currentMonth() {
    setCurrentMonthStart(getMonthStart(new Date()))
  }

  function getAbsencesForDate(date: string): AbsenceWithEmployee[] {
    if (!date) return []
    return absences.filter(
      (absence) => absence.start_date <= date && absence.end_date >= date
    )
  }

  function getAbsenceColor(type: string): string {
    return ABSENCE_TYPES.find((t) => t.value === type)?.color || 'bg-gray-100 border-gray-300 text-gray-700'
  }

  function getAbsenceTypeLabel(type: string): string {
    return ABSENCE_TYPES.find((t) => t.value === type)?.label || type
  }

  if (authLoading || nurseryLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!selectedNursery) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 text-center max-w-md">
          <p className="text-lg font-medium mb-2">Aucune crèche sélectionnée</p>
          <p className="text-sm text-muted-foreground mb-4">
            Veuillez sélectionner une crèche dans le menu
          </p>
        </Card>
      </div>
    )
  }

  const monthDates = getMonthDates(currentMonthStart)
  const today = formatDateLocal(new Date())
  const totalAbsences = absences.length

  return (
    <div className="container mx-auto p-6 max-w-[1800px]">
      {/* Breadcrumb */}
      <PageBreadcrumb
        items={[
          { label: 'Accueil', href: '/owner/dashboard' },
          { label: 'Absences', href: '/owner/absences' },
          { label: 'Vue calendrier', href: '/owner/absences/calendar' }
        ]}
      />

      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => router.push('/owner/absences')}
        className="mb-4"
      >
        <ArrowLeftIcon className="h-4 w-4 mr-2" />
        Retour aux absences
      </Button>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-50 rounded-xl">
            <CalendarIcon className="h-8 w-8 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Calendrier des absences</h1>
            <p className="text-gray-600">{selectedNursery.name}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <Card className="p-4 mb-6 bg-purple-50 border-purple-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">Absences ce mois</p>
            <p className="text-2xl font-bold text-purple-600">{totalAbsences}</p>
          </div>
          <UserGroupIcon className="h-10 w-10 text-purple-400" />
        </div>
      </Card>

      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="outline" onClick={previousMonth}>
          <ChevronLeftIcon className="h-4 w-4 mr-2" />
          Mois précédent
        </Button>
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900 capitalize">
            {getMonthName(currentMonthStart)}
          </h2>
          <Button variant="ghost" size="sm" onClick={currentMonth} className="mt-1">
            Mois actuel
          </Button>
        </div>
        <Button variant="outline" onClick={nextMonth}>
          Mois suivant
          <ChevronRightIcon className="h-4 w-4 ml-2" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Header Row - Days of Week */}
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
          {DAYS_OF_WEEK.map((day) => (
            <div key={day} className="p-3 text-center border-r border-gray-200 last:border-r-0">
              <p className="text-sm font-medium text-gray-600">{day}</p>
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {monthDates.map((date, index) => {
            const isToday = date === today
            const dayAbsences = getAbsencesForDate(date)

            return (
              <div
                key={index}
                className={`min-h-[120px] border-r border-b border-gray-200 p-2 ${
                  !date ? 'bg-gray-50' : isToday ? 'bg-blue-50' : ''
                } ${index % 7 === 6 ? 'border-r-0' : ''}`}
              >
                {date && (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`text-sm font-medium ${
                          isToday ? 'text-blue-600' : 'text-gray-900'
                        }`}
                      >
                        {new Date(date).getDate()}
                      </span>
                      {dayAbsences.length > 0 && (
                        <Badge variant="default" className="text-[10px] px-1 py-0">
                          {dayAbsences.length}
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-1">
                      {dayAbsences.map((absence) => (
                        <div
                          key={absence.id}
                          className={`p-1 rounded text-[10px] border ${getAbsenceColor(
                            absence.absence_type
                          )}`}
                        >
                          <p className="font-medium truncate">{absence.employee_name.split(' ')[0]}</p>
                          <p className="truncate opacity-75">
                            {getAbsenceTypeLabel(absence.absence_type)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <Card className="p-4 mt-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Légende</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {ABSENCE_TYPES.map((type) => (
            <div key={type.value} className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded border ${type.color}`}></div>
              <span className="text-xs text-gray-700">{type.label}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
