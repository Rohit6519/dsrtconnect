'use client'

import { useState, useEffect } from 'react'
import { Bell, Check, Eye } from '@phosphor-icons/react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

interface Props { slug: string }

export function VentureNotificationsTab({ slug }: Props) {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/ventures/' + slug + '/notifications')
      .then(r => r.json())
      .then(d => { setNotifications(d.notifications || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [slug])

  const markRead = async (id: string) => {
    await fetch('/api/ventures/' + slug + '/notifications?id=' + id, { method: 'PATCH' })
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const markAllRead = async () => {
    await fetch('/api/ventures/' + slug + '/notifications?action=mark-all-read', { method: 'PATCH' })
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    toast.success('All marked as read')
  }

  const unread = notifications.filter(n => !n.read).length

  return (
    <div>
      <div className="flex items-end justify-between mb-5">
        <div>
          <h2 className="text-[20px] font-bold text-white">Notifications</h2>
          <p className="text-[13px] text-white/50 mt-0.5">{unread} unread · {notifications.length} total</p>
        </div>
        {unread > 0 && (
          <button onClick={markAllRead}
            className="text-[12px] font-semibold text-white/70 hover:text-white bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] px-3 h-8 rounded-lg flex items-center gap-1.5 transition-colors">
            <Check size={12} weight="bold" /> Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-16 bg-white/[0.02] border border-white/[0.06] rounded-xl animate-pulse" />)}</div>
      ) : notifications.length === 0 ? (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl py-16 text-center">
          <Bell size={26} className="text-white/40 mx-auto mb-3" />
          <p className="text-[15px] font-semibold text-white">No notifications</p>
          <p className="text-[12.5px] text-white/45 mt-1">Activity updates will appear here.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {notifications.map(n => {
            const sender = n.users
            return (
              <div
                key={n.id}
                onClick={() => !n.read && markRead(n.id)}
                className={
                  'flex items-start gap-3 px-4 py-3 rounded-xl transition-colors cursor-pointer ' +
                  (n.read ? 'hover:bg-white/[0.02]' : 'bg-white/[0.03] hover:bg-white/[0.05] border-l-2 border-white/[0.2]')
                }
              >
                {sender?.avatar_url ? (
                  <img src={sender.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-0.5" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bell size={12} className="text-white/50" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className={'text-[13px] leading-snug ' + (n.read ? 'text-white/70' : 'text-white font-medium')}>
                    {n.title}
                  </p>
                  {n.message && <p className="text-[11.5px] text-white/50 mt-0.5 truncate">{n.message}</p>}
                  <p className="text-[10.5px] text-white/40 mt-1">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
                </div>
                {!n.read && <span className="w-2 h-2 rounded-full bg-white/60 flex-shrink-0 mt-2" />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}