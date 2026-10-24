'use client'

import { InputHTMLAttributes, forwardRef } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  error?: string
}

export const TextField = forwardRef<HTMLInputElement, Props>(function TextField(
  { error, className = '', ...props },
  ref
) {
  return (
    <div>
      <input
        ref={ref}
        {...props}
        className={
          'w-full h-10 px-3 rounded-lg bg-[#121215] border transition-colors text-[13.5px] text-white placeholder:text-zinc-600 focus:outline-none ' +
          (error
            ? 'border-red-500/50 focus:border-red-500'
            : 'border-zinc-800 focus:border-zinc-600') +
          ' ' + className
        }
      />
      {error && <p className="text-[11px] text-red-400 mt-1">{error}</p>}
    </div>
  )
})