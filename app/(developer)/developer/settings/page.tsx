'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Cog6ToothIcon,
  CubeIcon,
  CurrencyEuroIcon,
  ServerIcon,
  ShieldCheckIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline'
import type { Module } from '@/types/database.types'

export default function DeveloperSettingsPage() {
  const [modules, setModules] = useState<Module[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [editingModule, setEditingModule] = useState<string | null>(null)
  const [editPrice, setEditPrice] = useState<string>('')

  useEffect(() => {
    loadModules()
  }, [])

  async function loadModules() {
    try {
      setLoading(true)
      const supabase = createClient()

      const { data, error: fetchError } = await supabase
        .from('module')
        .select('*')
        .order('display_order', { ascending: true })

      if (fetchError) throw fetchError
      setModules((data || []) as Module[])
    } catch (err) {
      console.error('Error loading modules:', err)
      setError('Erreur lors du chargement des modules')
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdatePrice(moduleId: string) {
    const price = parseFloat(editPrice)
    if (isNaN(price) || price < 0) {
      setError('Prix invalide')
      return
    }

    try {
      const supabase = createClient()

      const { error: updateError } = await (supabase
        .from('module') as any)
        .update({ price_monthly: price })
        .eq('id', moduleId)

      if (updateError) throw updateError

      setModules(modules.map(m =>
        m.id === moduleId ? { ...m, price_monthly: price } : m
      ))
      setEditingModule(null)
      setEditPrice('')
      setSuccess('Prix mis à jour avec succès')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('Error updating price:', err)
      setError('Erreur lors de la mise à jour du prix')
    }
  }

  async function handleToggleModule(moduleId: string, currentStatus: boolean) {
    try {
      const supabase = createClient()

      const { error: updateError } = await (supabase
        .from('module') as any)
        .update({ is_active: !currentStatus })
        .eq('id', moduleId)

      if (updateError) throw updateError

      setModules(modules.map(m =>
        m.id === moduleId ? { ...m, is_active: !currentStatus } : m
      ))
      setSuccess(`Module ${!currentStatus ? 'activé' : 'désactivé'} avec succès`)
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('Error toggling module:', err)
      setError('Erreur lors de la modification du module')
    }
  }

  const activeModulesCount = modules.filter(m => m.is_active).length
  const totalMRR = modules.reduce((sum, m) => sum + (m.is_active ? (m.price_monthly || 0) : 0), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">Chargement des paramètres...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Paramètres</h1>
        <p className="text-muted-foreground">
          Configuration de la plateforme et gestion du catalogue de modules
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Modules actifs</p>
                <p className="text-3xl font-bold text-purple-900">{activeModulesCount}</p>
              </div>
              <CubeIcon className="w-10 h-10 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Total catalogue</p>
                <p className="text-3xl font-bold text-green-900">{modules.length}</p>
              </div>
              <ServerIcon className="w-10 h-10 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-700">Prix total mensuel</p>
                <p className="text-3xl font-bold text-amber-900">{totalMRR.toFixed(0)}€</p>
              </div>
              <CurrencyEuroIcon className="w-10 h-10 text-amber-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
          <XMarkIcon className="w-5 h-5" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto">
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center gap-2">
          <CheckIcon className="w-5 h-5" />
          {success}
        </div>
      )}

      {/* Main Content */}
      <Tabs defaultValue="modules" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="modules">
            <CubeIcon className="w-4 h-4 mr-2" />
            Catalogue ({modules.length})
          </TabsTrigger>
          <TabsTrigger value="system">
            <Cog6ToothIcon className="w-4 h-4 mr-2" />
            Système
          </TabsTrigger>
        </TabsList>

        {/* Modules Tab */}
        <TabsContent value="modules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CubeIcon className="w-5 h-5 text-purple-600" />
                Catalogue des modules
              </CardTitle>
              <CardDescription>
                Gérez les modules disponibles et leurs tarifs mensuels
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {modules.map((module) => (
                  <div
                    key={module.id}
                    className={`p-4 rounded-lg border ${
                      module.is_active
                        ? 'bg-white border-gray-200'
                        : 'bg-gray-50 border-gray-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold text-gray-900 capitalize">
                            {module.name}
                          </h3>
                          <Badge variant={module.is_active ? 'default' : 'secondary'}>
                            {module.is_active ? 'Actif' : 'Inactif'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          {module.description || 'Aucune description'}
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        {/* Price editing */}
                        {editingModule === module.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              value={editPrice}
                              onChange={(e) => setEditPrice(e.target.value)}
                              className="w-24"
                              min="0"
                              step="0.01"
                              placeholder="Prix"
                            />
                            <span className="text-gray-500">€/mois</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleUpdatePrice(module.id)}
                              className="text-green-600 hover:text-green-700"
                            >
                              <CheckIcon className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingModule(null)
                                setEditPrice('')
                              }}
                              className="text-gray-500 hover:text-gray-600"
                            >
                              <XMarkIcon className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">
                              {module.price_monthly.toFixed(2)}€
                            </span>
                            <span className="text-sm text-gray-500">/mois</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingModule(module.id)
                                setEditPrice(module.price_monthly.toString())
                              }}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </Button>
                          </div>
                        )}

                        {/* Toggle active */}
                        <Button
                          size="sm"
                          variant={module.is_active ? 'outline' : 'default'}
                          onClick={() => handleToggleModule(module.id, module.is_active)}
                        >
                          {module.is_active ? 'Désactiver' : 'Activer'}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {modules.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <CubeIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p className="text-lg font-medium mb-1">Aucun module</p>
                    <p className="text-sm">Le catalogue de modules est vide</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Platform Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ServerIcon className="w-5 h-5 text-blue-600" />
                  Informations plateforme
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Version</span>
                  <Badge variant="outline">v1.0.0</Badge>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Environnement</span>
                  <Badge variant="secondary">
                    {process.env.NODE_ENV === 'production' ? 'Production' : 'Développement'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Framework</span>
                  <span className="text-gray-900 font-medium">Next.js 15</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600">Base de données</span>
                  <span className="text-gray-900 font-medium">Supabase</span>
                </div>
              </CardContent>
            </Card>

            {/* Security */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheckIcon className="w-5 h-5 text-green-600" />
                  Sécurité
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Authentification</span>
                  <Badge className="bg-green-100 text-green-700">Supabase Auth</Badge>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Chiffrement PIN</span>
                  <Badge className="bg-green-100 text-green-700">bcrypt</Badge>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">RLS</span>
                  <Badge variant="secondary">Désactivé (dev)</Badge>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600">Sessions</span>
                  <Badge className="bg-green-100 text-green-700">JWT + localStorage</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Info Banner */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <InformationCircleIcon className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900">Note de développement</p>
                  <p className="text-sm text-blue-700 mt-1">
                    Les paramètres avancés de configuration système seront disponibles dans une
                    prochaine version. Contactez l&apos;équipe technique pour toute modification urgente.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
