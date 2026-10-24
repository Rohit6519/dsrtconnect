'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Bell, Heart, MessageCircle, UserPlus, FolderPlus, CheckCircle2, AlertCircle } from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

const iconMap: Record<string, any> = {
  heart: Heart,
  message: MessageCircle,
  user: UserPlus,
  project: FolderPlus,
  check: CheckCircle2,
  alert: AlertCircle,
}

const colorMap: Record<string, string> = {
  like: 'text-pink-500 bg-pink-500/10',
  comment: 'text-blue-500 bg-blue-500/10',
  follow: 'text-purple-500 bg-purple-500/10',
  project_invitation: 'text-orange-500 bg-orange-500/10',
  task_assigned: 'text-green-500 bg-green-500/10',
  mention: 'text-yellow-500 bg-yellow-500/10',
}

export function NotificationsDropdown() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()
  const [open, setOpen] = useState(false)

  const handleClick = async (n: any) => {
    if (!n.read) await markAsRead(n.id)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute right-0 top-full mt-2 w-96 bg-card border rounded-xl shadow-2xl z-50 max-h-[600px] flex flex-col"
            >
              <div className="p-4 border-b flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm">Notifications</h3>
                  {unreadCount > 0 && (
                    <p className="text-[10px] text-muted-foreground">
                      {unreadCount} unread
                    </p>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-blue-500 hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-12 text-center">
                    <Bell className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">No notifications yet</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      Activity from your projects and people you follow will appear here
                    </p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {notifications.slice(0, 20).map((n) => {
                      const Icon = iconMap[n.icon || 'alert'] || AlertCircle
                      const colors = colorMap[n.type] || 'text-muted-foreground bg-muted'
                      
                      const content = (
                        <div
                          className={cn(
                            'p-3 flex gap-3 hover:bg-muted/40 transition-colors cursor-pointer',
                            !n.read && 'bg-blue-500/5'
                          )}
                          onClick={() => handleClick(n)}
                        >
                          <div className={cn(
                            'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                            colors
                          )}>
                            <Icon className="w-4 h-4" strokeWidth={2.5} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium leading-snug">
                              {n.title}
                            </p>
                            {n.message && (
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                {n.message}
                              </p>
                            )}
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                            </p>
                          </div>
                          {!n.read && (
                            <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2" />
                          )}
                        </div>
                      )

                      return n.action_url ? (
                        <Link key={n.id} href={n.action_url}>
                          {content}
                        </Link>
                      ) : (
                        <div key={n.id}>{content}</div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="p-3 border-t">
                <Link
                  href="/notifications"
                  className="block text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setOpen(false)}
                >
                  View all notifications
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}