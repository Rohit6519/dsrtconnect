'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { OverviewTab } from './tabs/OverviewTab'
import { MyWorkTab } from './my-work/MyWorkTab'
import { FoundersProfileTab } from './founder/FoundersProfileTab'
import { DsrtTabs } from '@/components/dsrt'

const TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'my-work', label: 'My Work' },
  { value: 'founder', label: "Founder's Profile" },
] as const

type TabId = typeof TABS[number]['value']

interface RightPanelProps {
  profile: any
  isOwner: boolean
  currentUserId: string | null
  onProfileUpdate: (updates: Partial<any>) => void
}

export function RightPanel({
  profile,
  isOwner,
  currentUserId,
  onProfileUpdate,
}: RightPanelProps) {
  const searchParams = useSearchParams()

  const readTabFromUrl = (): TabId => {
    const t = searchParams.get('tab')
    if (t && TABS.some((tab) => tab.value === t)) return t as TabId
    return 'overview'
  }

  const [activeTab, setActiveTab] = useState<TabId>(readTabFromUrl())

  useEffect(() => {
    const t = readTabFromUrl()
    if (t !== activeTab) setActiveTab(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab as TabId)
    const url = new URL(window.location.href)
    if (tab === 'overview') url.searchParams.delete('tab')
    else url.searchParams.set('tab', tab)
    window.history.replaceState({}, '', url.toString())
  }, [])

  return (
    <div className="space-y-4">
      {/* FIXED: top-[116px] md:top-[64px] prevents overlap with Global Header + SubNav */}
      <div className="sticky top-[116px] md:top-[64px] z-30 bg-[#05070D]/95 backdrop-blur-md border-b border-white/[0.06] -mx-4 sm:mx-0 px-4 sm:px-0 pt-2 pb-0">
        <DsrtTabs
          variant="underline"
          tabs={TABS.map(t => ({ value: t.value, label: t.label }))}
          activeValue={activeTab}
          onValueChange={handleTabChange}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
        >
          {activeTab === 'overview' && (
            <OverviewTab
              profile={profile}
              isOwner={isOwner}
              currentUserId={currentUserId}
              onProfileUpdate={onProfileUpdate}
            />
          )}
          {activeTab === 'my-work' && (
            <MyWorkTab userId={profile.id} isOwner={isOwner} />
          )}
          {activeTab === 'founder' && (
            <FoundersProfileTab
              userId={profile.id}
              isOwner={isOwner}
              profile={profile}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}