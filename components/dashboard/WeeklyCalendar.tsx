'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import { calendarService, type WeekData, type CalendarTask } from '@/lib/services/calendar.service'
import { roomsService, type Room } from '@/lib/services/rooms.service'

interface WeeklyCalendarProps {
  enterpriseId: string
}

export function WeeklyCalendar({ enterpriseId }: WeeklyCalendarProps) {
  const [weekData, setWeekData] = useState<WeekData | null>(null)
  const [weekOffset, setWeekOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [rooms, setRooms] = useState<Room[]>([])
  const [selectedRoom, setSelectedRoom] = useState<string>('all')

  useEffect(() => {
    loadRooms()
  }, [enterpriseId])

  useEffect(() => {
    loadWeekData()
  }, [enterpriseId, weekOffset, selectedRoom])

  async function loadRooms() {
    try {
      const data = await roomsService.getActive(enterpriseId)
      setRooms(data)
    } catch (error) {
      console.error('Error loading rooms:', error)
    }
  }

  async function loadWeekData() {
    try {
      setLoading(true)
      const roomFilter = selectedRoom === 'all' ? undefined : selectedRoom
      const data = await calendarService.getWeeklyData(enterpriseId, weekOffset, roomFilter)
      setWeekData(data)
    } catch (error) {
      console.error('Error loading week data:', error)
    } finally {
      setLoading(false)
    }
  }

  function handlePreviousWeek() {
    setWeekOffset(weekOffset - 1)
  }

  function handleNextWeek() {
    setWeekOffset(weekOffset + 1)
  }

  function handleThisWeek() {
    setWeekOffset(0)
  }

  function getStatusBadgeVariant(status: CalendarTask['status']) {
    switch (status) {
      case 'done':
        return 'success'
      case 'in_progress':
        return 'warning'
      case 'todo':
      default:
        return 'secondary'
    }
  }

  function getStatusLabel(status: CalendarTask['status']) {
    switch (status) {
      case 'done':
        return 'Fait'
      case 'in_progress':
        return 'En cours'
      case 'todo':
      default:
        return 'À faire'
    }
  }

  function getTypeColor(type: CalendarTask['type']) {
    switch (type) {
      case 'DAILY':
        return 'bg-primary-100 text-primary-700 border-primary-200'
      case 'WEEKLY':
        return 'bg-secondary-100 text-secondary-700 border-secondary-200'
      case 'MONTHLY':
        return 'bg-accent-100 text-accent-700 border-accent-200'
      case 'OCCASIONAL':
        return 'bg-gray-100 text-gray-700 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  function getTypeLabel(type: CalendarTask['type']) {
    switch (type) {
      case 'DAILY':
        return 'Quotidien'
      case 'WEEKLY':
        return 'Hebdo'
      case 'MONTHLY':
        return 'Mensuel'
      case 'OCCASIONAL':
        return 'Occasionnel'
      default:
        return type
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Calendrier hebdomadaire</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!weekData) {
    return null
  }

  const weekStartStr = weekData.weekStart.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
  const weekEndStr = weekData.weekEnd.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-primary-600" />
              Calendrier hebdomadaire
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {weekStartStr} - {weekEndStr}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Room filter */}
            <Select value={selectedRoom} onValueChange={setSelectedRoom}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Toutes les pièces" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les pièces</SelectItem>
                {rooms.map(room => (
                  <SelectItem key={room.id} value={room.id}>
                    {room.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Week navigation */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousWeek}
              >
                <ChevronLeftIcon className="w-4 h-4" />
              </Button>

              {weekOffset !== 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleThisWeek}
                >
                  Aujourd'hui
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={handleNextWeek}
              >
                <ChevronRightIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Calendar grid - 5 days (Monday to Friday) */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {weekData.days.map((day) => (
            <div
              key={day.date.toISOString()}
              className={`rounded-lg border-2 ${
                day.isToday
                  ? 'border-primary-400 bg-primary-50/50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              {/* Day header */}
              <div
                className={`p-3 border-b ${
                  day.isToday ? 'border-primary-400 bg-primary-100' : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="text-sm font-medium capitalize text-gray-700">
                  {day.dayName}
                </div>
                <div
                  className={`text-2xl font-bold ${
                    day.isToday ? 'text-primary-700' : 'text-gray-900'
                  }`}
                >
                  {day.dayNumber}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {day.tasks.length} tâche{day.tasks.length > 1 ? 's' : ''}
                </div>
              </div>

              {/* Tasks list */}
              <div className="p-2 space-y-2 max-h-[500px] overflow-y-auto">
                {day.tasks.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    Aucune tâche
                  </div>
                ) : (
                  day.tasks.map((task) => (
                    <div
                      key={task.assignedTaskId}
                      className="p-3 rounded-md border bg-white hover:shadow-md transition-shadow"
                    >
                      {/* Task name */}
                      <div className="font-medium text-sm mb-2 line-clamp-2">
                        {task.name}
                      </div>

                      {/* Room name */}
                      {selectedRoom === 'all' && (
                        <div className="text-xs text-muted-foreground mb-2">
                          📍 {task.room.name}
                        </div>
                      )}

                      {/* Task metadata */}
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full border ${getTypeColor(
                            task.type
                          )}`}
                        >
                          {getTypeLabel(task.type)}
                        </span>

                        {task.suggestedTime && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <ClockIcon className="w-3 h-3" />
                            {task.suggestedTime}
                          </span>
                        )}
                      </div>

                      {/* Status badge */}
                      <Badge
                        variant={getStatusBadgeVariant(task.status)}
                        className="text-xs"
                      >
                        {getStatusLabel(task.status)}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Empty state */}
        {weekData.days.every(day => day.tasks.length === 0) && (
          <div className="text-center py-12">
            <CalendarIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              Aucune tâche planifiée pour cette semaine
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Assignez des tâches aux pièces pour les voir apparaître ici
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
