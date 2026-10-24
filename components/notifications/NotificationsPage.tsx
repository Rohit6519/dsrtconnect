'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Bell, Heart, MessageCircle, UserPlus, FolderPlus, Check } from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import { DsrtSection, DsrtButton, DsrtTabs, DsrtPanel, DsrtEmpty } from '@/components/dsrt'

const iconMap: Record<string, any> = {
  heart: Heart,
  message: MessageCircle,
  user: UserPlus,
  project: FolderPlus,
}

const colorMap: Record<string, string> = {
  like: 'text-pink-400 bg-pink-500/10 border border-pink-500/20',
  comment: 'text-blue-400 bg-blue-500/10 border border-blue-500/20',
  follow: 'text-purple-400 bg-purple-500/10 border border-purple-500/20',
  project_invitation: 'text-orange-400 bg-orange-500/10 border border-orange-500/20',
}

const filters = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'like', label: 'Likes' },
  { value: 'comment', label: 'Comments' },
  { value: 'follow', label: 'Follows' },
  { value: 'project_invitation', label: 'Invitations' },
]

export function NotificationsPage() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()
  const [filter, setFilter] = useState('all')

  const filtered = notifications.filter(n => {
    if (filter === 'all') return true
    if (filter === 'unread') return !n.read
    return n.type === filter
  })

  // Add badge count to unread tab dynamically
  const tabsWithBadges = filters.map(f => ({
    ...f,
    badge: f.value === 'unread' && unreadCount > 0 ? unreadCount : undefined
  }))

  return (
    <div className="space-y-6">
      <DsrtSection
        title="Notifications"
        description={`You have ${unreadCount} unread alert${unreadCount === 1 ? '' : 's'}.`}
        actions={
          unreadCount > 0 && (
            <DsrtButton variant="outline" size="sm" onClick={markAllAsRead}>
              <Check className="w-4 h-4" />
              <span className="hidden sm:inline">Mark all read</span>
            </DsrtButton>
          )
        }
      />

      <DsrtTabs
        variant="segmented"
        tabs={tabsWithBadges}
        activeValue={filter}
        onValueChange={setFilter}
        className="w-full sm:w-auto"
      />

      {filtered.length === 0 ? (
        <DsrtEmpty
          icon={Bell}
          title="All caught up"
          description={filter === 'all' 
            ? 'Activity from your network will appear here' 
            : 'No notifications match this filter'
          }
        />
      ) : (
        <DsrtPanel padding="none" className="overflow-hidden divide-y divide-white/[0.04]">
          {filtered.map(n => {
            const Icon = iconMap[n.icon || 'alert'] || Bell
            const colors = colorMap[n.type] || 'text-white/50 bg-white/[0.04] border-white/[0.08]'
            
            const content = (
              <div
                className={cn(
                  'p-4 sm:p-5 flex gap-4 hover:bg-white/[0.02] transition-colors cursor-pointer',
                  !n.read && 'bg-[#1e3a5f]/10'
                )}
                onClick={() => !n.read && markAsRead(n.id)}
              >
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', colors)}>
                  <Icon className="w-5 h-5" strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-[14px] leading-snug", !n.read ? "text-white font-medium" : "text-white/80")}>
                    {n.title}
                  </p>
                  {n.message && (
                    <p className="text-[13px] text-white/50 mt-1 line-clamp-2">
                      {n.message}
                    </p>
                  )}
                  <p className="text-[11px] font-mono uppercase tracking-wider text-white/30 mt-2">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </p>
                </div>
                {!n.read && (
                  <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0 mt-2 shadow-[0_0_8px_rgba(96,165,250,0.6)]" />
                )}
              </div>
            )

            return n.action_url ? (
              <Link key={n.id} href={n.action_url} className="block">
                {content}
              </Link>
            ) : (
              <div key={n.id}>{content}</div>
            )
          })}
        </DsrtPanel>
      )}
    </div>
  )
}