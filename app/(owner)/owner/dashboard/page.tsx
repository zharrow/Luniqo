'use client'

import { useState } from 'react'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
import { Button } from '@/components/ui/button'
import { WeeklyCalendar } from '@/components/dashboard/WeeklyCalendar'
import { DailyCalendar } from '@/components/dashboard/DailyCalendar'

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
        {/* Page header */}
        <div className="mb-6 pb-6 border-b border-gray-200">
          <h1 className="text-3xl font-bold mb-2">
            Tableau de bord
          </h1>
          <p className="text-muted-foreground">
            Bienvenue {(session?.user as any)?.first_name || (session?.user as any)?.email} !
          </p>
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
