'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/contexts/AuthContext'
import { modulesService, type EnterpriseWithNurseries } from '@/lib/services/modules.service'
import { createOwner } from '@/lib/actions/users.actions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog'
import {
  BuildingOffice2Icon,
  UserPlusIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  HomeIcon,
  UserGroupIcon,
  EnvelopeIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'

interface EnterpriseDetails extends EnterpriseWithNurseries {
  employee_count?: number
  created_at?: string
  address?: string
  city?: string
  phone?: string
}

export default function EnterprisesPage() {
  const { session, isLoading: authLoading } = useAuth()
  const router = useRouter()

  const [enterprises, setEnterprises] = useState<EnterpriseDetails[]>([])
  const [expandedEnterprise, setExpandedEnterprise] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Create owner form state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [newOwner, setNewOwner] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: ''
  })

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

      const enterprisesData = await modulesService.getEnterprisesWithNurseries()
      setEnterprises(enterprisesData as EnterpriseDetails[])
    } catch (err) {
      console.error('Error loading enterprises:', err)
      setError('Erreur lors du chargement des entreprises')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateOwner(e: React.FormEvent) {
    e.preventDefault()
    if (!session?.user?.id) return

    try {
      setCreateLoading(true)
      setError(null)

      const result = await createOwner({
        email: newOwner.email,
        password: newOwner.password,
        first_name: newOwner.firstName,
        last_name: newOwner.lastName
      })

      if (result.error) {
        setError(result.error)
        return
      }

      setSuccess(`Propriétaire ${newOwner.firstName} ${newOwner.lastName} créé avec succès. Il devra créer son entreprise lors de sa première connexion.`)
      setIsCreateDialogOpen(false)
      setNewOwner({ email: '', password: '', firstName: '', lastName: '' })

      setTimeout(() => setSuccess(null), 5000)
    } catch (err: any) {
      console.error('Error creating owner:', err)
      setError(err.message || 'Erreur lors de la création du propriétaire')
    } finally {
      setCreateLoading(false)
    }
  }

  // Filter enterprises based on search
  const filteredEnterprises = enterprises.filter((enterprise) =>
    enterprise.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    enterprise.owner_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Stats
  const totalNurseries = enterprises.reduce((sum, e) => sum + e.nurseries.length, 0)

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des entreprises...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Entreprises</h1>
          <p className="text-muted-foreground">
            Gérez les entreprises et leurs crèches
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              <UserPlusIcon className="w-5 h-5 mr-2" />
              Nouveau Propriétaire
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Créer un nouveau propriétaire</DialogTitle>
              <DialogDescription>
                Le propriétaire devra créer son entreprise lors de sa première connexion.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateOwner} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Prénom</Label>
                  <Input
                    id="firstName"
                    value={newOwner.firstName}
                    onChange={(e) => setNewOwner({ ...newOwner, firstName: e.target.value })}
                    placeholder="Jean"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nom</Label>
                  <Input
                    id="lastName"
                    value={newOwner.lastName}
                    onChange={(e) => setNewOwner({ ...newOwner, lastName: e.target.value })}
                    placeholder="Dupont"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newOwner.email}
                  onChange={(e) => setNewOwner({ ...newOwner, email: e.target.value })}
                  placeholder="jean@exemple.fr"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe temporaire</Label>
                <Input
                  id="password"
                  type="password"
                  value={newOwner.password}
                  onChange={(e) => setNewOwner({ ...newOwner, password: e.target.value })}
                  placeholder="••••••••"
                  minLength={6}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Minimum 6 caractères. Le propriétaire pourra le modifier.
                </p>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Annuler
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={createLoading}>
                  {createLoading ? 'Création...' : 'Créer le propriétaire'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <BuildingOffice2Icon className="w-8 h-8 text-blue-600" />
              <div>
                <div className="text-2xl font-bold text-blue-700">{enterprises.length}</div>
                <div className="text-sm text-blue-600">Entreprises</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <HomeIcon className="w-8 h-8 text-green-600" />
              <div>
                <div className="text-2xl font-bold text-green-700">{totalNurseries}</div>
                <div className="text-sm text-green-600">Crèches</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <UserGroupIcon className="w-8 h-8 text-purple-600" />
              <div>
                <div className="text-2xl font-bold text-purple-700">{enterprises.length}</div>
                <div className="text-sm text-purple-600">Propriétaires</div>
              </div>
            </div>
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

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Rechercher une entreprise ou un propriétaire..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Enterprises List */}
      <div className="space-y-4">
        {filteredEnterprises.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-gray-500">
                <BuildingOffice2Icon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p className="text-lg font-medium mb-1">
                  {searchQuery ? 'Aucun résultat' : 'Aucune entreprise'}
                </p>
                <p className="text-sm">
                  {searchQuery
                    ? 'Essayez une autre recherche'
                    : 'Créez un propriétaire pour commencer'}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredEnterprises.map((enterprise) => {
            const isExpanded = expandedEnterprise === enterprise.id

            return (
              <Card key={enterprise.id} className="overflow-hidden">
                {/* Enterprise Header */}
                <CardHeader
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedEnterprise(isExpanded ? null : enterprise.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDownIcon className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronRightIcon className="w-5 h-5 text-gray-500" />
                      )}
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <BuildingOffice2Icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{enterprise.name}</CardTitle>
                        <CardDescription className="flex items-center gap-1">
                          <UserGroupIcon className="w-4 h-4" />
                          {enterprise.owner_name}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        {enterprise.nurseries.length} crèche{enterprise.nurseries.length > 1 ? 's' : ''}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                {/* Enterprise Details */}
                {isExpanded && (
                  <CardContent className="pt-0 border-t bg-gray-50/50">
                    {/* Owner Info */}
                    <div className="mb-6 p-4 bg-white rounded-lg border">
                      <h4 className="font-semibold text-sm text-gray-700 mb-3">Propriétaire</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <UserGroupIcon className="w-4 h-4 text-gray-400" />
                          <span>{enterprise.owner_name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <EnvelopeIcon className="w-4 h-4 text-gray-400" />
                          <span>{enterprise.owner_email || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Nurseries */}
                    <div>
                      <h4 className="font-semibold text-sm text-gray-700 mb-3 flex items-center gap-2">
                        <HomeIcon className="w-4 h-4" />
                        Crèches ({enterprise.nurseries.length})
                      </h4>
                      {enterprise.nurseries.length === 0 ? (
                        <div className="text-center py-6 text-gray-500 bg-white rounded-lg border">
                          <HomeIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                          <p className="text-sm">Aucune crèche pour cette entreprise</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {enterprise.nurseries.map((nursery) => (
                            <div
                              key={nursery.id}
                              className="p-4 bg-white rounded-lg border hover:shadow-sm transition-shadow"
                            >
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                                  <HomeIcon className="w-5 h-5 text-green-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h5 className="font-medium text-gray-900 truncate">
                                    {nursery.name}
                                  </h5>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {nursery.modules.length} module{nursery.modules.length > 1 ? 's' : ''} actif{nursery.modules.length > 1 ? 's' : ''}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
