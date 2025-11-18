'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/contexts/AuthContext'
import { getUserDisplayName } from '@/lib/utils/auth.client'
import { messagingService } from '@/lib/services/messaging.service'
import ThemeToggle from '@/components/theme/ThemeToggle'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BellIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline'

export default function Header() {
  const { session, logout } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const router = useRouter()

  const userDisplayName = session?.user ? getUserDisplayName(session.user) : 'User'
  const userRole = session?.role || 'User'

  const roleLabels = {
    Developer: 'Développeur',
    Admin: 'Administrateur',
    User: 'Employé'
  }

  const roleBadgeColors = {
    Developer: 'bg-accent-100 text-accent-700 border-accent-200',
    Admin: 'bg-primary-100 text-primary-700 border-primary-200',
    User: 'bg-success-100 text-success-700 border-success-200'
  }

  useEffect(() => {
    if (!session?.user?.id || !session.role) return

    loadUnreadCount()

    // Subscribe to real-time notifications
    const channel = messagingService.subscribeToNotifications(
      session.role as 'Developer' | 'Admin' | 'User',
      session.user.id,
      () => {
        loadUnreadCount()
      }
    )

    return () => {
      messagingService.unsubscribe(channel)
    }
  }, [session])

  async function loadUnreadCount() {
    if (!session?.user?.id || !session.role) return

    try {
      const count = await messagingService.getUnreadNotificationCount(
        session.role as 'Developer' | 'Admin' | 'User',
        session.user.id,
        session.enterprise?.id
      )
      setUnreadCount(count)
    } catch (err) {
      console.error('Error loading unread count:', err)
    }
  }

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <header className="h-16 bg-white/80 dark:bg-dark-100/80 backdrop-blur-xl border-b border-neutral-200 dark:border-dark-300 flex items-center justify-between px-6 sticky top-0 z-40">
      {/* Page title will be set by individual pages */}
      <div>
        {/* Placeholder - pages will inject their title here */}
      </div>

      {/* Right section */}
      <div className="flex items-center gap-3">
        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notifications */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => router.push('/dashboard/notifications')}
          className="relative p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-dark-200 transition-colors"
        >
          <BellIcon className="w-5 h-5 text-neutral-600 dark:text-dark-700" />

          {/* Animated notification badge */}
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-gradient-to-br from-danger-500 to-danger-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-lg"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        {/* User menu */}
        <div className="relative">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 pl-3 pr-2 py-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-dark-200 transition-colors"
          >
            <div className="text-right">
              <p className="text-sm font-semibold text-neutral-900 dark:text-dark-900">{userDisplayName}</p>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full border ${roleBadgeColors[userRole]}`}>
                {roleLabels[userRole]}
              </span>
            </div>

            {/* Avatar with initials */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
              {getInitials(userDisplayName)}
            </div>
          </motion.button>

          {/* Dropdown menu with Framer Motion */}
          <AnimatePresence>
            {showUserMenu && (
              <>
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-10"
                  onClick={() => setShowUserMenu(false)}
                />

                {/* Menu */}
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-64 bg-white/95 dark:bg-dark-100/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-neutral-200 dark:border-dark-300 py-2 z-20 overflow-hidden"
                >
                  {/* Header with gradient */}
                  <div className="px-4 py-3 bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-dark-200 dark:to-dark-200 border-b border-neutral-200 dark:border-dark-300">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold shadow-md">
                        {getInitials(userDisplayName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-neutral-900 dark:text-dark-900 truncate">{userDisplayName}</p>
                        <p className="text-xs text-neutral-600 dark:text-dark-600 truncate">{session?.user?.email || 'Pas d\'email'}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full border ${roleBadgeColors[userRole]}`}>
                      {roleLabels[userRole]}
                    </span>
                  </div>

                  <div className="py-1">
                    <motion.a
                      whileHover={{ x: 4 }}
                      href="/dashboard/profile"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 dark:text-dark-700 hover:bg-neutral-100 dark:hover:bg-dark-200 transition-colors"
                    >
                      <UserCircleIcon className="w-5 h-5 text-neutral-500 dark:text-dark-500" />
                      <span className="font-medium">Mon profil</span>
                    </motion.a>

                    <motion.button
                      whileHover={{ x: 4 }}
                      onClick={() => {
                        setShowUserMenu(false)
                        logout()
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20 transition-colors"
                    >
                      <ArrowRightOnRectangleIcon className="w-5 h-5" />
                      <span className="font-medium">Déconnexion</span>
                    </motion.button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}
