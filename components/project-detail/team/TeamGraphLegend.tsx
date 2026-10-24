'use client'

const EDGES = [
  { type: 'leads', label: 'Leadership', color: '#a78bfa' },
  { type: 'ownership', label: 'Ownership', color: '#60a5fa' },
  { type: 'collaboration', label: 'Collaboration', color: '#34d399' },
  { type: 'reports_to', label: 'Reports to', color: '#fb923c' },
  { type: 'depends_on', label: 'Depends on', color: '#facc15' },
  { type: 'custom', label: 'Custom', color: '#94a3b8' },
]

export function TeamGraphLegend() {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-[#12121a]/95 backdrop-blur-md border border-white/[0.08] rounded-full px-4 py-2 shadow-xl">
      <div className="flex items-center gap-4 flex-wrap">
        {EDGES.map(e => (
          <div key={e.type} className="flex items-center gap-1.5">
            <div className="w-4 h-[2px] rounded" style={{ background: e.color }} />
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: e.color }} />
            <span className="text-[11px] font-medium text-white/70">{e.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export const EDGE_COLORS: Record<string, string> = {
  leads: '#a78bfa',
  ownership: '#60a5fa',
  collaboration: '#34d399',
  reports_to: '#fb923c',
  depends_on: '#facc15',
  mentors: '#f472b6',
  uses: '#94a3b8',
  works_with: '#94a3b8',
  custom: '#94a3b8',
}
