'use client'

import { useState } from 'react'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ModuleCard } from '@/components/shared/ModuleCard'
import { PageBreadcrumb } from '@/components/shared/PageBreadcrumb'

export default function HaccpDashboardPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const [exporting, setExporting] = useState(false)

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

  if (authLoading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    )
  }

  const modules = [
    {
      name: 'Enfants',
      description: 'Gestion des enfants inscrits et allergènes',
      icon: <UserGroupIcon className="w-5 h-5" strokeWidth={1.5} />,
      href: '/owner/haccp/children',
      module: 'users' as const, // Rose pastel
      colSpan: 'md:col-span-1'
    },
    {
      name: 'Repas',
      description: 'Planification des repas et traçabilité',
      icon: <ClipboardDocumentCheckIcon className="w-5 h-5" strokeWidth={1.5} />,
      href: '/owner/haccp/meals',
      module: 'calendar' as const, // Pêche pastel
      colSpan: 'md:col-span-1'
    },
    {
      name: 'Produits',
      description: 'Gestion des produits alimentaires',
      icon: <ShoppingBagIcon className="w-5 h-5" strokeWidth={1.5} />,
      href: '/owner/haccp/products',
      module: 'tasks' as const, // Lime pastel
      colSpan: 'md:col-span-1'
    },
    {
      name: 'Fournisseurs',
      description: 'Gestion des fournisseurs',
      icon: <TruckIcon className="w-5 h-5" strokeWidth={1.5} />,
      href: '/owner/haccp/suppliers',
      module: 'communication' as const, // Turquoise
      colSpan: 'md:col-span-1'
    },
    {
      name: 'Températures',
      description: 'Contrôle des températures',
      icon: <BeakerIcon className="w-5 h-5" strokeWidth={1.5} />,
      href: '/owner/haccp/temperatures',
      module: 'haccp' as const, // Vert menthe (gardé pour ce qui est vraiment HACCP)
      colSpan: 'md:col-span-1'
    },
    {
      name: 'Équipements',
      description: 'Maintenance des équipements',
      icon: <WrenchIcon className="w-5 h-5" strokeWidth={1.5} />,
      href: '/owner/haccp/equipment',
      module: 'settings' as const, // Violet lavande
      colSpan: 'md:col-span-1'
    },
    {
      name: 'Documents',
      description: 'Documents de conformité',
      icon: <DocumentTextIcon className="w-5 h-5" strokeWidth={1.5} />,
      href: '/owner/haccp/documents',
      module: 'analytics' as const, // Indigo pastel
      colSpan: 'md:col-span-1'
    },
    {
      name: 'Non-conformités',
      description: 'Suivi des incidents et actions correctives',
      icon: <ExclamationTriangleIcon className="w-5 h-5" strokeWidth={1.5} />,
      href: '/owner/haccp/non-compliances',
      module: 'users' as const, // Rose pour alertes
      colSpan: 'md:col-span-1'
    }
  ]

  return (
    <div className="max-w-7xl mx-auto">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <PageBreadcrumb
          items={[
            { label: 'Dashboard', href: '/owner/dashboard' },
            { label: 'HACCP' }
          ]}
        />

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

        {/* Modules grid - Layout organique avec couleurs variées */}
        <div>
          <h2 className="text-xl font-semibold mb-4">
            Modules HACCP
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {modules.map((module) => (
              <div key={module.name} className={module.colSpan}>
                <ModuleCard
                  module={module.module}
                  href={module.href}
                  icon={module.icon}
                  title={module.name}
                  description={module.description}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions - Couleurs variées */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">
            Actions rapides
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <ModuleCard
              module="calendar"
              href="/owner/haccp/meals"
              icon={<ClipboardDocumentCheckIcon className="w-5 h-5" strokeWidth={1.5} />}
              title="Nouveau repas"
              description="Planifier un repas"
              chevron={false}
              size="sm"
            />

            <ModuleCard
              module="haccp"
              href="/owner/haccp/temperatures"
              icon={<BeakerIcon className="w-5 h-5" strokeWidth={1.5} />}
              title="Contrôle température"
              description="Enregistrer une température"
              chevron={false}
              size="sm"
            />

            <ModuleCard
              module="users"
              href="/owner/haccp/non-compliances"
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
                border: '1px solid #9fa8da33',
                boxShadow: '0 0 0 0 rgba(159,168,218,0.25)'
              }}
              onMouseEnter={(e) => {
                if (!exporting) e.currentTarget.style.boxShadow = '0 16px 48px -12px rgba(159,168,218,0.25)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 0 0 0 rgba(159,168,218,0.25)'
              }}
            >
              <div
                className="absolute inset-0 opacity-60"
                style={{ background: 'linear-gradient(to bottom right, #e8eaf6, white)' }}
              />
              <div className="relative z-10">
                <div
                  className="inline-flex items-center justify-center w-8 h-8 rounded-2xl mb-3 group-hover:scale-105 transition-all duration-300"
                  style={{ background: 'linear-gradient(to bottom right, #9fa8da1A, #9fa8da0D)' }}
                >
                  <ArrowDownTrayIcon className="w-4 h-4" style={{ color: '#6870a0' }} strokeWidth={1.5} />
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
    </div>
  )
}
