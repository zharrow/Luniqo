'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { usersService, type ProfileWithRooms } from '@/lib/services/users.service'
import {
  StaffHRService,
  type StaffQualification,
  type CreateQualificationInput,
  type UpdateQualificationInput
} from '@/lib/services/staff-hr.service'
import {
  AcademicCapIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ShieldCheckIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { FormDialog } from '@/components/shared/FormDialog'
import { DeleteConfirmationDialog } from '@/components/shared/DeleteConfirmationDialog'
import { PageBreadcrumb } from '@/components/shared/PageBreadcrumb'

const staffHRService = new StaffHRService()

const QUALIFICATION_TYPES = [
  { value: 'diploma', label: 'Diplôme' },
  { value: 'certification', label: 'Certification' },
  { value: 'training', label: 'Formation' },
  { value: 'first_aid', label: 'Premiers secours' },
  { value: 'cpr', label: 'RCP' },
  { value: 'food_safety', label: 'Sécurité alimentaire (HACCP)' },
  { value: 'child_protection', label: 'Protection de l\'enfance' },
  { value: 'management', label: 'Management' }
]

const QUALIFICATION_LEVELS = [
  { value: 'CAP', label: 'CAP' },
  { value: 'BEP', label: 'BEP' },
  { value: 'BAC', label: 'BAC' },
  { value: 'BAC+2', label: 'BAC+2' },
  { value: 'BAC+3', label: 'BAC+3' },
  { value: 'BAC+5', label: 'BAC+5' }
]

export default function StaffQualificationsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const [employee, setEmployee] = useState<ProfileWithRooms | null>(null)
  const [qualifications, setQualifications] = useState<StaffQualification[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingQualification, setEditingQualification] = useState<StaffQualification | null>(null)
  const [qualificationToDelete, setQualificationToDelete] = useState<StaffQualification | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [formData, setFormData] = useState<Partial<CreateQualificationInput>>({
    qualification_type: 'diploma',
    qualification_name: '',
    issuing_organization: '',
    issue_date: '',
    expiry_date: '',
    certificate_number: '',
    qualification_level: '',
    notes: ''
  })

  useEffect(() => {
    if (session?.enterprise?.id) {
      loadData()
    } else if (!authLoading) {
      setLoading(false)
    }
  }, [resolvedParams.id, session?.enterprise?.id, authLoading])

  async function loadData() {
    try {
      setLoading(true)

      // Load employee and qualifications
      const employeeData = await usersService.getEmployee(resolvedParams.id)
      const qualificationsData = await staffHRService.getQualifications(resolvedParams.id)

      setEmployee(employeeData)
      setQualifications(qualificationsData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  function openCreateModal() {
    setEditingQualification(null)
    setFormData({
      qualification_type: 'diploma',
      qualification_name: '',
      issuing_organization: '',
      issue_date: '',
      expiry_date: '',
      certificate_number: '',
      qualification_level: '',
      notes: ''
    })
    setShowModal(true)
  }

  function openEditModal(qualification: StaffQualification) {
    setEditingQualification(qualification)
    setFormData({
      qualification_type: qualification.qualification_type,
      qualification_name: qualification.qualification_name,
      issuing_organization: qualification.issuing_organization || '',
      issue_date: qualification.issue_date,
      expiry_date: qualification.expiry_date || '',
      certificate_number: qualification.certificate_number || '',
      qualification_level: qualification.qualification_level || '',
      notes: qualification.notes || ''
    })
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!session?.user?.id) return

    try {
      setIsSubmitting(true)

      if (editingQualification) {
        // Update existing qualification
        await staffHRService.updateQualification(
          editingQualification.id,
          formData as UpdateQualificationInput
        )
      } else {
        // Create new qualification
        await staffHRService.addQualification({
          employee_id: resolvedParams.id,
          ...formData
        } as CreateQualificationInput)
      }

      await loadData()
      setShowModal(false)
    } catch (error) {
      console.error('Error saving qualification:', error)
      alert('Erreur lors de l\'enregistrement de la qualification')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!qualificationToDelete) return

    try {
      setIsDeleting(true)
      await staffHRService.deleteQualification(qualificationToDelete.id)
      await loadData()
      setQualificationToDelete(null)
    } catch (error) {
      console.error('Error deleting qualification:', error)
      alert('Erreur lors de la suppression')
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleVerify(qualification: StaffQualification) {
    if (!session?.user?.id) return

    try {
      await staffHRService.verifyQualification(qualification.id, session.user.id)
      await loadData()
    } catch (error) {
      console.error('Error verifying qualification:', error)
      alert('Erreur lors de la vérification')
    }
  }

  function getDaysUntilExpiry(expiryDate: string): number {
    return Math.ceil(
      (new Date(expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    )
  }

  function getExpiryBadgeVariant(qualification: StaffQualification): 'default' | 'warning' | 'destructive' {
    if (!qualification.expiry_date) return 'default'
    const days = getDaysUntilExpiry(qualification.expiry_date)
    if (days < 0) return 'destructive'
    if (days <= 30) return 'destructive'
    if (days <= 90) return 'warning'
    return 'default'
  }

  function getInitials(employee: ProfileWithRooms | null): string {
    if (!employee) return ''
    const first = employee.first_name?.[0] || ''
    const last = employee.last_name?.[0] || ''
    return (first + last).toUpperCase()
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!employee) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 text-center max-w-md">
          <p className="text-lg font-medium mb-2">Employé introuvable</p>
          <Button onClick={() => router.push('/owner/staff')}>
            Retour au personnel
          </Button>
        </Card>
      </div>
    )
  }

  const activeQualifications = qualifications.filter((q) => q.is_active)
  const verifiedQualifications = activeQualifications.filter((q) => q.is_verified)
  const expiringQualifications = activeQualifications.filter((q) => {
    if (!q.expiry_date) return false
    const days = getDaysUntilExpiry(q.expiry_date)
    return days > 0 && days <= 90
  })
  const expiredQualifications = activeQualifications.filter((q) => {
    if (!q.expiry_date) return false
    return getDaysUntilExpiry(q.expiry_date) < 0
  })

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Breadcrumb */}
      <PageBreadcrumb
        items={[
          { label: 'Accueil', href: '/owner/dashboard' },
          { label: 'Personnel', href: '/owner/staff' },
          { label: `${employee.first_name} ${employee.last_name}`, href: `/owner/staff/${employee.id}/qualifications` }
        ]}
      />

      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => router.push('/owner/staff')}
        className="mb-4"
      >
        <ArrowLeftIcon className="h-4 w-4 mr-2" />
        Retour au personnel
      </Button>

      {/* Employee Header */}
      <Card className="p-6 mb-6 bg-gradient-to-br from-blue-50 to-white border-blue-200">
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20 bg-blue-100">
            <AvatarImage src={employee.avatar_url || undefined} />
            <AvatarFallback className="text-2xl text-gray-700">
              {getInitials(employee)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              {employee.first_name} {employee.last_name}
            </h1>
            <p className="text-gray-600 mb-2">{employee.email}</p>
            <div className="flex gap-2">
              {employee.is_active ? (
                <Badge variant="success">
                  <CheckCircleIcon className="h-3 w-3 mr-1" />
                  Actif
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <XCircleIcon className="h-3 w-3 mr-1" />
                  Inactif
                </Badge>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 bg-green-50 border-green-200">
          <p className="text-sm text-gray-600 mb-1">Qualifications actives</p>
          <p className="text-2xl font-bold text-green-600">{activeQualifications.length}</p>
        </Card>
        <Card className="p-4 bg-blue-50 border-blue-200">
          <p className="text-sm text-gray-600 mb-1">Vérifiées</p>
          <p className="text-2xl font-bold text-blue-600">{verifiedQualifications.length}</p>
        </Card>
        <Card className="p-4 bg-orange-50 border-orange-200">
          <p className="text-sm text-gray-600 mb-1">À expirer (90j)</p>
          <p className="text-2xl font-bold text-orange-600">{expiringQualifications.length}</p>
        </Card>
        <Card className="p-4 bg-red-50 border-red-200">
          <p className="text-sm text-gray-600 mb-1">Expirées</p>
          <p className="text-2xl font-bold text-red-600">{expiredQualifications.length}</p>
        </Card>
      </div>

      {/* Alerts */}
      {expiredQualifications.length > 0 && (
        <Card className="p-4 mb-6 bg-red-50 border-red-200">
          <div className="flex items-center gap-3">
            <XCircleIcon className="h-6 w-6 text-red-600" />
            <div>
              <h3 className="font-semibold text-red-900">
                {expiredQualifications.length} qualification(s) expirée(s)
              </h3>
              <p className="text-sm text-red-700">
                Ces qualifications doivent être renouvelées immédiatement
              </p>
            </div>
          </div>
        </Card>
      )}

      {expiringQualifications.length > 0 && (
        <Card className="p-4 mb-6 bg-orange-50 border-orange-200">
          <div className="flex items-center gap-3">
            <ExclamationTriangleIcon className="h-6 w-6 text-orange-600" />
            <div>
              <h3 className="font-semibold text-orange-900">
                {expiringQualifications.length} qualification(s) à renouveler
              </h3>
              <p className="text-sm text-orange-700">
                Ces qualifications expirent dans les 90 prochains jours
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Header with Add Button */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-50 rounded-xl">
            <AcademicCapIcon className="h-8 w-8 text-purple-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Qualifications</h2>
            <p className="text-gray-600">Diplômes, certifications et formations</p>
          </div>
        </div>
        <Button onClick={openCreateModal}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Ajouter
        </Button>
      </div>

      {/* Qualifications List */}
      {qualifications.length === 0 ? (
        <Card className="p-12 text-center">
          <AcademicCapIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Aucune qualification</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Commencez par ajouter les diplômes et certifications de cet employé
          </p>
          <Button onClick={openCreateModal}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Ajouter une qualification
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {qualifications.map((qualification) => {
            const expiryVariant = getExpiryBadgeVariant(qualification)
            const daysUntilExpiry = qualification.expiry_date
              ? getDaysUntilExpiry(qualification.expiry_date)
              : null

            return (
              <Card
                key={qualification.id}
                className={`p-6 ${
                  !qualification.is_active
                    ? 'bg-gray-50 border-gray-200'
                    : expiryVariant === 'destructive'
                    ? 'bg-red-50 border-red-200'
                    : expiryVariant === 'warning'
                    ? 'bg-orange-50 border-orange-200'
                    : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {qualification.qualification_name}
                      </h3>
                      {qualification.is_verified ? (
                        <Badge variant="success">
                          <ShieldCheckIcon className="h-3 w-3 mr-1" />
                          Vérifiée
                        </Badge>
                      ) : (
                        <Badge variant="default">
                          <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                          Non vérifiée
                        </Badge>
                      )}
                      {!qualification.is_active && (
                        <Badge variant="destructive">Inactive</Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                      <div>
                        <p className="text-gray-600">Type</p>
                        <p className="font-medium">
                          {QUALIFICATION_TYPES.find((t) => t.value === qualification.qualification_type)?.label || qualification.qualification_type}
                        </p>
                      </div>
                      {qualification.qualification_level && (
                        <div>
                          <p className="text-gray-600">Niveau</p>
                          <p className="font-medium">{qualification.qualification_level}</p>
                        </div>
                      )}
                      {qualification.issuing_organization && (
                        <div>
                          <p className="text-gray-600">Organisme</p>
                          <p className="font-medium">{qualification.issuing_organization}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-gray-600">Date d'obtention</p>
                        <p className="font-medium">
                          {new Date(qualification.issue_date).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>

                    {qualification.expiry_date && (
                      <div className="flex items-center gap-2 mb-3">
                        <ClockIcon className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">Expire le:</span>
                        <span className="text-sm font-medium">
                          {new Date(qualification.expiry_date).toLocaleDateString('fr-FR')}
                        </span>
                        {daysUntilExpiry !== null && (
                          <Badge variant={expiryVariant}>
                            {daysUntilExpiry < 0
                              ? `Expirée depuis ${Math.abs(daysUntilExpiry)}j`
                              : `${daysUntilExpiry}j restants`}
                          </Badge>
                        )}
                      </div>
                    )}

                    {qualification.certificate_number && (
                      <p className="text-sm text-gray-600">
                        N° {qualification.certificate_number}
                      </p>
                    )}

                    {qualification.notes && (
                      <p className="text-sm text-gray-600 mt-2 italic">
                        {qualification.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {!qualification.is_verified && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleVerify(qualification)}
                      >
                        <ShieldCheckIcon className="h-4 w-4 mr-1" />
                        Vérifier
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(qualification)}
                    >
                      <PencilIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setQualificationToDelete(qualification)}
                    >
                      <TrashIcon className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <FormDialog
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingQualification ? 'Modifier la qualification' : 'Ajouter une qualification'}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Type de qualification *</label>
            <select
              className="w-full border rounded-md px-3 py-2"
              value={formData.qualification_type || ''}
              onChange={(e) => setFormData({ ...formData, qualification_type: e.target.value })}
              required
            >
              {QUALIFICATION_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Nom de la qualification *</label>
            <Input
              value={formData.qualification_name || ''}
              onChange={(e) => setFormData({ ...formData, qualification_name: e.target.value })}
              placeholder="ex: CAP Accompagnant Éducatif Petite Enfance"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Organisme émetteur</label>
            <Input
              value={formData.issuing_organization || ''}
              onChange={(e) => setFormData({ ...formData, issuing_organization: e.target.value })}
              placeholder="ex: Académie de Paris"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Date d'obtention *</label>
              <Input
                type="date"
                value={formData.issue_date || ''}
                onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Date d'expiration</label>
              <Input
                type="date"
                value={formData.expiry_date || ''}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Niveau</label>
              <select
                className="w-full border rounded-md px-3 py-2"
                value={formData.qualification_level || ''}
                onChange={(e) => setFormData({ ...formData, qualification_level: e.target.value })}
              >
                <option value="">Sélectionner...</option>
                {QUALIFICATION_LEVELS.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Numéro de certificat</label>
              <Input
                value={formData.certificate_number || ''}
                onChange={(e) => setFormData({ ...formData, certificate_number: e.target.value })}
                placeholder="ex: 2024-AEPE-001"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              className="w-full border rounded-md px-3 py-2 min-h-[80px]"
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Notes additionnelles..."
            />
          </div>
        </div>
      </FormDialog>

      {/* Delete Confirmation */}
      <DeleteConfirmationDialog
        isOpen={qualificationToDelete !== null}
        onClose={() => setQualificationToDelete(null)}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
        title="Supprimer la qualification"
        itemName={qualificationToDelete?.qualification_name}
      />
    </div>
  )
}
