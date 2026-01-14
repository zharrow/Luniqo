'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  UserCircleIcon,
  BellIcon,
  DevicePhoneMobileIcon,
  EnvelopeIcon,
  PhoneIcon,
  ArrowRightOnRectangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'

export default function ProfilePage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [guardian, setGuardian] = useState<any>(null)
  const [guardianUser, setGuardianUser] = useState<any>(null)
  const [children, setChildren] = useState<any[]>([])
  const [notifications, setNotifications] = useState({
    push_notifications_enabled: true,
    email_notifications_enabled: true,
    sms_notifications_enabled: false,
    notifications_sound_enabled: true,
    notifications_vibration_enabled: true
  })
  const [saveSuccess, setSaveSuccess] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/portal/login')
        return
      }

      // Get guardian_user
      const { data: guardianUserData } = await supabase
        .from('guardian_user')
        .select(`
          *,
          guardian:guardian_id (*)
        `)
        .eq('user_id', user.id)
        .single()

      if (!guardianUserData) {
        router.push('/portal/login')
        return
      }

      setGuardianUser(guardianUserData)
      setGuardian((guardianUserData as any).guardian)

      // Set notifications preferences
      setNotifications({
        push_notifications_enabled: (guardianUserData as any).push_notifications_enabled ?? true,
        email_notifications_enabled: (guardianUserData as any).email_notifications_enabled ?? true,
        sms_notifications_enabled: (guardianUserData as any).sms_notifications_enabled ?? false,
        notifications_sound_enabled: (guardianUserData as any).notifications_sound_enabled ?? true,
        notifications_vibration_enabled: (guardianUserData as any).notifications_vibration_enabled ?? true
      })

      // Load children
      const { data: childrenData } = await supabase
        .from('guardian_child')
        .select(`
          child:child_id (
            id,
            first_name,
            last_name,
            birth_date,
            photo_url
          )
        `)
        .eq('guardian_id', (guardianUserData as any).guardian_id)

      if (childrenData) {
        setChildren(childrenData.map((gc: any) => gc.child).filter(Boolean))
      }

      setIsLoading(false)
    } catch (error) {
      console.error('Failed to load profile:', error)
      setIsLoading(false)
    }
  }

  async function handleSaveNotifications() {
    if (!guardianUser) return

    setIsSaving(true)
    setSaveSuccess(false)

    try {
      const { error } = await supabase
        .from('guardian_user')
        .update(notifications as never)
        .eq('guardian_id', (guardianUser as any).guardian_id)
        .eq('user_id', (guardianUser as any).user_id)

      if (error) throw error

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (error) {
      console.error('Failed to save notifications:', error)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/portal/login')
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
        <h1 className="text-2xl font-bold text-gray-900">Mon profil</h1>
        <p className="text-gray-600 mt-1">Gérez vos informations et préférences</p>
      </div>

      {/* Profile Info */}
      <section className="bg-white rounded-2xl p-6 border border-gray-200">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#5a9dc9] to-[#2c5f7f] flex items-center justify-center text-white font-bold text-2xl">
            {guardian?.first_name?.[0]}{guardian?.last_name?.[0]}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              {guardian?.first_name} {guardian?.last_name}
            </h2>
            <p className="text-sm text-gray-600">{guardian?.email}</p>
          </div>
        </div>

        <div className="space-y-3 border-t border-gray-100 pt-4">
          {guardian?.phone_primary && (
            <div className="flex items-center gap-3 text-sm">
              <PhoneIcon className="w-5 h-5 text-gray-400" />
              <span className="text-gray-700">{guardian.phone_primary}</span>
            </div>
          )}
          {guardian?.email && (
            <div className="flex items-center gap-3 text-sm">
              <EnvelopeIcon className="w-5 h-5 text-gray-400" />
              <span className="text-gray-700">{guardian.email}</span>
            </div>
          )}
        </div>
      </section>

      {/* Children */}
      <section className="bg-white rounded-2xl p-6 border border-gray-200">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Mes enfants</h2>
        {children.length === 0 ? (
          <p className="text-gray-500 text-sm">Aucun enfant associé</p>
        ) : (
          <div className="space-y-3">
            {children.map((child: any) => (
              <div key={child.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                {child.photo_url ? (
                  <img
                    src={child.photo_url}
                    alt={child.first_name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#f4a5a5] to-[#d88989] flex items-center justify-center text-white font-bold">
                    {child.first_name?.[0]}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-gray-900">
                    {child.first_name} {child.last_name}
                  </p>
                  {child.birth_date && (
                    <p className="text-xs text-gray-500">
                      {getAge(child.birth_date)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Notifications Settings */}
      <section className="bg-white rounded-2xl p-6 border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <BellIcon className="w-6 h-6 text-gray-700" />
          <h2 className="text-lg font-bold text-gray-900">Notifications</h2>
        </div>

        <div className="space-y-4">
          <NotificationToggle
            icon={<DevicePhoneMobileIcon className="w-5 h-5" />}
            label="Notifications push"
            description="Recevoir des notifications sur votre appareil"
            checked={notifications.push_notifications_enabled}
            onChange={(checked) =>
              setNotifications({ ...notifications, push_notifications_enabled: checked })
            }
          />

          <NotificationToggle
            icon={<EnvelopeIcon className="w-5 h-5" />}
            label="Notifications email"
            description="Recevoir des notifications par email"
            checked={notifications.email_notifications_enabled}
            onChange={(checked) =>
              setNotifications({ ...notifications, email_notifications_enabled: checked })
            }
          />

          <NotificationToggle
            icon={<PhoneIcon className="w-5 h-5" />}
            label="Notifications SMS"
            description="Recevoir des notifications par SMS"
            checked={notifications.sms_notifications_enabled}
            onChange={(checked) =>
              setNotifications({ ...notifications, sms_notifications_enabled: checked })
            }
          />

          <div className="border-t border-gray-100 pt-4 mt-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Paramètres supplémentaires</p>

            <NotificationToggle
              label="Son des notifications"
              checked={notifications.notifications_sound_enabled}
              onChange={(checked) =>
                setNotifications({ ...notifications, notifications_sound_enabled: checked })
              }
            />

            <NotificationToggle
              label="Vibration"
              checked={notifications.notifications_vibration_enabled}
              onChange={(checked) =>
                setNotifications({ ...notifications, notifications_vibration_enabled: checked })
              }
            />
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSaveNotifications}
          disabled={isSaving}
          className="w-full mt-6 px-6 py-3 bg-gradient-to-r from-[#5a9dc9] to-[#2c5f7f] text-white rounded-xl hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSaving ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              Enregistrement...
            </>
          ) : saveSuccess ? (
            <>
              <CheckCircleIcon className="w-5 h-5" />
              Enregistré !
            </>
          ) : (
            'Enregistrer les préférences'
          )}
        </button>
      </section>

      {/* Logout */}
      <section className="bg-white rounded-2xl p-6 border border-gray-200">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"
        >
          <ArrowRightOnRectangleIcon className="w-5 h-5" />
          Se déconnecter
        </button>
      </section>
    </div>
  )
}

function NotificationToggle({
  icon,
  label,
  description,
  checked,
  onChange
}: {
  icon?: React.ReactNode
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      {icon && <div className="text-gray-500 flex-shrink-0 mt-0.5">{icon}</div>}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900">{label}</p>
        {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          checked ? 'bg-[#5a9dc9]' : 'bg-gray-200'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
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
