'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/contexts/AuthContext'
import { modulesService, type EnterpriseWithNurseries, type NurseryWithModules } from '@/lib/services/modules.service'
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
  ClockIcon,
  BuildingOffice2Icon,
  ChevronDownIcon,
  ChevronRightIcon,
  HomeIcon
} from '@heroicons/react/24/outline'
import type { Module, ModuleAccessRequest } from '@/types/database.types'

export default function PermissionsPage() {
  const { session, isLoading: authLoading } = useAuth()
  const router = useRouter()

  const [enterprises, setEnterprises] = useState<EnterpriseWithNurseries[]>([])
  const [modules, setModules] = useState<Module[]>([])
  const [pendingRequests, setPendingRequests] = useState<ModuleAccessRequest[]>([])
  const [expandedEnterprise, setExpandedEnterprise] = useState<string | null>(null)
  const [expandedNursery, setExpandedNursery] = useState<string | null>(null)
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
        modulesService.getEnterprisesWithNurseries(),
        modulesService.getModules(),
        modulesService.getAllPendingRequests()
      ])

      setEnterprises(enterprisesData)
      setModules(modulesData)
      setPendingRequests(requestsData)
    } catch (err) {
      console.error('Error loading permissions data:', err)
      setError('Erreur lors du chargement des données')
    } finally {
      setLoading(false)
    }
  }

  async function toggleNurseryModuleAccess(nurseryId: string, moduleId: string, currentlyHasAccess: boolean) {
    if (!session?.user?.id) return

    try {
      setError(null)
      setSuccess(null)

      if (currentlyHasAccess) {
        await modulesService.revokeNurseryModuleAccess(nurseryId, moduleId)
        setSuccess('Accès révoqué avec succès')
      } else {
        await modulesService.grantNurseryModuleAccess(nurseryId, moduleId, session.user.id)
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

  // Calculate total modules for an enterprise (sum of all nurseries' modules)
  function getEnterpriseTotalModules(enterprise: EnterpriseWithNurseries): number {
    return enterprise.nurseries.reduce((total, nursery) => total + nursery.modules.length, 0)
  }

  // Calculate monthly revenue for a nursery
  function getNurseryMonthlyRevenue(nursery: NurseryWithModules): number {
    return nursery.modules.reduce((total, moduleId) => {
      const module = modules.find(m => m.id === moduleId)
      return total + (module?.price_monthly || 0)
    }, 0)
  }

  // Calculate monthly revenue for an enterprise (sum of all nurseries)
  function getEnterpriseMonthlyRevenue(enterprise: EnterpriseWithNurseries): number {
    return enterprise.nurseries.reduce((total, nursery) => total + getNurseryMonthlyRevenue(nursery), 0)
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
          Gérez l'accès aux modules pour chaque crèche individuellement
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-700">{enterprises.length}</div>
            <div className="text-sm text-blue-600">Entreprises</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-700">
              {enterprises.reduce((sum, e) => sum + e.nurseries.length, 0)}
            </div>
            <div className="text-sm text-green-600">Crèches actives</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-700">{modules.length}</div>
            <div className="text-sm text-purple-600">Modules disponibles</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-amber-700">
              {enterprises.reduce((sum, e) => sum + getEnterpriseMonthlyRevenue(e), 0).toFixed(0)}€
            </div>
            <div className="text-sm text-amber-600">MRR Total</div>
          </CardContent>
        </Card>
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
            Entreprises ({enterprises.length})
          </TabsTrigger>
          <TabsTrigger value="requests">
            Demandes ({pendingRequests.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Enterprise → Nursery Management */}
        <TabsContent value="enterprises" className="space-y-4">
          {enterprises.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-gray-500">
                  <BuildingOffice2Icon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-lg font-medium mb-1">Aucune entreprise</p>
                  <p className="text-sm">Les entreprises apparaîtront ici une fois créées</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            enterprises.map((enterprise) => {
              const isEnterpriseExpanded = expandedEnterprise === enterprise.id
              const totalNurseries = enterprise.nurseries.length
              const monthlyRevenue = getEnterpriseMonthlyRevenue(enterprise)

              return (
                <Card key={enterprise.id} className="overflow-hidden">
                  {/* Enterprise Header */}
                  <CardHeader
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setExpandedEnterprise(isEnterpriseExpanded ? null : enterprise.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isEnterpriseExpanded ? (
                          <ChevronDownIcon className="w-5 h-5 text-gray-500" />
                        ) : (
                          <ChevronRightIcon className="w-5 h-5 text-gray-500" />
                        )}
                        <BuildingOffice2Icon className="w-6 h-6 text-blue-600" />
                        <div>
                          <CardTitle className="text-lg">{enterprise.name}</CardTitle>
                          <CardDescription>
                            Propriétaire: {enterprise.owner_name}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          {totalNurseries} crèche{totalNurseries > 1 ? 's' : ''}
                        </Badge>
                        <Badge variant="secondary" className="bg-green-50 text-green-700">
                          {monthlyRevenue.toFixed(0)}€/mois
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>

                  {/* Nurseries List */}
                  {isEnterpriseExpanded && (
                    <CardContent className="pt-0">
                      {enterprise.nurseries.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <HomeIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                          <p>Aucune crèche pour cette entreprise</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {enterprise.nurseries.map((nursery) => {
                            const isNurseryExpanded = expandedNursery === nursery.id
                            const nurseryRevenue = getNurseryMonthlyRevenue(nursery)

                            return (
                              <div
                                key={nursery.id}
                                className="border rounded-lg overflow-hidden"
                              >
                                {/* Nursery Header */}
                                <div
                                  className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                                  onClick={() => setExpandedNursery(isNurseryExpanded ? null : nursery.id)}
                                >
                                  <div className="flex items-center gap-3">
                                    {isNurseryExpanded ? (
                                      <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                                    ) : (
                                      <ChevronRightIcon className="w-4 h-4 text-gray-500" />
                                    )}
                                    <HomeIcon className="w-5 h-5 text-green-600" />
                                    <span className="font-medium">{nursery.name}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                      {nursery.modules.length} / {modules.length} modules
                                    </Badge>
                                    <Badge variant="secondary" className="text-xs bg-amber-50 text-amber-700">
                                      {nurseryRevenue.toFixed(0)}€/mois
                                    </Badge>
                                  </div>
                                </div>

                                {/* Module Grid */}
                                {isNurseryExpanded && (
                                  <div className="p-4 border-t">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                      {modules.map((module) => {
                                        const hasAccess = nursery.modules.includes(module.id)
                                        const isBase = module.id === 'base'

                                        return (
                                          <div
                                            key={module.id}
                                            className={`p-3 border rounded-lg transition-all ${
                                              hasAccess
                                                ? 'bg-green-50 border-green-200'
                                                : 'bg-gray-50 border-gray-200'
                                            }`}
                                          >
                                            <div className="flex items-start justify-between mb-2">
                                              <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                  {hasAccess ? (
                                                    <LockOpenIcon className="w-4 h-4 text-green-600" />
                                                  ) : (
                                                    <LockClosedIcon className="w-4 h-4 text-gray-400" />
                                                  )}
                                                  <h4 className="font-medium text-sm">{module.name}</h4>
                                                </div>
                                                <p className="text-xs text-gray-600 line-clamp-2 mb-1">
                                                  {module.description}
                                                </p>
                                                <p className="text-xs font-semibold text-gray-700">
                                                  {module.is_free ? 'Gratuit' : `${module.price_monthly}€/mois`}
                                                </p>
                                              </div>
                                            </div>

                                            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                                              <Label
                                                htmlFor={`${nursery.id}-${module.id}`}
                                                className={`text-xs ${isBase ? 'text-gray-400' : 'cursor-pointer'}`}
                                              >
                                                {hasAccess ? 'Activé' : 'Désactivé'}
                                              </Label>
                                              <Switch
                                                id={`${nursery.id}-${module.id}`}
                                                checked={hasAccess}
                                                onCheckedChange={() =>
                                                  toggleNurseryModuleAccess(nursery.id, module.id, hasAccess)
                                                }
                                                disabled={isBase}
                                              />
                                            </div>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              )
            })
          )}
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
