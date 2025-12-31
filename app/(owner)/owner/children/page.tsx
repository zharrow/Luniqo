'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
import { childService, type Child } from '@/lib/services/child.service'
import { sectionService, type Section } from '@/lib/services/section.service'
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { PageBreadcrumb } from '@/components/shared/PageBreadcrumb'

export default function ChildrenPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const { selectedNursery } = useNursery()
  const router = useRouter()

  const [children, setChildren] = useState<Child[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSection, setSelectedSection] = useState<string>('all')
  const [showInactive, setShowInactive] = useState(false)

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
      const [childrenData, sectionsData] = await Promise.all([
        childService.getActive(selectedNursery.id),
        sectionService.getActive(selectedNursery.id)
      ])
      setChildren(childrenData)
      setSections(sectionsData)
    } catch (error) {
      console.error('Error loading children:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter children
  const filteredChildren = children.filter(child => {
    // Search filter
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch =
      child.first_name.toLowerCase().includes(searchLower) ||
      child.last_name.toLowerCase().includes(searchLower) ||
      child.preferred_name?.toLowerCase().includes(searchLower)

    // Section filter
    const matchesSection = selectedSection === 'all' || child.section === selectedSection

    // Active filter
    const matchesActive = showInactive || child.is_active

    return matchesSearch && matchesSection && matchesActive
  })

  // Calculate age from birth_date
  function calculateAge(birthDate: string): string {
    const birth = new Date(birthDate)
    const today = new Date()
    const months = (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth())

    if (months < 12) {
      return `${months} mois`
    } else {
      const years = Math.floor(months / 12)
      const remainingMonths = months % 12
      return remainingMonths > 0 ? `${years} an${years > 1 ? 's' : ''} ${remainingMonths} mois` : `${years} an${years > 1 ? 's' : ''}`
    }
  }

  // Get section info
  function getSectionInfo(sectionCode: string) {
    const section = sections.find(s => s.code === sectionCode)
    return section || { name: sectionCode, color_hex: '#e5e7eb' }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5a9dc9] mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des enfants...</p>
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
          <p className="text-gray-600">Veuillez sélectionner une crèche pour voir les enfants.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <PageBreadcrumb
        items={[
          { label: 'Tableau de bord', href: '/owner/dashboard' },
          { label: 'Enfants', href: '/owner/children' }
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-6 mt-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Enfants</h1>
          <p className="text-gray-600 mt-1">
            Gestion des dossiers enfants de {selectedNursery.name}
          </p>
        </div>
        <Button
          onClick={() => router.push('/owner/children/new')}
          className="bg-[#f4c2c2] hover:bg-[#f4c2c2]/90 text-gray-900"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Ajouter un enfant
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-sm text-gray-600">Total enfants</div>
          <div className="text-2xl font-bold text-gray-900">{children.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">Actifs</div>
          <div className="text-2xl font-bold text-green-600">
            {children.filter(c => c.is_active).length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">Avec PAI</div>
          <div className="text-2xl font-bold text-orange-600">0</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">Allergies</div>
          <div className="text-2xl font-bold text-red-600">0</div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        {/* Search */}
        <div className="flex-1">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Rechercher un enfant (nom, prénom, surnom)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Section filter */}
        <div className="flex items-center gap-2">
          <FunnelIcon className="h-5 w-5 text-gray-400" />
          <select
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5a9dc9]"
          >
            <option value="all">Toutes les sections</option>
            {sections.map(section => (
              <option key={section.id} value={section.code || ''}>
                {section.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Children Grid */}
      {filteredChildren.length === 0 ? (
        <Card className="p-12 text-center">
          <UserGroupIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun enfant trouvé</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || selectedSection !== 'all'
              ? 'Aucun enfant ne correspond à vos critères de recherche.'
              : 'Commencez par ajouter votre premier enfant.'}
          </p>
          {!searchTerm && selectedSection === 'all' && (
            <Button
              onClick={() => router.push('/owner/children/new')}
              className="bg-[#f4c2c2] hover:bg-[#f4c2c2]/90 text-gray-900"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Ajouter un enfant
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredChildren.map(child => {
            const sectionInfo = getSectionInfo(child.section)
            const age = calculateAge(child.birth_date)

            return (
              <Card
                key={child.id}
                className="p-4 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => router.push(`/owner/children/${child.id}`)}
              >
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={child.photo_url || undefined} alt={`${child.first_name} ${child.last_name}`} />
                    <AvatarFallback className="bg-[#f4c2c2] text-gray-900">
                      {child.first_name[0]}{child.last_name[0]}
                    </AvatarFallback>
                  </Avatar>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {child.first_name} {child.last_name}
                    </h3>
                    {child.preferred_name && (
                      <p className="text-sm text-gray-600 truncate">
                        "{child.preferred_name}"
                      </p>
                    )}
                    <p className="text-sm text-gray-600 mt-1">{age}</p>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge
                        style={{
                          backgroundColor: (sectionInfo.color_hex || '#e5e7eb') + '40',
                          color: '#1f2937',
                          borderColor: sectionInfo.color_hex || '#e5e7eb'
                        }}
                        className="border"
                      >
                        {sectionInfo.name}
                      </Badge>

                      {child.allergies && (
                        <Badge variant="destructive" className="text-xs">
                          🥜 Allergies
                        </Badge>
                      )}

                      {!child.is_active && (
                        <Badge variant="secondary" className="text-xs">
                          Inactif
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
