'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { XMarkIcon, BellIcon, CheckIcon } from '@heroicons/react/24/outline'
import { messagingService } from '@/lib/services/messaging.service'

interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  created_at: string
  read: boolean
}

interface NotificationModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  userRole: 'Admin' | 'Developer' | 'User'
  enterpriseId?: string
}

export default function NotificationModal({
  isOpen,
  onClose,
  userId,
  userRole,
  enterpriseId
}: NotificationModalProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (isOpen) {
      loadNotifications()
    }
  }, [isOpen, userId])

  async function loadNotifications() {
    try {
      setIsLoading(true)
      const count = await messagingService.getUnreadNotificationCount(
        userRole,
        userId,
        enterpriseId
      )

      // Pour le moment, on crée des notifications de démo
      // TODO: Implémenter la vraie récupération depuis la BDD
      const demoNotifications: Notification[] = count > 0 ? [
        {
          id: '1',
          title: 'Nouvelle tâche assignée',
          message: 'Une nouvelle tâche de nettoyage a été assignée à votre équipe.',
          type: 'info',
          created_at: new Date().toISOString(),
          read: false
        },
        {
          id: '2',
          title: 'Température non conforme',
          message: 'Alerte: température hors norme détectée pour le repas du midi.',
          type: 'warning',
          created_at: new Date(Date.now() - 3600000).toISOString(),
          read: false
        }
      ] : []

      setNotifications(demoNotifications)
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function markAsRead(notificationId: string) {
    // TODO: Implémenter le marquage comme lu dans la BDD
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    )
  }

  async function markAllAsRead() {
    // TODO: Implémenter le marquage de toutes les notifications comme lues
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  function getNotificationIcon(type: string) {
    switch (type) {
      case 'success':
        return '✅'
      case 'warning':
        return '⚠️'
      case 'error':
        return '❌'
      default:
        return '📢'
    }
  }

  function getNotificationColor(type: string) {
    switch (type) {
      case 'success':
        return 'bg-success-50 border-success-200 text-success-900'
      case 'warning':
        return 'bg-accent-50 border-accent-200 text-accent-900'
      case 'error':
        return 'bg-danger-50 border-danger-200 text-danger-900'
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
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[80vh] bg-white rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden"
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
                    {notifications.filter(n => !n.read).length} non lue{notifications.filter(n => !n.read).length > 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {notifications.some(n => !n.read) && (
                  <button
                    onClick={markAllAsRead}
                    className="px-3 py-1.5 text-sm font-medium text-primary-600 hover:bg-primary-100 rounded-lg transition-colors"
                  >
                    <CheckIcon className="w-4 h-4 inline mr-1" />
                    Tout marquer comme lu
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-neutral-100 transition-colors"
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
                  {notifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                        notification.read
                          ? 'bg-neutral-50 border-neutral-200 opacity-60'
                          : getNotificationColor(notification.type)
                      }`}
                      onClick={() => !notification.read && markAsRead(notification.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-2xl flex-shrink-0">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className="font-semibold text-sm">
                              {notification.title}
                            </h4>
                            {!notification.read && (
                              <div className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0 mt-1" />
                            )}
                          </div>
                          <p className="text-sm mb-2">
                            {notification.message}
                          </p>
                          <p className="text-xs opacity-60">
                            {formatTimeAgo(notification.created_at)}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
