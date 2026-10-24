'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Circle, TrendingUp, X, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

export function ProfileCompleteness({ userId, isOwnProfile }: any) {
  const [data, setData] = useState<any>(null)
  const [expanded, setExpanded] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!isOwnProfile) return
    fetch(`/api/profile/completeness?userId=${userId}`)
      .then(r => r.json())
      .then(setData)
      .catch(console.error)
  }, [userId, isOwnProfile])

  if (!isOwnProfile || !data || dismissed || data.percentage === 100) return null

  const incomplete = data.checks.filter((c: any) => !c.completed)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-blue-500/5 to-purple-500/5 border border-blue-500/20 rounded-2xl overflow-hidden"
    >
      <div className="p-4 flex items-center gap-3">
        <div className="relative w-12 h-12 flex-shrink-0">
          <svg className="w-full h-full -rotate-90">
            <circle
              cx="24"
              cy="24"
              r="20"
              stroke="hsl(var(--muted))"
              strokeWidth="4"
              fill="none"
            />
            <motion.circle
              cx="24"
              cy="24"
              r="20"
              stroke="url(#gradient)"
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
              initial={{ strokeDasharray: '0 126' }}
              animate={{ strokeDasharray: `${(data.percentage / 100) * 126} 126` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(217, 91%, 60%)" />
                <stop offset="100%" stopColor="hsl(280, 91%, 60%)" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold">{data.percentage}%</span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm">Profile Completeness</p>
            {data.is_verified_ready && (
              <span className="text-[9px] px-1.5 py-0.5 bg-green-500/10 text-green-500 rounded-md font-bold uppercase">
                Verified Ready
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {data.completed_count} of {data.total_count} complete
          </p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-blue-500 hover:underline font-medium"
          >
            {expanded ? 'Hide' : 'Show'}
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="text-muted-foreground hover:text-foreground p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="border-t border-blue-500/10 overflow-hidden"
          >
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-2">
              {data.checks.map((check: any) => (
                <div
                  key={check.id}
                  className={cn(
                    'flex items-center gap-2 p-2 rounded-lg text-xs',
                    check.completed ? 'text-muted-foreground' : 'text-foreground'
                  )}
                >
                  {check.completed ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  )}
                  <span className={check.completed ? 'line-through' : ''}>
                    {check.label}
                  </span>
                  {!check.completed && check.action_url && (
                    <Link
                      href={check.action_url}
                      className="ml-auto text-[10px] text-blue-500 hover:underline"
                    >
                      Do it →
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}