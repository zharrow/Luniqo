'use client'

import { useEffect, useState } from 'react'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
import { useRouter } from 'next/navigation'
import {
  ExclamationTriangleIcon,
  ClockIcon,
  PhoneIcon,
  EnvelopeIcon,
  EyeIcon,
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { invoicingService, type Invoice } from '@/lib/services/invoicing.service'
import { debtCollectionService } from '@/lib/services/debt-collection.service'
import Link from 'next/link'

export default function OverdueInvoicesPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const { selectedNursery, isLoading: nurseryLoading } = useNursery()
  const router = useRouter()

  const [overdueInvoices, setOverdueInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (selectedNursery?.id) {
      loadOverdueInvoices()
    }
  }, [selectedNursery?.id])

  const loadOverdueInvoices = async () => {
    if (!selectedNursery?.id) return

    try {
      setIsLoading(true)
      const data = await invoicingService.getOverdueInvoices(selectedNursery.id)
      setOverdueInvoices(data)
    } catch (error) {
      console.error('Error loading overdue invoices:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const calculateDaysOverdue = (dueDate: string): number => {
    const today = new Date()
    const due = new Date(dueDate)
    const diffTime = today.getTime() - due.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(0, diffDays)
  }

  const getSeverityBadge = (daysOverdue: number) => {
    if (daysOverdue <= 7) {
      return <Badge variant="warning">Nouveau retard</Badge>
    } else if (daysOverdue <= 15) {
      return <Badge variant="warning">1ère relance</Badge>
    } else if (daysOverdue <= 30) {
      return <Badge variant="destructive">2e relance</Badge>
    } else {
      return <Badge variant="destructive">Action urgente</Badge>
    }
  }

  const handleSendReminder = async (invoiceId: string, daysOverdue: number) => {
    if (!session?.user?.id) return

    // Détermine le type de relance selon les jours de retard
    let reminderType: 'first_reminder' | 'second_reminder' | 'final_notice' | 'legal_action'

    if (daysOverdue <= 15) {
      reminderType = 'first_reminder'
    } else if (daysOverdue <= 30) {
      reminderType = 'second_reminder'
    } else if (daysOverdue <= 45) {
      reminderType = 'final_notice'
    } else {
      reminderType = 'legal_action'
    }

    const confirmed = confirm(
      `Envoyer une relance "${reminderType === 'first_reminder' ? '1ère relance' : reminderType === 'second_reminder' ? '2e relance' : reminderType === 'final_notice' ? 'Mise en demeure' : 'Action légale'}" pour cette facture ?`
    )

    if (!confirmed) return

    try {
      await debtCollectionService.create({
        invoice_id: invoiceId,
        reminder_type: reminderType,
        reminder_method: 'email',
        created_by_id: session.user.id,
      })

      alert('Relance créée avec succès')
      await loadOverdueInvoices()
    } catch (error) {
      console.error('Error creating reminder:', error)
      alert('Erreur lors de la création de la relance')
    }
  }

  const totalOverdueAmount = overdueInvoices.reduce((sum, inv) => sum + inv.remaining_amount, 0)

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
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-orange-100">
            <ExclamationTriangleIcon className="w-6 h-6 text-orange-600" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Factures impayées</h1>
            <p className="text-sm text-muted-foreground">
              Gérez les factures en retard de paiement
            </p>
          </div>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 bg-orange-50 border-orange-200">
          <p className="text-sm text-gray-600 mb-1">Total impayé</p>
          <p className="text-2xl font-bold text-orange-600">
            {totalOverdueAmount.toLocaleString('fr-FR', {
              style: 'currency',
              currency: 'EUR',
            })}
          </p>
        </Card>

        <Card className="p-4 bg-red-50 border-red-200">
          <p className="text-sm text-gray-600 mb-1">Factures en retard</p>
          <p className="text-2xl font-bold text-red-600">
            {overdueInvoices.length}
          </p>
        </Card>

        <Card className="p-4 bg-yellow-50 border-yellow-200">
          <p className="text-sm text-gray-600 mb-1">Retard moyen</p>
          <p className="text-2xl font-bold text-yellow-600">
            {overdueInvoices.length > 0
              ? Math.round(
                  overdueInvoices.reduce(
                    (sum, inv) => sum + calculateDaysOverdue(inv.due_date),
                    0
                  ) / overdueInvoices.length
                )
              : 0}{' '}
            jours
          </p>
        </Card>

        <Card className="p-4 bg-purple-50 border-purple-200">
          <p className="text-sm text-gray-600 mb-1">Action urgente</p>
          <p className="text-2xl font-bold text-purple-600">
            {overdueInvoices.filter((inv) => calculateDaysOverdue(inv.due_date) > 30).length}
          </p>
        </Card>
      </div>

      {/* Alertes */}
      {overdueInvoices.some((inv) => calculateDaysOverdue(inv.due_date) > 30) && (
        <Card className="p-4 mb-6 bg-red-50 border-red-200">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-red-900 mb-1">Attention : Retards critiques</h3>
              <p className="text-sm text-red-800">
                {overdueInvoices.filter((inv) => calculateDaysOverdue(inv.due_date) > 30).length}{' '}
                facture(s) ont un retard supérieur à 30 jours. Une action légale peut être nécessaire.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Liste des factures impayées */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : overdueInvoices.length === 0 ? (
        <Card className="p-12 text-center bg-green-50 border-green-200">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <ClockIcon className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <p className="text-lg font-medium text-green-900 mb-2">
            Aucune facture en retard
          </p>
          <p className="text-sm text-green-700">
            Toutes les factures sont à jour !
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {overdueInvoices.map((invoice) => {
            const daysOverdue = calculateDaysOverdue(invoice.due_date)

            return (
              <Card
                key={invoice.id}
                className={`p-6 border-l-4 ${
                  daysOverdue > 30
                    ? 'border-l-red-500 bg-red-50/50'
                    : daysOverdue > 15
                    ? 'border-l-orange-500 bg-orange-50/50'
                    : 'border-l-yellow-500 bg-yellow-50/50'
                }`}
              >
                <div className="flex items-start justify-between">
                  {/* Informations */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="font-semibold text-lg">{invoice.invoice_number}</h3>
                      {getSeverityBadge(daysOverdue)}
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <ClockIcon className="w-3 h-3" />
                        {daysOverdue} jour{daysOverdue > 1 ? 's' : ''} de retard
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm mb-4">
                      <div>
                        <p className="text-gray-500">Famille</p>
                        <p className="font-medium">{(invoice as any).family?.family_name || 'N/A'}</p>
                      </div>

                      <div>
                        <p className="text-gray-500">Date d'échéance</p>
                        <p className="font-medium text-red-600">
                          {new Date(invoice.due_date).toLocaleDateString('fr-FR')}
                        </p>
                      </div>

                      <div>
                        <p className="text-gray-500">Montant dû</p>
                        <p className="font-bold text-lg text-red-600">
                          {invoice.remaining_amount.toLocaleString('fr-FR', {
                            style: 'currency',
                            currency: 'EUR',
                          })}
                        </p>
                      </div>

                      <div>
                        <p className="text-gray-500">Montant total</p>
                        <p className="font-medium">
                          {invoice.total_amount.toLocaleString('fr-FR', {
                            style: 'currency',
                            currency: 'EUR',
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Contact famille */}
                    {(invoice as any).family && (
                      <div className="flex items-center gap-4 text-sm">
                        {(invoice as any).family.phone && (
                          <a
                            href={`tel:${(invoice as any).family.phone}`}
                            className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                          >
                            <PhoneIcon className="w-4 h-4" />
                            {(invoice as any).family.phone}
                          </a>
                        )}
                        {(invoice as any).family.email && (
                          <a
                            href={`mailto:${(invoice as any).family.email}`}
                            className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                          >
                            <EnvelopeIcon className="w-4 h-4" />
                            {(invoice as any).family.email}
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 ml-6">
                    <Link href={`/owner/invoicing/invoices/${invoice.id}`}>
                      <Button variant="outline" size="sm" className="w-full">
                        <EyeIcon className="w-4 h-4 mr-2" />
                        Voir facture
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleSendReminder(invoice.id, daysOverdue)}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      <EnvelopeIcon className="w-4 h-4 mr-2" />
                      Envoyer relance
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Informations utiles */}
      {overdueInvoices.length > 0 && (
        <Card className="p-6 mt-6 bg-blue-50 border-blue-200">
          <h3 className="font-medium text-blue-900 mb-3">
            Processus de recouvrement recommandé
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
            <li>
              <strong>J+7 :</strong> 1ère relance amiable par email
            </li>
            <li>
              <strong>J+15 :</strong> 2e relance par email et courrier postal
            </li>
            <li>
              <strong>J+30 :</strong> Mise en demeure par courrier recommandé
            </li>
            <li>
              <strong>J+45 :</strong> Envisager une action légale (huissier, tribunal)
            </li>
          </ol>
        </Card>
      )}
    </div>
  )
}
