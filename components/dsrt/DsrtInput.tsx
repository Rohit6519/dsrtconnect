'use client'
import * as React from 'react'
import { cn } from '@/lib/utils'

/* ---------- INPUT ---------- */
interface DsrtInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode
  rightSlot?: React.ReactNode
  error?: boolean
  sizeVariant?: 'sm' | 'md' | 'lg'
}

export const DsrtInput = React.forwardRef<HTMLInputElement, DsrtInputProps>(
  ({ className, icon, rightSlot, error, sizeVariant = 'md', ...props }, ref) => {
    const sizeClass = {
      sm: 'h-8 text-[12px] px-3',
      md: 'h-10 text-[13px] px-3.5',
      lg: 'h-11 text-[14px] px-4',
    }[sizeVariant]

    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-lg border bg-white/[0.03] transition-colors focus-within:bg-white/[0.05]',
          error
            ? 'border-red-500/40 focus-within:border-red-500/60'
            : 'border-white/[0.08] focus-within:border-white/[0.2]',
          sizeClass,
          className
        )}
      >
        {icon && <span className="text-white/40 flex-shrink-0">{icon}</span>}
        <input
          ref={ref}
          className="flex-1 min-w-0 bg-transparent outline-none text-white placeholder:text-white/30"
          {...props}
        />
        {rightSlot && <span className="flex-shrink-0">{rightSlot}</span>}
      </div>
    )
  }
)
DsrtInput.displayName = 'DsrtInput'

/* ---------- TEXTAREA ---------- */
interface DsrtTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
}

export const DsrtTextarea = React.forwardRef<HTMLTextAreaElement, DsrtTextareaProps>(
  ({ className, error, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'w-full min-h-[80px] rounded-lg bg-white/[0.03] border text-white text-[13px] p-3 outline-none transition-colors resize-y placeholder:text-white/30',
        error
          ? 'border-red-500/40 focus:border-red-500/60'
          : 'border-white/[0.08] focus:border-white/[0.2]',
        className
      )}
      {...props}
    />
  )
)
DsrtTextarea.displayName = 'DsrtTextarea'

/* ---------- FIELD (label + hint + error) ---------- */
interface DsrtFieldProps {
  label?: string
  hint?: string
  error?: string
  required?: boolean
  children: React.ReactNode
  className?: string
}

export function DsrtField({ label, hint, error, required, children, className }: DsrtFieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label className="block text-[12px] font-medium text-white/70">
          {label}
          {required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
      )}
      {children}
      {hint && !error && (
        <p className="text-[11px] text-white/40">{hint}</p>
      )}
      {error && <p className="text-[11px] text-red-400">{error}</p>}
    </div>
  )
}