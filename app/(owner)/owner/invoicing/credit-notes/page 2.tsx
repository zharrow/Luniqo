'use client'

import { useEffect, useState } from 'react'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
import { useRouter } from 'next/navigation'
import { PlusIcon, EyeIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { creditNoteService, type CreditNote } from '@/lib/services/credit-note.service'
import Link from 'next/link'

export default function CreditNotesPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const { selectedNursery, isLoading: nurseryLoading } = useNursery()
  const router = useRouter()

  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (selectedNursery?.id) {
      loadCreditNotes()
    }
  }, [selectedNursery?.id])

  const loadCreditNotes = async () => {
    if (!selectedNursery?.id) return

    try {
      setIsLoading(true)
      const data = await creditNoteService.getByNursery(selectedNursery.id)
      setCreditNotes(data)
    } catch (error) {
      console.error('Error loading credit notes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getReasonLabel = (reason: CreditNote['reason']) => {
    const labels: Record<CreditNote['reason'], string> = {
      overpayment: 'Trop-perçu',
      error: 'Erreur de facturation',
      absence_refund: 'Remboursement absence',
      contract_cancellation: 'Annulation contrat',
      goodwill: 'Geste commercial',
      other: 'Autre',
    }
    return labels[reason] || reason
  }

  const getStatusBadge = (status: CreditNote['status']) => {
    const config: Record<CreditNote['status'], { label: string; variant: any }> = {
      draft: { label: 'Brouillon', variant: 'secondary' },
      issued: { label: 'Émis', variant: 'default' },
      applied: { label: 'Appliqué', variant: 'success' },
      refunded: { label: 'Remboursé', variant: 'success' },
      cancelled: { label: 'Annulé', variant: 'secondary' },
    }
    const { label, variant } = config[status]
    return <Badge variant={variant}>{label}</Badge>
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
          <h1 className="text-3xl font-bold mb-2">Avoirs</h1>
          <p className="text-muted-foreground">
            Gérez les avoirs et remboursements
          </p>
        </div>
        <Link href="/owner/invoicing/credit-notes/new">
          <Button>
            <PlusIcon className="w-4 h-4 mr-2" />
            Créer un avoir
          </Button>
        </Link>
      </div>

      {/* Liste */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : creditNotes.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-gray-600 mb-2">Aucun avoir trouvé</p>
          <p className="text-sm text-gray-500 mb-4">
            Les avoirs permettent de corriger des erreurs ou d'effectuer des remboursements
          </p>
          <Link href="/owner/invoicing/credit-notes/new">
            <Button>
              <PlusIcon className="w-4 h-4 mr-2" />
              Créer un avoir
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {creditNotes.map((creditNote) => (
            <Card key={creditNote.id} className="p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                {/* Informations */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">
                      {creditNote.credit_note_number}
                    </h3>
                    {getStatusBadge(creditNote.status)}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Facture</p>
                      <p className="font-medium">
                        {(creditNote as any).invoice?.invoice_number || 'N/A'}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500">Raison</p>
                      <p className="font-medium">{getReasonLabel(creditNote.reason)}</p>
                    </div>

                    <div>
                      <p className="text-gray-500">Date d'émission</p>
                      <p className="font-medium">
                        {creditNote.issued_at
                          ? new Date(creditNote.issued_at).toLocaleDateString('fr-FR')
                          : 'N/A'}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500">Montant</p>
                      <p className="font-bold text-lg text-green-600">
                        {creditNote.amount.toLocaleString('fr-FR', {
                          style: 'currency',
                          currency: 'EUR',
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="ml-6">
                  <Button variant="outline" size="sm">
                    <EyeIcon className="w-4 h-4 mr-2" />
                    Voir
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
