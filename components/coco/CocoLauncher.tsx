// ============================================================
// components/coco/CocoLauncher.tsx
// Floating pill with border-tracing hover stripe.
// The stripe rotates ONCE along the pill's border on hover-in.
// ============================================================

'use client'

import { useState } from 'react'
import { Plus, Mic } from 'lucide-react'
import { useCocoUi } from '@/lib/coco/sdk/CocoProvider'
import { cn } from '@/lib/utils'

export function CocoLauncher() {
  const { isOpen, toggle } = useCocoUi()
  const [pulseKey, setPulseKey] = useState(0)
  const [hovering, setHovering] = useState(false)

  if (isOpen) return null

  const handleEnter = () => {
    setHovering(true)
    setPulseKey((k) => k + 1)
  }

  return (
    <>
      <style jsx>{`
        @keyframes coco-trace {
          0% {
            --a: 0deg;
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            --a: 360deg;
            opacity: 0;
          }
        }

        @property --a {
          syntax: '<angle>';
          inherits: false;
          initial-value: 0deg;
        }

        .coco-border-stripe {
          position: absolute;
          inset: 0;
          border-radius: 9999px;
          padding: 1.5px;
          background: conic-gradient(
            from var(--a),
            transparent 0deg,
            transparent 260deg,
            rgba(147, 197, 253, 0.55) 300deg,
            rgba(255, 255, 255, 0.95) 330deg,
            rgba(147, 197, 253, 0.55) 360deg
          );
          -webkit-mask:
            linear-gradient(#000 0 0) content-box,
            linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
                  mask-composite: exclude;
          pointer-events: none;
          --a: 0deg;
        }

        .coco-border-stripe-animate {
          animation: coco-trace 1.1s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
      `}</style>

      <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-[60] pointer-events-none">
        <div className="relative">
          {hovering && (
            <div
              key={pulseKey}
              className="coco-border-stripe coco-border-stripe-animate"
              aria-hidden
            />
          )}

          <button
            onClick={toggle}
            onMouseEnter={handleEnter}
            onMouseLeave={() => setHovering(false)}
            className={cn(
              'relative pointer-events-auto group flex items-center gap-3 pl-3.5 pr-2 h-12',
              'bg-[#0B0F17] border border-white/[0.08] rounded-full',
              'shadow-[0_8px_32px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.04)]',
              'hover:border-white/[0.14] hover:bg-[#0F1420]',
              'transition-colors duration-200'
            )}
            aria-label="Open COCO"
          >
            <Plus
              className="w-4 h-4 text-white/50 group-hover:text-white/80 transition-colors"
              strokeWidth={2}
            />
            <span className="text-[13px] font-medium text-white/70 group-hover:text-white tracking-tight">
              Ask COCO
            </span>
            <div className="w-8 h-8 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center group-hover:bg-white/[0.10] transition-colors">
              <Mic
                className="w-3.5 h-3.5 text-white/60 group-hover:text-white/90"
                strokeWidth={2}
              />
            </div>
          </button>
        </div>
      </div>
    </>
  )
}