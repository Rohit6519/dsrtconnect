'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { DsrtLogo } from '@/components/ui/DsrtLogo'
import { DsrtButton } from '@/components/dsrt'

export function LandingHeader() {
  return (
    <motion.header 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
      className="relative z-20 flex items-center justify-between px-4 sm:px-6 md:px-12 py-6 w-full max-w-[1600px] mx-auto"
    >
      <Link href="/" className="hover:opacity-80 transition-opacity">
        <DsrtLogo size={28} showText={true} />
      </Link>

      <nav className="hidden lg:flex items-center gap-8">
        {['Company', 'Developers', 'Social'].map((item) => (
          <Link
            key={item}
            href={`/${item.toLowerCase()}`}
            className="text-[13px] font-mono font-semibold uppercase tracking-wider text-white/50 hover:text-white transition-colors"
          >
            {item}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-3 sm:gap-4">
        <DsrtButton asChild variant="ghost" size="sm" className="hidden sm:flex">
          <Link href="/login">Sign In</Link>
        </DsrtButton>
        <DsrtButton asChild variant="white" size="sm">
          <Link href="/signup">Create Account →</Link>
        </DsrtButton>
      </div>
    </motion.header>
  )
}