'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
import { usersService } from '@/lib/services/users.service'
import {
  StaffPlanningService,
  type ShiftWithEmployee
} from '@/lib/services/staff-planning.service'
import {
  CalendarIcon,
  PlusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  UserGroupIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { PageBreadcrumb } from '@/components/shared/PageBreadcrumb'
import { formatDateLocal, getDateWithOffset } from '@/lib/utils/date'

const staffPlanningService = new StaffPlanningService()

const DAYS_OF_WEEK = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

export default function PlanningPage() {
  const router = useRouter()
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const { selectedNursery, isLoading: nurseryLoading } = useNursery()
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getWeekStart(new Date()))
  const [shifts, setShifts] = useState<ShiftWithEmployee[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session?.enterprise?.id && selectedNursery?.id) {
      loadData()
    } else if (!authLoading && !nurseryLoading) {
      setLoading(false)
    }
  }, [session?.enterprise?.id, selectedNursery?.id, currentWeekStart, authLoading, nurseryLoading])

  function getWeekStart(date: Date): Date {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust to Monday
    return new Date(d.setDate(diff))
  }

  function getWeekDates(weekStart: Date): string[] {
    const dates = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart)
      date.setDate(weekStart.getDate() + i)
      dates.push(formatDateLocal(date))
    }
    return dates
  }

  function getWeekRange(weekStart: Date): string {
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)

    const startMonth = weekStart.toLocaleDateString('fr-FR', { month: 'long' })
    const endMonth = weekEnd.toLocaleDateString('fr-FR', { month: 'long' })
    const year = weekStart.getFullYear()

    if (startMonth === endMonth) {
      return `${weekStart.getDate()} - ${weekEnd.getDate()} ${startMonth} ${year}`
    }
    return `${weekStart.getDate()} ${startMonth} - ${weekEnd.getDate()} ${endMonth} ${year}`
  }

  async function loadData() {
    if (!selectedNursery?.id || !session?.enterprise?.id) return

    try {
      setLoading(true)

      const weekDates = getWeekDates(currentWeekStart)
      const startDate = weekDates[0]
      const endDate = weekDates[6]

      // Load shifts and employees in parallel
      const [shiftsData, employeesData] = await Promise.all([
        staffPlanningService.getShiftsByDateRange(selectedNursery.id, startDate, endDate),
        usersService.getActiveEmployeesByNursery(selectedNursery.id)
      ])

      setShifts(shiftsData)
      setEmployees(employeesData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  function previousWeek() {
    const newWeekStart = new Date(currentWeekStart)
    newWeekStart.setDate(currentWeekStart.getDate() - 7)
    setCurrentWeekStart(newWeekStart)
  }

  function nextWeek() {
    const newWeekStart = new Date(currentWeekStart)
    newWeekStart.setDate(currentWeekStart.getDate() + 7)
    setCurrentWeekStart(newWeekStart)
  }

  function currentWeek() {
    setCurrentWeekStart(getWeekStart(new Date()))
  }

  function getShiftsForDate(date: string): ShiftWithEmployee[] {
    return shifts.filter((shift) => shift.shift_date === date)
  }

  function getShiftsForEmployee(employeeId: string, date: string): ShiftWithEmployee[] {
    return shifts.filter(
      (shift) => shift.employee_id === employeeId && shift.shift_date === date
    )
  }

  function getStatusBadgeVariant(status: string): 'default' | 'success' | 'warning' | 'destructive' {
    switch (status) {
      case 'completed':
        return 'success'
      case 'confirmed':
        return 'success'
      case 'in_progress':
        return 'warning'
      case 'cancelled':
        return 'destructive'
      case 'no_show':
        return 'destructive'
      default:
        return 'default'
    }
  }

  function getStatusLabel(status: string): string {
    switch (status) {
      case 'scheduled':
        return 'Planifié'
      case 'confirmed':
        return 'Confirmé'
      case 'in_progress':
        return 'En cours'
      case 'completed':
        return 'Terminé'
      case 'cancelled':
        return 'Annulé'
      case 'no_show':
        return 'Absent'
      default:
        return status
    }
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

  const weekDates = getWeekDates(currentWeekStart)
  const today = formatDateLocal(new Date())
  const totalShifts = shifts.length
  const confirmedShifts = shifts.filter((s) => s.status === 'confirmed').length
  const pendingShifts = shifts.filter((s) => s.status === 'scheduled').length

  return (
    <div className="container mx-auto p-6 max-w-[1800px]">
      {/* Breadcrumb */}
      <PageBreadcrumb
        items={[
          { label: 'Accueil', href: '/owner/dashboard' },
          { label: 'Planning', href: '/owner/planning' }
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 rounded-xl">
            <CalendarIcon className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Planning du personnel</h1>
            <p className="text-gray-600">{selectedNursery.name}</p>
          </div>
        </div>
        <Button onClick={() => router.push('/owner/planning/shifts/new')}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Créer des plannings
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total plannings</p>
              <p className="text-2xl font-bold text-blue-600">{totalShifts}</p>
            </div>
            <ClockIcon className="h-10 w-10 text-blue-400" />
          </div>
        </Card>
        <Card className="p-4 bg-green-50 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Confirmés</p>
              <p className="text-2xl font-bold text-green-600">{confirmedShifts}</p>
            </div>
            <CheckCircleIcon className="h-10 w-10 text-green-400" />
          </div>
        </Card>
        <Card className="p-4 bg-yellow-50 border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">En attente</p>
              <p className="text-2xl font-bold text-yellow-600">{pendingShifts}</p>
            </div>
            <UserGroupIcon className="h-10 w-10 text-yellow-400" />
          </div>
        </Card>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="outline" onClick={previousWeek}>
          <ChevronLeftIcon className="h-4 w-4 mr-2" />
          Semaine précédente
        </Button>
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900">
            {getWeekRange(currentWeekStart)}
          </h2>
          <Button variant="ghost" size="sm" onClick={currentWeek} className="mt-1">
            Aujourd'hui
          </Button>
        </div>
        <Button variant="outline" onClick={nextWeek}>
          Semaine suivante
          <ChevronRightIcon className="h-4 w-4 ml-2" />
        </Button>
      </div>

      {/* Weekly Calendar Grid */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Header Row - Days of Week */}
        <div className="grid grid-cols-8 border-b border-gray-200 bg-gray-50">
          <div className="p-3 border-r border-gray-200">
            <p className="text-sm font-medium text-gray-600">Employé</p>
          </div>
          {weekDates.map((date, index) => {
            const isToday = date === today
            return (
              <div
                key={date}
                className={`p-3 text-center border-r border-gray-200 last:border-r-0 ${
                  isToday ? 'bg-blue-100' : ''
                }`}
              >
                <p className="text-xs text-gray-600">{DAYS_OF_WEEK[index]}</p>
                <p className={`text-sm font-medium ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                  {new Date(date).getDate()}
                </p>
              </div>
            )
          })}
        </div>

        {/* Employee Rows */}
        {employees.length === 0 ? (
          <div className="p-12 text-center">
            <UserGroupIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Aucun employé</h3>
            <p className="text-sm text-muted-foreground">
              Ajoutez des employés pour commencer à planifier
            </p>
          </div>
        ) : (
          employees.map((employee) => (
            <div key={employee.id} className="grid grid-cols-8 border-b border-gray-200 last:border-b-0">
              {/* Employee Name Column */}
              <div className="p-3 border-r border-gray-200 bg-gray-50 flex items-center">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {employee.first_name} {employee.last_name}
                  </p>
                  <p className="text-xs text-gray-500">{employee.email}</p>
                </div>
              </div>

              {/* Shift Cells for Each Day */}
              {weekDates.map((date) => {
                const employeeShifts = getShiftsForEmployee(employee.id, date)
                const isToday = date === today

                return (
                  <div
                    key={date}
                    className={`p-2 border-r border-gray-200 last:border-r-0 min-h-[80px] ${
                      isToday ? 'bg-blue-50' : ''
                    }`}
                  >
                    {employeeShifts.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-gray-300">
                        <span className="text-xs">-</span>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {employeeShifts.map((shift) => (
                          <div
                            key={shift.id}
                            className={`p-1.5 rounded text-xs ${
                              shift.status === 'confirmed'
                                ? 'bg-green-100 border border-green-300'
                                : shift.status === 'cancelled'
                                ? 'bg-red-100 border border-red-300'
                                : shift.status === 'in_progress'
                                ? 'bg-yellow-100 border border-yellow-300'
                                : 'bg-gray-100 border border-gray-300'
                            }`}
                          >
                            <p className="font-medium text-gray-900">
                              {shift.start_time.substring(0, 5)} - {shift.end_time.substring(0, 5)}
                            </p>
                            {shift.room_name && (
                              <p className="text-gray-600 truncate">{shift.room_name}</p>
                            )}
                            <Badge
                              variant={getStatusBadgeVariant(shift.status)}
                              className="text-[10px] px-1 py-0 mt-0.5"
                            >
                              {getStatusLabel(shift.status)}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))
        )}
      </div>

      {/* Daily Summary Below Calendar */}
      <div className="mt-6 grid grid-cols-7 gap-4">
        {weekDates.map((date, index) => {
          const dayShifts = getShiftsForDate(date)
          const isToday = date === today

          return (
            <Card
              key={date}
              className={`p-3 ${isToday ? 'border-blue-300 bg-blue-50' : ''}`}
            >
              <p className="text-xs text-gray-600 mb-2">{DAYS_OF_WEEK[index]}</p>
              <p className={`text-lg font-bold ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                {dayShifts.length}
              </p>
              <p className="text-xs text-gray-500">planning{dayShifts.length > 1 ? 's' : ''}</p>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
