'use client'

import { useEffect, useState } from 'react'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
import { useRouter } from 'next/navigation'
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  EyeIcon,
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { invoicingService, type Invoice } from '@/lib/services/invoicing.service'
import Link from 'next/link'

export default function InvoicesListPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const { selectedNursery, isLoading: nurseryLoading } = useNursery()
  const router = useRouter()

  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Filtres
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    if (selectedNursery?.id) {
      loadInvoices()
    }
  }, [selectedNursery?.id])

  useEffect(() => {
    applyFilters()
  }, [searchQuery, statusFilter, invoices])

  const loadInvoices = async () => {
    if (!selectedNursery?.id) return

    try {
      setIsLoading(true)
      const data = await invoicingService.getByNursery(selectedNursery.id)
      setInvoices(data)
    } catch (error) {
      console.error('Error loading invoices:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...invoices]

    // Filtre par recherche (numéro facture ou famille)
    if (searchQuery) {
      filtered = filtered.filter(
        (inv) =>
          inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (inv as any).family?.family_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Filtre par statut
    if (statusFilter !== 'all') {
      filtered = filtered.filter((inv) => inv.status === statusFilter)
    }

    setFilteredInvoices(filtered)
  }

  const getStatusBadge = (status: Invoice['status']) => {
    const statusConfig: Record<
      Invoice['status'],
      { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' }
    > = {
      draft: { label: 'Brouillon', variant: 'secondary' },
      sent: { label: 'Envoyée', variant: 'default' },
      paid: { label: 'Payée', variant: 'success' },
      partially_paid: { label: 'Partiellement payée', variant: 'warning' },
      overdue: { label: 'En retard', variant: 'destructive' },
      cancelled: { label: 'Annulée', variant: 'secondary' },
      credited: { label: 'Avoir émis', variant: 'secondary' },
    }

    const config = statusConfig[status]
    return <Badge variant={config.variant}>{config.label}</Badge>
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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Factures</h1>
          <p className="text-muted-foreground">
            Gérez toutes les factures émises
          </p>
        </div>
        <Button onClick={() => router.push('/owner/invoicing/invoices/generate')}>
          <PlusIcon className="w-4 h-4 mr-2" />
          Générer factures
        </Button>
      </div>

      {/* Filtres */}
      <Card className="p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Recherche */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Rechercher (n° facture, famille...)"
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
              <SelectItem value="draft">Brouillon</SelectItem>
              <SelectItem value="sent">Envoyée</SelectItem>
              <SelectItem value="paid">Payée</SelectItem>
              <SelectItem value="partially_paid">Partiellement payée</SelectItem>
              <SelectItem value="overdue">En retard</SelectItem>
              <SelectItem value="cancelled">Annulée</SelectItem>
            </SelectContent>
          </Select>

          {/* Résultats */}
          <div className="flex items-center justify-end">
            <p className="text-sm text-gray-600">
              {filteredInvoices.length} facture{filteredInvoices.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </Card>

      {/* Liste des factures */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : filteredInvoices.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-gray-600 mb-2">Aucune facture trouvée</p>
          <p className="text-sm text-gray-500">
            Commencez par générer vos premières factures
          </p>
          <Button
            className="mt-4"
            onClick={() => router.push('/owner/invoicing/invoices/generate')}
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Générer factures
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredInvoices.map((invoice) => (
            <Card key={invoice.id} className="p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                {/* Informations */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">
                      {invoice.invoice_number}
                    </h3>
                    {getStatusBadge(invoice.status)}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Famille</p>
                      <p className="font-medium">
                        {(invoice as any).family?.family_name || 'N/A'}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500">Date émission</p>
                      <p className="font-medium">
                        {new Date(invoice.invoice_date).toLocaleDateString('fr-FR')}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500">Date d'échéance</p>
                      <p className="font-medium">
                        {new Date(invoice.due_date).toLocaleDateString('fr-FR')}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500">Période</p>
                      <p className="font-medium text-xs">
                        {new Date(invoice.billing_period_start).toLocaleDateString('fr-FR', {
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Montants */}
                  <div className="mt-4 pt-4 border-t border-gray-200 flex items-center gap-6 text-sm">
                    <div>
                      <p className="text-gray-500">Montant total</p>
                      <p className="font-bold text-lg">
                        {invoice.total_amount.toLocaleString('fr-FR', {
                          style: 'currency',
                          currency: 'EUR',
                        })}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500">Payé</p>
                      <p className="font-medium text-green-600">
                        {invoice.paid_amount.toLocaleString('fr-FR', {
                          style: 'currency',
                          currency: 'EUR',
                        })}
                      </p>
                    </div>

                    {invoice.remaining_amount > 0 && (
                      <div>
                        <p className="text-gray-500">Reste à payer</p>
                        <p className="font-medium text-orange-600">
                          {invoice.remaining_amount.toLocaleString('fr-FR', {
                            style: 'currency',
                            currency: 'EUR',
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 ml-6">
                  <Link href={`/owner/invoicing/invoices/${invoice.id}`}>
                    <Button variant="outline" size="sm" className="w-full">
                      <EyeIcon className="w-4 h-4 mr-2" />
                      Voir
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
