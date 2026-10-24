'use client'

import { SelectHTMLAttributes, forwardRef } from 'react'
import { CaretDown } from '@phosphor-icons/react'

interface Option {
  value: string
  label: string
}

interface Props extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  options: Option[]
  placeholder?: string
  error?: string
}

export const SelectField = forwardRef<HTMLSelectElement, Props>(function SelectField(
  { options, placeholder, error, className = '', ...props },
  ref
) {
  return (
    <div>
      <div className="relative">
        <select
          ref={ref}
          {...props}
          className={
            'w-full h-10 pl-3 pr-9 appearance-none rounded-lg bg-[#121215] border transition-colors text-[13.5px] text-white focus:outline-none ' +
            (error
              ? 'border-red-500/50 focus:border-red-500'
              : 'border-zinc-800 focus:border-zinc-600') +
            ' ' + className
          }
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map(o => (
            <option key={o.value} value={o.value} className="bg-[#121215] text-white">
              {o.label}
            </option>
          ))}
        </select>
        <CaretDown
          size={12}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
        />
      </div>
      {error && <p className="text-[11px] text-red-400 mt-1">{error}</p>}
    </div>
  )
})