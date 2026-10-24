// filepath: components/auth/AuthInput.tsx
'use client'

import { forwardRef, InputHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  leading?: ReactNode
  trailing?: ReactNode
  error?: string
}

export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  ({ label, leading, trailing, error, className, ...props }, ref) => {
    return (
      <div className="space-y-1.5 flex w-full flex-col">
        <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-white/50 pl-1">{label}</label>
        <div className="relative flex items-center">
          {leading && (
            <div className="absolute left-3.5 text-white/40 flex items-center justify-center pointer-events-none">
              {leading}
            </div>
          )}
          <input
            ref={ref}
            {...props}
            className={cn(
              "w-full h-[46px] rounded-xl bg-[#0A0D14]/50 border border-white/[0.08] text-white text-[14px]",
              "placeholder:text-white/20 focus:outline-none focus:border-[#4F7CFF]/60 focus:bg-[#0A0D14]/80 focus:ring-1 focus:ring-[#4F7CFF]/50",
              "transition-all duration-200",
              leading ? "pl-10" : "pl-4",
              trailing ? "pr-10" : "pr-4",
              error && "border-red-500/50 focus:border-red-500 focus:ring-red-500/50",
              className
            )}
          />
          {trailing && (
            <div className="absolute right-3.5 text-white/40 flex items-center justify-center">
              {trailing}
            </div>
          )}
        </div>
        {error && <p className="text-[11px] font-mono text-red-400 mt-0.5">{error}</p>}
      </div>
    )
  }
)

AuthInput.displayName = 'AuthInput'