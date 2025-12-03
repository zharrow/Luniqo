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

        {/* Quick actions - Style Douceur Professionnelle */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Actions rapides</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 auto-rows-[140px]">
            {/* Action principale - Nouvelle session (double largeur) - Module Clean */}
            <a
              href="/dashboard/sessions"
              className="col-span-2 row-span-1 relative rounded-3xl p-6 bg-white hover:-translate-y-1 hover:shadow-[0_16px_48px_-12px_rgba(90,157,201,0.25)] transition-all duration-300 group overflow-hidden border border-[#5a9dc9]/20"
            >
              {/* Gradient pastel très doux en fond */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#f8fbfd] to-white opacity-60"></div>

              <div className="relative z-10 flex items-start justify-between">
                <div className="flex-1">
                  {/* Icône avec fond pastel arrondi */}
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-[#5a9dc9]/10 to-[#5a9dc9]/5 mb-4 group-hover:scale-105 group-hover:rotate-2 transition-all duration-300">
                    <ClipboardDocumentCheckIcon className="w-6 h-6 text-[#5a9dc9]" strokeWidth={1.5} />
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg text-gray-900 mb-1 tracking-tight">
                      Nouvelle session
                    </h3>
                    <p className="text-sm text-gray-600">
                      Démarrer une session de nettoyage
                    </p>
                  </div>
                </div>

                {/* Chevron doux */}
                <div className="mt-3 w-8 h-8 rounded-full bg-[#5a9dc9]/8 flex items-center justify-center opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                  <svg className="w-4 h-4 text-[#5a9dc9]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>

              {/* Status indicator ludique */}
              <div className="absolute bottom-5 right-5 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="relative">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75"></div>
                </div>
                <span className="text-xs text-gray-500 font-medium">Disponible</span>
              </div>
            </a>

            {/* HACCP - Module HACCP (Vert) */}
            <a
              href="/dashboard/haccp"
              className="relative rounded-3xl p-5 bg-white hover:-translate-y-1 hover:shadow-[0_16px_48px_-12px_rgba(129,201,149,0.25)] transition-all duration-300 group overflow-hidden border border-[#81c995]/20"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#f1f9f3] to-white opacity-60"></div>

              <div className="relative z-10">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-[#81c995]/10 to-[#81c995]/5 mb-3 group-hover:scale-105 group-hover:rotate-2 transition-all duration-300">
                  <BeakerIcon className="w-5 h-5 text-[#4a8f5a]" strokeWidth={1.5} />
                </div>
                <h3 className="font-semibold text-base text-gray-900 mb-0.5">HACCP</h3>
                <p className="text-xs text-gray-600">Traçabilité</p>
              </div>
            </a>

            {/* Gérer les pièces - Module Clean (Bleu) */}
            <a
              href="/dashboard/rooms"
              className="relative rounded-3xl p-5 bg-white hover:-translate-y-1 hover:shadow-[0_16px_48px_-12px_rgba(90,157,201,0.25)] transition-all duration-300 group overflow-hidden border border-[#5a9dc9]/20"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#f8fbfd] to-white opacity-60"></div>

              <div className="relative z-10">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-[#5a9dc9]/10 to-[#5a9dc9]/5 mb-3 group-hover:scale-105 group-hover:rotate-2 transition-all duration-300">
                  <BuildingOfficeIcon className="w-5 h-5 text-[#2c5f7f]" strokeWidth={1.5} />
                </div>
                <h3 className="font-semibold text-base text-gray-900 mb-0.5">Pièces</h3>
                <p className="text-xs text-gray-600">Gérer</p>
              </div>
            </a>

            {/* Gérer les tâches - Module Tasks (Lime) */}
            <a
              href="/dashboard/tasks"
              className="relative rounded-3xl p-5 bg-white hover:-translate-y-1 hover:shadow-[0_16px_48px_-12px_rgba(174,213,129,0.25)] transition-all duration-300 group overflow-hidden border border-[#aed581]/20"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#f9fcf5] to-white opacity-60"></div>

              <div className="relative z-10">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-[#aed581]/10 to-[#aed581]/5 mb-3 group-hover:scale-105 group-hover:rotate-2 transition-all duration-300">
                  <ClipboardDocumentListIcon className="w-5 h-5 text-[#7da453]" strokeWidth={1.5} />
                </div>
                <h3 className="font-semibold text-base text-gray-900 mb-0.5">Tâches</h3>
                <p className="text-xs text-gray-600">Gérer</p>
              </div>
            </a>

            {/* Gérer les employés - Module Users (Rose) */}
            <a
              href="/dashboard/users"
              className="relative rounded-3xl p-5 bg-white hover:-translate-y-1 hover:shadow-[0_16px_48px_-12px_rgba(244,165,165,0.25)] transition-all duration-300 group overflow-hidden border border-[#f4a5a5]/20"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#fef6f7] to-white opacity-60"></div>

              <div className="relative z-10">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-[#f4a5a5]/10 to-[#f4a5a5]/5 mb-3 group-hover:scale-105 group-hover:rotate-2 transition-all duration-300">
                  <UserGroupIcon className="w-5 h-5 text-[#c66b6b]" strokeWidth={1.5} />
                </div>
                <h3 className="font-semibold text-base text-gray-900 mb-0.5">Employés</h3>
                <p className="text-xs text-gray-600">Gérer</p>
              </div>
            </a>

            {/* Calendrier - Module Calendar (Pêche) */}
            <a
              href="#calendar"
              onClick={(e) => { e.preventDefault(); document.getElementById('calendar')?.scrollIntoView({ behavior: 'smooth' }) }}
              className="col-span-2 md:col-span-1 relative rounded-3xl p-5 bg-white hover:-translate-y-1 hover:shadow-[0_16px_48px_-12px_rgba(255,171,145,0.25)] transition-all duration-300 group overflow-hidden border border-[#ffab91]/20"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#fffaf8] to-white opacity-60"></div>

              <div className="relative z-10">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-[#ffab91]/10 to-[#ffab91]/5 mb-3 group-hover:scale-105 group-hover:rotate-2 transition-all duration-300">
                  <CalendarDaysIcon className="w-5 h-5 text-[#d97557]" strokeWidth={1.5} />
                </div>
                <h3 className="font-semibold text-base text-gray-900 mb-0.5">Calendrier</h3>
                <p className="text-xs text-gray-600">Consulter</p>
              </div>
            </a>

            {/* Paramètres - Module Settings (Violet) */}
            <a
              href="/dashboard/profil"
              className="relative rounded-3xl p-5 bg-white hover:-translate-y-1 hover:shadow-[0_16px_48px_-12px_rgba(179,157,219,0.25)] transition-all duration-300 group overflow-hidden border border-[#b39ddb]/20"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#faf8fc] to-white opacity-60"></div>

              <div className="relative z-10">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-[#b39ddb]/10 to-[#b39ddb]/5 mb-3 group-hover:scale-105 group-hover:rotate-2 transition-all duration-300">
                  <Cog6ToothIcon className="w-5 h-5 text-[#7e57a3]" strokeWidth={1.5} />
                </div>
                <h3 className="font-semibold text-base text-gray-900 mb-0.5">Paramètres</h3>
                <p className="text-xs text-gray-600">Profil</p>
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
