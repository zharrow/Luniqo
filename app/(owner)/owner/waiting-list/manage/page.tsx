'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
import {
  waitingListService,
  type WaitingListWithApplication
} from '@/lib/services/waiting-list.service'
import { ArrowLeftIcon, Bars3Icon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { PageBreadcrumb } from '@/components/shared/PageBreadcrumb'

export default function ManageWaitingListPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const { selectedNursery } = useNursery()
  const router = useRouter()

  const [waitingList, setWaitingList] = useState<WaitingListWithApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [draggedItem, setDraggedItem] = useState<string | null>(null)
  const [draggedOverItem, setDraggedOverItem] = useState<string | null>(null)

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
      // Only show active entries for management
      const activeEntries = data.filter(w => w.status === 'active')
      setWaitingList(activeEntries)
    } catch (error) {
      console.error('Error loading waiting list:', error)
      setError('Erreur lors du chargement de la liste d\'attente.')
    } finally {
      setLoading(false)
    }
  }

  function handleDragStart(e: React.DragEvent<HTMLDivElement>, id: string) {
    setDraggedItem(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>, id: string) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDraggedOverItem(id)
  }

  function handleDragEnd() {
    setDraggedItem(null)
    setDraggedOverItem(null)
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>, targetId: string) {
    e.preventDefault()

    if (!draggedItem || draggedItem === targetId) {
      setDraggedItem(null)
      setDraggedOverItem(null)
      return
    }

    const draggedIndex = waitingList.findIndex(w => w.id === draggedItem)
    const targetIndex = waitingList.findIndex(w => w.id === targetId)

    if (draggedIndex === -1 || targetIndex === -1) return

    // Reorder the list
    const newList = [...waitingList]
    const [removed] = newList.splice(draggedIndex, 1)
    newList.splice(targetIndex, 0, removed)

    // Update positions
    const updatedList = newList.map((item, index) => ({
      ...item,
      position: index + 1
    }))

    setWaitingList(updatedList)
    setDraggedItem(null)
    setDraggedOverItem(null)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)

    try {
      // Recalculate positions based on new order
      await waitingListService.recalculatePositions(selectedNursery!.id)
      router.push('/owner/waiting-list')
    } catch (err) {
      console.error('Error saving positions:', err)
      setError('Erreur lors de la sauvegarde des positions.')
    } finally {
      setSaving(false)
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString)
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  function getPriorityBadge(score: number) {
    if (score >= 80) {
      return <Badge className="bg-red-100 text-red-800">Très haute ({score})</Badge>
    } else if (score >= 60) {
      return <Badge className="bg-orange-100 text-orange-800">Haute ({score})</Badge>
    } else if (score >= 40) {
      return <Badge className="bg-yellow-100 text-yellow-800">Moyenne ({score})</Badge>
    } else {
      return <Badge className="bg-gray-100 text-gray-800">Normale ({score})</Badge>
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#b39ddb] mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!selectedNursery) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Aucune crèche sélectionnée</h2>
          <p className="text-gray-600">Veuillez sélectionner une crèche.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <PageBreadcrumb
        items={[
          { label: 'Tableau de bord', href: '/owner/dashboard' },
          { label: 'Liste d\'attente', href: '/owner/waiting-list' },
          { label: 'Gérer positions', href: '/owner/waiting-list/manage' }
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-6 mt-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="p-2"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gérer les Positions</h1>
            <p className="text-gray-600 mt-1">
              Réorganisez l'ordre de la liste d'attente par glisser-déposer
            </p>
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#b39ddb] hover:bg-[#b39ddb]/90 text-white"
        >
          <CheckCircleIcon className="h-5 w-5 mr-2" />
          {saving ? 'Enregistrement...' : 'Enregistrer l\'ordre'}
        </Button>
      </div>

      {/* Error message */}
      {error && (
        <Card className="p-4 mb-6 bg-red-50 border-red-200">
          <p className="text-red-800">{error}</p>
        </Card>
      )}

      {/* Info Card */}
      <Card className="p-6 mb-6 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <Bars3Icon className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">Gestion manuelle des positions</h3>
            <p className="text-sm text-blue-800">
              Utilisez le glisser-déposer pour réorganiser les positions. Cette action remplace temporairement
              l'ordre automatique basé sur les priorités. Seules les entrées actives sont affichées.
            </p>
          </div>
        </div>
      </Card>

      {/* Waiting List */}
      {waitingList.length === 0 ? (
        <Card className="p-12 text-center bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune entrée active</h3>
          <p className="text-gray-600 mb-4">
            La liste d'attente ne contient actuellement aucune entrée active à gérer.
          </p>
          <Button
            onClick={() => router.push('/owner/waiting-list')}
            className="bg-[#b39ddb] hover:bg-[#b39ddb]/90 text-white"
          >
            Retour à la liste
          </Button>
        </Card>
      ) : (
        <Card className="p-6 border-l-4 border-l-[#b39ddb]">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Liste d'Attente Active ({waitingList.length})
          </h2>

          <div className="space-y-3">
            {waitingList.map((entry, index) => (
              <div
                key={entry.id}
                draggable
                onDragStart={(e) => handleDragStart(e, entry.id)}
                onDragOver={(e) => handleDragOver(e, entry.id)}
                onDragEnd={handleDragEnd}
                onDrop={(e) => handleDrop(e, entry.id)}
                className={`p-4 rounded-lg border-2 transition-all cursor-move ${
                  draggedItem === entry.id
                    ? 'border-[#b39ddb] bg-[#b39ddb]/10 opacity-50'
                    : draggedOverItem === entry.id
                    ? 'border-[#b39ddb] bg-[#b39ddb]/5'
                    : 'border-gray-200 bg-white hover:border-[#b39ddb]/50'
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Drag Handle */}
                  <div className="flex-shrink-0">
                    <Bars3Icon className="h-6 w-6 text-gray-400" />
                  </div>

                  {/* Position */}
                  <div className="flex-shrink-0 w-16">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#b39ddb] text-white font-bold text-lg">
                      {index + 1}
                    </div>
                  </div>

                  {/* Child Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold text-gray-900 truncate">
                        {entry.child_first_name} {entry.child_last_name}
                      </h3>
                      {getPriorityBadge(entry.total_priority_score || 0)}
                    </div>
                    <p className="text-sm text-gray-600">
                      Parent: {entry.parent1_first_name} {entry.parent1_last_name}
                    </p>
                  </div>

                  {/* Date */}
                  <div className="flex-shrink-0 text-right">
                    <p className="text-xs text-gray-600">Ajouté le</p>
                    <p className="text-sm font-medium text-gray-900">
                      {formatDate(entry.added_to_list_date)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-4 mt-6 pt-6 border-t">
            <Button
              variant="outline"
              onClick={() => router.back()}
              disabled={saving}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#b39ddb] hover:bg-[#b39ddb]/90 text-white"
            >
              <CheckCircleIcon className="h-5 w-5 mr-2" />
              {saving ? 'Enregistrement...' : 'Enregistrer l\'ordre'}
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
