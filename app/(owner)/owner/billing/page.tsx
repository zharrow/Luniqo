'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
import type { Module, StripeSubscription, StripeSubscriptionItem } from '@/types/database.types'
import { createClient } from '@/lib/supabase/client'
import {
  CreditCardIcon,
  CheckCircleIcon,
  SparklesIcon,
  ArrowTopRightOnSquareIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageBreadcrumb } from '@/components/shared/PageBreadcrumb'

// ============================================================================
// TYPES
// ============================================================================

interface SubscriptionWithItems extends StripeSubscription {
  items?: (StripeSubscriptionItem & { module?: Module })[]
}

// Module icon mapping
const MODULE_ICONS: Record<string, string> = {
  cleaning: 'SparklesIcon',
  haccp: 'BeakerIcon',
  children: 'UserGroupIcon',
  attendance: 'CalendarDaysIcon',
  staff: 'BriefcaseIcon',
  enrollment: 'ClipboardDocumentCheckIcon',
  billing: 'CurrencyEuroIcon',
  parent_portal: 'DevicePhoneMobileIcon',
  analytics: 'ChartBarIcon',
}

// Module color mapping (pastel)
const MODULE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  cleaning: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
  haccp: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
  children: { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-700' },
  attendance: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700' },
  staff: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700' },
  enrollment: { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700' },
  billing: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
  parent_portal: { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700' },
  analytics: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' },
}

// ============================================================================
// PAGE
// ============================================================================

export default function BillingPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const { selectedNursery } = useNursery()
  interface ManualAccessInfo {
    moduleId: string
    expiresAt: string | null
    notes: string | null
  }

  const [modules, setModules] = useState<Module[]>([])
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithItems[]>([])
  const [subscribedModuleIds, setSubscribedModuleIds] = useState<Set<string>>(new Set())
  const [manualAccess, setManualAccess] = useState<Map<string, ManualAccessInfo>>(new Map())
  const [selectedModules, setSelectedModules] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const enterpriseId = session?.enterprise?.id

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  const loadData = useCallback(async () => {
    if (!enterpriseId || !selectedNursery) return
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // Fetch all paid modules
      const { data: modulesData } = await supabase
        .from('module')
        .select('*')
        .eq('is_active', true)
        .eq('is_free', false)
        .order('display_order', { ascending: true })

      setModules((modulesData || []) as Module[])

      // Fetch active subscriptions
      const { data: subsData } = await supabase
        .from('stripe_subscription')
        .select('*')
        .eq('enterprise_id', enterpriseId)
        .in('status', ['active', 'trialing', 'past_due'])

      const typedSubsData = (subsData || []) as StripeSubscription[]

      // Fetch Stripe subscriptions
      if (typedSubsData.length > 0) {
        // Fetch items for each subscription, FILTERED BY CURRENT NURSERY
        const subsWithItems: SubscriptionWithItems[] = []
        const activeModuleIds = new Set<string>()

        for (const sub of typedSubsData) {
          const { data: items } = await supabase
            .from('stripe_subscription_item')
            .select('*, module:module(*)')
            .eq('stripe_subscription_id', sub.id)
            .eq('nursery_id', selectedNursery.id) as { data: (StripeSubscriptionItem & { module?: Module })[] | null }

          // Only include subscription if it has items for this nursery
          if (items && items.length > 0) {
            subsWithItems.push({
              ...sub,
              items: items || [],
            })

            items?.forEach((item) => activeModuleIds.add(item.module_id))
          }
        }

        setSubscriptions(subsWithItems)
        setSubscribedModuleIds(activeModuleIds)
      } else {
        setSubscriptions([])
        setSubscribedModuleIds(new Set())
      }

      // Fetch manual module access (granted by developer)
      const { data: manualAccessData } = await supabase
        .from('nursery_module_access')
        .select('module_id, expires_at, notes, granted_by_id')
        .eq('nursery_id', selectedNursery.id)
        .eq('is_active', true)
        .not('granted_by_id', 'is', null) // Only manual grants

      const manualMap = new Map<string, ManualAccessInfo>()
      manualAccessData?.forEach((access: any) => {
        manualMap.set(access.module_id, {
          moduleId: access.module_id,
          expiresAt: access.expires_at,
          notes: access.notes,
        })
      })
      setManualAccess(manualMap)
    } catch (err) {
      console.error('Error loading billing data:', err)
      setError('Erreur lors du chargement des données de facturation')
    } finally {
      setLoading(false)
    }
  }, [enterpriseId, selectedNursery])

  useEffect(() => {
    if (enterpriseId && selectedNursery) {
      loadData()
    }
  }, [enterpriseId, selectedNursery?.id, loadData])

  // ============================================================================
  // ACTIONS
  // ============================================================================

  const toggleModule = (moduleId: string) => {
    setSelectedModules((prev) => {
      const next = new Set(prev)
      if (next.has(moduleId)) {
        next.delete(moduleId)
      } else {
        next.add(moduleId)
      }
      return next
    })
  }

  const handleCheckout = async () => {
    if (!enterpriseId || !selectedNursery || selectedModules.size === 0) return

    setCheckoutLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'subscription',
          enterpriseId,
          nurseryId: selectedNursery.id,
          moduleIds: Array.from(selectedModules),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la création du paiement')
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url
    } catch (err) {
      console.error('Checkout error:', err)
      setError(err instanceof Error ? err.message : 'Erreur lors du paiement')
      setCheckoutLoading(false)
    }
  }

  const handlePortal = async () => {
    if (!enterpriseId) return

    setPortalLoading(true)

    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enterpriseId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur portail')
      }

      window.location.href = data.url
    } catch (err) {
      console.error('Portal error:', err)
      setError(err instanceof Error ? err.message : 'Erreur portail')
      setPortalLoading(false)
    }
  }

  // ============================================================================
  // COMPUTED
  // ============================================================================

  const selectedTotal = Array.from(selectedModules).reduce((sum, moduleId) => {
    const mod = modules.find((m) => m.id === moduleId)
    return sum + (mod?.price_monthly || 0)
  }, 0)

  const currentTotal = subscriptions.reduce((sum, sub) => {
    return (
      sum +
      (sub.items || []).reduce((itemSum, item) => {
        return itemSum + (item.module?.price_monthly || 0)
      }, 0)
    )
  }, 0)

  // ============================================================================
  // RENDER
  // ============================================================================

  if (authLoading || loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-48 bg-gray-100 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <PageBreadcrumb
        items={[{ label: 'Facturation', href: '/owner/billing' }]}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-100">
            <CreditCardIcon className="w-6 h-6 text-amber-600" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Facturation & Abonnements</h1>
            <p className="text-sm text-muted-foreground">
              Gérez vos modules et abonnements pour {selectedNursery?.name || 'votre crèche'}
            </p>
          </div>
        </div>
        {subscriptions.length > 0 && (
          <Button
            variant="outline"
            onClick={handlePortal}
            disabled={portalLoading}
            className="gap-2"
          >
            <CreditCardIcon className="h-4 w-4" />
            {portalLoading ? 'Redirection...' : 'Gérer les paiements'}
            <ArrowTopRightOnSquareIcon className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <XMarkIcon className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-800 font-medium">Erreur</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Current Subscription Summary */}
      {subscriptions.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircleSolid className="h-6 w-6 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Abonnement Stripe actif</h2>
            <Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-200">
              {currentTotal.toFixed(2)} EUR/mois
            </Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            {subscriptions.flatMap((sub) =>
              (sub.items || []).map((item) => {
                const colors = MODULE_COLORS[item.module_id] || MODULE_COLORS.cleaning
                return (
                  <Badge
                    key={item.id}
                    variant="outline"
                    className={`${colors.bg} ${colors.border} ${colors.text} px-3 py-1`}
                  >
                    <CheckCircleIcon className="h-3.5 w-3.5 mr-1" />
                    {item.module?.name || item.module_id}
                  </Badge>
                )
              })
            )}
          </div>
          {subscriptions.some((s) => s.cancel_at_period_end) && (
            <p className="text-amber-600 text-sm mt-3">
              Annulation programmée en fin de période
            </p>
          )}
        </div>
      )}

      {/* Manual Access Summary */}
      {manualAccess.size > 0 && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <SparklesIcon className="h-6 w-6 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">Modules offerts pour démo</h2>
            <Badge variant="default" className="bg-purple-100 text-purple-800 border-purple-200">
              Gratuit
            </Badge>
          </div>
          <div className="space-y-2">
            {Array.from(manualAccess.values()).map((access) => {
              const module = modules.find(m => m.id === access.moduleId)
              const colors = MODULE_COLORS[access.moduleId] || MODULE_COLORS.cleaning
              const expiresDate = access.expiresAt ? new Date(access.expiresAt) : null

              return (
                <div key={access.moduleId} className="flex items-center justify-between bg-white rounded-lg p-3 border border-purple-100">
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className={`${colors.bg} ${colors.border} ${colors.text} px-3 py-1`}
                    >
                      <CheckCircleIcon className="h-3.5 w-3.5 mr-1" />
                      {module?.name || access.moduleId}
                    </Badge>
                  </div>
                  {expiresDate && (
                    <div className="text-sm text-gray-600">
                      Jusqu'au <span className="font-medium text-purple-700">
                        {expiresDate.toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  )}
                  {!expiresDate && (
                    <div className="text-sm text-gray-500 italic">
                      Sans limite de temps
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Module Catalog */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {subscriptions.length > 0 ? 'Ajouter des modules' : 'Choisissez vos modules'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((mod) => {
            const isStripeActive = subscribedModuleIds.has(mod.id)
            const manualAccessInfo = manualAccess.get(mod.id)
            const isManualActive = !!manualAccessInfo
            const isActive = isStripeActive || isManualActive
            const isSelected = selectedModules.has(mod.id)
            const colors = MODULE_COLORS[mod.id] || MODULE_COLORS.cleaning

            return (
              <div
                key={mod.id}
                onClick={() => !isActive && toggleModule(mod.id)}
                className={`
                  relative rounded-xl border-2 p-5 transition-all cursor-pointer
                  ${isActive
                    ? isManualActive
                      ? 'border-purple-300 bg-purple-50/50 cursor-default opacity-75'
                      : 'border-green-300 bg-green-50/50 cursor-default opacity-75'
                    : isSelected
                    ? `${colors.border} ${colors.bg} ring-2 ring-offset-1 ring-blue-400`
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                  }
                `}
              >
                {/* Stripe badge */}
                {isStripeActive && (
                  <div className="absolute top-3 right-3">
                    <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 text-xs">
                      <CheckCircleSolid className="h-3 w-3 mr-1" />
                      Actif (Stripe)
                    </Badge>
                  </div>
                )}

                {/* Manual access badge */}
                {isManualActive && !isStripeActive && (
                  <div className="absolute top-3 right-3">
                    <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300 text-xs">
                      <SparklesIcon className="h-3 w-3 mr-1" />
                      Offert
                    </Badge>
                  </div>
                )}

                {/* Selected indicator */}
                {isSelected && !isActive && (
                  <div className="absolute top-3 right-3">
                    <div className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center">
                      <CheckCircleIcon className="h-4 w-4 text-white" />
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <div className={`inline-flex items-center justify-center h-10 w-10 rounded-lg ${colors.bg} ${colors.border} border`}>
                    <SparklesIcon className={`h-5 w-5 ${colors.text}`} />
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900">{mod.name}</h3>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                      {mod.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-gray-100">
                    <span className="text-lg font-bold text-gray-900">
                      {mod.price_monthly.toFixed(0)} EUR
                    </span>
                    <span className="text-gray-400 text-sm"> / mois</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Checkout Bar */}
      {selectedModules.size > 0 && (
        <div className="sticky bottom-4 bg-white border-2 border-blue-200 rounded-xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">
              {selectedModules.size} module{selectedModules.size > 1 ? 's' : ''} sélectionné{selectedModules.size > 1 ? 's' : ''}
            </p>
            <p className="text-xl font-bold text-gray-900">
              {selectedTotal.toFixed(2)} EUR<span className="text-sm font-normal text-gray-400"> / mois</span>
            </p>
          </div>
          <Button
            onClick={handleCheckout}
            disabled={checkoutLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 gap-2"
          >
            <CreditCardIcon className="h-4 w-4" />
            {checkoutLoading ? 'Redirection vers Stripe...' : 'Souscrire'}
          </Button>
        </div>
      )}

      {/* Empty state */}
      {modules.length === 0 && !loading && (
        <div className="text-center py-12">
          <SparklesIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Aucun module disponible</h3>
          <p className="text-gray-500 mt-1">
            Les modules payants ne sont pas encore configurés avec Stripe.
          </p>
        </div>
      )}
    </div>
  )
}
