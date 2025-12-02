'use client'

import { useEffect, useState } from 'react'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { haccpService } from '@/lib/services/haccp.service'
import { pdfExportService } from '@/lib/services/pdf-export.service'
import {
  UserGroupIcon,
  ShoppingBagIcon,
  TruckIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentCheckIcon,
  BeakerIcon,
  WrenchIcon,
  DocumentTextIcon,
  InformationCircleIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

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

  async function handleExportHACCP() {
    if (!session?.enterprise) return

    try {
      // Get date range (last 30 days)
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 30)

      const startDateStr = startDate.toISOString().split('T')[0]
      const endDateStr = endDate.toISOString().split('T')[0]

      // Fetch all HACCP data
      const [meals, temperatures, nonCompliances, equipment] = await Promise.all([
        haccpService.getMeals(session.enterprise.id, startDateStr, endDateStr),
        haccpService.getTemperatures(session.enterprise.id, startDateStr, endDateStr),
        haccpService.getNonCompliances(session.enterprise.id),
        haccpService.getEquipment(session.enterprise.id)
      ])

      // Prepare export data
      const exportData = {
        enterpriseName: session.enterprise.name,
        startDate: startDateStr,
        endDate: endDateStr,
        meals: meals.map(meal => ({
          date: meal.date,
          type: meal.type,
          menu: meal.menu,
          allergens: meal.allergens_present,
          validated: meal.is_validated
        })),
        temperatures: temperatures.map(temp => ({
          date: temp.measured_at,
          checkpoint: temp.checkpoint_type,
          value: temp.temperature_value,
          compliant: temp.is_compliant,
          notes: temp.notes
        })),
        nonCompliances: nonCompliances
          .filter(nc => new Date(nc.discovered_at) >= startDate && new Date(nc.discovered_at) <= endDate)
          .map(nc => ({
            date: nc.discovered_at,
            type: nc.type,
            description: nc.description,
            status: nc.status,
            correctiveAction: nc.corrective_action
          })),
        equipment: equipment.map(equip => ({
          name: equip.name,
          category: equip.category,
          lastMaintenance: equip.last_maintenance_date,
          nextMaintenance: equip.next_maintenance_date
        }))
      }

      await pdfExportService.exportHACCP(exportData)
    } catch (error) {
      console.error('Error exporting HACCP report:', error)
      alert('Erreur lors de l\'export du rapport HACCP')
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
        {/* Breadcrumb */}
        <Breadcrumb className="mb-4">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>HACCP</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Page header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-[#81c995]/10 flex items-center justify-center">
              <BeakerIcon className="w-6 h-6 text-[#4a8f5a]" />
            </div>
            <h1 className="text-3xl font-bold">
              HACCP - Traçabilité Alimentaire
            </h1>
            <Popover>
              <PopoverTrigger asChild>
                <button className="text-muted-foreground hover:text-primary transition-colors">
                  <InformationCircleIcon className="w-6 h-6" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-96" align="start">
                <div className="space-y-3">
                  <h4 className="font-semibold">Qu'est-ce que HACCP ?</h4>
                  <p className="text-sm text-muted-foreground">
                    HACCP (Hazard Analysis Critical Control Point) est un système qui permet d'identifier,
                    d'évaluer et de maîtriser les dangers significatifs au regard de la sécurité des aliments.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Cette section vous permet de gérer la traçabilité alimentaire complète de votre crèche :
                    enfants et allergènes, repas, produits, fournisseurs, températures, équipements et non-conformités.
                  </p>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <p className="text-muted-foreground">
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
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    {stat.name}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold">
                      {stat.value}
                    </p>
                    {'total' in stat && stat.total !== stat.value && (
                      <p className="text-sm text-muted-foreground">/ {stat.total}</p>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        {/* Modules grid */}
        <div>
          <h2 className="text-xl font-semibold mb-4">
            Modules HACCP
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.map((module) => {
              const Icon = module.icon

              return (
                <Link key={module.name} href={module.href}>
                  <Card className="hover:shadow-lg transition-all cursor-pointer group bg-gradient-to-br from-[#e8f5e9] to-white border-l-4 border-l-[#81c995]">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-lg bg-[#81c995]/10 group-hover:bg-[#81c995]/20 transition-all flex-shrink-0">
                          <Icon className="w-6 h-6 text-[#4a8f5a]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold mb-1 group-hover:text-[#4a8f5a] transition-colors">
                            {module.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {module.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Quick actions */}
        <div className="mt-8 card p-6 bg-gradient-to-br from-[#e8f5e9] to-white border-l-4 border-l-[#81c995]">
          <h2 className="text-lg font-semibold mb-4">
            Actions rapides
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/dashboard/haccp/meals"
              className="flex items-center gap-3 p-4 rounded-lg hover:bg-[#81c995]/10 transition-colors border border-border"
            >
              <ClipboardDocumentCheckIcon className="w-8 h-8 text-[#4a8f5a]" />
              <div>
                <p className="font-medium">Nouveau repas</p>
                <p className="text-sm text-muted-foreground">Planifier un repas</p>
              </div>
            </Link>

            <Link
              href="/dashboard/haccp/temperatures"
              className="flex items-center gap-3 p-4 rounded-lg hover:bg-[#81c995]/10 transition-colors border border-border"
            >
              <BeakerIcon className="w-8 h-8 text-[#4a8f5a]" />
              <div>
                <p className="font-medium">Contrôle température</p>
                <p className="text-sm text-muted-foreground">Enregistrer une température</p>
              </div>
            </Link>

            <Link
              href="/dashboard/haccp/non-compliances"
              className="flex items-center gap-3 p-4 rounded-lg hover:bg-[#81c995]/10 transition-colors border border-border"
            >
              <ExclamationTriangleIcon className="w-8 h-8 text-[#4a8f5a]" />
              <div>
                <p className="font-medium">Déclarer un incident</p>
                <p className="text-sm text-muted-foreground">Signaler une non-conformité</p>
              </div>
            </Link>

            <button
              onClick={handleExportHACCP}
              className="flex items-center gap-3 p-4 rounded-lg hover:bg-[#81c995]/10 transition-colors border border-border bg-[#81c995]/5"
            >
              <ArrowDownTrayIcon className="w-8 h-8 text-[#4a8f5a]" />
              <div className="text-left">
                <p className="font-medium">Export PDF HACCP</p>
                <p className="text-sm text-muted-foreground">Rapport des 30 derniers jours</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
