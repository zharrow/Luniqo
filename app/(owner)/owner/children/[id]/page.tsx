'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeftIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import { UserCircleIcon, UserGroupIcon, HeartIcon, DocumentTextIcon, ShieldCheckIcon, ClockIcon } from '@heroicons/react/24/solid'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useNursery } from '@/lib/contexts/NurseryContext'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { childService } from '@/lib/services/child.service'

interface ChildFullProfile {
  // Infos générales
  id: string
  first_name: string
  last_name: string
  preferred_name?: string
  birth_date: string
  gender?: string
  nationality?: string
  birth_place?: string
  social_security_number?: string
  caf_number?: string
  profile_photo_url?: string
  notes?: string
  is_active: boolean

  // Famille
  family?: {
    id: string
    family_name: string
    caf_number?: string
    address?: string
    city?: string
    postal_code?: string
  }

  // Tuteurs
  guardians?: Array<{
    id: string
    first_name: string
    last_name: string
    relation_type: string
    phone_primary?: string
    email?: string
    is_primary_contact: boolean
    can_pickup: boolean
  }>

  // Section actuelle
  current_section?: {
    id: string
    section_name: string
    color_code?: string
    age_group?: string
  }

  // Santé
  health?: {
    id: string
    blood_type?: string
    pediatrician_name?: string
    pediatrician_phone?: string
    insurance_name?: string
    insurance_number?: string
    special_needs?: string
    medications?: string
    notes?: string
  }

  // Allergies
  allergies?: Array<{
    id: string
    allergy_type: string
    allergen_name: string
    severity: string
    reaction_description?: string
    diagnosed_date?: string
  }>

  // Régimes
  diets?: Array<{
    id: string
    diet_type: string
    diet_name: string
    reason?: string
    start_date: string
    end_date?: string
  }>

  // Vaccinations
  vaccinations?: Array<{
    id: string
    vaccine_name: string
    administered_date: string
    next_dose_date?: string
    lot_number?: string
    administered_by?: string
  }>

  // PAI actif
  active_pai?: {
    id: string
    condition_name: string
    start_date: string
    end_date?: string
    document_url?: string
    medical_protocol?: string
  }

  // Documents
  documents?: Array<{
    id: string
    document_type: string
    file_name: string
    file_url: string
    issue_date?: string
    expiry_date?: string
    uploaded_at: string
  }>

  // Autorisations
  authorizations?: Array<{
    id: string
    authorization_type: string
    description: string
    granted: boolean
    granted_date?: string
    expiry_date?: string
  }>

  // Contacts urgence
  emergency_contacts?: Array<{
    id: string
    contact_name: string
    relationship: string
    phone_primary: string
    phone_secondary?: string
    can_pickup: boolean
    priority_order: number
  }>

  // Médecin
  doctor?: {
    id: string
    doctor_name: string
    specialty?: string
    phone: string
    address?: string
  }

  created_at: string
  updated_at: string
}

export default function ChildDetailPage() {
  const params = useParams()
  const router = useRouter()
  const childId = params.id as string

  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const { selectedNursery, isLoading: nurseryLoading } = useNursery()

  const [child, setChild] = useState<ChildFullProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    if (authLoading || nurseryLoading || !selectedNursery?.id) return

    loadChildData()
  }, [authLoading, nurseryLoading, selectedNursery?.id, childId])

  async function loadChildData() {
    try {
      setIsLoading(true)
      const data = await childService.getFullProfile(childId)
      setChild(data as ChildFullProfile)
    } catch (error) {
      console.error('Error loading child:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet enfant ? Cette action est irréversible.')) {
      return
    }

    try {
      await childService.delete(childId)
      router.push('/owner/children')
    } catch (error) {
      console.error('Error deleting child:', error)
      alert('Erreur lors de la suppression')
    }
  }

  function calculateAge(birthDate: string): string {
    const birth = new Date(birthDate)
    const today = new Date()
    const years = today.getFullYear() - birth.getFullYear()
    const months = today.getMonth() - birth.getMonth()

    if (years === 0) {
      return `${months + (months <= 0 ? 12 : 0)} mois`
    } else if (years === 1) {
      return months < 0 ? '11 mois' : `1 an ${months} mois`
    } else {
      const totalMonths = years * 12 + months
      const displayYears = Math.floor(totalMonths / 12)
      const displayMonths = totalMonths % 12
      return `${displayYears} ans ${displayMonths} mois`
    }
  }

  if (authLoading || nurseryLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5a9dc9]"></div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5a9dc9]"></div>
      </div>
    )
  }

  if (!child) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="p-8 text-center">
          <p className="text-gray-500">Enfant introuvable</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push('/owner/children')}
          className="mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Retour à la liste
        </Button>

        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            {child.profile_photo_url ? (
              <img
                src={child.profile_photo_url}
                alt={`${child.first_name} ${child.last_name}`}
                className="h-20 w-20 rounded-full object-cover"
              />
            ) : (
              <div className="h-20 w-20 rounded-full bg-[#f4c2c2] flex items-center justify-center">
                <UserCircleIcon className="h-12 w-12 text-white" />
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {child.first_name} {child.last_name}
              </h1>
              {child.preferred_name && (
                <p className="text-gray-500">"{child.preferred_name}"</p>
              )}
              <div className="flex items-center space-x-3 mt-2">
                <Badge variant={child.is_active ? 'success' : 'secondary'}>
                  {child.is_active ? 'Actif' : 'Inactif'}
                </Badge>
                {child.current_section && (
                  <Badge
                    style={{
                      backgroundColor: child.current_section.color_code || '#e5e7eb',
                      color: '#1f2937'
                    }}
                  >
                    {child.current_section.section_name}
                  </Badge>
                )}
                {child.active_pai && (
                  <Badge variant="warning">PAI actif</Badge>
                )}
                {child.allergies && child.allergies.length > 0 && (
                  <Badge variant="danger">
                    {child.allergies.length} allergie{child.allergies.length > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/owner/children/${childId}/edit`)}
            >
              <PencilIcon className="h-4 w-4 mr-2" />
              Modifier
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
            >
              <TrashIcon className="h-4 w-4 mr-2" />
              Supprimer
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="overview">
            <UserCircleIcon className="h-4 w-4 mr-2" />
            Vue d'ensemble
          </TabsTrigger>
          <TabsTrigger value="family">
            <UserGroupIcon className="h-4 w-4 mr-2" />
            Famille
          </TabsTrigger>
          <TabsTrigger value="health">
            <HeartIcon className="h-4 w-4 mr-2" />
            Santé
          </TabsTrigger>
          <TabsTrigger value="documents">
            <DocumentTextIcon className="h-4 w-4 mr-2" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="authorizations">
            <ShieldCheckIcon className="h-4 w-4 mr-2" />
            Autorisations
          </TabsTrigger>
          <TabsTrigger value="history">
            <ClockIcon className="h-4 w-4 mr-2" />
            Historique
          </TabsTrigger>
        </TabsList>

        {/* Vue d'ensemble */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Informations générales</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm text-gray-500">Date de naissance</dt>
                  <dd className="text-gray-900">
                    {new Date(child.birth_date).toLocaleDateString('fr-FR')}
                    <span className="text-gray-500 ml-2">({calculateAge(child.birth_date)})</span>
                  </dd>
                </div>
                {child.gender && (
                  <div>
                    <dt className="text-sm text-gray-500">Genre</dt>
                    <dd className="text-gray-900 capitalize">{child.gender}</dd>
                  </div>
                )}
                {child.nationality && (
                  <div>
                    <dt className="text-sm text-gray-500">Nationalité</dt>
                    <dd className="text-gray-900">{child.nationality}</dd>
                  </div>
                )}
                {child.birth_place && (
                  <div>
                    <dt className="text-sm text-gray-500">Lieu de naissance</dt>
                    <dd className="text-gray-900">{child.birth_place}</dd>
                  </div>
                )}
                {child.social_security_number && (
                  <div>
                    <dt className="text-sm text-gray-500">N° Sécurité sociale</dt>
                    <dd className="text-gray-900 font-mono">{child.social_security_number}</dd>
                  </div>
                )}
              </dl>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Famille</h3>
              {child.family ? (
                <div>
                  <p className="text-gray-900 font-medium">{child.family.family_name}</p>
                  {child.family.caf_number && (
                    <p className="text-sm text-gray-500">CAF: {child.family.caf_number}</p>
                  )}
                  {child.family.address && (
                    <p className="text-sm text-gray-600 mt-2">
                      {child.family.address}<br />
                      {child.family.postal_code} {child.family.city}
                    </p>
                  )}
                  <Button
                    variant="link"
                    onClick={() => router.push(`/owner/families/${child.family?.id}`)}
                    className="mt-2 p-0"
                  >
                    Voir la fiche famille →
                  </Button>
                </div>
              ) : (
                <p className="text-gray-500">Aucune famille associée</p>
              )}
            </Card>

            {child.current_section && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Section actuelle</h3>
                <div
                  className="p-4 rounded-lg"
                  style={{
                    backgroundColor: child.current_section.color_code || '#f3f4f6'
                  }}
                >
                  <p className="font-medium text-gray-900">{child.current_section.section_name}</p>
                  {child.current_section.age_group && (
                    <p className="text-sm text-gray-600">{child.current_section.age_group}</p>
                  )}
                </div>
              </Card>
            )}

            {child.notes && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Notes</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{child.notes}</p>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Famille */}
        <TabsContent value="family">
          <div className="space-y-6">
            {/* Tuteurs */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Tuteurs légaux</h3>
                <Button size="sm">Ajouter un tuteur</Button>
              </div>
              {child.guardians && child.guardians.length > 0 ? (
                <div className="space-y-4">
                  {child.guardians.map((guardian) => (
                    <div
                      key={guardian.id}
                      className="flex items-start justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-start space-x-3">
                        <UserCircleIcon className="h-10 w-10 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900">
                            {guardian.first_name} {guardian.last_name}
                          </p>
                          <p className="text-sm text-gray-500 capitalize">{guardian.relation_type}</p>
                          {guardian.phone_primary && (
                            <p className="text-sm text-gray-600 mt-1">{guardian.phone_primary}</p>
                          )}
                          {guardian.email && (
                            <p className="text-sm text-gray-600">{guardian.email}</p>
                          )}
                          <div className="flex items-center space-x-2 mt-2">
                            {guardian.is_primary_contact && (
                              <Badge variant="default" size="sm">Contact principal</Badge>
                            )}
                            {guardian.can_pickup && (
                              <Badge variant="success" size="sm">Autorisé à récupérer</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">Aucun tuteur enregistré</p>
              )}
            </Card>

            {/* Contacts d'urgence */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Contacts d'urgence</h3>
                <Button size="sm">Ajouter un contact</Button>
              </div>
              {child.emergency_contacts && child.emergency_contacts.length > 0 ? (
                <div className="space-y-3">
                  {child.emergency_contacts
                    .sort((a, b) => a.priority_order - b.priority_order)
                    .map((contact) => (
                      <div
                        key={contact.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{contact.contact_name}</p>
                          <p className="text-sm text-gray-500">{contact.relationship}</p>
                          <p className="text-sm text-gray-600">{contact.phone_primary}</p>
                          {contact.phone_secondary && (
                            <p className="text-sm text-gray-600">{contact.phone_secondary}</p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" size="sm">Priorité {contact.priority_order}</Badge>
                          {contact.can_pickup && (
                            <Badge variant="success" size="sm">Autorisé récup.</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-gray-500">Aucun contact d'urgence</p>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* Santé */}
        <TabsContent value="health">
          <div className="space-y-6">
            {/* Informations médicales */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Informations médicales</h3>
              {child.health ? (
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {child.health.blood_type && (
                    <div>
                      <dt className="text-sm text-gray-500">Groupe sanguin</dt>
                      <dd className="text-gray-900 font-medium">{child.health.blood_type}</dd>
                    </div>
                  )}
                  {child.health.pediatrician_name && (
                    <div>
                      <dt className="text-sm text-gray-500">Pédiatre</dt>
                      <dd className="text-gray-900">{child.health.pediatrician_name}</dd>
                      {child.health.pediatrician_phone && (
                        <dd className="text-sm text-gray-600">{child.health.pediatrician_phone}</dd>
                      )}
                    </div>
                  )}
                  {child.health.insurance_name && (
                    <div>
                      <dt className="text-sm text-gray-500">Assurance</dt>
                      <dd className="text-gray-900">{child.health.insurance_name}</dd>
                      {child.health.insurance_number && (
                        <dd className="text-sm text-gray-600 font-mono">{child.health.insurance_number}</dd>
                      )}
                    </div>
                  )}
                  {child.health.special_needs && (
                    <div className="col-span-2">
                      <dt className="text-sm text-gray-500">Besoins spéciaux</dt>
                      <dd className="text-gray-900">{child.health.special_needs}</dd>
                    </div>
                  )}
                  {child.health.medications && (
                    <div className="col-span-2">
                      <dt className="text-sm text-gray-500">Médicaments</dt>
                      <dd className="text-gray-900">{child.health.medications}</dd>
                    </div>
                  )}
                </dl>
              ) : (
                <p className="text-gray-500">Aucune information médicale</p>
              )}
            </Card>

            {/* PAI actif */}
            {child.active_pai && (
              <Card className="p-6 border-amber-200 bg-amber-50">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-amber-900">PAI actif</h3>
                    <p className="text-amber-800">{child.active_pai.condition_name}</p>
                  </div>
                  <Badge variant="warning">Actif</Badge>
                </div>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-sm text-amber-700">Période</dt>
                    <dd className="text-amber-900">
                      Du {new Date(child.active_pai.start_date).toLocaleDateString('fr-FR')}
                      {child.active_pai.end_date && ` au ${new Date(child.active_pai.end_date).toLocaleDateString('fr-FR')}`}
                    </dd>
                  </div>
                  {child.active_pai.medical_protocol && (
                    <div>
                      <dt className="text-sm text-amber-700">Protocole médical</dt>
                      <dd className="text-amber-900 whitespace-pre-wrap">{child.active_pai.medical_protocol}</dd>
                    </div>
                  )}
                  {child.active_pai.document_url && (
                    <Button variant="outline" size="sm" className="mt-2">
                      Télécharger le PAI
                    </Button>
                  )}
                </dl>
              </Card>
            )}

            {/* Allergies */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Allergies</h3>
                <Button size="sm">Ajouter une allergie</Button>
              </div>
              {child.allergies && child.allergies.length > 0 ? (
                <div className="space-y-3">
                  {child.allergies.map((allergy) => (
                    <div
                      key={allergy.id}
                      className="p-4 border rounded-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{allergy.allergen_name}</p>
                          <p className="text-sm text-gray-500 capitalize">{allergy.allergy_type}</p>
                          {allergy.reaction_description && (
                            <p className="text-sm text-gray-600 mt-1">{allergy.reaction_description}</p>
                          )}
                          {allergy.diagnosed_date && (
                            <p className="text-xs text-gray-500 mt-1">
                              Diagnostiquée le {new Date(allergy.diagnosed_date).toLocaleDateString('fr-FR')}
                            </p>
                          )}
                        </div>
                        <Badge
                          variant={
                            allergy.severity === 'critical' ? 'danger' :
                            allergy.severity === 'severe' ? 'warning' : 'default'
                          }
                        >
                          {allergy.severity === 'critical' ? 'Critique' :
                           allergy.severity === 'severe' ? 'Sévère' :
                           allergy.severity === 'moderate' ? 'Modérée' : 'Légère'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">Aucune allergie connue</p>
              )}
            </Card>

            {/* Régimes alimentaires */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Régimes alimentaires</h3>
                <Button size="sm">Ajouter un régime</Button>
              </div>
              {child.diets && child.diets.length > 0 ? (
                <div className="space-y-3">
                  {child.diets.map((diet) => (
                    <div
                      key={diet.id}
                      className="p-4 border rounded-lg"
                    >
                      <p className="font-medium text-gray-900">{diet.diet_name}</p>
                      <p className="text-sm text-gray-500 capitalize">{diet.diet_type}</p>
                      {diet.reason && (
                        <p className="text-sm text-gray-600 mt-1">{diet.reason}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        Depuis le {new Date(diet.start_date).toLocaleDateString('fr-FR')}
                        {diet.end_date && ` jusqu'au ${new Date(diet.end_date).toLocaleDateString('fr-FR')}`}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">Aucun régime alimentaire spécifique</p>
              )}
            </Card>

            {/* Vaccinations */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Vaccinations</h3>
                <Button size="sm">Ajouter une vaccination</Button>
              </div>
              {child.vaccinations && child.vaccinations.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Vaccin</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Prochaine dose</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">N° Lot</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {child.vaccinations.map((vaccine) => (
                        <tr key={vaccine.id}>
                          <td className="px-4 py-3 text-sm text-gray-900">{vaccine.vaccine_name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {new Date(vaccine.administered_date).toLocaleDateString('fr-FR')}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {vaccine.next_dose_date ? new Date(vaccine.next_dose_date).toLocaleDateString('fr-FR') : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 font-mono">
                            {vaccine.lot_number || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500">Aucune vaccination enregistrée</p>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* Documents */}
        <TabsContent value="documents">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Documents</h3>
              <Button size="sm">Ajouter un document</Button>
            </div>
            {child.documents && child.documents.length > 0 ? (
              <div className="space-y-3">
                {child.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center space-x-3">
                      <DocumentTextIcon className="h-8 w-8 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">{doc.file_name}</p>
                        <p className="text-sm text-gray-500 capitalize">{doc.document_type.replace('_', ' ')}</p>
                        <p className="text-xs text-gray-500">
                          Ajouté le {new Date(doc.uploaded_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {doc.expiry_date && (
                        <Badge
                          variant={
                            new Date(doc.expiry_date) < new Date() ? 'danger' :
                            new Date(doc.expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) ? 'warning' : 'default'
                          }
                        >
                          {new Date(doc.expiry_date) < new Date()
                            ? 'Expiré'
                            : `Expire le ${new Date(doc.expiry_date).toLocaleDateString('fr-FR')}`}
                        </Badge>
                      )}
                      <Button variant="outline" size="sm">Télécharger</Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">Aucun document</p>
            )}
          </Card>
        </TabsContent>

        {/* Autorisations */}
        <TabsContent value="authorizations">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Autorisations</h3>
              <Button size="sm">Ajouter une autorisation</Button>
            </div>
            {child.authorizations && child.authorizations.length > 0 ? (
              <div className="space-y-3">
                {child.authorizations.map((auth) => (
                  <div
                    key={auth.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900 capitalize">
                        {auth.authorization_type.replace('_', ' ')}
                      </p>
                      <p className="text-sm text-gray-600">{auth.description}</p>
                      {auth.granted_date && (
                        <p className="text-xs text-gray-500 mt-1">
                          Accordée le {new Date(auth.granted_date).toLocaleDateString('fr-FR')}
                          {auth.expiry_date && ` - Expire le ${new Date(auth.expiry_date).toLocaleDateString('fr-FR')}`}
                        </p>
                      )}
                    </div>
                    <Badge variant={auth.granted ? 'success' : 'secondary'}>
                      {auth.granted ? 'Accordée' : 'Refusée'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">Aucune autorisation</p>
            )}
          </Card>
        </TabsContent>

        {/* Historique */}
        <TabsContent value="history">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Historique</h3>
            <p className="text-gray-500">Historique des présences et activités (à venir)</p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
