'use client'

import { memo } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'
import { Plus, Users } from '@phosphor-icons/react'

interface OpenRoleNodeData {
  label: string
  subtitle?: string
  role_id?: string
  applicants?: number
  color?: string
  onExpand?: (id: string) => void
  onViewRole?: (roleId: string) => void
}

const COLORS: Record<string, { border: string; text: string; bg: string }> = {
  orange: { border: 'border-orange-400/50', text: 'text-orange-300', bg: 'bg-orange-500/8' },
  yellow: { border: 'border-yellow-400/50', text: 'text-yellow-300', bg: 'bg-yellow-500/8' },
  pink:   { border: 'border-pink-400/50', text: 'text-pink-300', bg: 'bg-pink-500/8' },
}

function OpenRoleNodeComponent({ data, selected, id }: NodeProps) {
  const d = data as unknown as OpenRoleNodeData
  const color = COLORS[d.color || 'orange'] || COLORS.orange

  return (
    <div
      className={
        'relative rounded-xl px-4 py-3 min-w-[200px] max-w-[240px] transition-all cursor-pointer ' +
        color.bg + ' border-2 border-dashed ' +
        (selected
          ? color.border + ' ring-2 ring-orange-400/40 shadow-2xl shadow-orange-500/20'
          : color.border + ' hover:border-orange-300 hover:bg-orange-500/12')
      }
      onClick={() => d.role_id && d.onViewRole?.(d.role_id)}
    >
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-white/40 !border-0" />
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-white/40 !border-0" />
      <Handle type="source" position={Position.Left} id="left" className="!w-2 !h-2 !bg-white/40 !border-0" />
      <Handle type="source" position={Position.Right} id="right" className="!w-2 !h-2 !bg-white/40 !border-0" />

      <div className="flex items-start gap-2.5">
        <div className={'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ' + color.bg + ' border ' + color.border}>
          <Plus size={16} weight="bold" className={color.text} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-white leading-tight truncate">{d.label}</p>
          <p className={'text-[10px] font-semibold uppercase tracking-wider mt-0.5 ' + color.text}>
            {d.subtitle || 'Open Role'}
          </p>
        </div>
      </div>

      {typeof d.applicants === 'number' && d.applicants > 0 && (
        <div className="mt-2 flex items-center gap-1 text-[10px] text-white/60">
          <Users size={10} weight="fill" />
          {d.applicants} applicant{d.applicants !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}

export const OpenRoleNode = memo(OpenRoleNodeComponent)
