'use client'

import { useState } from 'react'
import { X, Check } from '@phosphor-icons/react'
import { EDGE_COLORS } from './TeamGraphLegend'

const REL_TYPES = [
  { id: 'leads', label: 'Leads', desc: 'Reports to / manages' },
  { id: 'collaboration', label: 'Collaborates with', desc: 'Works together' },
  { id: 'ownership', label: 'Owns', desc: 'Responsible for' },
  { id: 'reports_to', label: 'Reports to', desc: 'Direct report' },
  { id: 'depends_on', label: 'Depends on', desc: 'Waiting on' },
  { id: 'mentors', label: 'Mentors', desc: 'Coaches / guides' },
  { id: 'uses', label: 'Uses', desc: 'Consumes / integrates' },
  { id: 'custom', label: 'Custom', desc: 'Custom relationship' },
]

interface Props {
  onClose: () => void
  onConfirm: (relationshipType: string, label: string | null, animated: boolean) => Promise<void>
}

export function EdgeConfigModal({ onClose, onConfirm }: Props) {
  const [relType, setRelType] = useState('collaboration')
  const [customLabel, setCustomLabel] = useState('')
  const [animated, setAnimated] = useState(false)
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    setSaving(true)
    try {
      const label = relType === 'custom' ? (customLabel.trim() || 'Custom') : null
      await onConfirm(relType, label, animated)
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0f0f18] border border-white/[0.08] rounded-2xl w-full max-w-[420px] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <h3 className="text-[15px] font-semibold text-white">Relationship type</h3>
          <button onClick={onClose} className="text-white/50 hover:text-white p-1"><X size={18} /></button>
        </div>

        <div className="p-5">
          <div className="space-y-1.5 mb-4 max-h-[320px] overflow-y-auto">
            {REL_TYPES.map(r => {
              const active = relType === r.id
              return (
                <button
                  key={r.id}
                  onClick={() => setRelType(r.id)}
                  className={
                    'w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ' +
                    (active
                      ? 'bg-white/[0.06] border-white/[0.25]'
                      : 'bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.04]')
                  }
                >
                  <div
                    className="w-6 h-[3px] rounded flex-shrink-0"
                    style={{ background: EDGE_COLORS[r.id] || '#94a3b8' }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className={'text-[13px] font-semibold ' + (active ? 'text-white' : 'text-white/85')}>{r.label}</p>
                    <p className="text-[11px] text-white/50">{r.desc}</p>
                  </div>
                  {active && <Check size={13} weight="bold" className="text-white" />}
                </button>
              )
            })}
          </div>

          {relType === 'custom' && (
            <input
              autoFocus
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value.slice(0, 40))}
              placeholder="Custom label..."
              className="w-full h-10 bg-white/[0.04] border border-white/[0.1] rounded-md px-3 text-[13px] text-white placeholder:text-white/30 outline-none focus:border-white/25 mb-4"
            />
          )}

          <label className="flex items-center gap-2 cursor-pointer mb-4">
            <input
              type="checkbox"
              checked={animated}
              onChange={(e) => setAnimated(e.target.checked)}
              className="w-4 h-4 accent-white"
            />
            <span className="text-[13px] text-white/80">Animate this connection</span>
          </label>

          <div className="flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 h-9 text-[13px] text-white/70 hover:text-white border border-white/[0.1] rounded-md disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={saving}
              className="px-5 h-9 text-[13px] font-semibold bg-white text-black hover:bg-white/90 rounded-md disabled:opacity-50 flex items-center gap-1.5"
            >
              {saving ? 'Connecting...' : (<><Check size={12} weight="bold" /> Connect</>)}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
