'use client'

import { useEffect, useState } from 'react'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { createClient } from '@/lib/supabase/client'
import {
  BuildingOfficeIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'

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
      href: '/dashboard/rooms'
    },
    {
      name: 'Tâches',
      value: stats.totalTasks,
      icon: ClipboardDocumentListIcon,
      color: 'secondary',
      href: '/dashboard/tasks'
    },
    {
      name: 'Employés',
      value: stats.totalUsers,
      icon: UserGroupIcon,
      color: 'accent',
      href: '/dashboard/users'
    },
    {
      name: 'Complétion du jour',
      value: `${stats.todayCompletion}%`,
      icon: CheckCircleIcon,
      color: 'success',
      href: '/dashboard/sessions'
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
          <h1 className="text-3xl font-bold text-neutral-900 mb-2" style={{ fontFamily: 'Quicksand, sans-serif' }}>
            Tableau de bord
          </h1>
          <p className="text-neutral-600">
            Bienvenue {(session?.user as any)?.first_name || (session?.user as any)?.email} ! Voici un aperçu de votre crèche.
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat) => {
            const Icon = stat.icon
            const colorClass = colorClasses[stat.color as keyof typeof colorClasses]

            return (
              <a
                key={stat.name}
                href={stat.href}
                className="card p-6 hover:shadow-lg transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-neutral-600 mb-1">
                      {stat.name}
                    </p>
                    <p className="text-3xl font-bold text-neutral-900">
                      {stat.value}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg ${colorClass} group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
              </a>
            )
          })}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent activity */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-neutral-900 mb-4">
              Activité récente
            </h2>
            <div className="space-y-3">
              <p className="text-sm text-neutral-500 text-center py-8">
                Aucune activité récente
              </p>
            </div>
          </div>

          {/* Quick links */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-neutral-900 mb-4">
              Actions rapides
            </h2>
            <div className="space-y-3">
              <a
                href="/dashboard/sessions"
                className="flex items-center justify-between p-3 rounded-lg hover:bg-neutral-50 transition-colors"
              >
                <span className="text-sm font-medium text-neutral-700">
                  Nouvelle session de nettoyage
                </span>
                <span className="text-primary-600">→</span>
              </a>
              <a
                href="/dashboard/rooms"
                className="flex items-center justify-between p-3 rounded-lg hover:bg-neutral-50 transition-colors"
              >
                <span className="text-sm font-medium text-neutral-700">
                  Gérer les pièces
                </span>
                <span className="text-primary-600">→</span>
              </a>
              <a
                href="/dashboard/haccp"
                className="flex items-center justify-between p-3 rounded-lg hover:bg-neutral-50 transition-colors"
              >
                <span className="text-sm font-medium text-neutral-700">
                  Traçabilité HACCP
                </span>
                <span className="text-primary-600">→</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
