'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/contexts/AuthContext'
import { modulesService } from '@/lib/services/modules.service'
import { analyticsService } from '@/lib/services/analytics.service'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  CheckCircleIcon,
  XCircleIcon,
  LockClosedIcon,
  LockOpenIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import type { Module, ModuleAccessRequest } from '@/types/database.types'
import type { EnterpriseStats } from '@/types/analytics.types'

export default function PermissionsPage() {
  const { session, isLoading: authLoading } = useAuth()
  const router = useRouter()

  const [enterprises, setEnterprises] = useState<EnterpriseStats[]>([])
  const [modules, setModules] = useState<Module[]>([])
  const [pendingRequests, setPendingRequests] = useState<ModuleAccessRequest[]>([])
  const [expandedEnterprise, setExpandedEnterprise] = useState<string | null>(null)
  const [enterpriseModules, setEnterpriseModules] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && session) {
      if (session.role !== 'Developer') {
        router.push('/owner/dashboard')
        return
      }
      loadData()
    }
  }, [session, authLoading, router])

  async function loadData() {
    try {
      setLoading(true)
      setError(null)

      const [enterprisesData, modulesData, requestsData] = await Promise.all([
        analyticsService.getEnterprises(),
        modulesService.getModules(),
        modulesService.getAllPendingRequests()
      ])

      setEnterprises(enterprisesData)
      setModules(modulesData)
      setPendingRequests(requestsData)

      // Load module access for all enterprises
      const moduleAccessPromises = enterprisesData.map(async (enterprise) => {
        const moduleIds = await modulesService.getEnterpriseModules(enterprise.id)
        return { enterpriseId: enterprise.id, moduleIds }
      })

      const moduleAccessData = await Promise.all(moduleAccessPromises)
      const moduleAccessMap: Record<string, string[]> = {}
      moduleAccessData.forEach(({ enterpriseId, moduleIds }) => {
        moduleAccessMap[enterpriseId] = moduleIds
      })
      setEnterpriseModules(moduleAccessMap)
    } catch (err) {
      console.error('Error loading permissions data:', err)
      setError('Erreur lors du chargement des données')
    } finally {
      setLoading(false)
    }
  }

  async function toggleModuleAccess(enterpriseId: string, moduleId: string, currentlyHasAccess: boolean) {
    if (!session?.user?.id) return

    try {
      setError(null)
      setSuccess(null)

      if (currentlyHasAccess) {
        await modulesService.revokeModuleAccess(enterpriseId, moduleId)
        setSuccess('Accès révoqué avec succès')
      } else {
        await modulesService.grantModuleAccess(enterpriseId, moduleId, session.user.id)
        setSuccess('Accès accordé avec succès')
      }

      // Refresh data
      await loadData()

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      console.error('Error toggling module access:', err)
      setError(err.message || 'Erreur lors de la modification des permissions')
    }
  }

  async function handleApproveRequest(requestId: string) {
    if (!session?.user?.id) return

    try {
      setError(null)
      setSuccess(null)

      await modulesService.approveRequest(requestId, session.user.id)
      setSuccess('Demande approuvée avec succès')

      // Refresh data
      await loadData()

      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      console.error('Error approving request:', err)
      setError(err.message || 'Erreur lors de l\'approbation')
    }
  }

  async function handleRejectRequest(requestId: string) {
    if (!session?.user?.id) return

    try {
      setError(null)
      setSuccess(null)

      await modulesService.rejectRequest(requestId, session.user.id)
      setSuccess('Demande rejetée')

      // Refresh data
      await loadData()

      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      console.error('Error rejecting request:', err)
      setError(err.message || 'Erreur lors du rejet')
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des permissions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Gestion des Permissions</h1>
          <p className="text-muted-foreground">
            Gérez l'accès aux modules pour chaque entreprise
          </p>
        </div>

        {/* Success/Error Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            {success}
          </div>
        )}

        <Tabs defaultValue="enterprises" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="enterprises">
              Crèches ({enterprises.length})
            </TabsTrigger>
            <TabsTrigger value="requests">
              Demandes ({pendingRequests.length})
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Enterprise Management */}
          <TabsContent value="enterprises" className="space-y-4">
            {enterprises.map((enterprise) => {
              const isExpanded = expandedEnterprise === enterprise.id
              const accessibleModules = enterpriseModules[enterprise.id] || []
              const moduleCount = accessibleModules.length
              const totalModules = modules.length

              return (
                <Card key={enterprise.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{enterprise.name}</CardTitle>
                        <CardDescription>
                          Propriétaire: {enterprise.owner_name || 'N/A'}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary">
                          {moduleCount} / {totalModules} modules
                        </Badge>
                        <Button
                          variant="outline"
                          onClick={() => setExpandedEnterprise(isExpanded ? null : enterprise.id)}
                        >
                          {isExpanded ? 'Masquer' : 'Gérer'}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {modules.map((module) => {
                          const hasAccess = accessibleModules.includes(module.id)
                          const isBase = module.id === 'base'

                          return (
                            <div
                              key={module.id}
                              className={`p-4 border rounded-lg ${
                                hasAccess ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                              }`}
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    {hasAccess ? (
                                      <LockOpenIcon className="w-5 h-5 text-green-600" />
                                    ) : (
                                      <LockClosedIcon className="w-5 h-5 text-gray-400" />
                                    )}
                                    <h3 className="font-semibold text-sm">{module.name}</h3>
                                  </div>
                                  <p className="text-xs text-gray-600 line-clamp-2">
                                    {module.description}
                                  </p>
                                  <p className="text-xs font-medium text-gray-700 mt-1">
                                    {module.is_free ? 'Gratuit' : `${module.price_monthly}€/mois`}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center justify-between">
                                <Label
                                  htmlFor={`${enterprise.id}-${module.id}`}
                                  className={`text-xs ${isBase ? 'text-gray-400' : 'cursor-pointer'}`}
                                >
                                  {hasAccess ? 'Activé' : 'Désactivé'}
                                </Label>
                                <Switch
                                  id={`${enterprise.id}-${module.id}`}
                                  checked={hasAccess}
                                  onCheckedChange={() => toggleModuleAccess(enterprise.id, module.id, hasAccess)}
                                  disabled={isBase}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  )}
                </Card>
              )
            })}
          </TabsContent>

          {/* Tab 2: Pending Requests */}
          <TabsContent value="requests" className="space-y-4">
            {pendingRequests.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center text-gray-500">
                    <ClockIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p className="text-lg font-medium mb-1">Aucune demande en attente</p>
                    <p className="text-sm">Les demandes d'accès aux modules apparaîtront ici</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              pendingRequests.map((request) => {
                const module = modules.find((m) => m.id === request.module_id)
                const enterprise = enterprises.find((e) => e.id === request.enterprise_id)

                return (
                  <Card key={request.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary">
                              {new Date(request.created_at).toLocaleDateString('fr-FR')}
                            </Badge>
                            <Badge variant="outline">{module?.name || request.module_id}</Badge>
                          </div>
                          <CardTitle className="text-lg">{enterprise?.name || 'Entreprise inconnue'}</CardTitle>
                          <CardDescription>
                            Demandé par: {enterprise?.owner_name || 'N/A'}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApproveRequest(request.id)}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            <CheckCircleIcon className="w-4 h-4 mr-1" />
                            Approuver
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRejectRequest(request.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <XCircleIcon className="w-4 h-4 mr-1" />
                            Rejeter
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    {request.message && (
                      <CardContent>
                        <div className="p-3 bg-gray-50 rounded border border-gray-200">
                          <p className="text-sm font-medium text-gray-700 mb-1">Message:</p>
                          <p className="text-sm text-gray-600">{request.message}</p>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                )
              })
            )}
          </TabsContent>
        </Tabs>
      </div>
  )
}
