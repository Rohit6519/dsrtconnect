'use client'
import { cn, getInitials } from '@/lib/utils'
import Image from 'next/image'
import { useState } from 'react'

interface DsrtAvatarProps {
  src?: string | null
  name?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  className?: string
  ring?: boolean
  fallbackClassName?: string
}

const sizeMap = {
  xs: { box: 'w-6 h-6', text: 'text-[9px]', px: 24 },
  sm: { box: 'w-8 h-8', text: 'text-[11px]', px: 32 },
  md: { box: 'w-10 h-10', text: 'text-[12px]', px: 40 },
  lg: { box: 'w-12 h-12', text: 'text-[14px]', px: 48 },
  xl: { box: 'w-16 h-16', text: 'text-[18px]', px: 64 },
  '2xl': { box: 'w-24 h-24', text: 'text-[24px]', px: 96 },
}

/**
 * DSRT Avatar — with automatic fallback initials.
 * Uses Next Image for optimization when src exists.
 */
export function DsrtAvatar({
  src,
  name,
  size = 'md',
  className,
  ring,
  fallbackClassName,
}: DsrtAvatarProps) {
  const [errored, setErrored] = useState(false)
  const s = sizeMap[size]
  const initials = name ? getInitials(name) : '?'

  const showImage = src && !errored

  return (
    <div
      className={cn(
        s.box,
        'relative rounded-full overflow-hidden flex-shrink-0',
        ring && 'ring-2 ring-white/10 ring-offset-2 ring-offset-[#05070D]',
        className
      )}
    >
      {showImage ? (
        <Image
          src={src}
          alt={name || ''}
          width={s.px}
          height={s.px}
          className="w-full h-full object-cover"
          onError={() => setErrored(true)}
          unoptimized
        />
      ) : (
        <div
          className={cn(
            'w-full h-full flex items-center justify-center font-semibold bg-gradient-to-br from-[#1e3a5f] to-[#0f172a] text-white/90',
            s.text,
            fallbackClassName
          )}
        >
          {initials}
        </div>
      )}
    </div>
  )
}