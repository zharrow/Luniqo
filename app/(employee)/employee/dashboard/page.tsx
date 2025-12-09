'use client'

import { useAuth } from '@/lib/contexts/AuthContext'
import { CalendarIcon, ClockIcon, UserCircleIcon } from '@heroicons/react/24/outline'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ModuleCard } from '@/components/shared/ModuleCard'

export default function EmployeeDashboard() {
  const { session } = useAuth()

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="rounded-3xl bg-gradient-to-br from-sky-100 via-blue-50 to-cyan-100 p-8 border border-sky-200/50 shadow-sm">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Bonjour {session?.user?.first_name} ! 👋
        </h1>
        <p className="text-gray-600">Votre tableau de bord employé</p>
      </div>

      {/* Quick Actions - 3 modules avec couleurs variées */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Actions Rapides</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ModuleCard
            module="calendar"
            href="/employee/calendar"
            icon={<CalendarIcon className="w-6 h-6" strokeWidth={1.5} />}
            title="Mon Calendrier"
            description="Voir mes tâches planifiées"
            size="md"
            chevron
          />
          <ModuleCard
            module="analytics"
            href="/employee/history"
            icon={<ClockIcon className="w-6 h-6" strokeWidth={1.5} />}
            title="Mon Historique"
            description="Mes tâches complétées"
            size="md"
            chevron
          />
          <ModuleCard
            module="settings"
            href="/employee/profile"
            icon={<UserCircleIcon className="w-6 h-6" strokeWidth={1.5} />}
            title="Mon Profil"
            description="Gérer mon compte et mon PIN"
            size="md"
            chevron
          />
        </div>
      </div>

      {/* Tablet Quick Access Info */}
      <Card className="border-cyan-200/50 bg-gradient-to-br from-cyan-50 to-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-cyan-700">📱 Accès Tablette</CardTitle>
          <CardDescription>
            Utilisez votre code PIN pour accéder rapidement à la tablette
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-cyan-100 p-3 border border-cyan-200">
                <UserCircleIcon className="w-5 h-5 text-cyan-600" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Nom d&apos;utilisateur</p>
                <p className="text-lg font-semibold text-cyan-700">
                  {session?.user?.username || 'Non défini'}
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-600 bg-cyan-50/50 rounded-xl p-3 border border-cyan-100">
              💡 Connectez-vous sur la tablette avec votre nom d&apos;utilisateur et code PIN
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
