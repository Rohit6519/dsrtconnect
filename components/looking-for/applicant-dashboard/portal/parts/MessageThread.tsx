'use client'

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return new Date(iso).toLocaleDateString()
}

export function MessageThread({ messages, counterparty }: { messages: any[]; counterparty: any }) {
  if (!messages || messages.length === 0) {
    return <div className="text-[12.5px] text-zinc-500 text-center py-10">No messages yet.</div>
  }
  return (
    <div className="space-y-3">
      {messages.map((msg: any) => (
        <div key={msg.id} className={`flex flex-col ${msg.is_mine ? 'items-end' : 'items-start'}`}>
          {msg.subject && (
            <div className={`text-[10.5px] font-bold uppercase tracking-widest mb-1 ${msg.is_mine ? 'text-zinc-500 mr-1' : 'text-zinc-500 ml-1'}`}>
              {msg.subject}
            </div>
          )}
          <div
            className={
              'max-w-[85%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed whitespace-pre-wrap ' +
              (msg.is_mine
                ? 'bg-zinc-200 text-black rounded-br-sm'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-bl-sm')
            }
          >
            {msg.body}
          </div>
          <div className={`text-[10.5px] text-zinc-500 mt-1 px-1 ${msg.is_mine ? 'mr-1' : 'ml-1'}`}>
            {msg.is_mine ? 'You' : (counterparty?.full_name || 'Team')} · {timeAgo(msg.created_at)}
          </div>
        </div>
      ))}
    </div>
  )
}