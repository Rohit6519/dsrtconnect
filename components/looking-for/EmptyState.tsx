'use client'

import { ReactNode } from 'react'

interface Props {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center border border-dashed border-zinc-800 rounded-lg">
      {icon && (
        <div className="text-zinc-500 mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-[15px] font-bold text-zinc-100 mb-1.5 tracking-tight">{title}</h3>
      {description && (
        <p className="text-[13px] text-zinc-500 max-w-sm leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
