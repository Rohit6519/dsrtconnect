'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { RotatingHeadline } from './RotatingHeadline'
import { DsrtButton } from '@/components/dsrt'

const DSRT_PHRASES = [
  'builders connect.',
  'ideas become projects.',
  'projects become ventures.',
  'talent meets opportunity.',
  'ambition becomes action.',
  'the future is built.'
]

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
}

export function HeroSection() {
  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="flex flex-col justify-center w-full max-w-2xl relative z-10"
    >
      <motion.p variants={itemVariants} className="text-[11px] font-mono font-bold tracking-widest text-white/40 uppercase mb-5">
        DSRT Connect Platform
      </motion.p>

      <motion.div variants={itemVariants} className="mb-6">
        <h1 className="text-[36px] sm:text-[48px] lg:text-[56px] font-bold tracking-tight leading-[1.05] text-white mb-2 drop-shadow-lg">
          A platform where
        </h1>
        <RotatingHeadline phrases={DSRT_PHRASES} />
      </motion.div>

      <motion.p variants={itemVariants} className="text-[15px] sm:text-[16px] leading-relaxed text-white/60 mt-4 max-w-[500px]">
        The intelligent network for builders, engineers, and founders to securely collaborate, discover opportunities, and scale operations.
      </motion.p>

      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-10">
        <DsrtButton asChild variant="white" size="lg" className="justify-center shadow-2xl">
          <Link href="/signup">Join the Network</Link>
        </DsrtButton>
        <DsrtButton asChild variant="outline" size="lg" className="justify-center">
          <Link href="/company">Read our Manifesto</Link>
        </DsrtButton>
      </motion.div>
    </motion.div>
  )
}