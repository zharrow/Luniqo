'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/contexts/AuthContext'
import { messagingService, type Notification } from '@/lib/services/messaging.service'
import { PageBreadcrumb } from '@/components/shared/PageBreadcrumb'

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const { session } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!session?.user?.id) return

    loadNotifications()

    // Subscribe to real-time notifications
    const channel = messagingService.subscribeToNotifications(
      session.role as 'Developer' | 'Owner' | 'Employee',
      session.user.id,
      (notification) => {
        setNotifications((prev) => [notification, ...prev])
      }
    )

    return () => {
      messagingService.unsubscribe(channel)
    }
  }, [session])

  async function loadNotifications() {
    if (!session?.user?.id || !session.role) return

    try {
      setIsLoading(true)
      const data = await messagingService.getNotifications(
        session.role as 'Developer' | 'Owner' | 'Employee',
        session.user.id,
        session.enterprise?.id
      )
      setNotifications(data)
    } catch (err: any) {
      console.error('Error loading notifications:', err)
      setError('Erreur lors du chargement des notifications')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleMarkAsRead(notificationId: string) {
    try {
      await messagingService.markNotificationAsRead(notificationId)
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, status: 'Read' as const } : n))
      )
    } catch (err: any) {
      console.error('Error marking notification as read:', err)
    }
  }

  async function handleMarkAllAsRead() {
    if (!session?.user?.id || !session.role) return

    try {
      await messagingService.markAllNotificationsAsRead(
        session.role as 'Developer' | 'Owner' | 'Employee',
        session.user.id
      )
      setNotifications((prev) => prev.map((n) => ({ ...n, status: 'Read' as const })))
    } catch (err: any) {
      console.error('Error marking all as read:', err)
      setError('Erreur lors du marquage')
    }
  }

  async function handleDelete(notificationId: string) {
    try {
      await messagingService.deleteNotification(notificationId)
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
    } catch (err: any) {
      console.error('Error deleting notification:', err)
    }
  }

  function handleNotificationClick(notification: Notification) {
    // Mark as read
    if (notification.status === 'Unread') {
      handleMarkAsRead(notification.id)
    }

    // Navigate to resource if available
    if (notification.resource_type && notification.resource_id) {
      switch (notification.resource_type) {
        case 'session':
          router.push(`/owner/sessions/${notification.resource_id}`)
          break
        case 'conversation':
          router.push(`/owner/messages/${notification.resource_id}`)
          break
        case 'meal':
          router.push('/owner/haccp/meals')
          break
        case 'temperature':
          router.push('/owner/haccp/temperatures')
          break
        case 'haccp_incident':
          router.push('/owner/haccp/non-compliances')
          break
        default:
          break
      }
    }
  }

  function formatDate(date: string): string {
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

  function getPriorityColor(priority: string): { border: string; bg: string; iconBg: string; iconColor: string } {
    switch (priority) {
      case 'Critical':
        return {
          border: '#f8717133',
          bg: 'linear-gradient(to bottom right, #fef2f2, white)',
          iconBg: 'linear-gradient(to bottom right, #f871711A, #f871710D)',
          iconColor: '#d84848'
        }
      case 'Warning':
        return {
          border: '#ffe5b433',
          bg: 'linear-gradient(to bottom right, #fffbeb, white)',
          iconBg: 'linear-gradient(to bottom right, #ffe5b41A, #ffe5b40D)',
          iconColor: '#d4a929'
        }
      default:
        return {
          border: '#80deea33',
          bg: 'linear-gradient(to bottom right, #f0fdff, white)',
          iconBg: 'linear-gradient(to bottom right, #80deea1A, #80deea0D)',
          iconColor: '#2c8a99'
        }
    }
  }

  function getPriorityIcon(priority: string): React.ReactNode {
    switch (priority) {
      case 'Critical':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        )
      case 'Warning':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        )
      default:
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
        )
    }
  }

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return n.status === 'Unread'
    if (filter === 'read') return n.status === 'Read'
    return true
  })

  const unreadCount = notifications.filter((n) => n.status === 'Unread').length

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-200 border-t-primary-500 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <PageBreadcrumb
        items={[
          { label: 'Dashboard', href: '/owner/dashboard' },
          { label: 'Notifications' }
        ]}
      />

      {/* Header - Style organique */}
      <div
        className="relative rounded-3xl p-6 mb-8 bg-white overflow-hidden"
        style={{
          border: '1px solid #80deea33',
          background: 'linear-gradient(to bottom right, #f0fdff, white)'
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className="inline-flex items-center justify-center w-14 h-14 rounded-2xl"
              style={{ background: 'linear-gradient(to bottom right, #80deea1A, #80deea0D)' }}
            >
              <svg className="w-7 h-7" style={{ color: '#2c8a99' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-1 bg-gradient-to-r from-cyan-600 to-teal-700 bg-clip-text text-transparent">
                Notifications
              </h1>
              <p className="text-muted-foreground">
                {unreadCount > 0 ? `${unreadCount} non lue(s)` : 'Toutes vos notifications'}
              </p>
            </div>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="px-4 py-2 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 hover:from-cyan-600 hover:to-teal-700 text-white font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 inline-flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Tout marquer comme lu
            </button>
          )}
        </div>
      </div>

      {/* Error Message - Style organique */}
      {error && (
        <div
          className="relative rounded-3xl p-4 mb-6 bg-white overflow-hidden"
          style={{
            border: '1px solid #f8717133',
            background: 'linear-gradient(to bottom right, #fef2f2, white)'
          }}
        >
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Filters - Style organique */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-5 py-2.5 rounded-xl font-semibold transition-all duration-300 ${
            filter === 'all'
              ? 'bg-gradient-to-br from-cyan-500 to-teal-600 text-white shadow-lg scale-105'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 hover:border-cyan-300'
          }`}
        >
          Toutes ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-5 py-2.5 rounded-xl font-semibold transition-all duration-300 ${
            filter === 'unread'
              ? 'bg-gradient-to-br from-cyan-500 to-teal-600 text-white shadow-lg scale-105'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 hover:border-cyan-300'
          }`}
        >
          Non lues ({unreadCount})
        </button>
        <button
          onClick={() => setFilter('read')}
          className={`px-5 py-2.5 rounded-xl font-semibold transition-all duration-300 ${
            filter === 'read'
              ? 'bg-gradient-to-br from-cyan-500 to-teal-600 text-white shadow-lg scale-105'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 hover:border-cyan-300'
          }`}
        >
          Lues ({notifications.length - unreadCount})
        </button>
      </div>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <div
          className="relative rounded-3xl p-12 bg-white overflow-hidden text-center"
          style={{
            border: '1px solid #80deea33',
            background: 'linear-gradient(to bottom right, #f0fdff, white)'
          }}
        >
          <svg
            className="w-24 h-24 mx-auto mb-4"
            style={{ color: '#80deea40' }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          <h2 className="text-2xl font-bold mb-2 text-gray-900">Aucune notification</h2>
          <p className="text-muted-foreground">
            {filter === 'unread'
              ? 'Toutes vos notifications ont été lues'
              : 'Vous n\'avez pas encore de notifications'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => {
            const colors = getPriorityColor(notification.priority)
            return (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className="relative rounded-3xl p-5 bg-white hover:-translate-y-1 transition-all duration-300 cursor-pointer group overflow-hidden"
                style={{
                  border: `1px solid ${colors.border}`,
                  boxShadow: notification.status === 'Unread' ? '0 4px 12px rgba(128,222,234,0.15)' : '0 0 0 0 rgba(128,222,234,0.25)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 12px 32px -8px rgba(128,222,234,0.25)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = notification.status === 'Unread' ? '0 4px 12px rgba(128,222,234,0.15)' : '0 0 0 0 rgba(128,222,234,0.25)'
                }}
              >
                {/* Gradient fond */}
                <div
                  className="absolute inset-0 opacity-60"
                  style={{ background: colors.bg }}
                />

                <div className="relative z-10 flex items-start gap-4">
                  {/* Priority Icon */}
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm"
                    style={{ background: colors.iconBg }}
                  >
                    <div style={{ color: colors.iconColor }}>
                      {getPriorityIcon(notification.priority)}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="text-lg font-bold text-gray-900">{notification.title}</h3>
                      <span className="text-sm text-muted-foreground ml-2 flex-shrink-0">
                        {formatDate(notification.created_at)}
                      </span>
                    </div>
                    <p className="mb-2 text-gray-700">{notification.content}</p>
                    {notification.type && (
                      <span
                        className="inline-block px-3 py-1 rounded-full text-xs font-semibold"
                        style={{
                          backgroundColor: `${colors.iconColor}1A`,
                          color: colors.iconColor
                        }}
                      >
                        {notification.type}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {notification.status === 'Unread' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleMarkAsRead(notification.id)
                        }}
                        className="p-2 hover:bg-cyan-100 rounded-xl transition-all duration-300 hover:scale-110"
                        title="Marquer comme lu"
                      >
                        <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(notification.id)
                      }}
                      className="p-2 hover:bg-red-100 rounded-xl transition-all duration-300 hover:scale-110"
                      title="Supprimer"
                    >
                      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Unread Indicator */}
                {notification.status === 'Unread' && (
                  <div
                    className="absolute top-5 right-5 w-3 h-3 rounded-full animate-pulse"
                    style={{ backgroundColor: colors.iconColor }}
                  ></div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
