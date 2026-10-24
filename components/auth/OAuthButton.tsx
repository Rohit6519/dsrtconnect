// filepath: components/auth/OAuthButton.tsx
'use client'

import { ReactNode } from 'react'
import { CircleNotch } from '@phosphor-icons/react'

interface Props {
  provider: string
  onClick: () => void
  loading?: boolean
  disabled?: boolean
  children: ReactNode
  icon: ReactNode
}

export function OAuthButton({ onClick, loading, disabled, children, icon }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading || disabled}
      className="w-full h-[46px] flex items-center rounded-xl border border-white/[0.08] bg-[#0A0D14]/50 hover:bg-white/[0.04] transition-all px-4 disabled:opacity-60 disabled:cursor-not-allowed group"
    >
      <div className="w-[24px] flex items-center justify-start shrink-0">
        {loading ? (
          <CircleNotch className="w-[18px] h-[18px] animate-spin text-white/60" weight="bold" />
        ) : (
          <div className="opacity-90 group-hover:opacity-100 transition-opacity">{icon}</div>
        )}
      </div>
      <span className="flex-1 text-center text-[13.5px] font-medium text-white/90 mr-[24px]">
        {children}
      </span>
    </button>
  )
}