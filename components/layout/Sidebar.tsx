'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/contexts/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
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
    <motion.div
      initial={false}
      animate={{ width: collapsed ? 80 : 256 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="fixed left-0 top-0 h-screen bg-white/80 dark:bg-dark-100/80 backdrop-blur-xl border-r border-neutral-200 dark:border-dark-300 z-50"
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-neutral-200 dark:border-dark-300">
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                  <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-xl font-bold gradient-text" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                cLean
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-dark-200 transition-colors"
        >
          {collapsed ? (
            <ChevronRightIcon className="w-5 h-5 text-neutral-600 dark:text-dark-600" />
          ) : (
            <ChevronLeftIcon className="w-5 h-5 text-neutral-600 dark:text-dark-600" />
          )}
        </motion.button>
      </div>

      {/* Enterprise Info */}
      <AnimatePresence>
        {!collapsed && enterprise && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-neutral-200 dark:border-dark-300 bg-gradient-to-br from-primary-50/50 to-secondary-50/50 dark:from-dark-200/50 dark:to-dark-200/50">
              <p className="text-xs font-semibold text-neutral-500 dark:text-dark-500 uppercase tracking-wider mb-1">Crèche</p>
              <p className="text-sm font-bold text-neutral-900 dark:text-dark-900 truncate">{enterprise.name}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {filteredNav.map((item, index) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
          const Icon = item.icon

          return (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link
                href={item.href}
                className={`
                  group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
                  ${isActive
                    ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/30'
                    : 'text-neutral-700 dark:text-dark-700 hover:bg-neutral-100 dark:hover:bg-dark-200'
                  }
                  ${collapsed ? 'justify-center' : ''}
                `}
              >
                {/* Active indicator */}
                {isActive && !collapsed && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}

                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-neutral-500 dark:text-dark-500 group-hover:text-primary-500 dark:group-hover:text-primary-400'} transition-colors`} />

                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      className={`text-sm font-semibold whitespace-nowrap overflow-hidden ${isActive ? 'text-white' : ''}`}
                    >
                      {item.name}
                    </motion.span>
                  )}
                </AnimatePresence>

                {/* Hover tooltip for collapsed state */}
                {collapsed && (
                  <div className="absolute left-full ml-2 px-3 py-2 bg-neutral-900 dark:bg-dark-200 text-white dark:text-dark-900 text-sm font-medium rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-xl">
                    {item.name}
                  </div>
                )}
              </Link>
            </motion.div>
          )
        })}
      </nav>

      {/* Settings */}
      <div className="p-3 border-t border-neutral-200 dark:border-dark-300">
        <Link
          href="/dashboard/settings"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-neutral-700 dark:text-dark-700 hover:bg-neutral-100 dark:hover:bg-dark-200 transition-colors ${collapsed ? 'justify-center' : ''}`}
          title={collapsed ? 'Paramètres' : undefined}
        >
          <Cog6ToothIcon className="w-5 h-5 text-neutral-500 dark:text-dark-500" />
          {!collapsed && <span className="text-sm font-semibold">Paramètres</span>}
        </Link>
      </div>

      {/* Footer with version */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-4 border-t border-neutral-200 dark:border-dark-300"
          >
            <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-dark-500">
              <div className="w-2 h-2 rounded-full bg-success-500 animate-pulse"></div>
              <span>v1.0.0 • SaaS 2025</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
