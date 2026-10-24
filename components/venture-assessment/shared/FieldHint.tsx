'use client'

import { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

export function FieldHint({ children }: Props) {
  return (
    <p className="text-[11.5px] text-zinc-500 mt-1.5 leading-relaxed">
      {children}
    </p>
  )
}