'use client'

import { useAuth } from '@/lib/contexts/AuthContext'
import { CalendarIcon, ClockIcon, UserCircleIcon, DeviceTabletIcon } from '@heroicons/react/24/outline'
import { ModuleCard } from '@/components/shared/ModuleCard'

export default function EmployeeDashboard() {
  const { session } = useAuth()

  // Couleur pour le header et la section tablette : Users (rose pastel)
  const headerColor = {
    primary: '#f4a5a5',
    light: '#fce4ec',
    dark: '#c66b6b',
    shadow: 'rgba(244,165,165,0.25)'
  }

  // Couleur pour la section tablette : Communication (turquoise)
  const tabletColor = {
    primary: '#64b5d1',
    light: '#e0f7fa',
    dark: '#3a7a8f',
    shadow: 'rgba(100,181,209,0.25)'
  }

  return (
    <div className="space-y-8">
      {/* Header - Style "Douceur Professionnelle" avec couleur Users */}
      <div
        className="relative rounded-3xl p-8 bg-white border overflow-hidden shadow-lg"
        style={{
          borderColor: `${headerColor.primary}33`
        }}
      >
        <div
          className="absolute inset-0 opacity-60"
          style={{
            background: `linear-gradient(to bottom right, ${headerColor.light}, white)`
          }}
        />
        <div className="relative z-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Bonjour {session?.user?.first_name} !
          </h1>
          <p className="text-gray-600">Votre tableau de bord employé</p>
        </div>
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

      {/* Tablet Quick Access Info - Style "Douceur Professionnelle" avec couleur Communication */}
      <div
        className="relative rounded-3xl p-6 bg-white hover:-translate-y-1 transition-all duration-300 overflow-hidden shadow-lg"
        style={{
          border: `1px solid ${tabletColor.primary}33`,
          boxShadow: '0 0 0 0 transparent'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = `0 16px 48px -12px ${tabletColor.shadow}`
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 0 0 0 transparent'
        }}
      >
        {/* Gradient fond */}
        <div
          className="absolute inset-0 opacity-60"
          style={{
            background: `linear-gradient(to bottom right, ${tabletColor.light}, white)`
          }}
        />

        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{
                background: `linear-gradient(to bottom right, ${tabletColor.primary}1A, ${tabletColor.primary}0D)`
              }}
            >
              <DeviceTabletIcon className="w-6 h-6" strokeWidth={1.5} style={{ color: tabletColor.dark }} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Accès Tablette</h3>
              <p className="text-sm text-gray-600">Connexion rapide avec votre PIN</p>
            </div>
          </div>

          {/* Username Section */}
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/70 border mb-4" style={{ borderColor: `${tabletColor.primary}33` }}>
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{
                background: `linear-gradient(to bottom right, ${tabletColor.primary}1A, ${tabletColor.primary}0D)`
              }}
            >
              <UserCircleIcon className="w-6 h-6" strokeWidth={1.5} style={{ color: tabletColor.dark }} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Nom d&apos;utilisateur</p>
              <p className="text-xl font-bold text-gray-900">
                {session?.user?.username || 'Non défini'}
              </p>
            </div>
          </div>

          {/* Info */}
          <div className="p-4 rounded-2xl bg-white/50 border" style={{ borderColor: `${tabletColor.primary}33` }}>
            <p className="text-sm text-gray-700">
              💡 Connectez-vous sur la tablette avec votre nom d&apos;utilisateur et code PIN
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
