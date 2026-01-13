'use client'

import { useEffect, useState } from 'react'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeftIcon, PaperAirplaneIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { invoicingService, type Invoice } from '@/lib/services/invoicing.service'

export default function InvoiceSendPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const params = useParams()
  const router = useRouter()
  const invoiceId = params.id as string

  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  // Form state
  const [emailTo, setEmailTo] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')

  useEffect(() => {
    if (invoiceId) {
      loadInvoiceData()
    }
  }, [invoiceId])

  const loadInvoiceData = async () => {
    try {
      setIsLoading(true)
      const data = await invoicingService.getById(invoiceId)
      
      if (data.status !== 'draft') {
        alert('Cette facture a déjà été envoyée')
        router.push(`/owner/invoicing/invoices/${invoiceId}`)
        return
      }

      setInvoice(data)
      
      // Pre-fill email fields
      const familyEmail = (data as any).family?.contact_email || ''
      setEmailTo(familyEmail)
      setEmailSubject(`Facture ${data.invoice_number} - ${(data as any).nursery?.name || 'Crèche'}`)
      setEmailBody(`Bonjour,

Veuillez trouver ci-joint votre facture pour la période du ${new Date(data.billing_period_start).toLocaleDateString('fr-FR')} au ${new Date(data.billing_period_end).toLocaleDateString('fr-FR')}.

Montant: ${data.total_amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
Date d'échéance: ${new Date(data.due_date).toLocaleDateString('fr-FR')}

Cordialement,
L'équipe de la crèche`)
    } catch (error) {
      console.error('Error loading invoice:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSend = async () => {
    if (!emailTo) {
      alert('Veuillez saisir une adresse email')
      return
    }

    if (!session?.user?.id) {
      alert('Session expirée')
      return
    }

    try {
      setIsSending(true)

      // Mark invoice as sent (PDF generation TODO for later)
      await invoicingService.send(invoiceId, session.user.id)

      setEmailSent(true)

      setTimeout(() => {
        router.push(`/owner/invoicing/invoices/${invoiceId}`)
      }, 2000)
    } catch (error) {
      console.error('Error sending invoice:', error)
      alert('Erreur lors de l\'envoi de la facture')
    } finally {
      setIsSending(false)
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
      <div className="max-w-3xl mx-auto">
        <Card className="p-12 text-center">
          <p className="text-gray-600 mb-4">Facture introuvable</p>
          <Button onClick={() => router.push('/owner/invoicing/invoices')}>
            Retour à la liste
          </Button>
        </Card>
      </div>
    )
  }

  if (emailSent) {
    return (
      <div className="max-w-3xl mx-auto">
        <Card className="p-12 text-center">
          <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Facture envoyée !</h2>
          <p className="text-gray-600 mb-6">
            La facture a été envoyée avec succès à {emailTo}
          </p>
          <p className="text-sm text-gray-500">Redirection...</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push(`/owner/invoicing/invoices/${invoiceId}`)}>
            <ArrowLeftIcon className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold mb-2">Envoyer {invoice.invoice_number}</h1>
            <p className="text-muted-foreground">Envoi par email</p>
          </div>
        </div>
      </div>

      {/* Résumé facture */}
      <Card className="p-6 mb-6 bg-primary-50">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Famille</p>
            <p className="font-medium">{(invoice as any).family?.family_name || 'N/A'}</p>
          </div>
          <div>
            <p className="text-gray-600">Montant</p>
            <p className="font-bold text-lg">
              {invoice.total_amount.toLocaleString('fr-FR', {
                style: 'currency',
                currency: 'EUR',
              })}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Période</p>
            <p className="font-medium">
              {new Date(invoice.billing_period_start).toLocaleDateString('fr-FR', {
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Date d'échéance</p>
            <p className="font-medium">
              {new Date(invoice.due_date).toLocaleDateString('fr-FR')}
            </p>
          </div>
        </div>
      </Card>

      {/* Email form */}
      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Email</h2>

        <div className="space-y-4">
          <div>
            <Label>Destinataire *</Label>
            <Input
              type="email"
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
              placeholder="email@exemple.fr"
              required
            />
          </div>

          <div>
            <Label>Objet</Label>
            <Input
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              placeholder="Objet de l'email"
            />
          </div>

          <div>
            <Label>Message</Label>
            <Textarea
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              placeholder="Contenu de l'email..."
              rows={10}
            />
            <p className="text-xs text-gray-500 mt-1">
              La facture PDF sera automatiquement jointe en pièce jointe
            </p>
          </div>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={() => router.push(`/owner/invoicing/invoices/${invoiceId}`)}
        >
          Annuler
        </Button>
        <Button onClick={handleSend} disabled={isSending || !emailTo}>
          <PaperAirplaneIcon className="w-4 h-4 mr-2" />
          {isSending ? 'Envoi en cours...' : 'Envoyer la facture'}
        </Button>
      </div>
    </div>
  )
}
