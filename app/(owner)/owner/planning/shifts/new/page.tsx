'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
import { usersService } from '@/lib/services/users.service'
import { roomsService } from '@/lib/services/rooms.service'
import {
  StaffPlanningService,
  type CreateShiftInput
} from '@/lib/services/staff-planning.service'
import {
  CalendarIcon,
  PlusIcon,
  TrashIcon,
  ArrowLeftIcon,
  ClockIcon,
  UserGroupIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { PageBreadcrumb } from '@/components/shared/PageBreadcrumb'
import { formatDateLocal } from '@/lib/utils/date'

const staffPlanningService = new StaffPlanningService()

const SHIFT_TYPES = [
  { value: 'morning', label: 'Matin' },
  { value: 'afternoon', label: 'Après-midi' },
  { value: 'full_day', label: 'Journée complète' },
  { value: 'evening', label: 'Soirée' },
  { value: 'night', label: 'Nuit' }
]

interface ShiftTemplate {
  id: string
  employee_ids: string[]
  dates: string[]
  start_time: string
  end_time: string
  break_start_time?: string
  break_end_time?: string
  shift_type: string
  assigned_room_id?: string
  notes?: string
}

export default function NewShiftsPage() {
  const router = useRouter()
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const { selectedNursery, isLoading: nurseryLoading } = useNursery()
  const [employees, setEmployees] = useState<any[]>([])
  const [rooms, setRooms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successCount, setSuccessCount] = useState(0)
  const [showSuccess, setShowSuccess] = useState(false)

  const [shiftTemplate, setShiftTemplate] = useState<ShiftTemplate>({
    id: 'template-1',
    employee_ids: [],
    dates: [formatDateLocal(new Date())],
    start_time: '09:00',
    end_time: '17:00',
    break_start_time: '12:00',
    break_end_time: '13:00',
    shift_type: 'full_day',
    notes: ''
  })

  useEffect(() => {
    if (session?.enterprise?.id && selectedNursery?.id) {
      loadData()
    } else if (!authLoading && !nurseryLoading) {
      setLoading(false)
    }
  }, [session?.enterprise?.id, selectedNursery?.id, authLoading, nurseryLoading])

  async function loadData() {
    if (!selectedNursery?.id || !session?.enterprise?.id) return

    try {
      setLoading(true)

      const [employeesData, roomsData] = await Promise.all([
        usersService.getActiveEmployeesByNursery(selectedNursery.id),
        roomsService.getActive(selectedNursery.id)
      ])

      setEmployees(employeesData)
      setRooms(roomsData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  function toggleEmployee(employeeId: string) {
    setShiftTemplate((prev) => ({
      ...prev,
      employee_ids: prev.employee_ids.includes(employeeId)
        ? prev.employee_ids.filter((id) => id !== employeeId)
        : [...prev.employee_ids, employeeId]
    }))
  }

  function addDate() {
    const lastDate = shiftTemplate.dates[shiftTemplate.dates.length - 1]
    const nextDate = new Date(lastDate)
    nextDate.setDate(nextDate.getDate() + 1)
    setShiftTemplate((prev) => ({
      ...prev,
      dates: [...prev.dates, formatDateLocal(nextDate)]
    }))
  }

  function removeDate(index: number) {
    if (shiftTemplate.dates.length === 1) return
    setShiftTemplate((prev) => ({
      ...prev,
      dates: prev.dates.filter((_, i) => i !== index)
    }))
  }

  function updateDate(index: number, value: string) {
    setShiftTemplate((prev) => ({
      ...prev,
      dates: prev.dates.map((d, i) => (i === index ? value : d))
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!session?.user?.id || !selectedNursery?.id) return
    if (shiftTemplate.employee_ids.length === 0) {
      alert('Veuillez sélectionner au moins un employé')
      return
    }

    try {
      setIsSubmitting(true)

      // Generate shifts for all combinations of employees and dates
      const shiftsToCreate: CreateShiftInput[] = []
      for (const employeeId of shiftTemplate.employee_ids) {
        for (const date of shiftTemplate.dates) {
          shiftsToCreate.push({
            employee_id: employeeId,
            nursery_id: selectedNursery.id,
            shift_date: date,
            start_time: shiftTemplate.start_time,
            end_time: shiftTemplate.end_time,
            break_start_time: shiftTemplate.break_start_time || undefined,
            break_end_time: shiftTemplate.break_end_time || undefined,
            shift_type: shiftTemplate.shift_type,
            assigned_room_id: shiftTemplate.assigned_room_id || undefined,
            notes: shiftTemplate.notes || undefined,
            created_by_id: session.user.id
          })
        }
      }

      await staffPlanningService.createShifts(shiftsToCreate)

      setSuccessCount(shiftsToCreate.length)
      setShowSuccess(true)

      // Redirect after 2 seconds
      setTimeout(() => {
        router.push('/owner/planning')
      }, 2000)
    } catch (error) {
      console.error('Error creating shifts:', error)
      alert('Erreur lors de la création des plannings')
    } finally {
      setIsSubmitting(false)
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

  if (showSuccess) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 text-center max-w-md">
          <CheckCircleIcon className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Plannings créés avec succès !
          </h2>
          <p className="text-gray-600">
            {successCount} planning{successCount > 1 ? 's' : ''} créé{successCount > 1 ? 's' : ''}
          </p>
          <p className="text-sm text-gray-500 mt-4">Redirection en cours...</p>
        </Card>
      </div>
    )
  }

  const totalShifts = shiftTemplate.employee_ids.length * shiftTemplate.dates.length

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      {/* Breadcrumb */}
      <PageBreadcrumb
        items={[
          { label: 'Accueil', href: '/owner/dashboard' },
          { label: 'Planning', href: '/owner/planning' },
          { label: 'Créer des plannings', href: '/owner/planning/shifts/new' }
        ]}
      />

      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => router.push('/owner/planning')}
        className="mb-4"
      >
        <ArrowLeftIcon className="h-4 w-4 mr-2" />
        Retour au planning
      </Button>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 rounded-xl">
            <CalendarIcon className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Créer des plannings</h1>
            <p className="text-gray-600">Planification en masse pour plusieurs employés</p>
          </div>
        </div>
      </div>

      {/* Summary Card */}
      <Card className="p-4 mb-6 bg-blue-50 border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">Total à créer</p>
            <p className="text-2xl font-bold text-blue-600">{totalShifts} planning{totalShifts > 1 ? 's' : ''}</p>
            <p className="text-xs text-gray-500 mt-1">
              {shiftTemplate.employee_ids.length} employé{shiftTemplate.employee_ids.length > 1 ? 's' : ''} × {shiftTemplate.dates.length} jour{shiftTemplate.dates.length > 1 ? 's' : ''}
            </p>
          </div>
          <ClockIcon className="h-12 w-12 text-blue-400" />
        </div>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Select Employees */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <UserGroupIcon className="h-6 w-6 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">1. Sélectionner les employés</h2>
          </div>
          <div className="space-y-2">
            {employees.map((employee) => (
              <div
                key={employee.id}
                onClick={() => toggleEmployee(employee.id)}
                className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                  shiftTemplate.employee_ids.includes(employee.id)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {employee.first_name} {employee.last_name}
                    </p>
                    <p className="text-sm text-gray-500">{employee.email}</p>
                  </div>
                  {shiftTemplate.employee_ids.includes(employee.id) && (
                    <CheckCircleIcon className="h-6 w-6 text-blue-600" />
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-500 mt-3">
            {shiftTemplate.employee_ids.length} employé{shiftTemplate.employee_ids.length > 1 ? 's' : ''} sélectionné{shiftTemplate.employee_ids.length > 1 ? 's' : ''}
          </p>
        </Card>

        {/* Step 2: Select Dates */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <CalendarIcon className="h-6 w-6 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">2. Sélectionner les dates</h2>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addDate}>
              <PlusIcon className="h-4 w-4 mr-1" />
              Ajouter une date
            </Button>
          </div>
          <div className="space-y-2">
            {shiftTemplate.dates.map((date, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => updateDate(index, e.target.value)}
                  className="flex-1"
                  required
                />
                {shiftTemplate.dates.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeDate(index)}
                  >
                    <TrashIcon className="h-4 w-4 text-red-600" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Step 3: Shift Details */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <ClockIcon className="h-6 w-6 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">3. Détails du planning</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Type de planning</label>
              <select
                className="w-full border rounded-md px-3 py-2"
                value={shiftTemplate.shift_type}
                onChange={(e) => setShiftTemplate({ ...shiftTemplate, shift_type: e.target.value })}
                required
              >
                {SHIFT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Heure de début *</label>
                <Input
                  type="time"
                  value={shiftTemplate.start_time}
                  onChange={(e) => setShiftTemplate({ ...shiftTemplate, start_time: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Heure de fin *</label>
                <Input
                  type="time"
                  value={shiftTemplate.end_time}
                  onChange={(e) => setShiftTemplate({ ...shiftTemplate, end_time: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Début pause</label>
                <Input
                  type="time"
                  value={shiftTemplate.break_start_time || ''}
                  onChange={(e) => setShiftTemplate({ ...shiftTemplate, break_start_time: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Fin pause</label>
                <Input
                  type="time"
                  value={shiftTemplate.break_end_time || ''}
                  onChange={(e) => setShiftTemplate({ ...shiftTemplate, break_end_time: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Salle assignée (optionnel)</label>
              <select
                className="w-full border rounded-md px-3 py-2"
                value={shiftTemplate.assigned_room_id || ''}
                onChange={(e) => setShiftTemplate({ ...shiftTemplate, assigned_room_id: e.target.value || undefined })}
              >
                <option value="">Aucune salle</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea
                className="w-full border rounded-md px-3 py-2 min-h-[80px]"
                value={shiftTemplate.notes || ''}
                onChange={(e) => setShiftTemplate({ ...shiftTemplate, notes: e.target.value })}
                placeholder="Notes additionnelles..."
              />
            </div>
          </div>
        </Card>

        {/* Submit */}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => router.push('/owner/planning')}
            disabled={isSubmitting}
          >
            Annuler
          </Button>
          <Button type="submit" className="flex-1" disabled={isSubmitting || totalShifts === 0}>
            {isSubmitting ? 'Création...' : `Créer ${totalShifts} planning${totalShifts > 1 ? 's' : ''}`}
          </Button>
        </div>
      </form>
    </div>
  )
}
