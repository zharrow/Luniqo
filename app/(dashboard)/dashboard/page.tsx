'use client'

import { useState } from 'react'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import DashboardLayout from '@/components/layout/DashboardLayout'
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

export default function DashboardPage() {
  const { session, isLoading } = useRequireAuth(['Admin'])
  const [calendarView, setCalendarView] = useState<'weekly' | 'daily'>('daily')

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
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

        {/* Quick actions - Bento Grid style */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Actions rapides</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 auto-rows-[140px]">
            {/* Action principale - Nouvelle session (double largeur) */}
            <a
              href="/dashboard/sessions"
              className="col-span-2 row-span-1 bg-linear-to-br from-primary-50 to-primary-100 rounded-xl p-6 hover:shadow-lg transition-all group border border-primary-200 relative overflow-hidden"
            >
              <div className="relative z-10">
                <ClipboardDocumentCheckIcon className="w-8 h-8 text-primary-600 mb-3 group-hover:scale-110 transition-transform" />
                <h3 className="font-semibold text-lg text-gray-900">Nouvelle session</h3>
                <p className="text-sm text-muted-foreground mt-1">Démarrer une session de nettoyage</p>
              </div>
              {/* Effet de fond subtil */}
              <div className="absolute -right-4 -bottom-4 opacity-10">
                <ClipboardDocumentCheckIcon className="w-32 h-32 text-primary-600" />
              </div>
            </a>

            {/* HACCP - accent success */}
            <a
              href="/dashboard/haccp"
              className="bg-linear-to-br from-success-50 to-success-100 rounded-xl p-5 hover:shadow-lg transition-all group border border-success-200 relative overflow-hidden"
            >
              <div className="relative z-10">
                <BeakerIcon className="w-7 h-7 text-success-600 mb-2 group-hover:scale-110 transition-transform" />
                <h3 className="font-medium text-gray-900">HACCP</h3>
                <p className="text-xs text-muted-foreground mt-1">Traçabilité</p>
              </div>
            </a>

            {/* Gérer les pièces */}
            <a
              href="/dashboard/rooms"
              className="bg-linear-to-br from-secondary-50 to-secondary-100 rounded-xl p-5 hover:shadow-lg transition-all group border border-secondary-200 relative overflow-hidden"
            >
              <div className="relative z-10">
                <BuildingOfficeIcon className="w-7 h-7 text-secondary-600 mb-2 group-hover:scale-110 transition-transform" />
                <h3 className="font-medium text-gray-900">Pièces</h3>
                <p className="text-xs text-muted-foreground mt-1">Gérer</p>
              </div>
            </a>

            {/* Gérer les tâches */}
            <a
              href="/dashboard/tasks"
              className="bg-linear-to-br from-accent-50 to-accent-100 rounded-xl p-5 hover:shadow-lg transition-all group border border-accent-200 relative overflow-hidden"
            >
              <div className="relative z-10">
                <ClipboardDocumentListIcon className="w-7 h-7 text-accent-600 mb-2 group-hover:scale-110 transition-transform" />
                <h3 className="font-medium text-gray-900">Tâches</h3>
                <p className="text-xs text-muted-foreground mt-1">Gérer</p>
              </div>
            </a>

            {/* Gérer les employés */}
            <a
              href="/dashboard/users"
              className="bg-linear-to-br from-primary-50 to-primary-100 rounded-xl p-5 hover:shadow-lg transition-all group border border-primary-200 relative overflow-hidden"
            >
              <div className="relative z-10">
                <UserGroupIcon className="w-7 h-7 text-primary-600 mb-2 group-hover:scale-110 transition-transform" />
                <h3 className="font-medium text-gray-900">Employés</h3>
                <p className="text-xs text-muted-foreground mt-1">Gérer</p>
              </div>
            </a>

            {/* Calendrier - double hauteur sur grands écrans */}
            <a
              href="#calendar"
              onClick={(e) => { e.preventDefault(); document.getElementById('calendar')?.scrollIntoView({ behavior: 'smooth' }) }}
              className="col-span-2 md:col-span-1 bg-linear-to-br from-purple-50 to-purple-100 rounded-xl p-5 hover:shadow-lg transition-all group border border-purple-200 relative overflow-hidden"
            >
              <div className="relative z-10">
                <CalendarDaysIcon className="w-7 h-7 text-purple-600 mb-2 group-hover:scale-110 transition-transform" />
                <h3 className="font-medium text-gray-900">Calendrier</h3>
                <p className="text-xs text-muted-foreground mt-1">Consulter</p>
              </div>
            </a>

            {/* Paramètres */}
            <a
              href="/dashboard/profil"
              className="bg-linear-to-br from-gray-50 to-gray-100 rounded-xl p-5 hover:shadow-lg transition-all group border border-gray-200 relative overflow-hidden"
            >
              <div className="relative z-10">
                <Cog6ToothIcon className="w-7 h-7 text-gray-600 mb-2 group-hover:scale-110 transition-transform" />
                <h3 className="font-medium text-gray-900">Paramètres</h3>
                <p className="text-xs text-muted-foreground mt-1">Profil</p>
              </div>
            </a>
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
            {calendarView === 'weekly' ? (
              <WeeklyCalendar enterpriseId={session.enterprise.id} />
            ) : (
              <DailyCalendar enterpriseId={session.enterprise.id} />
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
