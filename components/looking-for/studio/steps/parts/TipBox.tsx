// filepath: components/looking-for/studio/steps/parts/TipBox.tsx
'use client'

import { Lightbulb, Info, ShieldCheck, Sparkle } from '@phosphor-icons/react'

interface TipItem {
  title: string
  desc: string
}

interface Props {
  variant?: 'tips' | 'info' | 'privacy' | 'howItWorks'
  title?: string
  items?: TipItem[]
  children?: React.ReactNode
}

const VARIANT_META = {
  tips: { icon: Lightbulb, defaultTitle: 'Tips for Success' },
  info: { icon: Info, defaultTitle: 'How this works' },
  privacy: { icon: ShieldCheck, defaultTitle: 'How we use your data' },
  howItWorks: { icon: Sparkle, defaultTitle: 'How this works' },
}

/**
 * Premium yellow tip / info callout.
 * Solid gradient yellow background, dark text for maximum contrast.
 * Enterprise Stripe/Linear-inspired design.
 */
export function TipBox({ variant = 'tips', title, items, children }: Props) {
  const meta = VARIANT_META[variant]
  const Icon = meta.icon
  const displayTitle = title || meta.defaultTitle

  return (
    <div className="relative rounded-2xl overflow-hidden shadow-[0_8px_28px_rgba(0,0,0,0.45),0_2px_8px_rgba(251,191,36,0.15)]">
      {/* Solid gradient yellow background */}
      <div
        className="relative p-5"
        style={{
          background: 'linear-gradient(135deg, #FCD34D 0%, #FBBF24 45%, #F59E0B 100%)',
        }}
      >
        {/* Subtle inner highlight for depth */}
        <div className="absolute inset-x-0 top-0 h-px bg-white/50" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.12] via-transparent to-black/[0.08] pointer-events-none" />
        
        {/* Header */}
        <div className="relative flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-[#1A1408]/25 border border-[#1A1408]/15 flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_1px_2px_rgba(0,0,0,0.1)]">
            <Icon size={15} weight="fill" className="text-[#1A1408]" />
          </div>
          <h3 className="text-[11.5px] font-bold uppercase tracking-[0.14em] text-[#1A1408]">
            {displayTitle}
          </h3>
        </div>

        {/* Content */}
        {items ? (
          <ul className="relative space-y-3.5">
            {items.map((item, i) => (
              <li key={i} className="relative pl-4">
                <span className="absolute left-0 top-[7px] w-1.5 h-1.5 rounded-full bg-[#1A1408]" />
                <div className="text-[12.5px] font-bold text-[#1A1408] mb-0.5 leading-snug">
                  {item.title}
                </div>
                <div className="text-[11.5px] text-[#3D2F0A] leading-relaxed font-medium">
                  {item.desc}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="relative text-[12px] text-[#3D2F0A] leading-relaxed space-y-2 font-medium">
            {children}
          </div>
        )}
      </div>
    </div>
  )
}