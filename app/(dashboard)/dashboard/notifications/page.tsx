'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/contexts/AuthContext'
import { messagingService, type Notification } from '@/lib/services/messaging.service'

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
      session.role as 'Developer' | 'Admin' | 'User',
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
        session.role as 'Developer' | 'Admin' | 'User',
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
        session.role as 'Developer' | 'Admin' | 'User',
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
          router.push(`/dashboard/sessions/${notification.resource_id}`)
          break
        case 'conversation':
          router.push(`/dashboard/messages/${notification.resource_id}`)
          break
        case 'meal':
          router.push('/dashboard/haccp/meals')
          break
        case 'temperature':
          router.push('/dashboard/haccp/temperatures')
          break
        case 'haccp_incident':
          router.push('/dashboard/haccp/non-compliances')
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

  function getPriorityColor(priority: string): string {
    switch (priority) {
      case 'Critical':
        return 'bg-danger-100 text-danger-600 border-danger-200'
      case 'Warning':
        return 'bg-warning-100 text-warning-600 border-warning-200'
      default:
        return 'bg-info-100 text-info-600 border-info-200'
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
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Notifications</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} non lue(s)` : 'Toutes vos notifications'}
          </p>
        </div>

        {unreadCount > 0 && (
          <button onClick={handleMarkAllAsRead} className="btn btn-secondary">
            <svg className="w-5 h-5 mr-2 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            Tout marquer comme lu
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="card p-4 mb-6 bg-danger-50 border-2 border-danger-200">
          <p className="text-danger-700">{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-semibold transition-all ${
            filter === 'all'
              ? 'bg-primary-500 text-white'
              : 'bg-card text-foreground hover:bg-muted'
          }`}
        >
          Toutes ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-4 py-2 rounded-lg font-semibold transition-all ${
            filter === 'unread'
              ? 'bg-primary-500 text-white'
              : 'bg-card text-foreground hover:bg-muted'
          }`}
        >
          Non lues ({unreadCount})
        </button>
        <button
          onClick={() => setFilter('read')}
          className={`px-4 py-2 rounded-lg font-semibold transition-all ${
            filter === 'read'
              ? 'bg-primary-500 text-white'
              : 'bg-card text-foreground hover:bg-muted'
          }`}
        >
          Lues ({notifications.length - unreadCount})
        </button>
      </div>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <div className="card p-12 text-center">
          <svg
            className="w-24 h-24 mx-auto mb-4 text-muted-foreground/30"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          <h2 className="text-2xl font-bold mb-2">Aucune notification</h2>
          <p className="text-muted-foreground">
            {filter === 'unread'
              ? 'Toutes vos notifications ont été lues'
              : 'Vous n\'avez pas encore de notifications'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={`card p-4 hover:shadow-lg transition-all cursor-pointer relative ${
                notification.status === 'Unread' ? 'bg-primary-50 border-2 border-primary-200' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Priority Icon */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border-2 ${getPriorityColor(
                    notification.priority
                  )}`}
                >
                  {getPriorityIcon(notification.priority)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="text-lg font-bold">{notification.title}</h3>
                    <span className="text-sm text-muted-foreground ml-2 flex-shrink-0">
                      {formatDate(notification.created_at)}
                    </span>
                  </div>
                  <p className="mb-2">{notification.content}</p>
                  {notification.type && (
                    <span className="inline-block px-3 py-1 bg-muted text-muted-foreground rounded-full text-xs font-semibold">
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
                      className="p-2 hover:bg-muted rounded-lg transition-colors"
                      title="Marquer comme lu"
                    >
                      <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(notification.id)
                    }}
                    className="p-2 hover:bg-danger-100 rounded-lg transition-colors"
                    title="Supprimer"
                  >
                    <svg className="w-5 h-5 text-danger-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Unread Indicator */}
              {notification.status === 'Unread' && (
                <div className="absolute top-4 left-4 w-3 h-3 bg-primary-500 rounded-full"></div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
