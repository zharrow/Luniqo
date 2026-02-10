'use client'

import { useState } from 'react'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
import { Button } from '@/components/ui/button'
import { WeeklyCalendar } from '@/components/dashboard/WeeklyCalendar'
import { DailyCalendar } from '@/components/dashboard/DailyCalendar'
import { Squares2X2Icon } from '@heroicons/react/24/outline'

export default function DashboardPage() {
  const { session, isLoading } = useRequireAuth(['Owner'])
  const { selectedNursery } = useNursery()
  const [calendarView, setCalendarView] = useState<'weekly' | 'daily'>('weekly')

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-100">
              <Squares2X2Icon className="w-6 h-6 text-blue-600" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
              <p className="text-sm text-muted-foreground">
                Bienvenue {(session?.user as any)?.first_name} {(session?.user as any)?.last_name} 🙌
              </p>
            </div>
          </div>
        </div>

        {/* Calendar Section */}
        {session?.enterprise?.id && (
          <div id="calendar" className="mb-8">
            {/* View Toggle Buttons */}
            <div className="flex items-center gap-2 mb-4">
              <Button
                variant={calendarView === 'weekly' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCalendarView('weekly')}
                className="transition-all"
              >
                Vue hebdomadaire
              </Button>
              <Button
                variant={calendarView === 'daily' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCalendarView('daily')}
                className="transition-all"
              >
                Vue journalière
              </Button>
            </div>

            {/* Calendar Component */}
            {selectedNursery?.id && (
              calendarView === 'weekly' ? (
                <WeeklyCalendar nurseryId={selectedNursery.id} />
              ) : (
                <DailyCalendar nurseryId={selectedNursery.id} />
              )
            )}
          </div>
        )}
    </div>
  )
}
