'use client'

import { useEffect, useState } from 'react'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { createClient } from '@/lib/supabase/client'
import {
  BuildingOfficeIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
  CheckCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SparklesText } from '@/components/ui/sparkles-text'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'

interface DashboardStats {
  totalRooms: number
  totalTasks: number
  totalUsers: number
  todayCompletion: number
}

export default function DashboardPage() {
  const { session, isLoading } = useRequireAuth(['Admin'])
  const [stats, setStats] = useState<DashboardStats>({
    totalRooms: 0,
    totalTasks: 0,
    totalUsers: 0,
    todayCompletion: 0
  })
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    if (session?.enterprise) {
      loadStats()
    }
  }, [session])

  async function loadStats() {
    if (!session?.enterprise?.id) return

    try {
      setLoading(true)
      const enterpriseId = session.enterprise.id

      // Count rooms
      const { count: roomsCount } = await supabase
        .from('room')
        .select('*', { count: 'exact', head: true })
        .eq('enterprise_id', enterpriseId)
        .eq('is_active', true)

      // Count tasks
      const { count: tasksCount } = await supabase
        .from('task_template')
        .select('*', { count: 'exact', head: true })
        .eq('enterprise_id', enterpriseId)
        .eq('is_active', true)

      // Count users
      const { count: usersCount } = await supabase
        .from('user')
        .select('*', { count: 'exact', head: true })
        .eq('enterprise_id', enterpriseId)
        .eq('is_active', true)

      // Get today's session completion
      const today = new Date().toISOString().split('T')[0]
      const { data: todaySession, error: sessionError } = await supabase
        .from('cleaning_session')
        .select('status')
        .eq('enterprise_id', enterpriseId)
        .eq('session_date', today)
        .maybeSingle() as { data: { status: string } | null; error: any }

      const completion = todaySession && !sessionError && todaySession.status === 'COMPLETED' ? 100 : 0

      setStats({
        totalRooms: roomsCount || 0,
        totalTasks: tasksCount || 0,
        totalUsers: usersCount || 0,
        todayCompletion: completion
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (isLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  const statCards = [
    {
      name: 'Pièces',
      value: stats.totalRooms,
      icon: BuildingOfficeIcon,
      color: 'primary',
      href: '/dashboard/rooms',
      description: 'Nombre total de pièces actives dans votre établissement. Cliquez pour gérer vos pièces.'
    },
    {
      name: 'Tâches',
      value: stats.totalTasks,
      icon: ClipboardDocumentListIcon,
      color: 'secondary',
      href: '/dashboard/tasks',
      description: 'Nombre de templates de tâches de nettoyage configurés. Ces tâches peuvent être quotidiennes, hebdomadaires ou mensuelles.'
    },
    {
      name: 'Employés',
      value: stats.totalUsers,
      icon: UserGroupIcon,
      color: 'accent',
      href: '/dashboard/users',
      description: 'Nombre d\'employés actifs ayant accès au système. Gérez les accès et les codes PIN depuis cette section.'
    },
    {
      name: 'Complétion du jour',
      value: `${stats.todayCompletion}%`,
      icon: CheckCircleIcon,
      color: 'success',
      href: '/dashboard/sessions',
      description: 'Progression de la session de nettoyage d\'aujourd\'hui. 100% indique que toutes les tâches planifiées sont terminées.'
    }
  ]

  const colorClasses = {
    primary: 'bg-primary-50 text-primary-600',
    secondary: 'bg-secondary-50 text-secondary-600',
    accent: 'bg-accent-50 text-accent-700',
    success: 'bg-success-50 text-success-600'
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Page header */}
        <div className="mb-8">
          <SparklesText
            className="text-4xl font-bold mb-2"
            colors={{ first: '#a855f7', second: '#ec4899' }}
          >
            Tableau de bord
          </SparklesText>
          <p className="text-muted-foreground text-lg">
            Bienvenue {(session?.user as any)?.first_name || (session?.user as any)?.email} ! Voici un aperçu de votre crèche.
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat) => {
            const Icon = stat.icon
            const colorClass = colorClasses[stat.color as keyof typeof colorClasses]

            return (
              <div key={stat.name} className="relative">
                <a href={stat.href}>
                  <Card className="hover:shadow-xl transition-all cursor-pointer group border-2 hover:border-primary/50">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium text-muted-foreground">
                              {stat.name}
                            </p>
                            <Popover>
                              <PopoverTrigger asChild onClick={(e) => e.preventDefault()}>
                                <button className="text-muted-foreground hover:text-primary transition-colors">
                                  <InformationCircleIcon className="w-4 h-4" />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80" align="start">
                                <div className="space-y-2">
                                  <h4 className="font-semibold text-sm">{stat.name}</h4>
                                  <p className="text-sm text-muted-foreground">
                                    {stat.description}
                                  </p>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                          <p className="text-3xl font-bold bg-gradient-to-br from-primary to-primary/60 bg-clip-text text-transparent">
                            {stat.value}
                          </p>
                        </div>
                        <div className={`p-3 rounded-xl ${colorClass} group-hover:scale-110 transition-transform`}>
                          <Icon className="w-6 h-6" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </a>
              </div>
            )
          })}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent activity */}
          <Card>
            <CardHeader>
              <CardTitle>Activité récente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground text-center py-8">
                  Aucune activité récente
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quick links */}
          <Card>
            <CardHeader>
              <CardTitle>Actions rapides</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <a
                  href="/dashboard/sessions"
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors"
                >
                  <span className="text-sm font-medium">
                    Nouvelle session de nettoyage
                  </span>
                  <span className="text-primary">→</span>
                </a>
                <a
                  href="/dashboard/rooms"
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors"
                >
                  <span className="text-sm font-medium">
                    Gérer les pièces
                  </span>
                  <span className="text-primary">→</span>
                </a>
                <a
                  href="/dashboard/haccp"
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors"
                >
                  <span className="text-sm font-medium">
                    Traçabilité HACCP
                  </span>
                  <span className="text-primary">→</span>
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
