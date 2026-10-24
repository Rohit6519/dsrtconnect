// filepath: components/looking-for/studio/steps/parts/InfoTooltip.tsx
'use client'

import { Info } from '@phosphor-icons/react'

export function InfoTooltip({ text }: { text: string }) {
  return (
    <div className="group relative inline-flex items-center justify-center ml-1.5 align-middle">
      <Info 
        size={13} 
        weight="fill" 
        className="text-white/35 hover:text-[#FBBF24] transition-colors cursor-help" 
      />
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-[#12141C] border border-[#FBBF24]/25 rounded-xl shadow-[0_8px_28px_rgba(0,0,0,0.6)] text-[11.5px] text-white/85 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 text-center font-normal normal-case tracking-normal leading-relaxed pointer-events-none">
        {text}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#FBBF24]/25" />
      </div>
    </div>
  )
}