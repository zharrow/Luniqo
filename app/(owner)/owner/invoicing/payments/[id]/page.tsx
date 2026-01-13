'use client'

import { useEffect, useState } from 'react'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeftIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { paymentService, type Payment } from '@/lib/services/payment.service'
import { invoicingService, type Invoice } from '@/lib/services/invoicing.service'
import Link from 'next/link'

export default function PaymentDetailPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const params = useParams()
  const router = useRouter()
  const paymentId = params.id as string

  const [payment, setPayment] = useState<Payment | null>(null)
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (paymentId) {
      loadPaymentData()
    }
  }, [paymentId])

  const loadPaymentData = async () => {
    try {
      setIsLoading(true)
      const paymentData = await paymentService.getById(paymentId)
      setPayment(paymentData)

      if (paymentData.invoice_id) {
        const invoiceData = await invoicingService.getById(paymentData.invoice_id)
        setInvoice(invoiceData)
      }
    } catch (error) {
      console.error('Error loading payment:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleValidate = async () => {
    if (!session?.user?.id) return

    try {
      setActionLoading(true)
      await paymentService.validate(paymentId, session.user.id)
      await loadPaymentData()
    } catch (error) {
      console.error('Error validating payment:', error)
      alert('Erreur lors de la validation du paiement')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    const reason = prompt('Raison du rejet:')
    if (!reason) return

    if (!session?.user?.id) return

    try {
      setActionLoading(true)
      await paymentService.reject(paymentId, session.user.id, reason)
      await loadPaymentData()
    } catch (error) {
      console.error('Error rejecting payment:', error)
      alert('Erreur lors du rejet du paiement')
    } finally {
      setActionLoading(false)
    }
  }

  const getMethodLabel = (type: string | undefined) => {
    if (!type) return 'Non spécifié'
    const labels: Record<string, string> = {
      bank_transfer: 'Virement bancaire',
      direct_debit: 'Prélèvement',
      check: 'Chèque',
      cash: 'Espèces',
      credit_card: 'Carte bancaire',
      stripe: 'Stripe',
      paypal: 'PayPal',
    }
    return labels[type] || type
  }

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!payment) {
    return (
      <div className="max-w-3xl mx-auto">
        <Card className="p-12 text-center">
          <p className="text-gray-600 mb-4">Paiement introuvable</p>
          <Button onClick={() => router.push('/owner/invoicing/payments')}>
            Retour à la liste
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/owner/invoicing/payments')}>
            <ArrowLeftIcon className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold mb-2">Paiement #{payment.payment_number}</h1>
            <p className="text-muted-foreground">Détails du paiement</p>
          </div>
        </div>
        <div className="flex gap-2">
          {payment.status === 'received' && (
            <>
              <Button variant="outline" onClick={handleReject} disabled={actionLoading}>
                <XCircleIcon className="w-4 h-4 mr-2" />
                Rejeter
              </Button>
              <Button onClick={handleValidate} disabled={actionLoading}>
                <CheckCircleIcon className="w-4 h-4 mr-2" />
                Valider
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Informations générales */}
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Informations générales</h2>
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
              : payment.status === 'refunded'
              ? 'Remboursé'
              : 'En attente'}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-500 mb-1">Facture</p>
            {invoice ? (
              <Link
                href={`/owner/invoicing/invoices/${invoice.id}`}
                className="font-medium text-primary-600 hover:underline"
              >
                {invoice.invoice_number}
              </Link>
            ) : (
              <p className="font-medium">N/A</p>
            )}
          </div>

          <div>
            <p className="text-sm text-gray-500 mb-1">Montant</p>
            <p className="font-bold text-lg">
              {payment.amount.toLocaleString('fr-FR', {
                style: 'currency',
                currency: 'EUR',
              })}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500 mb-1">Date de paiement</p>
            <p className="font-medium">
              {new Date(payment.payment_date).toLocaleDateString('fr-FR')}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500 mb-1">Moyen de paiement</p>
            <p className="font-medium">{getMethodLabel(undefined)}</p>
          </div>

          {payment.transaction_reference && (
            <div>
              <p className="text-sm text-gray-500 mb-1">Référence transaction</p>
              <p className="font-medium">{payment.transaction_reference}</p>
            </div>
          )}

          {payment.bank_reference && (
            <div>
              <p className="text-sm text-gray-500 mb-1">Référence bancaire</p>
              <p className="font-medium">{payment.bank_reference}</p>
            </div>
          )}
        </div>

        {payment.notes && (
          <div className="mt-6 pt-6 border-t">
            <p className="text-sm text-gray-500 mb-1">Notes</p>
            <p className="text-sm">{payment.notes}</p>
          </div>
        )}
      </Card>

      {/* Validation */}
      {(payment.validated_by_id || payment.validated_at) && (
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Validation</h2>
          <div className="grid grid-cols-2 gap-4">
            {payment.validated_at && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Date de validation</p>
                <p className="font-medium">
                  {new Date(payment.validated_at).toLocaleDateString('fr-FR')}
                </p>
              </div>
            )}
            {payment.validated_by_id && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Validé par</p>
                <p className="font-medium">{(payment as any).validated_by?.first_name} {(payment as any).validated_by?.last_name}</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Facture associée */}
      {invoice && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Facture associée</h2>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="font-semibold mb-2">{invoice.invoice_number}</p>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Total</p>
                    <p className="font-medium">
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
                  <div>
                    <p className="text-gray-500">Reste</p>
                    <p className="font-medium text-orange-600">
                      {invoice.remaining_amount.toLocaleString('fr-FR', {
                        style: 'currency',
                        currency: 'EUR',
                      })}
                    </p>
                  </div>
                </div>
              </div>
              <Link href={`/owner/invoicing/invoices/${invoice.id}`}>
                <Button size="sm" variant="outline">
                  Voir facture
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
