'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  CalendarIcon,
  UserGroupIcon,
  PhoneIcon,
  EnvelopeIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'

export default function ChildrenListPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [children, setChildren] = useState<any[]>([])
  const [guardianId, setGuardianId] = useState<string>('')

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadChildren()
  }, [])

  async function loadChildren() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/portal/login')
        return
      }

      // Get guardian_user
      const { data: guardianUser } = await supabase
        .from('guardian_user')
        .select('guardian_id')
        .eq('user_id', user.id)
        .single()

      if (!guardianUser) {
        router.push('/portal/login')
        return
      }

      setGuardianId((guardianUser as any).guardian_id)

      // Load children with family and nursery info
      const { data: childrenData } = await supabase
        .from('guardian_child')
        .select(`
          relationship,
          is_primary_contact,
          child:child_id (
            id,
            first_name,
            last_name,
            birth_date,
            photo_url,
            gender,
            group,
            enrollment_date,
            status,
            nursery:nursery_id (name, address, city, phone)
          )
        `)
        .eq('guardian_id', (guardianUser as any).guardian_id)

      if (childrenData) {
        setChildren(childrenData.filter((gc: any) => gc.child).map((gc: any) => ({
          ...gc.child,
          relationship: gc.relationship,
          is_primary_contact: gc.is_primary_contact
        })))
      }

      setIsLoading(false)
    } catch (error) {
      console.error('Failed to load children:', error)
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#5a9dc9]/20 border-t-[#5a9dc9] mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mes enfants</h1>
        <p className="text-gray-600 mt-1">
          {children.length} enfant{children.length > 1 ? 's' : ''} inscrit{children.length > 1 ? 's' : ''}
        </p>
      </div>

      {/* Children List */}
      {children.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-200">
          <UserGroupIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun enfant trouvé</h3>
          <p className="text-gray-600">
            Contactez votre crèche pour associer vos enfants à votre compte
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {children.map((child: any) => (
            <ChildCard
              key={child.id}
              child={child}
              onClick={() => router.push(`/portal/children/${child.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ChildCard({ child, onClick }: any) {
  const age = child.birth_date ? getAge(child.birth_date) : null
  const enrollmentDate = child.enrollment_date
    ? new Date(child.enrollment_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-2xl p-5 border border-gray-200 hover:border-[#5a9dc9] hover:shadow-lg transition-all duration-300 text-left"
    >
      <div className="flex items-start gap-4">
        {/* Photo */}
        {child.photo_url ? (
          <img
            src={child.photo_url}
            alt={`${child.first_name} ${child.last_name}`}
            className="w-20 h-20 rounded-2xl object-cover border-2 border-[#5a9dc9]/20"
          />
        ) : (
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#5a9dc9] to-[#2c5f7f] flex items-center justify-center text-white text-2xl font-bold">
            {child.first_name?.[0]}{child.last_name?.[0]}
          </div>
        )}

        {/* Info */}
        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">
                {child.first_name} {child.last_name}
              </h3>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                {age && (
                  <span className="flex items-center gap-1">
                    <CalendarIcon className="w-4 h-4" />
                    {age}
                  </span>
                )}
                {child.gender && (
                  <span className="capitalize">{child.gender === 'male' ? 'Garçon' : 'Fille'}</span>
                )}
              </div>
            </div>
            <ChevronRightIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-3">
            {child.group && (
              <span className="px-3 py-1 bg-[#5a9dc9]/10 text-[#2c5f7f] rounded-full text-xs font-medium">
                {child.group}
              </span>
            )}
            {child.relationship && (
              <span className="px-3 py-1 bg-[#f4a5a5]/10 text-[#c66b6b] rounded-full text-xs font-medium">
                {child.relationship}
              </span>
            )}
            {child.is_primary_contact && (
              <span className="px-3 py-1 bg-[#ffe5b4]/30 text-[#d4a05c] rounded-full text-xs font-medium">
                Contact principal
              </span>
            )}
            {child.status && (
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                child.status === 'active'
                  ? 'bg-[#b5e7a0]/30 text-[#4a8f5a]'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {child.status === 'active' ? 'Actif' : child.status}
              </span>
            )}
          </div>

          {/* Nursery Info */}
          {child.nursery && (
            <div className="pt-3 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-700 mb-1">{child.nursery.name}</p>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span>{child.nursery.city}</span>
                {child.nursery.phone && (
                  <span className="flex items-center gap-1">
                    <PhoneIcon className="w-3 h-3" />
                    {child.nursery.phone}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Enrollment Date */}
          {enrollmentDate && (
            <p className="text-xs text-gray-500 mt-2">
              Inscrit depuis le {enrollmentDate}
            </p>
          )}
        </div>
      </div>
    </button>
  )
}

function getAge(birthDate: string): string {
  const today = new Date()
  const birth = new Date(birthDate)
  const diffMs = today.getTime() - birth.getTime()
  const ageDate = new Date(diffMs)
  const years = Math.abs(ageDate.getUTCFullYear() - 1970)
  const months = ageDate.getUTCMonth()

  if (years > 0) {
    return `${years} an${years > 1 ? 's' : ''}`
  }
  return `${months} mois`
}
