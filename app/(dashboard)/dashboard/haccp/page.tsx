'use client'

import { useEffect, useState } from 'react'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { haccpService } from '@/lib/services/haccp.service'
import {
  UserGroupIcon,
  ShoppingBagIcon,
  TruckIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentCheckIcon,
  BeakerIcon,
  WrenchIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'

interface HaccpStats {
  totalChildren: number
  activeChildren: number
  totalProducts: number
  totalSuppliers: number
  openNonCompliances: number
  todayMeals: number
}

export default function HaccpDashboardPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Admin'])
  const [stats, setStats] = useState<HaccpStats>({
    totalChildren: 0,
    activeChildren: 0,
    totalProducts: 0,
    totalSuppliers: 0,
    openNonCompliances: 0,
    todayMeals: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session?.enterprise) {
      loadStats()
    }
  }, [session])

  async function loadStats() {
    if (!session?.enterprise?.id) return

    try {
      setLoading(true)
      const data = await haccpService.getHaccpStats(session.enterprise.id)
      setStats(data)
    } catch (error) {
      console.error('Error loading HACCP stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) {
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
      name: 'Enfants inscrits',
      value: stats.activeChildren,
      total: stats.totalChildren,
      icon: UserGroupIcon,
      color: 'primary',
      href: '/dashboard/haccp/children'
    },
    {
      name: 'Produits actifs',
      value: stats.totalProducts,
      icon: ShoppingBagIcon,
      color: 'secondary',
      href: '/dashboard/haccp/products'
    },
    {
      name: 'Fournisseurs',
      value: stats.totalSuppliers,
      icon: TruckIcon,
      color: 'accent',
      href: '/dashboard/haccp/suppliers'
    },
    {
      name: 'Non-conformités ouvertes',
      value: stats.openNonCompliances,
      icon: ExclamationTriangleIcon,
      color: stats.openNonCompliances > 0 ? 'danger' : 'success',
      href: '/dashboard/haccp/non-compliances'
    },
    {
      name: 'Repas du jour',
      value: stats.todayMeals,
      icon: ClipboardDocumentCheckIcon,
      color: 'success',
      href: '/dashboard/haccp/meals'
    }
  ]

  const colorClasses = {
    primary: 'bg-primary-50 text-primary-600',
    secondary: 'bg-secondary-50 text-secondary-600',
    accent: 'bg-accent-50 text-accent-700',
    success: 'bg-success-50 text-success-600',
    danger: 'bg-danger-50 text-danger-600'
  }

  const modules = [
    {
      name: 'Enfants',
      description: 'Gestion des enfants inscrits et allergènes',
      icon: UserGroupIcon,
      href: '/dashboard/haccp/children',
      color: 'primary'
    },
    {
      name: 'Repas',
      description: 'Planification des repas et traçabilité',
      icon: ClipboardDocumentCheckIcon,
      href: '/dashboard/haccp/meals',
      color: 'secondary'
    },
    {
      name: 'Produits',
      description: 'Gestion des produits alimentaires',
      icon: ShoppingBagIcon,
      href: '/dashboard/haccp/products',
      color: 'accent'
    },
    {
      name: 'Fournisseurs',
      description: 'Gestion des fournisseurs',
      icon: TruckIcon,
      href: '/dashboard/haccp/suppliers',
      color: 'success'
    },
    {
      name: 'Températures',
      description: 'Contrôle des températures',
      icon: BeakerIcon,
      href: '/dashboard/haccp/temperatures',
      color: 'primary'
    },
    {
      name: 'Équipements',
      description: 'Maintenance des équipements',
      icon: WrenchIcon,
      href: '/dashboard/haccp/equipment',
      color: 'accent'
    },
    {
      name: 'Documents',
      description: 'Documents de conformité',
      icon: DocumentTextIcon,
      href: '/dashboard/haccp/documents',
      color: 'secondary'
    },
    {
      name: 'Non-conformités',
      description: 'Suivi des incidents et actions correctives',
      icon: ExclamationTriangleIcon,
      href: '/dashboard/haccp/non-compliances',
      color: 'danger'
    }
  ]

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Page header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-success-100 flex items-center justify-center">
              <BeakerIcon className="w-6 h-6 text-success-600" />
            </div>
            <h1 className="text-3xl font-bold text-neutral-900" style={{ fontFamily: 'Quicksand, sans-serif' }}>
              HACCP - Traçabilité Alimentaire
            </h1>
          </div>
          <p className="text-neutral-600">
            Gestion complète de la sécurité alimentaire et de la traçabilité
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          {statCards.map((stat) => {
            const Icon = stat.icon
            const colorClass = colorClasses[stat.color as keyof typeof colorClasses]

            return (
              <Link
                key={stat.name}
                href={stat.href}
                className="card p-6 hover:shadow-lg transition-all cursor-pointer group"
              >
                <div className="flex flex-col">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`p-3 rounded-lg ${colorClass} group-hover:scale-110 transition-transform`}>
                      <Icon className="w-6 h-6" />
                    </div>
                  </div>
                  <p className="text-sm font-medium text-neutral-600 mb-1">
                    {stat.name}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold text-neutral-900">
                      {stat.value}
                    </p>
                    {'total' in stat && stat.total !== stat.value && (
                      <p className="text-sm text-neutral-500">/ {stat.total}</p>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        {/* Modules grid */}
        <div>
          <h2 className="text-xl font-semibold text-neutral-900 mb-4">
            Modules HACCP
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.map((module) => {
              const Icon = module.icon
              const colorClass = colorClasses[module.color as keyof typeof colorClasses]

              return (
                <Link
                  key={module.name}
                  href={module.href}
                  className="card p-6 hover:shadow-lg transition-all cursor-pointer group"
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${colorClass} group-hover:scale-110 transition-transform flex-shrink-0`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-neutral-900 mb-1 group-hover:text-primary-600 transition-colors">
                        {module.name}
                      </h3>
                      <p className="text-sm text-neutral-600">
                        {module.description}
                      </p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Quick actions */}
        <div className="mt-8 card p-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">
            Actions rapides
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/dashboard/haccp/meals"
              className="flex items-center gap-3 p-4 rounded-lg hover:bg-neutral-50 transition-colors border border-neutral-200"
            >
              <ClipboardDocumentCheckIcon className="w-8 h-8 text-primary-600" />
              <div>
                <p className="font-medium text-neutral-900">Nouveau repas</p>
                <p className="text-sm text-neutral-500">Planifier un repas</p>
              </div>
            </Link>

            <Link
              href="/dashboard/haccp/temperatures"
              className="flex items-center gap-3 p-4 rounded-lg hover:bg-neutral-50 transition-colors border border-neutral-200"
            >
              <BeakerIcon className="w-8 h-8 text-secondary-600" />
              <div>
                <p className="font-medium text-neutral-900">Contrôle température</p>
                <p className="text-sm text-neutral-500">Enregistrer une température</p>
              </div>
            </Link>

            <Link
              href="/dashboard/haccp/non-compliances"
              className="flex items-center gap-3 p-4 rounded-lg hover:bg-neutral-50 transition-colors border border-neutral-200"
            >
              <ExclamationTriangleIcon className="w-8 h-8 text-danger-600" />
              <div>
                <p className="font-medium text-neutral-900">Déclarer un incident</p>
                <p className="text-sm text-neutral-500">Signaler une non-conformité</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
