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
  MapPinIcon,
} from '@heroicons/react/24/outline'
import { calendarService, type DayTasks, type CalendarTask } from '@/lib/services/calendar.service'
import { roomsService, type Room } from '@/lib/services/rooms.service'

interface DailyCalendarProps {
  nurseryId: string
}

export function DailyCalendar({ nurseryId }: DailyCalendarProps) {
  const [dayData, setDayData] = useState<DayTasks | null>(null)
  const [dayOffset, setDayOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [rooms, setRooms] = useState<Room[]>([])
  const [selectedRoom, setSelectedRoom] = useState<string>('all')

  useEffect(() => {
    loadRooms()
  }, [nurseryId])

  useEffect(() => {
    loadDayData()
  }, [nurseryId, dayOffset, selectedRoom])

  async function loadRooms() {
    try {
      const data = await roomsService.getActive(nurseryId)
      setRooms(data)
    } catch (error) {
      console.error('Error loading rooms:', error)
    }
  }

  async function loadDayData() {
    try {
      setLoading(true)
      const roomFilter = selectedRoom === 'all' ? undefined : selectedRoom
      const data = await calendarService.getDailyData(nurseryId, dayOffset, roomFilter)
      setDayData(data)
    } catch (error) {
      console.error('Error loading day data:', error)
    } finally {
      setLoading(false)
    }
  }

  function handlePreviousDay() {
    setDayOffset(dayOffset - 1)
  }

  function handleNextDay() {
    setDayOffset(dayOffset + 1)
  }

  function handleToday() {
    setDayOffset(0)
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


  // Generate timeline hours (6 AM to 10 PM)
  const timelineHours = Array.from({ length: 17 }, (_, i) => i + 6) // 6 to 22

  // Position tasks on timeline
  function getTasksForHour(hour: number): CalendarTask[] {
    if (!dayData) return []

    return dayData.tasks.filter(task => {
      if (!task.suggestedTime) return false
      const taskHour = parseInt(task.suggestedTime.split(':')[0])
      return taskHour === hour
    })
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Calendrier journalier</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        </CardContent>
      </Card>
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

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-primary-600" />
              Calendrier journalier
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1 capitalize">
              {dateStr}
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

            {/* Day navigation */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousDay}
              >
                <ChevronLeftIcon className="w-4 h-4" />
              </Button>

              {dayOffset !== 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToday}
                >
                  Aujourd'hui
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={handleNextDay}
              >
                <ChevronRightIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Empty state */}
        {dayData.tasks.length === 0 ? (
          <div className="text-center py-12">
            <CalendarIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              Aucune tâche planifiée pour cette journée
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Assignez des tâches aux pièces pour les voir apparaître ici
            </p>
          </div>
        ) : (
          <>
            {/* Timeline view */}
            <div className="space-y-0 border border-gray-200 rounded-lg overflow-hidden">
                {timelineHours.map((hour) => {
                  const hourTasks = getTasksForHour(hour)
                  const displayHour = hour.toString().padStart(2, '0')
                  const hasCurrentHour = dayData.isToday && new Date().getHours() === hour

                  return (
                    <div
                      key={hour}
                      className={`flex border-b last:border-b-0 ${
                        hasCurrentHour ? 'bg-primary-50 border-primary-200' : 'bg-white'
                      }`}
                    >
                      {/* Hour label */}
                      <div className={`w-20 flex-shrink-0 p-3 border-r border-gray-200 flex items-start justify-center font-medium ${
                        hasCurrentHour ? 'bg-primary-100 text-primary-700' : 'bg-gray-50 text-gray-700'
                      }`}>
                        <div className="text-center">
                          <div className="text-lg">{displayHour}:00</div>
                          {hasCurrentHour && (
                            <div className="text-xs mt-1">Maintenant</div>
                          )}
                        </div>
                      </div>

                      {/* Tasks for this hour */}
                      <div className="flex-1 p-3">
                        {hourTasks.length === 0 ? (
                          <div className="text-sm text-muted-foreground italic py-2">
                            Aucune tâche
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {hourTasks.map((task) => (
                              <div
                                key={task.assignedTaskId}
                                className="p-3 rounded-lg border-2 bg-white hover:shadow-md transition-shadow"
                              >
                                {/* Task name */}
                                <div className="font-medium text-sm mb-2">
                                  {task.name}
                                </div>

                                {/* Room name */}
                                {selectedRoom === 'all' && (
                                  <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                                    <MapPinIcon className="w-3 h-3" />
                                    {task.room.name}
                                  </div>
                                )}

                                {/* Time and duration */}
                                <div className="text-sm font-medium text-primary-700 mb-2 flex items-center gap-1">
                                  <ClockIcon className="w-4 h-4" />
                                  {task.suggestedTime}
                                  {task.expectedDuration && (
                                    <span className="text-xs text-muted-foreground">
                                      ({task.expectedDuration} min)
                                    </span>
                                  )}
                                </div>

                                {/* Status badge */}
                                <Badge
                                  variant={getStatusBadgeVariant(task.status)}
                                  className="text-xs w-full justify-center"
                                >
                                  {getStatusLabel(task.status)}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
