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
import { Card, CardContent } from '@/components/ui/card'
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ModuleCard } from '@/components/shared/ModuleCard'

interface HaccpStats {
  totalChildren: number
  activeChildren: number
  totalProducts: number
  totalSuppliers: number
  openNonCompliances: number
  todayMeals: number
}

export default function HaccpDashboardPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const [stats, setStats] = useState<HaccpStats>({
    totalChildren: 0,
    activeChildren: 0,
    totalProducts: 0,
    totalSuppliers: 0,
    openNonCompliances: 0,
    todayMeals: 0
  })
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

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
      setExporting(true)
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
    } finally {
      setExporting(false)
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

  const modules = [
    {
      name: 'Enfants',
      description: 'Gestion des enfants inscrits et allergènes',
      icon: <UserGroupIcon className="w-5 h-5" strokeWidth={1.5} />,
      href: '/dashboard/haccp/children'
    },
    {
      name: 'Repas',
      description: 'Planification des repas et traçabilité',
      icon: <ClipboardDocumentCheckIcon className="w-5 h-5" strokeWidth={1.5} />,
      href: '/dashboard/haccp/meals'
    },
    {
      name: 'Produits',
      description: 'Gestion des produits alimentaires',
      icon: <ShoppingBagIcon className="w-5 h-5" strokeWidth={1.5} />,
      href: '/dashboard/haccp/products'
    },
    {
      name: 'Fournisseurs',
      description: 'Gestion des fournisseurs',
      icon: <TruckIcon className="w-5 h-5" strokeWidth={1.5} />,
      href: '/dashboard/haccp/suppliers'
    },
    {
      name: 'Températures',
      description: 'Contrôle des températures',
      icon: <BeakerIcon className="w-5 h-5" strokeWidth={1.5} />,
      href: '/dashboard/haccp/temperatures'
    },
    {
      name: 'Équipements',
      description: 'Maintenance des équipements',
      icon: <WrenchIcon className="w-5 h-5" strokeWidth={1.5} />,
      href: '/dashboard/haccp/equipment'
    },
    {
      name: 'Documents',
      description: 'Documents de conformité',
      icon: <DocumentTextIcon className="w-5 h-5" strokeWidth={1.5} />,
      href: '/dashboard/haccp/documents'
    },
    {
      name: 'Non-conformités',
      description: 'Suivi des incidents et actions correctives',
      icon: <ExclamationTriangleIcon className="w-5 h-5" strokeWidth={1.5} />,
      href: '/dashboard/haccp/non-compliances'
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
          {/* Stat Card 1 - Enfants */}
          <a
            href="/dashboard/haccp/children"
            className="relative rounded-3xl p-5 bg-white hover:-translate-y-1 transition-all duration-300 group overflow-hidden block"
            style={{
              border: '1px solid #81c99533',
              boxShadow: '0 0 0 0 rgba(129,201,149,0.25)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 16px 48px -12px rgba(129,201,149,0.25)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 0 0 0 rgba(129,201,149,0.25)'
            }}
          >
            <div
              className="absolute inset-0 opacity-60"
              style={{ background: 'linear-gradient(to bottom right, #f1f9f3, white)' }}
            />
            <div className="relative z-10">
              <div
                className="inline-flex items-center justify-center w-10 h-10 rounded-2xl mb-3 group-hover:scale-105 transition-all duration-300"
                style={{ background: 'linear-gradient(to bottom right, #81c9951A, #81c9950D)' }}
              >
                <UserGroupIcon className="w-5 h-5" style={{ color: '#4a8f5a' }} strokeWidth={1.5} />
              </div>
              <p className="text-xs text-gray-600 mb-1">Enfants inscrits</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-gray-900">{stats.activeChildren}</p>
                <p className="text-sm text-gray-600">/ {stats.totalChildren}</p>
              </div>
            </div>
          </a>

          {/* Stat Card 2 - Produits */}
          <a
            href="/dashboard/haccp/products"
            className="relative rounded-3xl p-5 bg-white hover:-translate-y-1 transition-all duration-300 group overflow-hidden block"
            style={{
              border: '1px solid #81c99533',
              boxShadow: '0 0 0 0 rgba(129,201,149,0.25)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 16px 48px -12px rgba(129,201,149,0.25)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 0 0 0 rgba(129,201,149,0.25)'
            }}
          >
            <div
              className="absolute inset-0 opacity-60"
              style={{ background: 'linear-gradient(to bottom right, #f1f9f3, white)' }}
            />
            <div className="relative z-10">
              <div
                className="inline-flex items-center justify-center w-10 h-10 rounded-2xl mb-3 group-hover:scale-105 transition-all duration-300"
                style={{ background: 'linear-gradient(to bottom right, #81c9951A, #81c9950D)' }}
              >
                <ShoppingBagIcon className="w-5 h-5" style={{ color: '#4a8f5a' }} strokeWidth={1.5} />
              </div>
              <p className="text-xs text-gray-600 mb-1">Produits actifs</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalProducts}</p>
            </div>
          </a>

          {/* Stat Card 3 - Fournisseurs */}
          <a
            href="/dashboard/haccp/suppliers"
            className="relative rounded-3xl p-5 bg-white hover:-translate-y-1 transition-all duration-300 group overflow-hidden block"
            style={{
              border: '1px solid #81c99533',
              boxShadow: '0 0 0 0 rgba(129,201,149,0.25)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 16px 48px -12px rgba(129,201,149,0.25)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 0 0 0 rgba(129,201,149,0.25)'
            }}
          >
            <div
              className="absolute inset-0 opacity-60"
              style={{ background: 'linear-gradient(to bottom right, #f1f9f3, white)' }}
            />
            <div className="relative z-10">
              <div
                className="inline-flex items-center justify-center w-10 h-10 rounded-2xl mb-3 group-hover:scale-105 transition-all duration-300"
                style={{ background: 'linear-gradient(to bottom right, #81c9951A, #81c9950D)' }}
              >
                <TruckIcon className="w-5 h-5" style={{ color: '#4a8f5a' }} strokeWidth={1.5} />
              </div>
              <p className="text-xs text-gray-600 mb-1">Fournisseurs</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalSuppliers}</p>
            </div>
          </a>

          {/* Stat Card 4 - Non-conformités */}
          <a
            href="/dashboard/haccp/non-compliances"
            className="relative rounded-3xl p-5 bg-white hover:-translate-y-1 transition-all duration-300 group overflow-hidden block"
            style={{
              border: `1px solid ${stats.openNonCompliances > 0 ? '#f8717133' : '#81c99533'}`,
              boxShadow: `0 0 0 0 ${stats.openNonCompliances > 0 ? 'rgba(248,113,113,0.25)' : 'rgba(129,201,149,0.25)'}`
            }}
            onMouseEnter={(e) => {
              const shadowColor = stats.openNonCompliances > 0 ? 'rgba(248,113,113,0.25)' : 'rgba(129,201,149,0.25)'
              e.currentTarget.style.boxShadow = `0 16px 48px -12px ${shadowColor}`
            }}
            onMouseLeave={(e) => {
              const shadowColor = stats.openNonCompliances > 0 ? 'rgba(248,113,113,0.25)' : 'rgba(129,201,149,0.25)'
              e.currentTarget.style.boxShadow = `0 0 0 0 ${shadowColor}`
            }}
          >
            <div
              className="absolute inset-0 opacity-60"
              style={{ background: `linear-gradient(to bottom right, ${stats.openNonCompliances > 0 ? '#fef2f2' : '#f1f9f3'}, white)` }}
            />
            <div className="relative z-10">
              <div
                className="inline-flex items-center justify-center w-10 h-10 rounded-2xl mb-3 group-hover:scale-105 transition-all duration-300"
                style={{ background: `linear-gradient(to bottom right, ${stats.openNonCompliances > 0 ? '#f871711A' : '#81c9951A'}, ${stats.openNonCompliances > 0 ? '#f871710D' : '#81c9950D'})` }}
              >
                <ExclamationTriangleIcon className="w-5 h-5" style={{ color: stats.openNonCompliances > 0 ? '#dc2626' : '#4a8f5a' }} strokeWidth={1.5} />
              </div>
              <p className="text-xs text-gray-600 mb-1">Non-conformités ouvertes</p>
              <p className={`text-2xl font-bold ${stats.openNonCompliances > 0 ? 'text-red-600' : 'text-gray-900'}`}>{stats.openNonCompliances}</p>
            </div>
          </a>

          {/* Stat Card 5 - Repas du jour */}
          <a
            href="/dashboard/haccp/meals"
            className="relative rounded-3xl p-5 bg-white hover:-translate-y-1 transition-all duration-300 group overflow-hidden block"
            style={{
              border: '1px solid #81c99533',
              boxShadow: '0 0 0 0 rgba(129,201,149,0.25)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 16px 48px -12px rgba(129,201,149,0.25)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 0 0 0 rgba(129,201,149,0.25)'
            }}
          >
            <div
              className="absolute inset-0 opacity-60"
              style={{ background: 'linear-gradient(to bottom right, #f1f9f3, white)' }}
            />
            <div className="relative z-10">
              <div
                className="inline-flex items-center justify-center w-10 h-10 rounded-2xl mb-3 group-hover:scale-105 transition-all duration-300"
                style={{ background: 'linear-gradient(to bottom right, #81c9951A, #81c9950D)' }}
              >
                <ClipboardDocumentCheckIcon className="w-5 h-5" style={{ color: '#4a8f5a' }} strokeWidth={1.5} />
              </div>
              <p className="text-xs text-gray-600 mb-1">Repas du jour</p>
              <p className="text-2xl font-bold text-gray-900">{stats.todayMeals}</p>
            </div>
          </a>
        </div>

        {/* Modules grid */}
        <div>
          <h2 className="text-xl font-semibold mb-4">
            Modules HACCP
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {modules.map((module) => (
              <ModuleCard
                key={module.name}
                module="haccp"
                href={module.href}
                icon={module.icon}
                title={module.name}
                description={module.description}
              />
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">
            Actions rapides
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <ModuleCard
              module="haccp"
              href="/dashboard/haccp/meals"
              icon={<ClipboardDocumentCheckIcon className="w-5 h-5" strokeWidth={1.5} />}
              title="Nouveau repas"
              description="Planifier un repas"
              chevron={false}
              size="sm"
            />

            <ModuleCard
              module="haccp"
              href="/dashboard/haccp/temperatures"
              icon={<BeakerIcon className="w-5 h-5" strokeWidth={1.5} />}
              title="Contrôle température"
              description="Enregistrer une température"
              chevron={false}
              size="sm"
            />

            <ModuleCard
              module="haccp"
              href="/dashboard/haccp/non-compliances"
              icon={<ExclamationTriangleIcon className="w-5 h-5" strokeWidth={1.5} />}
              title="Déclarer un incident"
              description="Signaler une non-conformité"
              chevron={false}
              size="sm"
            />

            <button
              onClick={handleExportHACCP}
              disabled={exporting}
              className="relative rounded-3xl p-4 bg-white hover:-translate-y-1 transition-all duration-300 group overflow-hidden text-left disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                border: '1px solid #81c99533',
                boxShadow: '0 0 0 0 rgba(129,201,149,0.25)'
              }}
              onMouseEnter={(e) => {
                if (!exporting) e.currentTarget.style.boxShadow = '0 16px 48px -12px rgba(129,201,149,0.25)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 0 0 0 rgba(129,201,149,0.25)'
              }}
            >
              <div
                className="absolute inset-0 opacity-60"
                style={{ background: 'linear-gradient(to bottom right, #f1f9f3, white)' }}
              />
              <div className="relative z-10">
                <div
                  className="inline-flex items-center justify-center w-8 h-8 rounded-2xl mb-3 group-hover:scale-105 transition-all duration-300"
                  style={{ background: 'linear-gradient(to bottom right, #81c9951A, #81c9950D)' }}
                >
                  <ArrowDownTrayIcon className="w-4 h-4" style={{ color: '#4a8f5a' }} strokeWidth={1.5} />
                </div>
                <h3 className="font-semibold text-gray-900 mb-0.5 tracking-tight text-sm">
                  {exporting ? 'Export en cours...' : 'Export PDF HACCP'}
                </h3>
                <p className="text-xs text-gray-600">Rapport des 30 derniers jours</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
