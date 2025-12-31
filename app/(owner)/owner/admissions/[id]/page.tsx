'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import {
  admissionService,
  type AdmissionWithDetails,
  type UpdateAdmissionInput
} from '@/lib/services/admission.service'
import { sectionService, type Section } from '@/lib/services/section.service'
import { roomsService, type Room } from '@/lib/services/rooms.service'
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  CalendarIcon,
  AcademicCapIcon,
  UserIcon
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { PageBreadcrumb } from '@/components/shared/PageBreadcrumb'

export default function AdmissionDetailPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const router = useRouter()
  const params = useParams()
  const admissionId = params.id as string

  const [admission, setAdmission] = useState<AdmissionWithDetails | null>(null)
  const [sections, setSections] = useState<Section[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    start_date: '',
    section_id: '',
    room_id: '',
    trial_period_weeks: 2,
    notes: ''
  })

  useEffect(() => {
    if (admissionId) {
      loadData()
    }
  }, [admissionId])

  async function loadData() {
    try {
      setLoading(true)
      const admissionData = await admissionService.getByIdWithDetails(admissionId)
      setAdmission(admissionData)

      // Load sections and rooms for the nursery
      const [sectionsData, roomsData] = await Promise.all([
        sectionService.getActive(admissionData.nursery_id),
        roomsService.getActive(admissionData.nursery_id)
      ])
      setSections(sectionsData)
      setRooms(roomsData)

      // Set form data
      setFormData({
        start_date: admissionData.start_date,
        section_id: admissionData.section_id || '',
        room_id: admissionData.room_id || '',
        trial_period_weeks: admissionData.trial_period_weeks,
        notes: admissionData.notes || ''
      })
    } catch (err) {
      console.error('Error loading admission:', err)
      setError('Erreur lors du chargement de l\'admission.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!admission) return

    setSaving(true)
    setError(null)

    try {
      const updateData: UpdateAdmissionInput = {
        start_date: formData.start_date,
        section_id: formData.section_id || undefined,
        room_id: formData.room_id || undefined,
        trial_period_weeks: formData.trial_period_weeks,
        notes: formData.notes || undefined
      }

      await admissionService.update(admissionId, updateData)
      await loadData() // Reload
    } catch (err) {
      console.error('Error saving admission:', err)
      setError('Erreur lors de la sauvegarde.')
    } finally {
      setSaving(false)
    }
  }

  async function handleComplete() {
    if (!admission || !formData.section_id) {
      setError('Veuillez assigner une section avant de finaliser l\'admission.')
      return
    }

    router.push(`/owner/admissions/${admissionId}/complete`)
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString)
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  function getStatusBadge(status: string) {
    const statusConfig: Record<string, { label: string; color: string }> = {
      pending: { label: 'En cours', color: 'bg-yellow-100 text-yellow-800' },
      active: { label: 'Active', color: 'bg-green-100 text-green-800' },
      completed: { label: 'Complétée', color: 'bg-blue-100 text-blue-800' },
      cancelled: { label: 'Annulée', color: 'bg-red-100 text-red-800' }
    }
    const config = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-800' }
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    )
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#64b5d1] mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  if (error && !admission) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Erreur</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => router.push('/owner/admissions')}>
            Retour à la liste
          </Button>
        </div>
      </div>
    )
  }

  if (!admission) return null

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <PageBreadcrumb
        items={[
          { label: 'Tableau de bord', href: '/owner/dashboard' },
          { label: 'Admissions', href: '/owner/admissions' },
          { label: `${admission.child_first_name} ${admission.child_last_name}`, href: `/owner/admissions/${admission.id}` }
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
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold text-gray-900">
                {admission.child_first_name} {admission.child_last_name}
              </h1>
              {getStatusBadge(admission.status)}
              {admission.in_trial_period && (
                <Badge className="bg-orange-100 text-orange-800">
                  Période d'adaptation
                </Badge>
              )}
            </div>
            <p className="text-gray-600">Processus d'admission</p>
          </div>
        </div>

        {admission.status === 'pending' && (
          <Button
            onClick={handleComplete}
            className="bg-green-500 hover:bg-green-600 text-white"
          >
            <CheckCircleIcon className="h-5 w-5 mr-2" />
            Finaliser l'admission
          </Button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <Card className="p-4 mb-6 bg-red-50 border-red-200">
          <p className="text-red-800">{error}</p>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Application Info */}
          <Card className="p-6 border-l-4 border-l-[#64b5d1]">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Informations de la Demande</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Enfant</p>
                <p className="font-medium text-gray-900">
                  {admission.child_first_name} {admission.child_last_name}
                </p>
                <p className="text-xs text-gray-600">{formatDate(admission.child_birth_date)}</p>
              </div>
              <div>
                <p className="text-gray-600">Parent</p>
                <p className="font-medium text-gray-900">
                  {admission.parent1_first_name} {admission.parent1_last_name}
                </p>
                <p className="text-xs text-gray-600">{admission.parent1_email}</p>
              </div>
            </div>
          </Card>

          {/* Admission Details Form */}
          <Card className="p-6 border-l-4 border-l-[#64b5d1]">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Détails de l'Admission</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date de début <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Section <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.section_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, section_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Sélectionner une section</option>
                  {sections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.name} ({section.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Salle (optionnel)
                </label>
                <select
                  value={formData.room_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, room_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Aucune salle spécifique</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Période d'adaptation (semaines)
                </label>
                <Input
                  type="number"
                  min="0"
                  max="12"
                  value={formData.trial_period_weeks}
                  onChange={(e) => setFormData(prev => ({ ...prev, trial_period_weeks: parseInt(e.target.value) || 0 }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Notes ou observations concernant cette admission..."
                />
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => loadData()}
                  disabled={saving}
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-[#64b5d1] hover:bg-[#64b5d1]/90 text-white"
                >
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Timeline */}
          <Card className="p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Chronologie</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircleIcon className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Admission créée</p>
                  <p className="text-sm text-gray-600">{formatDate(admission.admission_date)}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  admission.has_started ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  <CalendarIcon className={`h-5 w-5 ${admission.has_started ? 'text-green-600' : 'text-gray-400'}`} />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Début de l'accueil</p>
                  <p className="text-sm text-gray-600">{formatDate(admission.start_date)}</p>
                  {!admission.has_started && admission.days_until_start >= 0 && (
                    <p className="text-xs text-blue-600">Dans {admission.days_until_start} jours</p>
                  )}
                </div>
              </div>

              {admission.trial_period_end && (
                <div className="flex items-start gap-3">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    !admission.in_trial_period ? 'bg-green-100' : 'bg-yellow-100'
                  }`}>
                    <AcademicCapIcon className={`h-5 w-5 ${
                      !admission.in_trial_period ? 'text-green-600' : 'text-yellow-600'
                    }`} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Fin période d'adaptation</p>
                    <p className="text-sm text-gray-600">{formatDate(admission.trial_period_end)}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  admission.status === 'completed' ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  <UserIcon className={`h-5 w-5 ${
                    admission.status === 'completed' ? 'text-green-600' : 'text-gray-400'
                  }`} />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Admission complétée</p>
                  <p className="text-sm text-gray-600">
                    {admission.status === 'completed' ? 'Fait' : 'En attente'}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Info Card */}
          <Card className="p-6 bg-blue-50 border-blue-200">
            <h3 className="font-medium text-blue-900 mb-2">ℹ️ Prochaine étape</h3>
            <p className="text-sm text-blue-800">
              {admission.status === 'pending'
                ? "Complétez les informations ci-contre puis cliquez sur 'Finaliser l'admission' pour créer le dossier enfant et famille."
                : "L'admission a été finalisée. Le dossier enfant et famille a été créé."}
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
