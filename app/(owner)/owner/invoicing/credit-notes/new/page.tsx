'use client'

import { useEffect, useState } from 'react'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { creditNoteService, type CreateCreditNoteInput } from '@/lib/services/credit-note.service'
import { invoicingService, type Invoice } from '@/lib/services/invoicing.service'

export default function NewCreditNotePage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const { selectedNursery } = useNursery()
  const router = useRouter()

  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Form state
  const [invoiceId, setInvoiceId] = useState('')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState<string>('error')
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (selectedNursery?.id) {
      loadInvoices()
    }
  }, [selectedNursery?.id])

  useEffect(() => {
    if (invoiceId) {
      const invoice = invoices.find((inv) => inv.id === invoiceId)
      setSelectedInvoice(invoice || null)
    }
  }, [invoiceId, invoices])

  const loadInvoices = async () => {
    if (!selectedNursery?.id) return

    try {
      setIsLoading(true)
      const data = await invoicingService.getByNursery(selectedNursery.id)
      // Filter for invoices that can have credit notes
      const filtered = data.filter(inv =>
        ['sent', 'paid', 'partially_paid', 'overdue'].includes(inv.status)
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

    if (!invoiceId || !amount || !reason) {
      alert('Veuillez remplir tous les champs obligatoires')
      return
    }

    const amountNum = parseFloat(amount)
    if (selectedInvoice && amountNum > selectedInvoice.total_amount) {
      alert('Le montant de l\'avoir ne peut pas dépasser le montant de la facture')
      return
    }

    try {
      setIsSaving(true)

      if (!selectedNursery?.id || !selectedInvoice || !session) {
        alert('Données manquantes')
        return
      }

      const creditNoteData: CreateCreditNoteInput = {
        nursery_id: selectedNursery.id,
        family_id: (selectedInvoice as any).family_id,
        invoice_id: invoiceId,
        credit_note_date: new Date().toISOString().split('T')[0],
        amount: amountNum,
        reason: reason as any,
        reason_description: description || undefined,
        created_by_id: session?.user?.id,
      }

      await creditNoteService.create(creditNoteData)

      router.push('/owner/invoicing/credit-notes')
    } catch (error) {
      console.error('Error creating credit note:', error)
      alert('Erreur lors de la création de l\'avoir')
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
        <Button variant="ghost" onClick={() => router.push('/owner/invoicing/credit-notes')}>
          <ArrowLeftIcon className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold mb-2">Créer un avoir</h1>
          <p className="text-muted-foreground">Émettre un avoir pour une facture</p>
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
                      {invoice.total_amount.toLocaleString('fr-FR', {
                        style: 'currency',
                        currency: 'EUR',
                      })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedInvoice && (
                <p className="text-sm text-gray-500 mt-1">
                  Montant facture:{' '}
                  {selectedInvoice.total_amount.toLocaleString('fr-FR', {
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

            {/* Raison */}
            <div>
              <Label>Raison *</Label>
              <Select value={reason} onValueChange={setReason} required>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="overpayment">Trop-perçu</SelectItem>
                  <SelectItem value="error">Erreur de facturation</SelectItem>
                  <SelectItem value="absence_refund">Remboursement absence</SelectItem>
                  <SelectItem value="contract_cancellation">Annulation contrat</SelectItem>
                  <SelectItem value="goodwill">Geste commercial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div>
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Détails de l'avoir..."
                rows={4}
              />
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/owner/invoicing/credit-notes')}
          >
            Annuler
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Création...' : 'Créer l\'avoir'}
          </Button>
        </div>
      </form>
    </div>
  )
}
