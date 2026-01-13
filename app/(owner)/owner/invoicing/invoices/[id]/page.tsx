'use client'

import { useEffect, useState } from 'react'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeftIcon,
  PencilIcon,
  PaperAirplaneIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { invoicingService, type Invoice, type InvoiceLine } from '@/lib/services/invoicing.service'
import { paymentService, type Payment } from '@/lib/services/payment.service'
import Link from 'next/link'

export default function InvoiceDetailPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const params = useParams()
  const router = useRouter()
  const invoiceId = params.id as string

  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [lines, setLines] = useState<InvoiceLine[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (invoiceId) {
      loadInvoiceData()
    }
  }, [invoiceId])

  const loadInvoiceData = async () => {
    try {
      setIsLoading(true)
      const [invoiceData, paymentsData] = await Promise.all([
        invoicingService.getById(invoiceId),
        paymentService.getByInvoice(invoiceId),
      ])
      setInvoice(invoiceData)
      setLines(invoiceData.lines || [])
      setPayments(paymentsData)
    } catch (error) {
      console.error('Error loading invoice:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelInvoice = async () => {
    if (!confirm('Êtes-vous sûr de vouloir annuler cette facture ?')) return

    if (!session?.user?.id) {
      alert('Session expirée')
      return
    }

    try {
      setActionLoading(true)
      await invoicingService.cancel(invoiceId, session.user.id, 'Annulée par Owner')
      await loadInvoiceData()
    } catch (error) {
      console.error('Error cancelling invoice:', error)
      alert('Erreur lors de l\'annulation de la facture')
    } finally {
      setActionLoading(false)
    }
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

  const getLineTypeLabel = (type: InvoiceLine['item_type']) => {
    const typeLabels: Record<InvoiceLine['item_type'], string> = {
      childcare: 'Garde d\'enfant',
      meal: 'Repas',
      extra_hours: 'Heures supplémentaires',
      supply_fee: 'Fournitures',
      late_pickup: 'Retard récupération',
      penalty: 'Pénalité',
      adjustment: 'Ajustement',
      other: 'Autre',
    }
    return typeLabels[type] || type
  }

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="max-w-5xl mx-auto">
        <Card className="p-12 text-center">
          <p className="text-gray-600 mb-4">Facture introuvable</p>
          <Button onClick={() => router.push('/owner/invoicing/invoices')}>
            Retour à la liste
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/owner/invoicing/invoices')}>
            <ArrowLeftIcon className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold mb-2">{invoice.invoice_number}</h1>
            <p className="text-muted-foreground">Détails de la facture</p>
          </div>
        </div>
        <div className="flex gap-2">
          {invoice.status === 'draft' && (
            <>
              <Link href={`/owner/invoicing/invoices/${invoice.id}/edit`}>
                <Button variant="outline">
                  <PencilIcon className="w-4 h-4 mr-2" />
                  Modifier
                </Button>
              </Link>
              <Link href={`/owner/invoicing/invoices/${invoice.id}/send`}>
                <Button>
                  <PaperAirplaneIcon className="w-4 h-4 mr-2" />
                  Envoyer
                </Button>
              </Link>
            </>
          )}
          {(invoice.status === 'draft' || invoice.status === 'sent') && (
            <Button
              variant="destructive"
              onClick={handleCancelInvoice}
              disabled={actionLoading}
            >
              <XCircleIcon className="w-4 h-4 mr-2" />
              Annuler
            </Button>
          )}
          {invoice.invoice_pdf_url && (
            <a href={invoice.invoice_pdf_url} target="_blank" rel="noopener noreferrer">
              <Button variant="outline">
                <DocumentTextIcon className="w-4 h-4 mr-2" />
                PDF
              </Button>
            </a>
          )}
        </div>
      </div>

      {/* Informations générales */}
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Informations générales</h2>
          {getStatusBadge(invoice.status)}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-gray-500 mb-1">Famille</p>
            <p className="font-medium">{(invoice as any).family?.family_name || 'N/A'}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500 mb-1">Date émission</p>
            <p className="font-medium">
              {new Date(invoice.invoice_date).toLocaleDateString('fr-FR')}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500 mb-1">Date d'échéance</p>
            <p className="font-medium">
              {new Date(invoice.due_date).toLocaleDateString('fr-FR')}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500 mb-1">Période</p>
            <p className="font-medium">
              {new Date(invoice.billing_period_start).toLocaleDateString('fr-FR', {
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>

        {invoice.notes && (
          <div className="mt-6 pt-6 border-t">
            <p className="text-sm text-gray-500 mb-1">Notes</p>
            <p className="text-sm">{invoice.notes}</p>
          </div>
        )}
      </Card>

      {/* Lignes de facture */}
      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Lignes de facturation</h2>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b">
              <tr className="text-left text-sm text-gray-500">
                <th className="pb-3">Description</th>
                <th className="pb-3 text-center">Quantité</th>
                <th className="pb-3 text-right">Prix unitaire</th>
                <th className="pb-3 text-right">TVA</th>
                <th className="pb-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {lines.map((line) => (
                <tr key={line.id} className="text-sm">
                  <td className="py-3">
                    <p className="font-medium">{line.description}</p>
                    <p className="text-xs text-gray-500">
                      {getLineTypeLabel(line.item_type)}
                    </p>
                  </td>
                  <td className="py-3 text-center">
                    {line.quantity} {line.unit}
                  </td>
                  <td className="py-3 text-right">
                    {line.unit_price.toLocaleString('fr-FR', {
                      style: 'currency',
                      currency: 'EUR',
                    })}
                  </td>
                  <td className="py-3 text-right">{line.tax_rate}%</td>
                  <td className="py-3 text-right font-medium">
                    {line.total.toLocaleString('fr-FR', {
                      style: 'currency',
                      currency: 'EUR',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totaux */}
        <div className="mt-6 pt-6 border-t space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Sous-total HT</span>
            <span className="font-medium">
              {invoice.subtotal_amount.toLocaleString('fr-FR', {
                style: 'currency',
                currency: 'EUR',
              })}
            </span>
          </div>

          {invoice.discount_amount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Remise</span>
              <span>
                -{invoice.discount_amount.toLocaleString('fr-FR', {
                  style: 'currency',
                  currency: 'EUR',
                })}
              </span>
            </div>
          )}

          <div className="flex justify-between text-sm">
            <span className="text-gray-600">TVA</span>
            <span className="font-medium">
              {invoice.tax_amount.toLocaleString('fr-FR', {
                style: 'currency',
                currency: 'EUR',
              })}
            </span>
          </div>

          {invoice.caf_participation && invoice.caf_participation > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Part CAF</span>
              <span className="font-medium text-blue-600">
                {invoice.caf_participation.toLocaleString('fr-FR', {
                  style: 'currency',
                  currency: 'EUR',
                })}
              </span>
            </div>
          )}

          <div className="flex justify-between text-lg font-bold pt-2 border-t">
            <span>Total TTC</span>
            <span>
              {invoice.total_amount.toLocaleString('fr-FR', {
                style: 'currency',
                currency: 'EUR',
              })}
            </span>
          </div>
        </div>
      </Card>

      {/* Paiements */}
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Paiements</h2>
          <Link href={`/owner/invoicing/payments/new?invoice=${invoice.id}`}>
            <Button size="sm">
              <CheckCircleIcon className="w-4 h-4 mr-2" />
              Enregistrer paiement
            </Button>
          </Link>
        </div>

        {payments.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">
            Aucun paiement enregistré
          </p>
        ) : (
          <div className="space-y-3">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium">
                    {payment.amount.toLocaleString('fr-FR', {
                      style: 'currency',
                      currency: 'EUR',
                    })}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(payment.payment_date).toLocaleDateString('fr-FR')}
                    {payment.transaction_reference && (
                      <> · Réf: {payment.transaction_reference}</>
                    )}
                  </p>
                </div>
                <Badge
                  variant={
                    payment.status === 'validated'
                      ? 'success'
                      : payment.status === 'rejected'
                      ? 'destructive'
                      : 'default'
                  }
                >
                  {payment.status === 'validated'
                    ? 'Validé'
                    : payment.status === 'rejected'
                    ? 'Rejeté'
                    : 'En attente'}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {/* Résumé paiements */}
        <div className="mt-6 pt-6 border-t grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-sm text-gray-500 mb-1">Total facture</p>
            <p className="text-lg font-bold">
              {invoice.total_amount.toLocaleString('fr-FR', {
                style: 'currency',
                currency: 'EUR',
              })}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Payé</p>
            <p className="text-lg font-bold text-green-600">
              {invoice.paid_amount.toLocaleString('fr-FR', {
                style: 'currency',
                currency: 'EUR',
              })}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Reste à payer</p>
            <p className="text-lg font-bold text-orange-600">
              {invoice.remaining_amount.toLocaleString('fr-FR', {
                style: 'currency',
                currency: 'EUR',
              })}
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
