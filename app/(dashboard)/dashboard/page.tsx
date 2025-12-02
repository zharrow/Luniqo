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

        {/* Quick actions - Bento Grid style avec couleurs par module */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Actions rapides</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 auto-rows-[140px]">
            {/* Action principale - Nouvelle session (double largeur) - Module Clean */}
            <a
              href="/dashboard/sessions"
              className="col-span-2 row-span-1 bg-gradient-to-br from-[#e3f2fd] to-white rounded-xl p-6 hover:shadow-lg transition-all group border-l-4 border-[#5a9dc9] relative overflow-hidden"
            >
              <div className="relative z-10">
                <ClipboardDocumentCheckIcon className="w-8 h-8 text-[#2c5f7f] mb-3 group-hover:scale-110 transition-transform" />
                <h3 className="font-semibold text-lg text-gray-900">Nouvelle session</h3>
                <p className="text-sm text-muted-foreground mt-1">Démarrer une session de nettoyage</p>
              </div>
              {/* Effet de fond subtil */}
              <div className="absolute -right-4 -bottom-4 opacity-10">
                <ClipboardDocumentCheckIcon className="w-32 h-32 text-[#5a9dc9]" />
              </div>
            </a>

            {/* HACCP - Module HACCP (Vert) */}
            <a
              href="/dashboard/haccp"
              className="bg-gradient-to-br from-[#e8f5e9] to-white rounded-xl p-5 hover:shadow-lg transition-all group border-l-4 border-[#81c995] relative overflow-hidden"
            >
              <div className="relative z-10">
                <BeakerIcon className="w-7 h-7 text-[#4a8f5a] mb-2 group-hover:scale-110 transition-transform" />
                <h3 className="font-medium text-gray-900">HACCP</h3>
                <p className="text-xs text-muted-foreground mt-1">Traçabilité</p>
              </div>
            </a>

            {/* Gérer les pièces - Module Clean (Bleu) */}
            <a
              href="/dashboard/rooms"
              className="bg-gradient-to-br from-[#e3f2fd] to-white rounded-xl p-5 hover:shadow-lg transition-all group border-l-4 border-[#5a9dc9] relative overflow-hidden"
            >
              <div className="relative z-10">
                <BuildingOfficeIcon className="w-7 h-7 text-[#2c5f7f] mb-2 group-hover:scale-110 transition-transform" />
                <h3 className="font-medium text-gray-900">Pièces</h3>
                <p className="text-xs text-muted-foreground mt-1">Gérer</p>
              </div>
            </a>

            {/* Gérer les tâches - Module Tasks (Lime) */}
            <a
              href="/dashboard/tasks"
              className="bg-gradient-to-br from-[#f1f8e9] to-white rounded-xl p-5 hover:shadow-lg transition-all group border-l-4 border-[#aed581] relative overflow-hidden"
            >
              <div className="relative z-10">
                <ClipboardDocumentListIcon className="w-7 h-7 text-[#7da453] mb-2 group-hover:scale-110 transition-transform" />
                <h3 className="font-medium text-gray-900">Tâches</h3>
                <p className="text-xs text-muted-foreground mt-1">Gérer</p>
              </div>
            </a>

            {/* Gérer les employés - Module Users (Rose) */}
            <a
              href="/dashboard/users"
              className="bg-gradient-to-br from-[#fce4ec] to-white rounded-xl p-5 hover:shadow-lg transition-all group border-l-4 border-[#f4a5a5] relative overflow-hidden"
            >
              <div className="relative z-10">
                <UserGroupIcon className="w-7 h-7 text-[#c66b6b] mb-2 group-hover:scale-110 transition-transform" />
                <h3 className="font-medium text-gray-900">Employés</h3>
                <p className="text-xs text-muted-foreground mt-1">Gérer</p>
              </div>
            </a>

            {/* Calendrier - Module Calendar (Pêche) */}
            <a
              href="#calendar"
              onClick={(e) => { e.preventDefault(); document.getElementById('calendar')?.scrollIntoView({ behavior: 'smooth' }) }}
              className="col-span-2 md:col-span-1 bg-gradient-to-br from-[#fff3e0] to-white rounded-xl p-5 hover:shadow-lg transition-all group border-l-4 border-[#ffab91] relative overflow-hidden"
            >
              <div className="relative z-10">
                <CalendarDaysIcon className="w-7 h-7 text-[#d97557] mb-2 group-hover:scale-110 transition-transform" />
                <h3 className="font-medium text-gray-900">Calendrier</h3>
                <p className="text-xs text-muted-foreground mt-1">Consulter</p>
              </div>
            </a>

            {/* Paramètres - Module Settings (Violet) */}
            <a
              href="/dashboard/profil"
              className="bg-gradient-to-br from-[#f3e5f5] to-white rounded-xl p-5 hover:shadow-lg transition-all group border-l-4 border-[#b39ddb] relative overflow-hidden"
            >
              <div className="relative z-10">
                <Cog6ToothIcon className="w-7 h-7 text-[#7e57a3] mb-2 group-hover:scale-110 transition-transform" />
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
