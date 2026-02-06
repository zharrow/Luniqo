'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
import {
  waitingListService,
  type WaitingListWithApplication
} from '@/lib/services/waiting-list.service'
import {
  QueueListIcon,
  StarIcon,
  CalendarIcon,
  ClockIcon,
  UserGroupIcon,
  BellIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { PageBreadcrumb } from '@/components/shared/PageBreadcrumb'

export default function WaitingListPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const { selectedNursery } = useNursery()
  const router = useRouter()

  const [waitingList, setWaitingList] = useState<WaitingListWithApplication[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (selectedNursery?.id) {
      loadData()
    } else if (!authLoading && !selectedNursery) {
      setLoading(false)
    }
  }, [selectedNursery?.id, authLoading])

  async function loadData() {
    if (!selectedNursery?.id) return

    try {
      setLoading(true)
      const data = await waitingListService.getByNursery(selectedNursery.id)
      setWaitingList(data)
    } catch (error) {
      console.error('Error loading waiting list:', error)
    } finally {
      setLoading(false)
    }
  }

  function getStatusBadge(status: string) {
    const statusConfig: Record<string, { label: string; color: string }> = {
      active: { label: 'Active', color: 'bg-purple-100 text-purple-800' },
      offered: { label: 'Place proposée', color: 'bg-blue-100 text-blue-800' },
      accepted: { label: 'Acceptée', color: 'bg-green-100 text-green-800' },
      declined: { label: 'Refusée', color: 'bg-red-100 text-red-800' },
      expired: { label: 'Expirée', color: 'bg-gray-100 text-gray-800' },
      removed: { label: 'Retirée', color: 'bg-gray-100 text-gray-800' }
    }
    const config = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-800' }
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    )
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString)
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  async function handleNotify(waitingListId: string) {
    try {
      await waitingListService.notifyNextInLine(waitingListId)
      await loadData() // Reload
    } catch (error) {
      console.error('Error notifying family:', error)
    }
  }

  async function handleRemove(waitingListId: string) {
    if (!confirm('Êtes-vous sûr de vouloir retirer cette demande de la liste d\'attente ?')) {
      return
    }

    try {
      await waitingListService.remove(waitingListId)
      await loadData() // Reload
    } catch (error) {
      console.error('Error removing from waiting list:', error)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#b39ddb] mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement de la liste d'attente...</p>
        </div>
      </div>
    )
  }

  if (!selectedNursery) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <UserGroupIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Aucune crèche sélectionnée</h2>
          <p className="text-gray-600">Veuillez sélectionner une crèche pour voir la liste d'attente.</p>
        </div>
      </div>
    )
  }

  const activeEntries = waitingList.filter(w => w.status === 'active')
  const offeredEntries = waitingList.filter(w => w.status === 'offered')
  const otherEntries = waitingList.filter(w => !['active', 'offered'].includes(w.status))

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <PageBreadcrumb
        items={[
          { label: 'Tableau de bord', href: '/owner/dashboard' },
          { label: 'Liste d\'attente', href: '/owner/waiting-list' }
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-purple-100">
            <QueueListIcon className="w-6 h-6 text-purple-600" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Liste d'Attente</h1>
            <p className="text-sm text-muted-foreground">
              Gestion de la liste d'attente pour {selectedNursery.name}
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 bg-gradient-to-br from-purple-50 to-white border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active</p>
              <p className="text-2xl font-bold text-purple-700">{activeEntries.length}</p>
            </div>
            <QueueListIcon className="h-8 w-8 text-purple-500" />
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-blue-50 to-white border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Places proposées</p>
              <p className="text-2xl font-bold text-blue-700">{offeredEntries.length}</p>
            </div>
            <BellIcon className="h-8 w-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-green-50 to-white border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Acceptées</p>
              <p className="text-2xl font-bold text-green-700">
                {waitingList.filter(w => w.status === 'accepted').length}
              </p>
            </div>
            <CheckCircleIcon className="h-8 w-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-gray-50 to-white border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-700">{waitingList.length}</p>
            </div>
            <UserGroupIcon className="h-8 w-8 text-gray-500" />
          </div>
        </Card>
      </div>

      {/* Waiting List */}
      {waitingList.length === 0 ? (
        <Card className="p-12 text-center bg-gray-50">
          <QueueListIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Liste d'attente vide</h3>
          <p className="text-gray-600 mb-4">
            Aucune demande en liste d'attente pour le moment.
          </p>
          <Button
            onClick={() => router.push('/owner/applications')}
            className="bg-[#b39ddb] hover:bg-[#b39ddb]/90 text-white"
          >
            Voir les demandes
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Active Entries */}
          {activeEntries.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Demandes Actives ({activeEntries.length})</h2>
              <div className="space-y-3">
                {activeEntries.map((entry) => (
                  <Card
                    key={entry.id}
                    className="p-6 hover:shadow-lg transition-shadow border-l-4 border-l-[#b39ddb]"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        {/* Position Badge */}
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                            <span className="text-xl font-bold text-purple-700">#{entry.position}</span>
                          </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-bold text-gray-900">
                              {entry.child_first_name} {entry.child_last_name}
                            </h3>
                            {getStatusBadge(entry.status)}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600">Parent</p>
                              <p className="font-medium text-gray-900">
                                {entry.parent1_first_name} {entry.parent1_last_name}
                              </p>
                              <p className="text-gray-600">{entry.parent1_email}</p>
                            </div>

                            <div>
                              <p className="text-gray-600">Priorité</p>
                              <div className="flex items-center gap-2 mt-1">
                                <StarIcon className="h-4 w-4 text-yellow-500" />
                                <span className="font-bold text-yellow-700">{entry.total_priority_score} pts</span>
                              </div>
                            </div>

                            <div>
                              <p className="text-gray-600">Sur la liste depuis</p>
                              <p className="font-medium text-gray-900">{entry.days_on_list} jours</p>
                              <p className="text-xs text-gray-500">{formatDate(entry.added_to_list_date)}</p>
                            </div>

                            <div>
                              <p className="text-gray-600">Entrée souhaitée</p>
                              <p className="font-medium text-gray-900">{formatDate(entry.desired_start_date)}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          onClick={() => handleNotify(entry.id)}
                          className="bg-blue-500 hover:bg-blue-600 text-white"
                        >
                          <BellIcon className="h-4 w-4 mr-1" />
                          Notifier
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRemove(entry.id)}
                        >
                          <XCircleIcon className="h-4 w-4 mr-1" />
                          Retirer
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Offered Entries */}
          {offeredEntries.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Places Proposées ({offeredEntries.length})</h2>
              <div className="space-y-3">
                {offeredEntries.map((entry) => (
                  <Card
                    key={entry.id}
                    className="p-6 bg-blue-50 border-blue-200 border-l-4 border-l-blue-500"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-gray-900">
                            {entry.child_first_name} {entry.child_last_name}
                          </h3>
                          {getStatusBadge(entry.status)}
                          {entry.response_overdue && (
                            <Badge className="bg-orange-100 text-orange-800">
                              Réponse en retard
                            </Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Parent</p>
                            <p className="font-medium text-gray-900">
                              {entry.parent1_first_name} {entry.parent1_last_name}
                            </p>
                          </div>

                          <div>
                            <p className="text-gray-600">Notifié le</p>
                            <p className="font-medium text-gray-900">
                              {entry.notified_at ? formatDate(entry.notified_at) : '-'}
                            </p>
                          </div>

                          <div>
                            <p className="text-gray-600">Délai de réponse</p>
                            <p className="font-medium text-gray-900">
                              {entry.response_deadline ? formatDate(entry.response_deadline) : '-'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Other Entries (Accepted, Declined, Expired) */}
          {otherEntries.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Historique ({otherEntries.length})</h2>
              <div className="space-y-3">
                {otherEntries.map((entry) => (
                  <Card
                    key={entry.id}
                    className="p-4 bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-sm font-bold text-gray-600">#{entry.position}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">
                              {entry.child_first_name} {entry.child_last_name}
                            </span>
                            {getStatusBadge(entry.status)}
                          </div>
                          <p className="text-sm text-gray-600">
                            {entry.parent1_first_name} {entry.parent1_last_name}
                          </p>
                        </div>
                      </div>
                      <div className="text-right text-sm text-gray-600">
                        <p>{entry.days_on_list} jours sur la liste</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
