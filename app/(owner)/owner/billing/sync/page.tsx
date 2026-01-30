'use client'

import { useState } from 'react'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { syncStripePrices, createStripeProducts } from '@/lib/actions/stripe.actions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageBreadcrumb } from '@/components/shared/PageBreadcrumb'
import {
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'

export default function StripeSyncPage() {
  const { isLoading: authLoading } = useRequireAuth(['Owner'])
  const [syncing, setSyncing] = useState(false)
  const [creating, setCreating] = useState(false)
  const [syncResult, setSyncResult] = useState<{ synced: number; errors: string[] } | null>(null)
  const [createResult, setCreateResult] = useState<{ created: number; errors: string[] } | null>(null)

  const handleSyncPrices = async () => {
    setSyncing(true)
    setSyncResult(null)

    try {
      const result = await syncStripePrices()
      setSyncResult(result)
    } catch (error) {
      setSyncResult({
        synced: 0,
        errors: [error instanceof Error ? error.message : 'Erreur inconnue'],
      })
    } finally {
      setSyncing(false)
    }
  }

  const handleCreateProducts = async () => {
    setCreating(true)
    setCreateResult(null)

    try {
      const result = await createStripeProducts()
      setCreateResult(result)
    } catch (error) {
      setCreateResult({
        created: 0,
        errors: [error instanceof Error ? error.message : 'Erreur inconnue'],
      })
    } finally {
      setCreating(false)
    }
  }

  if (authLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="h-32 bg-gray-100 rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <PageBreadcrumb
        items={[
          { label: 'Facturation', href: '/owner/billing' },
          { label: 'Synchronisation Stripe' },
        ]}
      />

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Synchronisation Stripe</h1>
        <p className="text-gray-500 mt-1">
          Outils de développement pour synchroniser les produits et prix Stripe
        </p>
      </div>

      {/* Warning Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
        <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-amber-800 font-medium">Page de développement</p>
          <p className="text-amber-600 text-sm">
            Cette page est temporaire. Supprimez-la après avoir synchronisé vos prix Stripe.
          </p>
        </div>
      </div>

      {/* Sync Prices Section */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <ArrowPathIcon className="h-5 w-5 text-blue-500" />
              Synchroniser les prix
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Récupère les prix depuis Stripe Dashboard et met à jour la table <code className="bg-gray-100 px-1 py-0.5 rounded">module</code>
            </p>
          </div>
          <Button
            onClick={handleSyncPrices}
            disabled={syncing}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
          >
            <ArrowPathIcon className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Synchronisation...' : 'Synchroniser'}
          </Button>
        </div>

        {syncResult && (
          <div className={`rounded-lg p-4 ${
            syncResult.errors.length > 0 ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {syncResult.errors.length > 0 ? (
                <XCircleIcon className="h-5 w-5 text-red-500" />
              ) : (
                <CheckCircleIcon className="h-5 w-5 text-green-500" />
              )}
              <p className={`font-medium ${
                syncResult.errors.length > 0 ? 'text-red-800' : 'text-green-800'
              }`}>
                {syncResult.synced} prix synchronisé{syncResult.synced > 1 ? 's' : ''}
              </p>
            </div>

            {syncResult.errors.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm text-red-700 font-medium">Erreurs :</p>
                {syncResult.errors.map((error, idx) => (
                  <p key={idx} className="text-sm text-red-600">
                    • {error}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Products Section */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <SparklesIcon className="h-5 w-5 text-purple-500" />
              Créer les produits automatiquement
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Crée automatiquement les produits et prix dans Stripe pour tous les modules payants
            </p>
            <div className="mt-2">
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                ⚠️ Utilisez cette option seulement si vous n'avez PAS créé les produits manuellement
              </Badge>
            </div>
          </div>
          <Button
            onClick={handleCreateProducts}
            disabled={creating}
            variant="outline"
            className="gap-2"
          >
            <SparklesIcon className={`h-4 w-4 ${creating ? 'animate-spin' : ''}`} />
            {creating ? 'Création...' : 'Créer'}
          </Button>
        </div>

        {createResult && (
          <div className={`rounded-lg p-4 ${
            createResult.errors.length > 0 ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {createResult.errors.length > 0 ? (
                <XCircleIcon className="h-5 w-5 text-red-500" />
              ) : (
                <CheckCircleIcon className="h-5 w-5 text-green-500" />
              )}
              <p className={`font-medium ${
                createResult.errors.length > 0 ? 'text-red-800' : 'text-green-800'
              }`}>
                {createResult.created} produit{createResult.created > 1 ? 's' : ''} créé{createResult.created > 1 ? 's' : ''}
              </p>
            </div>

            {createResult.errors.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm text-red-700 font-medium">Erreurs :</p>
                {createResult.errors.map((error, idx) => (
                  <p key={idx} className="text-sm text-red-600">
                    • {error}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">Instructions</h3>
        <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
          <li>
            <strong>Si vous avez déjà créé les produits manuellement dans Stripe Dashboard</strong>
            <ul className="ml-6 mt-1 space-y-1 list-disc list-inside">
              <li>Cliquez sur "Synchroniser" ci-dessus</li>
              <li>Vérifiez que tous les modules ont été synchronisés</li>
              <li>Allez sur <a href="/owner/billing" className="underline">/owner/billing</a> pour tester le checkout</li>
            </ul>
          </li>
          <li className="mt-3">
            <strong>Si vous n'avez PAS encore créé les produits</strong>
            <ul className="ml-6 mt-1 space-y-1 list-disc list-inside">
              <li>Cliquez sur "Créer" ci-dessus pour créer automatiquement tous les produits</li>
              <li>Allez sur <a href="/owner/billing" className="underline">/owner/billing</a> pour tester le checkout</li>
            </ul>
          </li>
        </ol>
      </div>
    </div>
  )
}
