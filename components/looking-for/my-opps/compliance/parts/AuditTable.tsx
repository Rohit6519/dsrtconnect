'use client'

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24); if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString()
}

const CAT_COLOR: Record<string, string> = {
  application: 'text-blue-300',
  interview: 'text-purple-300',
  mail: 'text-cyan-300',
  note: 'text-zinc-300',
  reviewer: 'text-emerald-300',
  rule: 'text-amber-300',
  offer: 'text-amber-300',
  opportunity: 'text-zinc-300',
  system: 'text-zinc-400',
  compliance: 'text-emerald-300',
}

export function AuditTable({ entries, onOpen, hasMore, onLoadMore }: {
  entries: any[] | null
  onOpen: (e: any) => void
  hasMore: boolean
  onLoadMore: () => void
}) {
  if (entries === null) {
    return <div className="space-y-2">{[0,1,2,3,4].map(i => <div key={i} className="h-10 rounded-lg bg-zinc-900/40 animate-pulse" />)}</div>
  }
  if (entries.length === 0) {
    return <div className="rounded-2xl border border-dashed border-zinc-800 p-10 text-center text-[13px] text-zinc-500">No audit entries match your filters.</div>
  }

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-[#18181b] via-[#121215] to-[#0f0f11] overflow-hidden">
      <table className="w-full text-left">
        <thead className="border-b border-zinc-800/80 bg-zinc-950/40">
          <tr className="text-[10.5px] font-bold uppercase tracking-widest text-zinc-500">
            <th className="py-2.5 pl-4 pr-2">When</th>
            <th className="py-2.5 pr-2">Action</th>
            <th className="py-2.5 pr-2">Category</th>
            <th className="py-2.5 pr-2">Entity</th>
            <th className="py-2.5 pr-2">Actor</th>
            <th className="py-2.5 pr-4">Source</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/70">
          {entries.map(e => (
            <tr key={e.id} onClick={() => onOpen(e)}
              className="cursor-pointer hover:bg-zinc-900/30">
              <td className="py-2.5 pl-4 pr-2 text-[11.5px] text-zinc-400 whitespace-nowrap">
                {timeAgo(e.created_at)}
              </td>
              <td className="py-2.5 pr-2 text-[12px] font-mono text-white truncate max-w-[280px]">
                {e.action}
              </td>
              <td className={'py-2.5 pr-2 text-[11.5px] font-semibold uppercase tracking-widest ' + (CAT_COLOR[e.category] || 'text-zinc-400')}>
                {e.category}
              </td>
              <td className="py-2.5 pr-2 text-[11px] font-mono text-zinc-400 truncate max-w-[180px]">
                {e.entity_type}
              </td>
              <td className="py-2.5 pr-2 text-[11.5px] text-zinc-400">
                {e.actor_role}
              </td>
              <td className="py-2.5 pr-4 text-[11.5px] text-zinc-500">
                {e.source}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {hasMore && (
        <div className="p-3 flex justify-center border-t border-zinc-800/80">
          <button onClick={onLoadMore}
            className="h-9 px-4 rounded-xl border border-zinc-800 hover:border-zinc-600 text-[12.5px] font-semibold text-zinc-300 hover:text-white">
            Load more
          </button>
        </div>
      )}
    </div>
  )
}