'use client'

import { Users } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'

export function TeamWidget() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.6 }}
      className="bg-card border rounded-2xl p-6 space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
            <Users className="w-4 h-4 text-cyan-500" strokeWidth={2.5} />
          </div>
          <p className="text-[10px] uppercase tracking-[0.15em] font-bold">Team</p>
        </div>
      </div>

      <div className="text-center py-8 space-y-2">
        <div className="w-12 h-12 mx-auto rounded-full bg-muted/50 flex items-center justify-center">
          <Users className="w-5 h-5 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">
          No team members yet
        </p>
        <p className="text-xs text-muted-foreground">
          Create a project and invite your team to see them here.
        </p>
        <Link
          href="/projects/new"
          className="inline-block text-xs text-blue-500 hover:text-blue-400 font-medium mt-2"
        >
          Create a project →
        </Link>
      </div>
    </motion.div>
  )
}