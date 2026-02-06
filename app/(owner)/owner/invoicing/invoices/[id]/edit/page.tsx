'use client'

import { useEffect, useState } from 'react'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeftIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { invoicingService, type Invoice, type InvoiceLine, type AddInvoiceLineInput } from '@/lib/services/invoicing.service'

export default function InvoiceEditPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const params = useParams()
  const router = useRouter()
  const invoiceId = params.id as string

  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [lines, setLines] = useState<InvoiceLine[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Form state
  const [notes, setNotes] = useState('')
  const [discountAmount, setDiscountAmount] = useState('0')

  useEffect(() => {
    if (invoiceId) {
      loadInvoiceData()
    }
  }, [invoiceId])

  const loadInvoiceData = async () => {
    try {
      setIsLoading(true)
      const invoiceData = await invoicingService.getById(invoiceId)

      if (invoiceData.status !== 'draft') {
        alert('Seules les factures en brouillon peuvent être modifiées')
        router.push(`/owner/invoicing/invoices/${invoiceId}`)
        return
      }

      setInvoice(invoiceData)
      setLines(invoiceData.lines || [])
      setNotes(invoiceData.notes || '')
      setDiscountAmount(invoiceData.discount_amount.toString())
    } catch (error) {
      console.error('Error loading invoice:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateLine = (index: number, field: keyof InvoiceLine, value: any) => {
    const updated = [...lines]
    updated[index] = { ...updated[index], [field]: value }

    // Recalculate totals
    if (field === 'quantity' || field === 'unit_price') {
      const line = updated[index]
      const subtotal = line.quantity * line.unit_price
      const taxAmount = subtotal * (line.tax_rate / 100)
      updated[index].subtotal = subtotal
      updated[index].tax_amount = taxAmount
      updated[index].total = subtotal + taxAmount
    }

    setLines(updated)
  }

  const handleAddLine = () => {
    const newLine: InvoiceLine = {
      id: `temp-${Date.now()}`,
      invoice_id: invoiceId,
      line_number: lines.length + 1,
      item_type: 'childcare',
      description: '',
      quantity: 1,
      unit: 'hour',
      unit_price: 0,
      subtotal: 0,
      tax_rate: 0,
      tax_amount: 0,
      total: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    setLines([...lines, newLine])
  }

  const handleDeleteLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    if (!invoice) return

    try {
      setIsSaving(true)

      // Update invoice
      await invoicingService.update(invoiceId, {
        notes,
        discount_amount: parseFloat(discountAmount) || 0,
      })

      // Delete all old lines and create new ones
      const currentInvoice = await invoicingService.getById(invoiceId)
      for (const line of currentInvoice.lines) {
        await invoicingService.deleteLine(line.id)
      }

      for (const line of lines) {
        const lineInput: AddInvoiceLineInput = {
          item_type: line.item_type,
          description: line.description,
          quantity: line.quantity,
          unit: line.unit,
          unit_price: line.unit_price,
          tax_rate: line.tax_rate,
        }
        await invoicingService.addLine(invoiceId, lineInput)
      }

      router.push(`/owner/invoicing/invoices/${invoiceId}`)
    } catch (error) {
      console.error('Error saving invoice:', error)
      alert('Erreur lors de la sauvegarde de la facture')
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

  const subtotal = lines.reduce((sum, line) => sum + line.subtotal, 0)
  const taxTotal = lines.reduce((sum, line) => sum + line.tax_amount, 0)
  const discount = parseFloat(discountAmount) || 0
  const total = subtotal + taxTotal - discount

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push(`/owner/invoicing/invoices/${invoiceId}`)}>
            <ArrowLeftIcon className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold mb-2">Modifier {invoice.invoice_number}</h1>
            <p className="text-muted-foreground">Édition de la facture brouillon</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push(`/owner/invoicing/invoices/${invoiceId}`)}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </div>

      {/* Lignes de facture */}
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Lignes de facturation</h2>
          <Button size="sm" onClick={handleAddLine}>
            <PlusIcon className="w-4 h-4 mr-2" />
            Ajouter ligne
          </Button>
        </div>

        <div className="space-y-4">
          {lines.map((line, index) => (
            <div key={line.id} className="p-4 border rounded-lg space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Type</Label>
                  <Select
                    value={line.item_type}
                    onValueChange={(value) => handleUpdateLine(index, 'item_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="childcare">Garde d'enfant</SelectItem>
                      <SelectItem value="meal">Repas</SelectItem>
                      <SelectItem value="extra_hours">Heures supplémentaires</SelectItem>
                      <SelectItem value="supply_fee">Fournitures</SelectItem>
                      <SelectItem value="late_pickup">Retard récupération</SelectItem>
                      <SelectItem value="penalty">Pénalité</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Description</Label>
                  <Input
                    value={line.description}
                    onChange={(e) => handleUpdateLine(index, 'description', e.target.value)}
                    placeholder="Description de la ligne"
                  />
                </div>

                <div>
                  <Label>Quantité</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.quantity}
                    onChange={(e) => handleUpdateLine(index, 'quantity', parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div>
                  <Label>Unité</Label>
                  <Select
                    value={line.unit}
                    onValueChange={(value) => handleUpdateLine(index, 'unit', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hour">Heure</SelectItem>
                      <SelectItem value="day">Jour</SelectItem>
                      <SelectItem value="month">Mois</SelectItem>
                      <SelectItem value="meal">Repas</SelectItem>
                      <SelectItem value="unit">Unité</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Prix unitaire (€)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.unit_price}
                    onChange={(e) => handleUpdateLine(index, 'unit_price', parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div>
                  <Label>Taux TVA (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.tax_rate}
                    onChange={(e) => handleUpdateLine(index, 'tax_rate', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t">
                <div className="text-sm">
                  <span className="text-gray-500">Total ligne: </span>
                  <span className="font-bold">
                    {line.total.toLocaleString('fr-FR', {
                      style: 'currency',
                      currency: 'EUR',
                    })}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteLine(index)}
                >
                  <TrashIcon className="w-4 h-4 mr-2" />
                  Supprimer
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Options */}
      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Options</h2>

        <div className="space-y-4">
          <div>
            <Label>Remise (€)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={discountAmount}
              onChange={(e) => setDiscountAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes ou informations complémentaires..."
              rows={4}
            />
          </div>
        </div>
      </Card>

      {/* Résumé */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Résumé</h2>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Sous-total HT</span>
            <span className="font-medium">
              {subtotal.toLocaleString('fr-FR', {
                style: 'currency',
                currency: 'EUR',
              })}
            </span>
          </div>

          {discount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Remise</span>
              <span>
                -{discount.toLocaleString('fr-FR', {
                  style: 'currency',
                  currency: 'EUR',
                })}
              </span>
            </div>
          )}

          <div className="flex justify-between text-sm">
            <span className="text-gray-600">TVA</span>
            <span className="font-medium">
              {taxTotal.toLocaleString('fr-FR', {
                style: 'currency',
                currency: 'EUR',
              })}
            </span>
          </div>

          <div className="flex justify-between text-lg font-bold pt-2 border-t">
            <span>Total TTC</span>
            <span>
              {total.toLocaleString('fr-FR', {
                style: 'currency',
                currency: 'EUR',
              })}
            </span>
          </div>
        </div>
      </Card>
    </div>
  )
}
