'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  HomeIcon,
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline'

export const dynamic = 'force-dynamic'

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isLoading, setIsLoading] = useState(true)
  const [guardianUser, setGuardianUser] = useState<any>(null)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  // Public routes that don't require authentication
  const publicRoutes = ['/portal/login', '/portal/register']
  const isPublicRoute = publicRoutes.includes(pathname)

  useEffect(() => {
    checkAuth()
  }, [pathname])

  async function checkAuth() {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        if (!isPublicRoute) {
          router.push('/portal/login')
        }
        setIsLoading(false)
        return
      }

      // Fetch guardian_user data
      const { data: guardianUserData } = await supabase
        .from('guardian_user')
        .select(`
          *,
          guardian:guardian_id (*)
        `)
        .eq('user_id', user.id)
        .single()

      if (!guardianUserData) {
        if (!isPublicRoute) {
          router.push('/portal/login')
        }
        setIsLoading(false)
        return
      }

      setGuardianUser(guardianUserData)
      setIsLoading(false)

      // Redirect to home if on login page and authenticated
      if (isPublicRoute && guardianUserData) {
        router.push('/portal/home')
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      setIsLoading(false)
      if (!isPublicRoute) {
        router.push('/portal/login')
      }
    }
  }

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f8fbfd] to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#5a9dc9]/20 border-t-[#5a9dc9] mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  // Show public pages without navigation
  if (isPublicRoute) {
    return <>{children}</>
  }

  // Mobile-first layout with bottom navigation
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8fbfd] to-white pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/luniqo.png"
                alt="Luniqo"
                className="w-10 h-10 object-contain"
              />
              <span className="text-xl font-bold bg-gradient-to-r from-[#5a9dc9] to-[#2c5f7f] bg-clip-text text-transparent">
                Luniqo Parents
              </span>
            </div>
            {guardianUser && (
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {guardianUser.guardian?.first_name} {guardianUser.guardian?.last_name}
                </p>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40">
        <div className="max-w-4xl mx-auto px-2">
          <div className="flex items-center justify-around">
            <NavItem
              href="/portal/home"
              icon={<HomeIcon className="w-6 h-6" />}
              label="Accueil"
              isActive={pathname === '/portal/home'}
            />
            <NavItem
              href="/portal/children"
              icon={<UserGroupIcon className="w-6 h-6" />}
              label="Enfants"
              isActive={pathname.startsWith('/portal/children')}
            />
            <NavItem
              href="/portal/messages"
              icon={<ChatBubbleLeftRightIcon className="w-6 h-6" />}
              label="Messages"
              isActive={pathname.startsWith('/portal/messages')}
            />
            <NavItem
              href="/portal/documents"
              icon={<DocumentTextIcon className="w-6 h-6" />}
              label="Documents"
              isActive={pathname.startsWith('/portal/documents') || pathname.startsWith('/portal/invoices') || pathname.startsWith('/portal/certificates')}
            />
            <NavItem
              href="/portal/profile"
              icon={<UserCircleIcon className="w-6 h-6" />}
              label="Profil"
              isActive={pathname === '/portal/profile'}
            />
          </div>
        </div>
      </nav>
    </div>
  )
}

function NavItem({
  href,
  icon,
  label,
  isActive
}: {
  href: string
  icon: React.ReactNode
  label: string
  isActive: boolean
}) {
  const router = useRouter()

  return (
    <button
      onClick={() => router.push(href)}
      className={`flex flex-col items-center gap-1 py-3 px-4 transition-colors duration-200 ${
        isActive
          ? 'text-[#5a9dc9]'
          : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </button>
  )
}
