'use client'

import Link from 'next/link'
import { FolderPlus, Rocket, UserSearch, Upload, Route, Brain } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

const actions = [
  { icon: FolderPlus, label: 'New Project', href: '/projects/new', color: 'text-blue-400', bg: 'bg-blue-500/10 hover:bg-blue-500/20' },
  { icon: Rocket, label: 'Create Venture', href: '/ventures/new', color: 'text-purple-400', bg: 'bg-purple-500/10 hover:bg-purple-500/20' },
  { icon: UserSearch, label: 'Find Builder', href: '/explore', color: 'text-green-400', bg: 'bg-green-500/10 hover:bg-green-500/20' },
  { icon: Upload, label: 'Upload Demo', href: '#', color: 'text-orange-400', bg: 'bg-orange-500/10 hover:bg-orange-500/20' },
  { icon: Route, label: 'Roadmap', href: '/mentor', color: 'text-pink-400', bg: 'bg-pink-500/10 hover:bg-pink-500/20' },
  { icon: Brain, label: 'AI Mentor', href: '/mentor', color: 'text-cyan-400', bg: 'bg-cyan-500/10 hover:bg-cyan-500/20' },
]

export function QuickActions() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.7 }}
      className="bg-card border rounded-2xl p-6 space-y-4"
    >
      <p className="text-[10px] uppercase tracking-[0.15em] font-bold">
        Quick Actions
      </p>

      <div className="grid grid-cols-3 gap-2">
        {actions.map((action, idx) => {
          const Icon = action.icon
          return (
            <motion.div
              key={action.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + idx * 0.05 }}
            >
              <Link
                href={action.href}
                className={cn(
                  'flex flex-col items-center gap-2 p-3 rounded-xl transition-all group',
                  action.bg
                )}
              >
                <div className="w-10 h-10 rounded-lg bg-background/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Icon className={cn('w-4 h-4', action.color)} strokeWidth={2.5} />
                </div>
                <span className="text-[10px] text-center font-semibold leading-tight">
                  {action.label}
                </span>
              </Link>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}