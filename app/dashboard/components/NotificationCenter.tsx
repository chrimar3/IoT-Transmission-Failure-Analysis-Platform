'use client'

import { useState, useEffect } from 'react'
import { Bell, X, CheckCircle, AlertTriangle, Info, Zap } from 'lucide-react'

interface Notification {
  id: string
  type: 'alert' | 'update' | 'success' | 'info'
  severity: 'info' | 'warning' | 'critical' | 'emergency'
  title: string
  message: string
  timestamp: string
  read: boolean
  actionable: boolean
  action_url?: string
}

interface NotificationCenterProps {
  sessionId?: string
}

export default function NotificationCenter({ _sessionId }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    // Simulate real-time notifications
    const interval = setInterval(() => {
      if (Math.random() > 0.85) {
        addNotification(generateRandomNotification())
      }
    }, 30000) // Check for new notifications every 30 seconds

    // Initialize with some sample notifications
    setNotifications([
      {
        id: 'notif_1',
        type: 'alert',
        severity: 'warning',
        title: 'New Alert Generated',
        message: 'HVAC efficiency dropped below threshold on Floor 3',
        timestamp: new Date().toISOString(),
        read: false,
        actionable: true,
        action_url: '#alerts'
      },
      {
        id: 'notif_2',
        type: 'success',
        severity: 'info',
        title: 'Export Completed',
        message: 'Your insights report has been successfully generated',
        timestamp: new Date(Date.now() - 300000).toISOString(),
        read: false,
        actionable: false
      },
      {
        id: 'notif_3',
        type: 'update',
        severity: 'info',
        title: 'Data Refresh Complete',
        message: 'Latest sensor data has been processed and validated',
        timestamp: new Date(Date.now() - 900000).toISOString(),
        read: true,
        actionable: false
      }
    ])

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const unread = notifications.filter(n => !n.read).length
    setUnreadCount(unread)
  }, [notifications])

  const addNotification = (notification: Notification) => {
    setNotifications(prev => [notification, ...prev.slice(0, 19)]) // Keep only 20 most recent
  }

  const markAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    )
  }

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notif => ({ ...notif, read: true }))
    )
  }

  const removeNotification = (notificationId: string) => {
    setNotifications(prev =>
      prev.filter(notif => notif.id !== notificationId)
    )
  }

  const getNotificationIcon = (type: string, severity: string) => {
    if (severity === 'emergency') return <Zap className="h-4 w-4 text-red-600" />
    if (severity === 'critical') return <AlertTriangle className="h-4 w-4 text-red-500" />
    if (severity === 'warning') return <AlertTriangle className="h-4 w-4 text-yellow-500" />

    switch (type) {
      case 'alert': return <AlertTriangle className="h-4 w-4 text-orange-500" />
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'update': return <Info className="h-4 w-4 text-blue-500" />
      default: return <Bell className="h-4 w-4 text-gray-500" />
    }
  }

  const getNotificationColor = (type: string, severity: string, read: boolean) => {
    const opacity = read ? 'opacity-60' : ''

    if (severity === 'emergency') return `border-red-500 bg-red-50 ${opacity}`
    if (severity === 'critical') return `border-red-400 bg-red-50 ${opacity}`
    if (severity === 'warning') return `border-yellow-400 bg-yellow-50 ${opacity}`

    switch (type) {
      case 'alert': return `border-orange-300 bg-orange-50 ${opacity}`
      case 'success': return `border-green-300 bg-green-50 ${opacity}`
      case 'update': return `border-blue-300 bg-blue-50 ${opacity}`
      default: return `border-gray-300 bg-white ${opacity}`
    }
  }

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600"
        title="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-lg border z-50 max-h-96 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <span className="bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>No notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border-l-4 ${getNotificationColor(notification.type, notification.severity, notification.read)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        {getNotificationIcon(notification.type, notification.severity)}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${notification.read ? 'text-gray-600' : 'text-gray-900'}`}>
                            {notification.title}
                          </p>
                          <p className={`text-sm mt-1 ${notification.read ? 'text-gray-500' : 'text-gray-700'}`}>
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-2">
                            {new Date(notification.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1 ml-2">
                        {!notification.read && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="p-1 hover:bg-gray-200 rounded"
                            title="Mark as read"
                          >
                            <CheckCircle className="h-3 w-3 text-gray-400 hover:text-green-500" />
                          </button>
                        )}
                        <button
                          onClick={() => removeNotification(notification.id)}
                          className="p-1 hover:bg-gray-200 rounded"
                          title="Remove"
                        >
                          <X className="h-3 w-3 text-gray-400 hover:text-red-500" />
                        </button>
                      </div>
                    </div>

                    {notification.actionable && notification.action_url && (
                      <div className="mt-3">
                        <button
                          onClick={() => {
                            // Handle action click
                            markAsRead(notification.id)
                          }}
                          className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-600 px-3 py-1 rounded"
                        >
                          View Details
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t bg-gray-50 text-center">
              <button
                className="text-sm text-blue-600 hover:text-blue-800"
                onClick={() => {
                  // Handle "View All" action
                  setIsOpen(false)
                }}
              >
                View All Notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function generateRandomNotification(): Notification {
  const _types = ['alert', 'update', 'success', 'info']
  const _severities = ['info', 'warning', 'critical']
  const templates = [
    {
      type: 'alert',
      severity: 'warning',
      title: 'Performance Alert',
      message: 'System performance has degraded in monitoring zone {zone}'
    },
    {
      type: 'success',
      severity: 'info',
      title: 'Optimization Complete',
      message: 'Energy efficiency optimization has improved performance by {percent}%'
    },
    {
      type: 'update',
      severity: 'info',
      title: 'Data Refresh',
      message: 'Latest sensor data from {source} has been processed'
    },
    {
      type: 'alert',
      severity: 'critical',
      title: 'Critical Issue Detected',
      message: 'Immediate attention required for {component} malfunction'
    }
  ]

  const template = templates[Math.floor(Math.random() * templates.length)]
  const zones = ['A-1', 'B-2', 'C-3', 'D-1', 'E-2']
  const sources = ['Floor 2', 'Floor 3', 'HVAC System', 'Lighting Grid']
  const components = ['HVAC Unit 205', 'Sensor Array C', 'Power Distribution']

  return {
    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: template.type as 'alert' | 'update' | 'success' | 'info',
    severity: template.severity as 'info' | 'warning' | 'critical' | 'emergency',
    title: template.title,
    message: template.message
      .replace('{zone}', zones[Math.floor(Math.random() * zones.length)])
      .replace('{percent}', Math.floor(Math.random() * 20 + 5).toString())
      .replace('{source}', sources[Math.floor(Math.random() * sources.length)])
      .replace('{component}', components[Math.floor(Math.random() * components.length)]),
    timestamp: new Date().toISOString(),
    read: false,
    actionable: template.type === 'alert',
    action_url: template.type === 'alert' ? '#alerts' : undefined
  }
}