'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { XMarkIcon, BellIcon, CheckIcon } from '@heroicons/react/24/outline'
import { messagingService, Notification as DBNotification } from '@/lib/services/messaging.service'

interface NotificationModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  userRole: 'Owner' | 'Developer' | 'Employee'
  enterpriseId?: string
}

export default function NotificationModal({
  isOpen,
  onClose,
  userId,
  userRole,
  enterpriseId
}: NotificationModalProps) {
  const [notifications, setNotifications] = useState<DBNotification[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (isOpen) {
      loadNotifications()
    }
  }, [isOpen, userId])

  async function loadNotifications() {
    try {
      setIsLoading(true)

      // Récupérer les vraies notifications depuis la base de données
      const data = await messagingService.getNotifications(
        userRole,
        userId,
        enterpriseId
      )

      setNotifications(data)
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function markAsRead(notificationId: string) {
    try {
      // Marquer comme lu dans la BDD
      await messagingService.markNotificationAsRead(notificationId)

      // Mettre à jour l'état local
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, status: 'Read', read_at: new Date().toISOString() } : n)
      )
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  async function markAllAsRead() {
    try {
      // Marquer toutes les notifications comme lues dans la BDD
      await messagingService.markAllNotificationsAsRead(userRole, userId)

      // Mettre à jour l'état local
      setNotifications(prev =>
        prev.map(n => ({ ...n, status: 'Read' as const, read_at: new Date().toISOString() }))
      )
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  function getNotificationIcon(type: string | null, priority: string) {
    // Basé sur le type de notification
    if (type === 'module_access_request') return '🔐'
    if (type === 'task_assigned') return '📋'
    if (type === 'temperature_alert') return '🌡️'
    if (type === 'cleaning_reminder') return '🧹'
    if (type === 'message_received') return '💬'

    // Basé sur la priorité
    if (priority === 'Critical') return '❌'
    if (priority === 'Warning') return '⚠️'

    return '📢'
  }

  function getNotificationColor(priority: string, isRead: boolean) {
    if (isRead) return 'bg-neutral-50 border-neutral-200 text-neutral-900'

    switch (priority) {
      case 'Critical':
        return 'bg-danger-50 border-danger-200 text-danger-900'
      case 'Warning':
        return 'bg-accent-50 border-accent-200 text-accent-900'
      default:
        return 'bg-primary-50 border-primary-200 text-primary-900'
    }
  }

  function formatTimeAgo(date: string): string {
    const d = new Date(date)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'À l\'instant'
    if (diffMins < 60) return `Il y a ${diffMins} min`
    if (diffHours < 24) return `Il y a ${diffHours}h`
    if (diffDays < 7) return `Il y a ${diffDays}j`

    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Invisible backdrop for closing on outside click */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40"
          />

          {/* Notification Panel - Slide from top-right */}
          <motion.div
            initial={{ opacity: 0, x: 400, y: 0 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: 400, y: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-0 right-0 sm:top-4 sm:right-4 w-full sm:max-w-md h-screen sm:h-[calc(100vh-2rem)] bg-white sm:rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden border-l sm:border border-neutral-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-gradient-to-r from-primary-50 to-secondary-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                  <BellIcon className="w-6 h-6 text-primary-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-neutral-900">Notifications</h2>
                  <p className="text-sm text-neutral-600">
                    {notifications.filter(n => n.status === 'Unread').length} non lue{notifications.filter(n => n.status === 'Unread').length > 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {notifications.some(n => n.status === 'Unread') && (
                  <button
                    onClick={markAllAsRead}
                    className="px-2 sm:px-3 py-1.5 text-sm font-medium text-primary-600 hover:bg-primary-100 rounded-lg transition-colors flex items-center gap-1"
                    title="Tout marquer comme lu"
                  >
                    <CheckIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">Tout marquer comme lu</span>
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-neutral-100 transition-colors"
                  aria-label="Fermer"
                >
                  <XMarkIcon className="w-5 h-5 text-neutral-600" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-12">
                  <BellIcon className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-neutral-900 mb-2">
                    Aucune notification
                  </h3>
                  <p className="text-sm text-neutral-600">
                    Vous êtes à jour ! Aucune nouvelle notification pour le moment.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((notification) => {
                    const isRead = notification.status === 'Read'

                    return (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                          isRead ? 'opacity-60' : ''
                        } ${getNotificationColor(notification.priority, isRead)}`}
                        onClick={() => !isRead && markAsRead(notification.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="text-2xl flex-shrink-0">
                            {getNotificationIcon(notification.type, notification.priority)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h4 className="font-semibold text-sm">
                                {notification.title}
                              </h4>
                              {!isRead && (
                                <div className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0 mt-1" />
                              )}
                            </div>
                            <p className="text-sm mb-2">
                              {notification.content}
                            </p>
                            <p className="text-xs opacity-60">
                              {formatTimeAgo(notification.created_at)}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
