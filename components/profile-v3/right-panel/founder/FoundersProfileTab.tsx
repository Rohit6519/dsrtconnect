'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ProfileCard } from '../../shared/ProfileCard'
import { FounderQnA } from './FounderQnA'
import { Spinner } from '@phosphor-icons/react'

interface FoundersProfileTabProps {
  userId: string
  isOwner: boolean
  profile?: any
}

export function FoundersProfileTab({
  userId,
  isOwner,
  profile,
}: FoundersProfileTabProps) {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // We only need to briefly render loading state — Q&A pulls its own data from profile prop
    setLoading(false)
  }, [userId])

  if (loading) {
    return (
      <ProfileCard>
        <div className="flex items-center justify-center py-16">
          <Spinner className="w-5 h-5 text-zinc-600 animate-spin" weight="bold" />
        </div>
      </ProfileCard>
    )
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
      >
        {/* Founder Track Record Q&A — full focus */}
        <FounderQnA
          initialData={profile?.founder_qna || {}}
          isOwner={isOwner}
        />
      </motion.div>
    </AnimatePresence>
  )
}