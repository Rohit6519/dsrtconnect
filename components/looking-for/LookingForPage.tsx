'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { LookingForHeader } from './LookingForHeader'
import { TeamUpBannerSlider } from './TeamUpBannerSlider'
import { LookingForTabs, type TeamUpTab } from './LookingForTabs'
import { RightSidebar } from './RightSidebar'
import { ExploreTab } from './tabs/ExploreTab'
import { MyHiringsTab } from './tabs/MyHiringsTab'
import { SuggestedTab } from './tabs/SuggestedTab'
import { SavedTab } from './tabs/SavedTab'
import { ApplicationsTab } from './tabs/ApplicationsTab'
import { ActivityTab } from './tabs/ActivityTab'
import { SettingsTab } from './tabs/SettingsTab'
import { useShortcuts } from './shared/useShortcuts'
import { ShortcutsOverlay } from './shared/ShortcutsOverlay'

export function LookingForPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = (searchParams.get('tab') as TeamUpTab) || 'explore'
  const [activeTab, setActiveTab] = useState<TeamUpTab>(tabParam)
  const [showShortcuts, setShowShortcuts] = useState(false)

  const handleTabChange = useCallback((tab: TeamUpTab) => {
    setActiveTab(tab)
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    router.replace(`/looking-for?${params.toString()}`, { scroll: false })
  }, [router, searchParams])

  const goCreate = useCallback(() => {
    router.push('/looking-for/create')
  }, [router])

  const focusSearch = useCallback(() => {
    const el = document.querySelector<HTMLInputElement>('[data-teamup-search]')
    if (el) {
      el.focus()
      el.select()
    }
  }, [])

  useShortcuts([
    { keys: 'mod+k',  handler: focusSearch,                     description: 'Focus search' },
    { keys: 'mod+/',  handler: () => setShowShortcuts(true),    description: 'Shortcuts' },
    { keys: 'c',      handler: goCreate,                        description: 'Create new opportunity' },
    { keys: 'g h',    handler: () => handleTabChange('explore'), description: 'Go to Explore' },
  ])

  const isExplore = activeTab === 'explore'

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100">
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-4 md:py-6">
        <LookingForHeader onCreate={goCreate} />

        {isExplore && (
          <div className="mt-4 md:mt-5">
            <TeamUpBannerSlider />
          </div>
        )}

        <div className="mt-4 md:mt-5">
          <LookingForTabs active={activeTab} onChange={handleTabChange} />
        </div>

        {isExplore ? (
          <div className="mt-4 md:mt-5 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-4 md:gap-6">
            <div className="min-w-0">
              <ExploreTab />
            </div>
            <aside className="lg:sticky lg:top-6 h-fit order-first lg:order-last">
              <RightSidebar />
            </aside>
          </div>
        ) : (
          <div className="mt-4 md:mt-5">
            {activeTab === 'my-hirings' && <MyHiringsTab onCreate={goCreate} />}
            {activeTab === 'suggested' && <SuggestedTab />}
            {activeTab === 'saved' && <SavedTab />}
            {activeTab === 'applications' && <ApplicationsTab />}
            {activeTab === 'activity' && <ActivityTab />}
            {activeTab === 'settings' && <SettingsTab />}
          </div>
        )}
      </div>

      {showShortcuts && (
        <ShortcutsOverlay onClose={() => setShowShortcuts(false)} />
      )}
    </div>
  )
}
