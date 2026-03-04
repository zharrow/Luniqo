'use client'

import { useEffect, useState } from 'react'
import { calendarService, type DayTasks, type CalendarTask } from '@/lib/services/calendar.service'
import { ClockIcon } from '@heroicons/react/24/outline'

interface DailyCalendarProps {
  nurseryId: string
  roomId: string
  onTaskClick?: (task: CalendarTask) => void
  selectedTaskIds?: string[]
  refreshTrigger?: number // Add a refresh trigger to force reload
}

export function DailyCalendar({
  nurseryId,
  roomId,
  onTaskClick,
  selectedTaskIds = [],
  refreshTrigger = 0
}: DailyCalendarProps) {
  const [dayData, setDayData] = useState<DayTasks | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDayData()
  }, [nurseryId, roomId, refreshTrigger])

  async function loadDayData() {
    try {
      setLoading(true)
      const data = await calendarService.getDailyData(nurseryId, 0, roomId)
      setDayData(data)
    } catch (error) {
      console.error('Error loading day data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="card p-8">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-16 w-16 border-8 border-primary-200 border-t-primary-500"></div>
        </div>
      </div>
    )
  }

  if (!dayData) {
    return null
  }

  const dateStr = dayData.date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  // Filter out completed tasks (they should not be visible)
  const pendingTasks = dayData.tasks.filter(task => task.status !== 'done')
  const completedCount = dayData.tasks.length - pendingTasks.length

  return (
    <div className="card p-6 bg-white">
      {/* Header */}
      <div className="grid grid-cols-2 justify-items mb-6 pb-4 border-primary-100">
        <h2 className="text-3xl font-bold text-primary-700 mb-2 capitalize" style={{ fontFamily: 'Quicksand, sans-serif' }}>
          Programme du jour
        </h2>
        <p className="text-xl text-muted-foreground capitalize">
          {dateStr}
        </p>
        <p className="text-lg text-muted-foreground mt-2">
          {pendingTasks.length} tâche{pendingTasks.length > 1 ? 's' : ''} à réaliser
          {completedCount > 0 && (
            <span className="text-success-600 font-semibold ml-2">
              ({completedCount} déjà validée{completedCount > 1 ? 's' : ''})
            </span>
          )}
        </p>
      </div>

      {/* Tasks List */}
      {pendingTasks.length === 0 ? (
        <div className="text-center py-12">
          <svg className="w-20 h-20 text-muted-foreground/30 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-2xl text-muted-foreground">Aucune tâche pour aujourd'hui</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingTasks.map((task, index) => {
            const isSelected = selectedTaskIds.includes(task.assignedTaskId)

            return (
              <div
                key={task.assignedTaskId}
                onClick={() => onTaskClick?.(task)}
                className={`p-6 rounded-2xl border-2 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-success-50 border-success-500 shadow-lg'
                    : 'bg-white border-primary-300 shadow-md'
                }`}
              >
                <div className="flex items-center gap-6">
                  {/* Time Badge */}
                  <div className={`flex-shrink-0 flex flex-col items-center justify-center w-24 h-24 rounded-xl ${
                    task.suggestedTime
                      ? 'bg-primary-100 text-primary-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {task.suggestedTime ? (
                      <>
                        <ClockIcon className="w-8 h-8 mb-1" />
                        <span className="text-xl font-bold">{task.suggestedTime}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-3xl font-bold">{index + 1}</span>
                        <span className="text-xs">tâche</span>
                      </>
                    )}
                  </div>

                  {/* Task Info */}
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold mb-2">
                      {task.name}
                    </h3>

                    {task.expectedDuration && (
                      <p className="text-lg text-muted-foreground">
                        Durée estimée : {task.expectedDuration} min
                      </p>
                    )}
                  </div>

                  {/* Selection Indicator */}
                  {isSelected && (
                    <div className="flex-shrink-0 w-16 h-16 rounded-full bg-success-500 flex items-center justify-center">
                      <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
