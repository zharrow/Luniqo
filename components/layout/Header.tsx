'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/contexts/AuthContext'
import { getUserDisplayName } from '@/lib/utils/auth.client'
import {
  BellIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline'

export default function Header() {
  const { session, logout } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)

  const userDisplayName = session?.user ? getUserDisplayName(session.user) : 'User'
  const userRole = session?.role || 'User'

  const roleLabels = {
    Developer: 'Développeur',
    Admin: 'Administrateur',
    User: 'Employé'
  }

  return (
    <header className="h-16 bg-white border-b border-neutral-200 flex items-center justify-between px-6">
      {/* Page title will be set by individual pages */}
      <div>
        {/* Placeholder - pages will inject their title here */}
      </div>

      {/* Right section */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-neutral-100 transition-colors">
          <BellIcon className="w-6 h-6 text-neutral-600" />
          {/* Notification badge */}
          <span className="absolute top-1 right-1 w-2 h-2 bg-danger-500 rounded-full"></span>
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-100 transition-colors"
          >
            <div className="text-right">
              <p className="text-sm font-medium text-neutral-900">{userDisplayName}</p>
              <p className="text-xs text-neutral-500">{roleLabels[userRole]}</p>
            </div>
            <UserCircleIcon className="w-8 h-8 text-neutral-400" />
          </button>

          {/* Dropdown menu */}
          {showUserMenu && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowUserMenu(false)}
              ></div>

              {/* Menu */}
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-neutral-200 py-2 z-20 animate-slide-down">
                <div className="px-4 py-3 border-b border-neutral-100">
                  <p className="text-sm font-medium text-neutral-900">{userDisplayName}</p>
                  <p className="text-xs text-neutral-500">{session?.user?.email || 'Pas d\'email'}</p>
                </div>

                <div className="py-1">
                  <a
                    href="/dashboard/profile"
                    className="flex items-center gap-3 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                  >
                    <UserCircleIcon className="w-5 h-5 text-neutral-500" />
                    Mon profil
                  </a>

                  <button
                    onClick={() => {
                      setShowUserMenu(false)
                      logout()
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-danger-600 hover:bg-danger-50"
                  >
                    <ArrowRightOnRectangleIcon className="w-5 h-5" />
                    Déconnexion
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
