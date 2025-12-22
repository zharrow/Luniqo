'use client'

import { useState } from 'react'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
import {
  BuildingOfficeIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
  ClipboardDocumentCheckIcon,
  BeakerIcon,
  CalendarDaysIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { WeeklyCalendar } from '@/components/dashboard/WeeklyCalendar'
import { DailyCalendar } from '@/components/dashboard/DailyCalendar'
import { ModuleCard } from '@/components/shared/ModuleCard'

export default function DashboardPage() {
  const { session, isLoading } = useRequireAuth(['Owner'])
  const { selectedNursery } = useNursery()
  const [calendarView, setCalendarView] = useState<'weekly' | 'daily'>('daily')

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

        {/* Quick actions - Modernité Organique avec couleurs variées */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Actions rapides</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Nouvelle session - Module Clean (Bleu) */}
            <ModuleCard
              module="clean"
              href="/owner/sessions"
              icon={<ClipboardDocumentCheckIcon className="w-5 h-5" strokeWidth={1.5} />}
              title="Nouvelle session"
              description="Démarrer une session de nettoyage"
              status={{ label: 'Disponible', active: true }}
            />

            {/* HACCP - Module HACCP (Vert) */}
            <ModuleCard
              module="haccp"
              href="/owner/haccp"
              icon={<BeakerIcon className="w-5 h-5" strokeWidth={1.5} />}
              title="HACCP"
              description="Traçabilité alimentaire"
            />

            {/* Pièces - Module Settings (Violet) */}
            <ModuleCard
              module="settings"
              href="/owner/rooms"
              icon={<BuildingOfficeIcon className="w-5 h-5" strokeWidth={1.5} />}
              title="Pièces"
              description="Gérer les espaces"
            />

            {/* Tâches - Module Tasks (Lime) */}
            <ModuleCard
              module="tasks"
              href="/owner/tasks"
              icon={<ClipboardDocumentListIcon className="w-5 h-5" strokeWidth={1.5} />}
              title="Tâches"
              description="Gérer les modèles de tâches"
            />

            {/* Employés - Module Users (Rose) */}
            <ModuleCard
              module="users"
              href="/owner/users"
              icon={<UserGroupIcon className="w-5 h-5" strokeWidth={1.5} />}
              title="Employés"
              description="Gérer l'équipe"
            />

            {/* Calendrier - Module Calendar (Pêche) */}
            <ModuleCard
              module="calendar"
              href="#calendar"
              icon={<CalendarDaysIcon className="w-5 h-5" strokeWidth={1.5} />}
              title="Calendrier"
              description="Vue planning"
            />

            {/* Historique - Module Analytics (Indigo) */}
            <ModuleCard
              module="analytics"
              href="/owner/history"
              icon={<ClipboardDocumentCheckIcon className="w-5 h-5" strokeWidth={1.5} />}
              title="Historique"
              description="Sessions passées"
            />

            {/* Paramètres - Module Communication (Turquoise) */}
            <ModuleCard
              module="communication"
              href="/owner/profil"
              icon={<Cog6ToothIcon className="w-5 h-5" strokeWidth={1.5} />}
              title="Paramètres"
              description="Mon profil et crèche"
            />
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
