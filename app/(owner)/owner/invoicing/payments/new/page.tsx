'use client'

import { useEffect, useState } from 'react'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { paymentService, type CreatePaymentInput } from '@/lib/services/payment.service'
import { invoicingService, type Invoice } from '@/lib/services/invoicing.service'

export default function NewPaymentPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const { selectedNursery } = useNursery()
  const router = useRouter()
  const searchParams = useSearchParams()
  const invoiceIdParam = searchParams.get('invoice')

  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Form state
  const [invoiceId, setInvoiceId] = useState(invoiceIdParam || '')
  const [amount, setAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentMethodType, setPaymentMethodType] = useState<string>('bank_transfer')
  const [transactionReference, setTransactionReference] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (selectedNursery?.id) {
      loadInvoices()
    }
  }, [selectedNursery?.id])

  useEffect(() => {
    if (invoiceId) {
      const invoice = invoices.find((inv) => inv.id === invoiceId)
      if (invoice) {
        setSelectedInvoice(invoice)
        setAmount(invoice.remaining_amount.toString())
      }
    }
  }, [invoiceId, invoices])

  const loadInvoices = async () => {
    if (!selectedNursery?.id) return

    try {
      setIsLoading(true)
      const data = await invoicingService.getByNursery(selectedNursery.id)
      // Filter for unpaid invoices
      const filtered = data.filter(inv =>
        ['sent', 'partially_paid', 'overdue'].includes(inv.status)
      )
      setInvoices(filtered)
    } catch (error) {
      console.error('Error loading invoices:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!invoiceId || !amount || !paymentDate) {
      alert('Veuillez remplir tous les champs obligatoires')
      return
    }

    if (!selectedNursery?.id || !session?.user?.id) {
      alert('Données manquantes')
      return
    }

    try {
      setIsSaving(true)

      const paymentData: CreatePaymentInput = {
        nursery_id: selectedNursery.id,
        family_id: (selectedInvoice as any)?.family_id,
        invoice_id: invoiceId,
        payment_date: paymentDate,
        amount: parseFloat(amount),
        transaction_reference: transactionReference || undefined,
        notes: notes || undefined,
        created_by_id: session.user.id,
      }

      await paymentService.create(paymentData)

      router.push(`/owner/invoicing/invoices/${invoiceId}`)
    } catch (error) {
      console.error('Error recording payment:', error)
      alert('Erreur lors de l\'enregistrement du paiement')
    } finally {
      setIsSaving(false)
    }
  }

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeftIcon className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold mb-2">Enregistrer un paiement</h1>
          <p className="text-muted-foreground">Saisir les informations du paiement reçu</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="p-6 mb-6">
          <div className="space-y-4">
            {/* Facture */}
            <div>
              <Label>Facture *</Label>
              <Select value={invoiceId} onValueChange={setInvoiceId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une facture" />
                </SelectTrigger>
                <SelectContent>
                  {invoices.map((invoice) => (
                    <SelectItem key={invoice.id} value={invoice.id}>
                      {invoice.invoice_number} - {(invoice as any).family?.family_name} -{' '}
                      {invoice.remaining_amount.toLocaleString('fr-FR', {
                        style: 'currency',
                        currency: 'EUR',
                      })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedInvoice && (
                <p className="text-sm text-gray-500 mt-1">
                  Reste à payer:{' '}
                  {selectedInvoice.remaining_amount.toLocaleString('fr-FR', {
                    style: 'currency',
                    currency: 'EUR',
                  })}
                </p>
              )}
            </div>

            {/* Montant */}
            <div>
              <Label>Montant (€) *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>

            {/* Date */}
            <div>
              <Label>Date de paiement *</Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
              />
            </div>

            {/* Moyen de paiement */}
            <div>
              <Label>Moyen de paiement *</Label>
              <Select value={paymentMethodType} onValueChange={setPaymentMethodType} required>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Virement bancaire</SelectItem>
                  <SelectItem value="direct_debit">Prélèvement</SelectItem>
                  <SelectItem value="check">Chèque</SelectItem>
                  <SelectItem value="cash">Espèces</SelectItem>
                  <SelectItem value="credit_card">Carte bancaire</SelectItem>
                  <SelectItem value="stripe">Stripe</SelectItem>
                  <SelectItem value="paypal">PayPal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Référence */}
            <div>
              <Label>Référence transaction</Label>
              <Input
                value={transactionReference}
                onChange={(e) => setTransactionReference(e.target.value)}
                placeholder="N° de transaction, chèque, etc."
              />
            </div>

            {/* Notes */}
            <div>
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Informations complémentaires..."
                rows={3}
              />
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Annuler
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Enregistrement...' : 'Enregistrer le paiement'}
          </Button>
        </div>
      </form>
    </div>
  )
}
