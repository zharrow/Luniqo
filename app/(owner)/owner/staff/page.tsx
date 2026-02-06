'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import { useNursery } from '@/lib/contexts/NurseryContext'
import { usersService, type ProfileWithRooms } from '@/lib/services/users.service'
import {
  StaffHRService,
  type StaffQualification,
  type QualificationWithEmployee
} from '@/lib/services/staff-hr.service'
import {
  UserGroupIcon,
  AcademicCapIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { PageBreadcrumb } from '@/components/shared/PageBreadcrumb'

const staffHRService = new StaffHRService()

interface StaffWithQualifications extends ProfileWithRooms {
  qualifications_count: number
  verified_qualifications_count: number
  expiring_qualifications_count: number
}

export default function StaffPage() {
  const router = useRouter()
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const { selectedNursery } = useNursery()
  const [staff, setStaff] = useState<StaffWithQualifications[]>([])
  const [filteredStaff, setFilteredStaff] = useState<StaffWithQualifications[]>([])
  const [expiringQualifications, setExpiringQualifications] = useState<QualificationWithEmployee[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('active')

  useEffect(() => {
    if (selectedNursery?.id && session?.enterprise?.id) {
      loadData()
    } else if (!authLoading && !selectedNursery) {
      setLoading(false)
    }
  }, [selectedNursery?.id, session?.enterprise?.id, authLoading])

  useEffect(() => {
    applyFilters()
  }, [staff, searchTerm, filterStatus])

  async function loadData() {
    if (!selectedNursery?.id || !session?.enterprise?.id) return

    try {
      setLoading(true)

      // Load staff and qualifications in parallel
      const [staffData, expiringQualsData] = await Promise.all([
        usersService.getActiveEmployees(session.enterprise.id),
        staffHRService.getExpiringQualifications(selectedNursery.id, 90)
      ])

      // Enrich staff with qualification counts
      const enrichedStaff = await Promise.all(
        staffData.map(async (employee) => {
          const qualifications = await staffHRService.getQualifications(employee.id)
          const activeQuals = qualifications.filter((q) => q.is_active)
          const verifiedQuals = activeQuals.filter((q) => q.is_verified)

          // Count expiring qualifications (next 90 days)
          const today = new Date()
          const futureDate = new Date()
          futureDate.setDate(futureDate.getDate() + 90)
          const expiringCount = activeQuals.filter((q) => {
            if (!q.expiry_date) return false
            const expiryDate = new Date(q.expiry_date)
            return expiryDate >= today && expiryDate <= futureDate
          }).length

          return {
            ...employee,
            qualifications_count: activeQuals.length,
            verified_qualifications_count: verifiedQuals.length,
            expiring_qualifications_count: expiringCount
          }
        })
      )

      setStaff(enrichedStaff)
      setExpiringQualifications(expiringQualsData)
    } catch (error) {
      console.error('Error loading staff data:', error)
    } finally {
      setLoading(false)
    }
  }

  function applyFilters() {
    let filtered = staff

    // Filter by status
    if (filterStatus === 'active') {
      filtered = filtered.filter((s) => s.is_active)
    } else if (filterStatus === 'inactive') {
      filtered = filtered.filter((s) => !s.is_active)
    }

    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (s) =>
          s.first_name?.toLowerCase().includes(search) ||
          s.last_name?.toLowerCase().includes(search) ||
          s.email?.toLowerCase().includes(search)
      )
    }

    setFilteredStaff(filtered)
  }

  function getInitials(employee: ProfileWithRooms): string {
    const first = employee.first_name?.[0] || ''
    const last = employee.last_name?.[0] || ''
    return (first + last).toUpperCase()
  }

  function getQualificationStatusColor(employee: StaffWithQualifications): string {
    if (employee.expiring_qualifications_count > 0) return 'text-orange-600'
    if (employee.qualifications_count === 0) return 'text-gray-400'
    if (employee.verified_qualifications_count < employee.qualifications_count) return 'text-blue-500'
    return 'text-green-600'
  }

  function getQualificationBadgeVariant(employee: StaffWithQualifications): 'default' | 'success' | 'warning' | 'destructive' {
    if (employee.expiring_qualifications_count > 0) return 'warning'
    if (employee.qualifications_count === 0) return 'default'
    if (employee.verified_qualifications_count < employee.qualifications_count) return 'default'
    return 'success'
  }

  // Pastel color palette
  const staffColors = [
    { bg: 'bg-pink-50', border: 'border-pink-200', avatar: 'bg-pink-100' },
    { bg: 'bg-blue-50', border: 'border-blue-200', avatar: 'bg-blue-100' },
    { bg: 'bg-purple-50', border: 'border-purple-200', avatar: 'bg-purple-100' },
    { bg: 'bg-green-50', border: 'border-green-200', avatar: 'bg-green-100' },
    { bg: 'bg-yellow-50', border: 'border-yellow-200', avatar: 'bg-yellow-100' },
    { bg: 'bg-orange-50', border: 'border-orange-200', avatar: 'bg-orange-100' },
  ]

  const getStaffColor = (index: number) => staffColors[index % staffColors.length]

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement du personnel...</p>
        </div>
      </div>
    )
  }

  if (!session || !selectedNursery) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 text-center max-w-md">
          <UserGroupIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium mb-2">Aucune crèche sélectionnée</p>
          <p className="text-sm text-muted-foreground">
            Veuillez sélectionner une crèche pour voir le personnel.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Breadcrumb */}
      <PageBreadcrumb
        items={[
          { label: 'Accueil', href: '/owner/dashboard' },
          { label: 'Personnel', href: '/owner/staff' }
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-100">
            <UserGroupIcon className="w-6 h-6 text-blue-600" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Personnel</h1>
            <p className="text-sm text-muted-foreground">
              Gestion du personnel et des qualifications
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-white border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Personnel actif</p>
              <p className="text-3xl font-bold text-blue-600">
                {staff.filter((s) => s.is_active).length}
              </p>
            </div>
            <UserGroupIcon className="h-12 w-12 text-blue-300" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-green-50 to-white border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Qualifications</p>
              <p className="text-3xl font-bold text-green-600">
                {staff.reduce((sum, s) => sum + s.verified_qualifications_count, 0)}
              </p>
            </div>
            <AcademicCapIcon className="h-12 w-12 text-green-300" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-orange-50 to-white border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">À expirer (90j)</p>
              <p className="text-3xl font-bold text-orange-600">
                {expiringQualifications.length}
              </p>
            </div>
            <ExclamationTriangleIcon className="h-12 w-12 text-orange-300" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-purple-50 to-white border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Documents</p>
              <p className="text-3xl font-bold text-purple-600">
                {staff.length * 3}
              </p>
            </div>
            <DocumentTextIcon className="h-12 w-12 text-purple-300" />
          </div>
        </Card>
      </div>

      {/* Expiring Qualifications Alert */}
      {expiringQualifications.length > 0 && (
        <Card className="p-6 mb-6 bg-orange-50 border-orange-200">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="h-6 w-6 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-orange-900 mb-1">
                Qualifications à renouveler
              </h3>
              <p className="text-sm text-orange-700 mb-3">
                {expiringQualifications.length} qualification(s) expirent dans les 90 prochains jours
              </p>
              <div className="space-y-2">
                {expiringQualifications.slice(0, 3).map((qual) => {
                  const daysUntilExpiry = Math.ceil(
                    (new Date(qual.expiry_date!).getTime() - new Date().getTime()) /
                      (1000 * 60 * 60 * 24)
                  )
                  return (
                    <div
                      key={qual.id}
                      className="flex items-center justify-between p-2 bg-white rounded-lg"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {qual.employee_name}
                        </p>
                        <p className="text-xs text-gray-600">{qual.qualification_name}</p>
                      </div>
                      <Badge variant={daysUntilExpiry <= 30 ? 'destructive' : 'warning'}>
                        <ClockIcon className="h-3 w-3 mr-1" />
                        {daysUntilExpiry}j
                      </Badge>
                    </div>
                  )
                })}
                {expiringQualifications.length > 3 && (
                  <p className="text-xs text-orange-600 text-center pt-2">
                    +{expiringQualifications.length - 3} autre(s)
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Filters */}
      <Card className="p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Rechercher par nom ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={filterStatus === 'all' ? 'default' : 'outline'}
              onClick={() => setFilterStatus('all')}
              size="sm"
            >
              Tous ({staff.length})
            </Button>
            <Button
              variant={filterStatus === 'active' ? 'default' : 'outline'}
              onClick={() => setFilterStatus('active')}
              size="sm"
            >
              Actifs ({staff.filter((s) => s.is_active).length})
            </Button>
            <Button
              variant={filterStatus === 'inactive' ? 'default' : 'outline'}
              onClick={() => setFilterStatus('inactive')}
              size="sm"
            >
              Inactifs ({staff.filter((s) => !s.is_active).length})
            </Button>
          </div>
        </div>
      </Card>

      {/* Staff List */}
      {filteredStaff.length === 0 ? (
        <Card className="p-12 text-center">
          <UserGroupIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Aucun employé trouvé</h3>
          <p className="text-sm text-muted-foreground">
            {searchTerm
              ? 'Essayez de modifier vos critères de recherche'
              : 'Aucun employé ne correspond aux filtres sélectionnés'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStaff.map((employee, index) => {
            const colors = getStaffColor(index)
            return (
              <Card
                key={employee.id}
                className={`p-6 ${colors.bg} ${colors.border} border-2 hover:shadow-lg transition-all cursor-pointer`}
                onClick={() => router.push(`/owner/staff/${employee.id}/qualifications`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar className={`h-12 w-12 ${colors.avatar}`}>
                      <AvatarImage src={employee.avatar_url || undefined} />
                      <AvatarFallback className="text-gray-700">
                        {getInitials(employee)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {employee.first_name} {employee.last_name}
                      </h3>
                      <p className="text-xs text-gray-600">{employee.email}</p>
                    </div>
                  </div>
                  <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                </div>

                {/* Status Badge */}
                <div className="mb-4">
                  {employee.is_active ? (
                    <Badge variant="success" className="text-xs">
                      <CheckCircleIcon className="h-3 w-3 mr-1" />
                      Actif
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-xs">
                      <XCircleIcon className="h-3 w-3 mr-1" />
                      Inactif
                    </Badge>
                  )}
                </div>

                {/* Qualifications Summary */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 flex items-center gap-2">
                      <AcademicCapIcon className={`h-4 w-4 ${getQualificationStatusColor(employee)}`} />
                      Qualifications
                    </span>
                    <Badge variant={getQualificationBadgeVariant(employee)} className="text-xs">
                      {employee.verified_qualifications_count}/{employee.qualifications_count}
                    </Badge>
                  </div>

                  {employee.expiring_qualifications_count > 0 && (
                    <div className="flex items-center gap-2 p-2 bg-orange-100 rounded text-xs text-orange-700">
                      <ExclamationTriangleIcon className="h-4 w-4" />
                      {employee.expiring_qualifications_count} à renouveler
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 flex items-center gap-2">
                      <DocumentTextIcon className="h-4 w-4 text-gray-400" />
                      Documents
                    </span>
                    <span className="text-xs text-gray-500">3 fichiers</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 flex items-center gap-2">
                      <ShieldCheckIcon className="h-4 w-4 text-gray-400" />
                      Autorisations
                    </span>
                    <span className="text-xs text-gray-500">2 actives</span>
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
