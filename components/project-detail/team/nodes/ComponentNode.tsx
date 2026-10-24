'use client'

import { memo } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'
import {
  Browsers, Cloud, Database, Cpu, Robot, Globe, Package,
  Wrench, Monitor, TerminalWindow
} from '@phosphor-icons/react'

interface ComponentNodeData {
  label: string
  subtitle?: string
  component_type?: string
  color?: string
  icon?: string
}

const ICONS: Record<string, any> = {
  frontend: Browsers,
  web_app: Browsers,
  api: Cloud,
  backend: TerminalWindow,
  database: Database,
  ml_model: Robot,
  system: Cpu,
  monitoring: Monitor,
  service: Package,
  tool: Wrench,
  external: Globe,
}

const COLORS: Record<string, { border: string; icon: string; bg: string }> = {
  purple: { border: 'border-purple-500/40', icon: 'text-purple-300', bg: 'bg-purple-500/8' },
  blue:   { border: 'border-blue-500/40', icon: 'text-blue-300', bg: 'bg-blue-500/8' },
  green:  { border: 'border-emerald-500/40', icon: 'text-emerald-300', bg: 'bg-emerald-500/8' },
  cyan:   { border: 'border-cyan-500/40', icon: 'text-cyan-300', bg: 'bg-cyan-500/8' },
  yellow: { border: 'border-yellow-500/40', icon: 'text-yellow-300', bg: 'bg-yellow-500/8' },
  red:    { border: 'border-red-500/40', icon: 'text-red-300', bg: 'bg-red-500/8' },
  gray:   { border: 'border-white/20', icon: 'text-white/70', bg: 'bg-white/[0.04]' },
}

function ComponentNodeComponent({ data, selected }: NodeProps) {
  const d = data as unknown as ComponentNodeData
  const Icon = ICONS[d.component_type || 'system'] || Cpu
  const color = COLORS[d.color || 'purple'] || COLORS.purple

  return (
    <div
      className={
        'relative bg-[#12121a] rounded-xl px-4 py-3 min-w-[180px] max-w-[220px] transition-all border-2 ' +
        (selected
          ? color.border + ' ring-2 ring-white/25 shadow-xl'
          : 'border-white/[0.1] hover:border-white/25')
      }
    >
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-white/40 !border-0" />
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-white/40 !border-0" />
      <Handle type="source" position={Position.Left} id="left" className="!w-2 !h-2 !bg-white/40 !border-0" />
      <Handle type="source" position={Position.Right} id="right" className="!w-2 !h-2 !bg-white/40 !border-0" />

      <div className="flex items-center gap-2.5">
        <div className={'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border ' + color.bg + ' ' + color.border}>
          <Icon size={16} weight="fill" className={color.icon} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-white truncate leading-tight">{d.label}</p>
          {d.subtitle && (
            <p className="text-[10px] text-white/55 truncate leading-tight mt-0.5">{d.subtitle}</p>
          )}
        </div>
      </div>
    </div>
  )
}

export const ComponentNode = memo(ComponentNodeComponent)
