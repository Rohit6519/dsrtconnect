'use client'

import Link from 'next/link'

export function DsrtCocoBanner() {
  return (
    <Link
      href="/coco"
      className="block w-full rounded-xl overflow-hidden border border-zinc-800/80 hover:border-zinc-600 transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.35)] group"
    >
      <img
        src="/coco-banner.png"
        alt="DSRT COCO"
        className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-[1.02]"
      />
    </Link>
  )
}