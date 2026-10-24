'use client'

import { ReactNode } from 'react'

interface Props {
  children: ReactNode
  required?: boolean
  htmlFor?: string
}

export function FieldLabel({ children, required, htmlFor }: Props) {
  return (
    <label htmlFor={htmlFor} className="block text-[13px] font-semibold text-white mb-1.5">
      {children}
      {required && <span className="text-zinc-500 ml-1">*</span>}
    </label>
  )
}