'use client'

import { Megaphone, Pin, AlertTriangle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { DsrtPanel, DsrtAvatar } from '@/components/dsrt'

export function AnnouncementBanner({ announcement }: { announcement: any }) {
  // Translate priority to DSRT panel variant (no neon/vibe styles)
  const variantMap: Record<string, 'default' | 'accent' | 'inset'> = {
    NORMAL: 'default',
    IMPORTANT: 'accent', // Deep Slate Blue
    URGENT: 'inset',     // Dark pressed surface with warning text internally
  }
  
  const variant = variantMap[announcement.priority] || 'default'
  const isUrgent = announcement.priority === 'URGENT'
  const Icon = isUrgent ? AlertTriangle : Megaphone

  return (
    <DsrtPanel padding="none" variant={variant} className={isUrgent ? 'border-amber-500/30' : ''}>
      <div className={`flex items-center gap-2 border-b px-4 py-2 ${isUrgent ? 'border-amber-500/20 bg-amber-500/10' : 'border-white/[0.06] bg-white/[0.03]'}`}>
        <Icon className={`w-3.5 h-3.5 ${isUrgent ? 'text-amber-400' : 'text-white/60'}`} strokeWidth={2} />
        <span className={`text-[10px] font-mono font-bold uppercase tracking-widest ${isUrgent ? 'text-amber-400' : 'text-white/60'}`}>
          {isUrgent ? 'Urgent announcement' : announcement.priority === 'IMPORTANT' ? 'Important' : 'Announcement'}
        </span>
        {announcement.pinned && (
          <span className="inline-flex items-center gap-1 ml-auto text-[10px] font-mono uppercase tracking-widest text-white/40">
            <Pin className="w-3 h-3" strokeWidth={2} /> Pinned
          </span>
        )}
      </div>
      
      <div className="p-4 md:p-5 space-y-4">
        <div className="flex items-center gap-3">
          <DsrtAvatar src={announcement.author?.avatar_url} name={announcement.author?.full_name} size="sm" />
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-white/70">
              <span className="font-bold text-white">{announcement.author?.full_name || 'Admin'}</span>
              <span className="text-white/40 font-mono"> · {formatDistanceToNow(new Date(announcement.published_at), { addSuffix: true })}</span>
            </p>
          </div>
        </div>
        <div>
          <h3 className="text-[17px] font-bold text-white leading-snug mb-1.5">{announcement.title}</h3>
          <p className="text-[14px] text-white/80 whitespace-pre-wrap leading-relaxed">{announcement.body}</p>
        </div>
      </div>
    </DsrtPanel>
  )
}