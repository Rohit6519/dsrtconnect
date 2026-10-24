'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Bell, DotsThree, CheckCircle, Trash } from '@phosphor-icons/react'
import { NotificationItem } from './NotificationItem'

interface Props {
  currentUser: any
}

export function NotificationsDropdown({ currentUser }: Props) {
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Poll unread count every 30s
  useEffect(() => {
    let alive = true
    const fetchCount = async () => {
      try {
        const res = await fetch('/api/home/notifications/count')
        const data = await res.json()
        if (alive) setUnread(data.unread || 0)
      } catch {}
    }
    fetchCount()
    const timer = setInterval(fetchCount, 30000)
    return () => { alive = false; clearInterval(timer) }
  }, [])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [open])

  const loadNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/home/notifications?limit=20')
      const data = await res.json()
      setNotifications(data.notifications || [])
    } catch {} finally {
      setLoading(false)
    }
  }, [])

  const handleOpen = () => {
    if (!open) loadNotifications()
    setOpen(!open)
  }

  const markAllRead = async () => {
    setMarkingAll(true)
    try {
      await fetch('/api/home/notifications/read-all', { method: 'POST' })
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnread(0)
    } catch {} finally {
      setMarkingAll(false)
    }
  }

  const handleItemRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    setUnread(u => Math.max(0, u - 1))
  }

  const handleItemDelete = (id: string) => {
    const wasUnread = notifications.find(n => n.id === id)?.is_read === false
    setNotifications(prev => prev.filter(n => n.id !== id))
    if (wasUnread) setUnread(u => Math.max(0, u - 1))
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        onClick={handleOpen}
        aria-label="Notifications"
        className={
          'relative w-10 h-10 rounded-lg flex items-center justify-center transition-all ' +
          'text-zinc-400 hover:text-white ' +
          'bg-transparent hover:bg-zinc-900 ' +
          'border border-transparent hover:border-zinc-800'
        }
      >
        <Bell size={16} weight={unread > 0 ? 'fill' : 'regular'} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center tabular-nums">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className={
          'absolute right-0 top-full mt-2 w-[380px] max-h-[600px] rounded-xl overflow-hidden ' +
          'bg-[#0a0a0b] border border-zinc-800 ' +
          'shadow-[0_20px_60px_rgba(0,0,0,0.7)] ' +
          'z-40 flex flex-col animate-in slide-in-from-top-2 duration-150'
        }>
          {/* Header */}
          <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-zinc-800">
            <h3 className="text-[14px] font-bold text-white tracking-tight">
              Notifications
              {unread > 0 && (
                <span className="ml-2 text-[11px] text-zinc-500 font-medium">({unread} unread)</span>
              )}
            </h3>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                disabled={markingAll}
                className="text-[11px] font-semibold text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 space-y-2">
                {[0, 1, 2].map(i => (
                  <div key={i} className="h-14 rounded-lg bg-zinc-900/40 animate-pulse" />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell size={20} weight="regular" className="mx-auto mb-2 text-zinc-600" />
                <p className="text-[13px] font-semibold text-white mb-1">No notifications yet</p>
                <p className="text-[11.5px] text-zinc-500">
                  You'll see reactions, comments, and mentions here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/40">
                {notifications.map(n => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    onRead={handleItemRead}
                    onDelete={handleItemDelete}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="shrink-0 border-t border-zinc-800 p-2">
              <Link
                href="/notifications"
                onClick={() => setOpen(false)}
                className="block text-center py-2 text-[12px] font-semibold text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 transition-colors"
              >
                See all notifications
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}