'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/contexts/AuthContext'
import {
  HomeIcon,
  BuildingOfficeIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
  CalendarIcon,
  ClockIcon,
  BeakerIcon,
  ChatBubbleLeftRightIcon,
  BellIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'

interface NavItem {
  name: string
  href: string
  icon: any
  roles?: ('Developer' | 'Admin')[]
}

const navigation: NavItem[] = [
  { name: 'Tableau de bord', href: '/dashboard', icon: HomeIcon, roles: ['Admin'] },
  { name: 'Pièces', href: '/dashboard/rooms', icon: BuildingOfficeIcon, roles: ['Admin'] },
  { name: 'Tâches', href: '/dashboard/tasks', icon: ClipboardDocumentListIcon, roles: ['Admin'] },
  { name: 'Employés', href: '/dashboard/users', icon: UserGroupIcon, roles: ['Admin'] },
  { name: 'Sessions', href: '/dashboard/sessions', icon: CalendarIcon, roles: ['Admin'] },
  { name: 'Historique', href: '/dashboard/history', icon: ClockIcon, roles: ['Admin'] },
  { name: 'HACCP', href: '/dashboard/haccp', icon: BeakerIcon, roles: ['Admin'] },
  { name: 'Messages', href: '/dashboard/messages', icon: ChatBubbleLeftRightIcon, roles: ['Admin', 'Developer'] },
  { name: 'Notifications', href: '/dashboard/notifications', icon: BellIcon, roles: ['Admin', 'Developer'] },
  { name: 'Analytics', href: '/analytics', icon: ChartBarIcon, roles: ['Developer'] },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const { role, enterprise } = useAuth()

  // Filter navigation based on role
  const filteredNav = navigation.filter(item =>
    !item.roles || item.roles.includes(role as any)
  )

  return (
    <div
      className={`fixed left-0 top-0 h-screen bg-white border-r border-neutral-200 transition-all duration-300 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-neutral-200">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-lg font-bold text-neutral-900" style={{ fontFamily: 'Quicksand, sans-serif' }}>
              cLean
            </span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
        >
          {collapsed ? (
            <ChevronRightIcon className="w-5 h-5 text-neutral-600" />
          ) : (
            <ChevronLeftIcon className="w-5 h-5 text-neutral-600" />
          )}
        </button>
      </div>

      {/* Enterprise Info */}
      {!collapsed && enterprise && (
        <div className="px-4 py-3 border-b border-neutral-200 bg-neutral-50">
          <p className="text-xs text-neutral-500 mb-1">Crèche</p>
          <p className="text-sm font-medium text-neutral-900 truncate">{enterprise.name}</p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {filteredNav.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
            const Icon = item.icon

            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                    isActive
                      ? 'bg-primary-50 text-primary-700 font-medium'
                      : 'text-neutral-700 hover:bg-neutral-50'
                  }`}
                  title={collapsed ? item.name : undefined}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-primary-600' : 'text-neutral-500'}`} />
                  {!collapsed && <span>{item.name}</span>}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Settings */}
      <div className="p-3 border-t border-neutral-200">
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-neutral-700 hover:bg-neutral-50 transition-colors"
          title={collapsed ? 'Paramètres' : undefined}
        >
          <Cog6ToothIcon className="w-5 h-5 text-neutral-500" />
          {!collapsed && <span>Paramètres</span>}
        </Link>
      </div>
    </div>
  )
}
