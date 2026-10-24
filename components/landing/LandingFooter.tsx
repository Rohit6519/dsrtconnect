'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

export function LandingFooter() {
  return (
    <motion.footer 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.5 }}
      className="relative z-20 border-t border-white/[0.06] bg-[#05070D] px-6 md:px-12 py-6 mt-auto"
    >
      <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-[12px] font-mono text-white/40 font-medium">
        <span>© {new Date().getFullYear()} DSRT Platform</span>
        <div className="flex items-center gap-6">
          <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
          <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
          <Link href="/security" className="hover:text-white transition-colors">Security</Link>
        </div>
      </div>
    </motion.footer>
  )
}