'use client'

import { Check } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import type { AccessPermissions } from '@/types/team'

interface Props {
  value: AccessPermissions
  onChange: (v: AccessPermissions) => void
  disabled?: boolean
}

interface FlagItem {
  key: string
  label: string
  danger?: boolean
}

interface MatrixGroup {
  category: keyof AccessPermissions
  label: string
  flags: FlagItem[]
}

const MATRIX_CONFIG: MatrixGroup[] = [
  {
    category: 'project', label: 'Project Detail',
    flags: [
      { key: 'view', label: 'View details' },
      { key: 'edit', label: 'Edit settings & profile' },
      { key: 'delete', label: 'Archive project', danger: true },
    ]
  },
  {
    category: 'team', label: 'Team & Graph',
    flags: [
      { key: 'view', label: 'View team & graph' },
      { key: 'invite', label: 'Invite members' },
      { key: 'remove', label: 'Remove members', danger: true },
      { key: 'manage_permissions', label: 'Manage access', danger: true },
    ]
  },
  {
    category: 'projects', label: 'Child Projects',
    flags: [
      { key: 'view', label: 'View child projects' },
      { key: 'create', label: 'Create new projects' },
      { key: 'edit', label: 'Edit child projects' },
      { key: 'archive', label: 'Archive child projects', danger: true },
    ]
  },
  {
    category: 'research', label: 'Research & IP',
    flags: [
      { key: 'view', label: 'View research' },
      { key: 'create', label: 'Add research items' },
      { key: 'edit', label: 'Edit research/IP' },
    ]
  },
  {
    category: 'financial', label: 'Financials',
    flags: [
      { key: 'view', label: 'View financial data' },
      { key: 'manage', label: 'Manage transactions', danger: true },
    ]
  },
  {
    category: 'mail', label: 'DSRT Mail',
    flags: [
      { key: 'use', label: 'Use project email' },
      { key: 'team_comm', label: 'Team communication' },
    ]
  },
  {
    category: 'analytics', label: 'Analytics',
    flags: [
      { key: 'view', label: 'View metrics' },
      { key: 'export', label: 'Export data' },
    ]
  },
]

export function PermissionMatrixEditor({ value, onChange, disabled }: Props) {
  const toggle = (category: keyof AccessPermissions, flag: string) => {
    if (disabled) return
    const catState = value[category] || {}
    const currentState = !!(catState as any)[flag]
    
    onChange({
      ...value,
      [category]: {
        ...catState,
        [flag]: !currentState
      }
    })
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
      {MATRIX_CONFIG.map(group => {
        const groupState = value[group.category] || {}

        return (
          <div key={group.category}>
            <h5 className="text-[10px] font-mono uppercase tracking-widest text-white/30 font-bold mb-3 border-b border-white/[0.04] pb-2">
              {group.label}
            </h5>
            <div className="space-y-2.5">
              {group.flags.map(flag => {
                const isChecked = !!(groupState as any)[flag.key]
                
                return (
                  <label 
                    key={flag.key} 
                    className={cn(
                      "flex items-start gap-2.5 group/toggle",
                      disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                    )}
                  >
                    <div className="relative flex items-center justify-center w-[18px] h-[18px] shrink-0 mt-[1px]">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggle(group.category, flag.key)}
                        disabled={disabled}
                        className={cn(
                          "peer appearance-none w-[16px] h-[16px] border-2 rounded transition-all",
                          disabled ? "" : "cursor-pointer",
                          flag.danger 
                            ? "border-red-500/40 bg-white/[0.02] checked:bg-red-500 checked:border-red-500" 
                            : "border-white/20 bg-white/[0.02] checked:bg-[#38bdf8] checked:border-[#38bdf8]"
                        )}
                      />
                      <Check size={10} weight="bold" className="absolute text-[#05070D] opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" />
                    </div>
                    <span className={cn(
                      "text-[13px] font-medium leading-snug transition-colors",
                      isChecked ? "text-white" : "text-white/50",
                      !disabled && "group-hover/toggle:text-white/80",
                      flag.danger && isChecked && "text-red-300"
                    )}>
                      {flag.label}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}