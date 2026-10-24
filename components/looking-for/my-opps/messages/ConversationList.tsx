'use client'

function timeAgoShort(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d`
  return `${Math.floor(d / 7)}w`
}

export function ConversationList({
  items,
  activeId,
  onSelect,
}: {
  items: any[]
  activeId: string | null
  onSelect: (id: string) => void
}) {
  if (items.length === 0) {
    return (
      <div className="p-6 text-center text-[12.5px] text-zinc-500">
        No conversations found.
      </div>
    )
  }

  return (
    <ul className="divide-y divide-zinc-800/60">
      {items.map((c) => {
        const isActive = c.application_id === activeId
        const name =
          c.applicant?.full_name || c.applicant?.username || 'Applicant'
        const avatar = c.applicant?.avatar_url
        const msgs = (c.timeline || []).filter((t: any) => t.type === 'message')
        const lastMsg = msgs[msgs.length - 1]
        const preview = lastMsg ? lastMsg.body : 'No messages'

        return (
          <li key={c.application_id}>
            <button
              onClick={() => onSelect(c.application_id)}
              className={
                'w-full text-left p-4 transition-colors relative flex items-start gap-3 ' +
                (isActive ? 'bg-zinc-900/60' : 'hover:bg-zinc-900/30')
              }
            >
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-white" />
              )}

              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden flex items-center justify-center text-[12px] font-bold text-zinc-500">
                  {avatar ? (
                    <img
                      src={avatar}
                      className="w-full h-full object-cover"
                      alt=""
                    />
                  ) : (
                    name.charAt(0).toUpperCase()
                  )}
                </div>
                {c.unread_count > 0 && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-[#121215]" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex justify-between items-center mb-0.5">
                  <span
                    className={
                      'text-[13.5px] font-bold truncate pr-2 ' +
                      (c.unread_count > 0 ? 'text-white' : 'text-zinc-200')
                    }
                  >
                    {name}
                  </span>
                  <span className="text-[10.5px] font-medium text-zinc-500 shrink-0">
                    {timeAgoShort(c.last_activity_at)}
                  </span>
                </div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1 truncate">
                  {c.opportunity?.title || 'Unknown Opp'}
                </div>
                <p
                  className={
                    'text-[12.5px] line-clamp-2 leading-snug ' +
                    (c.unread_count > 0
                      ? 'text-zinc-300 font-medium'
                      : 'text-zinc-500')
                  }
                >
                  {preview}
                </p>
              </div>
            </button>
          </li>
        )
      })}
    </ul>
  )
}