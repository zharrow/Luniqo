'use client'

import { useEffect, useState } from 'react'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
import { useRouter } from 'next/navigation'
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { paymentService, type Payment } from '@/lib/services/payment.service'

export default function PaymentsListPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const { selectedNursery, isLoading: nurseryLoading } = useNursery()
  const router = useRouter()

  const [payments, setPayments] = useState<Payment[]>([])
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Filtres
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    if (selectedNursery?.id) {
      loadPayments()
    }
  }, [selectedNursery?.id])

  useEffect(() => {
    applyFilters()
  }, [searchQuery, statusFilter, payments])

  const loadPayments = async () => {
    if (!selectedNursery?.id) return

    try {
      setIsLoading(true)
      const data = await paymentService.getByNursery(selectedNursery.id)
      setPayments(data)
    } catch (error) {
      console.error('Error loading payments:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...payments]

    // Filtre par recherche
    if (searchQuery) {
      filtered = filtered.filter(
        (payment) =>
          payment.payment_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (payment as any).family?.family_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Filtre par statut
    if (statusFilter !== 'all') {
      filtered = filtered.filter((payment) => payment.status === statusFilter)
    }

    setFilteredPayments(filtered)
  }

  const handleValidate = async (paymentId: string) => {
    if (!session?.user?.id) return

    try {
      await paymentService.validate(paymentId, session.user.id)
      await loadPayments()
    } catch (error) {
      console.error('Error validating payment:', error)
      alert('Erreur lors de la validation du paiement')
    }
  }

  const handleReject = async (paymentId: string) => {
    if (!session?.user?.id) return

    const reason = prompt('Raison du rejet :')
    if (!reason) return

    try {
      await paymentService.reject(paymentId, session.user.id, reason)
      await loadPayments()
    } catch (error) {
      console.error('Error rejecting payment:', error)
      alert('Erreur lors du rejet du paiement')
    }
  }

  const getStatusBadge = (status: Payment['status']) => {
    const statusConfig: Record<
      Payment['status'],
      { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' }
    > = {
      received: { label: 'Reçu', variant: 'warning' },
      validated: { label: 'Validé', variant: 'success' },
      rejected: { label: 'Rejeté', variant: 'destructive' },
      refunded: { label: 'Remboursé', variant: 'secondary' },
    }

    const config = statusConfig[status]
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getPaymentMethodLabel = (method: any) => {
    const methods: Record<string, string> = {
      bank_transfer: 'Virement',
      direct_debit: 'Prélèvement',
      check: 'Chèque',
      cash: 'Espèces',
      credit_card: 'Carte bancaire',
      stripe: 'Stripe',
      paypal: 'PayPal',
    }
    return methods[method] || method
  }

  if (authLoading || nurseryLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-green-100">
            <CheckIcon className="w-6 h-6 text-green-600" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Paiements</h1>
            <p className="text-sm text-muted-foreground">
              Gérez et validez les paiements reçus
            </p>
          </div>
        </div>
        <Button onClick={() => router.push('/owner/invoicing/payments/new')}>
          <PlusIcon className="w-4 h-4 mr-2" />
          Enregistrer paiement
        </Button>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 bg-yellow-50 border-yellow-200">
          <p className="text-sm text-gray-600 mb-1">En attente</p>
          <p className="text-2xl font-bold">
            {payments.filter(p => p.status === 'received').length}
          </p>
        </Card>

        <Card className="p-4 bg-green-50 border-green-200">
          <p className="text-sm text-gray-600 mb-1">Validés</p>
          <p className="text-2xl font-bold">
            {payments.filter(p => p.status === 'validated').length}
          </p>
        </Card>

        <Card className="p-4 bg-red-50 border-red-200">
          <p className="text-sm text-gray-600 mb-1">Rejetés</p>
          <p className="text-2xl font-bold">
            {payments.filter(p => p.status === 'rejected').length}
          </p>
        </Card>

        <Card className="p-4 bg-blue-50 border-blue-200">
          <p className="text-sm text-gray-600 mb-1">Total reçu</p>
          <p className="text-2xl font-bold">
            {payments
              .filter(p => p.status === 'validated')
              .reduce((sum, p) => sum + p.amount, 0)
              .toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </p>
        </Card>
      </div>

      {/* Filtres */}
      <Card className="p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Recherche */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Rechercher (n° paiement, famille...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filtre par statut */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <FunnelIcon className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Tous les statuts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="received">En attente</SelectItem>
              <SelectItem value="validated">Validés</SelectItem>
              <SelectItem value="rejected">Rejetés</SelectItem>
              <SelectItem value="refunded">Remboursés</SelectItem>
            </SelectContent>
          </Select>

          {/* Résultats */}
          <div className="flex items-center justify-end">
            <p className="text-sm text-gray-600">
              {filteredPayments.length} paiement{filteredPayments.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </Card>

      {/* Liste des paiements */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : filteredPayments.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-gray-600 mb-2">Aucun paiement trouvé</p>
          <p className="text-sm text-gray-500">
            Les paiements apparaîtront ici une fois enregistrés
          </p>
          <Button
            className="mt-4"
            onClick={() => router.push('/owner/invoicing/payments/new')}
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Enregistrer un paiement
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredPayments.map((payment) => (
            <Card key={payment.id} className="p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                {/* Informations */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">
                      {payment.payment_number}
                    </h3>
                    {getStatusBadge(payment.status)}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Famille</p>
                      <p className="font-medium">
                        {(payment as any).family?.family_name || 'N/A'}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500">Date</p>
                      <p className="font-medium">
                        {new Date(payment.payment_date).toLocaleDateString('fr-FR')}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500">Moyen</p>
                      <p className="font-medium">
                        {getPaymentMethodLabel((payment as any).payment_method?.method_type)}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500">Facture</p>
                      <p className="font-medium text-xs">
                        {(payment as any).invoice?.invoice_number || 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Montant */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-500">Montant</p>
                    <p className="font-bold text-2xl text-green-600">
                      {payment.amount.toLocaleString('fr-FR', {
                        style: 'currency',
                        currency: 'EUR',
                      })}
                    </p>
                  </div>

                  {/* Références */}
                  {payment.transaction_reference && (
                    <div className="mt-2 text-xs text-gray-600">
                      Réf: {payment.transaction_reference}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 ml-6">
                  {payment.status === 'received' && (
                    <>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleValidate(payment.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckIcon className="w-4 h-4 mr-2" />
                        Valider
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleReject(payment.id)}
                      >
                        <XMarkIcon className="w-4 h-4 mr-2" />
                        Rejeter
                      </Button>
                    </>
                  )}

                  {payment.status === 'validated' && (
                    <Badge variant="success" className="text-center py-2">
                      <CheckIcon className="w-4 h-4 mr-1" />
                      Validé
                    </Badge>
                  )}

                  {payment.status === 'rejected' && (
                    <Badge variant="destructive" className="text-center py-2">
                      <XMarkIcon className="w-4 h-4 mr-1" />
                      Rejeté
                    </Badge>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
