'use client'

import { useAuth } from '@/lib/contexts/AuthContext'
import { CalendarIcon, ClockIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default function EmployeeDashboard() {
  const { session } = useAuth()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Bonjour {session?.user?.first_name} !</h1>
        <p className="text-muted-foreground">Votre tableau de bord employé</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Calendar Card */}
        <Link href="/employee/calendar">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer bg-gradient-to-br from-primary-50 to-white border-primary-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CalendarIcon className="h-8 w-8 text-primary-500" />
              </div>
              <CardTitle className="text-primary-700">Mon Calendrier</CardTitle>
              <CardDescription>Voir mes tâches planifiées</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        {/* History Card */}
        <Link href="/employee/history">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer bg-gradient-to-br from-secondary-50 to-white border-secondary-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <ClockIcon className="h-8 w-8 text-secondary-500" />
              </div>
              <CardTitle className="text-secondary-700">Mon Historique</CardTitle>
              <CardDescription>Mes tâches complétées</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        {/* Profile Card */}
        <Link href="/employee/profile">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer bg-gradient-to-br from-accent-50 to-white border-accent-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CheckCircleIcon className="h-8 w-8 text-accent-600" />
              </div>
              <CardTitle className="text-accent-700">Mon Profil</CardTitle>
              <CardDescription>Gérer mon compte</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Accès Rapide</CardTitle>
            <CardDescription>
              Utilisez votre code PIN pour accéder rapidement à la tablette
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                <strong>Nom d&apos;utilisateur :</strong> {session?.user?.username || 'Non défini'}
              </p>
              <p className="text-xs">
                Connectez-vous sur la tablette avec votre nom d&apos;utilisateur et code PIN
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
