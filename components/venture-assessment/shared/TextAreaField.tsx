'use client'

import { TextareaHTMLAttributes, forwardRef } from 'react'

interface Props extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string
  maxLen?: number
}

export const TextAreaField = forwardRef<HTMLTextAreaElement, Props>(function TextAreaField(
  { error, maxLen, className = '', value, ...props },
  ref
) {
  const len = typeof value === 'string' ? value.length : 0
  return (
    <div>
      <textarea
        ref={ref}
        value={value}
        maxLength={maxLen}
        {...props}
        className={
          'w-full min-h-[96px] px-3 py-2.5 rounded-lg bg-[#121215] border transition-colors text-[13.5px] text-white placeholder:text-zinc-600 focus:outline-none resize-y ' +
          (error
            ? 'border-red-500/50 focus:border-red-500'
            : 'border-zinc-800 focus:border-zinc-600') +
          ' ' + className
        }
      />
      <div className="flex items-center justify-between mt-1">
        {error ? (
          <p className="text-[11px] text-red-400">{error}</p>
        ) : <span />}
        {maxLen && (
          <p className="text-[10.5px] text-zinc-600 tabular-nums">
            {len}/{maxLen}
          </p>
        )}
      </div>
    </div>
  )
})