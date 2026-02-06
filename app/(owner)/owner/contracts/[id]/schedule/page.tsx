'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import {
  contractService,
  type ContractWithDetails,
  type ContractSchedule,
  type CreateScheduleInput
} from '@/lib/services/contract.service'
import { ArrowLeftIcon, ClockIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { PageBreadcrumb } from '@/components/shared/PageBreadcrumb'

type DaySchedule = {
  is_active: boolean
  arrival_time: string
  departure_time: string
  daily_hours: number
}

type WeekSchedule = {
  monday: DaySchedule
  tuesday: DaySchedule
  wednesday: DaySchedule
  thursday: DaySchedule
  friday: DaySchedule
  saturday: DaySchedule
  sunday: DaySchedule
}

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Lundi' },
  { key: 'tuesday', label: 'Mardi' },
  { key: 'wednesday', label: 'Mercredi' },
  { key: 'thursday', label: 'Jeudi' },
  { key: 'friday', label: 'Vendredi' },
  { key: 'saturday', label: 'Samedi' },
  { key: 'sunday', label: 'Dimanche' }
] as const

export default function ContractSchedulePage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const router = useRouter()
  const params = useParams()
  const contractId = params.id as string

  const [contract, setContract] = useState<ContractWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [schedule, setSchedule] = useState<WeekSchedule>({
    monday: { is_active: true, arrival_time: '08:00', departure_time: '18:00', daily_hours: 10 },
    tuesday: { is_active: true, arrival_time: '08:00', departure_time: '18:00', daily_hours: 10 },
    wednesday: { is_active: true, arrival_time: '08:00', departure_time: '18:00', daily_hours: 10 },
    thursday: { is_active: true, arrival_time: '08:00', departure_time: '18:00', daily_hours: 10 },
    friday: { is_active: true, arrival_time: '08:00', departure_time: '18:00', daily_hours: 10 },
    saturday: { is_active: false, arrival_time: '', departure_time: '', daily_hours: 0 },
    sunday: { is_active: false, arrival_time: '', departure_time: '', daily_hours: 0 }
  })

  useEffect(() => {
    if (contractId) {
      loadData()
    }
  }, [contractId])

  async function loadData() {
    try {
      setLoading(true)
      const [contractData, scheduleData] = await Promise.all([
        contractService.getByIdWithDetails(contractId),
        contractService.getSchedule(contractId)
      ])
      setContract(contractData)

      // Load existing schedule if available
      if (scheduleData && scheduleData.length > 0) {
        const dayMapping: Record<number, keyof WeekSchedule> = {
          1: 'monday',
          2: 'tuesday',
          3: 'wednesday',
          4: 'thursday',
          5: 'friday',
          6: 'saturday',
          7: 'sunday'
        }

        const newSchedule = { ...schedule }
        scheduleData.forEach((day: ContractSchedule) => {
          const dayKey = dayMapping[day.day_of_week]
          if (dayKey && dayKey in newSchedule) {
            newSchedule[dayKey] = {
              is_active: day.is_present,
              arrival_time: day.arrival_time || '',
              departure_time: day.departure_time || '',
              daily_hours: day.daily_hours || 0
            }
          }
        })
        setSchedule(newSchedule)
      }
    } catch (err) {
      console.error('Error loading contract schedule:', err)
      setError('Erreur lors du chargement des horaires.')
    } finally {
      setLoading(false)
    }
  }

  function calculateDailyHours(arrival: string, departure: string): number {
    if (!arrival || !departure) return 0

    const [arrHour, arrMin] = arrival.split(':').map(Number)
    const [depHour, depMin] = departure.split(':').map(Number)

    const arrivalMinutes = arrHour * 60 + arrMin
    const departureMinutes = depHour * 60 + depMin

    const diffMinutes = departureMinutes - arrivalMinutes
    return Math.max(0, diffMinutes / 60)
  }

  function handleTimeChange(day: keyof WeekSchedule, field: 'arrival_time' | 'departure_time', value: string) {
    setSchedule(prev => {
      const newSchedule = { ...prev }
      newSchedule[day] = {
        ...newSchedule[day],
        [field]: value
      }

      // Recalculate daily hours
      if (field === 'arrival_time' || field === 'departure_time') {
        const arrival = field === 'arrival_time' ? value : newSchedule[day].arrival_time
        const departure = field === 'departure_time' ? value : newSchedule[day].departure_time
        newSchedule[day].daily_hours = calculateDailyHours(arrival, departure)
      }

      return newSchedule
    })
  }

  function handleToggleDay(day: keyof WeekSchedule) {
    setSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        is_active: !prev[day].is_active
      }
    }))
  }

  function calculateTotalWeeklyHours(): number {
    return Object.values(schedule).reduce((total, day) => {
      return total + (day.is_active ? day.daily_hours : 0)
    }, 0)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)

    try {
      // Map day names to day_of_week numbers (1 = Monday, 7 = Sunday)
      const dayMapping: Record<string, number> = {
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6,
        sunday: 7
      }

      const scheduleInput: CreateScheduleInput[] = DAYS_OF_WEEK
        .filter(({ key }) => schedule[key].is_active)
        .map(({ key }) => ({
          day_of_week: dayMapping[key],
          is_present: true,
          arrival_time: schedule[key].arrival_time || undefined,
          departure_time: schedule[key].departure_time || undefined
        }))

      await contractService.setSchedule(contractId, scheduleInput)
      router.push(`/owner/contracts/${contractId}`)
    } catch (err) {
      console.error('Error saving schedule:', err)
      setError('Erreur lors de l\'enregistrement des horaires.')
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#9fa8da] mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  if (error && !contract) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Erreur</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => router.push('/owner/contracts')}>
            Retour à la liste
          </Button>
        </div>
      </div>
    )
  }

  if (!contract) return null

  const totalWeeklyHours = calculateTotalWeeklyHours()

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <PageBreadcrumb
        items={[
          { label: 'Tableau de bord', href: '/owner/dashboard' },
          { label: 'Contrats', href: '/owner/contracts' },
          { label: contract.contract_number, href: `/owner/contracts/${contract.id}` },
          { label: 'Horaires', href: `/owner/contracts/${contract.id}/schedule` }
        ]}
      />

      {/* Header */}
      <div className="flex items-center gap-4 mb-6 mt-4">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="p-2"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Horaires Hebdomadaires</h1>
          <p className="text-gray-600 mt-1">
            Contrat {contract.contract_number} - {contract.child_first_name} {contract.child_last_name}
          </p>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <Card className="p-4 mb-6 bg-red-50 border-red-200">
          <p className="text-red-800">{error}</p>
        </Card>
      )}

      {/* Weekly Hours Summary */}
      <Card className="p-6 mb-6 bg-gradient-to-br from-blue-50 to-white border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">Total hebdomadaire</p>
            <p className="text-3xl font-bold text-blue-700">{totalWeeklyHours.toFixed(1)}h</p>
          </div>
          <ClockIcon className="h-12 w-12 text-blue-500" />
        </div>
      </Card>

      {/* Schedule Editor */}
      <Card className="p-6 border-l-4 border-l-[#9fa8da]">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Planning Hebdomadaire</h2>

        <div className="space-y-4">
          {DAYS_OF_WEEK.map(({ key, label }) => (
            <div
              key={key}
              className={`p-4 rounded-lg border-2 ${
                schedule[key].is_active
                  ? 'border-[#9fa8da] bg-white'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-4">
                {/* Toggle checkbox */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={schedule[key].is_active}
                    onChange={() => handleToggleDay(key)}
                    className="w-5 h-5 text-[#9fa8da] rounded"
                  />
                </div>

                {/* Day label */}
                <div className="w-28">
                  <p className={`font-medium ${schedule[key].is_active ? 'text-gray-900' : 'text-gray-400'}`}>
                    {label}
                  </p>
                </div>

                {/* Time inputs */}
                {schedule[key].is_active ? (
                  <>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-600 mb-1">Arrivée</label>
                      <Input
                        type="time"
                        value={schedule[key].arrival_time}
                        onChange={(e) => handleTimeChange(key, 'arrival_time', e.target.value)}
                        className="w-full"
                      />
                    </div>

                    <div className="flex-1">
                      <label className="block text-xs text-gray-600 mb-1">Départ</label>
                      <Input
                        type="time"
                        value={schedule[key].departure_time}
                        onChange={(e) => handleTimeChange(key, 'departure_time', e.target.value)}
                        className="w-full"
                      />
                    </div>

                    <div className="w-24 text-right">
                      <label className="block text-xs text-gray-600 mb-1">Heures</label>
                      <p className="text-lg font-bold text-[#9fa8da]">
                        {schedule[key].daily_hours.toFixed(1)}h
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="flex-1 text-gray-400 italic">Jour non travaillé</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4 mt-6 pt-6 border-t">
          <Button
            variant="outline"
            onClick={() => router.back()}
            disabled={saving}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#9fa8da] hover:bg-[#9fa8da]/90 text-white"
          >
            <CheckCircleIcon className="h-5 w-5 mr-2" />
            {saving ? 'Enregistrement...' : 'Enregistrer les horaires'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
