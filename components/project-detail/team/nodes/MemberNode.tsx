'use client'

import { memo } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'
import { Certificate, Crown, CaretDown } from '@phosphor-icons/react'

interface MemberNodeData {
  label: string
  subtitle: string
  avatar_url?: string | null
  user_id?: string
  is_verified?: boolean
  is_owner?: boolean
  skills?: string[]
  is_selected?: boolean
  is_editing?: boolean
  color?: string
  onExpand?: (id: string) => void
}

const COLORS: Record<string, { border: string; ring: string; glow: string }> = {
  purple: { border: 'border-purple-500/50', ring: 'ring-purple-400/50', glow: 'shadow-purple-500/30' },
  green:  { border: 'border-emerald-500/50', ring: 'ring-emerald-400/50', glow: 'shadow-emerald-500/30' },
  blue:   { border: 'border-blue-500/50', ring: 'ring-blue-400/50', glow: 'shadow-blue-500/30' },
  cyan:   { border: 'border-cyan-500/50', ring: 'ring-cyan-400/50', glow: 'shadow-cyan-500/30' },
  pink:   { border: 'border-pink-500/50', ring: 'ring-pink-400/50', glow: 'shadow-pink-500/30' },
}

function MemberNodeComponent({ data, selected, id }: NodeProps) {
  const d = data as unknown as MemberNodeData
  const color = COLORS[d.color || 'purple'] || COLORS.purple
  const skills = (d.skills || []).slice(0, 3)

  return (
    <div
      className={
        'relative bg-[#12121a] border-2 rounded-xl px-4 py-3 min-w-[220px] max-w-[260px] transition-all ' +
        (selected || d.is_selected
          ? color.border + ' ring-2 ' + color.ring + ' shadow-2xl ' + color.glow
          : 'border-white/[0.1] hover:border-white/25 shadow-lg')
      }
    >
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-white/40 !border-0" />
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-white/40 !border-0" />
      <Handle type="source" position={Position.Left} id="left" className="!w-2 !h-2 !bg-white/40 !border-0" />
      <Handle type="source" position={Position.Right} id="right" className="!w-2 !h-2 !bg-white/40 !border-0" />

      {/* Header */}
      <div className="flex items-start gap-2.5">
        <div className="relative flex-shrink-0">
          <div className={'w-10 h-10 rounded-full overflow-hidden bg-white/[0.06] flex items-center justify-center border-2 ' + color.border}>
            {d.avatar_url ? (
              <img src={d.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-[13px] font-semibold text-white/85">{(d.label || '?').charAt(0)}</span>
            )}
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#12121a]" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <p className="text-[13px] font-bold text-white truncate leading-tight">{d.label}</p>
            {d.is_verified && <Certificate size={11} weight="fill" className="text-blue-400 flex-shrink-0" />}
            {d.is_owner && <Crown size={11} weight="fill" className="text-yellow-400 flex-shrink-0" />}
          </div>
          <p className="text-[11px] text-white/60 truncate leading-tight mt-0.5">{d.subtitle}</p>
        </div>
      </div>

      {/* Skills chips */}
      {skills.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2.5">
          {skills.map((s) => (
            <span
              key={s}
              className="text-[9px] font-semibold text-white/70 bg-white/[0.06] border border-white/[0.1] px-1.5 py-0.5 rounded"
            >
              {s}
            </span>
          ))}
        </div>
      )}

      {/* Expand button */}
      {d.onExpand && (
        <button
          onClick={(e) => { e.stopPropagation(); d.onExpand?.(id) }}
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-white/[0.08] hover:bg-white/[0.15] border border-white/[0.15] flex items-center justify-center transition-colors"
          title="View details"
        >
          <CaretDown size={9} className="text-white/70" />
        </button>
      )}
    </div>
  )
}

export const MemberNode = memo(MemberNodeComponent)
